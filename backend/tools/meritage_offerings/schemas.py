from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class MeritageCommunity:
    community_id: str
    builder_name: str
    name: str
    market_label: str
    city: Optional[str]
    state: Optional[str]
    url: str
    product_types: list[str]
    price_min: Optional[float]
    price_max: Optional[float]
    sqft_min: Optional[float]
    sqft_max: Optional[float]
    beds_min: Optional[float]
    beds_max: Optional[float]
    baths_min: Optional[float]
    baths_max: Optional[float]
    first_seen_at: Optional[str] = None
    last_seen_at: Optional[str] = None
