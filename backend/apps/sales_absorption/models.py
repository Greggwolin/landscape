"""
Unmanaged Django models for the Sales & Absorption module tables.

These models map to Neon PostgreSQL tables created via SQL migrations.
"""

from django.db import models


class BenchmarkMarketTiming(models.Model):
    """Global benchmark timing assumptions for development processes."""

    benchmark_timing_id = models.AutoField(primary_key=True)
    process_name = models.CharField(max_length=100)
    process_display_name = models.CharField(max_length=100)
    duration_months = models.IntegerField()
    dependency_trigger = models.CharField(max_length=100, null=True, blank=True)
    dependency_display_name = models.CharField(max_length=100, null=True, blank=True)
    offset_months = models.IntegerField(default=0)
    market_geography = models.CharField(max_length=100, default="national")
    data_source = models.CharField(max_length=200, null=True, blank=True)
    last_updated = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "tbl_benchmark_market_timing"
        ordering = ["sort_order", "process_name"]
        verbose_name = "Benchmark Market Timing"
        verbose_name_plural = "Benchmark Market Timing"

    def __str__(self) -> str:
        return f"{self.process_display_name} ({self.duration_months} mo)"


class BenchmarkAbsorptionVelocity(models.Model):
    """Global benchmark absorption velocity assumptions by classification."""

    benchmark_velocity_id = models.AutoField(primary_key=True)
    classification_code = models.CharField(max_length=50, unique=True)
    classification_display_name = models.CharField(max_length=100)
    units_per_month = models.DecimalField(max_digits=6, decimal_places=2)
    builder_inventory_target_min_months = models.IntegerField(default=18)
    builder_inventory_target_max_months = models.IntegerField(default=24)
    market_geography = models.CharField(max_length=100, default="national")
    data_source = models.CharField(max_length=200, null=True, blank=True)
    last_updated = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "tbl_benchmark_absorption_velocity"
        ordering = ["sort_order", "classification_display_name"]
        verbose_name = "Benchmark Absorption Velocity"
        verbose_name_plural = "Benchmark Absorption Velocities"

    def __str__(self) -> str:
        return f"{self.classification_display_name} ({self.units_per_month} /mo)"


class ProjectTimingAssumption(models.Model):
    """Project-level override for process timing assumptions."""

    project_timing_id = models.AutoField(primary_key=True)
    project_id = models.IntegerField()
    benchmark_timing = models.ForeignKey(
        BenchmarkMarketTiming,
        models.DO_NOTHING,
        db_column="benchmark_timing_id",
        null=True,
        blank=True,
    )
    process_name = models.CharField(max_length=100)
    process_display_name = models.CharField(max_length=100, null=True, blank=True)
    duration_months_override = models.IntegerField(null=True, blank=True)
    dependency_trigger_override = models.CharField(max_length=100, null=True, blank=True)
    offset_months_override = models.IntegerField(null=True, blank=True)
    override_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "tbl_project_timing_assumptions"
        ordering = ["project_id", "process_name"]
        verbose_name = "Project Timing Assumption"
        verbose_name_plural = "Project Timing Assumptions"

    def __str__(self) -> str:
        return f"Project {self.project_id} – {self.process_name}"


class ProjectAbsorptionAssumption(models.Model):
    """Project-level override for absorption velocity by classification."""

    project_absorption_id = models.AutoField(primary_key=True)
    project_id = models.IntegerField()
    benchmark_velocity = models.ForeignKey(
        BenchmarkAbsorptionVelocity,
        models.DO_NOTHING,
        db_column="benchmark_velocity_id",
        null=True,
        blank=True,
    )
    classification_code = models.CharField(max_length=50)
    classification_display_name = models.CharField(max_length=100, null=True, blank=True)
    units_per_month_override = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    override_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "tbl_project_absorption_assumptions"
        unique_together = ("project_id", "classification_code")
        ordering = ["project_id", "classification_code"]
        verbose_name = "Project Absorption Assumption"
        verbose_name_plural = "Project Absorption Assumptions"

    def __str__(self) -> str:
        return f"Project {self.project_id} – {self.classification_code}"


