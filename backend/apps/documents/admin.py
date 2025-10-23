"""Admin interface for Documents models."""

from django.contrib import admin
from .models import Document, DocumentFolder


@admin.register(DocumentFolder)
class DocumentFolderAdmin(admin.ModelAdmin):
    """Admin interface for DocumentFolder model."""
    
    list_display = ['folder_id', 'name', 'path', 'parent', 'sort_order', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'path']
    readonly_fields = ['folder_id', 'path', 'created_at', 'updated_at']
    autocomplete_fields = ['parent']
    ordering = ['path']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    """Admin interface for Document model."""
    
    list_display = [
        'doc_id',
        'doc_name',
        'project',
        'doc_type',
        'status',
        'file_size_bytes',
        'created_at'
    ]
    list_filter = ['status', 'doc_type', 'discipline']
    search_fields = ['doc_name', 'project__project_name', 'sha256_hash']
    readonly_fields = ['doc_id', 'sha256_hash', 'created_at', 'updated_at']
    autocomplete_fields = ['project', 'parent_doc']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('doc_id', 'doc_name', 'doc_type', 'discipline', 'status')
        }),
        ('Project Links', {
            'fields': ('project', 'workspace_id', 'phase_id', 'parcel_id')
        }),
        ('File Details', {
            'fields': ('mime_type', 'file_size_bytes', 'sha256_hash', 'storage_uri')
        }),
        ('Versioning', {
            'fields': ('version_no', 'parent_doc'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('profile_json', 'doc_date', 'contract_value', 'priority')
        }),
        ('Audit', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
