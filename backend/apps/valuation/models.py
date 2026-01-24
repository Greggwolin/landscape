"""
Valuation Models

Models for narrative versioning, comments, and track changes.
Supports the TipTap rich text editor with collaborative editing features.
"""

from django.db import models
from django.utils import timezone


class NarrativeVersion(models.Model):
    """
    Stores versions of narrative content for valuation approaches.
    Each save creates a new version, enabling version history and diff comparison.
    """

    APPROACH_CHOICES = [
        ('sales_comparison', 'Sales Comparison'),
        ('cost', 'Cost Approach'),
        ('income', 'Income Approach'),
        ('reconciliation', 'Reconciliation'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('under_review', 'Under Review'),
        ('final', 'Final'),
    ]

    project_id = models.IntegerField(db_column='project_id')
    approach_type = models.CharField(max_length=50, choices=APPROACH_CHOICES)
    version_number = models.IntegerField()
    content = models.JSONField(help_text='TipTap JSON document')
    content_html = models.TextField(blank=True, null=True, help_text='Rendered HTML for display/export')
    content_plain = models.TextField(blank=True, null=True, help_text='Plain text for search/export')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    # TODO: Add user FK once auth is fully implemented
    created_by = models.IntegerField(blank=True, null=True, help_text='User ID (future FK)')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_narrative_version'
        managed = True
        unique_together = ['project_id', 'approach_type', 'version_number']
        ordering = ['-version_number']

    def __str__(self):
        return f"Project {self.project_id} - {self.approach_type} v{self.version_number}"


class NarrativeComment(models.Model):
    """
    Stores inline comments/questions within the narrative.
    Comments ending with ? are treated as questions for Landscaper to answer.
    """

    version = models.ForeignKey(
        NarrativeVersion,
        on_delete=models.CASCADE,
        related_name='comments',
        db_column='version_id'
    )
    comment_text = models.TextField()
    position_start = models.IntegerField(help_text='Character position start in document')
    position_end = models.IntegerField(help_text='Character position end in document')
    is_question = models.BooleanField(default=False, help_text='True if ends with ?')
    is_resolved = models.BooleanField(default=False)
    # TODO: Add user FK once auth is fully implemented
    resolved_by = models.IntegerField(blank=True, null=True, help_text='User ID (future FK)')
    resolved_at = models.DateTimeField(blank=True, null=True)
    landscaper_response = models.TextField(blank=True, null=True, help_text='AI response to question')
    created_by = models.IntegerField(blank=True, null=True, help_text='User ID (future FK)')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'tbl_narrative_comment'
        managed = True
        ordering = ['position_start']

    def __str__(self):
        return f"Comment on version {self.version_id}: {self.comment_text[:50]}..."


class NarrativeChange(models.Model):
    """
    Stores individual text changes for track changes visualization.
    Can be used to show additions/deletions in the document.
    """

    CHANGE_TYPE_CHOICES = [
        ('addition', 'Addition'),
        ('deletion', 'Deletion'),
    ]

    version = models.ForeignKey(
        NarrativeVersion,
        on_delete=models.CASCADE,
        related_name='changes',
        db_column='version_id'
    )
    change_type = models.CharField(max_length=20, choices=CHANGE_TYPE_CHOICES)
    original_text = models.TextField(blank=True, null=True, help_text='Original text (for deletions)')
    new_text = models.TextField(blank=True, null=True, help_text='New text (for additions)')
    position_start = models.IntegerField()
    position_end = models.IntegerField()
    is_accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'tbl_narrative_change'
        managed = True
        ordering = ['position_start']

    def __str__(self):
        return f"{self.change_type} at {self.position_start}-{self.position_end}"