class ParcelSaleEvent(models.Model):
    """Master record of parcel sale contracts (single or structured)."""

    sale_event_id = models.AutoField(primary_key=True)
    project_id = models.IntegerField()
    parcel_id = models.IntegerField()
    phase_id = models.IntegerField(null=True, blank=True)
    sale_type = models.CharField(max_length=50)
    buyer_entity = models.CharField(max_length=200)
    buyer_contact_id = models.IntegerField(null=True, blank=True)
    contract_date = models.DateField()
    total_lots_contracted = models.IntegerField()
    base_price_per_lot = models.DecimalField(max_digits=12, decimal_places=2)
    price_escalation_formula = models.TextField(null=True, blank=True)
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    deposit_date = models.DateField(null=True, blank=True)
    deposit_terms = models.CharField(max_length=100, null=True, blank=True)
    deposit_applied_to_purchase = models.BooleanField(default=True)
    has_escrow_holdback = models.BooleanField(default=False)
    escrow_holdback_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    escrow_release_terms = models.TextField(null=True, blank=True)
    sale_status = models.CharField(max_length=50, default="pending")
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "tbl_parcel_sale_event"
        ordering = ["-contract_date", "-sale_event_id"]
        verbose_name = "Parcel Sale Event"
        verbose_name_plural = "Parcel Sale Events"

    def __str__(self) -> str:
        return f"Sale {self.sale_event_id} – Parcel {self.parcel_id}"


class ClosingEvent(models.Model):
    """Individual takedown/closing record for a parcel sale."""

    closing_id = models.AutoField(primary_key=True)
    sale_event = models.ForeignKey(
        ParcelSaleEvent,
        models.CASCADE,
        db_column="sale_event_id",
        related_name="closings",
    )
    closing_sequence = models.IntegerField(default=1)
    closing_date = models.DateField()
    lots_closed = models.IntegerField()
    gross_proceeds = models.DecimalField(max_digits=15, decimal_places=2)
    less_commissions_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    less_closing_costs = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    less_improvements_credit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    net_proceeds = models.DecimalField(max_digits=15, decimal_places=2)
    cumulative_lots_closed = models.IntegerField()
    lots_remaining = models.IntegerField()
    escrow_release_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    escrow_release_date = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "tbl_closing_event"
        ordering = ["sale_event_id", "closing_sequence"]
        verbose_name = "Closing Event"
        verbose_name_plural = "Closing Events"
        unique_together = ("sale_event", "closing_sequence")

    def __str__(self) -> str:
        return f"Closing {self.closing_id} – Sale {self.sale_event_id}"


class ParcelAbsorptionProfile(models.Model):
    """Per-parcel absorption profile used for the inventory gauge."""

    absorption_profile_id = models.AutoField(primary_key=True)
    project_id = models.IntegerField()
    parcel_id = models.IntegerField(unique=True)
    sale_event = models.ForeignKey(
        ParcelSaleEvent,
        models.DO_NOTHING,
        db_column="sale_event_id",
        null=True,
        blank=True,
    )
    product_classification_code = models.CharField(max_length=50, null=True, blank=True)
    absorption_velocity_override = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sales_start_date = models.DateField(null=True, blank=True)
    initial_inventory_lots = models.IntegerField()
    projected_sellout_date = models.DateField(null=True, blank=True)
    months_to_sellout = models.IntegerField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "tbl_parcel_absorption_profile"
        ordering = ["project_id", "parcel_id"]
        verbose_name = "Parcel Absorption Profile"
        verbose_name_plural = "Parcel Absorption Profiles"

    def __str__(self) -> str:
        return f"Parcel {self.parcel_id} absorption profile"


class ProjectPricingAssumption(models.Model):
    """Project-level pricing assumptions for land use products."""

    id = models.AutoField(primary_key=True)
    project_id = models.IntegerField()
    lu_type_code = models.CharField(max_length=50)
    product_code = models.CharField(max_length=100, null=True, blank=True)
    price_per_unit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    unit_of_measure = models.CharField(max_length=20, null=True, blank=True)
    growth_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    inflation_type = models.CharField(max_length=50, null=True, blank=True)  # Legacy field
    benchmark_id = models.BigIntegerField(null=True, blank=True)
    market_geography = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "land_use_pricing"
        ordering = ["project_id", "lu_type_code", "product_code"]
        verbose_name = "Project Pricing Assumption"
        verbose_name_plural = "Project Pricing Assumptions"
        unique_together = ("project_id", "lu_type_code", "product_code")

    def __str__(self) -> str:
        return f"{self.lu_type_code} - {self.product_code or 'General'} (${self.price_per_unit}/{self.unit_of_measure})"
