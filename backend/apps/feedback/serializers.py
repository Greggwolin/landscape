"""
Serializers for tester feedback.
"""

from rest_framework import serializers
from .models import TesterFeedback


class TesterFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for tester feedback."""

    username = serializers.CharField(source='user.username', read_only=True)
    context_url = serializers.ReadOnlyField()
    resolved_by_username = serializers.CharField(
        source='resolved_by.username',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = TesterFeedback
        fields = [
            'id',
            'user',
            'username',
            'page_url',
            'page_path',
            'project_id',
            'project_name',
            'feedback_type',
            'message',
            'is_resolved',
            'admin_notes',
            'resolved_at',
            'resolved_by',
            'resolved_by_username',
            'created_at',
            'updated_at',
            'context_url',
        ]
        read_only_fields = [
            'id',
            'user',
            'username',
            'created_at',
            'updated_at',
            'resolved_at',
            'resolved_by',
            'resolved_by_username',
            'context_url',
        ]

    def validate_feedback_type(self, value):
        """Ensure feedback type is valid."""
        valid_types = [choice[0] for choice in TesterFeedback.FEEDBACK_TYPE_CHOICES]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Invalid feedback type. Must be one of: {valid_types}"
            )
        return value


class TesterFeedbackCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating feedback."""

    class Meta:
        model = TesterFeedback
        fields = [
            'page_url',
            'page_path',
            'project_id',
            'project_name',
            'feedback_type',
            'message',
        ]
