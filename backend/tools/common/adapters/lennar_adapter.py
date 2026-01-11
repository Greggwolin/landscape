"""Adapter for transforming Lennar schemas to unified models.

This module provides pure transformation functions that map Lennar's
internal dataclasses (Community, Plan, Listing) to the canonical
UnifiedCommunityBenchmark, UnifiedPlanBenchmark, and UnifiedInventoryListing
models.

Field Mapping Reference (from docs/architecture/ingestion_builder_redfin_v1.md):

Lennar Community → UnifiedCommunityBenchmark:
    community_id     → source_id
    source_system    → (ignored, we hardcode 'lennar')
    name             → community_name
    builder_name     → builder_name
    market_label     → market_label
    city             → city
    state            → state
    url              → source_url
    price_min/max    → price_min/max (cast to int)
    sqft_min/max     → sqft_min/max (cast to int)
    beds_min/max     → beds_min/max (cast to int)
    baths_min/max    → baths_min/max (direct)
    product_types    → product_types (direct)
    first_seen_at    → first_seen_at (parse ISO)
    last_seen_at     → last_seen_at (parse ISO)
    —                → lat, lng, zip_code, hoa_monthly = None

Lennar Plan → UnifiedPlanBenchmark:
    plan_id          → source_id
    community_id     → community_source_id
    name             → plan_name
    series_name      → series_name
    product_type     → product_type
    base_price       → base_price (cast to int)
    sqft_min/max     → sqft_min/max (cast to int)
    beds_min         → beds_min (cast to int)
    baths_min        → baths_min (direct)
    garage_spaces    → garage_spaces (cast to int)
    url              → source_url
    —                → source = 'lennar'
    —                → beds_max, baths_max, stories = None

Lennar Listing → UnifiedInventoryListing:
    listing_id       → source_id
    community_id     → community_source_id
    plan_id          → plan_source_id
    address_line1    → address_line1
    city             → city
    state            → state
    zip_code         → zip_code
    status           → status
    price_current    → price_current (cast to int)
    sqft_actual      → sqft_actual (cast to int)
    beds_actual      → beds_actual (cast to int)
    baths_actual     → baths_actual (direct)
    quick_move_in_date → move_in_date
    url              → source_url
    —                → source = 'lennar'
    —                → lat, lng, price_original, lot_sqft = None
"""

from __future__ import annotations

from datetime import datetime
from typing import Iterable, List, Optional

from backend.tools.lennar_offerings.schemas import Community, Plan, Listing
from backend.tools.common.models import (
    UnifiedCommunityBenchmark,
    UnifiedPlanBenchmark,
    UnifiedInventoryListing,
)


SOURCE_LENNAR = "lennar"


def _safe_int(value: Optional[float]) -> Optional[int]:
    """Safely convert a float to int, returning None if input is None."""
    if value is None:
        return None
    return int(value)


def _parse_iso_datetime(iso_str: Optional[str]) -> Optional[datetime]:
    """Parse an ISO 8601 datetime string to a datetime object.

    Returns None if the string is None or malformed.
    """
    if not iso_str:
        return None
    try:
        # Handle both 'Z' suffix and '+00:00' timezone formats
        if iso_str.endswith("Z"):
            iso_str = iso_str[:-1] + "+00:00"
        return datetime.fromisoformat(iso_str)
    except (ValueError, TypeError):
        return None


def to_unified_community(
    community: Community,
    market_label_override: Optional[str] = None,
) -> UnifiedCommunityBenchmark:
    """Transform a single Lennar Community to UnifiedCommunityBenchmark.

    Args:
        community: Lennar Community dataclass instance.
        market_label_override: Optional override for market_label. If provided,
            this takes precedence over community.market_label.

    Returns:
        UnifiedCommunityBenchmark with mapped fields.
    """
    return UnifiedCommunityBenchmark(
        # Identity
        source=SOURCE_LENNAR,
        source_id=community.community_id,

        # Builder & Community
        builder_name=community.builder_name,
        community_name=community.name,
        market_label=market_label_override or community.market_label,

        # Location (lat/lng/zip not available from Lennar)
        city=community.city,
        state=community.state,
        zip_code=None,
        lat=None,
        lng=None,

        # Pricing
        price_min=_safe_int(community.price_min),
        price_max=_safe_int(community.price_max),

        # Size
        sqft_min=_safe_int(community.sqft_min),
        sqft_max=_safe_int(community.sqft_max),
        beds_min=_safe_int(community.beds_min),
        beds_max=_safe_int(community.beds_max),
        baths_min=community.baths_min,
        baths_max=community.baths_max,

        # Fees (not available from Lennar)
        hoa_monthly=None,

        # Metadata
        product_types=list(community.product_types) if community.product_types else [],
        plan_count=None,  # Could be populated from related plans count
        inventory_count=None,  # Could be populated from related listings count
        source_url=community.url,

        # Timestamps
        first_seen_at=_parse_iso_datetime(community.first_seen_at),
        last_seen_at=_parse_iso_datetime(community.last_seen_at),
    )


