"""
Adapters for transforming property-type-specific data into cash flow arrays.

These adapters transform raw property data (units, leases, expenses, etc.) into
standardized cash flow arrays that can be consumed by the existing calculation
engine (IRR, NPV, waterfall, etc.).

Usage:
    from apps.calculations.adapters import MultifamilyCashFlowAdapter

    adapter = MultifamilyCashFlowAdapter(project_id=11)
    metrics = adapter.calculate_metrics()
"""

from .multifamily_adapter import (
    MultifamilyCashFlowAdapter,
    MultifamilyAssumptions,
    distribute_waterfall,
)

__all__ = [
    'MultifamilyCashFlowAdapter',
    'MultifamilyAssumptions',
    'distribute_waterfall',
]
