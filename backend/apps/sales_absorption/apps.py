"""AppConfig for the Sales & Absorption module."""

from django.apps import AppConfig


class SalesAbsorptionConfig(AppConfig):
    """Register signals and metadata for the sales & absorption app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.sales_absorption"
    verbose_name = "Sales & Absorption"
