"""
Authentication and user management views.
"""

from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import login, logout
from django.utils import timezone
from datetime import timedelta
import secrets
import hashlib

from .models_user import User, UserProfile, APIKey, PasswordResetToken
from .serializers_auth import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    APIKeySerializer,
    APIKeyCreateSerializer,
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
    AdminSetPasswordSerializer,
)
from .permissions import IsOwnerOrReadOnly
from rest_framework.permissions import IsAdminUser


class UserRegistrationView(generics.CreateAPIView):
    """
    User registration endpoint.
    
    POST /api/auth/register/
    """
    
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)


class UserLoginView(generics.GenericAPIView):
    """
    User login endpoint.
    
    POST /api/auth/login/
    """
    
    permission_classes = [AllowAny]
    serializer_class = UserLoginSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Update last login IP
        user.last_login_ip = self.get_client_ip(request)
        user.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })
    
    def get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UserLogoutView(generics.GenericAPIView):
    """
    User logout endpoint.
    
    POST /api/auth/logout/
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    User profile endpoint.

    GET /api/auth/profile/
    PUT /api/auth/profile/
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class PasswordChangeView(generics.GenericAPIView):
    """
    Change password for authenticated user.

    POST /api/auth/password-change/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        new_password_confirm = request.data.get('new_password_confirm')

        if not all([current_password, new_password, new_password_confirm]):
            return Response(
                {'error': 'All password fields are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != new_password_confirm:
            return Response(
                {'error': 'New passwords do not match'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        if not user.check_password(current_password):
            return Response(
                {'error': 'Current password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate new password strength
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response(
                {'error': e.messages[0] if e.messages else 'Password does not meet requirements'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        return Response({'message': 'Password changed successfully'})


class PasswordResetRequestView(generics.GenericAPIView):
    """
    Request password reset.
    
    POST /api/auth/password-reset/
    """
    
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email)
            
            # Generate reset token
            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            # Create reset token (expires in 1 hour)
            reset_token = PasswordResetToken.objects.create(
                user=user,
                token=token_hash,
                expires_at=timezone.now() + timedelta(hours=1)
            )
            
            # TODO: Send email with reset link
            # For now, return token (in production, only send via email)
            
            return Response({
                'message': 'Password reset email sent',
                'token': token  # Remove this in production!
            })
        except User.DoesNotExist:
            # Don't reveal if email exists
            return Response({
                'message': 'If that email exists, a reset link has been sent'
            })


class PasswordResetConfirmView(generics.GenericAPIView):
    """
    Confirm password reset.
    
    POST /api/auth/password-reset-confirm/
    """
    
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']
        
        # Hash the token
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token_hash)
            
            if not reset_token.is_valid():
                return Response(
                    {'error': 'Token has expired or already been used'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Reset password
            user = reset_token.user
            user.set_password(password)
            user.save()
            
            # Mark token as used
            reset_token.used_at = timezone.now()
            reset_token.save()
            
            return Response({'message': 'Password reset successfully'})
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST
            )


class APIKeyViewSet(viewsets.ModelViewSet):
    """
    API Key management.
    
    GET /api/auth/api-keys/
    POST /api/auth/api-keys/
    DELETE /api/auth/api-keys/:id/
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = APIKeySerializer
    
    def get_queryset(self):
        return APIKey.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return APIKeyCreateSerializer
        return APIKeySerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        api_key = serializer.save()
        
        # Return the actual key only this once
        response_serializer = APIKeySerializer(api_key)
        data = response_serializer.data
        data['key'] = api_key.actual_key  # Full key shown only on creation
        
        return Response(data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke an API key."""
        api_key = self.get_object()
        api_key.is_active = False
        api_key.save()
        
        return Response({'message': 'API key revoked'})


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    User management for admins.

    GET /api/auth/users/
    POST /api/auth/users/
    PUT /api/auth/users/:id/
    DELETE /api/auth/users/:id/
    POST /api/auth/users/:id/set_password/
    POST /api/auth/users/:id/activate/
    POST /api/auth/users/:id/deactivate/
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    queryset = User.objects.all()

    def get_queryset(self):
        # Only admins can see all users
        if self.request.user.is_staff:
            return User.objects.all().order_by('-created_at')
        # Regular users only see themselves
        return User.objects.filter(id=self.request.user.id)

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        if self.action in ['update', 'partial_update']:
            return AdminUserUpdateSerializer
        if self.action == 'set_password':
            return AdminSetPasswordSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        """Create a new user (admin only)."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Update a user (admin only)."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete a user (admin only)."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self.get_object()

        # Prevent self-deletion
        if user.id == request.user.id:
            return Response(
                {'error': 'You cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.delete()
        return Response({'message': 'User deleted successfully'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """Admin set password for a user (no current password needed)."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self.get_object()
        serializer = AdminSetPasswordSerializer(data=request.data)

        if serializer.is_valid():
            raw_password = serializer.validated_data['password']
            user.set_password(raw_password)
            user.plain_password = raw_password
            user.save(update_fields=['password', 'plain_password'])
            return Response({'message': 'Password updated successfully'})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a user (admin only)."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self.get_object()
        user.is_active = False
        user.save()

        return Response({'message': 'User deactivated'})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a user (admin only)."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self.get_object()
        user.is_active = True
        user.save()

        return Response({'message': 'User activated'})
