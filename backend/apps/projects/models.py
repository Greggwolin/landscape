"""
Project models for the Landscape Platform.

IMPORTANT: All models use managed=False to prevent Django from modifying the existing schema.
Tables are mapped to the landscape schema in Neon PostgreSQL.
"""

from django.db import models
from django.conf import settings


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

    # New Taxonomy (as of migration 013)
    analysis_type = models.CharField(max_length=50, blank=True, null=True)
    property_subtype = models.CharField(max_length=100, blank=True, null=True)
    property_class = models.CharField(max_length=50, blank=True, null=True)

    # Primary project classification (migration 013)
    project_type_code = models.CharField(max_length=50, blank=True, null=True, db_column='project_type_code')
    project_type = models.CharField(max_length=50, blank=True, null=True)
    financial_model_type = models.CharField(max_length=50, blank=True, null=True)

    # Taxonomy
    uses_global_taxonomy = models.BooleanField(blank=True, null=True)
    taxonomy_customized = models.BooleanField(blank=True, null=True)

    # Project Details
    target_units = models.IntegerField(blank=True, null=True)
    price_range_low = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    price_range_high = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    # Cross-asset primary measure (count + area)
    primary_count = models.IntegerField(blank=True, null=True)
    primary_count_type = models.CharField(max_length=50, blank=True, null=True)
    primary_area = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    primary_area_type = models.CharField(max_length=50, blank=True, null=True)

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
    planning_efficiency = models.DecimalField(max_digits=5, decimal_places=4, blank=True, null=True)
    discount_rate_pct = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    cost_of_capital_pct = models.DecimalField(max_digits=5, decimal_places=4, blank=True, null=True)
    market_velocity_annual = models.IntegerField(blank=True, null=True)
    velocity_override_reason = models.TextField(blank=True, null=True)

    # GIS & AI
    gis_metadata = models.JSONField(blank=True, null=True)
    ai_last_reviewed = models.DateTimeField(blank=True, null=True)

    # Status
    is_active = models.BooleanField(blank=True, null=True, default=True)
    schema_version = models.IntegerField(blank=True, null=True)
    last_calculated_at = models.DateTimeField(blank=True, null=True)

    # Template
    template_id = models.BigIntegerField(blank=True, null=True)

    # Analysis Mode (napkin = simplified, developer = full tabs)
    analysis_mode = models.CharField(max_length=20, blank=True, null=True, default='napkin')

    # =========================================================================
    # Property Attributes - Core Fields (Migration 063)
    # =========================================================================

    # Site characteristics
    site_shape = models.CharField(max_length=50, blank=True, null=True)
    site_utility_rating = models.IntegerField(blank=True, null=True)
    location_rating = models.IntegerField(blank=True, null=True)
    access_rating = models.IntegerField(blank=True, null=True)
    visibility_rating = models.IntegerField(blank=True, null=True)

    # Improvement characteristics
    building_count = models.IntegerField(blank=True, null=True)
    net_rentable_area = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    land_to_building_ratio = models.DecimalField(max_digits=6, decimal_places=3, blank=True, null=True)
    construction_class = models.CharField(max_length=20, blank=True, null=True)
    construction_type = models.CharField(max_length=50, blank=True, null=True)
    condition_rating = models.IntegerField(blank=True, null=True)
    quality_rating = models.IntegerField(blank=True, null=True)

    # Parking
    parking_spaces = models.IntegerField(blank=True, null=True)
    parking_ratio = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    parking_type = models.CharField(max_length=50, blank=True, null=True)

    # Economic life (for cost approach depreciation)
    effective_age = models.IntegerField(blank=True, null=True)
    total_economic_life = models.IntegerField(blank=True, null=True)
    remaining_economic_life = models.IntegerField(blank=True, null=True)

    # Configurable attributes (JSONB columns)
    site_attributes = models.JSONField(default=dict, blank=True)
    improvement_attributes = models.JSONField(default=dict, blank=True)

    # =========================================================================
    # Property Identification (Physical Description fields)
    # =========================================================================
    street_address = models.CharField(max_length=200, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=10, blank=True, null=True)
    zip_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True, default='United States')
    market = models.CharField(max_length=100, blank=True, null=True)
    submarket = models.CharField(max_length=100, blank=True, null=True)
    apn_primary = models.CharField(max_length=50, blank=True, null=True)
    apn_secondary = models.CharField(max_length=50, blank=True, null=True)
    ownership_type = models.CharField(max_length=50, blank=True, null=True)

    # =========================================================================
    # Site Characteristics
    # =========================================================================
    lot_size_sf = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    lot_size_acres = models.DecimalField(max_digits=12, decimal_places=4, blank=True, null=True)
    current_zoning = models.CharField(max_length=100, blank=True, null=True)
    proposed_zoning = models.CharField(max_length=100, blank=True, null=True)
    flood_zone = models.CharField(max_length=20, blank=True, null=True)
    topography = models.CharField(max_length=50, blank=True, null=True)
    general_plan = models.CharField(max_length=100, blank=True, null=True)
    overlay_zones = models.JSONField(default=list, blank=True)

    # =========================================================================
    # Building Characteristics
    # =========================================================================
    gross_sf = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    total_units = models.IntegerField(blank=True, null=True)
    year_built = models.IntegerField(blank=True, null=True)
    stories = models.IntegerField(blank=True, null=True)

    # =========================================================================
    # Pricing & Valuation
    # =========================================================================
    asking_price = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    acquisition_price = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    acquisition_date = models.DateField(blank=True, null=True)
    price_per_unit = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    price_per_sf = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    cap_rate_current = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True)
    cap_rate_proforma = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True)

    # =========================================================================
    # Current Year Financials
    # =========================================================================
    current_gpr = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    current_other_income = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    current_gpi = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    current_vacancy_rate = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True)
    current_egi = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    current_opex = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    current_noi = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)

    # =========================================================================
    # Proforma Financials
    # =========================================================================
    proforma_gpr = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    proforma_other_income = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    proforma_gpi = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    proforma_vacancy_rate = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True)
    proforma_egi = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    proforma_opex = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    proforma_noi = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)

    # =========================================================================
    # Walkability Scores
    # =========================================================================
    walk_score = models.IntegerField(blank=True, null=True)
    bike_score = models.IntegerField(blank=True, null=True)
    transit_score = models.IntegerField(blank=True, null=True)

    # =========================================================================
    # Additional Project Metadata
    # =========================================================================
    listing_brokerage = models.CharField(max_length=200, blank=True, null=True)
    job_number = models.CharField(max_length=50, blank=True, null=True)
    version_reference = models.CharField(max_length=50, blank=True, null=True)
    msa_id = models.IntegerField(blank=True, null=True)
    dms_template_id = models.BigIntegerField(blank=True, null=True)
    has_takedown_agreement = models.BooleanField(blank=True, null=True, default=False)
    active_opex_discriminator = models.CharField(max_length=100, blank=True, null=True, default='default')
    value_add_enabled = models.BooleanField(blank=True, null=True, default=False)
    cabinet_id = models.BigIntegerField(blank=True, null=True)
    project_focus = models.CharField(max_length=50, blank=True, null=True)

    # Ownership - links to user who created/owns this project
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='projects',
        db_column='created_by_id'
    )

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

