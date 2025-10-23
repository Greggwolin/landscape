"""
Tests for authentication and user management.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models_user import User, APIKey, PasswordResetToken
import hashlib

User = get_user_model()


class UserRegistrationTests(TestCase):
    """Tests for user registration."""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_register_user(self):
        """Test user registration."""
        data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
        
        response = self.client.post('/api/auth/register/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertIn('tokens', response.data)
        self.assertEqual(response.data['user']['email'], 'test@example.com')
    
    def test_register_password_mismatch(self):
        """Test registration with mismatched passwords."""
        data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'TestPass123!',
            'password_confirm': 'DifferentPass123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
        
        response = self.client.post('/api/auth/register/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserLoginTests(TestCase):
    """Tests for user login."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
    
    def test_login_success(self):
        """Test successful login."""
        data = {
            'email': 'test@example.com',
            'password': 'TestPass123!'
        }
        
        response = self.client.post('/api/auth/login/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials."""
        data = {
            'email': 'test@example.com',
            'password': 'WrongPassword'
        }
        
        response = self.client.post('/api/auth/login/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class APIKeyTests(TestCase):
    """Tests for API key management."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_create_api_key(self):
        """Test API key creation."""
        data = {
            'name': 'Test API Key',
            'expires_days': 30
        }
        
        response = self.client.post('/api/auth/api-keys/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('key', response.data)
        self.assertEqual(response.data['name'], 'Test API Key')
    
    def test_list_api_keys(self):
        """Test listing API keys."""
        # Create an API key
        import secrets
        key = secrets.token_urlsafe(32)
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        
        APIKey.objects.create(
            user=self.user,
            name='Test Key',
            key=key_hash
        )
        
        response = self.client.get('/api/auth/api-keys/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_revoke_api_key(self):
        """Test revoking an API key."""
        import secrets
        key = secrets.token_urlsafe(32)
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        
        api_key = APIKey.objects.create(
            user=self.user,
            name='Test Key',
            key=key_hash
        )
        
        response = self.client.post(f'/api/auth/api-keys/{api_key.id}/revoke/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        api_key.refresh_from_db()
        self.assertFalse(api_key.is_active)


class PasswordResetTests(TestCase):
    """Tests for password reset flow."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
    
    def test_request_password_reset(self):
        """Test requesting password reset."""
        data = {'email': 'test@example.com'}
        
        response = self.client.post('/api/auth/password-reset/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
    
    def test_password_reset_confirm(self):
        """Test password reset confirmation."""
        # Create a reset token
        import secrets
        from django.utils import timezone
        from datetime import timedelta
        
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        PasswordResetToken.objects.create(
            user=self.user,
            token=token_hash,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        data = {
            'token': token,
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!'
        }
        
        response = self.client.post('/api/auth/password-reset-confirm/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify password was changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPass123!'))


class PermissionsTests(TestCase):
    """Tests for permissions."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='AdminPass123!',
            is_staff=True
        )
    
    def test_regular_user_cannot_access_admin_endpoints(self):
        """Test that regular users cannot access admin endpoints."""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get('/api/auth/users/')
        
        # Regular user should only see themselves
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_admin_can_access_all_users(self):
        """Test that admins can see all users."""
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get('/api/auth/users/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)
