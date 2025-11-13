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


class UserPreference(models.Model):
    """
    User preferences with flexible JSON storage.
    Supports both global and scoped (project-specific) preferences.

    Common preference_key patterns:
    - 'theme': UI theme settings
    - 'budget.grouping': Budget grid grouping state
    - 'budget.filters': Budget filter preferences
    - 'budget.columns': Column visibility/order
    - 'grid.pageSize': Grid pagination settings
    - 'map.defaults': Map view defaults
    """

    SCOPE_GLOBAL = 'global'
    SCOPE_PROJECT = 'project'
    SCOPE_ORGANIZATION = 'organization'

    SCOPE_CHOICES = [
        (SCOPE_GLOBAL, 'Global'),
        (SCOPE_PROJECT, 'Project'),
        (SCOPE_ORGANIZATION, 'Organization'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='preferences',
        db_column='user_id'
    )
    preference_key = models.CharField(max_length=255, db_index=True)
    preference_value = models.JSONField(default=dict)
    scope_type = models.CharField(
        max_length=50,
        choices=SCOPE_CHOICES,
        default=SCOPE_GLOBAL,
        db_index=True
    )
    scope_id = models.IntegerField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tbl_user_preference'
        unique_together = [['user', 'preference_key', 'scope_type', 'scope_id']]
        indexes = [
            models.Index(fields=['user', 'scope_type', 'scope_id']),
            models.Index(fields=['preference_key']),
            models.Index(fields=['-updated_at']),
        ]
        ordering = ['-updated_at']

    def __str__(self):
        scope_str = f"{self.scope_type}:{self.scope_id}" if self.scope_id else self.scope_type
        return f"{self.user.email} - {self.preference_key} ({scope_str})"

    @classmethod
    def get_preference(cls, user, key, scope_type='global', scope_id=None, default=None):
        """
        Retrieve a preference value.
        Returns default if not found.
        """
        try:
            pref = cls.objects.get(
                user=user,
                preference_key=key,
                scope_type=scope_type,
                scope_id=scope_id
            )
            pref.last_accessed_at = timezone.now()
            pref.save(update_fields=['last_accessed_at'])
            return pref.preference_value
        except cls.DoesNotExist:
            return default

    @classmethod
    def set_preference(cls, user, key, value, scope_type='global', scope_id=None):
        """
        Set or update a preference value.
        Returns the created/updated preference instance.
        """
        pref, created = cls.objects.update_or_create(
            user=user,
            preference_key=key,
            scope_type=scope_type,
            scope_id=scope_id,
            defaults={
                'preference_value': value,
                'last_accessed_at': timezone.now()
            }
        )
        return pref

    @classmethod
    def get_all_for_user(cls, user, scope_type=None, scope_id=None):
        """
        Get all preferences for a user, optionally filtered by scope.
        Returns dict of {preference_key: preference_value}
        """
        qs = cls.objects.filter(user=user)
        if scope_type:
            qs = qs.filter(scope_type=scope_type)
        if scope_id is not None:
            qs = qs.filter(scope_id=scope_id)

        return {pref.preference_key: pref.preference_value for pref in qs}