# Analysis Type choices (orthogonal to property type)
ANALYSIS_TYPE_CHOICES = [
    ('VALUATION', 'Valuation'),
    ('INVESTMENT', 'Investment'),
    ('DEVELOPMENT', 'Development'),
    ('FEASIBILITY', 'Feasibility'),
]


class AnalysisTypeConfig(models.Model):
    """
    Configuration for each analysis type - controls tile visibility,
    required inputs, and Landscaper behavior.

    Analysis types are orthogonal to property types:
    - VALUATION: Market value opinion (USPAP compliant appraisals)
    - INVESTMENT: Acquisition underwriting (IRR, returns analysis)
    - DEVELOPMENT: Ground-up or redevelopment returns
    - FEASIBILITY: Go/no-go binary decision analysis
    """
    config_id = models.BigAutoField(primary_key=True)
    analysis_type = models.CharField(
        max_length=50,
        unique=True,
        choices=ANALYSIS_TYPE_CHOICES
    )

    # Tile visibility flags
    tile_hbu = models.BooleanField(default=False, help_text="Show H&BU tile")
    tile_valuation = models.BooleanField(default=False, help_text="Show Valuation tile (3 approaches)")
    tile_capitalization = models.BooleanField(default=False, help_text="Show Capitalization tile")
    tile_returns = models.BooleanField(default=False, help_text="Show Returns tile")
    tile_development_budget = models.BooleanField(default=False, help_text="Show Dev Budget tile")

    # Feature/requirement flags
    requires_capital_stack = models.BooleanField(default=False)
    requires_comparable_sales = models.BooleanField(default=False)
    requires_income_approach = models.BooleanField(default=False)
    requires_cost_approach = models.BooleanField(default=False)

    # Report types available (JSON array of report type codes)
    available_reports = models.JSONField(default=list, blank=True)

    # Landscaper behavior context
    landscaper_context = models.TextField(blank=True, null=True)

    # Audit columns
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_analysis_type_config'
        managed = False  # Table created by migration
        verbose_name = 'Analysis Type Config'
        verbose_name_plural = 'Analysis Type Configs'

    def __str__(self):
        return f"{self.analysis_type} Config"

    def get_visible_tiles(self):
        """Return list of visible tile IDs for this analysis type."""
        # Always visible
        tiles = ['project_home', 'property', 'market', 'reports', 'documents']

        # Conditionally visible based on flags
        if self.tile_hbu:
            tiles.insert(3, 'hbu')
        if self.tile_valuation:
            tiles.insert(4, 'valuation')
        if self.tile_capitalization:
            tiles.append('capitalization')
        if self.tile_returns:
            tiles.append('returns')
        if self.tile_development_budget:
            tiles.append('development_budget')

        return tiles


# Phase 5: Import User model to make it available to Django
from .models_user import User, UserProfile, APIKey, PasswordResetToken

__all__ = ['Project', 'AnalysisTypeConfig', 'ANALYSIS_TYPE_CHOICES', 'User', 'UserProfile', 'APIKey', 'PasswordResetToken']
