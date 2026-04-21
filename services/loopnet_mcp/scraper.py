"""
LoopNet scraper — curl_cffi primary, nodriver fallback for Akamai challenges.

Approach credited to johnstenner/LoopnetMCP:
  - curl_cffi replicates Chrome 136 TLS fingerprint → bypasses standard Akamai detection
  - nodriver (undetectable headless Chrome) handles JS challenge pages as fallback
  - BeautifulSoup + lxml for HTML parsing

Output fields mapped to tbl_sales_comparables column names.
"""

import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlencode, quote

from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession

logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

LOOPNET_BASE = "https://www.loopnet.com"

# Chrome 136 impersonation — the key to beating Akamai
IMPERSONATE = "chrome136"

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
}

# Property type → LoopNet URL path segment
PROPERTY_TYPE_MAP: Dict[str, str] = {
    "multifamily": "apartment-buildings",
    "apartment": "apartment-buildings",
    "apartments": "apartment-buildings",
    "mf": "apartment-buildings",
    "office": "office-space",
    "retail": "retail-space",
    "industrial": "industrial-space",
    "land": "land",
    "hotel": "hotels",
    "hospitality": "hotels",
    "mixed-use": "commercial-real-estate",
    "mixed use": "commercial-real-estate",
    "commercial": "commercial-real-estate",
    "special-purpose": "special-purpose",
    "health-care": "health-care",
}

# ─── Akamai detection ─────────────────────────────────────────────────────────

AKAMAI_SIGNALS = [
    "AkamaiGHost",
    "ak_bmsc",
    "_abck",
    "You don't have permission to access",
    "Access Denied",
    "checking your browser",
]


def _is_akamai_challenge(html: str) -> bool:
    for signal in AKAMAI_SIGNALS:
        if signal.lower() in html.lower():
            return True
    return False


# ─── URL construction ──────────────────────────────────────────────────────────

def slugify_location(location: str) -> str:
    """'Pasadena, CA' → 'pasadena-ca'"""
    s = location.lower().strip()
    s = re.sub(r"[,\s]+", "-", s)
    s = re.sub(r"[^a-z0-9\-]", "", s)
    return re.sub(r"-+", "-", s).strip("-")


def build_search_url(location: str, property_type: str, filters: Dict[str, Any]) -> str:
    pt_key = property_type.lower().replace(" ", "-").replace("_", "-")
    pt_slug = PROPERTY_TYPE_MAP.get(pt_key, "apartment-buildings")
    loc_slug = slugify_location(location)
    base = f"{LOOPNET_BASE}/search/{pt_slug}/{loc_slug}/for-sale/"

    params: Dict[str, str] = {}
    if filters.get("min_price"):
        params["MinPrice"] = str(int(filters["min_price"]))
    if filters.get("max_price"):
        params["MaxPrice"] = str(int(filters["max_price"]))
    if filters.get("min_units"):
        params["MinUnits"] = str(int(filters["min_units"]))
    if filters.get("max_units"):
        params["MaxUnits"] = str(int(filters["max_units"]))
    if filters.get("min_year_built"):
        params["MinYearBuilt"] = str(int(filters["min_year_built"]))
    if filters.get("max_year_built"):
        params["MaxYearBuilt"] = str(int(filters["max_year_built"]))

    return base + ("?" + urlencode(params) if params else "")


# ─── HTTP fetch with Akamai fallback ──────────────────────────────────────────

async def _fetch_html(url: str, session: AsyncSession) -> str:
    """
    Primary: curl_cffi with Chrome 136 TLS fingerprint.
    Fallback: nodriver (undetectable headless Chrome) for JS challenge pages.
    """
    try:
        resp = await session.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
        html = resp.text

        if _is_akamai_challenge(html):
            logger.warning(f"Akamai challenge on {url} — falling back to nodriver")
            return await _nodriver_fetch(url)

        return html

    except Exception as e:
        logger.warning(f"curl_cffi fetch failed for {url}: {e} — trying nodriver")
        return await _nodriver_fetch(url)


