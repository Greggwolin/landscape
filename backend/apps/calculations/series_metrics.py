"""
Signed-cash-flow-series metrics — the canonical implementation for this app.

WHY THIS MODULE EXISTS
----------------------
There are two incompatible cash-flow SHAPES in this codebase, and conflating
them is what produced the LSCMD-IRRWIRE-0714-TB defect:

  Shape A — "decomposed" (what financial_engine.core.metrics.InvestmentMetrics
            expects):
                calculate_irr(initial_investment, cash_flows, reversion_value)
            The engine builds `[-initial_investment] + cash_flows` internally
            and folds `reversion_value` into the final period. The caller must
            hand over three SEPARATE pieces.

  Shape B — "signed series" (what apps.calculations.converters produces):
                [-8_000_000, 250_000, 250_000, ..., 11_250_000]
            `prepare_irr_calculation_data()` nets inflows against outflows per
            period and returns ONE already-signed array. Period 0 is already
            negative. Reversion is already folded into the last period and is
            NOT separable after the fact.

Shape B cannot be losslessly decomposed back into Shape A — once the periods
are netted you cannot recover which portion of the final period was reversion
versus operating cash flow. So a Shape-B series must NOT be forced through the
Shape-A engine signature. It gets numpy-financial applied directly, which is
exactly what these helpers do.

These functions were previously duplicated as private helpers inside
apps/calculations/views.py. They live here now so the service layer and the
view layer share one implementation instead of two.

numpy_financial is imported lazily inside each function, on purpose: callers
catch ImportError to degrade to HTTP 503 rather than 500 when the optional
engine dependency is absent. Do not hoist these imports to module scope.
"""

import math
from typing import List, Optional


def irr_from_series(cash_flows: List[float]) -> Optional[float]:
    """IRR of an already-signed cash-flow series (period 0 first).

    Args:
        cash_flows: Signed series. Outflows negative, inflows positive.
                    Must contain at least one of each or no IRR exists.

    Returns:
        IRR as a decimal (0.0782 == 7.82%), or None when no real solution
        exists (numpy-financial returns NaN).

    Raises:
        ImportError: when numpy-financial is unavailable, so callers can
                     degrade to 503 rather than 500.
    """
    import numpy_financial as npf

    irr = npf.irr(cash_flows)
    if irr is None:
        return None
    irr = float(irr)
    return None if math.isnan(irr) else irr


def npv_from_series(discount_rate: float, cash_flows: List[float]) -> float:
    """NPV of an already-signed cash-flow series at a period-0-anchored rate.

    Args:
        discount_rate: Periodic discount rate as a decimal (0.10 == 10%).
        cash_flows: Signed series, period 0 first.

    Returns:
        NPV in the same currency units as the input series.

    Raises:
        ImportError: when numpy-financial is unavailable, so callers can
                     degrade to 503 rather than 500.
    """
    import numpy_financial as npf

    return float(npf.npv(discount_rate, cash_flows))
