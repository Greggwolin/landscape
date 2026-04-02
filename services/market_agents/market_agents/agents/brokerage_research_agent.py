"""
Brokerage Research Agent — quarterly MarketBeat PDF harvester.

Downloads and parses quarterly market reports from CBRE, Cushman &
Wakefield, and JLL. Extracts structured CRE fundamentals:
  - Vacancy rate by property type
  - Asking/effective rent
  - Net absorption (SF)
  - Under construction / deliveries (SF)
  - Cap rates (if included)

Source: Public PDF downloads from brokerage research pages
Auth: None (public downloads)
Frequency: Quarterly
"""

from __future__ import annotations

import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from loguru import logger

from .base_research_agent import (
    BaseResearchAgent,
    FinancialDataRecord,
    HarvestStats,
    PublicationRecord,
)
from ..config import AgentConfig


# Brokerage research landing pages
BROKERAGE_SOURCES = {
    "cbre": {
        "name": "CBRE",
        "publisher": "CBRE Group",
        "research_url": "https://www.cbre.com/insights/figures",
        "pdf_patterns": [".pdf", "/-/media/"],
    },
    "cushman": {
        "name": "Cushman & Wakefield",
        "publisher": "Cushman & Wakefield",
        "research_url": "https://www.cushmanwakefield.com/en/united-states/insights/us-marketbeats",
        "pdf_patterns": [".pdf", "/download/"],
    },
    "jll": {
        "name": "JLL",
        "publisher": "JLL",
        "research_url": "https://www.us.jll.com/en/trends-and-insights/research",
        "pdf_patterns": [".pdf"],
    },
}

# Markets to look for in PDF titles/filenames
TARGET_MARKETS = ["phoenix", "tucson", "los angeles", "national", "united states", "us"]

MAX_REQUESTS_PER_RUN = 40


