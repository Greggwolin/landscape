"""
CREFC Agent — CRE Finance Council research harvester.

Tier 1 (no authentication required):
  1. BOG Sentiment Index — quarterly press releases from PR Newswire
  2. Resource Center article metadata — public teasers (title, date, category, tags)
  3. IRP v8.4 specification PDF — static reference document

Rate limited: 3s minimum between requests, max 50 requests per run.
"""

from __future__ import annotations

import re
from datetime import date, datetime
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


# ── Constants ────────────────────────────────────────────────────────

CREFC_BASE_URL = "https://www.crefc.org"
CREFC_RESOURCES_URL = "https://www.crefc.org/resources"

# PR Newswire search for CREFC BOG Sentiment Index releases
PR_NEWSWIRE_SEARCH_URL = (
    "https://www.prnewswire.com/news-releases/news-releases-list/"
    "?keyword=CREFC+Board+of+Governors+Sentiment+Index"
    "&page=1&pagesize=20"
)

# Direct IRP PDF URL (public)
IRP_PDF_URL = "https://www.crefc.org/common/Uploaded%20files/CREFC%20IRP%20v8.4_Final.pdf"

# Resource center category pages to crawl
RESOURCE_CATEGORIES = [
    "capital-markets",
    "regulatory",
    "standards-best-practices",
    "industry-research",
    "advocacy",
]

# Max requests per run (polite scraping)
MAX_REQUESTS_PER_RUN = 50


