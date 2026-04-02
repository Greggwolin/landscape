"""
ULI Agent — Urban Land Institute Knowledge Finder harvester.

Authenticated access via Playwright for session cookies, then bulk
downloads via requests. Harvests:
  1. Emerging Trends in Real Estate® reports (annual PDFs)
  2. Research reports (housing, climate, infrastructure, capital markets)
  3. Advisory Services Panel reports
  4. Development Case Studies (financial data + narratives)

Phase 1: Metadata cataloging + PDF download + table extraction via pdfplumber.
Phase 2 (deferred): LLM-based narrative extraction.
"""

from __future__ import annotations

import os
import re
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse, parse_qs

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

ULI_BASE_URL = "https://knowledge.uli.org"
ULI_LOGIN_URL = "https://uli.org/sign-in"  # May redirect to netforum SSO

# Content type browse pages on Knowledge Finder
ULI_CONTENT_PATHS = {
    "emerging_trends": "/reports/emerging-trends-in-real-estate",
    "research_report": "/reports/research-reports",
    "advisory_panel": "/reports/advisory-services-panel-reports",
    "case_study": "/reports/case-studies",
}

# Max requests per run after initial backfill
MAX_REQUESTS_PER_RUN = 50

# Financial table classification keywords specific to ULI case studies
CASE_STUDY_TABLE_PATTERNS = {
    "development_cost": [
        "total development cost", "total project cost", "hard cost", "soft cost",
        "land cost", "construction cost", "site work", "fees", "financing cost",
    ],
    "rent": [
        "rent schedule", "unit mix", "asking rent", "rent per", "monthly rent",
        "bedroom", "studio", "1br", "2br", "3br", "average rent",
    ],
    "financial_performance": [
        "return", "irr", "cap rate", "cash-on-cash", "yield", "net present",
        "equity multiple", "unlevered", "levered",
    ],
    "sale_price": [
        "sale price", "transaction", "acquisition", "price per unit",
        "price per sf", "purchase price",
    ],
    "project_data": [
        "total units", "total sf", "square feet", "gross area", "net area",
        "stories", "floors", "parking", "far", "density", "site area",
    ],
    "noi": [
        "net operating income", "noi", "effective gross income", "egi",
        "operating expense", "expense ratio", "gross revenue",
    ],
}


