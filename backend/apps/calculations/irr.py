"""The IRR of a cash flow, taken as an investment's rate of return.

numpy-financial's ``irr`` solves a polynomial and returns whichever root lies
closest to zero. For a cash flow that changes sign once — money out, then money
back — there is only one root and that is the answer. When a flow changes sign
more than once (a levered land deal: equity in, sales out, then debt service and
a balloon after the sales slow), the polynomial has several roots and the one
nearest zero can be meaningless: Peoria's levered case (2026-09-29) returned
-51% when the unlevered return was +52% on 6% debt, which cannot be.

The rate of return of an investment is the rate at which its NPV turns from
positive to negative as the rate rises. This takes that root: the first such
crossing at or above zero when the undiscounted total is positive (a gain), the
last one below zero when it is negative (a loss). A single-sign-change flow
returns exactly what numpy-financial returns.
"""

from __future__ import annotations

import math
from typing import Iterable, List

import numpy_financial as npf


def _npv(rate: float, flows: List[float]) -> float:
    base = 1.0 + rate
    total = 0.0
    factor = 1.0
    for cf in flows:
        total += cf / factor
        factor *= base
    return total


def _sign_changes(flows: List[float]) -> int:
    signs = [1 if cf > 0 else -1 for cf in flows if abs(cf) > 1e-9]
    return sum(1 for a, b in zip(signs, signs[1:]) if a != b)


def investment_irr(cash_flows: Iterable[float]) -> float:
    """Drop-in for ``npf.irr``: returns NaN when no rate exists, as it does."""
    flows = [float(cf or 0.0) for cf in cash_flows]
    if len(flows) < 2:
        return float('nan')
    changes = _sign_changes(flows)
    if changes == 0:
        return float('nan')
    if changes == 1:
        r = npf.irr(flows)
        return float('nan') if r is None else float(r)

    # Several sign changes: scan for NPV crossings from positive to negative.
    grid: List[float] = [-0.99 + i * 0.005 for i in range(int((0.99) / 0.005))]  # -0.99 .. ~0
    grid += [i * 0.005 for i in range(0, 400)]          # 0 .. 2.0 in half-points
    grid += [2.0 + i * 0.05 for i in range(1, 400)]     # 2 .. 22
    crossings: List[float] = []
    prev_r, prev_v = grid[0], _npv(grid[0], flows)
    for r in grid[1:]:
        v = _npv(r, flows)
        if prev_v > 0 and v <= 0:
            lo, hi = prev_r, r
            for _ in range(100):
                mid = (lo + hi) / 2
                if _npv(mid, flows) > 0:
                    lo = mid
                else:
                    hi = mid
            crossings.append((lo + hi) / 2)
        prev_r, prev_v = r, v

    total = sum(flows)
    if total >= 0:
        above = [c for c in crossings if c >= 0]
        if above:
            return float(min(above))
    else:
        below = [c for c in crossings if c < 0]
        if below:
            return float(max(below))
    r = npf.irr(flows)
    return float('nan') if r is None else float(r)
