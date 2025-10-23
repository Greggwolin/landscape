"""Django models for Documents application."""

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
    
    class Meta:
        managed = False
        db_table = 'core_doc'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.doc_name
