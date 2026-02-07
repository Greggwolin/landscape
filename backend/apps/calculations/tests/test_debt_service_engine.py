import json
from pathlib import Path
from typing import Any, Dict, Optional

from django.test import TestCase

from apps.calculations.engines.debt_service_engine import (
    DebtServiceEngine,
    PeriodCosts,
    RevolverLoanParams,
    TermLoanParams,
)


class TestRevolverCalculation(TestCase):
    """Validate against Lotbank Excel model - Star Valley project."""

    def setUp(self):
        self.fixture = self._load_fixture()
        if not self.fixture:
            self.skipTest('star_valley_test_fixture.json not found')

        self.engine = DebtServiceEngine()
        self.params = self._build_revolver_params(self.fixture)
        self.period_data = self._build_period_data(self.fixture)

    def test_commitment_amount(self):
        result = self.engine.calculate_revolver(self.params, self.period_data)
        expected = self._expected_value('commitment', 25173350.51)
        self._assert_within_pct(result.commitment_amount, expected, 0.01)

    def test_interest_reserve(self):
        result = self.engine.calculate_revolver(self.params, self.period_data)
        expected = self._expected_value('interest_reserve', 3921350.67)
        self._assert_within_pct(result.interest_reserve_funded, expected, 0.01)

    def test_total_interest(self):
        result = self.engine.calculate_revolver(self.params, self.period_data)
        expected = self._expected_value('total_interest', 3139829.42)
        self._assert_within_pct(result.total_interest, expected, 0.01)

    def test_peak_balance(self):
        result = self.engine.calculate_revolver(self.params, self.period_data)
        expected = self._expected_value('peak_balance', 21432241.61)
        self._assert_within_pct(result.peak_balance, expected, 0.01)

    def test_convergence_iterations(self):
        result = self.engine.calculate_revolver(self.params, self.period_data)
        self.assertLessEqual(result.iterations_to_converge, 12)

    def test_loan_fully_repaid(self):
        result = self.engine.calculate_revolver(self.params, self.period_data)
        ending_balance = result.periods[-1].ending_balance if result.periods else 0.0
        self.assertLessEqual(abs(ending_balance), 1.0)

    def test_release_payments_total(self):
        result = self.engine.calculate_revolver(self.params, self.period_data)
        expected = self._expected_value('total_release_payments', 24391829.26)
        self._assert_within_pct(result.total_release_payments, expected, 0.01)

    def test_origination_fee(self):
        result = self.engine.calculate_revolver(self.params, self.period_data)
        expected = self._expected_value('origination_fee', 251733.51)
        self._assert_within_pct(result.origination_fee, expected, 0.01)

    def _load_fixture(self) -> Optional[Dict[str, Any]]:
        fixture_path = self._find_fixture_path()
        if not fixture_path:
            return None
        with fixture_path.open('r', encoding='utf-8') as fh:
            return json.load(fh)

    def _find_fixture_path(self) -> Optional[Path]:
        base = Path(__file__).resolve()
        # base = .../landscape/backend/apps/calculations/tests/test_...py
        # parents[4] = .../landscape/  (repo root)
        repo_root = base.parents[4]
        candidates = [
            repo_root / 'star_valley_test_fixture.json',
            repo_root / 'test-data' / 'star_valley_test_fixture.json',
            base.parent / 'fixtures' / 'star_valley_test_fixture.json',
        ]
        for path in candidates:
            if path.exists():
                return path
        return None

    def _build_revolver_params(self, fixture: Dict[str, Any]) -> RevolverLoanParams:
        params = fixture.get('loan_params') or fixture.get('params') or {}

        def pct_to_decimal(value: float, always_pct: bool = False) -> float:
            """Convert percentage to decimal.

            If always_pct is True, values >= 1.0 are always treated as
            whole-number percentages (e.g. 1.0 -> 0.01).  Otherwise the
            threshold of 1.5 is used to guess the format.
            """
            if value is None:
                return 0.0
            if always_pct:
                return value / 100.0 if value >= 1.0 else value
            return value / 100.0 if value > 1.5 else value

        closing_costs = params.get('closing_costs', {}) or {}
        closing_total = sum(
            float(closing_costs.get(key, 0.0)) for key in ('appraisal', 'legal', 'closing', 'other')
        )

        loan_start_period = self._infer_start_period(fixture)

        return RevolverLoanParams(
            loan_to_cost_pct=pct_to_decimal(params.get('ltc_pct', params.get('loan_to_cost_pct', 0.60))),
            interest_rate_annual=pct_to_decimal(params.get('interest_rate_pct', params.get('interest_rate_annual', 0.085))),
            origination_fee_pct=pct_to_decimal(params.get('origination_fee_pct', 0.01), always_pct=True),
            interest_reserve_inflator=float(params.get('interest_reserve_inflator', 1.2)),
            repayment_acceleration=float(params.get('repayment_acceleration', params.get('repayment_acceleration_pct', 1.2))),
            release_price_pct=pct_to_decimal(params.get('release_price_pct', 1.0)),
            release_price_minimum=float(params.get('release_price_minimum', 0.0)),
            closing_costs=closing_total or float(params.get('closing_costs', 32500.0)),
            loan_start_period=loan_start_period,
            loan_term_months=int(params.get('loan_term_months', 48)),
            draw_trigger_type=params.get('draw_trigger_type', 'COST_INCURRED'),
        )

    def _build_period_data(self, fixture: Dict[str, Any]):
        period_data = []
        periods = fixture.get('periods') or fixture.get('period_data') or []
        release_prices = fixture.get('release_prices_per_lot', {}) or {}
        products = fixture.get('products') or []
        params = fixture.get('loan_params') or {}
        repayment_accel = float(params.get('repayment_acceleration', params.get('repayment_acceleration_pct', 1.2)))
        release_price_pct = float(params.get('release_price_pct', 1.0))

        cost_per_lot_by_product: Dict[int, float] = {}
        for product in products:
            product_id = int(product.get('id'))
            lots = float(product.get('lots') or 0)
            total_cost = float(product.get('total_cost') or 0)
            if lots > 0:
                cost_per_lot_by_product[product_id] = total_cost / lots

        for product_id, release_price in release_prices.items():
            pid = int(product_id)
            if release_price_pct * repayment_accel > 0:
                cost_per_lot_by_product[pid] = float(release_price) / (release_price_pct * repayment_accel)
            else:
                cost_per_lot_by_product[pid] = float(release_price)

        for idx, period in enumerate(periods):
            period_index = period.get('period_index', period.get('periodIndex', period.get('period', idx)))
            lots_sold_list = period.get('lots_sold', [])
            lots_sold = {i + 1: int(count) for i, count in enumerate(lots_sold_list) if int(count) > 0}

            total_cost = period.get('total_cost', period.get('totalCosts', 0.0))
            total_costs = abs(float(total_cost))

            period_data.append(
                PeriodCosts(
                    period_index=int(period_index),
                    date=period.get('date', ''),
                    total_costs=total_costs,
                    lots_sold_by_product=lots_sold,
                    cost_per_lot_by_product=cost_per_lot_by_product,
                )
            )

        return period_data

    def _expected_value(self, key: str, fallback: float) -> float:
        expected = self.fixture.get('expected_totals') or self.fixture.get('expected_summary') or self.fixture.get('expected') or {}
        aliases = {
            'total_release_payments': 'total_releases',
        }
        if key not in expected and key in aliases:
            key = aliases[key]
        return float(expected.get(key, fallback))

    def _infer_start_period(self, fixture: Dict[str, Any]) -> int:
        periods = fixture.get('periods') or []
        for period in periods:
            expected_loan = period.get('expected_loan') or {}
            if expected_loan.get('orig_cost', 0) or expected_loan.get('int_reserve_balance', 0):
                return int(period.get('period', 0))
        return 0

    def _assert_within_pct(self, actual: float, expected: float, pct: float):
        if expected == 0:
            self.assertAlmostEqual(actual, expected, places=2)
            return
        delta = abs(actual - expected)
        self.assertLessEqual(delta, abs(expected) * pct)


