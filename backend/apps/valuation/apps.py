"""
Valuation App Configuration
"""

from django.apps import AppConfig


class ValuationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.valuation'
    verbose_name = 'Valuation'
