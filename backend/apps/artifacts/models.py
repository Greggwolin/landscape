"""
Models for the generative artifact system (Finding #4).

Tables are managed by raw SQL migration `migrations/20260429_create_artifact_tables.up.sql`;
Django ORM is read-only on the schema (managed=False) to match the wider repo
convention for tbl_* tables.
"""

from django.db import models


class Artifact(models.Model):
    """Latest schema + metadata for a generative artifact.

    Maps to landscape.tbl_artifact. Append-only history lives in
    landscape.tbl_artifact_version (model: ArtifactVersion).
    """

    EDIT_SOURCE_CHOICES = [
        ('create', 'Create'),
        ('user_edit', 'User Edit'),
        ('modal_save', 'Modal Save'),
        ('drift_pull', 'Drift Pull'),
        ('restore', 'Restore'),
        ('extraction_commit', 'Extraction Commit'),
        ('cascade', 'Cascade'),
    ]

    artifact_id = models.BigAutoField(primary_key=True)
    project_id = models.IntegerField(null=True, blank=True)
    thread_id = models.UUIDField(null=True, blank=True)
    tool_name = models.CharField(max_length=50)
    params_json = models.JSONField()
    current_state_json = models.JSONField()
    source_pointers_json = models.JSONField(default=dict)
    edit_target_json = models.JSONField(null=True, blank=True)
    title = models.CharField(max_length=255)
    pinned_label = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=False)
    last_edited_at = models.DateTimeField(auto_now_add=False)
    created_by_user_id = models.CharField(max_length=50)
    is_archived = models.BooleanField(default=False)

    class Meta:
        db_table = 'tbl_artifact'  # search_path resolves to landscape schema
        managed = False
        ordering = ['-last_edited_at']
        verbose_name = 'Artifact'
        verbose_name_plural = 'Artifacts'

    def __str__(self):
        return f'Artifact {self.artifact_id}: {self.title}'


class ArtifactVersion(models.Model):
    """Append-only version log entry for an Artifact."""

    version_id = models.BigAutoField(primary_key=True)
    artifact_id = models.BigIntegerField()
    version_seq = models.IntegerField()
    edited_at = models.DateTimeField()
    edited_by_user_id = models.CharField(max_length=50)
    edit_source = models.CharField(max_length=20)
    state_diff_json = models.JSONField()

    class Meta:
        db_table = 'tbl_artifact_version'
        managed = False
        ordering = ['-version_seq']
        unique_together = [('artifact_id', 'version_seq')]
        verbose_name = 'Artifact Version'
        verbose_name_plural = 'Artifact Versions'

    def __str__(self):
        return f'Artifact {self.artifact_id} v{self.version_seq}'
