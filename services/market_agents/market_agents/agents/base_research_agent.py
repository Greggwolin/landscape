"""
Base class for research harvesting agents (ULI, CREFC, future sources).

Unlike BaseAgent (geo/time-series oriented), this base handles:
  - Publication upserts to tbl_research_publication
  - Financial data upserts to tbl_research_financial_data
  - Harvest log management (tbl_research_harvest_log)
  - PDF download with content hashing
  - Table extraction via pdfplumber
  - Rate limiting between requests
"""

from __future__ import annotations

import hashlib
import os
import time
import traceback
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import psycopg2
import psycopg2.extras
import requests
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import get_config, AgentConfig
from ..discord import log_agent_start, log_agent_finish, log_agent_error, log_agent_warning


# ── Data containers ─────────────────────────────────────────────────

@dataclass
class PublicationRecord:
    """A research publication to upsert."""
    source: str
    source_id: str
    publication_type: str
    title: str
    subtitle: Optional[str] = None
    authors: Optional[List[str]] = None
    publisher: Optional[str] = None
    published_date: Optional[str] = None           # ISO date string YYYY-MM-DD
    categories: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    document_type: Optional[str] = None            # 'pdf', 'html', 'data'
    summary: Optional[str] = None
    source_url: Optional[str] = None
    pdf_url: Optional[str] = None
    local_pdf_path: Optional[str] = None
    content_hash: Optional[str] = None
    is_gated: bool = False
    extraction_status: str = "pending"
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class FinancialDataRecord:
    """An extracted financial data point from a publication."""
    publication_id: str                             # UUID of parent publication
    data_category: str
    metric_name: str
    metric_value: Optional[float] = None
    metric_unit: Optional[str] = None
    metric_text: Optional[str] = None
    property_type: Optional[str] = None
    geography: Optional[str] = None
    reference_date: Optional[str] = None           # ISO date string
    reference_period: Optional[str] = None
    context: Optional[str] = None
    confidence_score: Optional[float] = None
    extraction_method: Optional[str] = None
    page_number: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class HarvestStats:
    """Accumulates stats during a harvest run."""
    publications_discovered: int = 0
    publications_new: int = 0
    publications_updated: int = 0
    pdfs_downloaded: int = 0
    extractions_completed: int = 0
    errors: List[str] = field(default_factory=list)


# ── Base class ──────────────────────────────────────────────────────

