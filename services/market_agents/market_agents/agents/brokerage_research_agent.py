"""
Brokerage Research Agent — quarterly MarketBeat PDF harvester + JLL API.

Downloads and parses quarterly market reports from Cushman & Wakefield
and CBRE. Extracts structured CRE fundamentals:
  - Vacancy rate by property type
  - Asking/effective rent
  - Net absorption (SF)
  - Under construction / deliveries (SF)
  - Cap rates (if included)

C&W: Scrapes market-level pages for direct PDF links on assets.cushmanwakefield.com.
CBRE: PDF extraction only — HTML scraping blocked by Cloudflare (403).
      Existing PDF path retained; no new discovery attempts.
JLL: REST API (Elasticsearch) at jll.com/api/search/template.
     Extracts metrics from article descriptions (no PDF download needed).

Source: Public PDF downloads + JLL public API
Auth: None (public)
Frequency: Quarterly
"""

from __future__ import annotations

import hashlib
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
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


# ── Cushman & Wakefield: market-level pages with direct PDF links ────

CW_BASE = "https://www.cushmanwakefield.com/en/united-states/insights/us-marketbeats"
CW_PDF_HOST = "assets.cushmanwakefield.com"

# Target market page slugs → display names
CW_MARKETS = {
    "phoenix-marketbeats": "Phoenix",
    "tucson-marketbeats": "Tucson",
    "los-angeles-marketbeats": "Los Angeles",
}

# ── CBRE: PDF extraction only (HTML blocked by Cloudflare) ───────────

CBRE_BASE = "https://www.cbre.com/insights/figures"
CBRE_PDF_HOST = "mktgdocs.cbre.com"

# Property-type figures page paths → property type labels
CBRE_FIGURES_PAGES = {
    "us-office-figures": "office",
    "us-industrial-figures": "industrial",
    "us-multifamily-figures": "multifamily",
    "us-retail-figures": "retail",
}

# ── JLL: REST API (Elasticsearch) ───────────────────────────────────

JLL_API_URL = "https://www.jll.com/api/search/template"
JLL_SUBSCRIPTION_KEY = "8f6a4de5b0144673acaa89b03aac035e"
JLL_TEMPLATE = "jll_dynamic_list_search_template_v2"
JLL_LANGUAGE = "en-US"

# Property types to search for in JLL API
JLL_PROPERTY_TYPES = ["Office", "Industrial and logistics", "Multifamily", "Retail"]

# Max HTTP requests per run across all brokerages
MAX_REQUESTS_PER_RUN = 60

# ── C&W submarket table column mapping ───────────────────────────────
# Each entry: (header_keywords, data_category, metric_name, metric_unit)
# Header matching is case-insensitive substring. First match wins.

CW_COLUMN_MAP = [
    # Inventory / supply
    (["inventory", "total sf", "total supply"],
     "inventory", "total_inventory_sf", "sf"),

    # Vacancy
    (["vacancy rate", "vacancy", "vac rate", "vac."],
     "vacancy", "vacancy_rate", "percent"),

    # YoY vacancy change
    (["yoy vacancy", "yoy vac", "vacancy change", "vac change", "pp change"],
     "vacancy", "yoy_vacancy_change", "percent"),

    # Effective rent per unit
    (["rent/unit", "rent per unit", "eff rent/unit", "eff. rent/unit", "avg eff rent/unit",
      "avg effective rent/unit"],
     "rent", "effective_rent_per_unit", "usd"),

    # Asking rent (office/industrial/retail — typically $/SF)
    (["asking rent", "avg asking", "overall avg asking"],
     "rent", "asking_rent_psf", "usd_psf"),

    # Effective rent PSF
    (["rent psf", "rent/sf", "rent per sf", "eff rent psf", "eff. rent/sf",
      "avg eff rent psf", "avg effective rent psf", "effective rent psf"],
     "rent", "effective_rent_psf", "usd_psf"),

    # YoY rent growth
    (["rent growth", "yoy rent", "yoy growth"],
     "rent", "yoy_rent_growth", "percent"),

    # Absorption
    (["net absorption", "absorption"],
     "absorption", "net_absorption_sf", "sf"),

    # Under construction
    (["under const", "under cnstr", "construction", "uc sf"],
     "construction", "under_construction_sf", "sf"),

    # Deliveries
    (["deliveries", "delivered", "completions"],
     "construction", "deliveries_sf", "sf"),

    # Cap rate
    (["cap rate", "capitalization"],
     "sale_price", "cap_rate", "percent"),
]


# Property type keywords for classifying C&W PDFs from filename/title
PROPERTY_TYPE_KEYWORDS = {
    "office": ["office"],
    "industrial": ["industrial", "logistics", "warehouse"],
    "multifamily": ["multifamily", "apartment", "residential"],
    "retail": ["retail", "shopping", "consumer"],
}

# ── JLL description metric extraction patterns ──────────────────────

