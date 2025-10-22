"""Calculations app configuration."""

from django.apps import AppConfig


class CalculationsConfig(AppConfig):
    """Configuration for calculations app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.calculations'
    verbose_name = 'Calculations'
