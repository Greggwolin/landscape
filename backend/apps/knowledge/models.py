"""
Knowledge Persistence Models
Entity-fact knowledge model for institutional learning and AI context.
"""

from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from apps.projects.models_user import User


class KnowledgeEntity(models.Model):
    """
    Canonical representation of "things" the system knows about.

    Entities include: projects, properties, units, markets, assumptions,
    documents, people, companies, etc.
    """

    ENTITY_TYPE_CHOICES = [
        ('project', 'Project'),
        ('property', 'Property'),
        ('unit', 'Unit'),
        ('unit_type', 'Unit Type'),
        ('market', 'Market'),
        ('assumption', 'Assumption'),
        ('document', 'Document'),
        ('person', 'Person'),
        ('company', 'Company'),
        ('area', 'Area/Container'),
        ('benchmark', 'Benchmark'),
        ('other', 'Other'),
    ]

    entity_id = models.BigAutoField(primary_key=True)
    entity_type = models.CharField(max_length=50, choices=ENTITY_TYPE_CHOICES, db_index=True)
    entity_subtype = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="e.g., 'multifamily', 'office', 'retail', 'mpc'"
    )
    canonical_name = models.CharField(
        max_length=500,
        unique=True,
        db_index=True,
        help_text="Unique identifier for this entity"
    )
    metadata = models.JSONField(
        default=dict,
        help_text="Type-specific attributes in flexible JSON structure"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_entities'
    )

    class Meta:
        db_table = 'landscape"."knowledge_entities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['entity_type', 'entity_subtype']),
            models.Index(fields=['canonical_name']),
        ]
        verbose_name = 'Knowledge Entity'
        verbose_name_plural = 'Knowledge Entities'

    def __str__(self):
        return f"{self.entity_type}: {self.canonical_name}"


class KnowledgeFact(models.Model):
    """
    Assertions about entities with temporal validity and provenance.

    Facts connect entities via predicates (relationships) and track
    confidence, source, and versioning.
    """

    SOURCE_TYPE_CHOICES = [
        ('user_input', 'User Input'),
        ('document_extract', 'Document Extraction'),
        ('market_data', 'Market Data'),
        ('calculation', 'Calculation'),
        ('ai_inference', 'AI Inference'),
        ('user_correction', 'User Correction'),
        ('import', 'Data Import'),
    ]

    fact_id = models.BigAutoField(primary_key=True)

    # Subject-Predicate-Object triple
    subject_entity = models.ForeignKey(
        KnowledgeEntity,
        on_delete=models.CASCADE,
        related_name='facts_as_subject',
        db_index=True
    )
    predicate = models.CharField(
        max_length=200,
        db_index=True,
        help_text="Relationship type: has_assumption, located_in, monthly_rent, etc."
    )

    # Object can be a literal value OR another entity
    object_value = models.TextField(
        null=True,
        blank=True,
        help_text="Literal value (for non-entity objects)"
    )
    object_entity = models.ForeignKey(
        KnowledgeEntity,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='facts_as_object',
        help_text="Entity reference (for entity-to-entity relationships)"
    )

    # Temporal validity
    valid_from = models.DateField(
        null=True,
        blank=True,
        help_text="When this fact became true"
    )
    valid_to = models.DateField(
        null=True,
        blank=True,
        help_text="When this fact ceased to be true"
    )

    # Provenance
    source_type = models.CharField(
        max_length=50,
        choices=SOURCE_TYPE_CHOICES,
        db_index=True
    )
    source_id = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="ID of source record (document_id, calculation_id, etc.)"
    )
    confidence_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0.00), MaxValueValidator(1.00)],
        default=1.00,
        help_text="Confidence level 0.00-1.00"
    )

    # Versioning
    superseded_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supersedes',
        help_text="Newer fact that replaces this one"
    )
    is_current = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this is the current version of the fact"
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_facts'
    )

    class Meta:
        db_table = 'landscape"."knowledge_facts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subject_entity', 'predicate']),
            models.Index(fields=['object_entity']),
            models.Index(fields=['is_current', 'predicate']),
            models.Index(fields=['source_type', 'source_id']),
            models.Index(fields=['valid_from', 'valid_to']),
        ]
        verbose_name = 'Knowledge Fact'
        verbose_name_plural = 'Knowledge Facts'

    def __str__(self):
        obj_display = self.object_value or f"-> {self.object_entity}"
        return f"{self.subject_entity.canonical_name} | {self.predicate} | {obj_display}"

    def is_valid_at(self, date):
        """Check if this fact is valid at a given date."""
        if not self.is_current:
            return False
        if self.valid_from and date < self.valid_from:
            return False
        if self.valid_to and date > self.valid_to:
            return False
        return True


