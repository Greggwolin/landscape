"""URL routing for authentication endpoints."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_auth import (
    UserRegistrationView,
    UserLoginView,
    UserLogoutView,
    UserProfileView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    APIKeyViewSet,
    UserManagementViewSet,
)

router = DefaultRouter()
router.register(r'api-keys', APIKeyViewSet, basename='api-key')
router.register(r'users', UserManagementViewSet, basename='user-management')

urlpatterns = [
    # Authentication
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('logout/', UserLogoutView.as_view(), name='logout'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    
    # Password reset
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # API keys and user management
    path('', include(router.urls)),
]
