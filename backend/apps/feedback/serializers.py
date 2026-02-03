"""
Serializers for tester feedback and changelog.
"""

from rest_framework import serializers
from .models import TesterFeedback, Changelog


class TesterFeedbackSerializer(serializers.ModelSerializer):
    """Full serializer for tester feedback with all fields."""

    username = serializers.CharField(source='user.username', read_only=True)
    context_url = serializers.ReadOnlyField()
    is_resolved = serializers.ReadOnlyField()  # Backwards compatibility

    class Meta:
        model = TesterFeedback
        fields = [
            'id',
            'internal_id',
            'user',
            'username',
            'page_url',
            'page_path',
            'project_id',
            'project_name',
            'feedback_type',
            'message',
            'category',
            'affected_module',
            'landscaper_summary',
            'landscaper_raw_chat',
            'browser_context',
            'report_count',
            'status',
            'admin_notes',
            'admin_response',
            'admin_responded_at',
            'created_at',
            'updated_at',
            'context_url',
            'is_resolved',
        ]
        read_only_fields = [
            'id',
            'internal_id',
            'user',
            'username',
            'created_at',
            'updated_at',
            'context_url',
            'is_resolved',
            'report_count',
        ]


class TesterFeedbackCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating feedback via legacy endpoint."""

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


class FeedbackSubmitSerializer(serializers.Serializer):
    """
    Serializer for the new /api/feedback/submit/ endpoint.
    Accepts chat conversation and context for Landscaper processing.
    """

    message = serializers.CharField(help_text="The feedback message from user")
    chat_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        help_text="Full conversation that led to feedback"
    )
    page_url = serializers.CharField(max_length=500)
    page_path = serializers.CharField(max_length=255)
    project_id = serializers.IntegerField(required=False, allow_null=True)
    project_name = serializers.CharField(max_length=255, required=False, allow_null=True)
    browser_context = serializers.DictField(
        required=False,
        default=dict,
        help_text="Browser, screen size, URL context"
    )

    def validate_browser_context(self, value):
        """Ensure browser_context has expected structure."""
        allowed_keys = {'browser', 'os', 'screenSize', 'currentUrl', 'timestamp'}
        # Filter to only allowed keys for security
        return {k: v for k, v in value.items() if k in allowed_keys}


class FeedbackCheckDuplicateSerializer(serializers.Serializer):
    """Serializer for checking if similar feedback exists."""

    message = serializers.CharField()
    affected_module = serializers.CharField(required=False, allow_null=True)


class TesterFeedbackLogSerializer(serializers.ModelSerializer):
    """
    Serializer for tester's feedback log view.
    Shows limited fields - no internal notes, but includes admin response.
    """

    class Meta:
        model = TesterFeedback
        fields = [
            'id',
            'affected_module',
            'landscaper_summary',
            'message',
            'category',
            'status',
            'admin_response',
            'admin_responded_at',
            'created_at',
        ]
        read_only_fields = fields


class TesterFeedbackAdminSerializer(serializers.ModelSerializer):
    """
    Serializer for admin feedback queue.
    Includes all fields including internal notes and raw chat.
    """

    username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    context_url = serializers.ReadOnlyField()

    class Meta:
        model = TesterFeedback
        fields = [
            'id',
            'internal_id',
            'user',
            'username',
            'user_email',
            'page_url',
            'page_path',
            'project_id',
            'project_name',
            'feedback_type',
            'message',
            'category',
            'affected_module',
            'landscaper_summary',
            'landscaper_raw_chat',
            'browser_context',
            'report_count',
            'status',
            'admin_notes',
            'admin_response',
            'admin_responded_at',
            'created_at',
            'updated_at',
            'context_url',
        ]
        read_only_fields = [
            'id',
            'internal_id',
            'user',
            'username',
            'user_email',
            'created_at',
            'updated_at',
            'context_url',
            'report_count',
            'landscaper_raw_chat',
            'browser_context',
        ]


class ChangelogSerializer(serializers.ModelSerializer):
    """Serializer for changelog entries."""

    class Meta:
        model = Changelog
        fields = [
            'changelog_id',
            'version',
            'deployed_at',
            'auto_generated_notes',
            'published_notes',
            'is_published',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['changelog_id', 'created_at', 'updated_at']


class ChangelogPublicSerializer(serializers.ModelSerializer):
    """Public serializer for changelog - only shows published entries."""

    class Meta:
        model = Changelog
        fields = [
            'changelog_id',
            'version',
            'deployed_at',
            'published_notes',
        ]
        read_only_fields = fields
