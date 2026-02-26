"""Land Development app configuration."""

from django.apps import AppConfig


class LanddevConfig(AppConfig):
    """Configuration for land development app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.landdev'
    verbose_name = 'Land Development'