# Patterns that extract (value, unit) from JLL description text
JLL_METRIC_PATTERNS = [
    # Vacancy: "vacancy at 5.7%", "vacancy rate of 12.3%", "vacancy decreased to 8.1%"
    (r'vacancy\s+(?:rate\s+)?(?:at|of|to|is|was|reached|stands?\s+at|declined?\s+to|decreased?\s+to|increased?\s+to|rose\s+to|fell\s+to)\s+([\d.]+)\s*%',
     "vacancy", "vacancy_rate", "percent"),
    # Vacancy "from X% ... to Y%": capture the "to" value
    (r'vacancy\s+(?:rate\s+)?(?:decreased|increased|declined|rose|fell|went|moved)\s+from\s+[\d.]+%.*?to\s+([\d.]+)\s*%',
     "vacancy", "vacancy_rate", "percent"),
    # Vacancy "below/above X%"
    (r'vacancy\s+(?:rate\s+)?(?:of\s+)?(?:below|above|under|over)\s+([\d.]+)\s*%',
     "vacancy", "vacancy_rate", "percent"),
    # Vacancy alt: "current vacancy at 5.7%", "5.7% vacancy"
    (r'([\d.]+)\s*%\s+vacancy',
     "vacancy", "vacancy_rate", "percent"),
    # Vacancy change: "down from 6.5%"
    (r'(?:down|up)\s+from\s+([\d.]+)\s*%',
     "vacancy", "prior_vacancy_rate", "percent"),
    # Vacancy change bps: "vacancy ... decreased 2.2 pp", "+150 bps"
    (r'vacancy.*?(?:increased|decreased|rose|fell|changed)\s+([\d.]+)\s*(?:pp|bps|percentage\s+point)',
     "vacancy", "yoy_vacancy_change", "bps"),
    # Asking rent: "asking rent of $XX.XX", "asking rents average $XX"
    (r'asking\s+rents?\s+(?:of|average[ds]?|at|is|was|reached)\s+\$([\d,.]+)',
     "rent", "asking_rent_psf", "usd_psf"),
    # Rent PSF: "$XX.XX per square foot", "$XX.XX PSF"
    (r'\$([\d,.]+)\s*(?:per\s+square\s+foot|psf|per\s+sf|/sf)',
     "rent", "asking_rent_psf", "usd_psf"),
    # Rent per unit: "$X,XXX per unit", "$1,182/unit"
    (r'\$([\d,.]+)\s*(?:per\s+unit|/unit)',
     "rent", "effective_rent_unit", "usd"),
    # Rent growth: "rent growth of X.X%", "rents grew X.X%"
    (r'rent\s+growth\s+(?:of\s+)?([\d.]+)\s*%',
     "rent", "yoy_rent_growth", "percent"),
    # Net absorption SF: "absorption of X,XXX SF", "absorbed X.X MSF", "reached a solid X sqm"
    (r'(?:net\s+)?absorption\s+(?:of\s+|reached\s+(?:a\s+\w+\s+)?|was\s+|totaled?\s+)([\d,.]+)\s*(msf|sf|sqm|square\s+(?:feet|meters))',
     "absorption", "net_absorption_sf", "sf"),
    # Under construction: "X.X MSF under construction"
    (r'([\d,.]+)\s*(msf|sf)\s+under\s+construction',
     "pipeline", "under_construction_sf", "sf"),
    # Deliveries: "X.X MSF delivered", "deliveries of X MSF"
    (r'(?:deliveries?\s+(?:of\s+|totaled?\s+))([\d,.]+)\s*(msf|sf)',
     "pipeline", "deliveries_sf", "sf"),
    (r'([\d,.]+)\s*(msf|sf)\s+delivered',
     "pipeline", "deliveries_sf", "sf"),
    # Cap rate: "cap rate of X.X%", "X.X% cap rate"
    (r'cap\s+rate\s+(?:of\s+|at\s+|is\s+)?([\d.]+)\s*%',
     "cap_rate", "cap_rate", "percent"),
    (r'([\d.]+)\s*%\s+cap\s+rate',
     "cap_rate", "cap_rate", "percent"),
]


