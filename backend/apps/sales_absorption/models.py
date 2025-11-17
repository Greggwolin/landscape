"""
Unmanaged Django models for the Sales & Absorption module tables.

These models map to Neon PostgreSQL tables created via SQL migrations.
"""

from django.db import models
from django.contrib.postgres.fields import ArrayField


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


class SalePhase(models.Model):
    """Sale phase groupings for parcels (LEGACY - being replaced by ParcelSaleEvent)."""

    phase_id = models.AutoField(primary_key=True)
    project_id = models.IntegerField()
    phase_code = models.CharField(max_length=20)
    phase_name = models.CharField(max_length=100, null=True, blank=True)
    default_sale_date = models.DateField()
    default_commission_pct = models.DecimalField(max_digits=5, decimal_places=2, default=3.0)
    default_closing_cost_per_unit = models.DecimalField(max_digits=12, decimal_places=2, default=750.0)
    default_onsite_cost_pct = models.DecimalField(max_digits=5, decimal_places=2, default=6.5)
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)
    created_by = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        managed = False
        db_table = "tbl_sale_phases"
        ordering = ["project_id", "phase_code"]
        verbose_name = "Sale Phase"
        verbose_name_plural = "Sale Phases"
        unique_together = ("project_id", "phase_code")

    def __str__(self) -> str:
        return f"Phase {self.phase_code} – Project {self.project_id}"


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

    # Custom overrides for net proceeds calculation (apply to all closings)
    commission_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    closing_cost_per_unit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    onsite_cost_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    has_custom_overrides = models.BooleanField(default=False)

    class Meta:
        managed = False
        db_table = "tbl_parcel_sale_event"
        ordering = ["-contract_date", "-sale_event_id"]
        verbose_name = "Parcel Sale Event"
        verbose_name_plural = "Parcel Sale Events"

    def __str__(self) -> str:
        return f"Sale {self.sale_event_id} – Parcel {self.parcel_id}"

    @property
    def total_units(self):
        """Map total_lots_contracted to total_units for frontend."""
        return self.total_lots_contracted

    @property
    def is_single_closing(self):
        """Check if this is a single closing sale."""
        return self.sale_type == "single_closing"

    @property
    def is_multi_closing(self):
        """Check if this is a multi-closing sale."""
        return self.sale_type in ("multi_closing", "structured_sale")


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

    # Calculated fields (populated by backend logic)
    base_price_per_unit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    inflated_price_per_unit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    uom_code = models.CharField(max_length=10, null=True, blank=True)
    gross_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    onsite_costs = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    commission_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    closing_costs = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    class Meta:
        managed = False
        db_table = "tbl_closing_event"
        ordering = ["sale_event_id", "closing_sequence"]
        verbose_name = "Closing Event"
        verbose_name_plural = "Closing Events"
        unique_together = ("sale_event", "closing_sequence")

    def __str__(self) -> str:
        return f"Closing {self.closing_id} – Sale {self.sale_event_id}"

    @property
    def closing_number(self):
        """Map closing_sequence to closing_number for frontend."""
        return self.closing_sequence

    @property
    def units_closing(self):
        """Map lots_closed to units_closing for frontend."""
        return self.lots_closed


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


class UOMCalculationFormula(models.Model):
    """Registry of calculation formulas for units of measure."""

    formula_id = models.AutoField(primary_key=True)
    uom_code = models.CharField(max_length=10, unique=True)
    formula_name = models.CharField(max_length=50)
    formula_expression = models.TextField()
    required_fields = ArrayField(models.CharField(max_length=50))  # PostgreSQL text[] array
    description = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "tbl_uom_calculation_formulas"
        ordering = ["uom_code"]
        verbose_name = "UOM Calculation Formula"
        verbose_name_plural = "UOM Calculation Formulas"

    def __str__(self) -> str:
        return f"{self.uom_code} - {self.formula_name}"

    def can_calculate(self, parcel_data: dict) -> bool:
        """Check if parcel has all required fields (non-null)."""
        for field in self.required_fields:
            if field not in parcel_data or parcel_data[field] is None or parcel_data[field] == 0:
                return False
        return True

    def calculate(self, parcel_data: dict, inflated_price: float) -> float:
        """
        Safely evaluate formula with parcel data.

        Args:
            parcel_data: Dict with keys: lot_width, units, acres
            inflated_price: Calculated inflated price per UOM

        Returns:
            Calculated gross value
        """
        if not self.can_calculate(parcel_data):
            raise ValueError(f"Missing required fields for {self.uom_code}: {self.required_fields}")

        # Prepare safe evaluation context
        context = {
            'lot_width': float(parcel_data.get('lot_width', 0)),
            'units': float(parcel_data.get('units', 0)),
            'acres': float(parcel_data.get('acres', 0)),
            'inflated_price': float(inflated_price),
        }

        try:
            # Evaluate formula in restricted context
            result = eval(self.formula_expression, {"__builtins__": {}}, context)
            return float(result)
        except Exception as e:
            raise ValueError(f"Formula evaluation failed for {self.uom_code}: {str(e)}")


