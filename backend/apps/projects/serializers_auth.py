"""
Serializers for authentication and user management.
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models_user import User, UserProfile, APIKey
import secrets
import hashlib


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm', 'first_name', 'last_name', 'company', 'phone']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords must match"})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data.pop('username'),
            email=validated_data.pop('email'),
            password=validated_data.pop('password'),
            **validated_data
        )
        # Create profile
        UserProfile.objects.create(user=user)
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login."""

    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        # Authenticate directly with username
        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError("Invalid credentials")

        if not user.is_active:
            raise serializers.ValidationError("User account is disabled")

        attrs['user'] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""

    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'company', 'phone', 'role', 'is_verified', 'is_active', 'is_staff', 'created_at', 'last_login', 'plain_password', 'profile']
        read_only_fields = ['id', 'created_at', 'is_verified', 'last_login', 'plain_password']
    
    def get_profile(self, obj):
        try:
            return {
                'bio': obj.profile.bio,
                'avatar_url': obj.profile.avatar_url,
                'timezone': obj.profile.timezone,
            }
        except UserProfile.DoesNotExist:
            return None


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request."""
    
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""
    
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords must match"})
        return attrs


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Serializer for admin user creation."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'company', 'phone',
            'is_active', 'is_staff', 'role'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords must match"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        # Store plain password for admin visibility
        user.plain_password = password
        user.save(update_fields=['plain_password'])
        # Create profile
        UserProfile.objects.create(user=user)
        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for admin user updates (no password)."""

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'company', 'phone', 'is_active', 'is_staff', 'role',
            'created_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'last_login']


class AdminSetPasswordSerializer(serializers.Serializer):
    """Serializer for admin password reset."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords must match"})
        return attrs


class APIKeySerializer(serializers.ModelSerializer):
    """Serializer for API keys."""

    key_preview = serializers.SerializerMethodField()

    class Meta:
        model = APIKey
        fields = ['id', 'name', 'key_preview', 'is_active', 'created_at', 'last_used_at', 'expires_at']
        read_only_fields = ['id', 'key_preview', 'created_at', 'last_used_at']

    def get_key_preview(self, obj):
        """Show only first 8 characters of key."""
        return f"{obj.key[:8]}..." if obj.key else None


class APIKeyCreateSerializer(serializers.Serializer):
    """Serializer for creating API keys."""
    
    name = serializers.CharField(max_length=100)
    expires_days = serializers.IntegerField(default=365, min_value=1, max_value=3650)
    
    def create(self, validated_data):
        from datetime import timedelta
        from django.utils import timezone
        
        user = self.context['request'].user
        
        # Generate secure random key
        random_key = secrets.token_urlsafe(32)
        key_hash = hashlib.sha256(random_key.encode()).hexdigest()
        
        expires_at = timezone.now() + timedelta(days=validated_data['expires_days'])
        
        api_key = APIKey.objects.create(
            user=user,
            name=validated_data['name'],
            key=key_hash,
            expires_at=expires_at
        )
        
        # Return the actual key only once during creation
        api_key.actual_key = random_key
        return api_key
