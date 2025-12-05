from decimal import Decimal

from services.financial_engine_py.tests.excel_waterfall_utils import (
    build_engine,
    load_excel_scenario,
)


def test_excel_scenario_matches_within_one_dollar():
    cash_flows, excel_periods, expected_totals = load_excel_scenario()
    engine = build_engine(cash_flows)
    result = engine.calculate()

    lp_total = result.lp_summary.total_distributions
    gp_total = result.gp_summary.total_distributions

    assert abs(lp_total - expected_totals["lp_total"]) <= Decimal("1.00")
    assert abs(gp_total - expected_totals["gp_total"]) <= Decimal("1.00")

    max_abs_delta = Decimal("0")
    for pr in result.period_results:
        excel = excel_periods.get(pr.period_id, {})
        deltas = [
            pr.tier1_lp_dist - excel.get("t1_lp", Decimal("0")),
            pr.tier1_gp_dist - excel.get("t1_gp", Decimal("0")),
            pr.tier2_lp_dist - excel.get("t2_lp", Decimal("0")),
            pr.tier2_gp_dist - excel.get("t2_gp", Decimal("0")),
            pr.tier3_lp_dist - excel.get("t3_lp", Decimal("0")),
            pr.tier3_gp_dist - excel.get("t3_gp", Decimal("0")),
        ]
        period_max = max(abs(d) for d in deltas)
        if period_max > max_abs_delta:
            max_abs_delta = period_max

    assert max_abs_delta <= Decimal("1.00"), f"max per-tier delta {max_abs_delta}"