class CREFCAgent(BaseResearchAgent):
    """Harvests publicly available CREFC research and sentiment data."""

    def __init__(self, config: Optional[AgentConfig] = None):
        super().__init__(config)
        self._request_count = 0

    @property
    def name(self) -> str:
        return "CREFC"

    @property
    def source_key(self) -> str:
        return "crefc"

    def _check_request_budget(self) -> bool:
        """Return False if we've hit the per-run request limit."""
        if self._request_count >= MAX_REQUESTS_PER_RUN:
            logger.warning("[CREFC] Hit request limit (%d) — stopping", MAX_REQUESTS_PER_RUN)
            return False
        return True

    def _counted_fetch(self, url: str, **kwargs):
        """Fetch with request counting."""
        self._request_count += 1
        return self.fetch_url(url, **kwargs)

    # ── Main harvest orchestration ───────────────────────────────────

    def harvest(self, stats: HarvestStats) -> None:
        """Run all three CREFC sub-tasks."""
        self._request_count = 0

        # 1. BOG Sentiment Index
        try:
            self._harvest_sentiment_index(stats)
        except Exception as exc:
            err = f"Sentiment harvest failed: {exc}"
            logger.error("[CREFC] %s", err)
            stats.errors.append(err)

        # 2. Resource Center article catalog
        if self._check_request_budget():
            try:
                self._harvest_article_catalog(stats)
            except Exception as exc:
                err = f"Article catalog harvest failed: {exc}"
                logger.error("[CREFC] %s", err)
                stats.errors.append(err)

        # 3. IRP reference document (one-time)
        if self._check_request_budget():
            try:
                self._harvest_irp_reference(stats)
            except Exception as exc:
                err = f"IRP harvest failed: {exc}"
                logger.error("[CREFC] %s", err)
                stats.errors.append(err)

    # ── 1. BOG Sentiment Index ───────────────────────────────────────

    def _harvest_sentiment_index(self, stats: HarvestStats) -> None:
        """
        Search PR Newswire for CREFC BOG Sentiment Index press releases.
        Parse structured data: index value, core question percentages.
        """
        logger.info("[CREFC] Harvesting BOG Sentiment Index releases...")

        if not self._check_request_budget():
            return

        try:
            resp = self._counted_fetch(PR_NEWSWIRE_SEARCH_URL)
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            stats.errors.append(f"PR Newswire search failed: {exc}")
            return

        # Find press release links on the search results page
        pr_links = self._extract_pr_newswire_links(soup)
        stats.publications_discovered += len(pr_links)
        logger.info("[CREFC] Found %d potential sentiment releases", len(pr_links))

        for pr_url, pr_title, pr_date in pr_links:
            if not self._check_request_budget():
                break

            # Build source_id from quarter (e.g., "bog_sentiment_4Q25")
            quarter_match = re.search(r'([1-4]Q\d{2})', pr_title)
            if not quarter_match:
                # Try alternate formats like "Q4 2025" or "Fourth Quarter 2025"
                quarter_match = re.search(r'Q([1-4])\s*20(\d{2})', pr_title)
                if quarter_match:
                    source_id = f"bog_sentiment_{quarter_match.group(1)}Q{quarter_match.group(2)}"
                else:
                    # Extract year/quarter from other patterns
                    source_id = f"bog_sentiment_{pr_date.replace('-', '')}" if pr_date else None
                    if not source_id:
                        continue
            else:
                source_id = f"bog_sentiment_{quarter_match.group(1)}"

            # Check if already harvested
            existing = self.get_existing_publication(source_id)
            if existing and existing.get("extraction_status") == "extracted":
                logger.debug("[CREFC] Sentiment %s already extracted — skipping", source_id)
                continue

            # Fetch the full press release
            try:
                pr_resp = self._counted_fetch(pr_url)
                pr_soup = BeautifulSoup(pr_resp.text, "html.parser")
            except Exception as exc:
                stats.errors.append(f"Failed to fetch PR {pr_url}: {exc}")
                continue

            # Extract the press release body text
            body_text = self._extract_pr_body(pr_soup)
            content_hash = self.compute_text_hash(body_text)

            # Parse sentiment data from the body
            sentiment_data = self._parse_sentiment_data(body_text, source_id)

            # Upsert the publication
            pub = PublicationRecord(
                source="crefc",
                source_id=source_id,
                publication_type="sentiment_index",
                title=pr_title,
                publisher="CRE Finance Council",
                published_date=pr_date,
                categories=["Capital Markets", "Sentiment"],
                tags=["BOG", "Sentiment Index", "CREFC"],
                document_type="html",
                summary=body_text[:500] if body_text else None,
                source_url=pr_url,
                content_hash=content_hash,
                is_gated=False,
                extraction_status="extracted" if sentiment_data else "downloaded",
                metadata={"pr_newswire": True},
            )
            pub_id, is_new = self.upsert_publication(pub)

            if is_new:
                stats.publications_new += 1
            else:
                stats.publications_updated += 1

            # Upsert financial data
            if sentiment_data:
                count = self.upsert_financial_data_batch(
                    [self._to_financial_record(pub_id, d) for d in sentiment_data]
                )
                stats.extractions_completed += count
                logger.info("[CREFC] Extracted %d data points from %s", count, source_id)

    def _extract_pr_newswire_links(self, soup: BeautifulSoup) -> List[tuple]:
        """
        Extract press release links from PR Newswire search results.
        Returns list of (url, title, date_str) tuples.
        """
        results = []

        # PR Newswire search results structure
        for item in soup.select("a.news-release"):
            title = item.get_text(strip=True)
            href = item.get("href", "")
            if not href:
                continue
            if "sentiment" not in title.lower() and "bog" not in title.lower():
                continue

            url = href if href.startswith("http") else f"https://www.prnewswire.com{href}"

            # Try to extract date from nearby element
            date_el = item.find_next("small") or item.find_next(class_="date")
            date_str = None
            if date_el:
                try:
                    date_text = date_el.get_text(strip=True)
                    # Parse various date formats
                    for fmt in ("%b %d, %Y", "%B %d, %Y", "%Y-%m-%d"):
                        try:
                            date_str = datetime.strptime(date_text, fmt).strftime("%Y-%m-%d")
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass

            results.append((url, title, date_str))

        # Also try alternate selectors for PR Newswire layout changes
        if not results:
            for item in soup.select("[class*='release'] a, .card a, .list-item a"):
                title = item.get_text(strip=True)
                href = item.get("href", "")
                if not href or not title:
                    continue
                if "sentiment" in title.lower() or "bog" in title.lower():
                    url = href if href.startswith("http") else f"https://www.prnewswire.com{href}"
                    results.append((url, title, None))

        return results

    def _extract_pr_body(self, soup: BeautifulSoup) -> str:
        """Extract the main body text from a PR Newswire press release page."""
        # Try multiple selectors — PR Newswire changes layout periodically
        body = soup.select_one(
            ".release-body, .col-sm-10.col-sm-offset-1, "
            "[class*='release-content'], article .body"
        )
        if body:
            return body.get_text(separator="\n", strip=True)

        # Fallback: grab all paragraphs from main content area
        main = soup.select_one("main, article, .container")
        if main:
            return main.get_text(separator="\n", strip=True)

        return soup.get_text(separator="\n", strip=True)[:5000]

    def _parse_sentiment_data(self, text: str, source_id: str) -> List[Dict]:
        """
        Parse structured sentiment data from a BOG press release.

        Looks for patterns like:
          - "overall index of 84" or "sentiment index: 84"
          - "78% of respondents believe..."
          - Quarter/year references
        """
        data_points = []
        text_lower = text.lower()

        # Extract quarter and year from source_id
        quarter_match = re.search(r'(\d)Q(\d{2})', source_id)
        ref_period = None
        ref_date = None
        if quarter_match:
            q = quarter_match.group(1)
            yr = quarter_match.group(2)
            ref_period = f"{q}Q{yr}"
            # Approximate quarter end date
            quarter_end_months = {"1": "03", "2": "06", "3": "09", "4": "12"}
            ref_date = f"20{yr}-{quarter_end_months.get(q, '12')}-01"

        # 1. Overall index value
        index_patterns = [
            r'(?:overall\s+)?(?:sentiment\s+)?index\s*(?:of|:|\s)\s*(\d+(?:\.\d+)?)',
            r'(\d+(?:\.\d+)?)\s*(?:out of 100|on a scale)',
            r'index\s+(?:rose|fell|remained|was|stands?)\s+(?:at|to)\s+(\d+(?:\.\d+)?)',
        ]
        for pattern in index_patterns:
            match = re.search(pattern, text_lower)
            if match:
                value = float(match.group(1))
                if 0 < value <= 100:  # Sanity check — index is 0-100
                    data_points.append({
                        "data_category": "sentiment_index",
                        "metric_name": "bog_overall_index",
                        "metric_value": value,
                        "metric_unit": "index",
                        "reference_period": ref_period,
                        "reference_date": ref_date,
                        "geography": "US",
                        "confidence_score": 0.9,
                        "extraction_method": "regex",
                        "context": match.group(0)[:200],
                    })
                    break

        # 2. Percentage-based responses
        pct_patterns = [
            (r'(\d+(?:\.\d+)?)\s*%?\s*(?:of\s+respondents?|of\s+members?|believe|said|expect|report)',
             "respondent_pct"),
            (r'(\d+(?:\.\d+)?)\s*percent\s+(?:of\s+respondents?|of\s+members?|believe|said|expect)',
             "respondent_pct"),
        ]
        for pattern, metric_prefix in pct_patterns:
            for match in re.finditer(pattern, text_lower):
                value = float(match.group(1))
                if 0 < value <= 100:
                    # Extract surrounding context for metric name
                    start = max(0, match.start() - 50)
                    end = min(len(text), match.end() + 100)
                    context = text[start:end].strip()

                    # Generate a metric name from the surrounding text
                    context_words = re.findall(r'\b\w+\b', context.lower())
                    # Find key topic words
                    topic_keywords = [
                        w for w in context_words
                        if w in ("origination", "delinquency", "default", "interest",
                                 "rates", "spreads", "volume", "lending", "capital",
                                 "market", "credit", "outlook", "conditions")
                    ]
                    if topic_keywords:
                        metric_name = f"{metric_prefix}_{'_'.join(topic_keywords[:3])}"
                    else:
                        metric_name = f"{metric_prefix}_{match.start()}"

                    data_points.append({
                        "data_category": "sentiment_index",
                        "metric_name": metric_name,
                        "metric_value": value,
                        "metric_unit": "percent",
                        "reference_period": ref_period,
                        "reference_date": ref_date,
                        "geography": "US",
                        "confidence_score": 0.7,
                        "extraction_method": "regex",
                        "context": context[:300],
                    })

        return data_points

    def _to_financial_record(self, pub_id: str, data: Dict) -> FinancialDataRecord:
        """Convert a parsed data dict to a FinancialDataRecord."""
        return FinancialDataRecord(
            publication_id=pub_id,
            data_category=data["data_category"],
            metric_name=data["metric_name"],
            metric_value=data.get("metric_value"),
            metric_unit=data.get("metric_unit"),
            metric_text=data.get("metric_text"),
            property_type=data.get("property_type"),
            geography=data.get("geography"),
            reference_date=data.get("reference_date"),
            reference_period=data.get("reference_period"),
            context=data.get("context"),
            confidence_score=data.get("confidence_score"),
            extraction_method=data.get("extraction_method"),
            page_number=data.get("page_number"),
            metadata=data.get("metadata"),
        )

    # ── 2. Article Catalog ───────────────────────────────────────────

    def _harvest_article_catalog(self, stats: HarvestStats) -> None:
        """
        Crawl CREFC Resource Center for article metadata.
        Public teasers only — no gated content.
        """
        logger.info("[CREFC] Harvesting article catalog...")

        for category in RESOURCE_CATEGORIES:
            if not self._check_request_budget():
                break

            cat_url = f"{CREFC_RESOURCES_URL}/{category}"
            logger.info("[CREFC] Crawling category: %s", category)

            try:
                resp = self._counted_fetch(cat_url)
                soup = BeautifulSoup(resp.text, "html.parser")
            except Exception as exc:
                stats.errors.append(f"Failed to fetch category {category}: {exc}")
                continue

            articles = self._extract_articles_from_page(soup, category)
            stats.publications_discovered += len(articles)

            for article in articles:
                if not self._check_request_budget():
                    break

                existing = self.get_existing_publication(article["source_id"])
                if existing:
                    logger.debug("[CREFC] Article %s already cataloged", article["source_id"])
                    continue

                pub = PublicationRecord(
                    source="crefc",
                    source_id=article["source_id"],
                    publication_type="article_metadata",
                    title=article["title"],
                    publisher="CRE Finance Council",
                    published_date=article.get("date"),
                    categories=[category.replace("-", " ").title()],
                    tags=article.get("tags", []),
                    document_type="html",
                    summary=article.get("teaser"),
                    source_url=article.get("url"),
                    is_gated=True,  # Full content requires CREFC membership
                    extraction_status="cataloged",
                    metadata={"category_slug": category},
                )
                pub_id, is_new = self.upsert_publication(pub)

                if is_new:
                    stats.publications_new += 1
                    logger.debug("[CREFC] Cataloged article: %s", article["title"][:60])

    def _extract_articles_from_page(self, soup: BeautifulSoup, category: str) -> List[Dict]:
        """
        Extract article metadata from a CREFC category page.
        Returns list of dicts with: source_id, title, date, teaser, url, tags.
        """
        articles = []

        # Try common CMS patterns for article listings
        selectors = [
            "article", ".resource-item", ".card", ".list-item",
            ".resource-listing .item", "[class*='resource']",
        ]

        items = []
        for sel in selectors:
            items = soup.select(sel)
            if items:
                break

        for item in items:
            # Extract title
            title_el = item.select_one("h2, h3, h4, .title, a[class*='title']")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 5:
                continue

            # Extract URL
            link = title_el.find("a") or title_el
            href = link.get("href", "") if link.name == "a" else ""
            if not href:
                parent_link = item.find("a")
                href = parent_link.get("href", "") if parent_link else ""

            url = href if href.startswith("http") else urljoin(CREFC_BASE_URL, href) if href else ""

            # Build source_id from URL or title
            if href:
                source_id = re.sub(r'[^a-zA-Z0-9_-]', '_', href.strip("/").split("/")[-1])[:200]
            else:
                source_id = re.sub(r'[^a-zA-Z0-9_-]', '_', title.lower()[:100])
            source_id = f"crefc_article_{source_id}"

            # Extract date
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

            # Extract teaser/summary
            teaser_el = item.select_one("p, .summary, .excerpt, .teaser, [class*='desc']")
            teaser = teaser_el.get_text(strip=True)[:500] if teaser_el else None

            # Extract tags if present
            tag_els = item.select(".tag, .badge, [class*='tag']")
            tags = [t.get_text(strip=True) for t in tag_els if t.get_text(strip=True)]

            articles.append({
                "source_id": source_id,
                "title": title,
                "date": date_str,
                "teaser": teaser,
                "url": url,
                "tags": tags,
            })

        return articles

    # ── 3. IRP Reference Document ────────────────────────────────────

    def _harvest_irp_reference(self, stats: HarvestStats) -> None:
        """
        One-time download and catalog of the IRP v8.4 specification PDF.
        Only re-downloads if the content hash has changed.
        """
        logger.info("[CREFC] Checking IRP reference document...")

        source_id = "irp_v8.4"
        existing = self.get_existing_publication(source_id)

        if existing and existing.get("extraction_status") in ("downloaded", "extracted"):
            # Check if the remote file has changed (HEAD request for content-length)
            logger.debug("[CREFC] IRP already downloaded — skipping")
            return

        stats.publications_discovered += 1

        # Download the PDF
        pdf_dir = self.config.crefc_pdf_storage_path if hasattr(self.config, 'crefc_pdf_storage_path') else "data/crefc/pdfs"
        dest_path = f"{pdf_dir}/irp_v8.4.pdf"

        try:
            content_hash = self.download_pdf(IRP_PDF_URL, dest_path)
            stats.pdfs_downloaded += 1
        except Exception as exc:
            stats.errors.append(f"IRP download failed: {exc}")
            return

        # Check if content changed
        if existing and existing.get("content_hash") == content_hash:
            logger.info("[CREFC] IRP content unchanged — no update needed")
            return

        pub = PublicationRecord(
            source="crefc",
            source_id=source_id,
            publication_type="policy_briefing",
            title="CREFC Investor Reporting Package (IRP) v8.4",
            publisher="CRE Finance Council",
            categories=["Standards & Best Practices", "Reporting"],
            tags=["IRP", "Investor Reporting", "CMBS", "Standardization"],
            document_type="pdf",
            summary="Standardized reporting package for CMBS loan-level and property-level data.",
            source_url=IRP_PDF_URL,
            pdf_url=IRP_PDF_URL,
            local_pdf_path=dest_path,
            content_hash=content_hash,
            is_gated=False,
            extraction_status="downloaded",
            metadata={"version": "8.4", "static_reference": True},
        )
        pub_id, is_new = self.upsert_publication(pub)

        if is_new:
            stats.publications_new += 1
        else:
            stats.publications_updated += 1

        logger.info("[CREFC] IRP v8.4 cataloged (hash: %s)", content_hash[:12])


# ── Standalone entry point ───────────────────────────────────────────

def run_standalone():
    """CLI entry: python -m market_agents.agents.crefc_agent"""
    agent = CREFCAgent()
    agent.run_standalone()


if __name__ == "__main__":
    run_standalone()
