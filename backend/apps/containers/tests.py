"""
Unit and API tests for Containers app.
Phase 6: Testing Enhancement
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.projects.models import Project
from apps.containers.models import Container, ContainerType

User = get_user_model()


@pytest.fixture
def api_client():
    """Fixture for API client."""
    return APIClient()


@pytest.fixture
def auth_user():
    """Fixture for authenticated user."""
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123"
    )


@pytest.fixture
def auth_client(api_client, auth_user):
    """Fixture for authenticated API client."""
    api_client.force_authenticate(user=auth_user)
    return api_client


@pytest.fixture
def test_project():
    """Fixture for test project."""
    return Project.objects.create(
        project_name="Test Project"
    )


@pytest.fixture
def container_type():
    """Fixture for container type."""
    return ContainerType.objects.create(
        type_code="PHASE",
        type_name="Phase",
        description="Development phase"
    )


@pytest.mark.django_db
class TestContainerModel:
    """Test Container model functionality."""
    
    def test_create_container(self, test_project, container_type):
        """Test creating a container."""
        container = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="Phase 1",
            display_order=1
        )
        assert container.container_id is not None
        assert container.container_name == "Phase 1"
        assert container.project.project_id == test_project.project_id
        
    def test_container_hierarchy(self, test_project, container_type):
        """Test container parent-child relationships."""
        parent = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="Parent",
            display_order=1
        )
        child1 = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="Child 1",
            parent_container=parent,
            display_order=1
        )
        child2 = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="Child 2",
            parent_container=parent,
            display_order=2
        )
        
        # Test relationships
        children = parent.children.all()
        assert children.count() == 2
        assert child1 in children
        assert child2 in children
        assert child1.parent_container.container_id == parent.container_id
        
    def test_container_ordering(self, test_project, container_type):
        """Test containers are ordered by display_order."""
        c1 = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="C1",
            display_order=3
        )
        c2 = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="C2",
            display_order=1
        )
        c3 = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="C3",
            display_order=2
        )
        
        containers = list(Container.objects.filter(project=test_project))
        assert containers[0].container_id == c2.container_id
        assert containers[1].container_id == c3.container_id
        assert containers[2].container_id == c1.container_id
        
    def test_container_str_method(self, test_project, container_type):
        """Test Container __str__ method."""
        container = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="String Test"
        )
        assert str(container) == "String Test"


@pytest.mark.django_db
class TestContainerTypeModel:
    """Test ContainerType model."""
    
    def test_create_container_type(self):
        """Test creating a container type."""
        ctype = ContainerType.objects.create(
            type_code="BUILDING",
            type_name="Building",
            description="Building container"
        )
        assert ctype.type_code == "BUILDING"
        assert ctype.type_name == "Building"
        assert str(ctype) == "BUILDING - Building"


@pytest.mark.django_db
class TestContainerAPI:
    """Test Container API endpoints."""
    
    def test_list_containers(self, auth_client, test_project, container_type):
        """Test GET /api/containers/ - list containers."""
        Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="Container 1",
            display_order=1
        )
        Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="Container 2",
            display_order=2
        )
        
        response = auth_client.get('/api/containers/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
        
    def test_retrieve_container(self, auth_client, test_project, container_type):
        """Test GET /api/containers/:id/ - retrieve container."""
        container = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="Test Container",
            display_order=1
        )
        
        response = auth_client.get(f'/api/containers/{container.container_id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['container_name'] == "Test Container"
        
    def test_create_container(self, auth_client, test_project, container_type):
        """Test POST /api/containers/ - create container."""
        data = {
            'project': test_project.project_id,
            'container_type': container_type.type_id,
            'container_name': 'New Container',
            'display_order': 1
        }
        
        response = auth_client.post('/api/containers/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['container_name'] == 'New Container'
        
        # Verify in database
        container = Container.objects.get(container_id=response.data['container_id'])
        assert container.container_name == 'New Container'
        
    def test_update_container(self, auth_client, test_project, container_type):
        """Test PUT /api/containers/:id/ - update container."""
        container = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="Original Name",
            display_order=1
        )
        
        data = {
            'project': test_project.project_id,
            'container_type': container_type.type_id,
            'container_name': 'Updated Name',
            'display_order': 2
        }
        
        response = auth_client.put(
            f'/api/containers/{container.container_id}/',
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['container_name'] == 'Updated Name'
        
    def test_delete_container(self, auth_client, test_project, container_type):
        """Test DELETE /api/containers/:id/ - delete container."""
        container = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="To Delete",
            display_order=1
        )
        
        response = auth_client.delete(f'/api/containers/{container.container_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify deletion
        assert not Container.objects.filter(container_id=container.container_id).exists()
        
    def test_tree_endpoint(self, auth_client, test_project, container_type):
        """Test GET /api/containers/tree/?project_id=X - tree structure."""
        parent = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="Parent",
            display_order=1
        )
        child = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="Child",
            parent_container=parent,
            display_order=1
        )
        
        response = auth_client.get(f'/api/containers/tree/?project_id={test_project.project_id}')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1  # One root node
        assert response.data[0]['container_name'] == "Parent"
        assert len(response.data[0]['children']) == 1
        assert response.data[0]['children'][0]['container_name'] == "Child"
        
    def test_unauthorized_access(self, api_client, test_project, container_type):
        """Test that unauthenticated requests are rejected."""
        container = Container.objects.create(
            project=test_project,
            container_type=container_type,
            container_name="Test",
            display_order=1
        )
        
        response = api_client.get(f'/api/containers/{container.container_id}/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestContainerTypeAPI:
    """Test ContainerType API endpoints."""
    
    def test_list_container_types(self, auth_client):
        """Test GET /api/container-types/ - list container types."""
        ContainerType.objects.create(
            type_code="TYPE1",
            type_name="Type 1"
        )
        ContainerType.objects.create(
            type_code="TYPE2",
            type_name="Type 2"
        )
        
        response = auth_client.get('/api/container-types/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 2
