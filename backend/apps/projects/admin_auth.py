"""Admin interface for authentication models."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models_user import User, UserProfile, APIKey, PasswordResetToken


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin for User model. Only visible to superusers and admin-role users."""

    list_display = ['username', 'email', 'first_name', 'last_name', 'plain_password', 'role', 'is_active', 'is_verified', 'created_at']
    list_filter = ['role', 'is_active', 'is_staff', 'is_superuser', 'is_verified']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'company']
    ordering = ['-created_at']

    fieldsets = (
        (None, {'fields': ('username', 'password', 'plain_password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email', 'phone', 'company')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'is_verified', 'groups', 'user_permissions')}),
        ('Metadata', {'fields': ('last_login', 'last_login_ip', 'created_at', 'updated_at')}),
    )

    readonly_fields = ['created_at', 'updated_at', 'last_login', 'last_login_ip']

    def save_model(self, request, obj, form, change):
        """Capture plaintext password when set via admin."""
        raw_pw = form.cleaned_data.get('password1') or form.cleaned_data.get('password')
        if raw_pw and not raw_pw.startswith(('pbkdf2_', 'bcrypt', 'argon2')):
            obj.plain_password = raw_pw
        super().save_model(request, obj, form, change)

    def has_module_permission(self, request):
        """Only admin-role users and superusers can see the Users section."""
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'role') and request.user.role == 'admin':
            return True
        return False

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_change_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return self.has_module_permission(request)

    def has_delete_permission(self, request, obj=None):
        return self.has_module_permission(request)


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
