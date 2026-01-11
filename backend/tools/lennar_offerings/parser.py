from __future__ import annotations

import hashlib
import re
from typing import List, Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .schemas import Community, Listing, Plan


PRICE_PATTERN = re.compile(r"\$?([\d,]+)")
RANGE_PATTERN = re.compile(r"([\d,\.]+)\s*-\s*([\d,\.]+)")
NUM_PATTERN = re.compile(r"([\d,\.]+)")


def _to_number(text: Optional[str]) -> Optional[float]:
    if not text:
        return None
    match = PRICE_PATTERN.search(text)
    if not match:
        match = NUM_PATTERN.search(text)
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", ""))
    except ValueError:
        return None


def _parse_range(text: Optional[str]) -> tuple[Optional[float], Optional[float]]:
    if not text:
        return None, None
    clean = text.replace("$", "")
    match = RANGE_PATTERN.search(clean)
    if match:
        return _to_number(match.group(1)), _to_number(match.group(2))
    number = _to_number(clean)
    return number, number


def _hash_id(url: str) -> str:
    return hashlib.md5(url.encode("utf-8")).hexdigest()


def parse_community_tiles(html: str, base_url: str, market_label: str) -> List[Community]:
    soup = BeautifulSoup(html, "lxml")
    tiles = soup.select(".community-card, .community, .communities-list__item, .card")
    communities: List[Community] = []
    for tile in tiles:
        if tile.name == "a" and tile.has_attr("href"):
            anchor = tile
        else:
            anchor = tile.find("a", href=True)
        if not anchor:
            continue
        url = urljoin(base_url, anchor["href"])
        raw_text = anchor.get_text(" ", strip=True) or tile.get_text(" ", strip=True)
        name = raw_text
        if "price" in raw_text.lower():
            name = raw_text.split("Price")[0].strip()
        price_text = None
        size_text = None
        beds_text = None
        baths_text = None
        for text_node in tile.stripped_strings:
            lower = text_node.lower()
            has_digit = any(ch.isdigit() for ch in text_node)
            if (("price" in lower) or ("$" in text_node)) and has_digit:
                price_text = price_text or text_node
            if (("sq" in lower) or ("sf" in lower)) and has_digit:
                size_text = size_text or text_node
            if "bed" in lower and has_digit:
                beds_text = beds_text or text_node
            if "bath" in lower and has_digit:
                baths_text = baths_text or text_node
        price_min, price_max = _parse_range(price_text)
        sqft_min, sqft_max = _parse_range(size_text)
        beds_min, beds_max = _parse_range(beds_text)
        baths_min, baths_max = _parse_range(baths_text)
        communities.append(
            Community(
                community_id=_hash_id(url),
                source_system="lennar",
                name=name,
                builder_name="Lennar",
                market_label=market_label,
                city=None,
                state=None,
                url=url,
                price_min=price_min,
                price_max=price_max,
                sqft_min=sqft_min,
                sqft_max=sqft_max,
                beds_min=beds_min,
                beds_max=beds_max,
                baths_min=baths_min,
                baths_max=baths_max,
                product_types=[],
            )
        )
    return communities


def parse_community_detail(html: str, community: Community) -> Community:
    soup = BeautifulSoup(html, "lxml")
    city_state = soup.select_one(".city-state, .community-address, address")
    if city_state and not community.city:
        text = city_state.get_text(" ", strip=True)
        parts = text.split(",")
        if len(parts) >= 2:
            community.city = parts[0].strip()
            community.state = parts[1].strip()[:2]
    price_text = None
    size_text = None
    beds_text = None
    baths_text = None
    for selector in [".price-range", ".starting-price", ".price"]:
        node = soup.select_one(selector)
        if node:
            price_text = price_text or node.get_text(" ", strip=True)
    for selector in [".home-size", ".sqft", ".size"]:
        node = soup.select_one(selector)
        if node:
            size_text = size_text or node.get_text(" ", strip=True)
    for selector in [".beds", ".bedrooms"]:
        node = soup.select_one(selector)
        if node:
            beds_text = beds_text or node.get_text(" ", strip=True)
    for selector in [".baths", ".bathrooms"]:
        node = soup.select_one(selector)
        if node:
            baths_text = baths_text or node.get_text(" ", strip=True)
    price_min, price_max = _parse_range(price_text)
    sqft_min, sqft_max = _parse_range(size_text)
    beds_min, beds_max = _parse_range(beds_text)
    baths_min, baths_max = _parse_range(baths_text)
    community.price_min = community.price_min or price_min
    community.price_max = community.price_max or price_max
    community.sqft_min = community.sqft_min or sqft_min
    community.sqft_max = community.sqft_max or sqft_max
    community.beds_min = community.beds_min or beds_min
    community.beds_max = community.beds_max or beds_max
    community.baths_min = community.baths_min or baths_min
    community.baths_max = community.baths_max or baths_max
    return community


