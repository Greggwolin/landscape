"""
Models for the changelog.

The TesterFeedback model was retired in LSCMD-FBUNIFY-0613-qz (its table was
renamed to landscape.tester_feedback_deprecated). Feedback is now canonical in
landscape.tbl_feedback, which has no Django model — it is accessed via raw SQL
(apps.feedback.views_canonical, the nightly daily brief, and the landscaper
management commands). The state-only removal of TesterFeedback from Django's
migration graph lives in migration 0003.
"""

from django.db import models


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
