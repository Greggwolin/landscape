"""Unified data models for builder and resale data ingestion.

These models serve as the canonical representation of market data from all sources
(Lennar, NHS, Redfin, future Zonda/MLS feeds). Source-specific adapters transform
raw data into these unified models before persistence.

Design Principles:
- Source-agnostic: All sources normalize to the same field names and types
- Graceful degradation: Optional fields default to None
- Audit-ready: Every record tracks source, source_id, and timestamps
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


@dataclass
class UnifiedCommunityBenchmark:
    """Canonical community record for all builder sources.

    Represents a builder community/subdivision with aggregate pricing and
    product mix information. Used for benchmarking new home pricing at
    the community level.

    Attributes:
        source: Source system identifier ('lennar', 'nhs', 'taylor_morrison', etc.)
        source_id: Source-specific unique ID (MD5 of URL or native ID)
        builder_name: Canonical builder name
        community_name: Community/subdivision name
    """

    # Identity (required)
    source: str
    source_id: str

    # Builder & Community (required)
    builder_name: str
    community_name: str

    # Market context
    market_label: Optional[str] = None  # e.g., 'Phoenix, AZ'

    # Location
    city: Optional[str] = None
    state: Optional[str] = None  # 2-letter abbreviation
    zip_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    # Pricing ranges
    price_min: Optional[int] = None
    price_max: Optional[int] = None

    # Size ranges
    sqft_min: Optional[int] = None
    sqft_max: Optional[int] = None
    beds_min: Optional[int] = None
    beds_max: Optional[int] = None
    baths_min: Optional[float] = None
    baths_max: Optional[float] = None

    # Fees
    hoa_monthly: Optional[int] = None

    # Metadata
    product_types: List[str] = field(default_factory=list)  # e.g., ['SFD', 'TH']
    plan_count: Optional[int] = None
    inventory_count: Optional[int] = None
    source_url: Optional[str] = None

    # Timestamps
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None


@dataclass
class UnifiedPlanBenchmark:
    """Canonical plan record for floor plans within communities.

    Represents an individual floor plan/model offered by a builder,
    including base pricing and physical characteristics.

    Attributes:
        source: Source system identifier
        source_id: Source-specific unique plan ID
        community_source_id: Links to parent community's source_id
        plan_name: Name of the floor plan/model
    """

    # Identity (required)
    source: str
    source_id: str
    community_source_id: str  # FK to parent community

    # Plan details (required)
    plan_name: str

    # Plan classification
    series_name: Optional[str] = None
    product_type: Optional[str] = None  # 'SFD', 'TH', 'Condo'

    # Pricing
    base_price: Optional[int] = None

    # Size ranges
    sqft_min: Optional[int] = None
    sqft_max: Optional[int] = None
    beds_min: Optional[int] = None
    beds_max: Optional[int] = None
    baths_min: Optional[float] = None
    baths_max: Optional[float] = None

    # Physical
    garage_spaces: Optional[int] = None
    stories: Optional[int] = None

    # Metadata
    source_url: Optional[str] = None
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None


@dataclass
class UnifiedInventoryListing:
    """Canonical QMI/spec home record.

    Represents an individual quick-move-in or spec home available
    from a builder. These are built or under-construction homes
    with specific addresses and pricing.

    Attributes:
        source: Source system identifier
        source_id: Source-specific unique listing ID
    """

    # Identity (required)
    source: str
    source_id: str

    # Relationships (optional - may not always be known)
    community_source_id: Optional[str] = None
    plan_source_id: Optional[str] = None

    # Location
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    # Status & Pricing
    status: Optional[str] = None  # 'Available', 'Pending', 'Sold'
    price_current: Optional[int] = None
    price_original: Optional[int] = None

    # Physical characteristics
    sqft_actual: Optional[int] = None
    beds_actual: Optional[int] = None
    baths_actual: Optional[float] = None
    lot_sqft: Optional[int] = None

    # Dates
    move_in_date: Optional[str] = None  # ISO date or descriptive text

    # Metadata
    source_url: Optional[str] = None
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None


@dataclass
class UnifiedResaleClosing:
    """Canonical resale/closing record from Redfin or MLS.

    Represents a completed real estate transaction, used for
    comparable sales analysis in napkin mode pricing and
    finished lot value derivation.

    Note: sale_price and sale_date are required as they are
    essential for any closing record.

    Attributes:
        source: Source system ('redfin', 'mls', 'recorder')
        source_id: MLS# or source-specific unique ID
        sale_price: Closing/sale price (required)
        sale_date: Closing date in ISO format (required)
    """

    # Identity (required)
    source: str
    source_id: str

    # Transaction (required)
    sale_price: int
    sale_date: str  # ISO date format

    # Location
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    # Property details
    property_type: Optional[str] = None  # 'house', 'condo', 'townhouse'

    # Transaction details
    list_price: Optional[int] = None
    list_date: Optional[str] = None  # ISO date format
    days_on_market: Optional[int] = None

    # Physical characteristics
    sqft: Optional[int] = None
    lot_sqft: Optional[int] = None
    price_per_sqft: Optional[int] = None
    year_built: Optional[int] = None
    beds: Optional[int] = None
    baths: Optional[float] = None

    # Builder info (if detectable from listing)
    builder_name: Optional[str] = None
    subdivision_name: Optional[str] = None

    # Metadata
    source_url: Optional[str] = None

    # Runtime-only field (not persisted)
    distance_miles: Optional[float] = None
