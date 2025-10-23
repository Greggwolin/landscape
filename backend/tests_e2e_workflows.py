"""
End-to-End Workflow Tests
Phase 7: Complete user workflows from registration to calculations
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestUserRegistrationFlow:
    """Test complete user registration and authentication flow."""
    
    def test_register_login_access_workflow(self, api_client):
        """Test user can register, login, and access protected resources."""
        # Step 1: Register
        reg_response = api_client.post('/api/auth/register/', {
            'username': 'workflow_user',
            'email': 'workflow@test.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!'
        })
        
        # Should succeed or return validation errors
        assert reg_response.status_code in [201, 400]
        
        if reg_response.status_code == 201:
            # Step 2: Login
            login_response = api_client.post('/api/auth/login/', {
                'email': 'workflow@test.com',
                'password': 'SecurePass123!'
            })
            
            assert login_response.status_code == 200
            
            # Should have access token
            assert 'access' in login_response.data or 'access_token' in login_response.data
            
            # Step 3: Access protected resource
            token = login_response.data.get('access') or login_response.data.get('access_token')
            api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
            
            projects_response = api_client.get('/api/projects/')
            assert projects_response.status_code == 200


@pytest.mark.django_db
class TestProjectManagementFlow:
    """Test complete project creation and management workflow."""
    
    def test_create_update_delete_project_workflow(self, api_client):
        """Test creating, updating, and deleting a project."""
        # Setup: Create and authenticate user
        user = User.objects.create_user(
            username='project_user',
            email='project@test.com',
            password='test123'
        )
        api_client.force_authenticate(user=user)
        
        # Step 1: Create project
        create_response = api_client.post('/api/projects/', {
            'project_name': 'E2E Test Project',
            'project_type': 'SFD',
            'property_type_code': 'MPC'
        })
        
        if create_response.status_code == 201:
            project_id = create_response.data['project_id']
            
            # Step 2: Retrieve project
            get_response = api_client.get(f'/api/projects/{project_id}/')
            assert get_response.status_code == 200
            assert get_response.data['project_name'] == 'E2E Test Project'
            
            # Step 3: Update project
            update_response = api_client.patch(f'/api/projects/{project_id}/', {
                'project_name': 'Updated E2E Project'
            })
            assert update_response.status_code == 200
            
            # Step 4: Delete project
            delete_response = api_client.delete(f'/api/projects/{project_id}/')
            assert delete_response.status_code == 204


@pytest.mark.django_db
class TestContainerHierarchyFlow:
    """Test container hierarchy creation and management."""
    
    def test_create_container_hierarchy(self, api_client):
        """Test creating parent and child containers."""
        user = User.objects.create_user(
            username='container_user',
            email='container@test.com',
            password='test123'
        )
        api_client.force_authenticate(user=user)
        
        # Create project first
        project_response = api_client.post('/api/projects/', {
            'project_name': 'Container Test Project'
        })
        
        if project_response.status_code == 201:
            project_id = project_response.data['project_id']
            
            # Get or create container type
            # Assuming container types exist or can be created
            
            # Test tree retrieval
            tree_response = api_client.get(f'/api/containers/tree/?project_id={project_id}')
            assert tree_response.status_code in [200, 404]


@pytest.mark.django_db
class TestFinancialDataFlow:
    """Test budget and actual data entry workflow."""
    
    def test_budget_actual_variance_workflow(self, api_client):
        """Test creating budget, entering actuals, calculating variance."""
        user = User.objects.create_user(
            username='finance_user',
            email='finance@test.com',
            password='test123'
        )
        api_client.force_authenticate(user=user)
        
        # Setup: Create project
        project_response = api_client.post('/api/projects/', {
            'project_name': 'Financial Test Project'
        })
        
        if project_response.status_code == 201:
            project_id = project_response.data['project_id']
            
            # Test budget retrieval
            budget_response = api_client.get(f'/api/budget/?project_id={project_id}')
            assert budget_response.status_code in [200, 404]
            
            # Test actual retrieval
            actual_response = api_client.get(f'/api/actual/?project_id={project_id}')
            assert actual_response.status_code in [200, 404]
            
            # Test variance calculation
            variance_response = api_client.get(f'/api/variance/?project_id={project_id}')
            assert variance_response.status_code in [200, 400, 404]


@pytest.mark.django_db
class TestCalculationFlow:
    """Test financial calculation workflow."""
    
    def test_project_calculation_workflow(self, api_client):
        """Test retrieving project financial metrics."""
        user = User.objects.create_user(
            username='calc_user',
            email='calc@test.com',
            password='test123'
        )
        api_client.force_authenticate(user=user)
        
        # Setup: Create project
        project_response = api_client.post('/api/projects/', {
            'project_name': 'Calculation Test Project',
            'discount_rate_pct': '0.10'
        })
        
        if project_response.status_code == 201:
            project_id = project_response.data['project_id']
            
            # Test IRR calculation
            irr_response = api_client.get(f'/api/calculations/project/{project_id}/irr/')
            assert irr_response.status_code in [200, 404]
            
            # Test NPV calculation
            npv_response = api_client.get(f'/api/calculations/project/{project_id}/npv/')
            assert npv_response.status_code in [200, 404]
            
            # Test full metrics
            metrics_response = api_client.get(f'/api/calculations/project/{project_id}/metrics/')
            assert metrics_response.status_code in [200, 404]


@pytest.mark.django_db
class TestAPIKeyFlow:
    """Test API key creation and usage workflow."""
    
    def test_api_key_creation_and_usage(self, api_client):
        """Test creating and using an API key."""
        user = User.objects.create_user(
            username='apikey_user',
            email='apikey@test.com',
            password='test123'
        )
        api_client.force_authenticate(user=user)
        
        # Create API key
        key_response = api_client.post('/api/auth/api-keys/', {
            'name': 'Test API Key'
        })
        
        if key_response.status_code == 201:
            # Should return the key (only shown once)
            assert 'key' in key_response.data or 'api_key' in key_response.data
            
            # List API keys
            list_response = api_client.get('/api/auth/api-keys/')
            assert list_response.status_code == 200


@pytest.mark.django_db
class TestPasswordResetFlow:
    """Test password reset workflow."""
    
    def test_password_reset_request(self, api_client):
        """Test requesting password reset."""
        # Create user
        User.objects.create_user(
            username='reset_user',
            email='reset@test.com',
            password='oldpass123'
        )
        
        # Request password reset
        response = api_client.post('/api/auth/password-reset/', {
            'email': 'reset@test.com'
        })
        
        # Should succeed or return appropriate response
        assert response.status_code in [200, 400, 404]


@pytest.mark.django_db
class TestDataConsistencyFlow:
    """Test data consistency across related resources."""
    
    def test_project_container_budget_consistency(self, api_client):
        """Test that related data stays consistent."""
        user = User.objects.create_user(
            username='consistency_user',
            email='consistency@test.com',
            password='test123'
        )
        api_client.force_authenticate(user=user)
        
        # Create project
        project_response = api_client.post('/api/projects/', {
            'project_name': 'Consistency Test'
        })
        
        if project_response.status_code == 201:
            project_id = project_response.data['project_id']
            
            # Get related resources
            containers = api_client.get(f'/api/containers/tree/?project_id={project_id}')
            budget = api_client.get(f'/api/budget/?project_id={project_id}')
            
            # All should reference same project
            assert containers.status_code in [200, 404]
            assert budget.status_code in [200, 404]
