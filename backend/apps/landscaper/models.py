"""
Landscaper AI models for chat history and advice tracking.

These models store:
- Chat threads for organizing conversations by page context
- Chat message history between users and Landscaper AI
- AI-suggested assumptions and their confidence levels
- Variance tracking between AI advice and user decisions
- Chat embeddings for cross-thread RAG retrieval
"""

from django.db import models
from django.contrib.auth import get_user_model
import time
import random
import uuid

User = get_user_model()


# =============================================================================
# Thread-based Chat Models (New)
# =============================================================================

class ChatThread(models.Model):
    """
    Chat thread container for organizing Landscaper conversations.

    Each thread is scoped to a project and page context (e.g., 'property', 'operations').
    Threads support auto-generated titles, summaries for RAG, and user editing.

    Maps to landscape.landscaper_chat_thread table.
    """

    PAGE_CONTEXT_CHOICES = [
        ('home', 'Home'),
        ('property', 'Property'),
        ('operations', 'Operations'),
        ('feasibility', 'Feasibility'),
        ('capitalization', 'Capitalization'),
        ('reports', 'Reports'),
        ('documents', 'Documents'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='chat_threads'
    )
    page_context = models.CharField(
        max_length=50,
        choices=PAGE_CONTEXT_CHOICES,
        help_text='Folder/page context: home, property, operations, etc.'
    )
    subtab_context = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text='Optional subtab context for finer granularity (reserved for future)'
    )
    title = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Thread title, auto-generated after first AI response, user-editable'
    )
    summary = models.TextField(
        null=True,
        blank=True,
        help_text='AI-generated summary for cross-thread RAG retrieval'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this thread is currently active'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When thread was closed (user started new or idle timeout)'
    )

    class Meta:
        db_table = 'landscape"."landscaper_chat_thread'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['project']),
            models.Index(fields=['project', 'page_context']),
            models.Index(fields=['project', 'is_active']),
            models.Index(fields=['project', '-updated_at']),
        ]
        verbose_name = 'Chat Thread'
        verbose_name_plural = 'Chat Threads'

    def __str__(self):
        title = self.title or f"Thread in {self.page_context}"
        return f"{self.project.project_name} - {title}"


class ThreadMessage(models.Model):
    """
    Individual chat message within a Landscaper thread.

    Replaces the original ChatMessage model for thread-based conversations.

    Maps to landscape.landscaper_thread_message table.
    """

    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    thread = models.ForeignKey(
        ChatThread,
        on_delete=models.CASCADE,
        db_column='thread_id',
        related_name='messages'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        help_text='Message sender: user or assistant'
    )
    content = models.TextField(
        help_text='Message content'
    )
    metadata = models.JSONField(
        null=True,
        blank=True,
        help_text='Additional data: tool calls, sources, mutation proposals, etc.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'landscape"."landscaper_thread_message'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['thread']),
            models.Index(fields=['thread', 'created_at']),
        ]
        verbose_name = 'Thread Message'
        verbose_name_plural = 'Thread Messages'

    def __str__(self):
        preview = self.content[:50] + '...' if len(self.content) > 50 else self.content
        return f"{self.role}: {preview}"


