"""
Django admin configuration for feedback.
"""

from django.contrib import admin
from .models import TesterFeedback


@admin.register(TesterFeedback)
class TesterFeedbackAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'user',
        'feedback_type',
        'message_preview',
        'page_path',
        'is_resolved',
        'created_at',
    ]
    list_filter = ['feedback_type', 'is_resolved', 'created_at']
    search_fields = ['user__username', 'message', 'page_path']
    readonly_fields = ['user', 'created_at', 'updated_at', 'resolved_at', 'resolved_by']
    ordering = ['-created_at']

    def message_preview(self, obj):
        """Show truncated message in list view."""
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    message_preview.short_description = 'Message'