class KnowledgeSession(models.Model):
    """
    User interaction sessions with loaded knowledge context.

    Tracks what entities/facts were loaded into context for AI reasoning.
    """

    session_id = models.UUIDField(primary_key=True, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='knowledge_sessions',
        db_index=True
    )
    workspace_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Workspace context (if applicable)"
    )
    project_id = models.IntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Project context (if applicable)"
    )

    session_start = models.DateTimeField(auto_now_add=True, db_index=True)
    session_end = models.DateTimeField(null=True, blank=True)

    # Loaded context
    loaded_entities = ArrayField(
        models.BigIntegerField(),
        default=list,
        help_text="Array of entity_id values loaded in this session"
    )
    loaded_facts_count = models.IntegerField(
        default=0,
        help_text="Number of facts loaded in context"
    )
    context_token_count = models.IntegerField(
        default=0,
        help_text="Estimated token usage for loaded context"
    )
    context_summary = models.TextField(
        null=True,
        blank=True,
        help_text="Brief summary of loaded context"
    )

    metadata = models.JSONField(
        default=dict,
        help_text="Additional session metadata"
    )

    class Meta:
        db_table = 'landscape"."knowledge_sessions'
        ordering = ['-session_start']
        indexes = [
            models.Index(fields=['user', 'project_id']),
            models.Index(fields=['session_start']),
            models.Index(
                fields=['session_end'],
                name='idx_active_sessions',
                condition=models.Q(session_end__isnull=True)
            ),
        ]
        verbose_name = 'Knowledge Session'
        verbose_name_plural = 'Knowledge Sessions'

    def __str__(self):
        status = "Active" if not self.session_end else "Ended"
        return f"Session {self.session_id} - {self.user.email} ({status})"

    @property
    def is_active(self):
        return self.session_end is None

    def end_session(self):
        """Mark session as ended."""
        if not self.session_end:
            self.session_end = timezone.now()
            self.save(update_fields=['session_end'])


class KnowledgeInteraction(models.Model):
    """
    AI conversation log for learning and improvement.

    Logs every query, response, context used, and user feedback.
    """

    QUERY_TYPE_CHOICES = [
        ('question', 'Question'),
        ('command', 'Command'),
        ('clarification', 'Clarification'),
        ('feedback', 'Feedback'),
    ]

    RESPONSE_TYPE_CHOICES = [
        ('answer', 'Direct Answer'),
        ('clarification_needed', 'Needs Clarification'),
        ('action_taken', 'Action Taken'),
        ('error', 'Error'),
    ]

    interaction_id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(
        KnowledgeSession,
        on_delete=models.CASCADE,
        related_name='interactions',
        db_index=True
    )

    # Query
    user_query = models.TextField(help_text="User's original query")
    query_type = models.CharField(max_length=50, choices=QUERY_TYPE_CHOICES)
    query_intent = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text="Classified intent of query"
    )

    # Context used
    context_entities = ArrayField(
        models.BigIntegerField(),
        default=list,
        help_text="Entity IDs used in context"
    )
    context_facts = ArrayField(
        models.BigIntegerField(),
        default=list,
        help_text="Fact IDs used in context"
    )

    # Response
    ai_response = models.TextField(help_text="AI's response")
    response_type = models.CharField(max_length=50, choices=RESPONSE_TYPE_CHOICES)
    confidence_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0.00), MaxValueValidator(1.00)],
        null=True,
        blank=True
    )

    # Token usage
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)

    # Learning feedback
    user_feedback = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=[
            ('helpful', 'Helpful'),
            ('not_helpful', 'Not Helpful'),
            ('partially_helpful', 'Partially Helpful'),
        ]
    )
    user_correction = models.TextField(
        null=True,
        blank=True,
        help_text="User's correction if response was wrong"
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'landscape"."knowledge_interactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session', 'created_at']),
            models.Index(fields=['query_intent']),
            models.Index(fields=['user_feedback']),
        ]
        verbose_name = 'Knowledge Interaction'
        verbose_name_plural = 'Knowledge Interactions'

    def __str__(self):
        return f"Interaction {self.interaction_id} - {self.query_type}"


