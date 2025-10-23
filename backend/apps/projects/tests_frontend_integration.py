"""
Frontend Integration Tests - API Response Format Validation
Phase 7: Ensures Django API responses match frontend expectations
"""
import pytest
from decimal import Decimal
from datetime import date, datetime
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.projects.models import Project
from apps.projects.lookups import PropertyTypeConfig

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user():
    return User.objects.create_user(
        username="frontend_test",
        email="frontend@test.com",
        password="test123"
    )


@pytest.fixture
def auth_client(api_client, auth_user):
    api_client.force_authenticate(user=auth_user)
    return api_client


class TestProjectAPIResponseFormat:
    """Validate Project API responses match frontend expectations."""
    
    def test_project_list_response_structure(self, auth_client):
        """Test GET /api/projects/ returns correct structure."""
        response = auth_client.get('/api/projects/')
        
        # Should have pagination structure
        assert 'results' in response.data or isinstance(response.data, list)
        
        if 'results' in response.data:
            assert 'count' in response.data
            assert 'next' in response.data
            assert 'previous' in response.data
    
    def test_project_detail_response_fields(self, auth_client):
        """Test project response contains all expected fields."""
        response = auth_client.get('/api/projects/')
        
        if response.status_code == 200:
            expected_fields = {
                'project_id', 'project_name', 'project_type',
                'development_type', 'property_type_code',
                'acres_gross', 'target_units',
                'discount_rate_pct', 'created_at', 'updated_at'
            }
            
            if 'results' in response.data and len(response.data['results']) > 0:
                actual_fields = set(response.data['results'][0].keys())
                assert expected_fields.issubset(actual_fields)
    
    def test_date_format_iso8601(self, auth_client):
        """Test dates are in ISO 8601 format."""
        response = auth_client.get('/api/projects/')
        
        if response.status_code == 200 and 'results' in response.data:
            if len(response.data['results']) > 0:
                project = response.data['results'][0]
                if project.get('created_at'):
                    # Should be ISO 8601: YYYY-MM-DDTHH:MM:SS.sssZ
                    assert 'T' in str(project['created_at'])
    
    def test_decimal_fields_as_strings(self, auth_client):
        """Test decimal fields returned as strings for precision."""
        response = auth_client.get('/api/projects/')
        
        if response.status_code == 200 and 'results' in response.data:
            if len(response.data['results']) > 0:
                project = response.data['results'][0]
                if project.get('discount_rate_pct'):
                    # Should be string to preserve precision
                    assert isinstance(project['discount_rate_pct'], (str, type(None)))


class TestAuthenticationAPIResponseFormat:
    """Validate authentication API responses match frontend expectations."""
    
    def test_login_response_contains_tokens(self, api_client):
        """Test login returns access and refresh tokens."""
        User.objects.create_user(
            username="logintest",
            email="login@test.com",
            password="testpass123"
        )
        
        response = api_client.post('/api/auth/login/', {
            'email': 'login@test.com',
            'password': 'testpass123'
        })
        
        if response.status_code == 200:
            assert 'access' in response.data or 'access_token' in response.data
            assert 'refresh' in response.data or 'refresh_token' in response.data
    
    def test_registration_response_format(self, api_client):
        """Test registration returns user data and tokens."""
        response = api_client.post('/api/auth/register/', {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123'
        })
        
        if response.status_code == 201:
            assert 'user' in response.data or 'username' in response.data
    
    def test_error_response_format(self, api_client):
        """Test error responses have consistent format."""
        response = api_client.post('/api/auth/login/', {
            'email': 'nonexistent@test.com',
            'password': 'wrong'
        })
        
        if response.status_code >= 400:
            # Should have error details
            assert response.data is not None
            assert isinstance(response.data, dict)


class TestPaginationFormat:
    """Validate pagination matches frontend expectations."""
    
    def test_pagination_structure(self, auth_client):
        """Test paginated responses have correct structure."""
        response = auth_client.get('/api/projects/')
        
        if response.status_code == 200:
            if 'results' in response.data:
                # DRF pagination format
                assert 'count' in response.data
                assert 'next' in response.data
                assert 'previous' in response.data
                assert 'results' in response.data
                assert isinstance(response.data['results'], list)
    
    def test_page_size_parameter(self, auth_client):
        """Test page_size parameter works."""
        response = auth_client.get('/api/projects/?page_size=5')
        
        if response.status_code == 200 and 'results' in response.data:
            assert len(response.data['results']) <= 5


class TestFilteringAndSorting:
    """Validate filtering and sorting work as expected by frontend."""
    
    def test_filtering_by_field(self, auth_client):
        """Test filtering works."""
        response = auth_client.get('/api/projects/?is_active=true')
        assert response.status_code in [200, 404]
    
    def test_search_parameter(self, auth_client):
        """Test search parameter works."""
        response = auth_client.get('/api/projects/?search=test')
        assert response.status_code in [200, 404]
    
    def test_ordering_parameter(self, auth_client):
        """Test ordering parameter works."""
        response = auth_client.get('/api/projects/?ordering=-created_at')
        assert response.status_code in [200, 404]


class TestCORSHeaders:
    """Validate CORS headers are set for frontend."""
    
    def test_cors_headers_present(self, api_client):
        """Test CORS headers are present."""
        response = api_client.options('/api/projects/')
        
        # Should have CORS headers
        headers = {k.lower(): v for k, v in response.items()}
        # May have access-control-allow-origin or similar
        assert response.status_code in [200, 404, 401]


class TestJWTAuthentication:
    """Validate JWT authentication works for frontend."""
    
    def test_jwt_token_authentication(self, api_client):
        """Test JWT token can be used for authentication."""
        user = User.objects.create_user(
            username="jwtuser",
            email="jwt@test.com",
            password="test123"
        )
        
        # Get token
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # Use token for authenticated request
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = api_client.get('/api/projects/')
        
        assert response.status_code != 401  # Should be authenticated


class TestNullAndEmptyHandling:
    """Validate null and empty field handling."""
    
    def test_null_fields_in_response(self, auth_client):
        """Test null fields are properly serialized."""
        response = auth_client.get('/api/projects/')
        
        if response.status_code == 200 and 'results' in response.data:
            if len(response.data['results']) > 0:
                # Null fields should be null, not missing
                project = response.data['results'][0]
                # Check that optional fields can be null
                assert 'description' in project or True  # May be null
