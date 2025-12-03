from __future__ import annotations

import hashlib
import json
import logging
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from backend.tools.common.http_client import HttpClient

from .schemas import MeritageCommunity

NUM_PATTERN = re.compile(r"([\\d,]+(?:\\.\\d+)?)")
RANGE_PATTERN = re.compile(r"([\\d,]+(?:\\.\\d+)?)\\s*-\\s*([\\d,]+(?:\\.\\d+)?)")


def _clean_number(text: str | None) -> Optional[float]:
    if not text:
        return None
    if isinstance(text, (int, float)):
        return float(text)
    match = NUM_PATTERN.search(str(text))
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", ""))
    except ValueError:
        return None


def _parse_range(value: Any) -> tuple[Optional[float], Optional[float]]:
    if value is None:
        return None, None
    if isinstance(value, (int, float)):
        num = float(value)
        return num, num
    if isinstance(value, dict):
        value = value.get("value") if "value" in value else value
    text = str(value)
    match = RANGE_PATTERN.search(text)
    if match:
        low = _clean_number(match.group(1))
        high = _clean_number(match.group(2))
        return low, high
    num = _clean_number(text)
    return num, num


def _extract_value(container: Any, *keys: str) -> Optional[Any]:
    """Safely extract a nested value from dictionaries."""
    for key in keys:
        if not isinstance(container, dict):
            return None
        if key in container:
            container = container[key]
        else:
            return None
    if isinstance(container, dict) and "value" in container:
        return container.get("value")
    return container


def _hash_id(seed: str) -> str:
    return hashlib.md5(seed.encode("utf-8")).hexdigest()


def parse_next_data(html: str) -> Optional[Dict[str, Any]]:
    """Extract the __NEXT_DATA__ JSON blob from the page."""
    soup = BeautifulSoup(html, "lxml")
    script = soup.find("script", id="__NEXT_DATA__")
    if not script or not script.text:
        logging.debug("No __NEXT_DATA__ script found.")
        return None
    try:
        return json.loads(script.text)
    except json.JSONDecodeError as exc:
        logging.warning("Failed to parse __NEXT_DATA__: %s", exc)
        return None


def _candidate_lists(payload: Any) -> Iterable[List[Dict[str, Any]]]:
    """Recursively yield lists of dictionaries that may contain communities."""
    if isinstance(payload, list):
        if payload and all(isinstance(item, dict) for item in payload):
            yield payload  # type: ignore[misc]
        for item in payload:
            yield from _candidate_lists(item)
    elif isinstance(payload, dict):
        for value in payload.values():
            yield from _candidate_lists(value)


def _dict_get_text(d: Dict[str, Any], key_candidates: Iterable[str]) -> Optional[Any]:
    for key in key_candidates:
        if key in d:
            val = d[key]
            if isinstance(val, dict) and "value" in val:
                val = val["value"]
            if isinstance(val, dict) and "jsonValue" in val:
                json_val = val["jsonValue"]
                if isinstance(json_val, dict) and "value" in json_val:
                    val = json_val["value"]
            return val
    return None


def _build_community(
    d: Dict[str, Any],
    market_label: str,
    base_url: str,
) -> Optional[MeritageCommunity]:
    name = _dict_get_text(
        d, ["communityName", "name", "title", "displayName", "heading"]
    )
    city = _dict_get_text(d, ["city"])
    state = _dict_get_text(d, ["state", "stateCode", "stateAbbreviation"])
    url = _dict_get_text(d, ["url", "link", "href", "relativeUrl", "pageUrl"])
    if isinstance(url, dict):
        url = _extract_value(url, "href") or _extract_value(url, "url")
    if isinstance(url, str):
        url = urljoin(base_url, url)

    price_text = _dict_get_text(
        d,
        [
            "priceRange",
            "startingPrice",
            "startingFrom",
            "priceFrom",
            "priceLow",
            "priceHigh",
            "fromPrice",
        ],
    )
    sqft_text = _dict_get_text(d, ["sqftRange", "sqft", "squareFeet", "sizeRange"])
    beds_text = _dict_get_text(d, ["bedsRange", "beds", "bedrooms"])
    baths_text = _dict_get_text(d, ["bathsRange", "baths", "bathrooms"])

    # Require a name and some location or URL signal to reduce false positives
    if not name or not (city or state or url):
        return None

    # Filter obvious non-community URLs (legal pages, social, portal)
    if isinstance(url, str):
        lowered = url.lower()
        blocked_hosts = ["facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com", "pinterest.com"]
        if any(host in lowered for host in blocked_hosts):
            return None
        if "agents.meritagehomes.com" in lowered or "new.meritagehomes.com/company" in lowered:
            return None

    url_hint_valid = False
    if isinstance(url, str):
        url_lower = url.lower()
        market_path = urlparse(base_url).path.lower()
        market_segments = [seg for seg in market_path.split("/") if seg]
        url_hint_valid = any(
            token in url_lower for token in ["/state/", "/community/", "/phoenix", "/new-homes"]
        )
        if market_segments:
            # Require the last path segment (e.g., phoenix) to appear in the URL
            if market_segments[-1] not in url_lower:
                return None
    has_structured_data = any(
        val is not None for val in [price_text, sqft_text, beds_text, baths_text, city, state]
    )
    if not url_hint_valid and not has_structured_data:
        return None

    price_min, price_max = _parse_range(price_text)

    sqft_min, sqft_max = _parse_range(sqft_text)

    beds_min, beds_max = _parse_range(beds_text)

    baths_min, baths_max = _parse_range(baths_text)

    community_id = str(
        _dict_get_text(d, ["communityId", "id", "uid"])
        or _hash_id(str(url or name))
    )

    return MeritageCommunity(
        community_id=community_id,
        builder_name="Meritage Homes",
        name=str(name),
        market_label=market_label,
        city=str(city) if city else None,
        state=str(state) if state else None,
        url=str(url) if url else "",
        product_types=["SFD"],
        price_min=price_min,
        price_max=price_max,
        sqft_min=sqft_min,
        sqft_max=sqft_max,
        beds_min=beds_min,
        beds_max=beds_max,
        baths_min=baths_min,
        baths_max=baths_max,
        first_seen_at=None,
        last_seen_at=None,
    )


