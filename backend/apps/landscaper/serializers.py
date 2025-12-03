"""
Serializers for Landscaper AI models.
"""

from rest_framework import serializers
from .models import ChatMessage, LandscaperAdvice


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
