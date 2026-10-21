"""
Landscape Financial Calculation Engine

Production-grade CRE & Land Development financial calculations using
NumPy, Pandas, and SciPy for ARGUS-equivalent analytics.

Main modules (every one listed here exists and imports — a test checks):
- core.metrics: Investment return calculations (IRR, NPV, DSCR, etc.)
- core.cashflow: Cash flow projections with lease modeling
- core.leases: Lease escalations, recoveries, percentage rent
- waterfall: Multi-tier distribution waterfalls (engine, formulas, irr, runtime)

Not here: Monte Carlo and a sensitivity module were listed from 2025-10 to
2026-10-21 but never written (ARGUS parity re-audit 2026-10-21, #LS-1021-07).
Sensitivity on the product side is the what-if tooling in apps/landscaper.

Example usage:
    >>> from financial_engine.core.metrics import InvestmentMetrics
    >>> metrics = InvestmentMetrics()
    >>> irr = metrics.calculate_irr(
    ...     initial_investment=10_000_000,
    ...     cash_flows=[500_000, 500_000, 500_000],
    ...     reversion_value=11_000_000
    ... )
    >>> print(f"IRR: {irr:.2%}")
    IRR: 7.82%
"""

__version__ = "1.0.0"
__author__ = "Landscape AI Engineering Team"

from financial_engine.core.metrics import InvestmentMetrics
from financial_engine.core.cashflow import CashFlowEngine

__all__ = [
    "InvestmentMetrics",
    "CashFlowEngine",
    "__version__",
]
