from django.conf import settings
from django.db import models
from django.utils import timezone


class UserSettings(models.Model):
    """
    User-specific settings and preferences
    """
    user_id = models.IntegerField(primary_key=True, help_text="User ID (currently simplified, would link to auth user)")
    tier_level = models.CharField(
        max_length=20,
        default='analyst',
        choices=[
            ('analyst', 'Analyst'),
            ('pro', 'Pro'),
        ],
        help_text="User tier level - controls access to Pro features like Capitalization modeling"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."user_settings'
        verbose_name = "User Settings"
        verbose_name_plural = "User Settings"

    def __str__(self):
        return f"User {self.user_id} - {self.tier_level}"


class UserLandscaperProfile(models.Model):
    """
    Stores onboarding metadata for Landscaper alpha users.
    """

    profile_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='landscaper_profile',
        db_column='user_id'
    )

    survey_completed_at = models.DateTimeField(null=True, blank=True)
    role_primary = models.CharField(max_length=50, null=True, blank=True)
    role_property_type = models.CharField(max_length=50, null=True, blank=True)
    ai_proficiency = models.CharField(max_length=50, null=True, blank=True)
    communication_tone = models.CharField(max_length=50, null=True, blank=True)
    primary_tool = models.CharField(max_length=50, null=True, blank=True)
    markets_text = models.TextField(null=True, blank=True)

    compiled_instructions = models.TextField(null=True, blank=True)
    custom_instructions = models.TextField(null=True, blank=True)
    onboarding_chat_history = models.JSONField(default=list)
    interaction_insights = models.JSONField(default=dict)
    document_insights = models.JSONField(default=dict)

    tos_accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tbl_user_landscaper_profile'
        ordering = ['-updated_at']

    def __str__(self):
        return f"LandscaperProfile for {self.user.email}"


class UserGridPreference(models.Model):
    """
    Per-user, per-project grid layout preferences (column order, visibility).
    Supports multiple grids via grid_id (e.g. 'rent_roll', 'budget').
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='grid_preferences',
        db_column='user_id',
    )
    project_id = models.BigIntegerField(help_text="FK to tbl_project.project_id")
    grid_id = models.CharField(
        max_length=50,
        help_text="Grid identifier, e.g. 'rent_roll', 'budget'",
    )
    column_order = models.JSONField(
        default=list,
        help_text='Ordered list of column IDs, e.g. ["unitNumber","bedrooms",...]',
    )
    column_visibility = models.JSONField(
        default=dict,
        help_text='Column ID → boolean, e.g. {"unitNumber": true, "notes": false}',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tbl_user_grid_preference'
        unique_together = [('user', 'project_id', 'grid_id')]
        verbose_name = "User Grid Preference"
        verbose_name_plural = "User Grid Preferences"

    def __str__(self):
        return f"GridPref user={self.user_id} project={self.project_id} grid={self.grid_id}"
