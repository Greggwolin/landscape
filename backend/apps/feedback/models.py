"""
Models for tester feedback system and changelog.
"""

import uuid
from django.db import models
from django.conf import settings


class TesterFeedback(models.Model):
    """
    Stores feedback from alpha testers with full context and Landscaper digestion.
    """

    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('addressed', 'Addressed'),
    ]

    CATEGORY_CHOICES = [
        ('bug', 'Bug'),
        ('feature_request', 'Feature Request'),
        ('ux_confusion', 'UX Confusion'),
        ('question', 'Question'),
    ]

    # Legacy feedback_type for backwards compatibility during transition
    FEEDBACK_TYPE_CHOICES = [
        ('bug', 'Bug Report'),
        ('feature', 'Feature Request'),
        ('question', 'Question'),
        ('general', 'General Feedback'),
    ]

    # Who submitted
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='feedback_submissions'
    )

    # Internal ID for cross-reference/deduplication
    internal_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        help_text="Internal UUID for cross-reference"
    )

    # Context - where they were when submitting
    page_url = models.CharField(
        max_length=500,
        help_text="Full URL including query params"
    )
    page_path = models.CharField(
        max_length=255,
        help_text="Path portion of URL, e.g., /projects/123/valuation"
    )
    project_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Project ID if on a project page"
    )
    project_name = models.CharField(max_length=255, null=True, blank=True)

    # Legacy feedback content (kept for backwards compatibility)
    feedback_type = models.CharField(
        max_length=20,
        choices=FEEDBACK_TYPE_CHOICES,
        default='general'
    )
    message = models.TextField()

    # Landscaper-classified fields
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        null=True,
        blank=True,
        help_text="Landscaper-classified category"
    )
    affected_module = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Page/component where feedback originated"
    )
    landscaper_summary = models.TextField(
        null=True,
        blank=True,
        help_text="Digested summary from Landscaper"
    )
    landscaper_raw_chat = models.JSONField(
        default=list,
        blank=True,
        help_text="Full conversation that led to feedback"
    )
    browser_context = models.JSONField(
        default=dict,
        blank=True,
        help_text="Browser, screen size, URL context"
    )

    # Deduplication
    duplicate_of = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='duplicates',
        help_text="Links to original if this is a duplicate"
    )
    report_count = models.PositiveIntegerField(
        default=1,
        help_text="How many users reported same issue"
    )

    # Status tracking (replaces is_resolved)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='submitted',
        help_text="Current status of the feedback item"
    )

    # Admin management
    admin_notes = models.TextField(
        blank=True,
        help_text="Internal notes from admin (private)"
    )
    admin_response = models.TextField(
        null=True,
        blank=True,
        help_text="Public reply visible to tester"
    )
    admin_responded_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When admin responded"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tester_feedback'
        ordering = ['-created_at']
        verbose_name = 'Tester Feedback'
        verbose_name_plural = 'Tester Feedback'
        indexes = [
            models.Index(fields=['internal_id'], name='idx_feedback_internal_id'),
            models.Index(fields=['status'], name='idx_feedback_status'),
            models.Index(fields=['category'], name='idx_feedback_category'),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.category or self.feedback_type} - {self.created_at.strftime('%Y-%m-%d')}"

    @property
    def context_url(self):
        """
        Returns the URL that links back to the user's specific context.
        """
        return self.page_url

    @property
    def is_resolved(self):
        """Backwards compatibility property."""
        return self.status == 'addressed'

    def increment_report_count(self):
        """Increment the report count for duplicate reports."""
        self.report_count += 1
        self.save(update_fields=['report_count', 'updated_at'])


class Changelog(models.Model):
    """
    Stores changelog entries for version tracking.
    """

    changelog_id = models.AutoField(primary_key=True)
    version = models.CharField(
        max_length=20,
        help_text="e.g., v0.1.24"
    )
    deployed_at = models.DateTimeField(auto_now_add=True)
    auto_generated_notes = models.TextField(
        null=True,
        blank=True,
        help_text="From git commits"
    )
    published_notes = models.TextField(
        null=True,
        blank=True,
        help_text="Edited/approved version"
    )
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tbl_changelog'
        ordering = ['-deployed_at']
        verbose_name = 'Changelog'
        verbose_name_plural = 'Changelog Entries'
        indexes = [
            models.Index(fields=['version'], name='idx_changelog_version'),
            models.Index(fields=['-deployed_at'], name='idx_changelog_deployed'),
        ]

    def __str__(self):
        return f"{self.version} - {self.deployed_at.strftime('%Y-%m-%d')}"