class KnowledgeEmbedding(models.Model):
    """
    Vector embeddings for semantic search (Phase 2).

    Table structure created in Phase 1, vector functionality in Phase 2.
    """

    SOURCE_TYPE_CHOICES = [
        ('entity', 'Entity'),
        ('fact', 'Fact'),
        ('document', 'Document'),
        ('interaction', 'Interaction'),
    ]

    embedding_id = models.BigAutoField(primary_key=True)
    source_type = models.CharField(max_length=50, choices=SOURCE_TYPE_CHOICES, db_index=True)
    source_id = models.BigIntegerField(db_index=True)

    content_text = models.TextField(help_text="Text content that was embedded")

    # Vector field placeholder - will be activated in Phase 2 with pgvector
    # embedding = VectorField(dimensions=1536)  # OpenAI ada-002 dimensions

    entity_ids = ArrayField(
        models.BigIntegerField(),
        default=list,
        help_text="Related entity IDs for filtering"
    )
    tags = ArrayField(
        models.CharField(max_length=100),
        default=list,
        help_text="Searchable tags"
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'landscape"."knowledge_embeddings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['source_type', 'source_id']),
            # Vector index will be added in Phase 2:
            # models.Index(fields=['embedding'], name='idx_embedding_vector', opclasses=['vector_cosine_ops'])
        ]
        verbose_name = 'Knowledge Embedding'
        verbose_name_plural = 'Knowledge Embeddings'

    def __str__(self):
        return f"Embedding {self.embedding_id} - {self.source_type}:{self.source_id}"


class KnowledgeInsight(models.Model):
    """
    AI-discovered patterns, anomalies, and opportunities (Phase 3).

    Table structure created in Phase 1, functionality in Phase 3.
    """

    INSIGHT_TYPE_CHOICES = [
        ('anomaly', 'Anomaly Detection'),
        ('trend', 'Trend Analysis'),
        ('opportunity', 'Opportunity'),
        ('risk', 'Risk Alert'),
        ('benchmark', 'Benchmark Comparison'),
        ('pattern', 'Pattern Discovery'),
    ]

    SEVERITY_CHOICES = [
        ('info', 'Informational'),
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    insight_id = models.BigAutoField(primary_key=True)
    insight_type = models.CharField(max_length=50, choices=INSIGHT_TYPE_CHOICES, db_index=True)

    subject_entity = models.ForeignKey(
        KnowledgeEntity,
        on_delete=models.CASCADE,
        related_name='insights',
        db_index=True
    )
    related_entities = ArrayField(
        models.BigIntegerField(),
        default=list,
        help_text="Other entities involved in this insight"
    )

    insight_title = models.CharField(max_length=500)
    insight_description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')

    supporting_facts = ArrayField(
        models.BigIntegerField(),
        default=list,
        help_text="Fact IDs that support this insight"
    )

    metadata = models.JSONField(
        default=dict,
        help_text="Additional insight data (calculations, comparisons, etc.)"
    )

    # User acknowledgment
    acknowledged = models.BooleanField(default=False, db_index=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_insights'
    )
    user_action = models.TextField(
        null=True,
        blank=True,
        help_text="Action taken by user in response to insight"
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'landscape"."knowledge_insights'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subject_entity', 'insight_type']),
            models.Index(fields=['acknowledged', 'severity']),
            models.Index(fields=['insight_type', 'created_at']),
        ]
        verbose_name = 'Knowledge Insight'
        verbose_name_plural = 'Knowledge Insights'

    def __str__(self):
        return f"{self.insight_type}: {self.insight_title}"

    def acknowledge(self, user, action=None):
        """Mark insight as acknowledged."""
        self.acknowledged = True
        self.acknowledged_at = timezone.now()
        self.acknowledged_by = user
        if action:
            self.user_action = action
        self.save(update_fields=['acknowledged', 'acknowledged_at', 'acknowledged_by', 'user_action'])


# =============================================================================
# PLATFORM KNOWLEDGE MODELS
# Foundational reference documents for Landscaper AI - NOT USER FACING
# =============================================================================

class PlatformKnowledge(models.Model):
    """
    Foundational reference documents for Landscaper AI.

    IMPORTANT: NOT exposed via any user-facing API.
    These documents provide canonical knowledge for AI reasoning without
    being visible to or searchable by users.

    Examples: The Appraisal of Real Estate, Marshall & Swift, USPAP
    """

    class IngestionStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        INDEXED = 'indexed', 'Indexed'
        FAILED = 'failed', 'Failed'

    class KnowledgeDomain(models.TextChoices):
        VALUATION = 'valuation', 'Valuation'
        COST = 'cost', 'Cost'
        MARKET = 'market', 'Market'
        LEGAL = 'legal', 'Legal'
        STANDARDS = 'standards', 'Standards'
        DEVELOPMENT = 'development', 'Development'
        OPERATING_EXPENSES = 'operating_expenses', 'Operating Expenses'
        VALUATION_METHODOLOGY = 'valuation_methodology', 'Valuation Methodology'
        MARKET_DATA = 'market_data', 'Market Data'
        LEGAL_REGULATORY = 'legal_regulatory', 'Legal/Regulatory'
        COST_ESTIMATION = 'cost_estimation', 'Cost Estimation'
        OTHER = 'other', 'Other'

    document_key = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=500)
    subtitle = models.CharField(max_length=500, blank=True, null=True)
    edition = models.CharField(max_length=50, blank=True, null=True)
    publisher = models.CharField(max_length=255, blank=True, null=True)
    publication_year = models.IntegerField(blank=True, null=True)
    isbn = models.CharField(max_length=20, blank=True, null=True)

    knowledge_domain = models.CharField(
        max_length=100,
        choices=KnowledgeDomain.choices
    )
    property_types = models.JSONField(default=list)

    description = models.TextField(blank=True, null=True)
    total_chapters = models.IntegerField(blank=True, null=True)
    total_pages = models.IntegerField(blank=True, null=True)
    page_count = models.IntegerField(blank=True, null=True)

    file_path = models.CharField(max_length=500, blank=True, null=True)
    file_hash = models.CharField(max_length=64, blank=True, null=True)
    file_size_bytes = models.BigIntegerField(blank=True, null=True)

    ingestion_status = models.CharField(
        max_length=50,
        choices=IngestionStatus.choices,
        default=IngestionStatus.PENDING
    )
    chunk_count = models.IntegerField(default=0)
    last_indexed_at = models.DateTimeField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, default='system')

    class Meta:
        db_table = 'landscape"."tbl_platform_knowledge'
        verbose_name = 'Platform Knowledge Document'
        verbose_name_plural = 'Platform Knowledge Documents'

    def __str__(self):
        return f"{self.title} ({self.edition})"


