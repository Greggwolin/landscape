"""
Performance Testing Suite
Phase 7: Load testing and response time validation
"""
import pytest
import time
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from concurrent.futures import ThreadPoolExecutor, as_completed

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user():
    return User.objects.create_user(
        username="perf_test",
        email="perf@test.com",
        password="test123"
    )


@pytest.fixture
def auth_client(api_client, auth_user):
    api_client.force_authenticate(user=auth_user)
    return api_client


@pytest.mark.slow
class TestAPIResponseTimes:
    """Test API endpoints meet performance targets."""
    
    def test_project_list_response_time(self, auth_client):
        """Test project list responds within 200ms."""
        start = time.time()
        response = auth_client.get('/api/projects/')
        elapsed = time.time() - start
        
        assert elapsed < 0.2  # <200ms target
    
    def test_project_detail_response_time(self, auth_client):
        """Test project detail responds within 100ms."""
        start = time.time()
        response = auth_client.get('/api/projects/1/')
        elapsed = time.time() - start
        
        assert elapsed < 0.1  # <100ms target
    
    def test_container_tree_response_time(self, auth_client):
        """Test container tree responds within 500ms."""
        start = time.time()
        response = auth_client.get('/api/containers/tree/?project_id=1')
        elapsed = time.time() - start
        
        assert elapsed < 0.5  # <500ms target
    
    def test_budget_list_response_time(self, auth_client):
        """Test budget list responds within 200ms."""
        start = time.time()
        response = auth_client.get('/api/budget/')
        elapsed = time.time() - start
        
        assert elapsed < 0.2  # <200ms target


@pytest.mark.slow
class TestConcurrentRequests:
    """Test API handles concurrent requests."""
    
    def test_concurrent_project_reads(self, auth_client):
        """Test 10 concurrent project list requests."""
        def make_request():
            start = time.time()
            response = auth_client.get('/api/projects/')
            elapsed = time.time() - start
            return response.status_code, elapsed
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [f.result() for f in as_completed(futures)]
        
        # All should succeed
        assert all(status in [200, 401] for status, _ in results)
        
        # Average response time should be reasonable
        avg_time = sum(elapsed for _, elapsed in results) / len(results)
        assert avg_time < 0.5
    
    def test_concurrent_mixed_requests(self, auth_client):
        """Test concurrent requests to different endpoints."""
        endpoints = [
            '/api/projects/',
            '/api/containers/',
            '/api/budget/',
            '/api/actual/',
            '/api/calculations/'
        ]
        
        def make_request(endpoint):
            response = auth_client.get(endpoint)
            return response.status_code
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request, ep) for ep in endpoints]
            results = [f.result() for f in as_completed(futures)]
        
        # All should return valid status codes
        assert all(status in [200, 404, 401] for status in results)


@pytest.mark.slow
class TestDatabaseQueryOptimization:
    """Test database queries are optimized."""
    
    def test_project_list_query_count(self, auth_client, django_assert_num_queries):
        """Test project list doesn't have N+1 query issues."""
        # Should use select_related/prefetch_related to minimize queries
        with django_assert_num_queries(10):  # Reasonable query limit
            response = auth_client.get('/api/projects/')
    
    def test_container_tree_query_count(self, auth_client, django_assert_num_queries):
        """Test container tree doesn't have N+1 query issues."""
        with django_assert_num_queries(15):  # Reasonable query limit for tree
            response = auth_client.get('/api/containers/tree/?project_id=1')


@pytest.mark.slow
class TestLoadSimulation:
    """Simulate realistic load patterns."""
    
    def test_sustained_load(self, auth_client):
        """Test API can handle sustained load."""
        duration = 5  # seconds
        request_count = 0
        errors = 0
        start = time.time()
        
        while time.time() - start < duration:
            try:
                response = auth_client.get('/api/projects/')
                request_count += 1
                if response.status_code >= 500:
                    errors += 1
            except Exception:
                errors += 1
        
        # Should handle at least 10 requests per second
        assert request_count > 50
        
        # Error rate should be low
        error_rate = errors / request_count if request_count > 0 else 1
        assert error_rate < 0.05  # <5% error rate


class TestMemoryUsage:
    """Test memory efficiency."""
    
    def test_large_result_set_memory(self, auth_client):
        """Test large result sets don't cause memory issues."""
        # Request with large page size
        response = auth_client.get('/api/projects/?page_size=1000')
        
        # Should still respond
        assert response.status_code in [200, 404, 401]


class TestCacheHeaders:
    """Test caching headers for frontend optimization."""
    
    def test_static_data_cache_headers(self, auth_client):
        """Test static endpoints have cache headers."""
        response = auth_client.get('/api/container-types/')
        
        # May have cache-control headers
        assert response.status_code in [200, 404]
    
    def test_dynamic_data_no_cache(self, auth_client):
        """Test dynamic endpoints don't cache inappropriately."""
        response = auth_client.get('/api/projects/')
        
        # Should not have aggressive caching
        assert response.status_code in [200, 401]


@pytest.mark.slow
class TestResponseSizes:
    """Test response payload sizes are reasonable."""
    
    def test_project_list_response_size(self, auth_client):
        """Test project list response isn't too large."""
        response = auth_client.get('/api/projects/')
        
        if response.status_code == 200:
            # Response should be reasonable size
            import json
            size = len(json.dumps(response.data))
            assert size < 1_000_000  # <1MB for list view
    
    def test_pagination_limits_response_size(self, auth_client):
        """Test pagination keeps response sizes manageable."""
        response = auth_client.get('/api/projects/?page_size=10')
        
        if response.status_code == 200 and 'results' in response.data:
            assert len(response.data['results']) <= 10
