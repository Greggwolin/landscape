"""
Waterfall Engine Types

Data structures for multi-tier equity waterfall calculations.
Based on Excel model WaterfallADVCRE.xlsx - Stevens Carey methodology.

Uses Decimal for financial precision in all monetary values.
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from enum import Enum
from typing import Optional, List


# ============================================================================
# ENUMS
# ============================================================================

class HurdleMethod(str, Enum):
    """Hurdle calculation method for waterfall distribution."""
    IRR = "IRR"
    EMX = "EMx"
    IRR_EMX = "IRR_EMx"


class ReturnOfCapital(str, Enum):
    """Return of capital priority in Tier 1."""
    LP_FIRST = "LP First"
    PARI_PASSU = "Pari Passu"


# ============================================================================
# INPUT TYPES
# ============================================================================

@dataclass
class CashFlow:
    """Single period cash flow for waterfall calculation.

    Attributes:
        period_id: Sequential period identifier
        date: Date of the cash flow
        amount: Cash flow amount (positive = distribution available, negative = contribution)
    """
    period_id: int
    date: date
    amount: Decimal

    def __post_init__(self):
        if not isinstance(self.amount, Decimal):
            self.amount = Decimal(str(self.amount))


@dataclass
class WaterfallTierConfig:
    """Configuration for a single waterfall tier.

    Attributes:
        tier_number: Tier identifier (1-5)
        tier_name: Human-readable tier name
        irr_hurdle: IRR hurdle as percentage (e.g., Decimal('8') for 8%)
        emx_hurdle: Equity multiple hurdle (e.g., Decimal('1.5') for 1.5x)
        promote_percent: GP promote percentage (e.g., Decimal('20') for 20%)
        lp_split_pct: LP split percentage (e.g., Decimal('72') for 72%)
        gp_split_pct: GP split percentage (e.g., Decimal('28') for 28%)
    """
    tier_number: int
    tier_name: str = ""
    irr_hurdle: Optional[Decimal] = None
    emx_hurdle: Optional[Decimal] = None
    promote_percent: Decimal = Decimal('0')
    lp_split_pct: Decimal = Decimal('0')
    gp_split_pct: Decimal = Decimal('0')
    # Legacy field support
    hurdle_rate: Optional[Decimal] = None

    def __post_init__(self):
        # Convert numeric types to Decimal
        if self.irr_hurdle is not None and not isinstance(self.irr_hurdle, Decimal):
            self.irr_hurdle = Decimal(str(self.irr_hurdle))
        if self.emx_hurdle is not None and not isinstance(self.emx_hurdle, Decimal):
            self.emx_hurdle = Decimal(str(self.emx_hurdle))
        if not isinstance(self.promote_percent, Decimal):
            self.promote_percent = Decimal(str(self.promote_percent))
        if not isinstance(self.lp_split_pct, Decimal):
            self.lp_split_pct = Decimal(str(self.lp_split_pct))
        if not isinstance(self.gp_split_pct, Decimal):
            self.gp_split_pct = Decimal(str(self.gp_split_pct))
        if self.hurdle_rate is not None and not isinstance(self.hurdle_rate, Decimal):
            self.hurdle_rate = Decimal(str(self.hurdle_rate))

        # Default tier name if not provided
        if not self.tier_name:
            self.tier_name = f"Tier {self.tier_number}"


@dataclass
class WaterfallSettings:
    """Global settings for waterfall calculation.

    Attributes:
        hurdle_method: Method for calculating hurdles (IRR, EMx, or IRR_EMx)
        num_tiers: Number of active tiers (2-5)
        return_of_capital: LP First or Pari Passu in Tier 1
        gp_catch_up: Whether GP catches up in Tier 1
        lp_ownership: LP ownership percentage as decimal (e.g., Decimal('0.90') for 90%)
        preferred_return_pct: LP preferred return rate as percentage
    """
    hurdle_method: HurdleMethod = HurdleMethod.IRR
    num_tiers: int = 3
    return_of_capital: ReturnOfCapital = ReturnOfCapital.PARI_PASSU
    gp_catch_up: bool = True
    lp_ownership: Decimal = Decimal('0.90')
    preferred_return_pct: Decimal = Decimal('8')

    def __post_init__(self):
        if not isinstance(self.lp_ownership, Decimal):
            self.lp_ownership = Decimal(str(self.lp_ownership))
        if not isinstance(self.preferred_return_pct, Decimal):
            self.preferred_return_pct = Decimal(str(self.preferred_return_pct))


# ============================================================================
# CAPITAL ACCOUNT TRACKING
# ============================================================================

@dataclass
class TierCapitalAccounts:
    """Capital accounts for each tier, tracking what partner is owed.

    Capital account = Beginning balance + Accruals + Contributions - Distributions

    Attributes:
        tier1: Tier 1 capital account (Pref Return + Return of Capital)
        tier2: Tier 2 capital account (first promote tier)
        tier3: Tier 3 capital account (second promote tier)
        tier4: Tier 4 capital account (third promote tier)
        tier5: Tier 5 capital account (fourth promote tier / residual)
    """
    tier1: Decimal = Decimal('0')
    tier2: Decimal = Decimal('0')
    tier3: Decimal = Decimal('0')
    tier4: Decimal = Decimal('0')
    tier5: Decimal = Decimal('0')

    def __post_init__(self):
        for attr in ['tier1', 'tier2', 'tier3', 'tier4', 'tier5']:
            value = getattr(self, attr)
            if not isinstance(value, Decimal):
                setattr(self, attr, Decimal(str(value)))


@dataclass
class PartnerState:
    """Complete state for a partner (LP or GP) during waterfall calculation.

    Tracks contributions, distributions, and capital accounts by tier.
    """
    partner_id: int
    partner_type: str  # 'LP' or 'GP'
    partner_name: str = ""

    # Cumulative totals
    total_contributions: Decimal = Decimal('0')
    total_distributions: Decimal = Decimal('0')

    # Capital accounts by tier
    capital_accounts: TierCapitalAccounts = field(default_factory=TierCapitalAccounts)

    # Distributions by tier (cumulative)
    tier1_distributions: Decimal = Decimal('0')
    tier2_distributions: Decimal = Decimal('0')
    tier3_distributions: Decimal = Decimal('0')
    tier4_distributions: Decimal = Decimal('0')
    tier5_distributions: Decimal = Decimal('0')

    # IRR/EMx tracking
    cash_flow_dates: List[date] = field(default_factory=list)
    cash_flow_amounts: List[Decimal] = field(default_factory=list)


# ============================================================================
# OUTPUT TYPES
# ============================================================================

@dataclass
class PeriodResult:
    """Detailed results for a single period.

    Contains all calculations for one period including contributions,
    accruals, and distributions by tier.
    """
    period_id: int
    date: date
    net_cash_flow: Decimal
    cumulative_cash_flow: Decimal

    # Contributions (from negative cash flow)
    lp_contribution: Decimal = Decimal('0')
    gp_contribution: Decimal = Decimal('0')

    # Accruals this period
    accrued_pref_lp: Decimal = Decimal('0')
    accrued_pref_gp: Decimal = Decimal('0')
    accrued_hurdle2_lp: Decimal = Decimal('0')
    accrued_hurdle3_lp: Decimal = Decimal('0')
    accrued_hurdle4_lp: Decimal = Decimal('0')
    accrued_hurdle5_lp: Decimal = Decimal('0')

    # Distributions by tier this period
    tier1_lp_dist: Decimal = Decimal('0')
    tier1_gp_dist: Decimal = Decimal('0')
    tier2_lp_dist: Decimal = Decimal('0')
    tier2_gp_dist: Decimal = Decimal('0')
    tier3_lp_dist: Decimal = Decimal('0')
    tier3_gp_dist: Decimal = Decimal('0')
    tier4_lp_dist: Decimal = Decimal('0')
    tier4_gp_dist: Decimal = Decimal('0')
    tier5_lp_dist: Decimal = Decimal('0')
    tier5_gp_dist: Decimal = Decimal('0')

    # Metrics at end of period
    lp_irr: Optional[Decimal] = None
    gp_irr: Optional[Decimal] = None
    lp_emx: Optional[Decimal] = None
    gp_emx: Optional[Decimal] = None

    # Capital account balances at end of period (what's still owed)
    lp_capital_tier1: Decimal = Decimal('0')  # LP Tier 1 capital account (pref + capital owed)
    gp_capital_tier1: Decimal = Decimal('0')  # GP Tier 1 capital account
    lp_capital_tier2: Decimal = Decimal('0')  # LP Tier 2 capital account (hurdle balance)

    # Cumulative accrued returns (running total of compounded interest, less paid down)
    # These are the "Accrued Pref" and "Accrued Hurdle" values for the UI
    cumulative_accrued_pref: Decimal = Decimal('0')  # Compounding at 8% annual
    cumulative_accrued_hurdle: Decimal = Decimal('0')  # Compounding at 15% annual


@dataclass
class PartnerSummary:
    """Summary of partner distributions and returns.

    Provides a breakdown of all distributions by category for
    presentation and reporting.
    """
    partner_id: int
    partner_type: str  # 'LP' or 'GP'
    partner_name: str

    # Distributions by category
    preferred_return: Decimal = Decimal('0')
    return_of_capital: Decimal = Decimal('0')
    excess_cash_flow: Decimal = Decimal('0')
    promote: Decimal = Decimal('0')  # GP only

    # Totals
    total_distributions: Decimal = Decimal('0')
    total_contributions: Decimal = Decimal('0')
    total_profit: Decimal = Decimal('0')

    # Returns
    irr: Decimal = Decimal('0')
    equity_multiple: Decimal = Decimal('0')

    # Per-tier breakdown
    tier1: Decimal = Decimal('0')
    tier2: Decimal = Decimal('0')
    tier3: Decimal = Decimal('0')
    tier4: Decimal = Decimal('0')
    tier5: Decimal = Decimal('0')


@dataclass
class ProjectSummary:
    """Project-level summary of waterfall results."""
    total_equity: Decimal = Decimal('0')
    lp_equity: Decimal = Decimal('0')
    gp_equity: Decimal = Decimal('0')
    total_distributed: Decimal = Decimal('0')
    lp_distributed: Decimal = Decimal('0')
    gp_distributed: Decimal = Decimal('0')
    project_irr: Decimal = Decimal('0')
    project_emx: Decimal = Decimal('0')


@dataclass
class WaterfallResult:
    """Complete result of waterfall calculation.

    Contains period-by-period results, partner summaries,
    and project-level metrics.
    """
    period_results: List[PeriodResult]
    lp_summary: PartnerSummary
    gp_summary: PartnerSummary
    project_summary: ProjectSummary

    # Detailed tracking
    lp_state: Optional[PartnerState] = None
    gp_state: Optional[PartnerState] = None
