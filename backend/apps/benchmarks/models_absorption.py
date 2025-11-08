"""Unmanaged models for absorption velocity benchmarks."""

from django.db import models


class BmkAbsorptionVelocity(models.Model):
    """Global absorption velocity assumption (single annual velocity input)."""

    absorption_velocity_id = models.BigAutoField(primary_key=True)
    benchmark_id = models.BigIntegerField()
    velocity_annual = models.IntegerField()
    market_geography = models.CharField(max_length=100, null=True, blank=True)
    project_scale = models.CharField(max_length=20, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'bmk_absorption_velocity'
        verbose_name = 'Absorption Velocity Benchmark'
        verbose_name_plural = 'Absorption Velocity Benchmarks'
        ordering = ['-updated_at', '-created_at']

    def __str__(self) -> str:
        return f'{self.velocity_annual} units/year'


class LandscaperAbsorptionDetail(models.Model):
    """Granular market intelligence records powering Landscaper guidance."""

    detail_id = models.BigAutoField(primary_key=True)
    benchmark_id = models.BigIntegerField(null=True, blank=True)
    data_source_type = models.CharField(max_length=50)
    source_document_id = models.IntegerField(null=True, blank=True)
    extraction_date = models.DateTimeField(auto_now_add=True)
    as_of_period = models.CharField(max_length=20, null=True, blank=True)

    subdivision_name = models.CharField(max_length=200, null=True, blank=True)
    mpc_name = models.CharField(max_length=200, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=2, null=True, blank=True)
    market_geography = models.CharField(max_length=100, null=True, blank=True)

    annual_sales = models.IntegerField(null=True, blank=True)
    monthly_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    yoy_change_pct = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    lot_size_sf = models.IntegerField(null=True, blank=True)
    price_point_low = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    price_point_high = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    builder_name = models.CharField(max_length=100, null=True, blank=True)
    active_subdivisions_count = models.IntegerField(null=True, blank=True)

    product_mix_json = models.JSONField(null=True, blank=True)
    market_tier = models.CharField(max_length=20, null=True, blank=True)
    competitive_supply = models.CharField(max_length=20, null=True, blank=True)

    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'landscaper_absorption_detail'
        verbose_name = 'Landscaper Absorption Detail'
        verbose_name_plural = 'Landscaper Absorption Details'
        ordering = ['-extraction_date', '-created_at']

    def __str__(self) -> str:
        return f'{self.data_source_type} ({self.market_geography or "n/a"})'

