"""Admin interface for authentication models."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models_user import User, UserProfile, APIKey, PasswordResetToken


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin for User model."""
    
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff', 'created_at']
    list_filter = ['role', 'is_active', 'is_staff', 'is_superuser', 'is_verified']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'company']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email', 'phone', 'company')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'is_verified', 'groups', 'user_permissions')}),
        ('Metadata', {'fields': ('last_login', 'last_login_ip', 'created_at', 'updated_at')}),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'last_login', 'last_login_ip']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin for UserProfile model."""
    
    list_display = ['user', 'timezone']
    search_fields = ['user__email', 'user__username']
    autocomplete_fields = ['user']


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    """Admin for APIKey model."""
    
    list_display = ['name', 'user', 'is_active', 'created_at', 'last_used_at', 'expires_at']
    list_filter = ['is_active', 'created_at', 'expires_at']
    search_fields = ['name', 'user__email', 'key']
    readonly_fields = ['created_at', 'last_used_at']
    autocomplete_fields = ['user']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'name', 'key', 'is_active')
        }),
        ('Dates', {
            'fields': ('created_at', 'last_used_at', 'expires_at')
        }),
    )


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    """Admin for PasswordResetToken model."""
    
    list_display = ['user', 'created_at', 'expires_at', 'used_at']
    list_filter = ['created_at', 'expires_at']
    search_fields = ['user__email', 'token']
    readonly_fields = ['created_at', 'used_at']
    autocomplete_fields = ['user']
