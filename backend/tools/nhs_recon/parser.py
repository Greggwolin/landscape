from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional, Sequence
from urllib.parse import urljoin

from bs4 import BeautifulSoup


def _first_text(soup: BeautifulSoup, selectors: Sequence[str]) -> Optional[str]:
    for selector in selectors:
        node = soup.select_one(selector)
        if node and node.get_text(strip=True):
            return node.get_text(strip=True)
    return None


def _extract_number(text: Optional[str]) -> Optional[float]:
    if not text:
        return None
    match = re.search(r"([\d,.]+)", text)
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", ""))
    except ValueError:
        return None


def extract_links_by_keyword(
    soup: BeautifulSoup, base_url: str, keywords: Sequence[str]
) -> List[str]:
    urls = []
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"]
        if any(keyword in href for keyword in keywords):
            absolute = urljoin(base_url, href)
            urls.append(absolute)
    # Preserve order, drop duplicates.
    seen = set()
    ordered = []
    for url in urls:
        if url in seen:
            continue
        ordered.append(url)
        seen.add(url)
    return ordered


def parse_json_ld(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    payloads: List[Dict[str, Any]] = []
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "{}")
            if isinstance(data, list):
                payloads.extend([item for item in data if isinstance(item, dict)])
            elif isinstance(data, dict):
                payloads.append(data)
        except json.JSONDecodeError:
            continue
    return payloads


def parse_community_page(html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")
    json_ld = parse_json_ld(soup)
    community_name = _first_text(
        soup, ["h1", "[data-testid='community-name']", ".community-name"]
    )
    builder_name = _first_text(soup, [".builder-name", "[data-testid='builder-name']"])
    city_state = _first_text(soup, [".city-state", ".community-address", "address"])
    hoa = _extract_number(
        _first_text(
            soup,
            [
                ".hoa-fee",
                "[data-testid='hoa-fee']",
                'li:-soup-contains("HOA")',
                ".hoa",
            ],
        )
    )
    if json_ld:
        place = next((item for item in json_ld if item.get("@type") == "Place"), None)
        if place:
            community_name = community_name or place.get("name")
            address = place.get("address") or {}
            city_state = city_state or " ".join(
                filter(None, [address.get("addressLocality"), address.get("addressRegion")])
            ).strip()
    return {
        "name": community_name,
        "builder_name": builder_name,
        "city_state": city_state,
        "hoa_monthly": hoa,
    }


def parse_plan_page(html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")
    json_ld = parse_json_ld(soup)
    plan_name = _first_text(
        soup, ["h1", ".plan-name", "[data-testid='plan-name']"]
    )
    base_price = _extract_number(
        _first_text(soup, [".price", ".plan-price", "[data-testid='price']"])
    )
    beds = _extract_number(
        _first_text(
            soup,
            [".beds", "[data-testid='beds']", 'li:-soup-contains("Bed")'],
        )
    )
    baths = _extract_number(
        _first_text(
            soup,
            [".baths", "[data-testid='baths']", 'li:-soup-contains("Bath")'],
        )
    )
    sqft = _extract_number(
        _first_text(
            soup, [".sqft", "[data-testid='sqft']", 'li:-soup-contains("Sq")']
        )
    )
    product_type = _first_text(soup, [".home-type", "[data-testid='home-type']"])
    if json_ld:
        offer = next((item for item in json_ld if item.get("@type") == "Product"), None)
        if offer:
            plan_name = plan_name or offer.get("name")
            product_type = product_type or offer.get("category")
        offer_data = next((item for item in json_ld if item.get("@type") == "Offer"), None)
        if offer_data:
            base_price = base_price or _extract_number(str(offer_data.get("price")))
    return {
        "plan_name": plan_name,
        "base_price": base_price,
        "beds_min": beds,
        "baths_min": baths,
        "sqft_min": sqft,
        "product_type": product_type,
    }


def parse_listing_page(html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")
    json_ld = parse_json_ld(soup)
    status = _first_text(soup, [".status", ".inventory-status", "[data-testid='status']"])
    price = _extract_number(
        _first_text(soup, [".price", ".inventory-price", "[data-testid='price']"])
    )
    address = _first_text(
        soup, ["[data-testid='address']", "address", ".listing-address"]
    )
    quick_move_in = _first_text(
        soup,
        [".qmi-date", "[data-testid='qmi-date']", 'li:-soup-contains("Move-In")'],
    )
    sqft = _extract_number(
        _first_text(
            soup, [".sqft", "[data-testid='sqft']", 'li:-soup-contains("Sq")']
        )
    )
    if json_ld:
        offer = next((item for item in json_ld if item.get("@type") == "Offer"), None)
        if offer:
            status = status or offer.get("availability")
            price = price or _extract_number(str(offer.get("price")))
        place = next((item for item in json_ld if item.get("@type") == "Place"), None)
        if place:
            address = address or place.get("name")
    return {
        "status": status,
        "price_current": price,
        "address": address,
        "quick_move_in_date": quick_move_in,
        "sqft_actual": sqft,
    }


def discover_community_urls(soup: BeautifulSoup, base_url: str) -> List[str]:
    return extract_links_by_keyword(soup, base_url, ["/community/"])


def discover_plan_urls(soup: BeautifulSoup, base_url: str) -> List[str]:
    return extract_links_by_keyword(soup, base_url, ["/plan/"])


def discover_listing_urls(soup: BeautifulSoup, base_url: str) -> List[str]:
    return extract_links_by_keyword(
        soup,
        base_url,
        ["/spechome/", "inventory-home", "move-in-ready", "quick-move-in", "spec-home"],
    )
