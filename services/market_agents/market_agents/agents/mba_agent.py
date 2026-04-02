"""
MBA Agent — Mortgage Bankers Association research harvester.

Harvests public press releases containing structured lending data:
  - Commercial/multifamily origination volumes ($B, by property type)
  - Delinquency rates by property type and investor group
  - Lending forecasts and market commentary

Source: mba.org press releases + PR Newswire
Auth: None (press releases are public)
Frequency: Quarterly origination reports, monthly delinquency data
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Dict, List, Optional

from bs4 import BeautifulSoup
from loguru import logger

from .base_research_agent import (
    BaseResearchAgent,
    FinancialDataRecord,
    HarvestStats,
    PublicationRecord,
)
from ..config import AgentConfig


# PR Newswire search for MBA press releases
MBA_PR_SEARCH_URLS = [
    "https://www.prnewswire.com/news-releases/news-releases-list/"
    "?keyword=Mortgage+Bankers+Association+commercial+multifamily&page=1&pagesize=20",
    "https://www.prnewswire.com/news-releases/news-releases-list/"
    "?keyword=MBA+commercial+real+estate+origination&page=1&pagesize=10",
]

MAX_REQUESTS_PER_RUN = 30


class MBAAgent(BaseResearchAgent):
    """Harvests MBA lending data from public press releases."""

    def __init__(self, config: Optional[AgentConfig] = None):
        super().__init__(config)
        self._request_count = 0

    @property
    def name(self) -> str:
        return "MBA"

    @property
    def source_key(self) -> str:
        return "mba"

    def _check_budget(self) -> bool:
        if self._request_count >= MAX_REQUESTS_PER_RUN:
            logger.warning("[MBA] Request limit reached (%d)", MAX_REQUESTS_PER_RUN)
            return False
        return True

    def _counted_fetch(self, url: str, **kwargs):
        self._request_count += 1
        return self.fetch_url(url, **kwargs)

    # ── Main harvest ─────────────────────────────────────────────────

    def harvest(self, stats: HarvestStats) -> None:
        self._request_count = 0

        try:
            self._harvest_origination_reports(stats)
        except Exception as exc:
            stats.errors.append(f"Origination harvest failed: {exc}")
            logger.error("[MBA] %s", exc)

        if self._check_budget():
            try:
                self._harvest_delinquency_reports(stats)
            except Exception as exc:
                stats.errors.append(f"Delinquency harvest failed: {exc}")
                logger.error("[MBA] %s", exc)

    def _harvest_origination_reports(self, stats: HarvestStats) -> None:
        """Search for MBA origination volume press releases."""
        logger.info("[MBA] Searching for origination reports...")

        for search_url in MBA_PR_SEARCH_URLS:
            if not self._check_budget():
                break

            try:
                resp = self._counted_fetch(search_url)
                soup = BeautifulSoup(resp.text, "html.parser")
            except Exception as exc:
                stats.errors.append(f"PR search failed: {exc}")
                continue

            links = self._extract_mba_pr_links(soup)
            stats.publications_discovered += len(links)

            for url, title, pr_date in links:
                if not self._check_budget():
                    break
                self._process_press_release(url, title, pr_date, stats)

    def _harvest_delinquency_reports(self, stats: HarvestStats) -> None:
        """Search for MBA delinquency data press releases."""
        logger.info("[MBA] Searching for delinquency reports...")

        search_url = (
            "https://www.prnewswire.com/news-releases/news-releases-list/"
            "?keyword=MBA+commercial+delinquency+rate&page=1&pagesize=10"
        )

        if not self._check_budget():
            return

        try:
            resp = self._counted_fetch(search_url)
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            stats.errors.append(f"Delinquency search failed: {exc}")
            return

        links = self._extract_mba_pr_links(soup)
        stats.publications_discovered += len(links)

        for url, title, pr_date in links:
            if not self._check_budget():
                break
            self._process_press_release(url, title, pr_date, stats)

    def _extract_mba_pr_links(self, soup: BeautifulSoup) -> List[tuple]:
        """Extract MBA-relevant PR links from search results."""
        results = []
        keywords = ["mortgage bankers", "mba", "origination", "delinquency",
                     "commercial real estate", "multifamily lending"]

        for item in soup.select("a.news-release, [class*='release'] a, .card a, .list-item a"):
            title = item.get_text(strip=True)
            href = item.get("href", "")
            if not href or not title:
                continue

            title_lower = title.lower()
            if any(kw in title_lower for kw in keywords):
                url = href if href.startswith("http") else f"https://www.prnewswire.com{href}"
                date_el = item.find_next("small") or item.find_next(class_="date")
                date_str = None
                if date_el:
                    for fmt in ("%b %d, %Y", "%B %d, %Y", "%Y-%m-%d"):
                        try:
                            date_str = datetime.strptime(
                                date_el.get_text(strip=True), fmt
                            ).strftime("%Y-%m-%d")
                            break
                        except ValueError:
                            continue
                results.append((url, title, date_str))

        return results

    def _process_press_release(self, url: str, title: str, pr_date: Optional[str],
                                stats: HarvestStats) -> None:
        """Fetch, parse, and store a single MBA press release."""
        # Build source_id from URL
        source_id = re.sub(r'[^a-zA-Z0-9_-]', '_', url.split("/")[-1][:150])
        source_id = f"mba_{source_id}"

        existing = self.get_existing_publication(source_id)
        if existing and existing.get("extraction_status") in ("extracted", "downloaded"):
            return

        try:
            resp = self._counted_fetch(url)
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            stats.errors.append(f"Failed to fetch {url}: {exc}")
            return

        body = self._extract_pr_body(soup)
        content_hash = self.compute_text_hash(body)

        # Classify the report type
        pub_type = "lending_origination"
        if "delinquency" in title.lower() or "delinquency" in body[:500].lower():
            pub_type = "lending_delinquency"

        # Parse financial data
        data_points = self._parse_lending_data(body, pub_type)

        pub = PublicationRecord(
            source="mba",
            source_id=source_id,
            publication_type=pub_type,
            title=title,
            publisher="Mortgage Bankers Association",
            published_date=pr_date,
            categories=["Lending", "Capital Markets"],
            tags=["MBA", pub_type.replace("_", " ").title()],
            document_type="html",
            summary=body[:500] if body else None,
            source_url=url,
            content_hash=content_hash,
            is_gated=False,
            extraction_status="extracted" if data_points else "downloaded",
        )
        pub_id, is_new = self.upsert_publication(pub)
        if is_new:
            stats.publications_new += 1
        else:
            stats.publications_updated += 1

        if data_points:
            records = [
                FinancialDataRecord(
                    publication_id=pub_id,
                    data_category=d["data_category"],
                    metric_name=d["metric_name"],
                    metric_value=d.get("metric_value"),
                    metric_unit=d.get("metric_unit"),
                    metric_text=d.get("metric_text"),
                    property_type=d.get("property_type"),
                    geography=d.get("geography", "US"),
                    reference_date=d.get("reference_date"),
                    reference_period=d.get("reference_period"),
                    context=d.get("context"),
                    confidence_score=d.get("confidence_score", 0.7),
                    extraction_method="regex",
                )
                for d in data_points
            ]
            count = self.upsert_financial_data_batch(records)
            stats.extractions_completed += count

    def _extract_pr_body(self, soup: BeautifulSoup) -> str:
        body = soup.select_one(
            ".release-body, [class*='release-content'], article .body"
        )
        if body:
            return body.get_text(separator="\n", strip=True)
        main = soup.select_one("main, article, .container")
        if main:
            return main.get_text(separator="\n", strip=True)
        return soup.get_text(separator="\n", strip=True)[:5000]

    def _parse_lending_data(self, text: str, pub_type: str) -> List[Dict]:
        """Parse structured lending data from press release text."""
        data_points = []
        text_lower = text.lower()

        if pub_type == "lending_origination":
            # Origination volume patterns: "$X billion" or "$X.X billion"
            vol_patterns = [
                (r'\$\s*([\d,.]+)\s*billion\s*(?:in\s+)?(?:commercial|multifamily|CRE)',
                 "origination_volume", "usd_billion"),
                (r'origination[s]?\s*(?:totaled?|reached?|were?)\s*\$\s*([\d,.]+)\s*billion',
                 "origination_volume", "usd_billion"),
            ]
            for pattern, metric, unit in vol_patterns:
                for match in re.finditer(pattern, text, re.I):
                    try:
                        value = float(match.group(1).replace(",", ""))
                        context = text[max(0, match.start()-50):match.end()+100].strip()
                        data_points.append({
                            "data_category": "lending",
                            "metric_name": metric,
                            "metric_value": value,
                            "metric_unit": unit,
                            "geography": "US",
                            "context": context[:300],
                        })
                    except ValueError:
                        pass

            # YoY change patterns
            yoy_patterns = [
                (r'(increased?|decreased?|rose|fell|declined?|grew)\s*(\d+(?:\.\d+)?)\s*percent',
                 "origination_yoy_change"),
            ]
            for pattern, metric in yoy_patterns:
                match = re.search(pattern, text, re.I)
                if match:
                    direction = -1 if match.group(1).lower() in ("decreased", "fell", "declined") else 1
                    try:
                        value = float(match.group(2)) * direction
                        data_points.append({
                            "data_category": "lending",
                            "metric_name": metric,
                            "metric_value": value,
                            "metric_unit": "percent",
                            "geography": "US",
                            "context": match.group(0)[:200],
                        })
                    except ValueError:
                        pass

        elif pub_type == "lending_delinquency":
            # Delinquency rate patterns
            delinq_patterns = [
                (r'(\d+(?:\.\d+)?)\s*percent\s*(?:of\s+)?(?:outstanding\s+)?(?:loan\s+)?(?:balance|balances)',
                 "delinquency_rate", None),
                (r'delinquency\s+rate\s*(?:of|was|:)\s*(\d+(?:\.\d+)?)\s*%?',
                 "delinquency_rate", None),
            ]
            for pattern, metric, ptype in delinq_patterns:
                for match in re.finditer(pattern, text, re.I):
                    try:
                        value = float(match.group(1))
                        if 0 < value < 50:  # Sanity check
                            context = text[max(0, match.start()-80):match.end()+80].strip()
                            data_points.append({
                                "data_category": "lending",
                                "metric_name": metric,
                                "metric_value": value,
                                "metric_unit": "percent",
                                "property_type": ptype,
                                "geography": "US",
                                "context": context[:300],
                            })
                    except ValueError:
                        pass

        return data_points


# ── Standalone entry point ───────────────────────────────────────────

def run_standalone():
    agent = MBAAgent()
    agent.run_standalone()

if __name__ == "__main__":
    run_standalone()
