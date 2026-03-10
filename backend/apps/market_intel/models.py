"""Django models for Market Intelligence application."""

from django.db import models
from apps.projects.models import Project


class AIIngestionHistory(models.Model):
    """AI document ingestion history. Maps to landscape.ai_ingestion_history"""

    ingestion_id = models.AutoField(primary_key=True)
    doc_id = models.BigIntegerField()
    ingestion_date = models.DateTimeField(auto_now_add=True)
    model_used = models.CharField(max_length=100)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    extracted_data = models.JSONField(default=dict)
    validation_status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'ai_ingestion_history'
        ordering = ['-ingestion_date']

    def __str__(self):
        return f"Ingestion {self.ingestion_id} - Doc {self.doc_id}"


class RentComparable(models.Model):
    """
    Model for rent comparables/competing properties.
    Maps to landscape.tbl_rental_comparable
    """

    comparable_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='rent_comparables'
    )
    property_name = models.CharField(max_length=200)
    address = models.CharField(max_length=300, null=True, blank=True)
    distance_miles = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    year_built = models.IntegerField(null=True, blank=True)
    total_units = models.IntegerField(null=True, blank=True)
    unit_type = models.CharField(max_length=50)  # e.g., "1BR/1BA", "2BR/2BA"
    bedrooms = models.DecimalField(max_digits=3, decimal_places=1)
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1)
    avg_sqft = models.IntegerField()
    asking_rent = models.DecimalField(max_digits=10, decimal_places=2)
    effective_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    concessions = models.CharField(max_length=500, null=True, blank=True)
    amenities = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    data_source = models.CharField(max_length=100, null=True, blank=True)  # e.g., "CoStar", "Apartments.com"
    as_of_date = models.DateField()
    is_active = models.BooleanField(default=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_rental_comparable'
        ordering = ['project', 'distance_miles', 'unit_type']

    def __str__(self):
        return f"{self.property_name} - {self.unit_type}"


class MarketRateAnalysis(models.Model):
    """
    Model for market rate analysis results.
    Maps to landscape.tbl_market_rate_analysis
    """

    analysis_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='market_rate_analyses'
    )
    unit_type = models.CharField(max_length=50)
    bedrooms = models.DecimalField(max_digits=3, decimal_places=1)
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1)
    subject_sqft = models.IntegerField()
    # Comparable statistics
    comp_count = models.IntegerField()
    min_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    avg_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    median_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    avg_rent_per_sf = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    # Adjustments
    location_adjustment = models.DecimalField(max_digits=6, decimal_places=3, default=0, help_text="Percentage adjustment")
    condition_adjustment = models.DecimalField(max_digits=6, decimal_places=3, default=0, help_text="Percentage adjustment")
    amenity_adjustment = models.DecimalField(max_digits=6, decimal_places=3, default=0, help_text="Percentage adjustment")
    size_adjustment_per_sf = models.DecimalField(max_digits=6, decimal_places=3, default=0, help_text="$/SF adjustment")
    # Recommended rates
    recommended_market_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    recommended_rent_per_sf = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    confidence_level = models.CharField(max_length=20, default='MEDIUM')  # LOW, MEDIUM, HIGH
    analysis_notes = models.TextField(null=True, blank=True)
    analyzed_by = models.CharField(max_length=100, null=True, blank=True)
    analysis_date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_market_rate_analysis'
        ordering = ['project', 'bedrooms', 'bathrooms']

    def __str__(self):
        return f"Analysis for {self.project.project_name} - {self.unit_type}"


class MarketData(models.Model):
    """
    Generic market data model.
    This is a placeholder - actual market data tables may vary.
    """

    class Meta:
        managed = False
        abstract = True


class MarketCompetitiveProject(models.Model):
    """
    Model for competitive land development projects.
    Used in Planning & Engineering → Market Analysis page.
    Maps to landscape.market_competitive_projects
    """

    id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='competitive_projects'
    )
    comp_name = models.CharField(max_length=200)
    comp_address = models.TextField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    total_units = models.IntegerField(null=True, blank=True)
    price_min = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    price_max = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    absorption_rate_monthly = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Units per month")
    status = models.CharField(max_length=50, default='selling', help_text="selling, sold_out, planned")
    data_source = models.CharField(max_length=50, default='manual', help_text="manual, landscaper_ai, mls, public_records")
    source_url = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'market_competitive_projects'
        ordering = ['project', '-created_at']

    def __str__(self):
        return f"{self.comp_name} ({self.status})"


