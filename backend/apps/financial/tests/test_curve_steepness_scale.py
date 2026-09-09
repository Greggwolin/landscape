"""Curve steepness is stored on one scale and must be read on that same scale.

``core_fin_fact_budget.curve_steepness`` holds a 0-100 value with 50 as the
neutral midpoint. That is enforced by the database CHECK constraint
``core_fin_fact_budget_curve_steepness_check`` and is the scale used by every
frontend reader (scurve-allocation.ts, cashflow/costs.ts, cpm-calculator.ts,
the budget timing tile's 0-100 slider, the 0-100 validator in artifacts/views).

This service previously consumed the same column as if it were a 0-1 value
(``steepness = curve_steepness or 0.5``, then ``x *= steepness * 2``). Reading a
stored 55 that way multiplied the logistic's x by 110 instead of 1.1, saturating
it into a step function and dumping 100% of the line's cost into a single
period. The preview chart the user approved and the cash flow they relied on
were therefore different curves.

The mirror of this file is src/__tests__/curve-steepness-scale.test.ts, which
pins the same contract on the TypeScript side.
"""

from decimal import Decimal

import pytest

from apps.financial.services.land_dev_cashflow_service import (
    LandDevCashFlowService,
    NEUTRAL_CURVE_STEEPNESS,
    _normalize_curve_steepness,
)

# The values actually sitting in core_fin_fact_budget on 2026-09-06. All 17
# non-null rows are between 51.00 and 58.00 — every one of them on the 0-100
# scale, none of them on a 0-1 scale.
PRODUCTION_STEEPNESS_VALUES = (Decimal("51.00"), Decimal("55.00"), Decimal("58.00"))

PERIODS = 12


@pytest.fixture
def service():
    # __init__ only assigns attributes; nothing here touches the database.
    return LandDevCashFlowService(project_id=1)


def peak_share(weights):
    return max(weights)


class TestStoredScaleIsZeroToOneHundred:
    def test_neutral_is_fifty_not_half(self):
        """50 is the neutral midpoint, and it maps to the logistic's 0.5."""
        assert NEUTRAL_CURVE_STEEPNESS == 50.0
        assert _normalize_curve_steepness(50) == pytest.approx(0.5)

    def test_endpoints_map_to_the_unit_interval(self):
        assert _normalize_curve_steepness(0) == pytest.approx(0.0)
        assert _normalize_curve_steepness(100) == pytest.approx(1.0)

    def test_missing_value_falls_back_to_neutral(self):
        assert _normalize_curve_steepness(None) == _normalize_curve_steepness(50)

    def test_values_outside_the_check_constraint_are_clamped(self):
        """A value that escaped validation degrades to the nearest legal curve
        rather than saturating the logistic into a spike."""
        assert _normalize_curve_steepness(1000) == pytest.approx(1.0)
        assert _normalize_curve_steepness(-5) == pytest.approx(0.0)

    def test_decimal_from_the_driver_is_accepted(self):
        """psycopg2 returns NUMERIC(5,2) as Decimal, not float."""
        assert _normalize_curve_steepness(Decimal("55.00")) == pytest.approx(0.55)


class TestTheOldMisreadIsGone:
    """Regression guard for the 0-1/0-100 mismatch itself."""

    @pytest.mark.parametrize("stored", PRODUCTION_STEEPNESS_VALUES)
    def test_real_stored_values_spread_across_periods(self, service, stored):
        weights = service._calculate_scurve_weights(PERIODS, stored)

        # Under the old misread every one of these collapsed to a single
        # period holding 100% of the spend.
        assert peak_share(weights) < 0.40, (
            f"stored steepness {stored} concentrated "
            f"{peak_share(weights):.1%} into one period"
        )
        periods_funded = sum(1 for w in weights if w > 0.001)
        assert periods_funded >= 10, (
            f"stored steepness {stored} funded only {periods_funded}/{PERIODS} periods"
        )

    @pytest.mark.parametrize("stored", PRODUCTION_STEEPNESS_VALUES)
    def test_weights_still_sum_to_one(self, service, stored):
        weights = service._calculate_scurve_weights(PERIODS, stored)
        assert sum(weights) == pytest.approx(1.0)

    def test_a_stored_fifty_five_is_read_as_fifty_five_not_as_half(self, service):
        """55 must behave like 'slightly steeper than neutral', not like 5500."""
        neutral = service._calculate_scurve_weights(PERIODS, 50)
        stored_55 = service._calculate_scurve_weights(PERIODS, 55)

        # Slightly steeper than neutral, and nowhere near a step function.
        assert peak_share(stored_55) > peak_share(neutral)
        assert peak_share(stored_55) - peak_share(neutral) < 0.05


class TestScaleSemantics:
    def test_zero_is_flat(self, service):
        """Steepness 0 spreads evenly, matching applySteepness() in
        scurve-allocation.ts, where 0 flattens the curve to linear."""
        weights = service._calculate_scurve_weights(PERIODS, 0)
        assert weights == pytest.approx([1.0 / PERIODS] * PERIODS)

    def test_higher_stored_value_means_a_steeper_curve(self, service):
        """Direction must match the TypeScript engines: as the stored value
        rises, spend concentrates more."""
        peaks = [
            peak_share(service._calculate_scurve_weights(PERIODS, s))
            for s in (25, 50, 75, 100)
        ]
        assert peaks == sorted(peaks)
        assert len(set(peaks)) == len(peaks), "peak share must strictly increase"

    def test_no_legal_value_degenerates_into_one_period(self, service):
        for stored in range(0, 101, 5):
            weights = service._calculate_scurve_weights(PERIODS, stored)
            assert sum(weights) == pytest.approx(1.0)
            assert peak_share(weights) <= 0.60, (
                f"stored steepness {stored} put "
                f"{peak_share(weights):.1%} into a single period"
            )


class TestDistributionEntryPoint:
    """The scale must survive the path the cash flow actually takes."""

    def _distribute(self, service, steepness):
        return service._distribute_budget_item(
            amount=1_000_000.0,
            start_period=1,
            periods_to_complete=PERIODS,
            max_periods=PERIODS,
            timing_method="curve",
            curve_steepness=steepness,
            inflation_rate=None,
        )

    @pytest.mark.parametrize("stored", PRODUCTION_STEEPNESS_VALUES)
    def test_a_million_dollars_is_spread_not_spiked(self, service, stored):
        rows = self._distribute(service, stored)
        amounts = [r["amount"] for r in rows]

        assert len(rows) == PERIODS
        assert sum(amounts) == pytest.approx(1_000_000.0)
        # The old misread produced exactly one $1,000,000 period.
        assert max(amounts) < 400_000, (
            f"stored steepness {stored} spiked ${max(amounts):,.0f} into one period"
        )

    def test_absent_steepness_uses_the_neutral_default(self, service):
        absent = [r["amount"] for r in self._distribute(service, None)]
        explicit = [r["amount"] for r in self._distribute(service, 50)]
        assert absent == pytest.approx(explicit)

    def test_an_explicit_zero_is_not_treated_as_missing(self, service):
        """0 is a legal steepness (flattest), not an absent value. The old
        `curve_steepness or 0.5` silently turned it into the neutral curve."""
        flat = [r["amount"] for r in self._distribute(service, 0)]
        neutral = [r["amount"] for r in self._distribute(service, 50)]

        assert flat == pytest.approx([1_000_000.0 / PERIODS] * PERIODS)
        assert flat != pytest.approx(neutral)
