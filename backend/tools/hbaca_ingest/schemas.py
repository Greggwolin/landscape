"""Data models for HBACA permit ingestion."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class MarketActivityRecord:
    """A single market activity data point (e.g., monthly permit count for a jurisdiction).

    This is the canonical model for market activity data from any source.
    Designed to be flexible across MSAs, data sources, metric types, and geographies.
    """

    msa_code: str               # MSA code (e.g., '38060' for Phoenix)
    source: str                 # Data source (e.g., 'HBACA', 'Census', 'MLS')
    metric_type: str            # Metric type (e.g., 'permits', 'closings', 'starts')
    geography_type: str         # Geography granularity (e.g., 'jurisdiction', 'county', 'msa')
    geography_name: str         # Geography name (e.g., 'Buckeye', 'Maricopa County')
    period_type: str            # Period cadence (e.g., 'monthly', 'quarterly', 'annual')
    period_end_date: date       # End of period (e.g., 2025-01-31 for Jan 2025)
    value: int                  # The metric value (e.g., permit count)
    notes: Optional[str] = None # Optional context or notes

    def __post_init__(self):
        """Validate record fields."""
        if self.value < 0:
            raise ValueError(f"value must be non-negative, got {self.value}")
        if not self.msa_code:
            raise ValueError("msa_code is required")
        if not self.geography_name:
            raise ValueError("geography_name is required")


# Known HBACA jurisdictions for Phoenix MSA (for reference/validation)
PHX_HBACA_JURISDICTIONS = [
    'Apache Junction',
    'Avondale',
    'Buckeye',
    'Casa Grande',
    'Chandler',
    'Coolidge',
    'El Mirage',
    'Florence',
    'Gilbert',
    'Glendale',
    'Goodyear',
    'Maricopa',       # Note: normalized from "Maricopa*" in source files
    'Maricopa County',
    'Mesa',
    'Paradise Valley',
    'Peoria',
    'Phoenix',
    'Pinal County',
    'Queen Creek',
    'Scottsdale',
    'Surprise',
    'Tempe',
]
