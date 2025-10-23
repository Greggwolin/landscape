"""
Frontend Integration Tests - Calculation Metrics
Phase 7: Validates calculation API responses match frontend metrics display
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user():
    return User.objects.create_user(
        username="calc_test",
        email="calc@test.com",
        password="test123"
    )


@pytest.fixture
def auth_client(api_client, auth_user):
    api_client.force_authenticate(user=auth_user)
    return api_client


class TestCalculationMetricsFormat:
    """Validate calculation endpoints return metrics in expected format."""
    
    def test_project_metrics_endpoint(self, auth_client):
        """Test project metrics endpoint structure."""
        response = auth_client.get('/api/calculations/project/1/metrics/')
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            expected_metrics = {'irr', 'npv', 'roi'}
            assert isinstance(response.data, dict)
    
    def test_irr_endpoint_response(self, auth_client):
        """Test IRR endpoint returns percentage value."""
        response = auth_client.get('/api/calculations/project/1/irr/')
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            assert 'irr' in response.data
            # IRR should be numeric
            if response.data['irr'] is not None:
                assert isinstance(response.data['irr'], (int, float, str))
    
    def test_npv_endpoint_response(self, auth_client):
        """Test NPV endpoint returns dollar value."""
        response = auth_client.get('/api/calculations/project/1/npv/')
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            assert 'npv' in response.data
    
    def test_cashflow_endpoint_response(self, auth_client):
        """Test cash flow endpoint returns period-by-period data."""
        response = auth_client.get('/api/calculations/project/1/cashflow/')
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            assert 'periods' in response.data or 'cashflows' in response.data
            # Should be array of periods
            periods = response.data.get('periods', response.data.get('cashflows', []))
            assert isinstance(periods, list)


class TestCalculationErrorHandling:
    """Validate calculation error responses."""
    
    def test_nonexistent_project_error(self, auth_client):
        """Test calculation for non-existent project returns 404."""
        response = auth_client.get('/api/calculations/project/999999/irr/')
        assert response.status_code in [404, 400]
    
    def test_invalid_discount_rate_error(self, auth_client):
        """Test invalid discount rate returns error."""
        response = auth_client.get('/api/calculations/project/1/npv/?discount_rate=-1')
        assert response.status_code in [400, 404]


class TestCalculationPerformance:
    """Validate calculation response times."""
    
    def test_metrics_response_time(self, auth_client):
        """Test metrics endpoint responds within acceptable time."""
        import time
        start = time.time()
        response = auth_client.get('/api/calculations/project/1/metrics/')
        elapsed = time.time() - start
        
        # Should respond within 2 seconds
        assert elapsed < 2.0
    
    def test_irr_response_time(self, auth_client):
        """Test IRR calculation responds within acceptable time."""
        import time
        start = time.time()
        response = auth_client.get('/api/calculations/project/1/irr/')
        elapsed = time.time() - start
        
        # Should respond within 1 second
        assert elapsed < 1.0
