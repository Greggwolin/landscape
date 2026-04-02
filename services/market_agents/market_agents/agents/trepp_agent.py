"""
Trepp Agent — free-tier CMBS blog with structured data points.

Harvests public Trepp Insights blog posts:
  - Monthly CMBS delinquency rate (overall and by property type)
  - Special servicing rate
  - New delinquency and resolution counts

Source: trepp.com/insights
Auth: None (blog content is public)
Frequency: Monthly delinquency reports, weekly commentary
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


TREPP_BASE = "https://www.trepp.com"
TREPP_INSIGHTS_URL = "https://www.trepp.com/trepptalk"
TREPP_CMBS_KEYWORDS = ["cmbs", "delinquency", "special servicing", "loan",
                        "commercial real estate", "default"]

MAX_REQUESTS_PER_RUN = 30


class TreppAgent(BaseResearchAgent):
    """Harvests CMBS data from Trepp's public blog/insights."""

    def __init__(self, config: Optional[AgentConfig] = None):
        super().__init__(config)
        self._request_count = 0

    @property
    def name(self) -> str:
        return "TREPP"

    @property
    def source_key(self) -> str:
        return "trepp"

    def _check_budget(self) -> bool:
        return self._request_count < MAX_REQUESTS_PER_RUN

    def _counted_fetch(self, url: str, **kwargs):
        self._request_count += 1
        return self.fetch_url(url, **kwargs)

    def harvest(self, stats: HarvestStats) -> None:
        self._request_count = 0
        logger.info("[TREPP] Harvesting CMBS insights...")

        # Crawl Trepp blog/insights
        try:
            resp = self._counted_fetch(TREPP_INSIGHTS_URL)
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            stats.errors.append(f"Trepp insights page failed: {exc}")
            return

        articles = self._extract_article_links(soup)
        stats.publications_discovered += len(articles)
        logger.info("[TREPP] Found %d CMBS-relevant articles", len(articles))

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
                        "article, .blog-post-body, .post-body, .entry-content, main"
                    )
                    detail_text = body.get_text(separator="\n", strip=True) if body else ""
                except Exception:
                    pass

            content_hash = self.compute_text_hash(detail_text or article["title"])
            data_points = self._parse_cmbs_data(detail_text) if detail_text else []

            pub = PublicationRecord(
                source="trepp",
                source_id=source_id,
                publication_type="cmbs_research",
                title=article["title"],
                publisher="Trepp",
                published_date=article.get("date"),
                categories=["CMBS", "Credit"],
                tags=["Trepp", "CMBS", "Delinquency"],
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
                        property_type=d.get("property_type"),
                        geography="US",
                        context=d.get("context"),
                        confidence_score=0.7,
                        extraction_method="regex",
                    )
                    for d in data_points
                ]
                stats.extractions_completed += self.upsert_financial_data_batch(records)

    def _extract_article_links(self, soup: BeautifulSoup) -> List[Dict]:
        articles = []
        for item in soup.select("article, .post-item, .blog-card, .card, .list-item"):
            title_el = item.select_one("h2, h3, h4, .title, a[class*='title']")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 10:
                continue

            title_lower = title.lower()
            if not any(kw in title_lower for kw in TREPP_CMBS_KEYWORDS):
                continue

            link = title_el.find("a") or item.find("a")
            href = link.get("href", "") if link else ""
            url = href if href.startswith("http") else urljoin(TREPP_BASE, href) if href else ""

            source_id = re.sub(r'[^a-zA-Z0-9_-]', '_', href.strip("/").split("/")[-1][:150]) if href else \
                        re.sub(r'[^a-zA-Z0-9_-]', '_', title.lower()[:100])
            source_id = f"trepp_{source_id}"

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

    def _parse_cmbs_data(self, text: str) -> List[Dict]:
        """Parse CMBS delinquency data from blog text. Same patterns as KBRA."""
        data_points = []

        # Overall delinquency
        for pattern in [
            r'(?:overall|total)\s+(?:CMBS\s+)?delinquency\s+rate\s*(?:of|was|:|-|to)\s*(\d+(?:\.\d+)?)\s*%?',
            r'delinquency\s+rate\s*(?:came in at|was|stood at|reached)\s*(\d+(?:\.\d+)?)\s*%?',
        ]:
            match = re.search(pattern, text, re.I)
            if match:
                try:
                    val = float(match.group(1))
                    if 0 < val < 30:
                        data_points.append({
                            "data_category": "cmbs_performance",
                            "metric_name": "overall_delinquency_rate",
                            "metric_value": val,
                            "metric_unit": "percent",
                            "context": match.group(0)[:200],
                        })
                        break
                except ValueError:
                    pass

        # Special servicing
        for pattern in [
            r'special\s+servicing\s+rate\s*(?:of|was|:|-|to)\s*(\d+(?:\.\d+)?)\s*%?',
        ]:
            match = re.search(pattern, text, re.I)
            if match:
                try:
                    val = float(match.group(1))
                    if 0 < val < 30:
                        data_points.append({
                            "data_category": "cmbs_performance",
                            "metric_name": "special_servicing_rate",
                            "metric_value": val,
                            "metric_unit": "percent",
                            "context": match.group(0)[:200],
                        })
                        break
                except ValueError:
                    pass

        # Property-type specific
        for ptype in ["office", "retail", "multifamily", "industrial", "hotel", "lodging"]:
            pattern = rf'{ptype}\s+(?:CMBS\s+)?delinquency.*?(\d+(?:\.\d+)?)\s*%'
            match = re.search(pattern, text, re.I)
            if match:
                try:
                    val = float(match.group(1))
                    if 0 < val < 50:
                        norm_type = "hotel" if ptype == "lodging" else ptype
                        data_points.append({
                            "data_category": "cmbs_performance",
                            "metric_name": f"delinquency_rate_{norm_type}",
                            "metric_value": val,
                            "metric_unit": "percent",
                            "property_type": norm_type,
                            "context": match.group(0)[:200],
                        })
                except ValueError:
                    pass

        return data_points


def run_standalone():
    agent = TreppAgent()
    agent.run_standalone()

if __name__ == "__main__":
    run_standalone()
