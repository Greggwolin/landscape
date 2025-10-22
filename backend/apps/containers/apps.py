"""Container app configuration."""

from django.apps import AppConfig


class ContainersConfig(AppConfig):
    """Configuration for containers app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.containers'
    verbose_name = 'Containers'