class TestTermLoanCalculation(TestCase):
    """Test IO + amortization pattern."""

    def setUp(self):
        self.engine = DebtServiceEngine()

    def test_io_then_amort(self):
        params = TermLoanParams(
            loan_amount=1_000_000,
            interest_rate_annual=0.06,
            amortization_months=300,
            interest_only_months=12,
            loan_term_months=360,
            origination_fee_pct=0.01,
            loan_start_period=0,
            payment_frequency='MONTHLY',
        )
        result = self.engine.calculate_term(params, 360)
        io_periods = result.periods[:12]
        amort_periods = result.periods[12:24]
        self.assertTrue(all(p.principal_component == 0 for p in io_periods))
        self.assertTrue(any(p.principal_component > 0 for p in amort_periods))

    def test_full_amort(self):
        params = TermLoanParams(
            loan_amount=500_000,
            interest_rate_annual=0.05,
            amortization_months=120,
            interest_only_months=0,
            loan_term_months=120,
            origination_fee_pct=0.0,
            loan_start_period=0,
            payment_frequency='MONTHLY',
        )
        result = self.engine.calculate_term(params, 120)
        self.assertLessEqual(abs(result.periods[-1].ending_balance), 1.0)

    def test_io_only(self):
        params = TermLoanParams(
            loan_amount=750_000,
            interest_rate_annual=0.07,
            amortization_months=0,
            interest_only_months=0,
            loan_term_months=24,
            origination_fee_pct=0.0,
            loan_start_period=0,
            payment_frequency='MONTHLY',
        )
        result = self.engine.calculate_term(params, 24)
        self.assertTrue(all(p.principal_component == 0 for p in result.periods[:24]))
        self.assertGreater(result.balloon_amount, 0)

    def test_balloon_amount(self):
        params = TermLoanParams(
            loan_amount=900_000,
            interest_rate_annual=0.05,
            amortization_months=360,
            interest_only_months=0,
            loan_term_months=60,
            origination_fee_pct=0.0,
            loan_start_period=0,
            payment_frequency='MONTHLY',
        )
        result = self.engine.calculate_term(params, 60)
        self.assertGreater(result.balloon_amount, 0)