class PlatformKnowledgeChapter(models.Model):
    """
    Chapter-level metadata for targeted RAG retrieval.
    Enables filtering by topic, property type, and task type.
    """

    document = models.ForeignKey(
        PlatformKnowledge,
        on_delete=models.CASCADE,
        related_name='chapters'
    )

    chapter_number = models.IntegerField()
    chapter_title = models.CharField(max_length=500)
    page_start = models.IntegerField(blank=True, null=True)
    page_end = models.IntegerField(blank=True, null=True)

    # Classification for targeted retrieval
    topics = models.JSONField(default=list)
    property_types = models.JSONField(default=list)
    applies_to = models.JSONField(default=list)

    # AI-generated summary
    summary = models.TextField(blank=True, null=True)
    key_concepts = models.JSONField(default=dict)

    # Processing
    chunk_ids = models.JSONField(default=list)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tbl_platform_knowledge_chapters'
        unique_together = ['document', 'chapter_number']
        ordering = ['document', 'chapter_number']

    def __str__(self):
        return f"Ch. {self.chapter_number}: {self.chapter_title}"


class PlatformKnowledgeChunk(models.Model):
    """
    Chunked content with vector embeddings for semantic RAG retrieval.
    """

    class ContentType(models.TextChoices):
        TEXT = 'text', 'Text'
        TABLE = 'table', 'Table'
        FORMULA = 'formula', 'Formula'
        EXAMPLE = 'example', 'Example'
        LIST = 'list', 'List'

    document = models.ForeignKey(
        PlatformKnowledge,
        on_delete=models.CASCADE,
        related_name='chunks'
    )
    chapter = models.ForeignKey(
        PlatformKnowledgeChapter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chunks'
    )

    chunk_index = models.IntegerField()
    content = models.TextField()
    content_type = models.CharField(
        max_length=50,
        choices=ContentType.choices,
        default=ContentType.TEXT
    )

    page_number = models.IntegerField(blank=True, null=True)
    section_path = models.CharField(max_length=500, blank=True, null=True)

    # Embedding stored as JSON array (pgvector handled at SQL level)
    # Raw SQL queries will use the actual vector column
    embedding_model = models.CharField(max_length=100, default='text-embedding-3-small')

    token_count = models.IntegerField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'landscape"."tbl_platform_knowledge_chunks'
        unique_together = ['document', 'chunk_index']
        ordering = ['document', 'chunk_index']

    def __str__(self):
        return f"Chunk {self.chunk_index} - {self.section_path}"


