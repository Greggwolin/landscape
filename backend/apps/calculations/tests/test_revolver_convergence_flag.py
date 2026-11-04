"""
The revolver reserve solve says whether it converged, and its figures tie
either way (ARGUS parity re-audit 2026-10-21, §2.8 — #LS-1021-03).

Before this change the solve was capped at MAX_ITERATIONS with no flag: a
result that settled on the last pass read exactly like one that ran out, and
when it ran out the commitment came from the PREVIOUS pass's reserve, so
commitment and reserve did not tie. Measured 2026-10-21 on the Star Valley
fixture with the cap forced to 1: $22,806,338 commitment beside a $5,042,143
funded reserve, nothing in the result saying so.

Uses the same fixture and builders as test_debt_service_engine.py.
"""

import pytest
from django.test import SimpleTestCase

from apps.calculations.engines.debt_service_engine import DebtServiceEngine
# Imported as a module alias on purpose: binding the class name here would make
# pytest collect its (database-backed) tests a second time under this file.
from apps.calculations.tests import test_debt_service_engine as _tde


def _fixture_inputs():
    helper = _tde.TestRevolverCalculation.__new__(_tde.TestRevolverCalculation)
    fixture = _tde.TestRevolverCalculation._load_fixture(helper)
    if not fixture:
        pytest.skip('star_valley_test_fixture.json not found')
    return (
        _tde.TestRevolverCalculation._build_revolver_params(helper, fixture),
        _tde.TestRevolverCalculation._build_period_data(helper, fixture),
    )


def _rebuild_commitment(params, period_data, reserve):
    base_costs = sum(p.total_costs for p in period_data)
    denom = 1.0 - params.loan_to_cost_pct * params.origination_fee_pct
    return (base_costs + params.closing_costs + reserve) * params.loan_to_cost_pct / denom


class TestConvergenceFlag(SimpleTestCase):

    def test_fixture_converges_and_says_so(self):
        params, period_data = _fixture_inputs()
        result = DebtServiceEngine().calculate_revolver(params, period_data)
        assert result.converged is True
        assert result.reserve_residual == 0.0
        assert result.iterations_to_converge < DebtServiceEngine.MAX_ITERATIONS
        # Figures tie: the commitment is rebuilt from the returned reserve.
        assert result.commitment_amount == pytest.approx(
            _rebuild_commitment(params, period_data, result.interest_reserve_funded), rel=1e-9
        )
        assert result.origination_fee == pytest.approx(
            result.commitment_amount * params.origination_fee_pct, rel=1e-9
        )

    def test_exhausted_cap_is_flagged_and_still_ties(self):
        params, period_data = _fixture_inputs()

        class OnePass(DebtServiceEngine):
            MAX_ITERATIONS = 1

        result = OnePass().calculate_revolver(params, period_data)
        assert result.converged is False
        assert result.iterations_to_converge == 1
        assert result.reserve_residual > DebtServiceEngine.CONVERGENCE_TOLERANCE
        # The defect: commitment used to be built on the previous pass's reserve
        # (zero on pass one). Now it is rebuilt from the reserve actually returned.
        assert result.interest_reserve_funded > 0
        assert result.commitment_amount == pytest.approx(
            _rebuild_commitment(params, period_data, result.interest_reserve_funded), rel=1e-9
        )
        assert result.commitment_amount != pytest.approx(
            _rebuild_commitment(params, period_data, 0.0), rel=1e-6
        )

    def test_converged_result_unchanged_by_the_fix(self):
        """The converged path produces the same figures as before: the fixture's
        baselined expectations in test_debt_service_engine.py still hold."""
        params, period_data = _fixture_inputs()
        helper = _tde.TestRevolverCalculation.__new__(_tde.TestRevolverCalculation)
        fixture = _tde.TestRevolverCalculation._load_fixture(helper)
        expected = fixture['expected_totals']  # baselined 2026-06-09 (LSCMD-CALCFIX-0609-pm)
        result = DebtServiceEngine().calculate_revolver(params, period_data)
        assert result.commitment_amount == pytest.approx(expected['commitment'], abs=1.0)
        assert result.interest_reserve_funded == pytest.approx(expected['interest_reserve'], abs=1.0)
        assert result.origination_fee == pytest.approx(expected['origination_fee'], abs=1.0)
        assert result.total_interest == pytest.approx(expected['total_interest'], abs=1.0)
        assert result.peak_balance == pytest.approx(expected['peak_balance'], abs=1.0)
