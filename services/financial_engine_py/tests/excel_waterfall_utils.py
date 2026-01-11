"""
Shared helpers for loading the Excel ground truth and building the Python
waterfall engine for the Project 9 scenario.
"""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd

from financial_engine.waterfall import (
    CashFlow,
    HurdleMethod,
    ReturnOfCapital,
    WaterfallEngine,
    WaterfallSettings,
    WaterfallTierConfig,
)

EXCEL_PATH = Path(__file__).resolve().parents[3] / "docs/02-features/financial-engine/WaterfallCalcs.xlsx"
SHEET_NAME = "Partnership Returns - Monthly"


def _to_decimal(val) -> Decimal:
    if pd.isna(val):
        return Decimal("0")
    return Decimal(str(val))


def load_excel_scenario() -> Tuple[List[CashFlow], Dict[int, Dict[str, Decimal]], Dict[str, Decimal]]:
    """
    Load cash flows and per-tier Excel distributions for the validated project column.

    Returns:
        cash_flows: List of CashFlow entries (period_id, date, amount)
        per_period: Dict keyed by period_id -> tier distributions from Excel
        expected_totals: Dict with lp_total and gp_total from Excel tiers
    """
    df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME, header=None)
    project_col = 3  # Column D (validated against Excel totals)

    date_cells = df.iloc[45, 5:]
    dates = [d for d in date_cells if not pd.isna(d)]
    period_count = len(dates)

    cash_series = df.iloc[50, 5 : 5 + period_count]
    cash_flows: List[CashFlow] = []
    for idx, (dt, amt) in enumerate(zip(date_cells.iloc[:period_count], cash_series), start=1):
        if pd.isna(dt):
            continue
        cash_flows.append(
            CashFlow(period_id=idx, date=dt.date(), amount=_to_decimal(amt))
        )

    # Excel per-period tier distributions
    tier1_lp_row = 96
    tier1_gp_row = 104
    tier2_lp_row = 117
    tier2_gp_row = 122
    tier3_lp_row = 132
    tier3_gp_row = 137

    def horizontal_slice(row_idx: int) -> List[Decimal]:
        row = df.iloc[row_idx, 5 : 5 + period_count]
        return [_to_decimal(v) for v in row]

    t1_lp = horizontal_slice(tier1_lp_row)
    t1_gp = horizontal_slice(tier1_gp_row)
    t2_lp = horizontal_slice(tier2_lp_row)
    t2_gp = horizontal_slice(tier2_gp_row)
    t3_lp = horizontal_slice(tier3_lp_row)
    t3_gp = horizontal_slice(tier3_gp_row)

    per_period: Dict[int, Dict[str, Decimal]] = {}
    for i in range(period_count):
        per_period[i + 1] = {
            "t1_lp": t1_lp[i],
            "t1_gp": t1_gp[i],
            "t2_lp": t2_lp[i],
            "t2_gp": t2_gp[i],
            "t3_lp": t3_lp[i],
            "t3_gp": t3_gp[i],
        }

    expected_totals = {
        "lp_total": sum(t1_lp) + sum(t2_lp) + sum(t3_lp),
        "gp_total": sum(t1_gp) + sum(t2_gp) + sum(t3_gp),
    }

    return cash_flows, per_period, expected_totals


def build_engine(cash_flows: List[CashFlow]) -> WaterfallEngine:
    """Construct the Python engine with the validated 3-tier structure."""
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
