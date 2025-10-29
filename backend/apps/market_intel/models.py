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
    Maps to landscape.tbl_rent_comparable
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_rent_comparable'
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
