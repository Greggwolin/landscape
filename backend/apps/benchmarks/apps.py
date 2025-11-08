"""Benchmarks app configuration."""

from django.apps import AppConfig


class BenchmarksConfig(AppConfig):
    """Configuration for benchmarks app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.benchmarks'
    verbose_name = 'Benchmarks'

