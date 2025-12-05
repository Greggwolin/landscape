from decimal import Decimal
from typing import List

from financial_engine.waterfall import (
    CashFlow,
    HurdleMethod,
    ReturnOfCapital,
    WaterfallEngine,
    WaterfallSettings,
    WaterfallTierConfig,
)


def build_project_engine(cash_flows: List[CashFlow]) -> WaterfallEngine:
    """
    Construct a WaterfallEngine for runtime project calculations.

    For now, this mirrors the calibrated 3-tier structure used in the Excel
    scenario. Future work should parameterize tiers/settings per project.
    """
    tiers = [
        WaterfallTierConfig(
            tier_number=1,
            tier_name="Pref + Return of Capital",
            irr_hurdle=Decimal("8"),
            lp_split_pct=Decimal("90"),
            gp_split_pct=Decimal("10"),
        ),
        WaterfallTierConfig(
            tier_number=2,
            tier_name="Promote",
            irr_hurdle=Decimal("15"),
            promote_percent=Decimal("20"),
            lp_split_pct=Decimal("72"),
            gp_split_pct=Decimal("28"),
        ),
        WaterfallTierConfig(
            tier_number=3,
            tier_name="Residual",
            irr_hurdle=None,
            promote_percent=Decimal("50"),
            lp_split_pct=Decimal("45"),
            gp_split_pct=Decimal("55"),
        ),
    ]

    settings = WaterfallSettings(
        hurdle_method=HurdleMethod.IRR,
        num_tiers=3,
        return_of_capital=ReturnOfCapital.PARI_PASSU,
        gp_catch_up=True,
        lp_ownership=Decimal("0.90"),
        preferred_return_pct=Decimal("8"),
    )
    return WaterfallEngine(tiers=tiers, settings=settings, cash_flows=cash_flows)
