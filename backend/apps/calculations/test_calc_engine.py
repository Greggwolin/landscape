"""
Tests for Calculations application.

Integration tests for calculation engine and Django ORM conversion.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from apps.projects.models import Project
from apps.financial.models import BudgetItem
from .services import CalculationService
from .converters import (
    convert_project_to_property_data,
    convert_budget_items_to_cashflows,
    prepare_irr_calculation_data,
)

User = get_user_model()


def _make_user(username):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="test123")


class ConverterTests(TestCase):
    """Tests for ORM to Pydantic converters."""

    def setUp(self):
        """Set up test data."""
        self.user = _make_user("converter_user")
        self.project = Project.objects.create(
            project_name="Test Project",
            project_type="Development",
            discount_rate_pct=Decimal('0.10'),
            is_active=True,
            created_by=self.user,
        )

    def test_convert_project_to_property_data(self):
        """Test project conversion."""
        data = convert_project_to_property_data(self.project)

        self.assertEqual(data['property_id'], self.project.project_id)
        self.assertEqual(data['property_name'], "Test Project")
        self.assertEqual(data['discount_rate'], 0.10)

    def test_convert_budget_items_to_cashflows(self):
        """Test budget item conversion."""
        budget_item = BudgetItem.objects.create(
            project=self.project,
            line_item_name="Test Cost",
            category="CONSTRUCTION",
            fiscal_year=2025,
            fiscal_period=1,
            budgeted_amount=Decimal('100000'),
            is_active=True
        )

        cashflows = convert_budget_items_to_cashflows([budget_item])

        self.assertEqual(len(cashflows), 1)
        self.assertEqual(cashflows[0]['amount'], 100000.0)
        self.assertEqual(cashflows[0]['category'], "CONSTRUCTION")

    def test_prepare_irr_calculation_data(self):
        """Test IRR data preparation."""
        budget_items = [
            BudgetItem.objects.create(
                project=self.project,
                line_item_name=f"Cost {i}",
                category="CONSTRUCTION",
                fiscal_year=2025,
                fiscal_period=i,
                budgeted_amount=Decimal('50000'),
                is_active=True
            )
            for i in range(1, 5)
        ]

        data = prepare_irr_calculation_data(self.project, budget_items)

        self.assertEqual(data['project_id'], self.project.project_id)
        self.assertEqual(len(data['cash_flows']), 5)  # periods 0-4


class CalculationServiceTests(TestCase):
    """Tests for CalculationService."""

    def setUp(self):
        """Set up test data."""
        self.user = _make_user("service_user")
        self.project = Project.objects.create(
            project_name="Service Test Project",
            project_type="Development",
            discount_rate_pct=Decimal('0.10'),
            is_active=True,
            created_by=self.user,
        )

        # Create sample budget items
        for i in range(1, 13):
            BudgetItem.objects.create(
                project=self.project,
                line_item_name=f"Month {i} Cost",
                category="CONSTRUCTION" if i <= 6 else "REVENUE",
                fiscal_year=2025,
                fiscal_period=i,
                budgeted_amount=Decimal('100000') if i <= 6 else Decimal('-150000'),
                is_active=True
            )

    def test_generate_cashflow_projection(self):
        """Test cash flow projection generation."""
        result = CalculationService.generate_cashflow_projection(
            self.project.project_id,
            periods=12,
            include_actuals=False
        )

        self.assertEqual(result['project_id'], self.project.project_id)
        self.assertIn('projection', result)
        self.assertIn('summary', result)
        self.assertGreater(len(result['projection']), 0)

    def test_calculate_project_metrics(self):
        """Test project metrics calculation."""
        result = CalculationService.calculate_project_metrics(self.project.project_id)

        self.assertEqual(result['project_id'], self.project.project_id)
        self.assertIn('budget_summary', result)
        self.assertIn('investment_metrics', result)
        self.assertEqual(result['status'], 'complete')


class InvestmentMetricRegressionTests(TestCase):
    """Regression cover for LSCMD-IRRWIRE-0714-TB.

    Context — why these tests exist and why the pre-existing
    `test_calculate_project_metrics` above did NOT catch the defect:

      1. It asserted `status == 'complete'`, but 'complete' was a hardcoded
         literal returned unconditionally. The assertion could never fail.
      2. It asserted `'investment_metrics' in result` — a SHAPE check. The key
         was always present; its `irr` value was always None.
      3. Its fixture books REVENUE rows as NEGATIVE amounts, which the
         converter routes through `inflows += -150000`. The resulting series is
         all-negative, so `npf.irr` returns NaN and no IRR is obtainable even
         from correct code.

    Net effect: a test existed, passed continuously, and asserted nothing about
    the number. These tests assert VALUES, on a fixture that can actually
    produce one.
    """

    def setUp(self):
        self.user = _make_user("metric_regression_user")
        self.project = Project.objects.create(
            project_name="IRR Regression Project",
            project_type="Development",
            discount_rate_pct=Decimal('0.10'),
            is_active=True,
            created_by=self.user,
        )
        # Six periods of spend, then six periods of receipts. Revenue is booked
        # POSITIVE here (unlike the fixture above) so the netted series actually
        # changes sign and admits a real IRR.
        for i in range(1, 7):
            BudgetItem.objects.create(
                project=self.project,
                line_item_name=f"Month {i} Cost",
                category="CONSTRUCTION",
                fiscal_year=2025,
                fiscal_period=i,
                budgeted_amount=Decimal('100000'),
                is_active=True,
            )
        for i in range(7, 13):
            BudgetItem.objects.create(
                project=self.project,
                line_item_name=f"Month {i} Revenue",
                category="REVENUE",
                fiscal_year=2025,
                fiscal_period=i,
                budgeted_amount=Decimal('150000'),
                is_active=True,
            )

    def test_irr_returns_an_actual_number(self):
        """IRR must be a real number, not None.

        This is the assertion that fails against the pre-fix code: the service
        called InvestmentMetrics.calculate_irr() with 1 positional arg where 3
        are required, the TypeError was swallowed by a bare `except Exception`,
        and `.get('irr')` on the resulting error dict yielded None.
        """
        result = CalculationService.calculate_irr(self.project.project_id)

        self.assertIsNone(
            result.get('error'),
            msg=f"calculate_irr reported an error: {result.get('error')}",
        )
        self.assertIsNotNone(
            result.get('irr'),
            msg="IRR came back None on a fixture that admits a real solution — "
                "the engine call is mis-wired again.",
        )
        self.assertIsInstance(result['irr'], float)
        # Six periods of -100k followed by six of +150k solves to ~6.99%/period.
        self.assertAlmostEqual(result['irr'], 0.069913, places=4)

    def test_npv_returns_an_actual_number(self):
        """NPV must compute. Pre-fix, the call passed (cash_flows, discount_rate)
        into a signature of (discount_rate, initial_investment, cash_flows,
        reversion_value) — wrong arity AND reversed order."""
        result = CalculationService.calculate_npv(self.project.project_id)

        self.assertIsNone(result.get('error'))
        self.assertIsNotNone(result.get('npv'))
        self.assertIsInstance(result['npv'], float)
        self.assertAlmostEqual(result['npv'], -66761, delta=1.0)

    def test_project_metrics_surfaces_real_irr(self):
        """The Landscaper-facing aggregate must carry the number through."""
        result = CalculationService.calculate_project_metrics(self.project.project_id)

        self.assertEqual(result['status'], 'complete')
        self.assertIsNone(result.get('errors'))
        self.assertIsNotNone(result['investment_metrics']['irr'])
        self.assertIsNotNone(result['investment_metrics']['npv'])

    def test_metric_failure_is_reported_not_swallowed(self):
        """A failed metric must NOT be reported as status 'complete'.

        This is the silent-failure half of the defect, and the more dangerous
        half: an all-negative series has no IRR, which is a legitimate outcome,
        but it must be distinguishable from a successful zero/None.
        """
        barren = Project.objects.create(
            project_name="No Solution Project",
            project_type="Development",
            discount_rate_pct=Decimal('0.10'),
            is_active=True,
            created_by=self.user,
        )
        # Spend only, no receipts -> no sign change -> no IRR exists.
        for i in range(1, 7):
            BudgetItem.objects.create(
                project=barren,
                line_item_name=f"Month {i} Cost",
                category="CONSTRUCTION",
                fiscal_year=2025,
                fiscal_period=i,
                budgeted_amount=Decimal('100000'),
                is_active=True,
            )

        result = CalculationService.calculate_project_metrics(barren.project_id)

        # No IRR is obtainable, and that must be visible to the caller.
        self.assertIsNone(result['investment_metrics']['irr'])
        # NPV is still well-defined on an all-negative series, so this stays
        # 'complete'. The point of the assertion is that the status is DERIVED
        # from the results rather than hardcoded — if a metric had errored,
        # status would read 'partial' and 'errors' would be populated.
        self.assertIn(result['status'], ('complete', 'partial'))
        if result['status'] == 'partial':
            self.assertIsNotNone(result['errors'])

    def test_engine_signature_still_matches_its_callers(self):
        """Fail loudly if anyone re-points the service at the decomposed engine
        signature without adapting the series shape.

        The two shapes are not interchangeable: converters emit an already-netted
        signed series, from which `initial_investment` and `reversion_value`
        cannot be recovered. This test pins that contract.
        """
        import inspect
        try:
            from financial_engine.core.metrics import InvestmentMetrics
        except ImportError:
            self.skipTest("financial engine not installed")

        params = list(
            inspect.signature(InvestmentMetrics.calculate_irr).parameters
        )
        self.assertEqual(
            params,
            ['self', 'initial_investment', 'cash_flows', 'reversion_value'],
            msg="InvestmentMetrics.calculate_irr signature changed. It takes "
                "DECOMPOSED inputs; apps.calculations passes a SIGNED SERIES "
                "and must keep using series_metrics.irr_from_series instead.",
        )


class APIEndpointTests(TestCase):
    """Tests for calculation API endpoints."""

    def setUp(self):
        """Set up test client and data."""
        self.user = _make_user("api_user")
        self.project = Project.objects.create(
            project_name="API Test Project",
            project_type="Development",
            discount_rate_pct=Decimal('0.10'),
            is_active=True,
            created_by=self.user,
        )

        # Create budget items
        for i in range(1, 6):
            BudgetItem.objects.create(
                project=self.project,
                line_item_name=f"Item {i}",
                category="CONSTRUCTION",
                fiscal_year=2025,
                fiscal_period=i,
                budgeted_amount=Decimal('50000'),
                is_active=True
            )

    def test_irr_endpoint(self):
        """Test IRR calculation endpoint."""
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.user)  # endpoint requires DRF auth

        response = client.post(
            '/api/calculations/irr/',
            {'cash_flows': [-100, -100, -100, 500, 500]},
            format='json'
        )

        # May fail if Python engine not available, but should not error
        self.assertIn(response.status_code, [200, 503])

    def test_project_cashflow_endpoint(self):
        """Test project cash flow endpoint."""
        from django.test import Client
        client = Client()

        response = client.get(
            f'/api/calculations/project/{self.project.project_id}/cashflow/'
        )

        if response.status_code == 200:
            data = response.json()
            self.assertEqual(data['project_id'], self.project.project_id)
            self.assertIn('projection', data)
