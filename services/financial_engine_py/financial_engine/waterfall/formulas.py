"""
Waterfall Calculation Formulas

Individual calculation functions matching Excel model WaterfallADVCRE.xlsx.
Uses Decimal for financial precision.

Excel Formula References:
- Accrual: =G93*((1+$C92)^((G46-F46)/365)-1)
- LP Contribution: =-MIN(0,G87*Equity_Share_LP)
- LP Distribution: =MIN(G93+G95, MAX(G87,0)*$I$15)
- GP Catch-Up: =IF(CU?, MAX(MIN(G87-G100, G102+G103+G104), 0), G97/$I$15*$H$15)
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Tuple

from financial_engine.waterfall.types import (
    HurdleMethod,
    ReturnOfCapital,
    WaterfallSettings,
    WaterfallTierConfig,
)


# ============================================================================
# CONSTANTS
# ============================================================================

DAYS_IN_YEAR = Decimal('365')
ZERO = Decimal('0')
ONE = Decimal('1')
HUNDRED = Decimal('100')


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def to_decimal(value) -> Decimal:
    """Convert any numeric value to Decimal."""
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def round_financial(value: Decimal, places: int = 2) -> Decimal:
    """Round to specified decimal places using banker's rounding."""
    return value.quantize(Decimal(10) ** -places, rounding=ROUND_HALF_UP)


# ============================================================================
# ACCRUAL FORMULAS
# ============================================================================

def days_between(start_date: date, end_date: date) -> Decimal:
    """Calculate days between two dates.

    Args:
        start_date: Start date
        end_date: End date

    Returns:
        Number of days as Decimal
    """
    delta = end_date - start_date
    return Decimal(str(delta.days))


def calculate_accrual(
    beginning_balance: Decimal,
    annual_rate: Decimal,
    current_date: date,
    prior_date: date,
) -> Decimal:
    """Calculate compound interest accrual between two dates.

    Excel Formula: =G93*((1+$C92)^((G46-F46)/365)-1)

    This uses daily compounding: balance × ((1 + rate)^(days/365) - 1)

    Args:
        beginning_balance: Capital account balance at start of period
        annual_rate: Annual rate as decimal (e.g., 0.08 for 8%)
        current_date: End of period date
        prior_date: Start of period date

    Returns:
        Accrued amount for the period

    Example:
        >>> calculate_accrual(Decimal('1000000'), Decimal('0.08'),
        ...                   date(2025, 2, 1), date(2025, 1, 1))
        Decimal('6575.34')  # ~31 days of 8% on $1M
    """
    if beginning_balance <= ZERO or annual_rate <= ZERO:
        return ZERO

    days = days_between(prior_date, current_date)
    if days <= ZERO:
        return ZERO

    # Compound interest formula: P × ((1 + r)^(t/365) - 1)
    exponent = days / DAYS_IN_YEAR
    growth_factor = (ONE + annual_rate) ** exponent
    accrual = beginning_balance * (growth_factor - ONE)

    return round_financial(accrual)


# ============================================================================
# CONTRIBUTION ALLOCATION
# ============================================================================

def allocate_contribution(
    net_cash_flow: Decimal,
    lp_ownership: Decimal,
) -> Tuple[Decimal, Decimal]:
    """Split negative cash flows (contributions) by ownership percentage.

    Excel Formula: =-MIN(0,G87*Equity_Share_LP)

    Args:
        net_cash_flow: Period cash flow (negative = contribution)
        lp_ownership: LP ownership as decimal (e.g., 0.90 for 90%)

    Returns:
        Tuple of (lp_contribution, gp_contribution) as positive values

    Example:
        >>> allocate_contribution(Decimal('-1000000'), Decimal('0.90'))
        (Decimal('900000'), Decimal('100000'))
    """
    if net_cash_flow >= ZERO:
        return (ZERO, ZERO)

    total_contribution = -net_cash_flow  # Make positive
    lp_contribution = round_financial(total_contribution * lp_ownership)
    gp_contribution = round_financial(total_contribution * (ONE - lp_ownership))

    return (lp_contribution, gp_contribution)


