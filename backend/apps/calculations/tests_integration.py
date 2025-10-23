"""
Integration tests for Calculation Engine.
Tests ORM to Pydantic conversion and calculation engine integration.
Phase 6: Testing Enhancement
"""
import pytest
from decimal import Decimal
from datetime import date
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.projects.models import Project
from apps.containers.models import Container, ContainerType
from apps.financial.models import BudgetItem, ActualItem, FinancialCategory, FinancialAccountCode, FinancialAccountGroup
from apps.calculations.converters import (
    convert_project_to_property_data,
    prepare_irr_calculation_data,
    convert_budget_items_to_cashflow
)
from apps.calculations.services import CalculationService

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user():
    return User.objects.create_user(
        username="calcuser",
        email="calc@example.com",
        password="test123"
    )


@pytest.fixture
def auth_client(api_client, auth_user):
    api_client.force_authenticate(user=auth_user)
    return api_client


@pytest.fixture
def full_project():
    """Create a complete project with all financial details."""
    return Project.objects.create(
        project_name="Financial Test Project",
        project_type="SFD",
        development_type="Master-Planned Community",
        property_type_code="MPC",
        acres_gross=100.0,
        target_units=500,
        discount_rate_pct=Decimal("0.1000"),
        cost_of_capital_pct=Decimal("0.0800"),
        price_range_low=Decimal("250000.00"),
        price_range_high=Decimal("450000.00")
    )


@pytest.fixture
def project_with_financials(full_project):
    """Create project with containers and budget items."""
    ctype = ContainerType.objects.create(
        type_code="PHASE",
        type_name="Phase"
    )
    container = Container.objects.create(
        project=full_project,
        container_type=ctype,
        container_name="Phase 1",
        display_order=1
    )
    
    category = FinancialCategory.objects.create(
        category_code="REVENUE",
        category_name="Revenue",
        category_type="income"
    )
    group = FinancialAccountGroup.objects.create(
        group_code="SALES",
        group_name="Sales Revenue"
    )
    account = FinancialAccountCode.objects.create(
        account_code="4000",
        account_name="Sales",
        category=category,
        group=group
    )
    
    # Create budget items for cash flow
    for i in range(12):
        BudgetItem.objects.create(
            project=full_project,
            container=container,
            account_code=account,
            amount=Decimal("100000.00"),
            period_start=date(2025, i+1, 1),
            fiscal_year=2025
        )
    
    return full_project


@pytest.mark.django_db
class TestOrmToPydanticConversion:
    """Test conversion from Django ORM models to Pydantic models."""
    
    def test_convert_project_to_property_data(self, full_project):
        """Test project to PropertyData conversion."""
        property_data = convert_project_to_property_data(full_project)
        
        assert property_data is not None
        assert property_data['property_id'] == full_project.project_id
        assert property_data['property_name'] == "Financial Test Project"
        assert property_data['discount_rate'] == 0.10
        assert property_data['target_units'] == 500
        
    def test_prepare_irr_calculation_data(self, project_with_financials):
        """Test preparing IRR calculation data from budget items."""
        budget_items = BudgetItem.objects.filter(project=project_with_financials)
        calc_data = prepare_irr_calculation_data(project_with_financials, list(budget_items))
        
        assert calc_data is not None
        assert 'cash_flows' in calc_data
        assert len(calc_data['cash_flows']) == 12
        
    def test_convert_budget_items_to_cashflow(self, project_with_financials):
        """Test converting budget items to cash flow array."""
        budget_items = BudgetItem.objects.filter(project=project_with_financials)
        cashflows = convert_budget_items_to_cashflow(list(budget_items), periods=12)
        
        assert len(cashflows) == 12
        assert all(cf == 100000.0 for cf in cashflows)


@pytest.mark.django_db
class TestCalculationService:
    """Test CalculationService business logic layer."""
    
    def test_calculate_irr(self, project_with_financials):
        """Test IRR calculation for a project."""
        result = CalculationService.calculate_irr(project_with_financials.project_id)
        
        assert result is not None
        assert 'irr' in result
        assert 'project_id' in result
        assert result['project_id'] == project_with_financials.project_id
        
    def test_calculate_npv(self, project_with_financials):
        """Test NPV calculation for a project."""
        result = CalculationService.calculate_npv(
            project_with_financials.project_id,
            discount_rate=0.10
        )
        
        assert result is not None
        assert 'npv' in result
        assert 'discount_rate' in result
        assert result['discount_rate'] == 0.10
        
    def test_generate_cashflow_projection(self, project_with_financials):
        """Test cash flow projection generation."""
        result = CalculationService.generate_cashflow_projection(
            project_with_financials.project_id,
            periods=12
        )
        
        assert result is not None
        assert 'periods' in result
        assert len(result['periods']) == 12
        assert 'total_inflow' in result
        assert 'total_outflow' in result
        
    def test_calculate_project_metrics(self, project_with_financials):
        """Test comprehensive project metrics calculation."""
        result = CalculationService.calculate_project_metrics(
            project_with_financials.project_id
        )
        
        assert result is not None
        assert 'irr' in result
        assert 'npv' in result
        assert 'roi' in result
        assert 'project_id' in result


