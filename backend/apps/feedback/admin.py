"""
Django admin configuration for feedback and changelog.
"""

from django.contrib import admin
from .models import TesterFeedback, Changelog


@admin.register(TesterFeedback)
class TesterFeedbackAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'user',
        'category',
        'affected_module',
        'message_preview',
        'status',
        'report_count',
        'created_at',
    ]
    list_filter = ['status', 'category', 'feedback_type', 'created_at']
    search_fields = ['user__username', 'message', 'page_path', 'affected_module', 'landscaper_summary']
    readonly_fields = [
        'user',
        'internal_id',
        'created_at',
        'updated_at',
        'admin_responded_at',
        'report_count',
        'browser_context',
        'landscaper_raw_chat',
    ]
    ordering = ['-created_at']

    fieldsets = (
        ('User & Context', {
            'fields': ('user', 'internal_id', 'page_url', 'page_path', 'project_id', 'project_name')
        }),
        ('Feedback Content', {
            'fields': ('message', 'feedback_type', 'category', 'affected_module', 'landscaper_summary')
        }),
        ('Landscaper Data', {
            'fields': ('landscaper_raw_chat', 'browser_context'),
            'classes': ('collapse',),
        }),
        ('Deduplication', {
            'fields': ('duplicate_of', 'report_count'),
        }),
        ('Status & Response', {
            'fields': ('status', 'admin_notes', 'admin_response', 'admin_responded_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def message_preview(self, obj):
        """Show truncated message in list view."""
        text = obj.landscaper_summary or obj.message
        return text[:50] + '...' if len(text) > 50 else text
    message_preview.short_description = 'Summary'


@admin.register(Changelog)
class ChangelogAdmin(admin.ModelAdmin):
    list_display = [
        'version',
        'is_published',
        'deployed_at',
        'notes_preview',
    ]
    list_filter = ['is_published', 'deployed_at']
    search_fields = ['version', 'published_notes', 'auto_generated_notes']
    readonly_fields = ['changelog_id', 'created_at', 'updated_at']
    ordering = ['-deployed_at']

    def notes_preview(self, obj):
        """Show truncated notes in list view."""
        text = obj.published_notes or obj.auto_generated_notes or ''
        return text[:80] + '...' if len(text) > 80 else text
    notes_preview.short_description = 'Notes'