# ============================================================================
# SPLIT CALCULATION
# ============================================================================

def calculate_splits(
    lp_ownership: Decimal,
    promote_percent: Decimal,
) -> Tuple[Decimal, Decimal]:
    """Calculate LP/GP split percentages based on ownership and promote.

    Formula: GP_Split = 1 - (LP_Ownership × (1 - Promote))

    Example: 90% LP ownership, 20% promote
    GP_Split = 1 - (0.90 × 0.80) = 0.28
    LP_Split = 0.72

    Args:
        lp_ownership: LP ownership as decimal (e.g., 0.90)
        promote_percent: Promote percentage as decimal (e.g., 0.20)

    Returns:
        Tuple of (lp_split, gp_split) as decimals

    Example:
        >>> calculate_splits(Decimal('0.90'), Decimal('0.20'))
        (Decimal('0.72'), Decimal('0.28'))
    """
    gp_split = ONE - (lp_ownership * (ONE - promote_percent))
    lp_split = ONE - gp_split
    return (round_financial(lp_split, 6), round_financial(gp_split, 6))


# ============================================================================
# TIER 1: PREFERRED RETURN + RETURN OF CAPITAL
# ============================================================================

@dataclass
class Tier1Input:
    """Inputs for Tier 1 distribution calculation."""
    cash_available: Decimal
    lp_capital_account: Decimal  # What LP is owed (capital + accrued pref)
    gp_capital_account: Decimal  # What GP is owed (capital + accrued pref)
    lp_split_pct: Decimal        # As decimal (e.g., 0.90)
    gp_split_pct: Decimal        # As decimal (e.g., 0.10)
    gp_catch_up: bool
    return_of_capital: ReturnOfCapital


@dataclass
class TierDistResult:
    """Result of tier distribution calculation."""
    lp_dist: Decimal
    gp_dist: Decimal
    remaining: Decimal


def calculate_tier1_distribution(input: Tier1Input) -> TierDistResult:
    """Calculate Tier 1 distribution (Preferred Return + Return of Capital).

    Excel Formulas:
    - LP Distribution: =MIN(G93+G95, MAX(G87,0)*$I$15)
    - GP Distribution (Catch-Up): =IF(CU?, MAX(MIN(G87-G100, G102+G103+G104), 0), G97/$I$15*$H$15)

    Args:
        input: Tier 1 calculation inputs

    Returns:
        TierDistResult with LP/GP distributions and remaining cash
    """
    if input.cash_available <= ZERO:
        return TierDistResult(lp_dist=ZERO, gp_dist=ZERO, remaining=ZERO)

    lp_dist = ZERO
    gp_dist = ZERO
    remaining = input.cash_available

    if input.return_of_capital == ReturnOfCapital.LP_FIRST:
        # LP gets paid first up to their full capital account
        lp_dist = min(input.lp_capital_account, remaining)
        remaining -= lp_dist

        # Then GP gets their share
        gp_dist = min(input.gp_capital_account, remaining)
        remaining -= gp_dist

    else:  # Pari Passu
        # LP distribution: MIN(what LP is owed, their share of available cash)
        lp_share = input.cash_available * input.lp_split_pct
        lp_dist = min(input.lp_capital_account, lp_share)

        if input.gp_catch_up:
            # GP catches up: gets MIN(remaining cash, what GP is owed)
            remaining_after_lp = input.cash_available - lp_dist
            gp_dist = max(min(remaining_after_lp, input.gp_capital_account), ZERO)
        else:
            # Pro-rata: GP gets proportional share based on LP distribution
            if input.lp_split_pct > ZERO and lp_dist > ZERO:
                gp_dist = (lp_dist / input.lp_split_pct) * input.gp_split_pct
                # Cap at what GP is actually owed
                gp_dist = min(gp_dist, input.gp_capital_account)

        remaining = max(input.cash_available - lp_dist - gp_dist, ZERO)

    return TierDistResult(
        lp_dist=round_financial(lp_dist),
        gp_dist=round_financial(gp_dist),
        remaining=round_financial(remaining),
    )


