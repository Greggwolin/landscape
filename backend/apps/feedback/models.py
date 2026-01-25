"""
Models for tester feedback system.
"""

from django.db import models
from django.conf import settings


class TesterFeedback(models.Model):
    """
    Stores feedback from alpha testers with full context.
    """

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

    # Feedback content
    feedback_type = models.CharField(
        max_length=20,
        choices=FEEDBACK_TYPE_CHOICES,
        default='general'
    )
    message = models.TextField()

    # Admin management
    is_resolved = models.BooleanField(default=False)
    admin_notes = models.TextField(blank=True, help_text="Internal notes from admin")
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_feedback'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tester_feedback'
        ordering = ['-created_at']
        verbose_name = 'Tester Feedback'
        verbose_name_plural = 'Tester Feedback'

    def __str__(self):
        return f"{self.user.username} - {self.feedback_type} - {self.created_at.strftime('%Y-%m-%d')}"

    @property
    def context_url(self):
        """
        Returns the URL that links back to the user's specific context.
        This is the page_url they were on when submitting.
        """
        return self.page_url

    def mark_resolved(self, admin_user):
        """Mark feedback as resolved."""
        from django.utils import timezone
        self.is_resolved = True
        self.resolved_at = timezone.now()
        self.resolved_by = admin_user
        self.save()

    def mark_unresolved(self):
        """Reopen feedback."""
        self.is_resolved = False
        self.resolved_at = None
        self.resolved_by = None
        self.save()
