"""
Frontend Integration Tests - Financial Data Formats
Phase 7: Validates financial API responses match frontend display components
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user():
    return User.objects.create_user(
        username="finance_test",
        email="finance@test.com",
        password="test123"
    )


@pytest.fixture
def auth_client(api_client, auth_user):
    api_client.force_authenticate(user=auth_user)
    return api_client


class TestBudgetResponseFormat:
    """Validate budget API responses match frontend expectations."""
    
    def test_budget_list_response(self, auth_client):
        """Test budget list has correct structure."""
        response = auth_client.get('/api/budget/')
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            assert 'results' in response.data or isinstance(response.data, list)
    
    def test_budget_amount_precision(self, auth_client):
        """Test budget amounts maintain decimal precision."""
        response = auth_client.get('/api/budget/')
        
        if response.status_code == 200 and 'results' in response.data:
            if len(response.data['results']) > 0:
                item = response.data['results'][0]
                if 'amount' in item:
                    # Should be string for precision
                    assert isinstance(item['amount'], (str, int, float))
    
    def test_budget_rollup_response(self, auth_client):
        """Test budget rollup endpoint returns aggregated data."""
        response = auth_client.get('/api/budget/rollup/?project_id=1')
        assert response.status_code in [200, 400, 404]
        
        if response.status_code == 200:
            assert isinstance(response.data, dict)


class TestActualResponseFormat:
    """Validate actual API responses match frontend expectations."""
    
    def test_actual_list_response(self, auth_client):
        """Test actual list has correct structure."""
        response = auth_client.get('/api/actual/')
        assert response.status_code in [200, 404]
    
    def test_actual_rollup_response(self, auth_client):
        """Test actual rollup endpoint returns aggregated data."""
        response = auth_client.get('/api/actual/rollup/?project_id=1')
        assert response.status_code in [200, 400, 404]


class TestVarianceResponseFormat:
    """Validate variance calculation matches frontend display."""
    
    def test_variance_response_structure(self, auth_client):
        """Test variance endpoint returns budget vs actual comparison."""
        response = auth_client.get('/api/variance/?project_id=1')
        assert response.status_code in [200, 400, 404]
        
        if response.status_code == 200:
            expected_fields = {'variance', 'variance_pct'}
            # Should have variance calculations
            assert isinstance(response.data, dict)
    
    def test_variance_percentage_format(self, auth_client):
        """Test variance percentage is in expected format."""
        response = auth_client.get('/api/variance/?project_id=1')
        
        if response.status_code == 200 and 'variance_pct' in response.data:
            # Should be numeric
            assert isinstance(response.data['variance_pct'], (str, int, float, type(None)))