def to_unified_communities(
    communities: Iterable[Community],
    market_label: Optional[str] = None,
) -> List[UnifiedCommunityBenchmark]:
    """Transform multiple Lennar Community objects to UnifiedCommunityBenchmark.

    Args:
        communities: Iterable of Lennar Community dataclass instances.
        market_label: Optional market label to apply to all communities.
            If provided, overrides each community's market_label.

    Returns:
        List of UnifiedCommunityBenchmark with mapped fields.
    """
    return [
        to_unified_community(c, market_label_override=market_label)
        for c in communities
    ]


def to_unified_plan(plan: Plan) -> UnifiedPlanBenchmark:
    """Transform a single Lennar Plan to UnifiedPlanBenchmark.

    Args:
        plan: Lennar Plan dataclass instance.

    Returns:
        UnifiedPlanBenchmark with mapped fields.
    """
    return UnifiedPlanBenchmark(
        # Identity
        source=SOURCE_LENNAR,
        source_id=plan.plan_id,
        community_source_id=plan.community_id,

        # Plan details
        plan_name=plan.name,
        series_name=plan.series_name,
        product_type=plan.product_type,

        # Pricing
        base_price=_safe_int(plan.base_price),

        # Size
        sqft_min=_safe_int(plan.sqft_min),
        sqft_max=_safe_int(plan.sqft_max),
        beds_min=_safe_int(plan.beds_min),
        beds_max=None,  # Not available from Lennar Plan schema
        baths_min=plan.baths_min,
        baths_max=None,  # Not available from Lennar Plan schema

        # Physical
        garage_spaces=_safe_int(plan.garage_spaces),
        stories=None,  # Not available from Lennar Plan schema

        # Metadata
        source_url=plan.url,
        first_seen_at=None,  # Not tracked at plan level in Lennar
        last_seen_at=None,   # Not tracked at plan level in Lennar
    )


def to_unified_plans(plans: Iterable[Plan]) -> List[UnifiedPlanBenchmark]:
    """Transform multiple Lennar Plan objects to UnifiedPlanBenchmark.

    Args:
        plans: Iterable of Lennar Plan dataclass instances.

    Returns:
        List of UnifiedPlanBenchmark with mapped fields.
    """
    return [to_unified_plan(p) for p in plans]


def to_unified_listing(listing: Listing) -> UnifiedInventoryListing:
    """Transform a single Lennar Listing to UnifiedInventoryListing.

    Args:
        listing: Lennar Listing dataclass instance.

    Returns:
        UnifiedInventoryListing with mapped fields.
    """
    return UnifiedInventoryListing(
        # Identity
        source=SOURCE_LENNAR,
        source_id=listing.listing_id,

        # Relationships
        community_source_id=listing.community_id,
        plan_source_id=listing.plan_id,

        # Location (lat/lng not available from Lennar)
        address_line1=listing.address_line1,
        city=listing.city,
        state=listing.state,
        zip_code=listing.zip_code,
        lat=None,
        lng=None,

        # Status & Pricing
        status=listing.status,
        price_current=_safe_int(listing.price_current),
        price_original=None,  # Not available from Lennar Listing schema

        # Physical
        sqft_actual=_safe_int(listing.sqft_actual),
        beds_actual=_safe_int(listing.beds_actual),
        baths_actual=listing.baths_actual,
        lot_sqft=None,  # Not available from Lennar Listing schema

        # Dates
        move_in_date=listing.quick_move_in_date,

        # Metadata
        source_url=listing.url,
        first_seen_at=None,  # Not tracked at listing level in Lennar
        last_seen_at=None,   # Not tracked at listing level in Lennar
    )


def to_unified_inventory(listings: Iterable[Listing]) -> List[UnifiedInventoryListing]:
    """Transform multiple Lennar Listing objects to UnifiedInventoryListing.

    Args:
        listings: Iterable of Lennar Listing dataclass instances.

    Returns:
        List of UnifiedInventoryListing with mapped fields.
    """
    return [to_unified_listing(l) for l in listings]
