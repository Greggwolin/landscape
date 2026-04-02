"""
NAIOP Agent — industrial and office demand forecast harvester.

Harvests public research from NAIOP (Commercial Real Estate Development Association):
  - Industrial Space Demand Forecast (quarterly)
  - Office Space Demand Forecast (quarterly)
  - Economic Impacts of CRE reports
  - Market commentary and demand drivers

Source: naiop.org research/publications
Auth: None (forecasts are published as public PDFs/press releases)
Frequency: Quarterly demand forecasts, periodic research reports
"""

from __future__ import annotations

import re
from datetime import datetime
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


NAIOP_BASE = "https://www.naiop.org"
NAIOP_RESEARCH_URLS = [
    "https://www.naiop.org/research-and-publications/",
    "https://www.naiop.org/research-and-publications/industrial-space-demand-forecast/",
    "https://www.naiop.org/research-and-publications/office-space-demand-forecast/",
]

NAIOP_KEYWORDS = ["demand forecast", "industrial space", "office space",
                   "absorption", "vacancy", "construction", "economic impact",
                   "logistics", "warehouse", "supply chain"]

MAX_REQUESTS_PER_RUN = 30


class NAIOPAgent(BaseResearchAgent):
    """Harvests industrial/office demand forecasts from NAIOP."""

    def __init__(self, config: Optional[AgentConfig] = None):
        super().__init__(config)
        self._request_count = 0

    @property
    def name(self) -> str:
        return "NAIOP"

    @property
    def source_key(self) -> str:
        return "naiop"

    def _check_budget(self) -> bool:
        return self._request_count < MAX_REQUESTS_PER_RUN

    def _counted_fetch(self, url: str, **kwargs):
        self._request_count += 1
        return self.fetch_url(url, **kwargs)

    def harvest(self, stats: HarvestStats) -> None:
        self._request_count = 0
        logger.info("[NAIOP] Harvesting demand forecasts and research...")

        for research_url in NAIOP_RESEARCH_URLS:
            if not self._check_budget():
                break

            try:
                self._harvest_research_page(research_url, stats)
            except Exception as exc:
                err = f"NAIOP page {research_url} failed: {exc}"
                logger.error("[NAIOP] %s", err)
                stats.errors.append(err)

    def _harvest_research_page(self, page_url: str, stats: HarvestStats) -> None:
        """Crawl a single NAIOP research page for publications."""
        try:
            resp = self._counted_fetch(page_url)
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            stats.errors.append(f"NAIOP page fetch failed: {exc}")
            return

        articles = self._extract_research_links(soup)
        stats.publications_discovered += len(articles)
        logger.info("[NAIOP] Found %d articles from %s", len(articles), page_url)

        for article in articles:
            if not self._check_budget():
                break

            source_id = article["source_id"]
            existing = self.get_existing_publication(source_id)
            if existing and existing.get("extraction_status") in ("extracted", "downloaded"):
                continue

            # Fetch article detail
            detail_text = ""
            if article.get("url") and self._check_budget():
                try:
                    resp = self._counted_fetch(article["url"])
                    detail_soup = BeautifulSoup(resp.text, "html.parser")

                    # Check for embedded PDF link
                    pdf_link = detail_soup.select_one(
                        "a[href$='.pdf'], a[href*='/download/'], a[href*='getmedia']"
                    )
                    if pdf_link:
                        pdf_href = pdf_link.get("href", "")
                        article["pdf_url"] = pdf_href if pdf_href.startswith("http") \
                            else urljoin(NAIOP_BASE, pdf_href)

                    body = detail_soup.select_one(
                        "article, .article-content, .content-area, .research-content, main"
                    )
                    detail_text = body.get_text(separator="\n", strip=True) if body else ""
                except Exception:
                    pass

            content_hash = self.compute_text_hash(detail_text or article["title"])
            data_points = self._parse_demand_data(detail_text) if detail_text else []

            # Classify publication type
            title_lower = article["title"].lower()
            if "industrial" in title_lower:
                pub_type = "industrial_demand_forecast"
                tags = ["NAIOP", "Industrial", "Demand Forecast"]
            elif "office" in title_lower:
                pub_type = "office_demand_forecast"
                tags = ["NAIOP", "Office", "Demand Forecast"]
            else:
                pub_type = "cre_research"
                tags = ["NAIOP", "Research"]

            pub = PublicationRecord(
                source="naiop",
                source_id=source_id,
                publication_type=pub_type,
                title=article["title"],
                publisher="NAIOP",
                published_date=article.get("date"),
                categories=["Demand Forecast", "Market Fundamentals"],
                tags=tags,
                document_type="pdf" if article.get("pdf_url") else "html",
                summary=(detail_text[:500] if detail_text else article.get("teaser")),
                source_url=article.get("url"),
                pdf_url=article.get("pdf_url"),
                content_hash=content_hash,
                is_gated=False,
                extraction_status="extracted" if data_points else "cataloged",
            )
            pub_id, is_new = self.upsert_publication(pub)
            if is_new:
                stats.publications_new += 1

            if data_points:
                records = [
                    FinancialDataRecord(
                        publication_id=pub_id,
                        data_category=d["data_category"],
                        metric_name=d["metric_name"],
                        metric_value=d.get("metric_value"),
                        metric_unit=d.get("metric_unit"),
                        property_type=d.get("property_type"),
                        geography=d.get("geography", "US"),
                        reference_period=d.get("reference_period"),
                        context=d.get("context"),
                        confidence_score=0.7,
                        extraction_method="regex",
                    )
                    for d in data_points
                ]
                stats.extractions_completed += self.upsert_financial_data_batch(records)

            # Download PDF if available
            if article.get("pdf_url") and self._check_budget():
                self._download_and_extract_pdf(pub_id, source_id, article["pdf_url"], stats)

    def _extract_research_links(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract research publication links from NAIOP pages."""
        articles = []
        for item in soup.select(
            "article, .card, .publication-item, .research-item, "
            ".list-item, [class*='post'], [class*='result']"
        ):
            title_el = item.select_one("h2, h3, h4, .title, a[class*='title']")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 10:
                continue

            title_lower = title.lower()
            if not any(kw in title_lower for kw in NAIOP_KEYWORDS):
                continue

            link = title_el.find("a") or item.find("a")
            href = link.get("href", "") if link else ""
            url = href if href.startswith("http") else urljoin(NAIOP_BASE, href) if href else ""

            source_id = re.sub(r'[^a-zA-Z0-9_-]', '_', href.strip("/").split("/")[-1][:150]) if href else \
                        re.sub(r'[^a-zA-Z0-9_-]', '_', title.lower()[:100])
            source_id = f"naiop_{source_id}"

            date_el = item.select_one("time, .date, [class*='date'], small")
            date_str = None
            if date_el:
                date_text = date_el.get("datetime") or date_el.get_text(strip=True)
                for fmt in ("%Y-%m-%d", "%b %d, %Y", "%B %d, %Y", "%m/%d/%Y"):
                    try:
                        date_str = datetime.strptime(date_text.strip(), fmt).strftime("%Y-%m-%d")
                        break
                    except (ValueError, AttributeError):
                        continue

            teaser_el = item.select_one("p, .summary, .excerpt, .description")
            teaser = teaser_el.get_text(strip=True)[:300] if teaser_el else None

            articles.append({
                "source_id": source_id, "title": title,
                "url": url, "date": date_str, "teaser": teaser,
            })
        return articles

    def _parse_demand_data(self, text: str) -> List[Dict]:
        """Parse demand forecast data from article/report text."""
        data_points = []

        # Net absorption forecast (millions of SF)
        absorption_patterns = [
            (r'(?:net\s+)?absorption\s*(?:of|forecast[ed]?\s*(?:at|of|to be)?)\s*([\d,.]+)\s*(?:million|msf|M)\s*(?:sq(?:uare)?\s*f(?:ee)?t|sf)',
             "net_absorption_forecast", "msf"),
            (r'([\d,.]+)\s*(?:million|msf|M)\s*(?:sq(?:uare)?\s*f(?:ee)?t|sf)\s*(?:of\s+)?(?:net\s+)?absorption',
             "net_absorption_forecast", "msf"),
        ]
        for pattern, metric, unit in absorption_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                try:
                    val = float(match.group(1).replace(",", ""))
                    if 0 < val < 1000:
                        # Determine property type from surrounding context
                        context_window = text[max(0, match.start()-100):match.end()+50].lower()
                        ptype = "industrial" if "industrial" in context_window or "warehouse" in context_window \
                            else "office" if "office" in context_window else None

                        data_points.append({
                            "data_category": "demand_forecast",
                            "metric_name": metric,
                            "metric_value": val,
                            "metric_unit": unit,
                            "property_type": ptype,
                            "context": match.group(0)[:200],
                        })
                        break
                except ValueError:
                    pass

        # Vacancy rate forecast
        vacancy_patterns = [
            r'vacancy\s+rate\s*(?:is\s+)?(?:forecast[ed]?\s*(?:at|to)|expected\s+to\s+(?:reach|be)|projected\s+at)\s*(\d+(?:\.\d+)?)\s*%',
            r'vacancy\s*(?:of|was|:|-|at)\s*(\d+(?:\.\d+)?)\s*%',
        ]
        for pattern in vacancy_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                try:
                    val = float(match.group(1))
                    if 0 < val < 40:
                        context_window = text[max(0, match.start()-100):match.end()+50].lower()
                        ptype = "industrial" if "industrial" in context_window \
                            else "office" if "office" in context_window else None

                        data_points.append({
                            "data_category": "demand_forecast",
                            "metric_name": "vacancy_rate_forecast",
                            "metric_value": val,
                            "metric_unit": "percent",
                            "property_type": ptype,
                            "context": match.group(0)[:200],
                        })
                        break
                except ValueError:
                    pass

        # New construction / deliveries
        construction_patterns = [
            r'(?:new\s+)?(?:construction|deliveries|completions)\s*(?:of|totaling|forecast[ed]?\s*at)\s*([\d,.]+)\s*(?:million|msf|M)\s*(?:sq(?:uare)?\s*f(?:ee)?t|sf)',
        ]
        for pattern in construction_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                try:
                    val = float(match.group(1).replace(",", ""))
                    if 0 < val < 2000:
                        context_window = text[max(0, match.start()-100):match.end()+50].lower()
                        ptype = "industrial" if "industrial" in context_window \
                            else "office" if "office" in context_window else None

                        data_points.append({
                            "data_category": "demand_forecast",
                            "metric_name": "new_construction_forecast",
                            "metric_value": val,
                            "metric_unit": "msf",
                            "property_type": ptype,
                            "context": match.group(0)[:200],
                        })
                        break
                except ValueError:
                    pass

        # GDP growth references (demand driver context)
        gdp_pattern = r'GDP\s+(?:growth|forecast)\s*(?:of|at|:)\s*(\d+(?:\.\d+)?)\s*%'
        match = re.search(gdp_pattern, text, re.I)
        if match:
            try:
                val = float(match.group(1))
                if -5 < val < 15:
                    data_points.append({
                        "data_category": "demand_forecast",
                        "metric_name": "gdp_growth_assumption",
                        "metric_value": val,
                        "metric_unit": "percent",
                        "context": match.group(0)[:200],
                    })
            except ValueError:
                pass

        return data_points

    def _download_and_extract_pdf(self, pub_id: str, source_id: str,
                                   pdf_url: str, stats: HarvestStats) -> None:
        """Download a NAIOP PDF and extract tabular data."""
        import os
        pdf_base = os.environ.get("BROKERAGE_PDF_STORAGE_PATH", "data/brokerage/pdfs")
        filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', source_id)[:100] + ".pdf"
        dest_path = f"{pdf_base}/naiop/{filename}"

        from pathlib import Path
        if Path(dest_path).exists():
            return

        try:
            self.download_pdf(pdf_url, dest_path)
            stats.pdfs_downloaded += 1
            self.update_publication_status(pub_id, "downloaded", local_pdf_path=dest_path)
        except Exception as exc:
            logger.warning("[NAIOP] PDF download failed %s: %s", source_id, exc)
            return

        # Extract tables
        tables = self.extract_tables_from_pdf(dest_path)
        if not tables:
            return

        records_created = 0
        for table_info in tables:
            headers = table_info["headers"]
            rows = table_info["rows"]
            page = table_info["page"]

            header_text = " ".join(h.lower() for h in headers if h)
            is_demand_table = any(kw in header_text for kw in [
                "absorption", "vacancy", "demand", "forecast", "supply",
                "construction", "completions", "deliveries",
            ])
            if not is_demand_table:
                continue

            for row in rows:
                if not row or len(row) < 2:
                    continue
                label = (row[0] or "").strip()
                if not label:
                    continue

                for col_idx in range(1, min(len(row), len(headers))):
                    cell = (row[col_idx] or "").strip()
                    if not cell or cell in ("-", "N/A", "—"):
                        continue

                    value, unit = self._parse_forecast_value(cell)
                    if value is None:
                        continue

                    metric_name = re.sub(r'[^a-zA-Z0-9_ ]', '', label.lower()).strip()
                    metric_name = re.sub(r'\s+', '_', metric_name)[:100]
                    header = headers[col_idx].strip() if col_idx < len(headers) else ""

                    try:
                        self.upsert_financial_data(FinancialDataRecord(
                            publication_id=pub_id,
                            data_category="demand_forecast",
                            metric_name=metric_name,
                            metric_value=value,
                            metric_unit=unit,
                            geography="US",
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

    @staticmethod
    def _parse_forecast_value(text: str) -> tuple:
        """Parse a demand forecast value."""
        if not text:
            return None, None
        cleaned = text.strip()

        # Percentage
        m = re.match(r'^-?([\d,.]+)\s*%$', cleaned)
        if m:
            try:
                val = float(m.group(1).replace(",", ""))
                if cleaned.startswith("-"):
                    val = -val
                return val, "percent"
            except ValueError:
                return None, None

        # MSF / million SF
        m = re.match(r'^-?([\d,.]+)\s*(?:msf|M)$', cleaned, re.I)
        if m:
            try:
                val = float(m.group(1).replace(",", ""))
                if cleaned.startswith("-"):
                    val = -val
                return val, "msf"
            except ValueError:
                return None, None

        # SF
        m = re.match(r'^-?([\d,]+)\s*(?:sf|SF)$', cleaned)
        if m:
            try:
                val = float(m.group(1).replace(",", ""))
                if cleaned.startswith("-"):
                    val = -val
                return val, "sf"
            except ValueError:
                return None, None

        # Plain number
        m = re.match(r'^-?([\d,.]+)$', cleaned)
        if m:
            try:
                val = float(m.group(1).replace(",", ""))
                if cleaned.startswith("-"):
                    val = -val
                return val, None
            except ValueError:
                return None, None

        return None, None

    @staticmethod
    def _looks_like_period(text: str) -> bool:
        if not text:
            return False
        return bool(re.search(r'\d{4}|[1-4]Q\d{2}|Q[1-4]', text, re.I))


def run_standalone():
    agent = NAIOPAgent()
    agent.run_standalone()

if __name__ == "__main__":
    run_standalone()
