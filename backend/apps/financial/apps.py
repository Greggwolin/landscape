"""Financial app configuration."""

from django.apps import AppConfig


class FinancialConfig(AppConfig):
    """Configuration for financial app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.financial'
    verbose_name = 'Financial'
