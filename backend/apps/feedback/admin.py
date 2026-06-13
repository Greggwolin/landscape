"""
Django admin configuration for the changelog.

The TesterFeedback admin was retired in LSCMD-FBUNIFY-0613-qz; feedback is now
managed from the /admin/feedback page backed by landscape.tbl_feedback.
"""

from django.contrib import admin
from .models import Changelog


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