class Parcel(models.Model):
    """Unmanaged model mapping to existing tbl_parcel table"""

    parcel_id = models.AutoField(primary_key=True)
    project_id = models.IntegerField(null=True)
    phase_id = models.IntegerField(null=True)
    area_id = models.IntegerField(null=True)

    parcel_code = models.CharField(max_length=255, null=True)
    parcel_name = models.CharField(max_length=255, null=True)

    type_code = models.CharField(max_length=50, null=True)
    product_code = models.CharField(max_length=100, null=True)
    family_name = models.CharField(max_length=255, null=True)

    units_total = models.IntegerField(null=True)
    acres_gross = models.DecimalField(max_digits=10, decimal_places=4, null=True)
    lot_width = models.DecimalField(max_digits=8, decimal_places=2, null=True)
    lot_depth = models.DecimalField(max_digits=8, decimal_places=2, null=True)

    sale_date = models.DateField(null=True)

    class Meta:
        managed = False
        db_table = 'tbl_parcel'
        ordering = ['parcel_id']

    def __str__(self) -> str:
        return f"{self.parcel_code or f'P-{self.parcel_id}'}"


class SaleBenchmark(models.Model):
    """Benchmark defaults for sale calculations"""

    SCOPE_CHOICES = [
        ('global', 'Global'),
        ('project', 'Project'),
        ('product', 'Product'),
    ]

    TYPE_CHOICES = [
        ('improvement_offset', 'Improvement Offset'),
        ('legal', 'Legal Fees'),
        ('commission', 'Sales Commission'),
        ('closing', 'Closing Costs'),
        ('title_insurance', 'Title Insurance'),
        ('custom', 'Custom'),
    ]

    benchmark_id = models.AutoField(primary_key=True)
    scope_level = models.CharField(max_length=20, choices=SCOPE_CHOICES)
    project_id = models.IntegerField(null=True, blank=True)
    lu_type_code = models.CharField(max_length=20, null=True, blank=True)
    product_code = models.CharField(max_length=50, null=True, blank=True)

    benchmark_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    benchmark_name = models.CharField(max_length=100, null=True, blank=True)

    rate_pct = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    amount_per_uom = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    fixed_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    uom_code = models.CharField(max_length=10, null=True, blank=True)

    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True)
    updated_by = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'tbl_sale_benchmarks'
        ordering = ['benchmark_type', 'scope_level']

    def __str__(self) -> str:
        return f"{self.benchmark_type} - {self.scope_level}"


class ParcelSaleAssumption(models.Model):
    """Calculated sale proceeds for each parcel"""

    assumption_id = models.AutoField(primary_key=True)
    parcel_id = models.IntegerField(unique=True)
    sale_date = models.DateField()

    # Gross pricing
    base_price_per_unit = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    price_uom = models.CharField(max_length=10, null=True)
    inflation_rate = models.DecimalField(max_digits=8, decimal_places=6, null=True)
    inflated_price_per_unit = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    gross_parcel_price = models.DecimalField(max_digits=15, decimal_places=2, null=True)

    # Improvement offset
    improvement_offset_per_uom = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    improvement_offset_total = models.DecimalField(max_digits=15, decimal_places=2, null=True)
    improvement_offset_source = models.CharField(max_length=50, null=True)
    improvement_offset_override = models.BooleanField(default=False)

    # Gross sale proceeds
    gross_sale_proceeds = models.DecimalField(max_digits=15, decimal_places=2, null=True)

    # Transaction costs
    legal_pct = models.DecimalField(max_digits=5, decimal_places=4, null=True)
    legal_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    legal_override = models.BooleanField(default=False)

    commission_pct = models.DecimalField(max_digits=5, decimal_places=4, null=True)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    commission_override = models.BooleanField(default=False)

    closing_cost_pct = models.DecimalField(max_digits=5, decimal_places=4, null=True)
    closing_cost_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    closing_cost_override = models.BooleanField(default=False)

    title_insurance_pct = models.DecimalField(max_digits=5, decimal_places=4, null=True)
    title_insurance_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    title_insurance_override = models.BooleanField(default=False)

    # Custom costs (JSONB)
    custom_transaction_costs = models.JSONField(default=list)

    # Net result
    total_transaction_costs = models.DecimalField(max_digits=15, decimal_places=2, null=True)
    net_sale_proceeds = models.DecimalField(max_digits=15, decimal_places=2, null=True)
    net_proceeds_per_uom = models.DecimalField(max_digits=12, decimal_places=2, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_parcel_sale_assumptions'

    def __str__(self) -> str:
        return f"Assumptions for Parcel {self.parcel_id}"
