"""
Extended User models for authentication and permissions.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """
    Extended User model with additional fields.
    Extends Django's AbstractUser for authentication.
    """
    
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    company = models.CharField(max_length=200, null=True, blank=True)
    role = models.CharField(max_length=50, default='user')
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        db_table = 'auth_user'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.email


class UserProfile(models.Model):
    """Extended user profile information."""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(null=True, blank=True)
    avatar_url = models.URLField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    preferences = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'user_profile'
    
    def __str__(self):
        return f"Profile for {self.user.email}"


class APIKey(models.Model):
    """API key for programmatic access."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=64, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'api_keys'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.user.email}"
    
    def is_valid(self):
        """Check if API key is valid and not expired."""
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True


class PasswordResetToken(models.Model):
    """Password reset token."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_tokens')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        db_table = 'password_reset_tokens'
        ordering = ['-created_at']
    
    def is_valid(self):
        """Check if token is valid and not expired."""
        if self.used_at:
            return False
        if self.expires_at < timezone.now():
            return False
        return True
