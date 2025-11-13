"""
Django Admin for Knowledge Models
"""

from django.contrib import admin
from .models import (
    KnowledgeEntity, KnowledgeFact, KnowledgeSession,
    KnowledgeInteraction, KnowledgeEmbedding, KnowledgeInsight
)


@admin.register(KnowledgeEntity)
class KnowledgeEntityAdmin(admin.ModelAdmin):
    list_display = ('entity_id', 'entity_type', 'entity_subtype', 'canonical_name', 'created_at')
    list_filter = ('entity_type', 'entity_subtype', 'created_at')
    search_fields = ('canonical_name', 'metadata')
    readonly_fields = ('entity_id', 'created_at')
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('entity_type', 'entity_subtype', 'canonical_name')
        }),
        ('Metadata', {
            'fields': ('metadata',)
        }),
        ('Audit', {
            'fields': ('entity_id', 'created_at', 'created_by')
        }),
    )


@admin.register(KnowledgeFact)
class KnowledgeFactAdmin(admin.ModelAdmin):
    list_display = ('fact_id', 'subject_entity', 'predicate', 'get_object', 'source_type', 'confidence_score', 'is_current')
    list_filter = ('predicate', 'source_type', 'is_current', 'created_at')
    search_fields = ('predicate', 'object_value')
    readonly_fields = ('fact_id', 'created_at')
    
    def get_object(self, obj):
        return obj.object_value or f"→ {obj.object_entity}"
    get_object.short_description = 'Object'
    
    fieldsets = (
        ('Triple', {
            'fields': ('subject_entity', 'predicate', 'object_value', 'object_entity')
        }),
        ('Temporal', {
            'fields': ('valid_from', 'valid_to')
        }),
        ('Provenance', {
            'fields': ('source_type', 'source_id', 'confidence_score')
        }),
        ('Versioning', {
            'fields': ('is_current', 'superseded_by')
        }),
        ('Audit', {
            'fields': ('fact_id', 'created_at', 'created_by')
        }),
    )


@admin.register(KnowledgeSession)
class KnowledgeSessionAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'user', 'project_id', 'session_start', 'session_end', 'loaded_facts_count')
    list_filter = ('session_start', 'session_end')
    search_fields = ('user__email', 'session_id')
    readonly_fields = ('session_id', 'session_start')


@admin.register(KnowledgeInteraction)
class KnowledgeInteractionAdmin(admin.ModelAdmin):
    list_display = ('interaction_id', 'session', 'query_type', 'response_type', 'user_feedback', 'created_at')
    list_filter = ('query_type', 'response_type', 'user_feedback', 'created_at')
    search_fields = ('user_query', 'ai_response')
    readonly_fields = ('interaction_id', 'created_at')


@admin.register(KnowledgeEmbedding)
class KnowledgeEmbeddingAdmin(admin.ModelAdmin):
    list_display = ('embedding_id', 'source_type', 'source_id', 'created_at')
    list_filter = ('source_type', 'created_at')
    readonly_fields = ('embedding_id', 'created_at')


@admin.register(KnowledgeInsight)
class KnowledgeInsightAdmin(admin.ModelAdmin):
    list_display = ('insight_id', 'insight_type', 'subject_entity', 'severity', 'acknowledged', 'created_at')
    list_filter = ('insight_type', 'severity', 'acknowledged', 'created_at')
    search_fields = ('insight_title', 'insight_description')
    readonly_fields = ('insight_id', 'created_at')
