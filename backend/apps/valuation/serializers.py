"""
Valuation Serializers

Serializers for narrative versioning API endpoints.
"""

from rest_framework import serializers
from .models import NarrativeVersion, NarrativeComment, NarrativeChange


class NarrativeCommentSerializer(serializers.ModelSerializer):
    """Serializer for inline comments."""

    class Meta:
        model = NarrativeComment
        fields = [
            'id',
            'version_id',
            'comment_text',
            'position_start',
            'position_end',
            'is_question',
            'is_resolved',
            'resolved_by',
            'resolved_at',
            'landscaper_response',
            'created_by',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'is_question']

    def create(self, validated_data):
        # Auto-detect if comment is a question
        comment_text = validated_data.get('comment_text', '')
        validated_data['is_question'] = comment_text.strip().endswith('?')
        return super().create(validated_data)


class NarrativeChangeSerializer(serializers.ModelSerializer):
    """Serializer for track changes."""

    class Meta:
        model = NarrativeChange
        fields = [
            'id',
            'version_id',
            'change_type',
            'original_text',
            'new_text',
            'position_start',
            'position_end',
            'is_accepted',
            'accepted_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class NarrativeVersionSerializer(serializers.ModelSerializer):
    """Serializer for narrative versions with nested comments and changes."""

    comments = NarrativeCommentSerializer(many=True, read_only=True)
    changes = NarrativeChangeSerializer(many=True, read_only=True)
    comment_count = serializers.SerializerMethodField()
    unresolved_comment_count = serializers.SerializerMethodField()
    pending_change_count = serializers.SerializerMethodField()

    class Meta:
        model = NarrativeVersion
        fields = [
            'id',
            'project_id',
            'approach_type',
            'version_number',
            'content',
            'content_html',
            'content_plain',
            'status',
            'created_by',
            'created_at',
            'updated_at',
            'comments',
            'changes',
            'comment_count',
            'unresolved_comment_count',
            'pending_change_count',
        ]
        read_only_fields = ['id', 'version_number', 'created_at', 'updated_at']

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_unresolved_comment_count(self, obj):
        return obj.comments.filter(is_resolved=False).count()

    def get_pending_change_count(self, obj):
        return obj.changes.filter(is_accepted=False).count()


class NarrativeVersionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for version list (without nested data)."""

    comment_count = serializers.SerializerMethodField()
    unresolved_comment_count = serializers.SerializerMethodField()

    class Meta:
        model = NarrativeVersion
        fields = [
            'id',
            'version_number',
            'status',
            'created_by',
            'created_at',
            'updated_at',
            'comment_count',
            'unresolved_comment_count',
        ]

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_unresolved_comment_count(self, obj):
        return obj.comments.filter(is_resolved=False).count()


class NarrativeVersionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new narrative versions."""

    class Meta:
        model = NarrativeVersion
        fields = [
            'project_id',
            'approach_type',
            'content',
            'content_html',
            'content_plain',
            'status',
            'created_by',
        ]

    def create(self, validated_data):
        # Auto-increment version number
        project_id = validated_data['project_id']
        approach_type = validated_data['approach_type']

        # Get the latest version number for this project/approach
        latest = NarrativeVersion.objects.filter(
            project_id=project_id,
            approach_type=approach_type
        ).order_by('-version_number').first()

        validated_data['version_number'] = (latest.version_number + 1) if latest else 1

        return super().create(validated_data)


class AcceptChangesSerializer(serializers.Serializer):
    """Serializer for accepting all track changes."""

    accept_all = serializers.BooleanField(default=True)
    change_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text='Optional list of specific change IDs to accept'
    )