def parse_communities_from_next_data(
    next_data: Dict[str, Any],
    market_label: str,
    base_url: str,
) -> List[MeritageCommunity]:
    """Parse communities from the __NEXT_DATA__ JSON.

    The Meritage site uses Next.js with data stored under componentProps.
    We scan all lists of dictionaries for community-like objects and
    construct MeritageCommunity models.
    """
    communities: List[MeritageCommunity] = []
    component_props = (
        next_data.get("props", {})
        .get("pageProps", {})
        .get("componentProps", {})
    )

    for comp in component_props.values():
        data = comp.get("data", comp)
        for candidate_list in _candidate_lists(data):
            for item in candidate_list:
                community = _build_community(item, market_label, base_url)
                if community:
                    communities.append(community)

    # Fallback: scan the entire payload if nothing was found
    if not communities:
        for candidate_list in _candidate_lists(next_data):
            for item in candidate_list:
                community = _build_community(item, market_label, base_url)
                if community:
                    communities.append(community)

    # Deduplicate by community_id or URL
    deduped: Dict[str, MeritageCommunity] = {}
    for comm in communities:
        key = comm.community_id or comm.url
        if key not in deduped:
            deduped[key] = comm

    return list(deduped.values())


# ---- Client-side API probing -------------------------------------------------

AZURE_API_BASE = "https://apim-int-wus3-prod.azure-api.net"
AZURE_SEARCH_PATH = "/api/v1/search/meritagehomes"


def _build_search_payload(metro_label: str) -> Dict[str, Any]:
    """Construct a conservative search payload based on observed field names."""
    return {
        "searchType": "community",
        "metro": metro_label,
        "state": "AZ",
        "page": 1,
        "pageSize": 100,
    }


def _parse_search_response(
    payload: Dict[str, Any], market_label: str
) -> List[MeritageCommunity]:
    """Best-effort extraction from the Azure search API response."""
    results = payload.get("results") or payload.get("items") or []
    communities: List[MeritageCommunity] = []
    for item in results:
        fields = item.get("fields", {}) if isinstance(item, dict) else item
        name = fields.get("communityName") or fields.get("name")
        city = fields.get("city")
        state = fields.get("state") or "AZ"
        url = fields.get("url") or fields.get("canonicalUrl") or fields.get("pageUrl")
        price_min, price_max = _parse_range(fields.get("priceRange"))
        if not price_min:
            price_min = _clean_number(fields.get("priceFrom"))
        sqft_min, sqft_max = _parse_range(fields.get("sqftRange"))
        beds_min, beds_max = _parse_range(fields.get("bedrooms"))
        baths_min, baths_max = _parse_range(fields.get("bathrooms"))
        if not name:
            continue
        communities.append(
            MeritageCommunity(
                community_id=str(fields.get("id") or _hash_id(str(url or name))),
                builder_name="Meritage Homes",
                name=str(name),
                market_label=market_label,
                city=city,
                state=state,
                url=url or "",
                product_types=["SFD"],
                price_min=price_min,
                price_max=price_max,
                sqft_min=sqft_min,
                sqft_max=sqft_max,
                beds_min=beds_min,
                beds_max=beds_max,
                baths_min=baths_min,
                baths_max=baths_max,
            )
        )
    return communities


def probe_client_search_api(
    client: HttpClient, market_label: str, subscription_key: Optional[str]
) -> Tuple[List[MeritageCommunity], List[str]]:
    """Attempt to call Meritage's client-side search API."""
    warnings: List[str] = []
    headers = {"Content-Type": "application/json"}
    if subscription_key:
        headers["Ocp-Apim-Subscription-Key"] = subscription_key
    payload = _build_search_payload("Phoenix")
    try:
        resp = client.client.post(
            f"{AZURE_API_BASE}{AZURE_SEARCH_PATH}",
            headers=headers,
            json=payload,
            timeout=10.0,
        )
        client.request_count += 1
        if resp.status_code >= 400:
            warnings.append(
                f"Search API returned {resp.status_code}: {resp.text[:200]}"
            )
            return [], warnings
        data = resp.json()
        communities = _parse_search_response(data, market_label)
        if not communities:
            warnings.append("Search API responded but contained no community results.")
        return communities, warnings
    except Exception as exc:  # noqa: BLE001
        warnings.append(f"Search API call failed: {exc}")
        return [], warnings
