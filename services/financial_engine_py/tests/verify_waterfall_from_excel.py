"""
Verification harness to compare Python waterfall engine to Excel ground truth.

Usage:
    cd services/financial_engine_py
    python -m services.financial_engine_py.tests.verify_waterfall_from_excel
"""

from __future__ import annotations

from decimal import Decimal
from loguru import logger

from services.financial_engine_py.tests.excel_waterfall_utils import (
    build_engine,
    load_excel_scenario,
)


def main() -> None:
    # Silence engine debug noise for comparison runs
    logger.remove()
    logger.add(lambda msg: None, level="INFO")

    cash_flows, excel_periods, expected_totals = load_excel_scenario()
    engine = build_engine(cash_flows)
    result = engine.calculate()

    py_lp = result.lp_summary.total_distributions
    py_gp = result.gp_summary.total_distributions

    print("=== SUMMARY ===")
    print(f"Excel LP Total: {expected_totals['lp_total']:,}")
    print(f"Excel GP Total: {expected_totals['gp_total']:,}")
    print(f"Python LP Total: {py_lp:,}")
    print(f"Python GP Total: {py_gp:,}")
    print(f"Diff LP: {py_lp - expected_totals['lp_total']}")
    print(f"Diff GP: {py_gp - expected_totals['gp_total']}")
    print()

    print("=== PER PERIOD COMPARISON (non-zero CFs) ===")
    first_over_one = None
    max_abs_delta = Decimal("0")
    for pr in result.period_results:
        if pr.net_cash_flow == 0:
            continue
        excel = excel_periods.get(pr.period_id, {})
        diffs = {
            "t1_lp": pr.tier1_lp_dist - excel.get("t1_lp", Decimal("0")),
            "t1_gp": pr.tier1_gp_dist - excel.get("t1_gp", Decimal("0")),
            "t2_lp": pr.tier2_lp_dist - excel.get("t2_lp", Decimal("0")),
            "t2_gp": pr.tier2_gp_dist - excel.get("t2_gp", Decimal("0")),
            "t3_lp": pr.tier3_lp_dist - excel.get("t3_lp", Decimal("0")),
            "t3_gp": pr.tier3_gp_dist - excel.get("t3_gp", Decimal("0")),
        }
        period_max = max(abs(v) for v in diffs.values())
        if period_max > max_abs_delta:
            max_abs_delta = period_max
        if first_over_one is None and any(abs(v) > 1 for v in diffs.values()):
            first_over_one = pr.period_id

        print(
            f"Period {pr.period_id:3d} {pr.date} CF={pr.net_cash_flow}\n"
            f"  Excel:  T1 LP={excel.get('t1_lp')}, GP={excel.get('t1_gp')}; "
            f"T2 LP={excel.get('t2_lp')}, GP={excel.get('t2_gp')}; "
            f"T3 LP={excel.get('t3_lp')}, GP={excel.get('t3_gp')}; "
            f"LP_IRR=NA GP_IRR=NA\n"
            f"  Python: T1 LP={pr.tier1_lp_dist}, GP={pr.tier1_gp_dist}; "
            f"T2 LP={pr.tier2_lp_dist}, GP={pr.tier2_gp_dist}; "
            f"T3 LP={pr.tier3_lp_dist}, GP={pr.tier3_gp_dist}; "
            f"LP_IRR={pr.lp_irr} GP_IRR={pr.gp_irr}\n"
            f"  Diff:   T1 LP={diffs['t1_lp']}, GP={diffs['t1_gp']}; "
            f"T2 LP={diffs['t2_lp']}, GP={diffs['t2_gp']}; "
            f"T3 LP={diffs['t3_lp']}, GP={diffs['t3_gp']}"
        )

    print("\n=== DELTA STATS ===")
    print(f"First period with |delta| > $1: {first_over_one}")
    print(f"Max absolute per-tier delta: {max_abs_delta}")


if __name__ == "__main__":
    main()