class BrokerageResearchAgent(BaseResearchAgent):
    """Harvests quarterly MarketBeat PDFs from C&W and CBRE, plus JLL API."""

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

        # ── Phase 1: Cushman & Wakefield market pages ────────────
        for market_slug, market_name in CW_MARKETS.items():
            if not self._check_budget():
                break
            try:
                self._harvest_cw_market(market_slug, market_name, stats)
            except Exception as exc:
                err = f"C&W {market_name} harvest failed: {exc}"
                logger.error("[BROKERAGE] %s", err)
                stats.errors.append(err)

        # ── Phase 2: CBRE figures pages ──────────────────────────
        # Note: CBRE HTML is blocked by Cloudflare (403).
        # PDF extraction path retained for existing downloads.
        # New discovery attempts skipped to avoid noisy failures.
        for page_slug, prop_type in CBRE_FIGURES_PAGES.items():
            if not self._check_budget():
                break
            try:
                self._harvest_cbre_figures(page_slug, prop_type, stats)
            except Exception as exc:
                err = f"CBRE {prop_type} harvest failed: {exc}"
                logger.error("[BROKERAGE] %s", err)
                stats.errors.append(err)

        # ── Phase 3: JLL REST API ────────────────────────────────
        try:
            self._harvest_jll(stats)
        except Exception as exc:
            err = f"JLL harvest failed: {exc}"
            logger.error("[BROKERAGE] %s", err)
            stats.errors.append(err)

    # ── Cushman & Wakefield ──────────────────────────────────────────

    def _harvest_cw_market(self, market_slug: str, market_name: str,
                           stats: HarvestStats) -> None:
        """Scrape a C&W market page for MarketBeat PDF links."""
        url = f"{CW_BASE}/{market_slug}"
        logger.info("[BROKERAGE] Crawling C&W %s: %s", market_name, url)

        try:
            resp = self._counted_fetch(url)
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            stats.errors.append(f"C&W {market_name} page fetch failed: {exc}")
            return

        # Find all PDF links on assets.cushmanwakefield.com
        pdf_links = self._extract_cw_pdf_links(soup, market_name)
        stats.publications_discovered += len(pdf_links)
        logger.info("[BROKERAGE] C&W %s: found %d PDF links", market_name, len(pdf_links))

        for pdf_info in pdf_links:
            if not self._check_budget():
                break
            self._process_pdf_link(pdf_info, "cushman_wakefield", "Cushman & Wakefield", stats)

    def _extract_cw_pdf_links(self, soup: BeautifulSoup, market_name: str) -> List[Dict]:
        """Extract all C&W MarketBeat PDF links from a market page."""
        results = []
        seen_urls = set()

        for link in soup.select(f'a[href*="{CW_PDF_HOST}"]'):
            href = link.get("href", "").strip()
            if not href or ".pdf" not in href.lower():
                continue
            if href in seen_urls:
                continue
            seen_urls.add(href)

            # Ensure full URL
            if href.startswith("//"):
                href = "https:" + href

            # Extract metadata from URL path
            filename = href.rsplit("/", 1)[-1] if "/" in href else href
            title, prop_type, quarter, year = self._parse_cw_filename(filename, market_name)

            # Build a stable source_id from the URL path
            source_id = self._make_source_id("cw", href)

            results.append({
                "source_id": source_id,
                "title": title,
                "pdf_url": href,
                "market": market_name,
                "property_type": prop_type,
                "quarter": quarter,
                "year": year,
                "published_date": self._quarter_to_date(quarter, year),
                "brokerage": "cushman_wakefield",
            })

        return results

    @staticmethod
    def _parse_cw_filename(filename: str, market_name: str) -> Tuple[str, Optional[str], Optional[str], Optional[str]]:
        """Parse a C&W PDF filename into title, property_type, quarter, year.

        Typical pattern: phoenix_americas_marketbeat_office_q42025.pdf
        """
        clean = filename.lower().replace(".pdf", "").replace("-", "_")

        # Extract quarter and year: q42025, q1_2025, q4_2025_v2, etc.
        qy_match = re.search(r'q(\d)\s*_?\s*(\d{4})', clean)
        quarter = f"Q{qy_match.group(1)}" if qy_match else None
        year = qy_match.group(2) if qy_match else None

        # Extract property type
        prop_type = None
        for pt, keywords in PROPERTY_TYPE_KEYWORDS.items():
            if any(kw in clean for kw in keywords):
                prop_type = pt
                break

        # Build a readable title
        parts = [market_name]
        if prop_type:
            parts.append(prop_type.title())
        parts.append("MarketBeat")
        if quarter and year:
            parts.append(f"{quarter} {year}")
        title = " ".join(parts)

        return title, prop_type, quarter, year

    # ── CBRE ─────────────────────────────────────────────────────────

    def _harvest_cbre_figures(self, page_slug: str, prop_type: str,
                              stats: HarvestStats) -> None:
        """Scrape a CBRE figures page for report PDF links."""
        url = f"{CBRE_BASE}/{page_slug}"
        logger.info("[BROKERAGE] Crawling CBRE %s: %s", prop_type, url)

        try:
            resp = self._counted_fetch(url)
            # CBRE returns 403 due to Cloudflare — handle gracefully
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            # Expected: CBRE blocks scraping. Log at info level, not error.
            logger.info("[BROKERAGE] CBRE %s page blocked (expected): %s", prop_type, exc)
            return

        # Find all PDF links on mktgdocs.cbre.com
        pdf_links = self._extract_cbre_pdf_links(soup, prop_type)
        stats.publications_discovered += len(pdf_links)
        logger.info("[BROKERAGE] CBRE %s: found %d PDF links", prop_type, len(pdf_links))

        for pdf_info in pdf_links:
            if not self._check_budget():
                break
            self._process_pdf_link(pdf_info, "cbre", "CBRE Group", stats)

    def _extract_cbre_pdf_links(self, soup: BeautifulSoup, prop_type: str) -> List[Dict]:
        """Extract CBRE report PDF links from a figures page."""
        results = []
        seen_urls = set()

        for link in soup.select(f'a[href*="{CBRE_PDF_HOST}"]'):
            href = link.get("href", "").strip()
            if not href or ".pdf" not in href.lower():
                continue
            if href in seen_urls:
                continue
            seen_urls.add(href)

            if href.startswith("//"):
                href = "https:" + href

            filename = href.rsplit("/", 1)[-1] if "/" in href else href
            title, quarter, year = self._parse_cbre_filename(filename, prop_type)
            source_id = self._make_source_id("cbre", href)

            results.append({
                "source_id": source_id,
                "title": title,
                "pdf_url": href,
                "market": "National",
                "property_type": prop_type,
                "quarter": quarter,
                "year": year,
                "published_date": self._quarter_to_date(quarter, year),
                "brokerage": "cbre",
            })

        return results

    @staticmethod
    def _parse_cbre_filename(filename: str, prop_type: str) -> Tuple[str, Optional[str], Optional[str]]:
        """Parse a CBRE PDF filename into title, quarter, year.

        Typical: Q4-2025_U.S._Office_Figures.pdf
        """
        clean = filename.replace(".pdf", "").replace("-", "_").replace(" ", "_")

        qy_match = re.search(r'[Qq](\d)[\s_-]*(\d{4})', clean)
        quarter = f"Q{qy_match.group(1)}" if qy_match else None
        year = qy_match.group(2) if qy_match else None

        parts = ["CBRE U.S.", prop_type.title(), "Figures"]
        if quarter and year:
            parts.append(f"{quarter} {year}")
        title = " ".join(parts)

        return title, quarter, year

    # ── Shared: process a discovered PDF link ────────────────────────

    def _process_pdf_link(self, pdf_info: Dict, brokerage_key: str,
                          publisher: str, stats: HarvestStats) -> None:
        """Upsert publication, download PDF, extract financial data."""
        source_id = pdf_info["source_id"]

        # Skip if already extracted
        existing = self.get_existing_publication(source_id)
        if existing and existing.get("extraction_status") in ("extracted", "downloaded"):
            return

        pub = PublicationRecord(
            source=brokerage_key,
            source_id=source_id,
            publication_type="market_report",
            title=pdf_info["title"],
            publisher=publisher,
            published_date=pdf_info.get("published_date"),
            categories=["Market Fundamentals"],
            tags=[
                brokerage_key,
                "MarketBeat" if brokerage_key == "cushman_wakefield" else "Figures",
                pdf_info.get("property_type", ""),
                pdf_info.get("market", ""),
            ],
            document_type="pdf",
            summary=None,
            source_url=pdf_info["pdf_url"],
            pdf_url=pdf_info["pdf_url"],
            is_gated=False,
            extraction_status="pending",
            metadata={
                "brokerage": brokerage_key,
                "market": pdf_info.get("market"),
                "property_type": pdf_info.get("property_type"),
                "quarter": pdf_info.get("quarter"),
                "year": pdf_info.get("year"),
            },
        )
        pub_id, is_new = self.upsert_publication(pub)
        if is_new:
            stats.publications_new += 1
        else:
            stats.publications_updated += 1

        # Download PDF
        if self._check_budget():
            local_path = self._download_report_pdf(
                pub_id, source_id, pdf_info["pdf_url"], brokerage_key, stats
            )
            if local_path:
                self._extract_market_data(
                    pub_id, local_path, brokerage_key,
                    pdf_info.get("property_type"),
                    pdf_info.get("market"),
                    pdf_info.get("quarter"),
                    pdf_info.get("year"),
                    stats,
                )

    def _download_report_pdf(self, pub_id: str, source_id: str, pdf_url: str,
                              brokerage: str, stats: HarvestStats) -> Optional[str]:
        """Download a brokerage report PDF."""
        pdf_base = getattr(self.config, "brokerage_pdf_storage_path", "data/brokerage/pdfs")
        year = datetime.now().strftime("%Y")
        filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', source_id)[:100] + ".pdf"
        dest_path = f"{pdf_base}/{brokerage}/{year}/{filename}"

        if Path(dest_path).exists():
            # Already downloaded — skip download, but still extract if needed
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

    # ── PDF extraction ───────────────────────────────────────────────

    def _extract_market_data(self, pub_id: str, pdf_path: str, brokerage: str,
                              property_type: Optional[str], market: Optional[str],
                              quarter: Optional[str], year: Optional[str],
                              stats: HarvestStats) -> None:
        """Extract CRE fundamentals from a MarketBeat/Figures PDF.

        For C&W PDFs, uses the structured column map (CW_COLUMN_MAP) to
        extract all metrics from submarket tables — not just vacancy.
        For other brokerages, falls back to generic table classification.
        """
        tables = self.extract_tables_from_pdf(pdf_path)
        if not tables:
            logger.info("[BROKERAGE] No tables found in %s", pdf_path)
            return

        ref_period = f"{quarter} {year}" if quarter and year else None
        records_created = 0

        for table_info in tables:
            headers = table_info["headers"]
            rows = table_info["rows"]
            page = table_info["page"]

            # Try C&W column-mapped extraction first
            col_mapping = self._match_cw_columns(headers)
            if col_mapping:
                records_created += self._extract_cw_submarket_table(
                    pub_id, headers, rows, col_mapping, page,
                    property_type, market, ref_period, stats,
                )
                continue

            # Fallback: generic table classification (CBRE, etc.)
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
                    if not cell or cell in ("-", "N/A", "—", ""):
                        continue

                    value, unit = self._parse_market_value(cell)
                    header = headers[col_idx].strip() if col_idx < len(headers) else ""

                    cell_ref_period = header if self._looks_like_period(header) else ref_period

                    try:
                        self.upsert_financial_data(FinancialDataRecord(
                            publication_id=pub_id,
                            data_category=category,
                            metric_name=metric_name,
                            metric_value=value,
                            metric_unit=unit,
                            metric_text=cell if value is None else None,
                            property_type=property_type,
                            geography=market,
                            reference_period=cell_ref_period,
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
            logger.info(
                "[BROKERAGE] Extracted %d data points from %s",
                records_created, pdf_path,
            )
        else:
            logger.info("[BROKERAGE] No data points extracted from %s", pdf_path)

    # ── C&W structured column extraction ─────────────────────────────

    @staticmethod
    def _match_cw_columns(headers: List[str]) -> Optional[Dict[int, Tuple[str, str, str]]]:
        """Match table headers against CW_COLUMN_MAP.

        Returns a dict of {col_index: (data_category, metric_name, metric_unit)}
        if at least 2 columns match (indicating a submarket table).
        Returns None if this isn't a C&W submarket table.
        """
        if not headers or len(headers) < 3:
            return None

        mapping: Dict[int, Tuple[str, str, str]] = {}

        for col_idx in range(1, len(headers)):  # Skip col 0 (submarket name)
            header = (headers[col_idx] or "").strip().lower()
            if not header:
                continue

            for keywords, category, metric_name, unit in CW_COLUMN_MAP:
                if any(kw in header for kw in keywords):
                    mapping[col_idx] = (category, metric_name, unit)
                    break

        # Require at least 2 matched columns to treat as a submarket table
        return mapping if len(mapping) >= 2 else None

    def _extract_cw_submarket_table(
        self,
        pub_id: str,
        headers: List[str],
        rows: List[List[str]],
        col_mapping: Dict[int, Tuple[str, str, str]],
        page: int,
        property_type: Optional[str],
        market: Optional[str],
        ref_period: Optional[str],
        stats: HarvestStats,
    ) -> int:
        """Extract all metrics from a C&W submarket table using column mapping.

        Each row = one submarket. Each mapped column = one metric.
        Row[0] is the submarket name (used as geography).
        """
        records_created = 0

        for row in rows:
            if not row or len(row) < 2:
                continue

            # Column 0 = submarket name
            submarket = (row[0] or "").strip()
            if not submarket:
                continue
            # Skip summary/total rows and header repeats
            if submarket.lower() in ("total", "overall", "market", "submarket", "metro"):
                continue

            # Build geography: "Phoenix > Scottsdale" or just submarket
            geography = f"{market} > {submarket}" if market else submarket

            for col_idx, (category, metric_name, expected_unit) in col_mapping.items():
                if col_idx >= len(row):
                    continue

                cell = (row[col_idx] or "").strip()
                if not cell or cell in ("-", "N/A", "—", "", "*"):
                    continue

                value, parsed_unit = self._parse_cw_cell(cell, expected_unit)
                if value is None:
                    continue

                confidence = 0.90 if parsed_unit else 0.70

                try:
                    self.upsert_financial_data(FinancialDataRecord(
                        publication_id=pub_id,
                        data_category=category,
                        metric_name=metric_name,
                        metric_value=value,
                        metric_unit=expected_unit,
                        property_type=property_type,
                        geography=geography,
                        reference_period=ref_period,
                        context=f"{submarket} | {headers[col_idx].strip()}: {cell}",
                        confidence_score=confidence,
                        extraction_method="table_parse",
                        page_number=page,
                    ))
                    records_created += 1
                except Exception:
                    pass

        return records_created

    @staticmethod
    def _parse_cw_cell(text: str, expected_unit: str) -> Tuple[Optional[float], Optional[str]]:
        """Parse a C&W table cell value with awareness of expected unit type.

        Handles: percentages, currency, SF with commas, parenthetical negatives.
        Returns (value, detected_unit) — detected_unit is None if value needed cleaning.
        """
        if not text:
            return None, None

        cleaned = text.strip()

        # Handle parenthetical negatives: "(2.3%)" → "-2.3%"
        paren_match = re.match(r'^\((.*)\)$', cleaned)
        if paren_match:
            cleaned = "-" + paren_match.group(1).strip()

        # Strip known suffixes/prefixes for parsing
        stripped = cleaned.replace(",", "").replace("$", "").replace("%", "").strip()

        # Try to extract a float
        num_match = re.match(r'^(-?[\d.]+)', stripped)
        if not num_match:
            return None, None

        try:
            value = float(num_match.group(1))
        except ValueError:
            return None, None

        # Detect unit from the original text
        detected_unit = None
        if "%" in cleaned:
            detected_unit = "percent"
        elif "$" in cleaned:
            detected_unit = "usd"
        elif re.search(r'sf|SF', cleaned):
            detected_unit = "sf"

        return value, detected_unit

    # ── Reprocessing support ─────────────────────────────────────────

    def reprocess_existing_pdfs(self) -> HarvestStats:
        """Re-extract financial data from all already-downloaded C&W PDFs.

        Does NOT re-download or re-discover. Iterates publications with
        local_pdf_path set and re-runs extraction with the expanded column map.
        """
        stats = HarvestStats()
        logger.info("[BROKERAGE] Starting reprocess of existing C&W PDFs")

        cur = self.conn.cursor(cursor_factory=__import__('psycopg2').extras.RealDictCursor)
        cur.execute("""
            SELECT id::text, source, source_id, local_pdf_path,
                   metadata->>'property_type' as property_type,
                   metadata->>'market' as market,
                   metadata->>'quarter' as quarter,
                   metadata->>'year' as year
            FROM landscape.tbl_research_publication
            WHERE source = 'cushman_wakefield'
              AND local_pdf_path IS NOT NULL
            ORDER BY published_date DESC NULLS LAST
        """)
        rows = cur.fetchall()
        logger.info("[BROKERAGE] Found %d C&W publications with local PDFs", len(rows))

        for row in rows:
            pdf_path = row["local_pdf_path"]
            if not Path(pdf_path).exists():
                logger.warning("[BROKERAGE] PDF missing: %s", pdf_path)
                stats.errors.append(f"Missing PDF: {pdf_path}")
                continue

            self._extract_market_data(
                pub_id=row["id"],
                pdf_path=pdf_path,
                brokerage="cushman_wakefield",
                property_type=row.get("property_type"),
                market=row.get("market"),
                quarter=row.get("quarter"),
                year=row.get("year"),
                stats=stats,
            )

        logger.info(
            "[BROKERAGE] Reprocess complete: %d data points extracted, %d errors",
            stats.extractions_completed, len(stats.errors),
        )
        return stats

    def _classify_market_table(self, headers: List[str]) -> Optional[str]:
        """Classify a table from a brokerage report by header keywords."""
        header_text = " ".join(h.lower() for h in headers if h)
        mappings = {
            "vacancy": ["vacancy", "occupancy"],
            "rent": ["rent", "asking", "effective", "lease"],
            "absorption": ["absorption", "net absorption"],
            "construction": ["construction", "deliveries", "pipeline", "completions", "under const"],
            "sale_price": ["cap rate", "sale", "transaction", "investment"],
            "supply": ["inventory", "stock", "total sf", "total supply"],
        }
        for cat, keywords in mappings.items():
            if any(kw in header_text for kw in keywords):
                return cat
        # Fall back to base class keyword classifier
        return self.classify_table(headers)

    @staticmethod
    def _parse_market_value(text: str) -> Tuple[Optional[float], Optional[str]]:
        """Parse a cell value into (float_value, unit_string)."""
        if not text:
            return None, None
        cleaned = text.strip()

        # Percentage: "5.2%", "12.3 %"
        m = re.match(r'^-?([\d,.]+)\s*%$', cleaned)
        if m:
            try:
                return float(m.group(1).replace(",", "")), "percent"
            except ValueError:
                return None, None

        # Square footage: "1,234 SF", "2.5 MSF"
        m = re.match(r'^-?([\d,.]+)\s*(sf|SF|msf|MSF|units?)$', cleaned)
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

        # Currency: "$12.50", "$1.2M", "$45 PSF"
        m = re.match(r'^\$\s*-?([\d,.]+)\s*(M|K|B|psf|/sf|per sf)?$', cleaned, re.I)
        if m:
            try:
                val = float(m.group(1).replace(",", ""))
                suffix = (m.group(2) or "").upper()
                mults = {"M": 1e6, "K": 1e3, "B": 1e9}
                val *= mults.get(suffix, 1)
                unit = "usd_psf" if suffix in ("PSF", "/SF", "PER SF") else "usd"
                return val, unit
            except ValueError:
                return None, None

        # Basis points: "150 bps", "+25 bps"
        m = re.match(r'^[+-]?([\d,.]+)\s*bps$', cleaned, re.I)
        if m:
            try:
                return float(m.group(1).replace(",", "")), "bps"
            except ValueError:
                return None, None

        # Plain number: "1,234", "-567"
        m = re.match(r'^-?([\d,.]+)$', cleaned)
        if m:
            try:
                return float(m.group(0).replace(",", "")), None
            except ValueError:
                return None, None

        return None, None

    @staticmethod
    def _looks_like_period(text: str) -> bool:
        """Check if text looks like a time period (Q4 2025, 2025, etc.)."""
        if not text:
            return False
        return bool(re.search(r'\d{4}|[1-4]Q\d{2}|Q[1-4]', text, re.I))

    @staticmethod
    def _quarter_to_date(quarter: Optional[str], year: Optional[str]) -> Optional[str]:
        """Convert Q4/2025 to an ISO date string (last day of quarter)."""
        if not quarter or not year:
            return None
        try:
            q_num = int(quarter.replace("Q", ""))
            y = int(year)
            # Last day of the quarter
            end_months = {1: 3, 2: 6, 3: 9, 4: 12}
            month = end_months.get(q_num, 12)
            if month in (1, 3, 12):
                day = 31
            elif month in (4, 6, 9, 11):
                day = 30
            else:
                day = 28
            return f"{y}-{month:02d}-{day:02d}"
        except (ValueError, KeyError):
            return None

    @staticmethod
    def _make_source_id(prefix: str, url: str) -> str:
        """Create a stable, deduplication-safe source_id from a URL."""
        # Extract the meaningful path portion after the domain
        path = url.split("//", 1)[-1]  # Remove protocol
        path = path.split("/", 1)[-1] if "/" in path else path  # Remove domain
        # Clean and truncate
        clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', path)[:150]
        return f"{prefix}_{clean}"

    # ── JLL: REST API harvesting ─────────────────────────────────────

    def _harvest_jll(self, stats: HarvestStats) -> None:
        """Harvest JLL market reports via their public Elasticsearch API."""
        logger.info("[BROKERAGE] Starting JLL API harvest")

        # Search for US market reports across property types
        hits = self._jll_search_reports(
            topics=["Market dynamics"],
            property_types=JLL_PROPERTY_TYPES,
            countries=["United States"],
            size=50,
        )

        if not hits:
            logger.info("[BROKERAGE] JLL API returned no results")
            return

        stats.publications_discovered += len(hits)
        logger.info("[BROKERAGE] JLL API: found %d market reports", len(hits))

        for hit in hits:
            try:
                self._process_jll_hit(hit, stats)
            except Exception as exc:
                err = f"JLL hit processing failed: {exc}"
                logger.warning("[BROKERAGE] %s", err)
                stats.errors.append(err)

    def _jll_search_reports(self, topics: List[str] = None,
                             property_types: List[str] = None,
                             countries: List[str] = None,
                             size: int = 50) -> List[Dict]:
        """Query JLL's Elasticsearch API for research articles."""
        import json as json_mod

        params: Dict[str, str] = {
            "from": "0",
            "size": str(size),
            "language": JLL_LANGUAGE,
        }

        if topics:
            params["topics"] = json_mod.dumps(topics)
        if property_types:
            params["propertyTypes"] = json_mod.dumps(property_types)
        if countries:
            params["countries"] = json_mod.dumps(countries)

        # Always filter to Insight content type
        params["contentType"] = json_mod.dumps(["Insight"])

        body = {
            "id": JLL_TEMPLATE,
            "params": params,
        }

        self._rate_limit()
        self._request_count += 1

        resp = self.http.post(
            JLL_API_URL,
            json=body,
            headers={
                "subscription-key": JLL_SUBSCRIPTION_KEY,
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        return data.get("hits", {}).get("hits", [])

    def _process_jll_hit(self, hit: Dict, stats: HarvestStats) -> None:
        """Process a single JLL search result into publication + financial data."""
        source_data = hit.get("_source", {})

        title = source_data.get("title", "").strip()
        if not title:
            return

        # Build stable source_id from title hash (JLL has no stable doc ID)
        title_hash = hashlib.sha256(title.encode()).hexdigest()[:16]
        source_id = f"jll_{title_hash}"

        # Skip if already extracted
        existing = self.get_existing_publication(source_id)
        if existing and existing.get("extraction_status") in ("extracted",):
            return

        # Parse metadata
        date_str = source_data.get("datePublished", "")
        published_date = date_str[:10] if date_str and len(date_str) >= 10 else None

        prop_types = source_data.get("propertyTypes", [])
        property_type = self._normalize_jll_property_type(prop_types[0]) if prop_types else None

        geographies = source_data.get("geography", [])
        geography = geographies[0] if geographies else "United States"

        page_url = source_data.get("pageUrl", "")
        description = source_data.get("description", "")
        topics = source_data.get("topics", [])

        # Determine quarter/year from published_date
        quarter, year_str = None, None
        if published_date:
            try:
                dt = datetime.strptime(published_date, "%Y-%m-%d")
                q_num = (dt.month - 1) // 3 + 1
                quarter = f"Q{q_num}"
                year_str = str(dt.year)
            except ValueError:
                pass

        pub = PublicationRecord(
            source="jll",
            source_id=source_id,
            publication_type="market_report",
            title=title,
            publisher="Jones Lang LaSalle",
            published_date=published_date,
            categories=["Market Fundamentals"],
            tags=["jll", "market_report"] + [t.lower().replace(" ", "_") for t in topics[:3]],
            document_type="html",
            summary=description[:500] if description else None,
            source_url=page_url,
            pdf_url=None,  # JLL gates PDFs behind Eloqua forms
            is_gated=True,  # PDF requires form submission
            extraction_status="pending",
            metadata={
                "brokerage": "jll",
                "market": geography,
                "property_type": property_type,
                "quarter": quarter,
                "year": year_str,
                "topics": topics,
                "property_types_raw": prop_types,
            },
        )

        pub_id, is_new = self.upsert_publication(pub)
        if is_new:
            stats.publications_new += 1
        else:
            stats.publications_updated += 1

        # Extract metrics from description text
        if description:
            content_hash = self.compute_text_hash(description)
            records = self._extract_jll_description_metrics(
                pub_id, description, property_type, geography, quarter, year_str,
            )
            if records:
                count = self.upsert_financial_data_batch(records)
                stats.extractions_completed += count
                self.update_publication_status(
                    pub_id, "extracted", content_hash=content_hash,
                )
                logger.info(
                    "[BROKERAGE] JLL: extracted %d metrics from '%s'",
                    count, title[:60],
                )
            else:
                self.update_publication_status(
                    pub_id, "no_data", content_hash=content_hash,
                )
        else:
            self.update_publication_status(pub_id, "no_data")

    def _extract_jll_description_metrics(
        self,
        pub_id: str,
        description: str,
        property_type: Optional[str],
        geography: Optional[str],
        quarter: Optional[str],
        year: Optional[str],
    ) -> List[FinancialDataRecord]:
        """Extract CRE metrics from a JLL article description via regex."""
        ref_period = f"{quarter} {year}" if quarter and year else None
        records = []

        for pattern, category, metric_name, unit in JLL_METRIC_PATTERNS:
            for match in re.finditer(pattern, description, re.IGNORECASE):
                raw_value = match.group(1).replace(",", "")
                try:
                    value = float(raw_value)
                except ValueError:
                    continue

                # Normalize SF units
                actual_unit = unit
                if unit == "sf" and len(match.groups()) > 1:
                    sf_unit = match.group(2).lower() if match.lastindex >= 2 else ""
                    if sf_unit == "msf":
                        value *= 1_000_000

                # Build context from surrounding text
                start = max(0, match.start() - 30)
                end = min(len(description), match.end() + 30)
                context = description[start:end].strip()

                records.append(FinancialDataRecord(
                    publication_id=pub_id,
                    data_category=category,
                    metric_name=metric_name,
                    metric_value=value,
                    metric_unit=actual_unit,
                    property_type=property_type,
                    geography=geography,
                    reference_period=ref_period,
                    context=context,
                    confidence_score=0.6,  # Lower than table_parse — regex from narrative
                    extraction_method="description_parse",
                ))

        return records

    @staticmethod
    def _normalize_jll_property_type(raw_type: str) -> Optional[str]:
        """Normalize JLL property type labels to our standard set."""
        mapping = {
            "Office": "office",
            "Industrial and logistics": "industrial",
            "Industrial": "industrial",
            "Logistics": "industrial",
            "Multifamily": "multifamily",
            "Living and multifamily": "multifamily",
            "Retail": "retail",
            "Healthcare property": "healthcare",
            "Lab": "lab",
            "Data centers": "data_center",
        }
        return mapping.get(raw_type, raw_type.lower().replace(" ", "_") if raw_type else None)


def run_standalone():
    import sys
    agent = BrokerageResearchAgent()

    if "--reprocess" in sys.argv:
        logger.info("=== Reprocessing existing C&W PDFs with expanded column map ===")
        stats = agent.reprocess_existing_pdfs()
        logger.info("Reprocess stats: %d extracted, %d errors",
                     stats.extractions_completed, len(stats.errors))
    else:
        agent.run_standalone()


if __name__ == "__main__":
    run_standalone()
