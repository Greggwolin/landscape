"""
Serializers for Landscaper AI models.
"""

from rest_framework import serializers
from .models import ChatMessage, LandscaperAdvice, ActivityItem


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for ChatMessage model."""

    user_name = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.project_name', read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            'message_id',
            'project',
            'project_name',
            'user',
            'user_name',
            'role',
            'content',
            'timestamp',
            'metadata',
        ]
        read_only_fields = ['message_id', 'timestamp', 'project_name', 'user_name']

    def get_user_name(self, obj):
        """Return user's full name or username if available."""
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None


class ChatMessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating chat messages."""

    class Meta:
        model = ChatMessage
        fields = ['project', 'user', 'role', 'content', 'metadata']

    def create(self, validated_data):
        """Create message with auto-generated ID."""
        return ChatMessage.objects.create(**validated_data)


class LandscaperAdviceSerializer(serializers.ModelSerializer):
    """Serializer for LandscaperAdvice model."""

    project_name = serializers.CharField(source='project.project_name', read_only=True)

    class Meta:
        model = LandscaperAdvice
        fields = [
            'advice_id',
            'project',
            'project_name',
            'message',
            'assumption_key',
            'lifecycle_stage',
            'suggested_value',
            'confidence_level',
            'created_at',
            'notes',
        ]
        read_only_fields = ['advice_id', 'created_at', 'project_name']


class VarianceItemSerializer(serializers.Serializer):
    """
    Serializer for variance calculations.

    Compares AI-suggested values against actual project values.
    """

    assumption_key = serializers.CharField()
    lifecycle_stage = serializers.CharField()
    suggested_value = serializers.DecimalField(max_digits=15, decimal_places=4)
    actual_value = serializers.DecimalField(max_digits=15, decimal_places=4, allow_null=True)
    variance_percent = serializers.DecimalField(max_digits=6, decimal_places=2)
    confidence_level = serializers.CharField()
    advice_date = serializers.DateTimeField()
    notes = serializers.CharField(allow_null=True)


class ActivityItemSerializer(serializers.ModelSerializer):
    """Serializer for ActivityItem model."""

    # Map model fields to frontend expected format
    id = serializers.CharField(source='activity_id', read_only=True)
    type = serializers.CharField(source='activity_type')
    read = serializers.BooleanField(source='is_read')
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)
    blockedBy = serializers.CharField(source='blocked_by', allow_null=True)
    highlightFields = serializers.JSONField(source='highlight_fields', allow_null=True)

    class Meta:
        model = ActivityItem
        fields = [
            'id',
            'type',
            'title',
            'summary',
            'status',
            'confidence',
            'timestamp',
            'read',
            'link',
            'blockedBy',
            'details',
            'highlightFields',
        ]
        read_only_fields = ['id', 'timestamp']


class ActivityItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating activity items."""

    class Meta:
        model = ActivityItem
        fields = [
            'project',
            'activity_type',
            'title',
            'summary',
            'status',
            'confidence',
            'link',
            'blocked_by',
            'details',
            'highlight_fields',
            'source_type',
            'source_id',
        ]
