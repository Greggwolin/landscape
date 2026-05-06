"""
Serializers for Landscaper AI models.
"""

from rest_framework import serializers
from .models import (
    ChatMessage,
    LandscaperAdvice,
    ActivityItem,
    ExtractionMapping,
    ExtractionLog,
    ChatThread,
    ThreadMessage,
    ChatEmbedding,
)


# =============================================================================
# Thread-based Chat Serializers
# =============================================================================

class ThreadMessageSerializer(serializers.ModelSerializer):
    """Serializer for ThreadMessage model."""

    messageId = serializers.UUIDField(source='id', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = ThreadMessage
        fields = [
            'messageId',
            'role',
            'content',
            'metadata',
            'createdAt',
        ]
        read_only_fields = ['messageId', 'createdAt']


class ThreadMessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating thread messages."""

    class Meta:
        model = ThreadMessage
        fields = ['thread', 'role', 'content', 'metadata']


class ChatThreadSerializer(serializers.ModelSerializer):
    """Serializer for ChatThread model."""

    threadId = serializers.UUIDField(source='id', read_only=True)
    projectId = serializers.IntegerField(source='project_id', read_only=True, allow_null=True)
    projectName = serializers.SerializerMethodField()
    docId = serializers.IntegerField(source='doc_id', read_only=True, allow_null=True)
    pageContext = serializers.CharField(source='page_context', allow_null=True, required=False)
    subtabContext = serializers.CharField(source='subtab_context', allow_null=True, required=False)
    isActive = serializers.BooleanField(source='is_active', read_only=True)
    isArchived = serializers.BooleanField(source='is_archived', read_only=True)
    archivedAt = serializers.DateTimeField(source='archived_at', read_only=True, allow_null=True)
    archivedByUserId = serializers.CharField(source='archived_by_user_id', read_only=True, allow_null=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    closedAt = serializers.DateTimeField(source='closed_at', read_only=True, allow_null=True)
    messageCount = serializers.SerializerMethodField()
    firstUserMessage = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = [
            'threadId',
            'projectId',
            'projectName',
            'docId',
            'pageContext',
            'subtabContext',
            'title',
            'summary',
            'isActive',
            'isArchived',
            'archivedAt',
            'archivedByUserId',
            'createdAt',
            'updatedAt',
            'closedAt',
            'messageCount',
            'firstUserMessage',
        ]
        read_only_fields = [
            'threadId', 'projectId', 'projectName', 'docId', 'isActive',
            'isArchived', 'archivedAt', 'archivedByUserId',
            'createdAt', 'updatedAt', 'closedAt', 'messageCount',
            'firstUserMessage',
        ]

    def get_messageCount(self, obj):
        """Return the number of messages in this thread.

        Reads from the `msg_count` annotation set by ChatThreadViewSet.
        get_queryset(). Falls back to a per-row count for callers that
        bypass the viewset (unit tests, one-off scripts).

        Uses hasattr (not getattr is not None) so that an annotated value
        of 0 doesn't trigger the fallback query.
        """
        if hasattr(obj, 'msg_count'):
            return obj.msg_count
        return obj.messages.count()

    def get_projectName(self, obj):
        """Return the parent project's name, or None for unassigned threads.

        select_related('project') in the viewset's queryset means obj.project
        is a single JOIN, not a per-row query. Defensive on orphaned-FK
        edge cases (project_id set but project row missing).
        """
        if not obj.project_id:
            return None
        return obj.project.project_name if obj.project else None

    def get_firstUserMessage(self, obj):
        """Return the first user-role message text (truncated to 120 chars).

        Used by the sidebar/recent-threads UI as a label fallback when the
        thread has no auto-generated title yet. Truncated server-side to keep
        list payloads small. Frontend further truncates for display.

        Reads from the `first_user_text` Subquery annotation set by
        ChatThreadViewSet.get_queryset(). Falls back to a per-row query for
        callers that bypass the viewset.

        Uses hasattr so that the annotation being present-but-null (no user
        messages yet — Subquery returned no row) doesn't trigger a redundant
        fallback query.
        """
        if hasattr(obj, 'first_user_text'):
            text = obj.first_user_text
        else:
            first = obj.messages.filter(role='user').order_by('created_at').first()
            text = first.content if first else None
        if not text:
            return None
        text = text.strip()
        return text[:120] + ('…' if len(text) > 120 else '')


class ChatThreadDetailSerializer(ChatThreadSerializer):
    """Serializer for ChatThread with messages included."""

    messages = ThreadMessageSerializer(many=True, read_only=True)

    class Meta(ChatThreadSerializer.Meta):
        fields = ChatThreadSerializer.Meta.fields + ['messages']


class ChatThreadCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating chat threads."""

    class Meta:
        model = ChatThread
        fields = ['project', 'page_context', 'subtab_context', 'title']
        extra_kwargs = {
            'project': {'required': False, 'allow_null': True},
            'page_context': {'required': False, 'allow_null': True},
        }


class ChatThreadUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating chat thread (title only for now)."""

    class Meta:
        model = ChatThread
        fields = ['title']


# =============================================================================
# Legacy Chat Serializers (Preserved for backward compatibility)
# =============================================================================


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


class ExtractionMappingSerializer(serializers.ModelSerializer):
    """Serializer for ExtractionMapping model."""

    # Add stats from the view when available
    times_extracted = serializers.IntegerField(read_only=True, required=False)
    projects_used = serializers.IntegerField(read_only=True, required=False)
    documents_processed = serializers.IntegerField(read_only=True, required=False)
    avg_confidence_score = serializers.DecimalField(
        max_digits=5, decimal_places=4, read_only=True, required=False
    )
    write_rate = serializers.DecimalField(
        max_digits=5, decimal_places=4, read_only=True, required=False
    )
    acceptance_rate = serializers.DecimalField(
        max_digits=5, decimal_places=4, read_only=True, required=False
    )
    last_used_at = serializers.DateTimeField(read_only=True, required=False)

    class Meta:
        model = ExtractionMapping
        fields = [
            'mapping_id',
            'document_type',
            'source_pattern',
            'source_aliases',
            'target_table',
            'target_field',
            'data_type',
            'transform_rule',
            'confidence',
            'auto_write',
            'overwrite_existing',
            'is_active',
            'is_system',
            'applicable_tags',
            'notes',
            'created_at',
            'updated_at',
            # Stats fields (optional)
            'times_extracted',
            'projects_used',
            'documents_processed',
            'avg_confidence_score',
            'write_rate',
            'acceptance_rate',
            'last_used_at',
        ]
        read_only_fields = ['mapping_id', 'created_at', 'updated_at']


class ExtractionMappingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating extraction mappings."""

    class Meta:
        model = ExtractionMapping
        fields = [
            'document_type',
            'source_pattern',
            'source_aliases',
            'target_table',
            'target_field',
            'data_type',
            'transform_rule',
            'confidence',
            'auto_write',
            'overwrite_existing',
            'is_active',
            'applicable_tags',
            'notes',
        ]


class ExtractionLogSerializer(serializers.ModelSerializer):
    """Serializer for ExtractionLog model."""

    mapping_pattern = serializers.CharField(
        source='mapping.source_pattern', read_only=True
    )
    mapping_target = serializers.SerializerMethodField()
    project_name = serializers.CharField(
        source='project.project_name', read_only=True
    )

    class Meta:
        model = ExtractionLog
        fields = [
            'log_id',
            'mapping',
            'mapping_pattern',
            'mapping_target',
            'project',
            'project_name',
            'doc_id',
            'source_pattern_matched',
            'extracted_value',
            'transformed_value',
            'previous_value',
            'confidence_score',
            'extraction_context',
            'was_written',
            'was_accepted',
            'rejection_reason',
            'extracted_at',
            'reviewed_at',
        ]
        read_only_fields = ['log_id', 'extracted_at']

    def get_mapping_target(self, obj):
        if obj.mapping:
            return f"{obj.mapping.target_table}.{obj.mapping.target_field}"
        return None


class ExtractionLogReviewSerializer(serializers.Serializer):
    """Serializer for reviewing (accepting/rejecting) extractions."""

    was_accepted = serializers.BooleanField(required=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)


# =============================================================================
# Intelligence v1 — Intake Session Serializers
# =============================================================================

class IntakeSessionSerializer(serializers.ModelSerializer):
    """Read serializer for IntakeSession."""

    intakeUuid = serializers.UUIDField(source='intake_uuid', read_only=True)
    projectId = serializers.IntegerField(source='project_id', read_only=True)
    docId = serializers.IntegerField(source='doc_id', read_only=True)
    documentType = serializers.CharField(source='document_type', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        from .models import IntakeSession
        model = IntakeSession
        fields = [
            'intakeUuid', 'projectId', 'docId', 'documentType',
            'status', 'createdAt', 'updatedAt',
        ]


class IntakeSessionStartSerializer(serializers.Serializer):
    """Serializer for POST /api/intake/start."""

    project_id = serializers.IntegerField(required=True)
    doc_id = serializers.IntegerField(required=False, allow_null=True)
    intent = serializers.ChoiceField(
        choices=['global_intelligence', 'dms_only', 'structured_ingestion'],
        default='structured_ingestion'
    )
    document_type = serializers.CharField(required=False, allow_null=True, allow_blank=True, default=None)


class IntakeCommitActionSerializer(serializers.Serializer):
    """Single action within a commit request."""

    extraction_id = serializers.IntegerField(required=True)
    action = serializers.ChoiceField(choices=['accept', 'reject'])
    override_value = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class IntakeCommitSerializer(serializers.Serializer):
    """Serializer for POST /api/intake/{uuid}/commit_values."""

    actions = IntakeCommitActionSerializer(many=True)
