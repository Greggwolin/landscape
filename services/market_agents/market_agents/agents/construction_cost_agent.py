"""
Construction Cost Agent — ENR and RLB cost index harvester.

Harvests public construction cost data:
  - ENR Construction Cost Index (CCI) and Building Cost Index (BCI)
  - ENR city cost indexes (Phoenix, Tucson, Los Angeles, national)
  - RLB Quarterly Cost Reports (when publicly available)
  - Material price movements (steel, lumber, concrete)

Source: ENR public pages + RLB quarterly summaries
Auth: None (public content only — ENR paywall content skipped)
Frequency: Monthly (ENR), Quarterly (RLB)
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


# ENR public pages
ENR_BASE = "https://www.enr.com"
ENR_ECONOMICS_URL = "https://www.enr.com/economics"
ENR_COST_KEYWORDS = ["construction cost", "cost index", "building cost", "cci", "bci",
                      "material price", "labor cost", "steel", "lumber", "concrete"]

# RLB public pages
RLB_BASE = "https://www.rlb.com"
RLB_INSIGHTS_URL = "https://www.rlb.com/americas/insight/"
RLB_COST_KEYWORDS = ["construction cost", "quarterly cost", "escalation",
                      "market conditions", "cost report"]

MAX_REQUESTS_PER_RUN = 35


class ConstructionCostAgent(BaseResearchAgent):
    """Harvests construction cost data from ENR and RLB public pages."""

    def __init__(self, config: Optional[AgentConfig] = None):
        super().__init__(config)
        self._request_count = 0

    @property
    def name(self) -> str:
        return "CONSTRUCTION_COST"

    @property
    def source_key(self) -> str:
        return "construction_cost"

    def _check_budget(self) -> bool:
        return self._request_count < MAX_REQUESTS_PER_RUN

    def _counted_fetch(self, url: str, **kwargs):
        self._request_count += 1
        return self.fetch_url(url, **kwargs)

    def harvest(self, stats: HarvestStats) -> None:
        self._request_count = 0

        # ENR public economics/cost pages
        try:
            self._harvest_enr(stats)
        except Exception as exc:
            err = f"ENR harvest failed: {exc}"
            logger.error("[CONSTRUCTION_COST] %s", err)
            stats.errors.append(err)

        # RLB quarterly insights
        if self._check_budget():
            try:
                self._harvest_rlb(stats)
            except Exception as exc:
                err = f"RLB harvest failed: {exc}"
                logger.error("[CONSTRUCTION_COST] %s", err)
                stats.errors.append(err)

    # ── ENR ──────────────────────────────────────────────────────────

    def _harvest_enr(self, stats: HarvestStats) -> None:
        """Crawl ENR economics pages for cost index articles."""
        logger.info("[CONSTRUCTION_COST] Crawling ENR economics...")

        try:
            resp = self._counted_fetch(ENR_ECONOMICS_URL)
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            stats.errors.append(f"ENR page fetch failed: {exc}")
            return

        articles = self._extract_enr_articles(soup)
        stats.publications_discovered += len(articles)
        logger.info("[CONSTRUCTION_COST] ENR: found %d cost articles", len(articles))

        for article in articles:
            if not self._check_budget():
                break

            source_id = article["source_id"]
            existing = self.get_existing_publication(source_id)
            if existing and existing.get("extraction_status") in ("extracted", "downloaded"):
                continue

            # Fetch full article
            detail_text = ""
            if article.get("url") and self._check_budget():
                try:
                    resp = self._counted_fetch(article["url"])
                    detail_soup = BeautifulSoup(resp.text, "html.parser")
                    body = detail_soup.select_one(
                        "article, .article-body, .story-content, .entry-content, main"
                    )
                    detail_text = body.get_text(separator="\n", strip=True) if body else ""
                except Exception:
                    pass

            content_hash = self.compute_text_hash(detail_text or article["title"])
            data_points = self._parse_cost_data(detail_text) if detail_text else []

            pub = PublicationRecord(
                source="construction_cost",
                source_id=source_id,
                publication_type="cost_index",
                title=article["title"],
                publisher="Engineering News-Record",
                published_date=article.get("date"),
                categories=["Construction Costs"],
                tags=["ENR", "Cost Index"],
                document_type="html",
                summary=(detail_text[:500] if detail_text else article.get("teaser")),
                source_url=article.get("url"),
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
                        geography=d.get("geography", "US"),
                        context=d.get("context"),
                        confidence_score=0.65,
                        extraction_method="regex",
                    )
                    for d in data_points
                ]
                stats.extractions_completed += self.upsert_financial_data_batch(records)

    def _extract_enr_articles(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract cost-related articles from ENR economics page."""
        articles = []
        for item in soup.select("article, .card, .story-item, .list-item, [class*='article']"):
            title_el = item.select_one("h2, h3, h4, .title, a[class*='title']")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 10:
                continue

            title_lower = title.lower()
            if not any(kw in title_lower for kw in ENR_COST_KEYWORDS):
                continue

            link = title_el.find("a") or item.find("a")
            href = link.get("href", "") if link else ""
            url = href if href.startswith("http") else urljoin(ENR_BASE, href) if href else ""

            source_id = re.sub(r'[^a-zA-Z0-9_-]', '_', href.strip("/").split("/")[-1][:150]) if href else \
                        re.sub(r'[^a-zA-Z0-9_-]', '_', title.lower()[:100])
            source_id = f"enr_{source_id}"

            date_el = item.select_one("time, .date, [class*='date'], small")
            date_str = None
            if date_el:
                date_text = date_el.get("datetime") or date_el.get_text(strip=True)
                for fmt in ("%Y-%m-%d", "%b %d, %Y", "%B %d, %Y"):
                    try:
                        date_str = datetime.strptime(date_text.strip(), fmt).strftime("%Y-%m-%d")
                        break
                    except (ValueError, AttributeError):
                        continue

            teaser_el = item.select_one("p, .summary, .excerpt")
            teaser = teaser_el.get_text(strip=True)[:300] if teaser_el else None

            articles.append({
                "source_id": source_id, "title": title,
                "url": url, "date": date_str, "teaser": teaser,
            })
        return articles

    def _parse_cost_data(self, text: str) -> List[Dict]:
        """Parse construction cost metrics from article text."""
        data_points = []

        # CCI / BCI index values (typically 4-5 digit numbers)
        for label, metric in [
            ("construction cost index", "enr_cci"),
            ("building cost index", "enr_bci"),
        ]:
            pattern = rf'{label}\s*(?:of|was|:|-|reached|stood at)\s*([\d,]+(?:\.\d+)?)'
            match = re.search(pattern, text, re.I)
            if match:
                try:
                    val = float(match.group(1).replace(",", ""))
                    if 1000 < val < 30000:  # Sanity: CCI/BCI range
                        data_points.append({
                            "data_category": "construction_cost",
                            "metric_name": metric,
                            "metric_value": val,
                            "metric_unit": "index",
                            "context": match.group(0)[:200],
                        })
                except ValueError:
                    pass

        # YoY cost escalation percentages
        escalation_patterns = [
            (r'(?:construction|building)\s+cost[s]?\s+(?:rose|increased?|up|grew)\s*(\d+(?:\.\d+)?)\s*%',
             "cost_escalation_yoy"),
            (r'(?:cost|price)\s+escalation\s*(?:of|was|:)\s*(\d+(?:\.\d+)?)\s*%',
             "cost_escalation_yoy"),
        ]
        for pattern, metric in escalation_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                try:
                    val = float(match.group(1))
                    if 0 < val < 50:
                        data_points.append({
                            "data_category": "construction_cost",
                            "metric_name": metric,
                            "metric_value": val,
                            "metric_unit": "percent",
                            "context": match.group(0)[:200],
                        })
                        break
                except ValueError:
                    pass

        # Material-specific prices
        material_patterns = {
            "steel": [
                r'steel\s+(?:price[s]?|cost)\s*(?:of|was|:|-|at)\s*\$\s*([\d,.]+)\s*(?:per\s+ton|/ton)?',
            ],
            "lumber": [
                r'lumber\s+(?:price[s]?|cost)\s*(?:of|was|:|-|at)\s*\$\s*([\d,.]+)\s*(?:per\s+mbf|/mbf)?',
            ],
            "concrete": [
                r'(?:concrete|cement)\s+(?:price[s]?|cost)\s*(?:of|was|:|-|at)\s*\$\s*([\d,.]+)',
            ],
        }
        for material, patterns in material_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.I)
                if match:
                    try:
                        val = float(match.group(1).replace(",", ""))
                        if val > 0:
                            data_points.append({
                                "data_category": "construction_cost",
                                "metric_name": f"material_price_{material}",
                                "metric_value": val,
                                "metric_unit": "usd",
                                "context": match.group(0)[:200],
                            })
                            break
                    except ValueError:
                        pass

        return data_points

    # ── RLB ──────────────────────────────────────────────────────────

    def _harvest_rlb(self, stats: HarvestStats) -> None:
        """Crawl RLB insights page for quarterly cost reports."""
        logger.info("[CONSTRUCTION_COST] Crawling RLB insights...")

        try:
            resp = self._counted_fetch(RLB_INSIGHTS_URL)
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            stats.errors.append(f"RLB page fetch failed: {exc}")
            return

        articles = self._extract_rlb_articles(soup)
        stats.publications_discovered += len(articles)
        logger.info("[CONSTRUCTION_COST] RLB: found %d cost articles", len(articles))

        for article in articles:
            if not self._check_budget():
                break

            source_id = article["source_id"]
            existing = self.get_existing_publication(source_id)
            if existing and existing.get("extraction_status") in ("extracted", "downloaded"):
                continue

            # Check for PDF link
            pdf_url = article.get("pdf_url")
            local_path = None

            if pdf_url and self._check_budget():
                import os
                pdf_base = os.environ.get("BROKERAGE_PDF_STORAGE_PATH", "data/brokerage/pdfs")
                filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', source_id)[:100] + ".pdf"
                dest_path = f"{pdf_base}/rlb/{filename}"
                try:
                    self.download_pdf(pdf_url, dest_path)
                    local_path = dest_path
                    stats.pdfs_downloaded += 1
                except Exception:
                    pass

            pub = PublicationRecord(
                source="construction_cost",
                source_id=source_id,
                publication_type="cost_report",
                title=article["title"],
                publisher="Rider Levett Bucknall",
                published_date=article.get("date"),
                categories=["Construction Costs"],
                tags=["RLB", "Quarterly Cost Report"],
                document_type="pdf" if pdf_url else "html",
                summary=article.get("teaser"),
                source_url=article.get("url"),
                pdf_url=pdf_url,
                local_pdf_path=local_path,
                is_gated=False,
                extraction_status="downloaded" if local_path else "cataloged",
            )
            pub_id, is_new = self.upsert_publication(pub)
            if is_new:
                stats.publications_new += 1

            # Extract tables from PDF if downloaded
            if local_path:
                self._extract_rlb_pdf_data(pub_id, local_path, stats)

    def _extract_rlb_articles(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract cost-report links from RLB insights page."""
        articles = []
        for item in soup.select("article, .card, .insight-item, .list-item, [class*='post']"):
            title_el = item.select_one("h2, h3, h4, .title, a[class*='title']")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 10:
                continue

            title_lower = title.lower()
            if not any(kw in title_lower for kw in RLB_COST_KEYWORDS):
                continue

            link = title_el.find("a") or item.find("a")
            href = link.get("href", "") if link else ""
            url = href if href.startswith("http") else urljoin(RLB_BASE, href) if href else ""

            source_id = re.sub(r'[^a-zA-Z0-9_-]', '_', href.strip("/").split("/")[-1][:150]) if href else \
                        re.sub(r'[^a-zA-Z0-9_-]', '_', title.lower()[:100])
            source_id = f"rlb_{source_id}"

            # Check for PDF download link
            pdf_link = item.select_one("a[href$='.pdf']")
            pdf_url = None
            if pdf_link:
                pdf_href = pdf_link.get("href", "")
                pdf_url = pdf_href if pdf_href.startswith("http") else urljoin(RLB_BASE, pdf_href)

            date_el = item.select_one("time, .date, [class*='date'], small")
            date_str = None
            if date_el:
                date_text = date_el.get("datetime") or date_el.get_text(strip=True)
                for fmt in ("%Y-%m-%d", "%b %d, %Y", "%B %d, %Y"):
                    try:
                        date_str = datetime.strptime(date_text.strip(), fmt).strftime("%Y-%m-%d")
                        break
                    except (ValueError, AttributeError):
                        continue

            teaser_el = item.select_one("p, .summary, .excerpt")
            teaser = teaser_el.get_text(strip=True)[:300] if teaser_el else None

            articles.append({
                "source_id": source_id, "title": title,
                "url": url, "pdf_url": pdf_url,
                "date": date_str, "teaser": teaser,
            })
        return articles

    def _extract_rlb_pdf_data(self, pub_id: str, pdf_path: str, stats: HarvestStats) -> None:
        """Extract cost data from RLB quarterly PDF."""
        tables = self.extract_tables_from_pdf(pdf_path)
        if not tables:
            return

        records_created = 0
        for table_info in tables:
            headers = table_info["headers"]
            rows = table_info["rows"]
            page = table_info["page"]

            # Look for city cost index tables
            header_text = " ".join(h.lower() for h in headers if h)
            is_cost_table = any(kw in header_text for kw in [
                "cost", "index", "escalation", "city", "$/sf", "psf",
            ])
            if not is_cost_table:
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

                    value, unit = self._parse_cost_value(cell)
                    if value is None:
                        continue

                    try:
                        self.upsert_financial_data(FinancialDataRecord(
                            publication_id=pub_id,
                            data_category="construction_cost",
                            metric_name=metric_name,
                            metric_value=value,
                            metric_unit=unit,
                            geography=label if self._looks_like_city(label) else None,
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
    def _parse_cost_value(text: str) -> tuple:
        """Parse a cost value — $/sf, index, or percentage."""
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

        # $/SF or $/sqft
        m = re.match(r'^\$\s*([\d,.]+)\s*(?:/sf|psf|/sqft)?$', cleaned, re.I)
        if m:
            try:
                return float(m.group(1).replace(",", "")), "usd_psf"
            except ValueError:
                return None, None

        # Plain number (index value)
        m = re.match(r'^([\d,.]+)$', cleaned)
        if m:
            try:
                return float(m.group(1).replace(",", "")), "index"
            except ValueError:
                return None, None

        return None, None

    @staticmethod
    def _looks_like_city(text: str) -> bool:
        """Check if a row label looks like a city/metro name."""
        cities = ["phoenix", "tucson", "los angeles", "new york", "chicago",
                  "dallas", "houston", "atlanta", "denver", "seattle",
                  "san francisco", "boston", "miami", "national", "us average"]
        return text.lower().strip() in cities


def run_standalone():
    agent = ConstructionCostAgent()
    agent.run_standalone()

if __name__ == "__main__":
    run_standalone()
