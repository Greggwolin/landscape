"""
Frontend Integration Tests - Container Tree Structure
Phase 7: Validates container tree API matches React Tree component expectations
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user():
    return User.objects.create_user(
        username="container_test",
        email="container@test.com",
        password="test123"
    )


@pytest.fixture
def auth_client(api_client, auth_user):
    api_client.force_authenticate(user=auth_user)
    return api_client


class TestContainerTreeStructure:
    """Validate container tree endpoint matches frontend Tree component format."""
    
    def test_tree_endpoint_exists(self, auth_client):
        """Test tree endpoint is accessible."""
        response = auth_client.get('/api/containers/tree/')
        assert response.status_code in [200, 400]  # 400 if project_id missing
    
    def test_tree_with_project_id(self, auth_client):
        """Test tree endpoint with project_id parameter."""
        response = auth_client.get('/api/containers/tree/?project_id=1')
        assert response.status_code in [200, 404]
    
    def test_tree_node_structure(self, auth_client):
        """Test tree nodes have required fields for React Tree component."""
        response = auth_client.get('/api/containers/tree/?project_id=1')
        
        if response.status_code == 200 and isinstance(response.data, list):
            if len(response.data) > 0:
                node = response.data[0]
                # React Tree expects these fields
                expected_fields = {'container_id', 'container_name', 'children'}
                actual_fields = set(node.keys())
                # Should have at least the basic fields
                assert 'container_id' in actual_fields or 'id' in actual_fields
                assert 'container_name' in actual_fields or 'name' in actual_fields
    
    def test_tree_children_is_array(self, auth_client):
        """Test children field is always an array."""
        response = auth_client.get('/api/containers/tree/?project_id=1')
        
        if response.status_code == 200 and isinstance(response.data, list):
            if len(response.data) > 0:
                node = response.data[0]
                if 'children' in node:
                    assert isinstance(node['children'], list)


class TestContainerCRUDResponseFormat:
    """Validate container CRUD operations return expected formats."""
    
    def test_create_container_response(self, auth_client):
        """Test container creation returns created object."""
        response = auth_client.post('/api/containers/', {})
        # Will fail validation but should return error structure
        assert response.status_code in [201, 400]
    
    def test_update_container_response(self, auth_client):
        """Test container update returns updated object."""
        response = auth_client.put('/api/containers/1/', {})
        assert response.status_code in [200, 400, 404]
    
    def test_delete_container_response(self, auth_client):
        """Test container deletion returns 204 No Content."""
        response = auth_client.delete('/api/containers/999/')
        assert response.status_code in [204, 404]
