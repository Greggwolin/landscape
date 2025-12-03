from __future__ import annotations

from typing import Dict, List

from .schemas import BuilderRecon


COMMUNITY_FIELDS = [
    "has_price_range",
    "has_sqft_range",
    "has_bed_bath_range",
    "has_hoa_or_fees",
    "has_location_data",
]


def intersection_dataset(builders: List[BuilderRecon], threshold: float = 0.75) -> Dict[str, List[str]]:
    n = max(len(builders), 1)
    community_common = []
    for field in COMMUNITY_FIELDS:
        count = sum(1 for b in builders if b.field_coverage["community"].get(field))
        if count / n >= threshold:
            community_common.append(_field_name_to_schema(field))
    # Plan/listing mostly empty until further recon
    return {
        "community_fields_common": community_common,
        "plan_fields_common": [],
        "listing_fields_common": [],
    }


def _field_name_to_schema(field: str) -> str:
    mapping = {
        "has_price_range": "price_min/price_max",
        "has_sqft_range": "sqft_min/sqft_max",
        "has_bed_bath_range": "beds_min/beds_max",
        "has_hoa_or_fees": "hoa_monthly",
        "has_location_data": "city/state",
    }
    return mapping.get(field, field)