def parse_plan_list(html: str, community_id: str, base_url: str) -> List[Plan]:
    soup = BeautifulSoup(html, "lxml")
    plans: List[Plan] = []
    plan_cards = soup.select(".plan-card, .floorplan-card, .plan")
    for card in plan_cards:
        anchor = card.find("a", href=True)
        if not anchor:
            continue
        url = urljoin(base_url, anchor["href"])
        name = anchor.get_text(strip=True) or "Plan"
        price_text = None
        sqft_text = None
        beds_text = None
        baths_text = None
        garage_text = None
        for text_node in card.stripped_strings:
            lower = text_node.lower()
            if "price" in lower or "$" in text_node:
                price_text = price_text or text_node
            if "sq" in lower or "sf" in lower:
                sqft_text = sqft_text or text_node
            if "bed" in lower:
                beds_text = beds_text or text_node
            if "bath" in lower:
                baths_text = baths_text or text_node
            if "garage" in lower:
                garage_text = garage_text or text_node
        price_min, _ = _parse_range(price_text)
        sqft_min, sqft_max = _parse_range(sqft_text)
        beds_min, beds_max = _parse_range(beds_text)
        baths_min, baths_max = _parse_range(baths_text)
        plans.append(
            Plan(
                plan_id=_hash_id(url),
                community_id=community_id,
                name=name,
                series_name=None,
                product_type=None,
                beds_min=beds_min,
                baths_min=baths_min,
                garage_spaces=_to_number(garage_text),
                sqft_min=sqft_min,
                sqft_max=sqft_max,
                base_price=price_min,
                url=url,
            )
        )
    return plans


def parse_listing_list(html: str, community_id: str) -> List[Listing]:
    soup = BeautifulSoup(html, "lxml")
    listings: List[Listing] = []
    listing_cards = soup.select(".inventory-card, .spec-home, .available-home")
    for card in listing_cards:
        anchor = card.find("a", href=True)
        url = urljoin("", anchor["href"]) if anchor else ""
        address = card.select_one(".address")
        city = card.select_one(".city")
        price_text = card.select_one(".price")
        status = card.select_one(".status, .availability")
        sqft_text = card.select_one(".sqft")
        beds_text = card.select_one(".beds")
        baths_text = card.select_one(".baths")
        qmi_text = card.select_one(".move-in, .qmi-date")
        listings.append(
            Listing(
                listing_id=_hash_id(url or (address.get_text(strip=True) if address else "")),
                community_id=community_id,
                plan_id=None,
                address_line1=address.get_text(" ", strip=True) if address else None,
                city=city.get_text(" ", strip=True) if city else None,
                state=None,
                zip_code=None,
                status=status.get_text(" ", strip=True) if status else None,
                price_current=_to_number(price_text.get_text(" ", strip=True)) if price_text else None,
                sqft_actual=_to_number(sqft_text.get_text(" ", strip=True)) if sqft_text else None,
                beds_actual=_to_number(beds_text.get_text(" ", strip=True)) if beds_text else None,
                baths_actual=_to_number(baths_text.get_text(" ", strip=True)) if baths_text else None,
                quick_move_in_date=qmi_text.get_text(" ", strip=True) if qmi_text else None,
                url=url,
            )
        )
    return listings
