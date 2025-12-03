"""Django admin configuration for Landscaper AI models."""

from django.contrib import admin
from .models import ChatMessage, LandscaperAdvice


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    """Admin interface for chat messages."""

    list_display = ('message_id', 'project', 'role', 'user', 'timestamp', 'content_preview')
    list_filter = ('role', 'timestamp', 'project')
    search_fields = ('message_id', 'content', 'project__project_name')
    readonly_fields = ('message_id', 'timestamp')
    date_hierarchy = 'timestamp'

    def content_preview(self, obj):
        """Show first 50 characters of content."""
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content

    content_preview.short_description = 'Content Preview'


@admin.register(LandscaperAdvice)
class LandscaperAdviceAdmin(admin.ModelAdmin):
    """Admin interface for advice records."""

    list_display = (
        'advice_id',
        'project',
        'assumption_key',
        'suggested_value',
        'confidence_level',
        'lifecycle_stage',
        'created_at'
    )
    list_filter = ('confidence_level', 'lifecycle_stage', 'created_at')
    search_fields = ('assumption_key', 'project__project_name', 'notes')
    readonly_fields = ('advice_id', 'created_at')
    date_hierarchy = 'created_at'
