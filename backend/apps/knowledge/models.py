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
        obj_display = self.object_value or f"’ {self.object_entity}"
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
