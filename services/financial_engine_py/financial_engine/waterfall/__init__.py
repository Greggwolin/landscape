"""
Waterfall Distribution Engine

Multi-tier equity waterfall calculations based on Stevens Carey methodology.
Implements the same logic as the Excel model WaterfallADVCRE.xlsx.
"""

from financial_engine.waterfall.types import (
    HurdleMethod,
    ReturnOfCapital,
    WaterfallTierConfig,
    WaterfallSettings,
    CashFlow,
    PartnerState,
    TierCapitalAccounts,
    PeriodResult,
    PartnerSummary,
    ProjectSummary,
    WaterfallResult,
)
from financial_engine.waterfall.formulas import (
    calculate_accrual,
    days_between,
    allocate_contribution,
    calculate_splits,
    calculate_tier1_distribution,
    calculate_promote_tier_distribution,
    distribute_residual,
    update_capital_account,
    calculate_equity_multiple,
    is_hurdle_met,
    get_tier_hurdle_rate,
)
from financial_engine.waterfall.irr import calculate_xirr
from financial_engine.waterfall.engine import WaterfallEngine

__all__ = [
    # Types
    "HurdleMethod",
    "ReturnOfCapital",
    "WaterfallTierConfig",
    "WaterfallSettings",
    "CashFlow",
    "PartnerState",
    "TierCapitalAccounts",
    "PeriodResult",
    "PartnerSummary",
    "ProjectSummary",
    "WaterfallResult",
    # Formulas
    "calculate_accrual",
    "days_between",
    "allocate_contribution",
    "calculate_splits",
    "calculate_tier1_distribution",
    "calculate_promote_tier_distribution",
    "distribute_residual",
    "update_capital_account",
    "calculate_equity_multiple",
    "is_hurdle_met",
    "get_tier_hurdle_rate",
    # IRR
    "calculate_xirr",
    # Engine
    "WaterfallEngine",
]
