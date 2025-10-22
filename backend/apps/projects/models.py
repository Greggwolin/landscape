"""
Project models for the Landscape Platform.

IMPORTANT: All models use managed=False to prevent Django from modifying the existing schema.
Tables are mapped to the landscape schema in Neon PostgreSQL.
"""

from django.db import models


class Project(models.Model):
    """
    Main project model - maps to tbl_project

    Represents a real estate development project with associated properties,
    parcels, and financial data.
    """
    project_id = models.AutoField(primary_key=True)
    project_name = models.CharField(max_length=255)

    # Location
    acres_gross = models.FloatField(blank=True, null=True)
    location_lat = models.FloatField(blank=True, null=True)
    location_lon = models.FloatField(blank=True, null=True)
    location_description = models.TextField(blank=True, null=True)
    project_address = models.TextField(blank=True, null=True)

    # Jurisdiction
    jurisdiction_city = models.CharField(max_length=100, blank=True, null=True)
    jurisdiction_county = models.CharField(max_length=100, blank=True, null=True)
    jurisdiction_state = models.CharField(max_length=10, blank=True, null=True)
    jurisdiction_integrated = models.BooleanField(blank=True, null=True)
    county = models.CharField(max_length=100, blank=True, null=True)

    # Development Type
    development_type = models.CharField(max_length=100, blank=True, null=True)
    project_type = models.CharField(max_length=50, blank=True, null=True)
    property_type_code = models.CharField(max_length=50, blank=True, null=True)
    financial_model_type = models.CharField(max_length=50, blank=True, null=True)

    # Taxonomy
    uses_global_taxonomy = models.BooleanField(blank=True, null=True)
    taxonomy_customized = models.BooleanField(blank=True, null=True)

    # Project Details
    target_units = models.IntegerField(blank=True, null=True)
    price_range_low = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    price_range_high = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    # Ownership
    legal_owner = models.TextField(blank=True, null=True)
    developer_owner = models.TextField(blank=True, null=True)
    existing_land_use = models.TextField(blank=True, null=True)
    assessed_value = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)

    # Dates
    start_date = models.DateField(blank=True, null=True)
    analysis_start_date = models.DateField(blank=True, null=True)
    analysis_end_date = models.DateField(blank=True, null=True)

    # Financial Configuration
    calculation_frequency = models.CharField(max_length=20, blank=True, null=True)
    discount_rate_pct = models.DecimalField(max_digits=5, decimal_places=4, blank=True, null=True)
    cost_of_capital_pct = models.DecimalField(max_digits=5, decimal_places=4, blank=True, null=True)

    # GIS & AI
    gis_metadata = models.JSONField(blank=True, null=True)
    ai_last_reviewed = models.DateTimeField(blank=True, null=True)

    # Status
    is_active = models.BooleanField(blank=True, null=True, default=True)
    schema_version = models.IntegerField(blank=True, null=True)
    last_calculated_at = models.DateTimeField(blank=True, null=True)

    # Template
    template_id = models.BigIntegerField(blank=True, null=True)

    # Metadata
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'tbl_project'  # search_path set to landscape
        managed = False  # DO NOT let Django manage this table
        ordering = ['-created_at']
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'

    def __str__(self):
        return self.project_name or f'Project {self.project_id}'