# =============================================================================
# USER KNOWLEDGE MODELS
# Personalized learning from user's projects, documents, and comparables
# =============================================================================

class AssumptionHistory(models.Model):
    """
    Tracks all assumptions users have made across projects.

    Enables pattern learning - e.g., "You've typically used 5% management fee
    for multifamily in this market. Use that here too?"
    """

    class SourceType(models.TextChoices):
        USER_INPUT = 'user_input', 'User Input'
        AI_SUGGESTION = 'ai_suggestion', 'AI Suggestion'
        DOCUMENT_EXTRACT = 'document_extract', 'Document Extraction'

    # Scope
    organization_id = models.BigIntegerField(null=True, blank=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='assumption_history',
        db_column='user_id'
    )
    project_id = models.BigIntegerField(null=True, blank=True)

    # Property context
    property_type = models.CharField(max_length=50)
    property_subtype = models.CharField(max_length=100, null=True, blank=True)
    market = models.CharField(max_length=100, null=True, blank=True)
    submarket = models.CharField(max_length=100, null=True, blank=True)

    # Assumption content
    assumption_category = models.CharField(max_length=100)
    assumption_key = models.CharField(max_length=200)
    assumption_value = models.DecimalField(
        max_digits=20, decimal_places=6, null=True, blank=True
    )
    assumption_text = models.TextField(null=True, blank=True)
    assumption_unit = models.CharField(max_length=50, null=True, blank=True)

    # Context
    context_json = models.JSONField(default=dict)
    source_type = models.CharField(
        max_length=50,
        choices=SourceType.choices
    )
    source_reference = models.TextField(null=True, blank=True)

    # Learning signals
    confidence_score = models.DecimalField(
        max_digits=3, decimal_places=2, default=1.00
    )
    was_modified = models.BooleanField(default=False)
    original_value = models.DecimalField(
        max_digits=20, decimal_places=6, null=True, blank=True
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tbl_assumption_history'
        managed = False
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'property_type']),
            models.Index(fields=['assumption_category', 'assumption_key']),
            models.Index(fields=['market', 'submarket']),
        ]

    def __str__(self):
        return f"{self.assumption_category}.{self.assumption_key} = {self.assumption_value or self.assumption_text}"