@pytest.mark.django_db
class TestCalculationAPIIntegration:
    """Test Calculation API endpoints with real calculation engine."""
    
    def test_project_metrics_endpoint(self, auth_client, project_with_financials):
        """Test GET /api/calculations/project/:id/metrics/"""
        response = auth_client.get(
            f'/api/calculations/project/{project_with_financials.project_id}/metrics/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'irr' in response.data
        assert 'npv' in response.data
        
    def test_project_cashflow_endpoint(self, auth_client, project_with_financials):
        """Test GET /api/calculations/project/:id/cashflow/"""
        response = auth_client.get(
            f'/api/calculations/project/{project_with_financials.project_id}/cashflow/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'periods' in response.data
        assert len(response.data['periods']) > 0
        
    def test_project_irr_endpoint(self, auth_client, project_with_financials):
        """Test GET /api/calculations/project/:id/irr/"""
        response = auth_client.get(
            f'/api/calculations/project/{project_with_financials.project_id}/irr/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'irr' in response.data
        
    def test_project_npv_endpoint(self, auth_client, project_with_financials):
        """Test GET /api/calculations/project/:id/npv/"""
        response = auth_client.get(
            f'/api/calculations/project/{project_with_financials.project_id}/npv/?discount_rate=0.10'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'npv' in response.data
        assert 'discount_rate' in response.data


@pytest.mark.django_db
class TestCalculationErrorHandling:
    """Test error handling in calculation services."""
    
    def test_calculate_irr_nonexistent_project(self):
        """Test IRR calculation with non-existent project."""
        with pytest.raises(Exception):
            CalculationService.calculate_irr(999999)
            
    def test_calculate_npv_invalid_discount_rate(self, project_with_financials):
        """Test NPV calculation with invalid discount rate."""
        with pytest.raises(ValueError):
            CalculationService.calculate_npv(
                project_with_financials.project_id,
                discount_rate=-0.5  # Invalid negative rate
            )
            
    def test_cashflow_projection_invalid_periods(self, project_with_financials):
        """Test cash flow projection with invalid periods."""
        with pytest.raises(ValueError):
            CalculationService.generate_cashflow_projection(
                project_with_financials.project_id,
                periods=0  # Invalid
            )


@pytest.mark.django_db
class TestCalculationPerformance:
    """Test calculation performance targets."""
    
    def test_irr_calculation_performance(self, project_with_financials):
        """Test that IRR calculation completes within performance target."""
        import time
        
        start = time.time()
        result = CalculationService.calculate_irr(project_with_financials.project_id)
        elapsed = time.time() - start
        
        assert result is not None
        assert elapsed < 1.0  # Should complete in under 1 second
        
    def test_metrics_calculation_performance(self, project_with_financials):
        """Test that full metrics calculation completes within target."""
        import time
        
        start = time.time()
        result = CalculationService.calculate_project_metrics(
            project_with_financials.project_id
        )
        elapsed = time.time() - start
        
        assert result is not None
        assert elapsed < 2.0  # Should complete in under 2 seconds


@pytest.mark.django_db
class TestDataValidation:
    """Test data validation between Django and calculation engine."""
    
    def test_decimal_precision_preserved(self, full_project):
        """Test that decimal precision is preserved in conversion."""
        full_project.discount_rate_pct = Decimal("0.1234")
        full_project.save()
        
        property_data = convert_project_to_property_data(full_project)
        assert abs(property_data['discount_rate'] - 0.1234) < 0.0001
        
    def test_cashflow_totals_match_budget(self, project_with_financials):
        """Test that cash flow totals match budget totals."""
        budget_items = BudgetItem.objects.filter(project=project_with_financials)
        total_budget = sum(item.amount for item in budget_items)
        
        cashflows = convert_budget_items_to_cashflow(list(budget_items), periods=12)
        total_cashflow = sum(cashflows)
        
        assert abs(float(total_budget) - total_cashflow) < 0.01