class ChatEmbedding(models.Model):
    """
    Vector embedding for chat messages enabling cross-thread RAG retrieval.

    Stores embeddings from OpenAI text-embedding-3-small for semantic search
    across all project conversations.

    Maps to landscape.landscaper_chat_embedding table.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    message = models.ForeignKey(
        ThreadMessage,
        on_delete=models.CASCADE,
        db_column='message_id',
        related_name='embeddings'
    )
    thread = models.ForeignKey(
        ChatThread,
        on_delete=models.CASCADE,
        db_column='thread_id',
        related_name='message_embeddings'
    )
    project_id = models.IntegerField(
        help_text='Denormalized project_id for faster queries'
    )
    # Note: The embedding field is a pgvector type, handled via raw SQL
    # Django doesn't have native pgvector support, so we use a placeholder
    # and handle the actual vector operations in raw SQL queries
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'landscape"."landscaper_chat_embedding'
        indexes = [
            models.Index(fields=['project_id']),
            models.Index(fields=['thread']),
        ]
        verbose_name = 'Chat Embedding'
        verbose_name_plural = 'Chat Embeddings'

    def __str__(self):
        return f"Embedding for message {self.message_id}"


# =============================================================================
# Legacy Chat Models (Preserved for backward compatibility)
# =============================================================================


class ChatMessage(models.Model):
    """
    Stores individual chat messages in Landscaper AI conversations.

    Maps to landscape.landscaper_chat_message table.
    """

    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]

    message_id = models.CharField(
        max_length=100,
        primary_key=True,
        help_text='Format: msg_{timestamp}_{random4}'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='landscaper_messages'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='User who sent the message (null for assistant messages)'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        help_text='Message sender: user or assistant'
    )
    content = models.TextField(
        help_text='Message content'
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text='When message was created'
    )
    metadata = models.JSONField(
        null=True,
        blank=True,
        help_text='Additional metadata (e.g., confidence scores, suggestions)'
    )

    class Meta:
        db_table = 'landscape"."landscaper_chat_message'
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['project', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]
        verbose_name = 'Chat Message'
        verbose_name_plural = 'Chat Messages'

    def save(self, *args, **kwargs):
        """Auto-generate message_id if not provided."""
        if not self.message_id:
            timestamp_ms = int(time.time() * 1000)
            random_suffix = random.randint(1000, 9999)
            self.message_id = f"msg_{timestamp_ms}_{random_suffix}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.role} - {self.project.project_name} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"


class LandscaperAdvice(models.Model):
    """
    Stores AI-suggested assumptions and recommendations.

    Used to calculate variance between what Landscaper AI suggested
    and what the user actually entered in their project assumptions.

    Maps to landscape.landscaper_advice table.
    """

    CONFIDENCE_CHOICES = [
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
        ('placeholder', 'Placeholder'),  # For stubbed Phase 6 data
    ]

    advice_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='landscaper_advice'
    )
    message = models.ForeignKey(
        ChatMessage,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column='message_id',
        help_text='Chat message that generated this advice'
    )
    assumption_key = models.CharField(
        max_length=100,
        help_text='Key identifying the assumption (e.g., land_price_per_acre, grading_cost_per_sf)'
    )
    lifecycle_stage = models.CharField(
        max_length=50,
        help_text='Development stage (e.g., ACQUISITION, PLANNING, CONSTRUCTION)'
    )
    suggested_value = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        help_text='AI-suggested value for the assumption'
    )
    confidence_level = models.CharField(
        max_length=20,
        choices=CONFIDENCE_CHOICES,
        help_text='AI confidence in this suggestion'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When advice was generated'
    )
    notes = models.TextField(
        null=True,
        blank=True,
        help_text='Additional context or reasoning for the suggestion'
    )

    class Meta:
        db_table = 'landscape"."landscaper_advice'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', 'assumption_key']),
            models.Index(fields=['project', 'lifecycle_stage']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Landscaper Advice'
        verbose_name_plural = 'Landscaper Advice'

    def __str__(self):
        return f"{self.project.project_name} - {self.assumption_key}: {self.suggested_value}"


class ActivityItem(models.Model):
    """
    Stores activity feed items for Landscaper panel.

    Activities are generated from:
    - Document extractions (complete/partial/blocked)
    - Budget changes
    - Market data updates
    - AI analysis completion
    - User decisions requiring attention

    Maps to landscape.landscaper_activity table.
    """

    TYPE_CHOICES = [
        ('status', 'Status'),       # Analysis status update
        ('decision', 'Decision'),   # Needs user decision
        ('update', 'Update'),       # Data update notification
        ('alert', 'Alert'),         # Warning or important notice
    ]

    STATUS_CHOICES = [
        ('complete', 'Complete'),
        ('partial', 'Partial'),
        ('blocked', 'Blocked'),
        ('pending', 'Pending'),
    ]

    CONFIDENCE_CHOICES = [
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
        (None, 'N/A'),
    ]

    activity_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='landscaper_activities'
    )
    activity_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        help_text='Type of activity: status, decision, update, alert'
    )
    title = models.CharField(
        max_length=100,
        help_text='Short title for the activity (e.g., "Market Analysis")'
    )
    summary = models.TextField(
        help_text='Brief summary of the activity status'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text='Activity status: complete, partial, blocked, pending'
    )
    confidence = models.CharField(
        max_length=20,
        choices=CONFIDENCE_CHOICES,
        null=True,
        blank=True,
        help_text='Confidence level for this data'
    )
    link = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Navigation link relative to project (e.g., /market)'
    )
    blocked_by = models.TextField(
        null=True,
        blank=True,
        help_text='What is blocking this activity'
    )
    details = models.JSONField(
        null=True,
        blank=True,
        help_text='Additional details as a list of strings'
    )
    highlight_fields = models.JSONField(
        null=True,
        blank=True,
        help_text='List of field names to highlight when navigating'
    )
    is_read = models.BooleanField(
        default=False,
        help_text='Whether user has viewed this activity'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When activity was created'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When activity was last updated'
    )
    source_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text='Source of activity: document, budget, market, ai_analysis'
    )
    source_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Reference ID to source record'
    )

    class Meta:
        db_table = 'landscape"."landscaper_activity'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', '-created_at']),
            models.Index(fields=['project', 'is_read']),
            models.Index(fields=['source_type', 'source_id']),
        ]
        verbose_name = 'Activity Item'
        verbose_name_plural = 'Activity Items'

    def __str__(self):
        return f"{self.project.project_name} - {self.title} ({self.status})"


class ExtractionMapping(models.Model):
    """
    Configurable field mappings for AI document extraction.

    Maps source patterns from documents (e.g., "Year Built", "Total Units")
    to database fields (e.g., tbl_project.year_built).

    Maps to landscape.tbl_extraction_mapping table.
    """

    # Document types now derive from DMS templates instead of hardcoded values.
    # Kept as a reference for the standard vocabulary:
    # Offering, Property Data, Operations, Market Data, Diligence,
    # Agreements, Leases, Title & Survey, Correspondence, Accounting, Misc

    CONFIDENCE_CHOICES = [
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]

    DATA_TYPE_CHOICES = [
        ('text', 'Text'),
        ('integer', 'Integer'),
        ('decimal', 'Decimal'),
        ('boolean', 'Boolean'),
        ('date', 'Date'),
        ('json', 'JSON'),
    ]

    TRANSFORM_RULE_CHOICES = [
        ('none', 'None'),
        ('strip_currency', 'Strip Currency'),
        ('percent_to_decimal', 'Percent to Decimal'),
        ('parse_date', 'Parse Date'),
        ('extract_number', 'Extract Number'),
    ]

    mapping_id = models.AutoField(primary_key=True)

    # Document classification — values now derive from DMS templates
    document_type = models.CharField(
        max_length=50,
        help_text='Type of document this mapping applies to (from DMS templates)'
    )

    # Source pattern
    source_pattern = models.CharField(
        max_length=200,
        help_text='Label or pattern to look for in documents'
    )
    source_aliases = models.JSONField(
        null=True,
        blank=True,
        default=list,
        help_text='Additional patterns that map to the same field'
    )

    # Target destination
    target_table = models.CharField(
        max_length=100,
        help_text='Database table name (e.g., tbl_project)'
    )
    target_field = models.CharField(
        max_length=100,
        help_text='Database field name (e.g., year_built)'
    )

    # Data handling
    data_type = models.CharField(
        max_length=20,
        choices=DATA_TYPE_CHOICES,
        default='text',
        help_text='Data type for the extracted value'
    )
    transform_rule = models.CharField(
        max_length=100,
        choices=TRANSFORM_RULE_CHOICES,
        null=True,
        blank=True,
        help_text='Transformation to apply to extracted value'
    )

    # Confidence and behavior
    confidence = models.CharField(
        max_length=10,
        choices=CONFIDENCE_CHOICES,
        default='Medium',
        help_text='Extraction confidence level'
    )
    auto_write = models.BooleanField(
        default=True,
        help_text='Automatically write to database on extraction'
    )
    overwrite_existing = models.BooleanField(
        default=False,
        help_text='Overwrite existing values when extracting'
    )

    # Tag-based filtering
    applicable_tags = models.JSONField(
        default=list,
        blank=True,
        help_text='When set, mapping only fires for documents with matching tags. Empty = all docs of this Doc Type.'
    )

    # Admin
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this mapping is active'
    )
    is_system = models.BooleanField(
        default=True,
        help_text='System mappings cannot be deleted'
    )
    notes = models.TextField(
        null=True,
        blank=True,
        help_text='Additional notes about this mapping'
    )

    # Audit
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='created_by',
        related_name='extraction_mappings_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='updated_by',
        related_name='extraction_mappings_updated'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tbl_extraction_mapping'
        ordering = ['document_type', 'source_pattern']
        unique_together = [['document_type', 'source_pattern', 'target_table', 'target_field']]
        verbose_name = 'Extraction Mapping'
        verbose_name_plural = 'Extraction Mappings'

    def __str__(self):
        return f"{self.document_type}: {self.source_pattern} -> {self.target_table}.{self.target_field}"


class ExtractionLog(models.Model):
    """
    Audit log for all extraction attempts.

    Tracks extracted values, transformations, and user accept/reject decisions.

    Maps to landscape.tbl_extraction_log table.
    """

    log_id = models.AutoField(primary_key=True)
    mapping = models.ForeignKey(
        ExtractionMapping,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='mapping_id',
        related_name='extraction_logs'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column='project_id',
        related_name='extraction_logs'
    )
    doc_id = models.IntegerField(
        null=True,
        blank=True,
        help_text='Document ID that was extracted from'
    )

    # What was extracted
    source_pattern_matched = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text='Actual pattern that matched'
    )
    extracted_value = models.TextField(
        null=True,
        blank=True,
        help_text='Raw value extracted from document'
    )
    transformed_value = models.TextField(
        null=True,
        blank=True,
        help_text='Value after transformation'
    )
    previous_value = models.TextField(
        null=True,
        blank=True,
        help_text='Previous value in database before extraction'
    )

    # Quality
    confidence_score = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        help_text='Confidence score (0-1)'
    )
    extraction_context = models.TextField(
        null=True,
        blank=True,
        help_text='Surrounding text for debugging'
    )

    # Result
    was_written = models.BooleanField(
        default=False,
        help_text='Whether the value was written to database'
    )
    was_accepted = models.BooleanField(
        null=True,
        blank=True,
        help_text='NULL=pending, True=accepted, False=rejected'
    )
    rejection_reason = models.TextField(
        null=True,
        blank=True,
        help_text='Reason for rejection if rejected'
    )

    # Timestamps
    extracted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When extraction was reviewed'
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='reviewed_by',
        related_name='extraction_reviews'
    )

    class Meta:
        db_table = 'landscape"."tbl_extraction_log'
        ordering = ['-extracted_at']
        indexes = [
            models.Index(fields=['mapping']),
            models.Index(fields=['project']),
            models.Index(fields=['doc_id']),
            models.Index(fields=['extracted_at']),
        ]
        verbose_name = 'Extraction Log'
        verbose_name_plural = 'Extraction Logs'

    def __str__(self):
        status = 'pending' if self.was_accepted is None else ('accepted' if self.was_accepted else 'rejected')
        return f"Log {self.log_id}: {self.source_pattern_matched} ({status})"


# =============================================================================
# Intelligence v1 — Intake Session & Model Override
# =============================================================================

class IntakeSession(models.Model):
    """
    Tracks document intake workflow sessions for Landscaper Intelligence v1.

    Workflow: draft → mapping_complete → values_complete → committed | abandoned
    Uses bigint PK internally, UUID for API/URL references.

    Maps to landscape.tbl_intake_session table.
    """

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('mapping_complete', 'Mapping Complete'),
        ('values_complete', 'Values Complete'),
        ('committed', 'Committed'),
        ('abandoned', 'Abandoned'),
    ]

    intake_id = models.BigAutoField(primary_key=True)
    intake_uuid = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        help_text='External-facing UUID for API URLs'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='intake_sessions'
    )
    doc = models.ForeignKey(
        'documents.Document',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='doc_id',
        related_name='intake_sessions'
    )
    document_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text='Document type classification (OM, T-12, Rent Roll, etc.)'
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='draft'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='created_by',
        related_name='intake_sessions_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tbl_intake_session'
        ordering = ['-created_at']
        verbose_name = 'Intake Session'
        verbose_name_plural = 'Intake Sessions'

    def __str__(self):
        return f"Intake {self.intake_uuid} ({self.status})"


class ModelOverride(models.Model):
    """
    Calculated field overrides — red dot governance for Landscaper Intelligence v1.

    When a user overrides a calculated field, the override is tracked here.
    Toggling is_active=False reverts to the calculated value.

    Maps to landscape.tbl_model_override table.
    """

    override_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='model_overrides'
    )
    division_id = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='FK to tbl_division.division_id (no ORM model exists)'
    )
    unit_id = models.IntegerField(
        null=True,
        blank=True,
        help_text='FK to tbl_multifamily_unit.unit_id'
    )
    field_key = models.CharField(
        max_length=100,
        help_text='Field registry key being overridden'
    )
    calculated_value = models.TextField(
        null=True,
        blank=True,
        help_text='The platform-calculated value at time of override'
    )
    override_value = models.TextField(
        help_text='The user-specified override value'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='True = override active; False = reverted to calculated'
    )
    toggled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='toggled_by',
        related_name='model_overrides_toggled'
    )
    toggled_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tbl_model_override'
        ordering = ['-toggled_at']
        verbose_name = 'Model Override'
        verbose_name_plural = 'Model Overrides'

    def __str__(self):
        status = 'active' if self.is_active else 'reverted'
        return f"Override {self.field_key} ({status})"
