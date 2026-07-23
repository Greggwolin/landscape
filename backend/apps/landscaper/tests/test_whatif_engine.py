import pytest

from apps.landscaper.services.ic_service import normalize_sensitivity_steps
from apps.landscaper.services.whatif_engine import Override, WhatIfEngine


def _assumptions():
    model = {
        "discount_rate": 0.10,
        "hold_period_years": 5,
        "total_project_months": 36,
        "cost_schedule": [
            {
                "fact_id": 1,
                "category": "Development",
                "amount": 100.0,
                "start_period": 1,
                "periods_to_complete": 1,
                "end_period": 1,
            }
        ],
        "parcel_sales": [
            {
                "assumption_id": 101,
                "parcel_id": 10,
                "sale_period": 12,
                "custom_sale_date": "2027-01-01",
                "gross_revenue": 200.0,
                "net_revenue": 180.0,
                "commissions": 10.0,
                "transaction_costs": 10.0,
            },
            {
                "assumption_id": 102,
                "parcel_id": 11,
                "sale_period": 24,
                "custom_sale_date": "2028-01-01",
                "gross_revenue": 200.0,
                "net_revenue": 180.0,
                "commissions": 10.0,
                "transaction_costs": 10.0,
            },
        ],
        "absorption_summary": {
            "units_per_period": 8.0,
            "total_units": 80.0,
            "start_period": 12,
            "periods_to_complete": 10,
        },
    }
    return {
        "land_model": model,
        "_baseline_land_model": {
            **model,
            "cost_schedule": [dict(i) for i in model["cost_schedule"]],
            "parcel_sales": [dict(s) for s in model["parcel_sales"]],
            "absorption_summary": dict(model["absorption_summary"]),
        },
        "revenue_summary": {},
        "total_costs": 100.0,
    }


def test_price_pct_override_updates_land_revenue_summary():
    engine = WhatIfEngine(1)
    assumptions = _assumptions()

    applied = engine._apply_land_model_override(
        assumptions,
        Override(
            field="inflated_price_per_unit",
            table="tbl_parcel_sale_assumptions",
            override_value=-10,
            unit="pct",
        ),
    )

    assert applied is True
    assert assumptions["land_model"]["parcel_sales"][0]["net_revenue"] == pytest.approx(162.0)
    assert assumptions["revenue_summary"]["total_net_revenue"] == pytest.approx(324.0)
    assert assumptions["_scenario_adjustments"][0]["factor"] == pytest.approx(0.9)


def test_currency_price_override_uses_percent_label_not_raw_dollar_multiplier():
    engine = WhatIfEngine(1)
    assumptions = _assumptions()

    applied = engine._apply_land_model_override(
        assumptions,
        Override(
            field="inflated_price_per_unit",
            table="tbl_parcel_sale_assumptions",
            override_value=2160,
            unit="currency",
            label="SFD 40' lots at 10% below plan",
        ),
    )

    assert applied is True
    assert assumptions["land_model"]["parcel_sales"][0]["net_revenue"] == pytest.approx(162.0)
    assert assumptions["_scenario_adjustments"][0]["factor"] == pytest.approx(0.9)


def test_currency_cost_override_uses_percent_label_not_raw_dollar_multiplier():
    engine = WhatIfEngine(1)
    assumptions = _assumptions()

    applied = engine._apply_land_model_override(
        assumptions,
        Override(
            field="total_budget",
            table="",
            override_value=115.0,
            unit="currency",
            label="Development costs +15%",
        ),
    )

    assert applied is True
    assert assumptions["land_model"]["cost_schedule"][0]["amount"] == pytest.approx(115.0)
    assert assumptions["total_costs"] == pytest.approx(115.0)
    assert assumptions["_scenario_adjustments"][0]["factor"] == pytest.approx(1.15)


def test_absolute_cost_override_uses_target_over_current_total():
    engine = WhatIfEngine(1)
    assumptions = _assumptions()

    applied = engine._apply_land_model_override(
        assumptions,
        Override(
            field="total_budget",
            table="",
            override_value=130.0,
            unit="currency",
            label="Development budget target",
        ),
    )

    assert applied is True
    assert assumptions["land_model"]["cost_schedule"][0]["amount"] == pytest.approx(130.0)
    assert assumptions["total_costs"] == pytest.approx(130.0)
    assert assumptions["_scenario_adjustments"][0]["factor"] == pytest.approx(1.3)