class BrokerageResearchAgent(BaseResearchAgent):
    """Harvests quarterly MarketBeat PDFs from major CRE brokerages."""

    def __init__(self, config: Optional[AgentConfig] = None):
        super().__init__(config)
        self._request_count = 0

    @property
    def name(self) -> str:
        return "BROKERAGE"

    @property
    def source_key(self) -> str:
        return "brokerage"

    def _check_budget(self) -> bool:
        return self._request_count < MAX_REQUESTS_PER_RUN

    def _counted_fetch(self, url: str, **kwargs):
        self._request_count += 1
        return self.fetch_url(url, **kwargs)

    def harvest(self, stats: HarvestStats) -> None:
        self._request_count = 0

        for brokerage_key, source_info in BROKERAGE_SOURCES.items():
            if not self._check_budget():
                break

            try:
                self._harvest_brokerage(brokerage_key, source_info, stats)
            except Exception as exc:
                err = f"{source_info['name']} harvest failed: {exc}"
                logger.error("[BROKERAGE] %s", err)
                stats.errors.append(err)

    def _harvest_brokerage(self, key: str, source_info: Dict, stats: HarvestStats) -> None:
        """Crawl a single brokerage's research page for report PDFs."""
        logger.info("[BROKERAGE] Crawling %s research...", source_info["name"])

        try:
            resp = self._counted_fetch(source_info["research_url"])
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            stats.errors.append(f"{source_info['name']} page fetch failed: {exc}")
            return

        # Find report links (both PDF direct links and report landing pages)
        reports = self._extract_report_links(soup, key, source_info)
        stats.publications_discovered += len(reports)
        logger.info("[BROKERAGE] %s: found %d reports", source_info["name"], len(reports))

        for report in reports:
            if not self._check_budget():
                break

            source_id = report["source_id"]
            existing = self.get_existing_publication(source_id)
            if existing and existing.get("extraction_status") in ("extracted", "downloaded"):
                continue

            pub = PublicationRecord(
                source="brokerage",
                source_id=source_id,
                publication_type="market_report",
                title=report["title"],
                publisher=source_info["publisher"],
                published_date=report.get("date"),
                categories=["Market Fundamentals"],
                tags=[source_info["name"], "MarketBeat", report.get("property_type", "")],
                document_type="pdf" if report.get("pdf_url") else "html",
                summary=report.get("teaser"),
                source_url=report.get("url"),
                pdf_url=report.get("pdf_url"),
                is_gated=False,
                extraction_status="pending",
                metadata={"brokerage": key, "market": report.get("market")},
            )
            pub_id, is_new = self.upsert_publication(pub)
            if is_new:
                stats.publications_new += 1
            else:
                stats.publications_updated += 1

            # Download and extract PDF if available
            if report.get("pdf_url") and self._check_budget():
                local_path = self._download_report_pdf(
                    pub_id, source_id, report["pdf_url"], key, stats
                )
                if local_path:
                    self._extract_market_data(pub_id, local_path, key, stats)

    def _extract_report_links(self, soup: BeautifulSoup, key: str, source_info: Dict) -> List[Dict]:
        """Extract market report links from a brokerage research page."""
        reports = []
        base_url = source_info["research_url"].rsplit("/", 1)[0]

        # Find all links that look like market reports
        for link in soup.select("a[href]"):
            href = link.get("href", "")
            title = link.get_text(strip=True)
            if not href or not title or len(title) < 5:
                continue

            # Check if this looks like a market report
            combined = f"{title} {href}".lower()
            is_market_report = any(kw in combined for kw in [
                "marketbeat", "market report", "market overview", "quarterly",
                "office", "industrial", "multifamily", "retail",
            ])

            if not is_market_report:
                continue

            # Check if it's for a target market
            market = None
            for m in TARGET_MARKETS:
                if m in combined:
                    market = m.title()
                    break

            url = href if href.startswith("http") else urljoin(base_url, href)

            # Check for direct PDF link
            pdf_url = url if any(p in href.lower() for p in source_info["pdf_patterns"]) else None

            source_id = f"{key}_{re.sub(r'[^a-zA-Z0-9_-]', '_', href.strip('/').split('/')[-1][:120])}"

            # Try to infer property type from title
            property_type = None
            for pt in ["office", "industrial", "multifamily", "retail"]:
                if pt in combined:
                    property_type = pt
                    break

            reports.append({
                "source_id": source_id,
                "title": title,
                "url": url,
                "pdf_url": pdf_url,
                "market": market,
                "property_type": property_type,
                "date": None,  # Often not in the link — extracted from PDF
                "teaser": None,
            })

        return reports

    def _download_report_pdf(self, pub_id: str, source_id: str, pdf_url: str,
                              brokerage: str, stats: HarvestStats) -> Optional[str]:
        """Download a brokerage report PDF."""
        pdf_base = os.environ.get("BROKERAGE_PDF_STORAGE_PATH", "data/brokerage/pdfs")
        year = datetime.now().strftime("%Y")
        filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', source_id)[:100] + ".pdf"
        dest_path = f"{pdf_base}/{brokerage}/{year}/{filename}"

        if Path(dest_path).exists():
            return dest_path

        try:
            content_hash = self.download_pdf(pdf_url, dest_path)
            stats.pdfs_downloaded += 1
            self.update_publication_status(
                pub_id, "downloaded", local_pdf_path=dest_path, content_hash=content_hash,
            )
            return dest_path
        except Exception as exc:
            logger.warning("[BROKERAGE] PDF download failed %s: %s", source_id, exc)
            stats.errors.append(f"PDF download: {source_id} — {exc}")
            return None

    def _extract_market_data(self, pub_id: str, pdf_path: str, brokerage: str,
                              stats: HarvestStats) -> None:
        """Extract CRE fundamentals from a MarketBeat PDF."""
        tables = self.extract_tables_from_pdf(pdf_path)
        if not tables:
            return

        records_created = 0
        for table_info in tables:
            headers = table_info["headers"]
            rows = table_info["rows"]
            page = table_info["page"]

            # Classify table — looking for market fundamentals
            category = self._classify_market_table(headers)
            if not category:
                continue

            for row in rows:
                if not row or len(row) < 2:
                    continue
                label = (row[0] or "").strip()
                if not label:
                    continue

                metric_name = re.sub(r'[^a-zA-Z0-9_ ]', '', label.lower()).strip()
                metric_name = re.sub(r'\s+', '_', metric_name)[:100]

                for col_idx in range(1, min(len(row), len(headers))):
                    cell = (row[col_idx] or "").strip()
                    if not cell or cell in ("-", "N/A", "—"):
                        continue

                    value, unit = self._parse_market_value(cell)
                    header = headers[col_idx].strip() if col_idx < len(headers) else ""

                    try:
                        self.upsert_financial_data(FinancialDataRecord(
                            publication_id=pub_id,
                            data_category=category,
                            metric_name=metric_name,
                            metric_value=value,
                            metric_unit=unit,
                            metric_text=cell if value is None else None,
                            geography=header if header else None,
                            reference_period=header if self._looks_like_period(header) else None,
                            context=f"{label}: {cell}",
                            confidence_score=0.7,
                            extraction_method="table_parse",
                            page_number=page,
                        ))
                        records_created += 1
                    except Exception:
                        pass

        if records_created > 0:
            self.update_publication_status(pub_id, "extracted")
            stats.extractions_completed += records_created

    def _classify_market_table(self, headers: List[str]) -> Optional[str]:
        """Classify a table from a brokerage report."""
        header_text = " ".join(h.lower() for h in headers if h)
        mappings = {
            "vacancy": ["vacancy", "occupancy"],
            "rent": ["rent", "asking", "effective", "lease"],
            "absorption": ["absorption", "net absorption"],
            "construction": ["construction", "deliveries", "pipeline", "completions"],
            "sale_price": ["cap rate", "sale", "transaction", "investment"],
        }
        for cat, keywords in mappings.items():
            if any(kw in header_text for kw in keywords):
                return cat
        return self.classify_table(headers)

    @staticmethod
    def _parse_market_value(text: str) -> tuple:
        if not text:
            return None, None
        cleaned = text.strip()

        # Percentage
        m = re.match(r'^([\d,.]+)\s*%$', cleaned)
        if m:
            try:
                return float(m.group(1).replace(",", "")), "percent"
            except ValueError:
                return None, None

        # SF or units
        m = re.match(r'^([\d,.]+)\s*(sf|SF|msf|MSF|units?)$', cleaned)
        if m:
            try:
                val = float(m.group(1).replace(",", ""))
                unit = m.group(2).lower()
                if unit in ("msf",):
                    val *= 1_000_000
                    unit = "sf"
                return val, unit
            except ValueError:
                return None, None

        # Currency
        m = re.match(r'^\$\s*([\d,.]+)\s*(M|K|B|psf|/sf)?$', cleaned, re.I)
        if m:
            try:
                val = float(m.group(1).replace(",", ""))
                suffix = (m.group(2) or "").upper()
                mults = {"M": 1e6, "K": 1e3, "B": 1e9}
                val *= mults.get(suffix, 1)
                unit = "usd_psf" if suffix in ("PSF", "/SF") else "usd"
                return val, unit
            except ValueError:
                return None, None

        # Plain number
        m = re.match(r'^-?([\d,.]+)$', cleaned)
        if m:
            try:
                return float(m.group(1).replace(",", "")), None
            except ValueError:
                return None, None

        return None, None

    @staticmethod
    def _looks_like_period(text: str) -> bool:
        if not text:
            return False
        return bool(re.search(r'\d{4}|[1-4]Q\d{2}|Q[1-4]', text, re.I))


def run_standalone():
    agent = BrokerageResearchAgent()
    agent.run_standalone()

if __name__ == "__main__":
    run_standalone()
