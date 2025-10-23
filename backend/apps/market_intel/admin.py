"""Admin interface for Market Intelligence models."""

from django.contrib import admin
from .models import AIIngestionHistory


@admin.register(AIIngestionHistory)
class AIIngestionHistoryAdmin(admin.ModelAdmin):
    """Admin interface for AIIngestionHistory model."""
    
    list_display = [
        'ingestion_id',
        'doc_id',
        'ingestion_date',
        'model_used',
        'confidence_score',
        'validation_status'
    ]
    list_filter = ['validation_status', 'model_used', 'ingestion_date']
    search_fields = ['doc_id', 'model_used']
    readonly_fields = ['ingestion_id', 'ingestion_date', 'created_at']
    ordering = ['-ingestion_date']
    date_hierarchy = 'ingestion_date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('ingestion_id', 'doc_id', 'ingestion_date')
        }),
        ('AI Processing', {
            'fields': ('model_used', 'confidence_score', 'validation_status')
        }),
        ('Extracted Data', {
            'fields': ('extracted_data',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
