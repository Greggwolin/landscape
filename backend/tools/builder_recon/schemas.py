from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class FieldCoverage:
    has_price_range: bool = False
    has_sqft_range: bool = False
    has_bed_bath_range: bool = False
    has_hoa_or_fees: bool = False
    has_location_data: bool = False
    other_fields: List[str] = field(default_factory=list)


@dataclass
class PlanCoverage:
    accessible: bool = False
    has_price: bool = False
    has_sqft: bool = False
    has_beds_baths: bool = False


@dataclass
class ListingCoverage:
    accessible: bool = False
    has_price: bool = False
    has_status: bool = False
    has_qmi_date: bool = False


@dataclass
class BuilderRecon:
    rank: int
    builder_name: str
    canonical_domain: str
    scraper_status: str
    legal_assessment: Dict[str, Any]
    field_coverage: Dict[str, Any]
    crawl_stats: Dict[str, Any]
    notes: str = ""


@dataclass
class ReconReport:
    market: str
    generated_at: str
    source_matrix: str
    recon_config: Dict[str, Any]
    builders: List[BuilderRecon]
    intersection_dataset: Dict[str, Any]
