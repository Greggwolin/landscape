from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Community:
    community_id: str
    source_system: str
    name: str
    builder_name: str
    market_label: str
    city: Optional[str]
    state: Optional[str]
    url: str
    price_min: Optional[float]
    price_max: Optional[float]
    sqft_min: Optional[float]
    sqft_max: Optional[float]
    beds_min: Optional[float]
    beds_max: Optional[float]
    baths_min: Optional[float]
    baths_max: Optional[float]
    product_types: List[str] = field(default_factory=list)
    first_seen_at: str = field(default_factory=_now_iso)
    last_seen_at: str = field(default_factory=_now_iso)


@dataclass
class Plan:
    plan_id: str
    community_id: str
    name: str
    series_name: Optional[str]
    product_type: Optional[str]
    beds_min: Optional[float]
    baths_min: Optional[float]
    garage_spaces: Optional[float]
    sqft_min: Optional[float]
    sqft_max: Optional[float]
    base_price: Optional[float]
    url: str


@dataclass
class Listing:
    listing_id: str
    community_id: Optional[str]
    plan_id: Optional[str]
    address_line1: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    status: Optional[str]
    price_current: Optional[float]
    sqft_actual: Optional[float]
    beds_actual: Optional[float]
    baths_actual: Optional[float]
    quick_move_in_date: Optional[str]
    url: str
