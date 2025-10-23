"""
Unit and API tests for Financial app.
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
from apps.financial.models import (
    BudgetItem, ActualItem, FinancialCategory,
    FinancialAccountCode, FinancialAccountGroup
)

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user():
    return User.objects.create_user(
        username="finuser",
        email="fin@example.com",
        password="test123"
    )


@pytest.fixture
def auth_client(api_client, auth_user):
    api_client.force_authenticate(user=auth_user)
    return api_client


@pytest.fixture
def test_project():
    return Project.objects.create(project_name="Financial Test Project")


@pytest.fixture
def container(test_project):
    ctype = ContainerType.objects.create(
        type_code="PHASE",
        type_name="Phase"
    )
    return Container.objects.create(
        project=test_project,
        container_type=ctype,
        container_name="Phase 1",
        display_order=1
    )


@pytest.fixture
def category():
    return FinancialCategory.objects.create(
        category_code="REVENUE",
        category_name="Revenue",
        category_type="income"
    )


@pytest.fixture
def account_group():
    return FinancialAccountGroup.objects.create(
        group_code="SALES",
        group_name="Sales Revenue"
    )


@pytest.fixture
def account_code(category, account_group):
    return FinancialAccountCode.objects.create(
        account_code="4000",
        account_name="Sales",
        category=category,
        group=account_group
    )


@pytest.mark.django_db
class TestFinancialModels:
    """Test Financial models."""
    
    def test_create_budget_item(self, test_project, container, account_code):
        """Test creating a budget item."""
        budget = BudgetItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("100000.00"),
            period_start=date(2025, 1, 1),
            period_end=date(2025, 12, 31),
            fiscal_year=2025
        )
        assert budget.budget_id is not None
        assert budget.amount == Decimal("100000.00")
        assert budget.fiscal_year == 2025
        
    def test_create_actual_item(self, test_project, container, account_code):
        """Test creating an actual item."""
        actual = ActualItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("95000.00"),
            transaction_date=date(2025, 6, 15),
            fiscal_year=2025,
            description="Q2 sales"
        )
        assert actual.actual_id is not None
        assert actual.amount == Decimal("95000.00")
        assert actual.description == "Q2 sales"
        
    def test_budget_item_ordering(self, test_project, container, account_code):
        """Test budget items are ordered by period_start."""
        b1 = BudgetItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("1000"),
            period_start=date(2025, 3, 1)
        )
        b2 = BudgetItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("2000"),
            period_start=date(2025, 1, 1)
        )
        
        items = list(BudgetItem.objects.filter(project=test_project))
        assert items[0].budget_id == b2.budget_id
        assert items[1].budget_id == b1.budget_id
        
    def test_financial_category_str(self, category):
        """Test FinancialCategory __str__ method."""
        assert str(category) == "REVENUE - Revenue"
        
    def test_account_code_relationships(self, account_code, category, account_group):
        """Test account code relationships."""
        assert account_code.category.category_code == "REVENUE"
        assert account_code.group.group_code == "SALES"


@pytest.mark.django_db
class TestBudgetAPI:
    """Test Budget API endpoints."""
    
    def test_list_budgets(self, auth_client, test_project, container, account_code):
        """Test GET /api/budget/ - list budget items."""
        BudgetItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("100000")
        )
        BudgetItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("200000")
        )
        
        response = auth_client.get('/api/budget/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
        
    def test_create_budget(self, auth_client, test_project, container, account_code):
        """Test POST /api/budget/ - create budget item."""
        data = {
            'project': test_project.project_id,
            'container': container.container_id,
            'account_code': account_code.account_id,
            'amount': '150000.00',
            'period_start': '2025-01-01',
            'period_end': '2025-12-31',
            'fiscal_year': 2025
        }
        
        response = auth_client.post('/api/budget/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert Decimal(response.data['amount']) == Decimal('150000.00')
        
    def test_update_budget(self, auth_client, test_project, container, account_code):
        """Test PUT /api/budget/:id/ - update budget item."""
        budget = BudgetItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("100000")
        )
        
        data = {
            'project': test_project.project_id,
            'container': container.container_id,
            'account_code': account_code.account_id,
            'amount': '125000.00'
        }
        
        response = auth_client.patch(
            f'/api/budget/{budget.budget_id}/',
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        assert Decimal(response.data['amount']) == Decimal('125000.00')
        
    def test_delete_budget(self, auth_client, test_project, container, account_code):
        """Test DELETE /api/budget/:id/ - delete budget item."""
        budget = BudgetItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("100000")
        )
        
        response = auth_client.delete(f'/api/budget/{budget.budget_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not BudgetItem.objects.filter(budget_id=budget.budget_id).exists()
        
    def test_budget_rollup_endpoint(self, auth_client, test_project, container, account_code):
        """Test GET /api/budget/rollup/?project_id=X - budget rollup."""
        BudgetItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("100000"),
            fiscal_year=2025
        )
        BudgetItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("200000"),
            fiscal_year=2025
        )
        
        response = auth_client.get(f'/api/budget/rollup/?project_id={test_project.project_id}')
        assert response.status_code == status.HTTP_200_OK
        assert 'total_budget' in response.data
        assert Decimal(response.data['total_budget']) == Decimal('300000')


@pytest.mark.django_db
class TestActualAPI:
    """Test Actual API endpoints."""
    
    def test_list_actuals(self, auth_client, test_project, container, account_code):
        """Test GET /api/actual/ - list actual items."""
        ActualItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("95000"),
            transaction_date=date(2025, 6, 15)
        )
        
        response = auth_client.get('/api/actual/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        
    def test_create_actual(self, auth_client, test_project, container, account_code):
        """Test POST /api/actual/ - create actual item."""
        data = {
            'project': test_project.project_id,
            'container': container.container_id,
            'account_code': account_code.account_id,
            'amount': '87500.00',
            'transaction_date': '2025-07-01',
            'fiscal_year': 2025,
            'description': 'July sales'
        }
        
        response = auth_client.post('/api/actual/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['description'] == 'July sales'
        
    def test_actual_rollup_endpoint(self, auth_client, test_project, container, account_code):
        """Test GET /api/actual/rollup/?project_id=X - actual rollup."""
        ActualItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("50000"),
            transaction_date=date(2025, 1, 15)
        )
        ActualItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("75000"),
            transaction_date=date(2025, 2, 15)
        )
        
        response = auth_client.get(f'/api/actual/rollup/?project_id={test_project.project_id}')
        assert response.status_code == status.HTTP_200_OK
        assert 'total_actual' in response.data
        assert Decimal(response.data['total_actual']) == Decimal('125000')


@pytest.mark.django_db
class TestVarianceAPI:
    """Test variance calculation endpoint."""
    
    def test_variance_calculation(self, auth_client, test_project, container, account_code):
        """Test GET /api/variance/?project_id=X - budget vs actual variance."""
        BudgetItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("100000"),
            fiscal_year=2025
        )
        ActualItem.objects.create(
            project=test_project,
            container=container,
            account_code=account_code,
            amount=Decimal("95000"),
            transaction_date=date(2025, 6, 15),
            fiscal_year=2025
        )
        
        response = auth_client.get(f'/api/variance/?project_id={test_project.project_id}')
        assert response.status_code == status.HTTP_200_OK
        assert 'variance' in response.data
        assert Decimal(response.data['variance']) == Decimal('-5000')
        assert Decimal(response.data['variance_pct']) == Decimal('-5.00')
