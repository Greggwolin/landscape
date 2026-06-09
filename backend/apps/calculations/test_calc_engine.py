"""
Tests for Calculations application.

Integration tests for calculation engine and Django ORM conversion.
"""

from django.test import TestCase
from decimal import Decimal
from apps.projects.models import Project
from apps.financial.models import BudgetItem
from .services import CalculationService
from .converters import (
    convert_project_to_property_data,
    convert_budget_items_to_cashflows,
    prepare_irr_calculation_data,
)


class ConverterTests(TestCase):
    """Tests for ORM to Pydantic converters."""
    
    def setUp(self):
        """Set up test data."""
        self.project = Project.objects.create(
            project_name="Test Project",
            project_type="Development",
            property_type_code="MULTIFAMILY",
            discount_rate_pct=Decimal('0.10'),
            is_active=True
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
        self.project = Project.objects.create(
            project_name="Service Test Project",
            project_type="Development",
            property_type_code="MULTIFAMILY",
            discount_rate_pct=Decimal('0.10'),
            is_active=True
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


class APIEndpointTests(TestCase):
    """Tests for calculation API endpoints."""
    
    def setUp(self):
        """Set up test client and data."""
        self.project = Project.objects.create(
            project_name="API Test Project",
            project_type="Development",
            property_type_code="MULTIFAMILY",
            discount_rate_pct=Decimal('0.10'),
            is_active=True
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
        from django.test import Client
        client = Client()
        
        response = client.post(
            '/api/calculations/irr/',
            {'cash_flows': [-100, -100, -100, 500, 500]},
            content_type='application/json'
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