class BaseResearchAgent(ABC):
    """
    Abstract base for research publication harvesting agents.

    Subclasses implement:
      - name (property)     — agent name for logging ('ULI', 'CREFC')
      - source_key          — DB source identifier ('uli', 'crefc')
      - harvest()           — the main discovery + download + extract loop
    """

    # Minimum seconds between HTTP requests (rate limiting)
    REQUEST_DELAY: float = 3.0
    # User-Agent header for politeness
    USER_AGENT: str = "Landscape-DataHarvester/1.0 (+https://landscape.dev)"

    def __init__(self, config: Optional[AgentConfig] = None):
        self.config = config or get_config()
        self._conn: Optional[psycopg2.extensions.connection] = None
        self._last_request_time: float = 0.0
        self._session: Optional[requests.Session] = None

    # ── Abstract interface ───────────────────────────────────────────

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable agent name for logging and Discord."""
        ...

    @property
    @abstractmethod
    def source_key(self) -> str:
        """Lowercase source identifier used in DB ('uli', 'crefc')."""
        ...

    @abstractmethod
    def harvest(self, stats: HarvestStats) -> None:
        """
        Main harvest logic. Discover publications, download PDFs,
        extract data, and upsert to DB. Update stats as you go.
        """
        ...

    # ── DB connection ────────────────────────────────────────────────

    @property
    def conn(self) -> psycopg2.extensions.connection:
        if self._conn is None or self._conn.closed:
            self._conn = psycopg2.connect(self.config.database_url)
            self._conn.autocommit = False
        return self._conn

    def close(self):
        if self._conn is not None and not self._conn.closed:
            self._conn.close()
            self._conn = None
        if self._session is not None:
            self._session.close()
            self._session = None

    # ── HTTP session with rate limiting ──────────────────────────────

    @property
    def http(self) -> requests.Session:
        """Shared requests session with default headers."""
        if self._session is None:
            self._session = requests.Session()
            self._session.headers.update({
                "User-Agent": self.USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            })
        return self._session

    def _rate_limit(self):
        """Enforce minimum delay between requests."""
        elapsed = time.monotonic() - self._last_request_time
        if elapsed < self.REQUEST_DELAY:
            time.sleep(self.REQUEST_DELAY - elapsed)
        self._last_request_time = time.monotonic()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=5, max=30))
    def fetch_url(self, url: str, **kwargs) -> requests.Response:
        """GET a URL with rate limiting and retry."""
        self._rate_limit()
        resp = self.http.get(url, timeout=30, **kwargs)
        resp.raise_for_status()
        return resp

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=5, max=30))
    def fetch_url_bytes(self, url: str, **kwargs) -> bytes:
        """GET a URL and return raw bytes (for PDF downloads)."""
        self._rate_limit()
        resp = self.http.get(url, timeout=60, **kwargs)
        resp.raise_for_status()
        return resp.content

    # ── Harvest log ──────────────────────────────────────────────────

    def _create_harvest_log(self) -> str:
        """Insert a new harvest log row and return its UUID."""
        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO landscape.tbl_research_harvest_log
                (source, agent_name, run_started_at, status)
            VALUES (%s, %s, NOW(), 'running')
            RETURNING id::text
        """, (self.source_key, self.name))
        log_id = cur.fetchone()[0]
        self.conn.commit()
        return log_id

    def _complete_harvest_log(self, log_id: str, stats: HarvestStats, status: str = "completed"):
        """Update the harvest log with final stats."""
        cur = self.conn.cursor()
        cur.execute("""
            UPDATE landscape.tbl_research_harvest_log
            SET run_completed_at = NOW(),
                status = %s,
                publications_discovered = %s,
                publications_new = %s,
                publications_updated = %s,
                pdfs_downloaded = %s,
                extractions_completed = %s,
                errors = %s
            WHERE id = %s::uuid
        """, (
            status,
            stats.publications_discovered,
            stats.publications_new,
            stats.publications_updated,
            stats.pdfs_downloaded,
            stats.extractions_completed,
            stats.errors or None,
            log_id,
        ))
        self.conn.commit()

    def get_last_successful_run(self) -> Optional[datetime]:
        """Get the timestamp of the last successful harvest for this source."""
        cur = self.conn.cursor()
        cur.execute("""
            SELECT MAX(run_completed_at)
            FROM landscape.tbl_research_harvest_log
            WHERE source = %s AND status IN ('completed', 'partial')
        """, (self.source_key,))
        row = cur.fetchone()
        return row[0] if row and row[0] else None

    # ── Publication upserts ──────────────────────────────────────────

    def upsert_publication(self, pub: PublicationRecord) -> Tuple[str, bool]:
        """
        Upsert a publication record. Returns (id, is_new).

        Uses ON CONFLICT on (source, source_id) to handle dedup.
        """
        import json

        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO landscape.tbl_research_publication (
                source, source_id, publication_type, title, subtitle,
                authors, publisher, published_date, categories, tags,
                document_type, summary, source_url, pdf_url, local_pdf_path,
                content_hash, is_gated, extraction_status, metadata,
                harvested_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                NOW(), NOW()
            )
            ON CONFLICT (source, source_id) DO UPDATE SET
                title = EXCLUDED.title,
                subtitle = EXCLUDED.subtitle,
                authors = EXCLUDED.authors,
                publisher = EXCLUDED.publisher,
                published_date = EXCLUDED.published_date,
                categories = EXCLUDED.categories,
                tags = EXCLUDED.tags,
                document_type = EXCLUDED.document_type,
                summary = EXCLUDED.summary,
                source_url = EXCLUDED.source_url,
                pdf_url = EXCLUDED.pdf_url,
                local_pdf_path = COALESCE(EXCLUDED.local_pdf_path, landscape.tbl_research_publication.local_pdf_path),
                content_hash = COALESCE(EXCLUDED.content_hash, landscape.tbl_research_publication.content_hash),
                extraction_status = CASE
                    WHEN EXCLUDED.content_hash IS DISTINCT FROM landscape.tbl_research_publication.content_hash
                    THEN 'pending'
                    ELSE landscape.tbl_research_publication.extraction_status
                END,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
            RETURNING id::text,
                (xmax = 0) AS is_new
        """, (
            pub.source, pub.source_id, pub.publication_type, pub.title, pub.subtitle,
            pub.authors, pub.publisher, pub.published_date, pub.categories, pub.tags,
            pub.document_type, pub.summary, pub.source_url, pub.pdf_url, pub.local_pdf_path,
            pub.content_hash, pub.is_gated, pub.extraction_status,
            json.dumps(pub.metadata) if pub.metadata else "{}",
        ))
        row = cur.fetchone()
        self.conn.commit()
        return row[0], row[1]

    def get_existing_publication(self, source_id: str) -> Optional[Dict]:
        """Check if a publication already exists and return its current state."""
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT id::text, content_hash, extraction_status, local_pdf_path
            FROM landscape.tbl_research_publication
            WHERE source = %s AND source_id = %s
        """, (self.source_key, source_id))
        return cur.fetchone()

    def update_publication_status(self, pub_id: str, status: str, error: Optional[str] = None,
                                   local_pdf_path: Optional[str] = None,
                                   content_hash: Optional[str] = None):
        """Update extraction status and optional fields on a publication."""
        cur = self.conn.cursor()
        updates = ["extraction_status = %s", "updated_at = NOW()"]
        params: list = [status]

        if error is not None:
            updates.append("extraction_error = %s")
            params.append(error)
        if local_pdf_path is not None:
            updates.append("local_pdf_path = %s")
            params.append(local_pdf_path)
        if content_hash is not None:
            updates.append("content_hash = %s")
            params.append(content_hash)

        params.append(pub_id)
        cur.execute(
            f"UPDATE landscape.tbl_research_publication SET {', '.join(updates)} WHERE id = %s::uuid",
            params,
        )
        self.conn.commit()

    # ── Financial data upserts ───────────────────────────────────────

    def upsert_financial_data(self, record: FinancialDataRecord) -> str:
        """Upsert a financial data point. Returns the record UUID."""
        import json

        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO landscape.tbl_research_financial_data (
                publication_id, data_category, metric_name,
                metric_value, metric_unit, metric_text,
                property_type, geography, reference_date, reference_period,
                context, confidence_score, extraction_method, page_number,
                metadata
            ) VALUES (
                %s::uuid, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s
            )
            ON CONFLICT (publication_id, data_category, metric_name, property_type, geography, reference_period)
            DO UPDATE SET
                metric_value = EXCLUDED.metric_value,
                metric_unit = EXCLUDED.metric_unit,
                metric_text = EXCLUDED.metric_text,
                reference_date = EXCLUDED.reference_date,
                context = EXCLUDED.context,
                confidence_score = EXCLUDED.confidence_score,
                extraction_method = EXCLUDED.extraction_method,
                page_number = EXCLUDED.page_number,
                metadata = EXCLUDED.metadata
            RETURNING id::text
        """, (
            record.publication_id, record.data_category, record.metric_name,
            record.metric_value, record.metric_unit, record.metric_text,
            record.property_type, record.geography, record.reference_date, record.reference_period,
            record.context, record.confidence_score, record.extraction_method, record.page_number,
            json.dumps(record.metadata) if record.metadata else "{}",
        ))
        row = cur.fetchone()
        self.conn.commit()
        return row[0]

    def upsert_financial_data_batch(self, records: List[FinancialDataRecord]) -> int:
        """Upsert a batch of financial data records. Returns count written."""
        count = 0
        for record in records:
            try:
                self.upsert_financial_data(record)
                count += 1
            except Exception as exc:
                logger.warning(
                    "[%s] Failed to upsert financial data %s/%s: %s",
                    self.name, record.data_category, record.metric_name, exc,
                )
        return count

    # ── PDF utilities ────────────────────────────────────────────────

    def download_pdf(self, url: str, dest_path: str, cookies: Optional[Dict] = None) -> str:
        """
        Download a PDF to dest_path. Returns SHA-256 content hash.
        Creates parent directories as needed.
        """
        Path(dest_path).parent.mkdir(parents=True, exist_ok=True)

        self._rate_limit()
        resp = self.http.get(url, timeout=120, cookies=cookies, stream=True)
        resp.raise_for_status()

        sha = hashlib.sha256()
        with open(dest_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=65536):
                f.write(chunk)
                sha.update(chunk)

        content_hash = sha.hexdigest()
        logger.info("[%s] Downloaded PDF: %s (%s)", self.name, dest_path, content_hash[:12])
        return content_hash

    @staticmethod
    def compute_content_hash(content: bytes) -> str:
        """SHA-256 hash of raw bytes."""
        return hashlib.sha256(content).hexdigest()

    @staticmethod
    def compute_text_hash(text: str) -> str:
        """SHA-256 hash of text content."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    # ── Table extraction via pdfplumber ──────────────────────────────

    @staticmethod
    def extract_tables_from_pdf(pdf_path: str) -> List[Dict[str, Any]]:
        """
        Extract all tables from a PDF using pdfplumber.

        Returns list of dicts with keys: page, headers, rows, raw.
        """
        try:
            import pdfplumber
        except ImportError:
            logger.error("pdfplumber not installed — cannot extract tables")
            return []

        results = []
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    tables = page.extract_tables()
                    for table in tables:
                        if table and len(table) > 1:  # At least header + 1 data row
                            # Clean None values from cells
                            cleaned = [
                                [cell.strip() if isinstance(cell, str) else (cell or "")
                                 for cell in row]
                                for row in table
                            ]
                            results.append({
                                "page": i + 1,
                                "headers": cleaned[0],
                                "rows": cleaned[1:],
                                "raw": cleaned,
                            })
        except Exception as exc:
            logger.error("Failed to extract tables from %s: %s", pdf_path, exc)

        return results

    # ── Financial data classification helpers ────────────────────────

    CATEGORY_KEYWORDS = {
        "development_cost": ["cost", "budget", "development", "hard", "soft", "land cost"],
        "rent": ["rent", "lease", "unit mix", "bedroom", "monthly", "asking rent"],
        "vacancy": ["vacancy", "occupancy", "absorption"],
        "financial_performance": ["cap rate", "irr", "yield", "return", "cash-on-cash", "coc"],
        "sale_price": ["sale", "transaction", "price", "acquisition"],
        "project_data": ["sf", "square", "area", "units", "stories", "far", "density"],
        "noi": ["noi", "income", "expense", "revenue", "ebitda", "opex"],
        "market_ranking": ["rank", "ranking", "prospect", "top market"],
    }

    @classmethod
    def classify_table(cls, headers: List[str]) -> Optional[str]:
        """
        Classify a table by scanning its headers for financial keywords.
        Returns the best-matching data_category or None.
        """
        header_text = " ".join(h.lower() for h in headers if h)
        best_match = None
        best_count = 0

        for category, keywords in cls.CATEGORY_KEYWORDS.items():
            matches = sum(1 for kw in keywords if kw in header_text)
            if matches > best_count:
                best_count = matches
                best_match = category

        return best_match if best_count > 0 else None

    # ── Main run entry point ─────────────────────────────────────────

    def run(self, **kwargs) -> HarvestStats:
        """
        Execute a full harvest run with logging and error handling.

        Returns HarvestStats with run summary.
        """
        stats = HarvestStats()
        log_id = None

        logger.info("=== Starting %s harvest ===", self.name)
        log_agent_start(self.name, "Research", 0)

        try:
            log_id = self._create_harvest_log()
            self.harvest(stats)

            status = "completed" if not stats.errors else "partial"
            self._complete_harvest_log(log_id, stats, status)

            log_agent_finish(
                self.name, "Research",
                stats.publications_new + stats.publications_updated,
                0,  # elapsed — logged separately
            )

        except Exception as exc:
            err_msg = f"{type(exc).__name__}: {exc}"
            stats.errors.append(err_msg)
            logger.error("[%s] Harvest failed: %s\n%s", self.name, err_msg, traceback.format_exc())
            log_agent_error(self.name, "Research", err_msg)

            if log_id:
                self._complete_harvest_log(log_id, stats, "failed")

        finally:
            self.close()

        logger.info(
            "[%s] Harvest complete: %d discovered, %d new, %d updated, %d PDFs, %d extracted, %d errors",
            self.name, stats.publications_discovered, stats.publications_new,
            stats.publications_updated, stats.pdfs_downloaded,
            stats.extractions_completed, len(stats.errors),
        )

        return stats

    def run_standalone(self):
        """CLI entry point for running a single agent."""
        logger.info("Starting standalone harvest for %s", self.name)
        stats = self.run()
        return stats