class UserDocumentChunk(models.Model):
    """
    Chunked content from user-uploaded documents with embeddings.

    Enables RAG over user's own documents - "Based on the T-12 you uploaded,
    the operating expenses are..."
    """

    # Document reference
    document_id = models.BigIntegerField()
    project_id = models.BigIntegerField(null=True, blank=True)
    organization_id = models.BigIntegerField(null=True, blank=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='document_chunks',
        db_column='user_id'
    )

    # Document metadata
    document_name = models.CharField(max_length=500)
    document_type = models.CharField(max_length=100, null=True, blank=True)

    # Chunk content
    chunk_index = models.IntegerField()
    content = models.TextField()
    content_type = models.CharField(max_length=50, default='text')

    # Location
    page_number = models.IntegerField(null=True, blank=True)
    section_path = models.CharField(max_length=500, null=True, blank=True)

    # Extracted entities
    property_type = models.CharField(max_length=50, null=True, blank=True)
    entities_json = models.JSONField(default=dict)

    # Embedding metadata
    token_count = models.IntegerField(null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'landscape"."tbl_user_document_chunks'
        managed = False
        unique_together = ['document_id', 'chunk_index']
        ordering = ['document_id', 'chunk_index']

    def __str__(self):
        return f"{self.document_name} - Chunk {self.chunk_index}"


class UserComparable(models.Model):
    """
    Comparable properties/sales the user has referenced.

    Enables comp suggestions - "You used a 5.25% cap rate for the similar
    property at 123 Main St. Consider that for this one."
    """

    class ComparableType(models.TextChoices):
        SALE = 'sale', 'Sale Comparable'
        LEASE = 'lease', 'Lease Comparable'
        RENT = 'rent', 'Rent Comparable'
        EXPENSE = 'expense', 'Expense Comparable'

    class SourceType(models.TextChoices):
        USER_INPUT = 'user_input', 'User Input'
        DOCUMENT_EXTRACT = 'document_extract', 'Document Extraction'
        MARKET_DATA = 'market_data', 'Market Data'

    # Ownership
    organization_id = models.BigIntegerField(null=True, blank=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='comparables',
        db_column='user_id'
    )
    project_id = models.BigIntegerField(null=True, blank=True)

    # Comparable identification
    comparable_type = models.CharField(
        max_length=50,
        choices=ComparableType.choices
    )
    property_name = models.CharField(max_length=500)
    property_address = models.TextField(null=True, blank=True)

    # Property characteristics
    property_type = models.CharField(max_length=50)
    property_subtype = models.CharField(max_length=100, null=True, blank=True)
    market = models.CharField(max_length=100, null=True, blank=True)
    submarket = models.CharField(max_length=100, null=True, blank=True)

    # Size metrics
    size_value = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    size_unit = models.CharField(max_length=50, null=True, blank=True)
    year_built = models.IntegerField(null=True, blank=True)

    # Transaction data
    transaction_date = models.DateField(null=True, blank=True)
    price_value = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    price_unit = models.CharField(max_length=50, null=True, blank=True)
    cap_rate = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True
    )
    noi = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )

    # Additional metrics
    metrics_json = models.JSONField(default=dict)

    # Source
    source_type = models.CharField(
        max_length=50,
        choices=SourceType.choices
    )
    source_reference = models.TextField(null=True, blank=True)
    source_document_id = models.BigIntegerField(null=True, blank=True)

    # Quality
    confidence_score = models.DecimalField(
        max_digits=3, decimal_places=2, default=1.00
    )
    is_verified = models.BooleanField(default=False)
    notes = models.TextField(null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tbl_user_comparables'
        managed = False
        ordering = ['-transaction_date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'property_type']),
            models.Index(fields=['comparable_type']),
            models.Index(fields=['market', 'submarket']),
        ]

    def __str__(self):
        return f"{self.comparable_type}: {self.property_name}"


# =============================================================================
# BENCHMARK MODELS
# Structured industry benchmarks (IREM, BOMA, NAA) for direct SQL queries
# =============================================================================

class OpexBenchmark(models.Model):
    """
    Operating expense benchmarks from industry sources (IREM, BOMA, NAA).

    Used for direct SQL queries, not RAG retrieval. Provides structured
    numeric data that can be queried for expense validation and comparison.
    """

    PROPERTY_TYPES = [
        ('multifamily', 'Multifamily'),
        ('office', 'Office'),
        ('retail', 'Retail'),
        ('industrial', 'Industrial'),
    ]

    GEOGRAPHIC_SCOPES = [
        ('national', 'National'),
        ('regional', 'Regional'),
        ('msa', 'MSA'),
        ('state', 'State'),
    ]

    # Source identification
    source = models.CharField(max_length=50, db_index=True)  # IREM, BOMA, NAA
    source_year = models.IntegerField(db_index=True)
    report_name = models.CharField(max_length=255, blank=True, null=True)

    # Scope
    property_type = models.CharField(max_length=50, choices=PROPERTY_TYPES, db_index=True)
    property_subtype = models.CharField(max_length=100, blank=True, null=True)
    geographic_scope = models.CharField(max_length=50, choices=GEOGRAPHIC_SCOPES)
    geography_name = models.CharField(max_length=100, blank=True, null=True)

    # Expense category (maps to OpEx hierarchy)
    expense_category = models.CharField(max_length=100, db_index=True)
    expense_subcategory = models.CharField(max_length=100, blank=True, null=True)

    # Benchmark values
    per_unit_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    per_sf_amount = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    pct_of_egi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    pct_of_gpi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Sample info (for confidence context)
    sample_size = models.IntegerField(null=True, blank=True)
    sample_units = models.IntegerField(null=True, blank=True)

    # Metadata
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."opex_benchmark'
        unique_together = [
            'source', 'source_year', 'property_type',
            'geographic_scope', 'geography_name',
            'expense_category', 'expense_subcategory'
        ]
        indexes = [
            models.Index(fields=['source', 'source_year']),
            models.Index(fields=['property_type', 'property_subtype']),
            models.Index(fields=['expense_category', 'expense_subcategory']),
            models.Index(fields=['geographic_scope', 'geography_name']),
        ]
        verbose_name = 'OpEx Benchmark'
        verbose_name_plural = 'OpEx Benchmarks'

    def __str__(self):
        return f"{self.source} {self.source_year} - {self.expense_category} ({self.geographic_scope})"
