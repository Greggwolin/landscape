"""
XIRR Calculation Module

Calculates Internal Rate of Return for irregular cash flows (XIRR).
Uses scipy's optimize module for root finding - same approach as Excel's XIRR.

Reference: Excel XIRR formula solves for r in:
    Sum of PV = 0
    where PV = CF / (1 + r)^(days/365)
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple
import numpy as np
from scipy import optimize
from loguru import logger


# ============================================================================
# XIRR CALCULATION
# ============================================================================

def calculate_xirr(
    dates: List[date],
    cash_flows: List[Decimal],
    guess: float = 0.10,
    max_iterations: int = 1000,
) -> Optional[Decimal]:
    """Calculate XIRR (Internal Rate of Return for irregular periods).

    Uses scipy.optimize.brentq for robust root finding.
    Falls back to newton method if brentq fails.

    Excel's XIRR solves for r where:
        NPV = Sum(CF_i / (1 + r)^(days_i/365)) = 0

    Args:
        dates: List of dates for each cash flow
        cash_flows: List of cash flow amounts (negative = outflow, positive = inflow)
        guess: Initial guess for IRR (default 0.10 = 10%)
        max_iterations: Maximum iterations for solver

    Returns:
        Annualized IRR as Decimal, or None if calculation fails

    Example:
        >>> dates = [date(2024, 1, 1), date(2024, 12, 31), date(2025, 12, 31)]
        >>> flows = [Decimal('-10000000'), Decimal('500000'), Decimal('12000000')]
        >>> xirr = calculate_xirr(dates, flows)
        >>> print(f"{float(xirr):.2%}")
        12.47%
    """
    if len(dates) != len(cash_flows):
        raise ValueError("Dates and cash_flows must have same length")

    if len(dates) < 2:
        raise ValueError("Need at least 2 cash flows to calculate XIRR")

    # Convert to numpy arrays for performance
    cf_array = np.array([float(cf) for cf in cash_flows], dtype=np.float64)

    # Calculate days from first date for each cash flow
    first_date = dates[0]
    days_array = np.array(
        [(d - first_date).days for d in dates],
        dtype=np.float64
    )

    # Check for valid cash flow structure (must have both positive and negative)
    has_negative = np.any(cf_array < 0)
    has_positive = np.any(cf_array > 0)

    if not (has_negative and has_positive):
        logger.warning("XIRR requires both positive and negative cash flows")
        return None

    def npv_at_rate(rate: float) -> float:
        """Calculate NPV at a given rate."""
        if rate <= -1:  # Prevent division issues
            return float('inf')
        return np.sum(cf_array / np.power(1.0 + rate, days_array / 365.0))

    try:
        # Try brentq method first (more robust)
        # Search between -99% and +1000% IRR
        result = optimize.brentq(
            npv_at_rate,
            -0.99,
            10.0,
            maxiter=max_iterations,
        )
        logger.debug(f"XIRR calculated using brentq: {result:.4%}")
        return Decimal(str(round(result, 8)))

    except ValueError:
        # Brentq failed (no sign change in interval), try newton
        logger.debug("Brentq failed, trying newton method")

        try:
            result = optimize.newton(
                npv_at_rate,
                guess,
                maxiter=max_iterations,
            )

            # Validate result is reasonable
            if -1 < result < 10:
                logger.debug(f"XIRR calculated using newton: {result:.4%}")
                return Decimal(str(round(result, 8)))
            else:
                logger.warning(f"XIRR result out of bounds: {result}")
                return None

        except RuntimeError as e:
            logger.warning(f"Newton method failed: {e}")
            return None

    except Exception as e:
        logger.error(f"XIRR calculation failed: {e}")
        return None


def calculate_xirr_safe(
    dates: List[date],
    cash_flows: List[Decimal],
) -> Tuple[Optional[Decimal], str]:
    """Safe wrapper for XIRR calculation with detailed error info.

    Args:
        dates: List of dates for each cash flow
        cash_flows: List of cash flow amounts

    Returns:
        Tuple of (irr_result, status_message)

    Example:
        >>> irr, msg = calculate_xirr_safe(dates, flows)
        >>> if irr is not None:
        ...     print(f"IRR: {float(irr):.2%}")
        ... else:
        ...     print(f"Calculation failed: {msg}")
    """
    if len(dates) < 2:
        return None, "Insufficient cash flows (need at least 2)"

    if len(dates) != len(cash_flows):
        return None, f"Length mismatch: {len(dates)} dates vs {len(cash_flows)} flows"

    # Check for valid structure
    has_negative = any(cf < 0 for cf in cash_flows)
    has_positive = any(cf > 0 for cf in cash_flows)

    if not has_negative:
        return None, "No outflows (negative cash flows) - cannot calculate IRR"

    if not has_positive:
        return None, "No inflows (positive cash flows) - cannot calculate IRR"

    try:
        result = calculate_xirr(dates, cash_flows)
        if result is not None:
            return result, "Success"
        else:
            return None, "Solver did not converge"
    except Exception as e:
        return None, f"Calculation error: {str(e)}"


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def calculate_npv(
    rate: Decimal,
    dates: List[date],
    cash_flows: List[Decimal],
) -> Decimal:
    """Calculate NPV at a given discount rate.

    Args:
        rate: Discount rate as decimal (e.g., 0.10 for 10%)
        dates: List of dates for each cash flow
        cash_flows: List of cash flow amounts

    Returns:
        Net Present Value

    Example:
        >>> npv = calculate_npv(Decimal('0.10'), dates, flows)
    """
    if len(dates) != len(cash_flows):
        raise ValueError("Dates and cash_flows must have same length")

    first_date = dates[0]
    rate_float = float(rate)

    total_pv = Decimal('0')
    for d, cf in zip(dates, cash_flows):
        days = (d - first_date).days
        discount_factor = (1.0 + rate_float) ** (days / 365.0)
        pv = float(cf) / discount_factor
        total_pv += Decimal(str(pv))

    return total_pv.quantize(Decimal('0.01'))


def estimate_irr_range(
    dates: List[date],
    cash_flows: List[Decimal],
) -> Tuple[float, float]:
    """Estimate reasonable IRR search range based on cash flows.

    Useful for providing better initial guesses to the solver.

    Args:
        dates: List of dates
        cash_flows: List of cash flows

    Returns:
        Tuple of (min_estimate, max_estimate)
    """
    # Calculate simple metrics
    total_out = sum(float(cf) for cf in cash_flows if cf < 0)
    total_in = sum(float(cf) for cf in cash_flows if cf > 0)

    if total_out == 0:
        return (-0.5, 2.0)

    # Simple money multiple
    money_multiple = -total_in / total_out

    # Time span in years
    first_date = min(dates)
    last_date = max(dates)
    years = max((last_date - first_date).days / 365.0, 0.5)

    # Rough IRR approximation: (MM^(1/years)) - 1
    if money_multiple > 0:
        rough_irr = money_multiple ** (1.0 / years) - 1
        # Provide a range around this estimate
        return (max(rough_irr - 0.5, -0.9), min(rough_irr + 0.5, 5.0))

    return (-0.5, 2.0)
