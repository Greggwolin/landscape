from django.db import models


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