class ULIAgent(BaseResearchAgent):
    """
    Harvests ULI Knowledge Finder content via authenticated session.

    Auth flow:
      1. Launch Playwright → navigate to ULI sign-in
      2. Enter credentials → capture session cookies
      3. Use cookies with requests.Session for all subsequent HTTP calls
      4. Cache cookies with TTL to avoid re-auth on every run
    """

    REQUEST_DELAY = 3.0  # 3 seconds between requests

    def __init__(self, config: Optional[AgentConfig] = None):
        super().__init__(config)
        self._cookies: Optional[Dict[str, str]] = None
        self._request_count = 0
        self._auth_failed = False

    @property
    def name(self) -> str:
        return "ULI"

    @property
    def source_key(self) -> str:
        return "uli"

    def _check_request_budget(self) -> bool:
        """Return False if we've hit the per-run request limit."""
        if self._request_count >= MAX_REQUESTS_PER_RUN:
            logger.warning("[ULI] Hit request limit (%d) — stopping", MAX_REQUESTS_PER_RUN)
            return False
        return True

    def _counted_fetch(self, url: str, **kwargs):
        """Fetch with request counting and auth cookies."""
        self._request_count += 1
        if self._cookies:
            kwargs.setdefault("cookies", self._cookies)
        return self.fetch_url(url, **kwargs)

    # ── Authentication ───────────────────────────────────────────────

    def _get_credentials(self) -> tuple:
        """Load ULI credentials from config/env."""
        email = os.environ.get("ULI_EMAIL", "")
        password = os.environ.get("ULI_PASSWORD", "")
        if not email or not password:
            raise RuntimeError(
                "ULI_EMAIL and ULI_PASSWORD environment variables are required. "
                "Set them in .env or environment."
            )
        return email, password

    async def _authenticate_playwright(self) -> Dict[str, str]:
        """
        Launch Playwright headless Chrome, log into ULI, capture cookies.

        Returns dict of {cookie_name: cookie_value} for use with requests.
        """
        from playwright.async_api import async_playwright

        email, password = self._get_credentials()
        logger.info("[ULI] Authenticating via Playwright...")

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-first-run", "--no-default-browser-check"],
            )
            context = await browser.new_context(
                user_agent=self.USER_AGENT,
                viewport={"width": 1280, "height": 720},
            )
            page = await context.new_page()

            try:
                # Navigate to ULI sign-in page
                await page.goto(ULI_LOGIN_URL, wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(2000)  # Allow JS to load

                # ULI uses various SSO/login form patterns. Try multiple selectors.
                # Pattern 1: Direct email/password form
                email_selectors = [
                    'input[type="email"]',
                    'input[name="email"]',
                    'input[name="username"]',
                    'input[name="txtEmail"]',
                    'input[id*="email"]',
                    'input[id*="Email"]',
                    'input[placeholder*="email" i]',
                ]
                password_selectors = [
                    'input[type="password"]',
                    'input[name="password"]',
                    'input[name="txtPassword"]',
                    'input[id*="password"]',
                    'input[id*="Password"]',
                ]
                submit_selectors = [
                    'button[type="submit"]',
                    'input[type="submit"]',
                    'button:has-text("Sign In")',
                    'button:has-text("Log In")',
                    'a:has-text("Sign In")',
                    '#btnLogin',
                ]

                # Find and fill email field
                email_field = None
                for sel in email_selectors:
                    try:
                        el = page.locator(sel).first
                        if await el.is_visible(timeout=2000):
                            email_field = el
                            break
                    except Exception:
                        continue

                if not email_field:
                    # Maybe we need to click "Sign In" first to reveal the form
                    for sel in ['a:has-text("Sign In")', 'button:has-text("Sign In")',
                                'a:has-text("Log In")', '.sign-in', '#sign-in']:
                        try:
                            btn = page.locator(sel).first
                            if await btn.is_visible(timeout=2000):
                                await btn.click()
                                await page.wait_for_timeout(3000)
                                break
                        except Exception:
                            continue

                    # Try again after clicking
                    for sel in email_selectors:
                        try:
                            el = page.locator(sel).first
                            if await el.is_visible(timeout=3000):
                                email_field = el
                                break
                        except Exception:
                            continue

                if not email_field:
                    raise RuntimeError("Could not find email input field on ULI login page")

                # Fill email
                await email_field.fill(email)
                await page.wait_for_timeout(500)

                # Find and fill password field
                password_field = None
                for sel in password_selectors:
                    try:
                        el = page.locator(sel).first
                        if await el.is_visible(timeout=2000):
                            password_field = el
                            break
                    except Exception:
                        continue

                if not password_field:
                    raise RuntimeError("Could not find password input field on ULI login page")

                await password_field.fill(password)
                await page.wait_for_timeout(500)

                # Submit the form
                submitted = False
                for sel in submit_selectors:
                    try:
                        btn = page.locator(sel).first
                        if await btn.is_visible(timeout=2000):
                            await btn.click()
                            submitted = True
                            break
                    except Exception:
                        continue

                if not submitted:
                    # Try pressing Enter on the password field
                    await password_field.press("Enter")

                # Wait for navigation/redirect after login
                await page.wait_for_timeout(5000)

                # Verify we're logged in (check for common authenticated indicators)
                page_text = await page.content()
                if "sign out" in page_text.lower() or "log out" in page_text.lower() or \
                   "my account" in page_text.lower() or "welcome" in page_text.lower():
                    logger.info("[ULI] Authentication successful")
                else:
                    logger.warning("[ULI] Authentication may have failed — proceeding with captured cookies")

                # Capture all cookies
                cookies = await context.cookies()

            finally:
                await browser.close()

        # Convert to requests-compatible dict
        cookie_dict = {c["name"]: c["value"] for c in cookies}
        logger.info("[ULI] Captured %d cookies", len(cookie_dict))
        return cookie_dict

    def authenticate(self) -> bool:
        """
        Run Playwright auth flow and store cookies.
        Returns True on success, False on failure.
        """
        try:
            self._cookies = asyncio.get_event_loop().run_until_complete(
                self._authenticate_playwright()
            )
            # Set cookies on the shared session
            self.http.cookies.update(self._cookies)
            return True
        except RuntimeError:
            # No event loop running — create one
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                self._cookies = loop.run_until_complete(self._authenticate_playwright())
                self.http.cookies.update(self._cookies)
                return True
            except Exception as exc:
                logger.error("[ULI] Authentication failed: %s", exc)
                self._auth_failed = True
                return False
        except Exception as exc:
            logger.error("[ULI] Authentication failed: %s", exc)
            self._auth_failed = True
            return False

    # ── Main harvest orchestration ───────────────────────────────────

    def harvest(self, stats: HarvestStats) -> None:
        """Run all ULI harvest tasks."""
        self._request_count = 0

        # Authenticate first
        if not self.authenticate():
            stats.errors.append("ULI authentication failed — aborting harvest")
            return

        # Process each content type
        for content_type, path in ULI_CONTENT_PATHS.items():
            if not self._check_request_budget():
                break

            try:
                self._harvest_content_type(content_type, path, stats)
            except Exception as exc:
                err = f"{content_type} harvest failed: {exc}"
                logger.error("[ULI] %s", err)
                stats.errors.append(err)

    def _harvest_content_type(self, content_type: str, path: str, stats: HarvestStats) -> None:
        """Discover and process publications for a given content type."""
        url = f"{ULI_BASE_URL}{path}"
        logger.info("[ULI] Harvesting %s from %s", content_type, url)

        if not self._check_request_budget():
            return

        try:
            resp = self._counted_fetch(url)
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            stats.errors.append(f"Failed to fetch {content_type} listing: {exc}")
            return

        # Extract publication links from the listing page
        publications = self._extract_publication_links(soup, content_type)
        stats.publications_discovered += len(publications)
        logger.info("[ULI] Found %d %s publications", len(publications), content_type)

        # Check for pagination
        next_page = self._find_next_page(soup)
        page_count = 1
        while next_page and self._check_request_budget() and page_count < 10:
            try:
                next_url = urljoin(ULI_BASE_URL, next_page)
                resp = self._counted_fetch(next_url)
                soup = BeautifulSoup(resp.text, "html.parser")
                more_pubs = self._extract_publication_links(soup, content_type)
                publications.extend(more_pubs)
                stats.publications_discovered += len(more_pubs)
                next_page = self._find_next_page(soup)
                page_count += 1
            except Exception:
                break

        # Process each publication
        for pub_info in publications:
            if not self._check_request_budget():
                break
            self._process_publication(pub_info, content_type, stats)

    def _extract_publication_links(self, soup: BeautifulSoup, content_type: str) -> List[Dict]:
        """
        Extract publication info from a ULI Knowledge Finder listing page.

        Returns list of dicts with: source_id, title, url, date, pdf_url, summary.
        """
        publications = []

        # ULI Knowledge Finder uses various card/list patterns
        selectors = [
            ".search-result", ".knowledge-item", ".report-card",
            ".card", "article", ".list-item", "[class*='result']",
            ".resource-item", ".publication-item",
        ]

        items = []
        for sel in selectors:
            items = soup.select(sel)
            if items:
                break

        # If no structured items found, try extracting from links
        if not items:
            items = soup.select("a[href*='/reports/'], a[href*='/-/media/']")

        for item in items:
            try:
                pub = self._parse_listing_item(item, content_type)
                if pub:
                    publications.append(pub)
            except Exception as exc:
                logger.debug("[ULI] Failed to parse listing item: %s", exc)

        return publications

    def _parse_listing_item(self, item, content_type: str) -> Optional[Dict]:
        """Parse a single listing item into publication metadata."""
        # Extract title
        title_el = item.select_one("h2, h3, h4, .title, a[class*='title']")
        if not title_el:
            # Item might be a link itself
            if item.name == "a":
                title = item.get_text(strip=True)
                href = item.get("href", "")
            else:
                return None
        else:
            title = title_el.get_text(strip=True)
            link = title_el.find("a") or title_el
            href = link.get("href", "") if link.name == "a" else ""
            if not href:
                parent_link = item.find("a")
                href = parent_link.get("href", "") if parent_link else ""

        if not title or len(title) < 5:
            return None

        # Build URL
        url = href if href.startswith("http") else urljoin(ULI_BASE_URL, href) if href else ""

        # Build source_id from URL path
        if href:
            path_parts = urlparse(href).path.strip("/").split("/")
            source_id = "_".join(path_parts[-3:]) if len(path_parts) >= 3 else path_parts[-1]
            source_id = re.sub(r'[^a-zA-Z0-9_-]', '_', source_id)[:200]
        else:
            source_id = re.sub(r'[^a-zA-Z0-9_-]', '_', title.lower()[:100])

        # Extract date
        date_el = item.select_one("time, .date, [class*='date'], .year, small")
        date_str = None
        if date_el:
            date_text = date_el.get("datetime") or date_el.get_text(strip=True)
            for fmt in ("%Y-%m-%d", "%Y", "%b %d, %Y", "%B %d, %Y", "%B %Y"):
                try:
                    parsed = datetime.strptime(date_text.strip(), fmt)
                    date_str = parsed.strftime("%Y-%m-%d")
                    break
                except (ValueError, AttributeError):
                    continue

        # Extract summary/teaser
        summary_el = item.select_one("p, .summary, .excerpt, .description, [class*='desc']")
        summary = summary_el.get_text(strip=True)[:500] if summary_el else None

        # Check for direct PDF link
        pdf_link = item.select_one("a[href*='.pdf'], a[href*='/-/media/']")
        pdf_url = None
        if pdf_link:
            pdf_href = pdf_link.get("href", "")
            pdf_url = pdf_href if pdf_href.startswith("http") else urljoin(ULI_BASE_URL, pdf_href)

        # Extract categories/tags
        tag_els = item.select(".tag, .badge, .category, [class*='tag']")
        tags = [t.get_text(strip=True) for t in tag_els if t.get_text(strip=True)]

        return {
            "source_id": source_id,
            "title": title,
            "url": url,
            "date": date_str,
            "pdf_url": pdf_url,
            "summary": summary,
            "tags": tags,
        }

    def _find_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        """Find the next page URL in pagination, if any."""
        next_link = soup.select_one(
            "a[rel='next'], .pagination .next a, a:has-text('Next'), "
            "a:has-text('›'), .pager-next a"
        )
        if next_link:
            return next_link.get("href")
        return None

    # ── Individual publication processing ────────────────────────────

    def _process_publication(self, pub_info: Dict, content_type: str, stats: HarvestStats) -> None:
        """Process a single publication: catalog, download PDF, extract tables."""
        source_id = pub_info["source_id"]

        # Check if already fully processed
        existing = self.get_existing_publication(source_id)
        if existing and existing.get("extraction_status") in ("extracted",):
            logger.debug("[ULI] %s already extracted — skipping", source_id)
            return

        # Fetch the publication detail page for more metadata
        detail_url = pub_info.get("url")
        pdf_url = pub_info.get("pdf_url")
        authors = []
        full_summary = pub_info.get("summary")

        if detail_url and self._check_request_budget():
            try:
                resp = self._counted_fetch(detail_url)
                detail_soup = BeautifulSoup(resp.text, "html.parser")

                # Extract additional metadata from detail page
                authors = self._extract_authors(detail_soup)
                if not full_summary:
                    full_summary = self._extract_summary(detail_soup)
                if not pdf_url:
                    pdf_url = self._find_pdf_link(detail_soup)

            except Exception as exc:
                logger.debug("[ULI] Failed to fetch detail page %s: %s", detail_url, exc)

        # Determine categories based on content type
        category_map = {
            "emerging_trends": ["Market Trends", "Investment"],
            "research_report": ["Research"],
            "advisory_panel": ["Advisory Services"],
            "case_study": ["Development", "Case Studies"],
        }

        # Upsert the publication record
        pub = PublicationRecord(
            source="uli",
            source_id=source_id,
            publication_type=content_type,
            title=pub_info["title"],
            authors=authors if authors else None,
            publisher="Urban Land Institute",
            published_date=pub_info.get("date"),
            categories=category_map.get(content_type, []),
            tags=pub_info.get("tags", []),
            document_type="pdf" if pdf_url else "html",
            summary=full_summary,
            source_url=detail_url,
            pdf_url=pdf_url,
            is_gated=True,  # ULI content requires membership
            extraction_status="pending",
            metadata={"content_type_path": content_type},
        )
        pub_id, is_new = self.upsert_publication(pub)

        if is_new:
            stats.publications_new += 1
        else:
            stats.publications_updated += 1

        # Download PDF if available and not already downloaded
        if pdf_url and self._check_request_budget():
            local_path = self._download_publication_pdf(
                pub_id, source_id, pdf_url, content_type, stats
            )
            if local_path:
                # Extract financial data from tables
                self._extract_financial_data(pub_id, local_path, content_type, stats)

    def _download_publication_pdf(
        self, pub_id: str, source_id: str, pdf_url: str,
        content_type: str, stats: HarvestStats
    ) -> Optional[str]:
        """Download a PDF and update the publication record."""
        # Build destination path
        pdf_base = os.environ.get("ULI_PDF_STORAGE_PATH", "data/uli/pdfs")
        year = datetime.now().strftime("%Y")
        filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', source_id)[:100] + ".pdf"
        dest_path = f"{pdf_base}/{content_type}/{year}/{filename}"

        # Skip if already on disk
        if Path(dest_path).exists():
            logger.debug("[ULI] PDF already on disk: %s", dest_path)
            return dest_path

        try:
            content_hash = self.download_pdf(pdf_url, dest_path, cookies=self._cookies)
            stats.pdfs_downloaded += 1

            self.update_publication_status(
                pub_id, "downloaded",
                local_pdf_path=dest_path,
                content_hash=content_hash,
            )
            return dest_path

        except Exception as exc:
            logger.warning("[ULI] PDF download failed for %s: %s", source_id, exc)
            self.update_publication_status(pub_id, "failed", error=str(exc))
            stats.errors.append(f"PDF download failed: {source_id} — {exc}")
            return None

    # ── Financial data extraction ────────────────────────────────────

    def _extract_financial_data(
        self, pub_id: str, pdf_path: str, content_type: str, stats: HarvestStats
    ) -> None:
        """Extract financial data from PDF tables using pdfplumber."""
        tables = self.extract_tables_from_pdf(pdf_path)
        if not tables:
            logger.debug("[ULI] No tables found in %s", pdf_path)
            return

        records_created = 0

        for table_info in tables:
            headers = table_info["headers"]
            rows = table_info["rows"]
            page = table_info["page"]

            # Classify the table
            category = self._classify_financial_table(headers)
            if not category:
                continue

            # Parse rows into financial data records
            for row in rows:
                records = self._parse_table_row(
                    pub_id, category, headers, row, page, content_type
                )
                for record in records:
                    try:
                        self.upsert_financial_data(record)
                        records_created += 1
                    except Exception as exc:
                        logger.debug(
                            "[ULI] Failed to upsert data point: %s", exc
                        )

        if records_created > 0:
            self.update_publication_status(pub_id, "extracted")
            stats.extractions_completed += records_created
            logger.info("[ULI] Extracted %d data points from %s", records_created, pdf_path)

    def _classify_financial_table(self, headers: List[str]) -> Optional[str]:
        """Classify table by headers using ULI case study-specific patterns."""
        header_text = " ".join(h.lower() for h in headers if h)

        best_match = None
        best_score = 0

        for category, keywords in CASE_STUDY_TABLE_PATTERNS.items():
            score = sum(1 for kw in keywords if kw in header_text)
            if score > best_score:
                best_score = score
                best_match = category

        # Also try the base class classifier
        if not best_match:
            best_match = self.classify_table(headers)

        return best_match

    def _parse_table_row(
        self, pub_id: str, category: str, headers: List[str],
        row: List[str], page: int, content_type: str
    ) -> List[FinancialDataRecord]:
        """Parse a table row into one or more FinancialDataRecord objects."""
        records = []

        if not row or len(row) < 2:
            return records

        # First column is typically the label
        label = row[0].strip() if row[0] else ""
        if not label:
            return records

        # Clean and normalize the label for metric_name
        metric_name = re.sub(r'[^a-zA-Z0-9_ ]', '', label.lower()).strip()
        metric_name = re.sub(r'\s+', '_', metric_name)[:100]
        if not metric_name:
            return records

        # Process remaining columns as values
        for col_idx in range(1, min(len(row), len(headers))):
            cell = row[col_idx].strip() if row[col_idx] else ""
            if not cell or cell == "-" or cell == "N/A":
                continue

            # Try to parse as number
            value, unit = self._parse_numeric_value(cell)
            if value is None and not cell:
                continue

            # Use header as context for period/geography
            header = headers[col_idx].strip() if col_idx < len(headers) else ""

            record = FinancialDataRecord(
                publication_id=pub_id,
                data_category=category,
                metric_name=metric_name,
                metric_value=value,
                metric_unit=unit,
                metric_text=cell if value is None else None,
                property_type=self._infer_property_type(label, header),
                geography=self._infer_geography(header),
                reference_period=header if self._looks_like_period(header) else None,
                context=f"{label}: {cell} (col: {header})",
                confidence_score=0.75 if value is not None else 0.5,
                extraction_method="table_parse",
                page_number=page,
            )
            records.append(record)

        return records

    @staticmethod
    def _parse_numeric_value(text: str) -> tuple:
        """
        Parse a cell value into (numeric_value, unit).
        Returns (None, None) if not parseable.
        """
        if not text:
            return None, None

        cleaned = text.strip()

        # Check for percentage
        pct_match = re.match(r'^([\d,.]+)\s*%$', cleaned)
        if pct_match:
            try:
                return float(pct_match.group(1).replace(",", "")), "percent"
            except ValueError:
                return None, None

        # Check for currency
        currency_match = re.match(r'^\$?\s*([\d,.]+)\s*(M|K|B|million|thousand|billion)?$', cleaned, re.I)
        if currency_match:
            try:
                val = float(currency_match.group(1).replace(",", ""))
                suffix = (currency_match.group(2) or "").upper()
                multipliers = {"M": 1_000_000, "K": 1_000, "B": 1_000_000_000,
                               "MILLION": 1_000_000, "THOUSAND": 1_000, "BILLION": 1_000_000_000}
                val *= multipliers.get(suffix, 1)
                return val, "usd"
            except ValueError:
                return None, None

        # Check for plain number
        num_match = re.match(r'^([\d,.]+)$', cleaned)
        if num_match:
            try:
                return float(num_match.group(1).replace(",", "")), None
            except ValueError:
                return None, None

        # Check for PSF (per square foot)
        psf_match = re.match(r'^\$?\s*([\d,.]+)\s*/?\s*(?:sf|psf|sq\s*ft)$', cleaned, re.I)
        if psf_match:
            try:
                return float(psf_match.group(1).replace(",", "")), "usd_psf"
            except ValueError:
                return None, None

        return None, None

    @staticmethod
    def _infer_property_type(label: str, header: str) -> Optional[str]:
        """Infer property type from label/header text."""
        combined = f"{label} {header}".lower()
        type_keywords = {
            "multifamily": ["multifamily", "apartment", "residential rental", "unit mix", "rent roll"],
            "office": ["office"],
            "retail": ["retail", "shopping"],
            "industrial": ["industrial", "warehouse", "logistics"],
            "mixed_use": ["mixed-use", "mixed use"],
            "land": ["land", "lot", "parcel", "subdivision"],
        }
        for ptype, keywords in type_keywords.items():
            if any(kw in combined for kw in keywords):
                return ptype
        return None

    @staticmethod
    def _infer_geography(text: str) -> Optional[str]:
        """Infer geography from column header or text."""
        if not text:
            return None
        # Common patterns: city names, "National", state abbreviations
        geo_patterns = [
            r'(National|US|United States)',
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',  # City names
        ]
        for pattern in geo_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def _looks_like_period(text: str) -> bool:
        """Check if text looks like a time period reference."""
        if not text:
            return False
        period_patterns = [
            r'\d{4}',           # 2025
            r'[1-4]Q\d{2}',    # 4Q25
            r'Q[1-4]\s*\d{4}', # Q4 2025
            r'Year\s*\d',      # Year 1
            r'Month\s*\d',     # Month 12
            r'stabilized',     # Stabilized
            r'at\s*completion', # At Completion
        ]
        return any(re.search(p, text, re.I) for p in period_patterns)

    # ── Detail page helpers ──────────────────────────────────────────

    def _extract_authors(self, soup: BeautifulSoup) -> List[str]:
        """Extract author names from a publication detail page."""
        authors = []
        author_els = soup.select(
            ".author, [class*='author'], .byline, .contributor"
        )
        for el in author_els:
            name = el.get_text(strip=True)
            if name and len(name) > 2 and len(name) < 100:
                authors.append(name)
        return authors

    def _extract_summary(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract summary/description from detail page."""
        summary_el = soup.select_one(
            ".summary, .description, .abstract, .overview, "
            "[class*='summary'], [class*='description'], "
            "meta[name='description']"
        )
        if summary_el:
            if summary_el.name == "meta":
                return summary_el.get("content", "")[:500]
            return summary_el.get_text(strip=True)[:500]
        return None

    def _find_pdf_link(self, soup: BeautifulSoup) -> Optional[str]:
        """Find a PDF download link on a detail page."""
        pdf_links = soup.select(
            "a[href$='.pdf'], a[href*='/-/media/'], "
            "a[class*='download'], a:has-text('Download PDF'), "
            "a:has-text('Download Report')"
        )
        for link in pdf_links:
            href = link.get("href", "")
            if href:
                return href if href.startswith("http") else urljoin(ULI_BASE_URL, href)
        return None


# ── Standalone entry point ───────────────────────────────────────────

def run_standalone():
    """CLI entry: python -m market_agents.agents.uli_agent"""
    agent = ULIAgent()
    agent.run_standalone()


if __name__ == "__main__":
    run_standalone()
