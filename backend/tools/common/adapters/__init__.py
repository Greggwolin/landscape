"""Adapters for transforming source-specific schemas to unified models.

Each adapter module provides pure transformation functions that convert
source-specific dataclasses (e.g., Lennar Community, Plan, Listing) into
the canonical unified models defined in backend.tools.common.models.

These adapters are stateless and side-effect-free. They do not perform
HTTP requests, database writes, or geocoding. Those concerns are handled
by the ingestion and persistence layers.
"""

from .lennar_adapter import (
    to_unified_communities,
    to_unified_plans,
    to_unified_inventory,
)
from .meritage_adapter import (
    to_unified_communities as meritage_to_unified_communities,
    to_unified_community as meritage_to_unified_community,
)
from .redfin_adapter import (
    to_unified_resale_closing,
    to_unified_resale_closings,
)

__all__ = [
    "to_unified_communities",
    "to_unified_plans",
    "to_unified_inventory",
    "meritage_to_unified_community",
    "meritage_to_unified_communities",
    "to_unified_resale_closing",
    "to_unified_resale_closings",
]