# ============================================================================
# TIER 2-5: PROMOTE TIERS
# ============================================================================

@dataclass
class PromoteTierInput:
    """Inputs for promote tier distribution calculation."""
    cash_available: Decimal
    lp_capital_account: Decimal   # LP's capital account for this tier
    lp_split_pct: Decimal         # As decimal
    gp_split_pct: Decimal         # As decimal
    prior_lp_distributions: Decimal  # Sum of LP distributions from prior tiers this period


def calculate_promote_tier_distribution(input: PromoteTierInput) -> TierDistResult:
    """Calculate Promote Tier distribution (Tiers 2-5).

    Excel Formulas:
    - LP Distribution: =MIN(G114+G115-G117, G110*$I$16)
      - G114 = Beginning balance (capital account)
      - G115 = Accrued return to hit hurdle
      - G117 = Prior distributions from earlier tiers
      - G110 = Cash remaining after Tier 1
      - $I$16 = LP split percentage
    - GP Distribution: =G122/$I$16*$H$16

    Args:
        input: Promote tier calculation inputs

    Returns:
        TierDistResult with LP/GP distributions and remaining cash
    """
    if input.cash_available <= ZERO:
        return TierDistResult(lp_dist=ZERO, gp_dist=ZERO, remaining=ZERO)

    # LP needs: capital account balance - prior distributions from earlier tiers
    lp_need = input.lp_capital_account - input.prior_lp_distributions

    # LP gets: MIN(what they need, their split of available cash)
    lp_share_of_cash = input.cash_available * input.lp_split_pct
    lp_dist = min(max(lp_need, ZERO), lp_share_of_cash)

    # GP gets their split based on LP distribution
    # This maintains the tier's split ratio
    gp_dist = ZERO
    if input.lp_split_pct > ZERO and lp_dist > ZERO:
        gp_dist = (lp_dist / input.lp_split_pct) * input.gp_split_pct

    total_dist = lp_dist + gp_dist
    remaining = max(input.cash_available - total_dist, ZERO)

    return TierDistResult(
        lp_dist=round_financial(lp_dist),
        gp_dist=round_financial(gp_dist),
        remaining=round_financial(remaining),
    )


def distribute_residual(
    cash_available: Decimal,
    lp_split_pct: Decimal,
    gp_split_pct: Decimal,
) -> TierDistResult:
    """Distribute remaining cash at final tier split.

    For Tier 3/4/5 (residual) when all hurdles are met, or if there's excess cash.

    Args:
        cash_available: Cash remaining after prior tiers
        lp_split_pct: LP split percentage as decimal
        gp_split_pct: GP split percentage as decimal

    Returns:
        TierDistResult with all cash distributed
    """
    if cash_available <= ZERO:
        return TierDistResult(lp_dist=ZERO, gp_dist=ZERO, remaining=ZERO)

    lp_dist = round_financial(cash_available * lp_split_pct)
    gp_dist = round_financial(cash_available * gp_split_pct)

    return TierDistResult(lp_dist=lp_dist, gp_dist=gp_dist, remaining=ZERO)


# ============================================================================
# CAPITAL ACCOUNT UPDATE
# ============================================================================

def update_capital_account(
    beginning_balance: Decimal,
    accrued_return: Decimal,
    contribution: Decimal,
    distribution: Decimal,
    prior_tier_distributions: Decimal = ZERO,
) -> Decimal:
    """Update capital account after period activity.

    Excel Formula:
    - Tier 1: =G93+G95+G96-G97 (beginning + accrual + contribution - distribution)
    - Tier 2+: =G114+G115+G116-G117-G118 (+ prior tier netting)

    Args:
        beginning_balance: Balance at start of period
        accrued_return: Interest accrued this period
        contribution: New capital contributed this period
        distribution: Amount distributed this period
        prior_tier_distributions: For Tier 2+, distributions from earlier tiers to net

    Returns:
        Updated capital account balance
    """
    result = (
        beginning_balance
        + accrued_return
        + contribution
        - prior_tier_distributions
        - distribution
    )
    return round_financial(result)


