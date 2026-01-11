"""Data schemas for Zonda subdivision ingestion."""

from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class ZondaSubdivision:
    """Represents a single Zonda subdivision record."""

    msa_code: str
    project_name: str
    builder: Optional[str]
    mpc: Optional[str]
    property_type: Optional[str]
    style: Optional[str]
    lot_size_sf: Optional[int]
    lot_width: Optional[int]
    lot_depth: Optional[int]
    product_code: Optional[str]
    units_sold: Optional[int]
    units_remaining: Optional[int]
    size_min_sf: Optional[int]
    size_max_sf: Optional[int]
    size_avg_sf: Optional[int]
    price_min: Optional[float]
    price_max: Optional[float]
    price_avg: Optional[float]
    latitude: Optional[float]
    longitude: Optional[float]
    special_features: Optional[str]
    source_file: str
    source_date: date