class MarketMacroData(models.Model):
    """
    Model for market macro-economic data.
    Used in Planning & Engineering → Market Analysis page.
    Maps to landscape.market_macro_data
    """

    id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='market_macro_data'
    )
    population_growth_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Percentage")
    employment_trend = models.CharField(max_length=50, null=True, blank=True, help_text="growing, stable, declining")
    household_formation_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Percentage")
    building_permits_annual = models.IntegerField(null=True, blank=True)
    median_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    data_year = models.IntegerField(null=True, blank=True)
    data_source = models.CharField(max_length=50, default='manual', help_text="manual, landscaper_ai, census, bls")
    source_url = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'market_macro_data'
        ordering = ['project', '-data_year']

    def __str__(self):
        return f"Macro Data for {self.project.project_name} ({self.data_year})"


# =============================================================================
# Market Intelligence Time Series Models (added 2026-03-10)
# Three-table normalized design for multi-source, multi-geography market data
# =============================================================================

class MarketGeography(models.Model):
    """
    Hierarchical geography dimension for market intelligence.
    Supports national → state → MSA → county → city → zip → submarket.
    Maps to landscape.tbl_market_geography
    """

    GEO_LEVEL_CHOICES = [
        ('national', 'National'),
        ('state', 'State'),
        ('msa', 'MSA'),
        ('county', 'County'),
        ('city', 'City'),
        ('zip', 'ZIP Code'),
        ('submarket', 'Submarket'),
        ('custom', 'Custom'),
    ]

    geography_id = models.AutoField(primary_key=True)
    parent_geography = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='parent_geography_id',
        related_name='children'
    )
    geo_level = models.CharField(max_length=20, choices=GEO_LEVEL_CHOICES)
    geo_name = models.CharField(max_length=200)
    geo_code = models.CharField(max_length=50, null=True, blank=True)
    state_code = models.CharField(max_length=2, null=True, blank=True)
    cbsa_code = models.CharField(max_length=10, null=True, blank=True)
    fips_code = models.CharField(max_length=10, null=True, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_market_geography'
        ordering = ['geo_level', 'geo_name']

    def __str__(self):
        return f"{self.geo_name} ({self.geo_level})"


class MarketSeries(models.Model):
    """
    Registry of tracked market data series.
    Each row = one metric from one source for one geography.
    Decoupled from individual projects — this is market-level data.
    Maps to landscape.tbl_market_series
    """

    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annual', 'Annual'),
    ]

    series_id = models.AutoField(primary_key=True)
    series_code = models.CharField(max_length=100)
    source = models.CharField(max_length=50)  # FRED, RDC, HBACA, CROMFORD, CENSUS
    geography = models.ForeignKey(
        MarketGeography,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='geography_id',
        related_name='series'
    )
    property_type = models.CharField(max_length=20, null=True, blank=True)  # RES, MF, OFF, RET, IND, LAND
    category = models.CharField(max_length=50, null=True, blank=True)  # mortgage_rates, home_prices, permits, inventory
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='monthly')
    unit = models.CharField(max_length=50, null=True, blank=True)  # percent, dollars, units, index
    display_name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    source_series_id = models.CharField(max_length=100, null=True, blank=True)  # External ID at source
    source_url = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_observation_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_market_series'
        ordering = ['source', 'category', 'series_code']

    def __str__(self):
        return f"{self.display_name} ({self.source})"


class MarketObservation(models.Model):
    """
    Time series data points. One row per series per observation date.
    This is the fact table — will grow large over time.
    Maps to landscape.tbl_market_observation
    """

    observation_id = models.BigAutoField(primary_key=True)
    series = models.ForeignKey(
        MarketSeries,
        on_delete=models.CASCADE,
        db_column='series_id',
        related_name='observations'
    )
    obs_date = models.DateField()
    value = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    value_text = models.CharField(max_length=100, null=True, blank=True)
    revision_of = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tbl_market_observation'
        ordering = ['series', '-obs_date']
        unique_together = [['series', 'obs_date']]

    def __str__(self):
        return f"{self.series.series_code} @ {self.obs_date}: {self.value}"
