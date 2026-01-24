"""
Narrative Serializers

Serializers for narrative collaboration endpoints.
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
        ]
        read_only_fields = ['id', 'version_number', 'created_at', 'updated_at']


class NarrativeVersionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for version list."""

    class Meta:
        model = NarrativeVersion
        fields = [
            'id',
            'version_number',
            'status',
            'created_at',
            'updated_at',
        ]


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
        project_id = validated_data['project_id']
        approach_type = validated_data['approach_type']

        latest = NarrativeVersion.objects.filter(
            project_id=project_id,
            approach_type=approach_type
        ).order_by('-version_number').first()

        validated_data['version_number'] = (latest.version_number + 1) if latest else 1

        return super().create(validated_data)


class VersionStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating a version status."""

    status = serializers.ChoiceField(choices=['draft', 'under_review', 'final'])


class SendForReviewSerializer(serializers.Serializer):
    content = serializers.JSONField()
    content_html = serializers.CharField(required=False, allow_blank=True)
    content_plain = serializers.CharField(required=False, allow_blank=True)
    comments = serializers.ListField(required=False)
    changes = serializers.ListField(required=False)


class ApplyChangesSerializer(serializers.Serializer):
    accept_suggested_content = serializers.BooleanField(default=True)
    suggested_content = serializers.JSONField(required=False)
    content_html = serializers.CharField(required=False, allow_blank=True)
    content_plain = serializers.CharField(required=False, allow_blank=True)


class FollowUpSerializer(serializers.Serializer):
    version_id = serializers.IntegerField(required=False)
    message = serializers.CharField()
