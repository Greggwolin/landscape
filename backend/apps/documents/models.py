"""Django models for Documents application."""

from django.conf import settings
from django.db import models
from apps.projects.models import Project


class DocumentFolder(models.Model):
    """Document folder model. Maps to landscape.core_doc_folder"""
    
    folder_id = models.AutoField(primary_key=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        db_column='parent_id',
        null=True,
        blank=True,
        related_name='children'
    )
    name = models.CharField(max_length=255)
    path = models.TextField()
    sort_order = models.IntegerField(default=0)
    default_profile = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        managed = False
        db_table = 'core_doc_folder'
        ordering = ['path']
    
    def __str__(self):
        return self.path


class Document(models.Model):
    """Document model. Maps to landscape.core_doc"""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('processing', 'Processing'),
        ('indexed', 'Indexed'),
        ('failed', 'Failed'),
        ('archived', 'Archived'),
    ]
    
    doc_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        null=True,
        blank=True,
        related_name='documents'
    )
    workspace_id = models.BigIntegerField(null=True, blank=True)
    phase_id = models.BigIntegerField(null=True, blank=True)
    parcel_id = models.BigIntegerField(null=True, blank=True)
    doc_name = models.CharField(max_length=500)
    doc_type = models.CharField(max_length=100, default='general')
    discipline = models.CharField(max_length=100, null=True, blank=True)
    mime_type = models.CharField(max_length=100)
    file_size_bytes = models.BigIntegerField()
    sha256_hash = models.CharField(max_length=64)
    storage_uri = models.TextField()
    version_no = models.IntegerField(default=1)
    parent_doc = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        db_column='parent_doc_id',
        null=True,
        blank=True,
        related_name='versions'
    )
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='draft')
    profile_json = models.JSONField(default=dict)
    doc_date = models.DateField(null=True, blank=True)
    contract_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    priority = models.CharField(max_length=20, null=True, blank=True)
    created_by = models.BigIntegerField(null=True, blank=True)
    updated_by = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Media scan fields
    media_scan_status = models.CharField(max_length=20, default='unscanned')
    media_scan_json = models.JSONField(null=True, blank=True)
    # Soft delete fields
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'core_doc'
        ordering = ['-created_at']

    def __str__(self):
        return self.doc_name

    @property
    def is_deleted(self):
        """Check if document is soft deleted."""
        return self.deleted_at is not None


class DMSAssertion(models.Model):
    """
    DMS Assertion model - stores extracted data from documents.
    Maps to landscape.dms_assertion
    """

    assertion_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        null=True,
        blank=True,
        related_name='assertions'
    )
    doc_id = models.TextField()  # Can reference core_doc or other doc systems
    subject_type = models.CharField(max_length=255, null=True, blank=True)
    subject_ref = models.TextField(null=True, blank=True)
    metric_key = models.TextField(null=True, blank=True)
    value_num = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    value_text = models.TextField(null=True, blank=True)
    units = models.TextField(null=True, blank=True)
    context = models.CharField(max_length=255, null=True, blank=True)
    page = models.IntegerField(null=True, blank=True)
    bbox = models.JSONField(null=True, blank=True)  # Bounding box coordinates
    confidence = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    source = models.CharField(max_length=255, null=True, blank=True)
    as_of_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'dms_assertion'
        ordering = ['-created_at']

    def __str__(self):
        return f"Assertion {self.assertion_id} - {self.metric_key}"


class DMSExtractQueue(models.Model):
    """
    DMS Extract Queue model - tracks document extraction jobs.
    Maps to landscape.dms_extract_queue
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    queue_id = models.AutoField(primary_key=True)
    doc_id = models.BigIntegerField()
    extract_type = models.CharField(max_length=100)  # 'rent_roll', 't12', etc.
    priority = models.IntegerField(default=5)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)
    error_message = models.TextField(null=True, blank=True)
    extracted_data = models.JSONField(null=True, blank=True)
    extracted_text = models.TextField(null=True, blank=True)  # Raw document text
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'dms_extract_queue'
        ordering = ['-priority', 'created_at']

    def __str__(self):
        return f"Extract Job {self.queue_id} - {self.extract_type} ({self.status})"


class AICorrectionLog(models.Model):
    """
    AI Correction Log model - tracks user corrections to AI extractions.
    This table may need to be created in the database.
    """

    correction_id = models.AutoField(primary_key=True)
    extraction_result_id = models.BigIntegerField()  # References extraction job
    user_id = models.BigIntegerField()
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        null=True,
        blank=True,
        related_name='ai_corrections'
    )
    doc_id = models.TextField(null=True, blank=True)
    field_path = models.CharField(max_length=255)  # JSON path to corrected field
    ai_value = models.TextField(null=True, blank=True)
    user_value = models.TextField(null=True, blank=True)
    correction_type = models.CharField(max_length=100)  # 'value_wrong', 'field_missing', etc.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'ai_correction_log'
        ordering = ['-created_at']

    def __str__(self):
        return f"Correction {self.correction_id} - {self.field_path}"


class ExtractionCommitSnapshot(models.Model):
    """Snapshot of data before extraction commit, enables rollback."""

    snapshot_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id'
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='doc_id',
        related_name='extraction_snapshots'
    )
    scope = models.CharField(max_length=50)
    committed_at = models.DateTimeField(auto_now_add=True)
    committed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='committed_by'
    )
    snapshot_data = models.JSONField()
    changes_applied = models.JSONField()
    is_active = models.BooleanField(default=True)
    rolled_back_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'extraction_commit_snapshot'
        indexes = [
            models.Index(fields=['project', 'scope', 'is_active'], name='snapshot_project_scope_idx'),
        ]

    def __str__(self):
        return f"Snapshot {self.snapshot_id} ({self.scope})"