# ============================================================================
# EQUITY MULTIPLE CALCULATION
# ============================================================================

def calculate_equity_multiple(
    total_distributions: Decimal,
    total_contributions: Decimal,
) -> Decimal:
    """Calculate equity multiple (distributions / contributions).

    Args:
        total_distributions: Sum of all distributions received
        total_contributions: Sum of all capital contributed

    Returns:
        Equity multiple (e.g., 1.5 for 1.5x)

    Example:
        >>> calculate_equity_multiple(Decimal('15000000'), Decimal('10000000'))
        Decimal('1.50')
    """
    if total_contributions <= ZERO:
        return ZERO
    return round_financial(total_distributions / total_contributions, 4)


# ============================================================================
# HURDLE CHECK
# ============================================================================

def is_hurdle_met(
    settings: WaterfallSettings,
    tier: WaterfallTierConfig,
    current_irr: Decimal,
    current_emx: Decimal,
) -> bool:
    """Check if hurdle has been met based on method.

    Args:
        settings: Waterfall settings including hurdle method
        tier: Tier configuration with hurdle thresholds
        current_irr: Current IRR as decimal
        current_emx: Current equity multiple

    Returns:
        True if hurdle is met
    """
    irr_threshold = tier.irr_hurdle / HUNDRED if tier.irr_hurdle else None
    emx_threshold = tier.emx_hurdle

    if settings.hurdle_method == HurdleMethod.IRR:
        return irr_threshold is not None and current_irr >= irr_threshold

    elif settings.hurdle_method == HurdleMethod.EMX:
        return emx_threshold is not None and current_emx >= emx_threshold

    elif settings.hurdle_method == HurdleMethod.IRR_EMX:
        # Max of both - hurdle is met when EITHER is met
        irr_met = irr_threshold is not None and current_irr >= irr_threshold
        emx_met = emx_threshold is not None and current_emx >= emx_threshold
        return irr_met or emx_met

    return False


# ============================================================================
# TIER CONFIGURATION HELPERS
# ============================================================================

def get_tier_hurdle_rate(
    tier: WaterfallTierConfig,
    hurdle_method: HurdleMethod,
) -> Decimal:
    """Get the hurdle rate for a tier based on hurdle method.

    Args:
        tier: Tier configuration
        hurdle_method: IRR, EMx, or IRR_EMx

    Returns:
        Hurdle rate as decimal (e.g., 0.08 for 8%)
    """
    # For IRR-based hurdles, use IRR hurdle or fallback to legacy hurdle_rate
    rate_pct = tier.irr_hurdle or tier.hurdle_rate or ZERO

    if hurdle_method == HurdleMethod.IRR:
        return rate_pct / HUNDRED
    elif hurdle_method == HurdleMethod.EMX:
        # For EMx hurdle, still need a rate for capital account accrual
        # Use the IRR hurdle rate as a proxy
        return rate_pct / HUNDRED
    elif hurdle_method == HurdleMethod.IRR_EMX:
        # Use IRR for accrual calculations
        return rate_pct / HUNDRED

    return ZERO


def normalize_tier(tier: WaterfallTierConfig) -> WaterfallTierConfig:
    """Normalize tier configuration to handle legacy fields.

    Args:
        tier: Raw tier configuration

    Returns:
        Normalized tier with all fields properly set
    """
    return WaterfallTierConfig(
        tier_number=tier.tier_number,
        tier_name=tier.tier_name or f"Tier {tier.tier_number}",
        irr_hurdle=tier.irr_hurdle or tier.hurdle_rate,
        emx_hurdle=tier.emx_hurdle,
        promote_percent=tier.promote_percent or ZERO,
        lp_split_pct=tier.lp_split_pct,
        gp_split_pct=tier.gp_split_pct,
    )