def test_absorption_override_delays_sales_and_lowers_npv():
    engine = WhatIfEngine(1)
    assumptions = _assumptions()
    baseline = engine._compute_land_model_metrics(assumptions["land_model"])

    applied = engine._apply_land_model_override(
        assumptions,
            Override(field="units_per_period", table="", override_value=4.0, unit="number"),
    )
    computed = engine._compute_land_model_metrics(assumptions["land_model"])

    assert applied is True
    assert assumptions["land_model"]["parcel_sales"][1]["sale_period"] > 24
    assert computed["npv"] < baseline["npv"]
    assert computed["total_profit"] == pytest.approx(baseline["total_profit"])


def test_absorption_velocity_percent_alias_updates_rate_and_lowers_npv():
    engine = WhatIfEngine(1)
    assumptions = _assumptions()
    baseline = engine._compute_land_model_metrics(assumptions["land_model"])

    applied = engine._apply_land_model_override(
        assumptions,
        Override(
            field="absorption_velocity",
            table="",
            override_value=-33,
            unit="pct",
            label="Slow absorption by 33% across all phases",
        ),
    )
    computed = engine._compute_land_model_metrics(assumptions["land_model"])

    assert applied is True
    assert assumptions["land_model"]["absorption_summary"]["units_per_period"] == pytest.approx(5.36)
    assert computed["npv"] < baseline["npv"]


def test_absorption_velocity_ratio_alias_updates_rate_and_lowers_npv():
    engine = WhatIfEngine(1)
    assumptions = _assumptions()
    baseline = engine._compute_land_model_metrics(assumptions["land_model"])

    applied = engine._apply_land_model_override(
        assumptions,
        Override(
            field="absorption_velocity_factor",
            table="",
            override_value=0.67,
            unit="ratio",
            label="Absorption slowed by one-third (velocity reduced to 67%)",
        ),
    )
    computed = engine._compute_land_model_metrics(assumptions["land_model"])

    assert applied is True
    assert assumptions["land_model"]["absorption_summary"]["units_per_period"] == pytest.approx(5.36)
    assert computed["npv"] < baseline["npv"]


def test_sale_date_override_can_parse_delay_from_months_label():
    engine = WhatIfEngine(1)
    assumptions = _assumptions()

    applied = engine._apply_land_model_override(
        assumptions,
        Override(
            field="sale_date",
            table="tbl_parcel_sale_assumptions",
            override_value="2029-03-01",
            unit="months",
            label="Builder walkaway - Parcels 161-162 delayed 12 months",
        ),
    )

    assert applied is True
    assert assumptions["land_model"]["parcel_sales"][0]["sale_period"] == 24
    assert assumptions["_scenario_adjustments"][0]["delay_months"] == 12


def test_sensitivity_steps_with_negative_values_are_percent_offsets():
    steps = normalize_sensitivity_steps(8.0, [-50, -25, 0, 25])

    assert [row["test_value"] for row in steps] == [4.0, 6.0, 8.0, 10.0]
    assert [row["step_pct"] for row in steps] == [-0.5, -0.25, 0.0, 0.25]


def test_sensitivity_steps_with_positive_values_are_absolute_values():
    steps = normalize_sensitivity_steps(8.0, [4, 5, 6])

    assert [row["test_value"] for row in steps] == [4.0, 5.0, 6.0]
    assert [row["step_pct"] for row in steps] == [-0.5, -0.375, -0.25]


def test_sale_date_override_delays_matching_sale_and_lowers_npv():
    engine = WhatIfEngine(1)
    assumptions = _assumptions()
    baseline = engine._compute_land_model_metrics(assumptions["land_model"])

    applied = engine._apply_land_model_override(
        assumptions,
        Override(
            field="sale_date",
            table="tbl_parcel_sale_assumptions",
            record_id="101",
            override_value="2028-01-01",
            unit="date",
            label="Delay first parcel sale 12 months",
        ),
    )
    computed = engine._compute_land_model_metrics(assumptions["land_model"])

    assert applied is True
    assert assumptions["land_model"]["parcel_sales"][0]["sale_period"] == 24
    assert assumptions["land_model"]["parcel_sales"][1]["sale_period"] == 24
    assert assumptions["_scenario_adjustments"][0]["delay_months"] == 12
    assert computed["npv"] < baseline["npv"]
    assert computed["total_profit"] == pytest.approx(baseline["total_profit"])
