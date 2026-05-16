"""
Custom permissions for role-based access control.
"""

from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allow write access only to object owner."""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Check if object has 'user' or 'created_by' attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow write access only to admin users."""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class IsSuperUserOnly(permissions.BasePermission):
    """Allow access only to superusers."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class HasRolePermission(permissions.BasePermission):
    """Check if user has required role."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        required_roles = getattr(view, 'required_roles', [])
        if not required_roles:
            return True
        
        return request.user.role in required_roles


class CanAccessProject(permissions.BasePermission):
    """Check if user can access a specific project."""
    
    def has_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_staff:
            return True
        
        # Check project access (would need to implement project membership)
        # For now, allow all authenticated users
        return request.user and request.user.is_authenticated


def is_admin_user(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    return bool(user.is_staff or user.is_superuser or getattr(user, 'role', None) == 'admin')


def filter_qs_by_owner_or_staff(qs, request, owner_path: str = 'created_by'):
    """
    Scope a queryset to the requesting user's owned rows, with a staff/admin override.

    owner_path examples:
      - 'created_by'                          (Case 3a: model has a direct created_by FK)
      - 'project__created_by'                 (Case 3b: transitive via project FK)
      - 'session__project__created_by'        (deeper joins as needed)
    """
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        return qs.none()
    if is_admin_user(user):
        return qs
    return qs.filter(**{owner_path: user})


class APIKeyPermission(permissions.BasePermission):
    """Custom permission for API key authentication."""
    
    def has_permission(self, request, view):
        # Check if request has valid API key in header
        api_key = request.META.get('HTTP_X_API_KEY')
        if not api_key:
            return False
        
        from .models_user import APIKey
        import hashlib
        
        # Hash the provided key
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        try:
            key_obj = APIKey.objects.get(key=key_hash)
            if key_obj.is_valid():
                # Update last used timestamp
                from django.utils import timezone
                key_obj.last_used_at = timezone.now()
                key_obj.save()
                
                # Attach user to request
                request.user = key_obj.user
                return True
        except APIKey.DoesNotExist:
            pass
        
        return False
