"""Adapter for transforming Redfin comps to unified resale closing models.

This module provides pure transformation functions that convert Redfin CSV
data (RedfinComp) into the canonical UnifiedResaleClosing model.
"""

from __future__ import annotations

from typing import Iterable, List, Optional

from ..models import UnifiedResaleClosing
from ...redfin_ingest.schemas import RedfinComp


SOURCE_REDFIN = "redfin"


def to_unified_resale_closing(
    comp: RedfinComp,
    property_type: Optional[str] = None,
) -> UnifiedResaleClosing:
    """Transform a single RedfinComp to UnifiedResaleClosing.

    Args:
        comp: Raw Redfin comp from CSV.
        property_type: Optional property type override (e.g., 'house', 'condo').

    Returns:
        UnifiedResaleClosing instance.
    """
    return UnifiedResaleClosing(
        source=SOURCE_REDFIN,
        source_id=comp.mls_id,
        sale_price=comp.price,
        sale_date=comp.sold_date.split("T")[0] if comp.sold_date else "",  # ISO date only
        address_line1=comp.address or None,
        city=comp.city or None,
        state=comp.state or None,
        zip_code=comp.zip_code or None,
        lat=comp.latitude,
        lng=comp.longitude,
        property_type=property_type,
        list_price=None,  # Not available in CSV
        list_date=None,  # Not available in CSV
        days_on_market=None,  # Not reliably available
        sqft=comp.sqft,
        lot_sqft=comp.lot_size,
        price_per_sqft=comp.price_per_sqft,
        year_built=comp.year_built,
        beds=comp.beds,
        baths=comp.baths,
        builder_name=None,  # Not available
        subdivision_name=None,  # Not available
        source_url=comp.url,
        distance_miles=comp.distance_miles,  # Runtime only, not persisted
    )


def to_unified_resale_closings(
    comps: Iterable[RedfinComp],
    property_type: Optional[str] = None,
) -> List[UnifiedResaleClosing]:
    """Transform multiple RedfinComps to UnifiedResaleClosing list.

    Args:
        comps: Iterable of raw Redfin comps.
        property_type: Optional property type to apply to all records.

    Returns:
        List of UnifiedResaleClosing instances.
    """
    return [to_unified_resale_closing(c, property_type) for c in comps]