async def _nodriver_fetch(url: str) -> str:
    """Fallback: nodriver-based undetectable Chromium."""
    try:
        import nodriver as nd  # lazy import — only if needed

        browser = await nd.start(
            headless=True,
            browser_args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            page = await browser.get(url)
            await asyncio.sleep(3)  # let JS challenges resolve
            html = await page.get_content()
            return html
        finally:
            browser.stop()

    except ImportError:
        logger.error("nodriver not installed — cannot bypass Akamai challenge")
        raise RuntimeError(
            "Akamai challenge encountered and nodriver fallback is unavailable. "
            "Install nodriver: pip install nodriver"
        )
    except Exception as e:
        raise RuntimeError(f"nodriver fetch failed: {e}") from e


# ─── Field normalization ───────────────────────────────────────────────────────

def parse_price(text: str) -> Optional[float]:
    """'$4.2M' → 4200000.0 | '$850,000' → 850000.0"""
    if not text:
        return None
    t = text.strip().replace("$", "").replace(",", "").replace(" ", "")
    if not t or any(w in t.lower() for w in ("request", "negotiable", "call", "tbd")):
        return None
    mult = 1.0
    if t.upper().endswith("M"):
        mult = 1_000_000; t = t[:-1]
    elif t.upper().endswith("K"):
        mult = 1_000; t = t[:-1]
    elif t.upper().endswith("B"):
        mult = 1_000_000_000; t = t[:-1]
    try:
        return float(t) * mult
    except (ValueError, TypeError):
        return None


def parse_cap_rate(text: str) -> Optional[float]:
    """'5.25%' → 0.0525"""
    if not text:
        return None
    m = re.search(r"(\d+\.?\d*)", text.replace("%", ""))
    if not m:
        return None
    val = float(m.group(1))
    return round(val / 100, 6) if val > 1 else round(val, 6)


def parse_int(text: str) -> Optional[int]:
    if not text:
        return None
    digits = re.sub(r"[^\d]", "", text.split(".")[0])
    return int(digits) if digits else None


def parse_address(raw: str) -> Dict[str, str]:
    """
    Parse 'Los Angeles, CA 90001' or multi-line address blocks
    into {address, city, state, zip_code}.
    """
    result: Dict[str, str] = {}
    lines = [ln.strip() for ln in re.split(r"[\n,]", raw) if ln.strip()]
    if not lines:
        return result

    # Find city/state/zip line — heuristic: contains 2-letter state code
    cs_line = None
    street_lines = []
    for line in lines:
        m = re.search(r"\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b", line)
        if m:
            cs_line = line
        else:
            street_lines.append(line)

    if street_lines:
        result["address"] = " ".join(street_lines)
    if cs_line:
        m = re.match(r"^(.*?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$", cs_line.strip())
        if m:
            result["city"] = m.group(1).strip(" ,")
            result["state"] = m.group(2)
            result["zip_code"] = m.group(3)
        else:
            # No ZIP — try "City ST"
            m2 = re.match(r"^(.*?)\s+([A-Z]{2})$", cs_line.strip())
            if m2:
                result["city"] = m2.group(1).strip(" ,")
                result["state"] = m2.group(2)

    return result


# ─── Search results parser ────────────────────────────────────────────────────
# Mirrors johnstenner's search.py selector logic adapted to our field names.

def parse_search_results(html: str, property_type: str) -> List[Dict[str, Any]]:
    """Parse LoopNet search results HTML → list of listing dicts."""
    soup = BeautifulSoup(html, "lxml")
    listings = []

    # LoopNet renders results in <article> tags with class="placard" or similar
    cards = (
        soup.find_all("article", class_=re.compile(r"placard|listing-card", re.I))
        or soup.find_all("li", class_=re.compile(r"placard|listing", re.I))
        or soup.find_all("div", class_=re.compile(r"ListingCard|property-record", re.I))
    )

    for card in cards:
        try:
            listing: Dict[str, Any] = {
                "data_source": "LoopNet",
                "property_type": property_type,
            }

            # URL + property name
            header = card.find(["h2", "h3", "h4"], class_=re.compile(r"title|name|address", re.I))
            link = (header.find("a") if header else None) or card.find("a", href=re.compile(r"/Listing/", re.I))
            if link:
                href = link.get("href", "")
                listing["listing_url"] = urljoin(LOOPNET_BASE, href)
                listing["property_name"] = link.get_text(strip=True)

            # Address / subtitle
            subtitle = card.find(class_=re.compile(r"subtitle|address|location", re.I))
            if subtitle:
                addr_parts = parse_address(subtitle.get_text(" ", strip=True))
                listing.update(addr_parts)

            # Price — look in a stats/details section
            price_el = card.find(class_=re.compile(r"price|asking", re.I))
            if price_el:
                price_text = price_el.get_text(strip=True)
                listing["asking_price"] = parse_price(price_text)
                listing["_asking_price_display"] = price_text

            # Data points from list items (units, SF, cap rate)
            # johnstenner's approach: mine all <li> text with regex patterns
            for li in card.find_all("li"):
                text = li.get_text(strip=True)
                text_lower = text.lower()

                if "unit" in text_lower and "unit_count" not in listing:
                    m = re.search(r"(\d[\d,]*)\s*unit", text_lower)
                    if m:
                        listing["unit_count"] = int(m.group(1).replace(",", ""))

                elif "sf" in text_lower or "sq ft" in text_lower:
                    if "building_sf" not in listing:
                        m = re.search(r"([\d,]+(?:\.\d+)?)\s*(?:sf|sq\s*ft)", text_lower)
                        if m:
                            listing["building_sf"] = float(m.group(1).replace(",", ""))

                elif "cap rate" in text_lower or "% cap" in text_lower:
                    if "cap_rate" not in listing:
                        m = re.search(r"(\d+\.?\d*)\s*%", text)
                        if m:
                            listing["cap_rate"] = parse_cap_rate(m.group(0))

                elif re.search(r"\$[\d,\.]+[km]?\s*/\s*unit", text_lower):
                    if "price_per_unit" not in listing:
                        listing["price_per_unit"] = parse_price(text)

                elif re.search(r"\$[\d,\.]+[km]?\s*/\s*sf", text_lower):
                    if "price_per_sf" not in listing:
                        listing["price_per_sf"] = parse_price(text)

            # Fallback: scan full card text for year built
            if "year_built" not in listing:
                full = card.get_text(" ", strip=True)
                m = re.search(r"built\s+(?:in\s+)?(\d{4})", full, re.I)
                if m:
                    listing["year_built"] = int(m.group(1))

            # Broker company
            broker_el = card.find(class_=re.compile(r"broker|brokerage|agent|company", re.I))
            if broker_el:
                listing["listing_broker_company"] = broker_el.get_text(strip=True)[:100]

            if listing.get("listing_url") or listing.get("property_name"):
                listings.append(listing)

        except Exception as e:
            logger.debug(f"Card parse error: {e}")
            continue

    return listings


# ─── Detail page parser ────────────────────────────────────────────────────────

# Label → (field_name, parser_fn)
_FACT_MAP = {
    "units":               ("unit_count", parse_int),
    "unit count":          ("unit_count", parse_int),
    "year built":          ("year_built", parse_int),
    "stories":             ("num_floors", parse_int),
    "no. of stories":      ("num_floors", parse_int),
    "floors":              ("num_floors", parse_int),
    "building size":       ("building_sf", parse_price),
    "total sf":            ("building_sf", parse_price),
    "gross sf":            ("building_sf", parse_price),
    "rentable sf":         ("building_sf", parse_price),
    "lot size":            ("land_area_sf", parse_price),
    "land area":           ("land_area_sf", parse_price),
    "cap rate":            ("cap_rate", parse_cap_rate),
    "price/unit":          ("price_per_unit", parse_price),
    "price per unit":      ("price_per_unit", parse_price),
    "price/sf":            ("price_per_sf", parse_price),
    "price per sf":        ("price_per_sf", parse_price),
    "noi":                 ("noi_at_sale", parse_price),
    "occupancy":           ("percent_leased_at_sale", lambda t: _pct(t)),
    "percent leased":      ("percent_leased_at_sale", lambda t: _pct(t)),
    "avg unit size":       ("avg_unit_size_sf", parse_price),
    "average unit size":   ("avg_unit_size_sf", parse_price),
    "parking":             ("parking", str),
    "zoning":              ("zoning", str),
    "construction type":   ("construction_type", str),
    "construction":        ("construction_type", str),
    "submarket":           ("submarket", str),
    "class":               ("building_class", str),
    "property class":      ("building_class", str),
    "building class":      ("building_class", str),
    "tenancy":             ("tenancy_type", str),
    "days on market":      ("days_on_market", parse_int),
}


def _pct(text: str) -> Optional[float]:
    m = re.search(r"([\d.]+)", text)
    if not m:
        return None
    v = float(m.group(1))
    return round(v / 100, 4) if v > 1 else round(v, 4)


def parse_detail(html: str, url: str) -> Dict[str, Any]:
    """Parse a LoopNet listing detail page → full comp dict."""
    soup = BeautifulSoup(html, "lxml")
    detail: Dict[str, Any] = {"listing_url": url, "data_source": "LoopNet"}

    # Property name
    h1 = soup.find("h1")
    if h1:
        detail["property_name"] = h1.get_text(strip=True)

    # Address
    addr_el = soup.find(class_=re.compile(r"listing-address|property-address|address", re.I))
    if addr_el:
        addr_parts = parse_address(addr_el.get_text(" ", strip=True))
        detail.update(addr_parts)

    # Price
    price_el = soup.find(class_=re.compile(r"asking-price|listing-price|price-value", re.I))
    if price_el:
        pt = price_el.get_text(strip=True)
        detail["asking_price"] = parse_price(pt)
        detail["_asking_price_display"] = pt

    # Key facts — try multiple container patterns
    for container_sel in [
        {"class": re.compile(r"property-facts|key-facts|fact-list", re.I)},
        {"class": re.compile(r"property-details|details-list", re.I)},
    ]:
        container = soup.find(**container_sel)
        if container:
            _extract_facts(container, detail)
            if len(detail) > 6:
                break

    # Fallback: scan all <li> elements on the page
    if len(detail) < 7:
        _extract_facts(soup, detail)

    # Land area acres
    if detail.get("land_area_sf"):
        detail["land_area_acres"] = round(detail["land_area_sf"] / 43_560, 4)

    # Broker info
    broker_el = soup.find(class_=re.compile(r"broker-name|agent-name", re.I))
    if broker_el:
        detail["listing_broker"] = broker_el.get_text(strip=True)[:200]

    broker_co = soup.find(class_=re.compile(r"broker-company|brokerage-name|company-name", re.I))
    if broker_co:
        detail["listing_broker_company"] = broker_co.get_text(strip=True)[:200]

    # Description
    desc_el = soup.find(class_=re.compile(r"listing-description|property-description", re.I))
    if desc_el:
        detail["transaction_notes"] = desc_el.get_text(strip=True)[:1000]

    # Coordinates from JSON-LD
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            geo = data.get("geo") or {}
            lat = geo.get("latitude") or geo.get("lat")
            lng = geo.get("longitude") or geo.get("lng")
            if lat and lng:
                detail["latitude"] = float(lat)
                detail["longitude"] = float(lng)
                break
        except Exception:
            continue

    return detail


def _extract_facts(container, detail: Dict[str, Any]) -> None:
    """Mine label:value pairs from a BeautifulSoup element into detail dict."""
    for li in container.find_all(["li", "div", "dt", "tr"]):
        text = li.get_text(" ", strip=True)
        if not text or len(text) > 200:
            continue

        # Try child label/value elements first
        label_el = li.find(["label", "dt", "th"])
        value_el = li.find(["span", "dd", "td"])
        if label_el and value_el:
            label = label_el.get_text(strip=True).lower()
            value = value_el.get_text(strip=True)
        elif ":" in text:
            parts = text.split(":", 1)
            label, value = parts[0].strip().lower(), parts[1].strip()
        else:
            continue

        for key, (field, parser) in _FACT_MAP.items():
            if key in label and field not in detail:
                try:
                    parsed = parser(value)
                    if parsed is not None:
                        detail[field] = parsed
                except Exception:
                    pass
                break


# ─── Public API ───────────────────────────────────────────────────────────────

async def search_listings(
    location: str,
    property_type: str,
    filters: Dict[str, Any],
    max_results: int,
) -> Dict[str, Any]:
    url = build_search_url(location, property_type, filters)

    async with AsyncSession(impersonate=IMPERSONATE) as session:
        # Warmup: hit homepage first (helps with cookie/session state)
        try:
            await session.get(LOOPNET_BASE, headers=HEADERS, timeout=15)
        except Exception:
            pass

        html = await _fetch_html(url, session)

    listings = parse_search_results(html, property_type)[:max_results]
    return {
        "location": location,
        "property_type": property_type,
        "search_url": url,
        "count": len(listings),
        "listings": listings,
        "note": "asking_price is the listed price, not a closed sale price",
    }


async def get_detail(url: str) -> Dict[str, Any]:
    async with AsyncSession(impersonate=IMPERSONATE) as session:
        html = await _fetch_html(url, session)
    return parse_detail(html, url)


async def search_similar(
    location: str,
    units: Optional[int],
    year_built_before: Optional[int],
    year_built_after: Optional[int],
    max_price: Optional[float],
    max_results: int,
) -> Dict[str, Any]:
    filters: Dict[str, Any] = {}
    if max_price:
        filters["max_price"] = max_price
    if year_built_before:
        filters["max_year_built"] = year_built_before
    if year_built_after:
        filters["min_year_built"] = year_built_after
    if units:
        filters["min_units"] = max(1, int(units * 0.7))
        filters["max_units"] = int(units * 1.3)

    result = await search_listings(location, "Multifamily", filters, max_results)

    for listing in result["listings"]:
        notes = []
        if units and listing.get("unit_count"):
            diff = abs(listing["unit_count"] - units)
            pct = diff / units * 100
            notes.append(f"Units: {listing['unit_count']} ({pct:.0f}% diff vs subject {units})")
        listing["similarity_notes"] = "; ".join(notes) or "See detail for comparison"

    result["subject_units"] = units
    result["subject_year_built_before"] = year_built_before
    return result
