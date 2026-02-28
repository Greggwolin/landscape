"""
Valuation models for comprehensive property appraisal.

Implements the three approaches to value:
- Sales Comparison Approach
- Cost Approach
- Income Approach

Maps to landscape.tbl_sales_comparables, tbl_cost_approach, etc.
"""

from django.db import models
from apps.projects.models import Project



class SalesComparable(models.Model):
    """
    Sales comparable record aligned with CoStar export format.
    Maps to landscape.tbl_sales_comparables.
    """

    comparable_id = models.AutoField(primary_key=True, db_column='comparable_id')
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='sales_comparables',
    )

    # Basic identification
    comp_number = models.IntegerField(null=True, blank=True)
    costar_comp_id = models.CharField(max_length=50, null=True, blank=True)
    property_name = models.CharField(max_length=255, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=2, null=True, blank=True)
    zip = models.CharField(max_length=10, null=True, blank=True)

    # Transaction details
    sale_date = models.DateField(null=True, blank=True)
    sale_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    asking_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_per_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_status = models.CharField(max_length=50, null=True, blank=True)
    comp_status = models.CharField(max_length=50, null=True, blank=True)
    sale_type = models.CharField(max_length=50, null=True, blank=True)
    sale_conditions = models.CharField(max_length=100, null=True, blank=True)
    property_rights = models.CharField(max_length=50, null=True, blank=True)
    hold_period_months = models.IntegerField(null=True, blank=True)
    days_on_market = models.IntegerField(null=True, blank=True)
    transfer_tax = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    document_number = models.CharField(max_length=50, null=True, blank=True)
    escrow_length_days = models.IntegerField(null=True, blank=True)

    # Income/cap rate metrics
    percent_leased_at_sale = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    actual_cap_rate = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    pro_forma_cap_rate = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    cap_rate = models.CharField(max_length=255, null=True, blank=True)
    grm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    gim = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    noi_at_sale = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    gross_income_at_sale = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Financing
    financing_type = models.CharField(max_length=50, null=True, blank=True)
    financing_lender = models.CharField(max_length=255, null=True, blank=True)
    financing_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    financing_rate = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    financing_term_months = models.IntegerField(null=True, blank=True)
    loan_to_value = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    assumed_financing = models.BooleanField(default=False, null=True, blank=True)

    # Buyer/seller details
    recorded_buyer = models.CharField(max_length=255, null=True, blank=True)
    true_buyer = models.CharField(max_length=255, null=True, blank=True)
    buyer_contact = models.CharField(max_length=500, null=True, blank=True)
    buyer_type = models.CharField(max_length=50, null=True, blank=True)
    recorded_seller = models.CharField(max_length=255, null=True, blank=True)
    true_seller = models.CharField(max_length=255, null=True, blank=True)
    seller_contact = models.CharField(max_length=500, null=True, blank=True)
    seller_type = models.CharField(max_length=50, null=True, blank=True)
    buyer_broker_company = models.CharField(max_length=255, null=True, blank=True)
    buyer_broker_name = models.CharField(max_length=255, null=True, blank=True)
    buyer_broker_phone = models.CharField(max_length=50, null=True, blank=True)
    listing_broker_company = models.CharField(max_length=255, null=True, blank=True)
    listing_broker_name = models.CharField(max_length=255, null=True, blank=True)
    listing_broker_phone = models.CharField(max_length=50, null=True, blank=True)
    no_broker_deal = models.BooleanField(default=False, null=True, blank=True)

    # Building/property characteristics
    property_type = models.CharField(max_length=50, null=True, blank=True)
    property_subtype = models.CharField(max_length=100, null=True, blank=True)
    building_class = models.CharField(max_length=10, null=True, blank=True)
    costar_star_rating = models.DecimalField(max_digits=2, decimal_places=1, null=True, blank=True)
    location_type = models.CharField(max_length=50, null=True, blank=True)
    year_built = models.IntegerField(null=True, blank=True)
    num_buildings = models.IntegerField(null=True, blank=True)
    num_floors = models.IntegerField(null=True, blank=True)
    typical_floor_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    units = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit_count = models.IntegerField(null=True, blank=True)
    building_sf = models.CharField(max_length=255, null=True, blank=True)
    avg_unit_size_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    units_per_acre = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    tenancy_type = models.CharField(max_length=50, null=True, blank=True)
    owner_occupied = models.BooleanField(null=True, blank=True)
    parking_spaces = models.IntegerField(null=True, blank=True)
    parking_ratio = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    parking_type = models.CharField(max_length=100, null=True, blank=True)
    elevators = models.IntegerField(null=True, blank=True)
    zoning = models.CharField(max_length=100, null=True, blank=True)
    construction_type = models.CharField(max_length=100, null=True, blank=True)
    roof_type = models.CharField(max_length=100, null=True, blank=True)
    hvac_type = models.CharField(max_length=100, null=True, blank=True)
    sprinklered = models.BooleanField(null=True, blank=True)

    # Land characteristics
    land_area_sf = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    land_area_acres = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    far_allowed = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    far_actual = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    num_parcels = models.IntegerField(null=True, blank=True)
    topography = models.CharField(max_length=100, null=True, blank=True)
    utilities_available = models.CharField(max_length=255, null=True, blank=True)
    entitlements = models.CharField(max_length=500, null=True, blank=True)
    environmental_issues = models.TextField(null=True, blank=True)

    # Tax/assessment
    total_assessed_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    land_assessed_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    improved_assessed_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    assessment_year = models.IntegerField(null=True, blank=True)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    tax_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    percent_improved = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Location/market
    metro_market = models.CharField(max_length=100, null=True, blank=True)
    submarket = models.CharField(max_length=100, null=True, blank=True)
    county = models.CharField(max_length=100, null=True, blank=True)
    cbsa = models.CharField(max_length=150, null=True, blank=True)
    csa = models.CharField(max_length=150, null=True, blank=True)
    dma = models.CharField(max_length=150, null=True, blank=True)
    walk_score = models.IntegerField(null=True, blank=True)
    transit_score = models.IntegerField(null=True, blank=True)
    bike_score = models.IntegerField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    distance_from_subject = models.CharField(max_length=50, null=True, blank=True)

    # Verification/source
    data_source = models.CharField(max_length=50, null=True, blank=True)
    verification_status = models.CharField(max_length=50, null=True, blank=True)
    verification_source = models.CharField(max_length=255, null=True, blank=True)
    verification_date = models.DateField(null=True, blank=True)
    transaction_notes = models.TextField(null=True, blank=True)
    internal_notes = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    # Portfolio/multi-property
    is_portfolio_sale = models.BooleanField(default=False, null=True, blank=True)
    portfolio_name = models.CharField(max_length=255, null=True, blank=True)
    portfolio_property_count = models.IntegerField(null=True, blank=True)
    price_allocation_method = models.CharField(max_length=50, null=True, blank=True)
    allocated_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # JSONB
    unit_mix = models.JSONField(null=True, blank=True)
    site_amenities = models.JSONField(null=True, blank=True)
    extra_data = models.JSONField(null=True, blank=True)
    raw_import_data = models.JSONField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comparables'
        ordering = ['project', 'comp_number']
        verbose_name = 'Sales Comparable'
        verbose_name_plural = 'Sales Comparables'

    def __str__(self):
        return f"Comp {self.comp_number}: {self.property_name or self.address}"

    @property
    def adjusted_price_per_unit(self):
        """Calculate adjusted price per unit after all adjustments."""
        if not self.price_per_unit:
            return None

        total_adjustment_pct = sum(
            (adj.user_adjustment_pct if adj.user_adjustment_pct is not None else adj.adjustment_pct) or 0
            for adj in self.adjustments.all()
        )

        return float(self.price_per_unit) * (1 + float(total_adjustment_pct))


class SalesCompContact(models.Model):
    """Contact associated with a sales comparable (broker, buyer, seller, etc.)."""

    ROLE_CHOICES = [
        ('selling_broker', 'Selling Broker'),
        ('buying_broker', 'Buying Broker'),
        ('buyer', 'Buyer'),
        ('true_buyer', 'True Buyer'),
        ('seller', 'Seller'),
        ('true_seller', 'True Seller'),
    ]

    contact_id = models.AutoField(primary_key=True)
    comparable = models.ForeignKey(
        SalesComparable,
        on_delete=models.CASCADE,
        related_name='contacts',
        db_column='comparable_id',
    )
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    name = models.CharField(max_length=255, blank=True, null=True)
    company = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.CharField(max_length=255, blank=True, null=True)
    is_verification_source = models.BooleanField(default=False)
    verification_date = models.DateField(blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_contacts'
        ordering = ['sort_order', 'contact_id']

    def __str__(self):
        return f"{self.get_role_display()}: {self.name or '(unnamed)'}"


class SalesCompUnitMix(models.Model):
    """Unit mix breakdown for multifamily comparables."""

    unit_mix_id = models.BigAutoField(primary_key=True)
    comparable = models.ForeignKey(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='unit_mix_details',
    )

    bed_count = models.IntegerField(null=True, blank=True)
    bath_count = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    unit_type = models.CharField(max_length=50, null=True, blank=True)

    unit_count = models.IntegerField()
    unit_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    avg_unit_sf = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    total_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    asking_rent_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    asking_rent_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    asking_rent_per_sf_min = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    asking_rent_per_sf_max = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    effective_rent_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    effective_rent_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    effective_rent_per_sf_min = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    effective_rent_per_sf_max = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    vacant_units = models.IntegerField(default=0)
    concession_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    monthly_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    one_time_concession = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    is_rent_regulated = models.BooleanField(default=False)
    rent_type = models.CharField(max_length=50, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_unit_mix'
        ordering = ['bed_count', 'bath_count']
        verbose_name = 'Unit Mix'
        verbose_name_plural = 'Unit Mixes'

    def __str__(self):
        return f"{self.bed_count}BR/{self.bath_count}BA x {self.unit_count}"


class SalesCompTenant(models.Model):
    """Tenant roster for office/retail comparables at time of sale."""

    tenant_id = models.BigAutoField(primary_key=True)
    comparable = models.ForeignKey(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='tenants',
    )

    tenant_name = models.CharField(max_length=255)
    tenant_type = models.CharField(max_length=50, null=True, blank=True)
    is_anchor = models.BooleanField(default=False)
    credit_rating = models.CharField(max_length=20, null=True, blank=True)

    leased_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    floor_number = models.CharField(max_length=50, null=True, blank=True)
    suite_number = models.CharField(max_length=50, null=True, blank=True)
    pct_of_building = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    lease_start_date = models.DateField(null=True, blank=True)
    lease_expiration_date = models.DateField(null=True, blank=True)
    lease_term_months = models.IntegerField(null=True, blank=True)
    lease_type = models.CharField(max_length=50, null=True, blank=True)

    base_rent_psf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    base_rent_annual = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    expense_stop = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ti_allowance_psf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    free_rent_months = models.IntegerField(null=True, blank=True)

    renewal_options = models.TextField(null=True, blank=True)
    expansion_options = models.TextField(null=True, blank=True)
    termination_options = models.TextField(null=True, blank=True)

    sales_psf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    pct_rent_breakpoint = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    pct_rent_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_tenants'
        ordering = ['-leased_sf']
        verbose_name = 'Tenant'
        verbose_name_plural = 'Tenants'

    def __str__(self):
        return f"{self.tenant_name} ({self.leased_sf:,.0f} SF)" if self.leased_sf else self.tenant_name


class SalesCompHistory(models.Model):
    """Historical sales for the same property prior to the comparable sale."""

    history_id = models.BigAutoField(primary_key=True)
    comparable = models.ForeignKey(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='sale_history',
    )

    sale_date = models.DateField()
    sale_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    price_per_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    buyer_name = models.CharField(max_length=255, null=True, blank=True)
    seller_name = models.CharField(max_length=255, null=True, blank=True)
    sale_type = models.CharField(max_length=50, null=True, blank=True)
    document_number = models.CharField(max_length=50, null=True, blank=True)

    is_arms_length = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_history'
        ordering = ['-sale_date']
        verbose_name = 'Sale History'
        verbose_name_plural = 'Sale Histories'

    def __str__(self):
        return f"{self.sale_date} - ${self.sale_price:,.0f}" if self.sale_price else str(self.sale_date)


class SalesCompAdjustment(models.Model):
    """
    Adjustments applied to sales comparables.
    Maps to landscape.tbl_sales_comp_adjustments.
    """

    ADJUSTMENT_TYPES = [
        # Existing values (preserved)
        ('property_rights', 'Property Rights'),
        ('financing', 'Financing'),
        ('conditions_of_sale', 'Conditions of Sale (Legacy)'),
        ('sale_conditions', 'Sale Conditions'),
        ('market_conditions', 'Market Conditions'),
        ('location', 'Location'),
        ('physical_condition', 'Physical Cond'),
        ('physical_age', 'Physical - Age'),
        ('physical_unit_mix', 'Physical - Unit Mix'),
        ('physical_size', 'Physical - Size'),
        ('physical_building_sf', 'Physical - Building SF'),
        ('physical_stories', 'Physical - Stories'),
        ('physical_lot_size', 'Physical - Lot Size'),
        ('economic', 'Economic'),
        ('legal', 'Legal'),
        ('other', 'Other'),
        ('physical_amenities', 'Physical - Amenities'),
    ]

    adjustment_id = models.AutoField(primary_key=True)
    comparable = models.ForeignKey(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='adjustments',
    )
    adjustment_type = models.CharField(max_length=50, choices=ADJUSTMENT_TYPES)
    adjustment_pct = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    adjustment_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    justification = models.TextField(null=True, blank=True)

    # Existing interactive AI adjustments fields
    user_adjustment_pct = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="User's final adjustment value (from Final column)",
    )
    ai_accepted = models.BooleanField(
        default=False,
        help_text='TRUE if user accepted AI suggestion via checkbox',
    )
    user_notes = models.TextField(
        null=True,
        blank=True,
        help_text="User's notes about their adjustment decision",
    )
    last_modified_by = models.CharField(max_length=100, null=True, blank=True)

    # New Landscaper AI analysis fields
    landscaper_analysis = models.TextField(null=True, blank=True)
    user_override_analysis = models.TextField(null=True, blank=True)
    analysis_inputs = models.JSONField(null=True, blank=True)
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    created_by = models.CharField(max_length=50, null=True, blank=True)
    approved_by = models.IntegerField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    subject_value = models.CharField(max_length=255, null=True, blank=True)
    comp_value = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_adjustments'
        ordering = ['comparable', 'adjustment_type']
        verbose_name = 'Sales Comp Adjustment'
        verbose_name_plural = 'Sales Comp Adjustments'

    def __str__(self):
        return f"{self.get_adjustment_type_display()}: {self.adjustment_pct}%"


class SalesCompIndustrial(models.Model):
    """Industrial-specific fields for warehouse/logistics comparables."""

    industrial_id = models.BigAutoField(primary_key=True)
    comparable = models.OneToOneField(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='industrial_details',
    )

    clear_height_min = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    clear_height_max = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    column_spacing = models.CharField(max_length=50, null=True, blank=True)

    dock_doors_exterior = models.IntegerField(null=True, blank=True)
    dock_doors_interior = models.IntegerField(null=True, blank=True)
    drive_in_doors = models.IntegerField(null=True, blank=True)
    rail_doors = models.IntegerField(null=True, blank=True)

    trailer_parking_spaces = models.IntegerField(null=True, blank=True)
    auto_parking_spaces = models.IntegerField(null=True, blank=True)
    yard_area_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    fenced_yard = models.BooleanField(null=True, blank=True)

    rail_access = models.BooleanField(default=False)
    rail_served = models.BooleanField(default=False)
    crane_capacity_tons = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    crane_count = models.IntegerField(null=True, blank=True)
    power_voltage = models.IntegerField(null=True, blank=True)
    power_amps = models.IntegerField(null=True, blank=True)
    power_phase = models.IntegerField(null=True, blank=True)

    office_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    office_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    environmental_phase1 = models.BooleanField(null=True, blank=True)
    environmental_phase2 = models.BooleanField(null=True, blank=True)
    environmental_issues = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_industrial'
        verbose_name = 'Industrial Details'
        verbose_name_plural = 'Industrial Details'


class SalesCompHospitality(models.Model):
    """Hospitality-specific fields for hotel comparables."""

    CHAIN_SCALES = [
        ('luxury', 'Luxury'),
        ('upper_upscale', 'Upper Upscale'),
        ('upscale', 'Upscale'),
        ('upper_midscale', 'Upper Midscale'),
        ('midscale', 'Midscale'),
        ('economy', 'Economy'),
    ]

    hospitality_id = models.BigAutoField(primary_key=True)
    comparable = models.OneToOneField(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='hospitality_details',
    )

    total_rooms = models.IntegerField(null=True, blank=True)
    available_rooms = models.IntegerField(null=True, blank=True)
    suites_count = models.IntegerField(null=True, blank=True)

    occupancy_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    adr = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    revpar = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    rooms_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    fb_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    other_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    flag_brand = models.CharField(max_length=100, null=True, blank=True)
    franchise_company = models.CharField(max_length=255, null=True, blank=True)
    management_company = models.CharField(max_length=255, null=True, blank=True)
    chain_scale = models.CharField(max_length=50, choices=CHAIN_SCALES, null=True, blank=True)

    meeting_space_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    restaurant_count = models.IntegerField(null=True, blank=True)
    pool = models.BooleanField(null=True, blank=True)
    fitness_center = models.BooleanField(null=True, blank=True)
    spa = models.BooleanField(null=True, blank=True)

    last_renovation_year = models.IntegerField(null=True, blank=True)
    last_pia_year = models.IntegerField(null=True, blank=True)

    franchise_expiration = models.DateField(null=True, blank=True)
    management_expiration = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_hospitality'
        verbose_name = 'Hospitality Details'
        verbose_name_plural = 'Hospitality Details'


class SalesCompLand(models.Model):
    """Land-specific fields for development site comparables."""

    land_id = models.BigAutoField(primary_key=True)
    comparable = models.OneToOneField(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='land_details',
    )

    current_zoning = models.CharField(max_length=100, null=True, blank=True)
    proposed_zoning = models.CharField(max_length=100, null=True, blank=True)
    zoning_description = models.TextField(null=True, blank=True)
    entitled = models.BooleanField(default=False)
    entitlement_status = models.CharField(max_length=100, null=True, blank=True)
    approved_uses = models.TextField(null=True, blank=True)
    approved_density = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    approved_units = models.IntegerField(null=True, blank=True)
    approved_sf = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    max_far = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    max_height_ft = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    topography = models.CharField(max_length=100, null=True, blank=True)
    shape = models.CharField(max_length=50, null=True, blank=True)
    frontage_ft = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    depth_ft = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    corner_lot = models.BooleanField(default=False)
    flood_zone = models.CharField(max_length=50, null=True, blank=True)
    wetlands_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    water_available = models.BooleanField(null=True, blank=True)
    sewer_available = models.BooleanField(null=True, blank=True)
    gas_available = models.BooleanField(null=True, blank=True)
    electric_available = models.BooleanField(null=True, blank=True)
    utility_notes = models.TextField(null=True, blank=True)

    existing_improvements = models.TextField(null=True, blank=True)
    demolition_required = models.BooleanField(default=False)
    demolition_cost_estimate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    phase1_complete = models.BooleanField(null=True, blank=True)
    phase2_complete = models.BooleanField(null=True, blank=True)
    remediation_required = models.BooleanField(default=False)
    remediation_cost_estimate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    impact_fees_estimate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    offsite_costs_estimate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_land'
        verbose_name = 'Land Details'
        verbose_name_plural = 'Land Details'


class SalesCompSelfStorage(models.Model):
    """Self-storage specific fields for storage facility comparables."""

    storage_id = models.BigAutoField(primary_key=True)
    comparable = models.OneToOneField(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='self_storage_details',
    )

    total_units = models.IntegerField(null=True, blank=True)
    climate_controlled_units = models.IntegerField(null=True, blank=True)
    non_climate_units = models.IntegerField(null=True, blank=True)
    climate_controlled_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    total_net_rentable_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    climate_controlled_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    avg_unit_size_sf = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    physical_occupancy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    economic_occupancy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    avg_rent_psf = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    gross_potential_rent = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    drive_up_access_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    elevator_served_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    rv_boat_parking_spaces = models.IntegerField(null=True, blank=True)
    vehicle_storage_spaces = models.IntegerField(null=True, blank=True)

    management_type = models.CharField(max_length=50, null=True, blank=True)
    brand_flag = models.CharField(max_length=100, null=True, blank=True)
    third_party_managed = models.BooleanField(null=True, blank=True)

    expansion_potential = models.BooleanField(null=True, blank=True)
    expansion_units = models.IntegerField(null=True, blank=True)
    expansion_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_self_storage'
        verbose_name = 'Self-Storage Details'
        verbose_name_plural = 'Self-Storage Details'


class SalesCompStorageUnitMix(models.Model):
    """Unit mix by size for self-storage comparables."""

    unit_mix_id = models.BigAutoField(primary_key=True)
    storage_comp = models.ForeignKey(
        SalesCompSelfStorage,
        on_delete=models.CASCADE,
        db_column='storage_comp_id',
        related_name='unit_mix',
    )

    unit_size_category = models.CharField(max_length=50, null=True, blank=True)
    unit_width_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    unit_depth_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    unit_sf = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    unit_count = models.IntegerField(null=True, blank=True)
    climate_controlled = models.BooleanField(default=False)
    drive_up_access = models.BooleanField(default=False)

    asking_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    effective_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    occupancy_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_storage_unit_mix'
        verbose_name = 'Storage Unit Mix'
        verbose_name_plural = 'Storage Unit Mixes'


class SalesCompSpecialtyHousing(models.Model):
    """Specialty housing fields for senior/student comparables."""

    specialty_id = models.BigAutoField(primary_key=True)
    comparable = models.OneToOneField(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='specialty_housing_details',
    )

    housing_type = models.CharField(max_length=50)

    total_beds = models.IntegerField(null=True, blank=True)
    total_units = models.IntegerField(null=True, blank=True)
    avg_beds_per_unit = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    independent_living_units = models.IntegerField(null=True, blank=True)
    assisted_living_units = models.IntegerField(null=True, blank=True)
    memory_care_units = models.IntegerField(null=True, blank=True)
    skilled_nursing_beds = models.IntegerField(null=True, blank=True)
    license_type = models.CharField(max_length=100, null=True, blank=True)

    affiliated_university = models.CharField(max_length=255, null=True, blank=True)
    distance_to_campus_miles = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    by_the_bed_leasing = models.BooleanField(null=True, blank=True)
    furnished = models.BooleanField(null=True, blank=True)

    occupancy_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    avg_monthly_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    avg_daily_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    revenue_per_bed = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    operator_name = models.CharField(max_length=255, null=True, blank=True)
    third_party_managed = models.BooleanField(null=True, blank=True)
    medicaid_certified = models.BooleanField(null=True, blank=True)
    medicare_certified = models.BooleanField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_specialty_housing'
        verbose_name = 'Specialty Housing Details'
        verbose_name_plural = 'Specialty Housing Details'


class SalesCompManufactured(models.Model):
    """Manufactured housing/mobile home park specific fields."""

    manufactured_id = models.BigAutoField(primary_key=True)
    comparable = models.OneToOneField(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='manufactured_details',
    )

    total_pads = models.IntegerField(null=True, blank=True)
    occupied_pads = models.IntegerField(null=True, blank=True)
    vacant_pads = models.IntegerField(null=True, blank=True)
    occupancy_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    park_owned_homes = models.IntegerField(null=True, blank=True)
    resident_owned_homes = models.IntegerField(null=True, blank=True)

    avg_pad_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_pad_income = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    home_rental_income = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    utility_income = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    other_income = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    water_sewer_type = models.CharField(max_length=50, null=True, blank=True)
    utilities_included = models.CharField(max_length=255, null=True, blank=True)
    submetered = models.BooleanField(null=True, blank=True)

    clubhouse = models.BooleanField(null=True, blank=True)
    pool = models.BooleanField(null=True, blank=True)
    laundry_facility = models.BooleanField(null=True, blank=True)
    playground = models.BooleanField(null=True, blank=True)

    all_ages = models.BooleanField(default=True)
    senior_community = models.BooleanField(default=False)
    min_age = models.IntegerField(null=True, blank=True)

    rv_spaces = models.IntegerField(null=True, blank=True)
    rv_avg_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_manufactured'
        verbose_name = 'Manufactured Housing Details'
        verbose_name_plural = 'Manufactured Housing Details'


class SalesCompRetail(models.Model):
    """Retail-specific fields for shopping center comparables."""

    retail_id = models.BigAutoField(primary_key=True)
    comparable = models.OneToOneField(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='retail_details',
    )

    center_type = models.CharField(max_length=100, null=True, blank=True)
    anchor_tenant = models.CharField(max_length=255, null=True, blank=True)
    shadow_anchor = models.CharField(max_length=255, null=True, blank=True)

    anchor_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    junior_anchor_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    inline_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    outparcel_count = models.IntegerField(null=True, blank=True)
    outparcel_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    anchor_sales_psf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    inline_sales_psf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_sales_psf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    avg_base_rent_psf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    avg_cam_psf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    avg_all_in_rent_psf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expense_structure = models.CharField(max_length=50, null=True, blank=True)

    traffic_count = models.IntegerField(null=True, blank=True)
    traffic_count_source = models.CharField(max_length=100, null=True, blank=True)

    signage_type = models.CharField(max_length=100, null=True, blank=True)
    pylon_sign = models.BooleanField(null=True, blank=True)
    monument_sign = models.BooleanField(null=True, blank=True)
    freeway_visible = models.BooleanField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_retail'
        verbose_name = 'Retail Details'
        verbose_name_plural = 'Retail Details'


class SalesCompOffice(models.Model):
    """Office-specific fields for office building comparables."""

    LEED_LEVELS = [
        ('certified', 'Certified'),
        ('silver', 'Silver'),
        ('gold', 'Gold'),
        ('platinum', 'Platinum'),
    ]

    office_id = models.BigAutoField(primary_key=True)
    comparable = models.OneToOneField(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='office_details',
    )

    rentable_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    usable_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    loss_factor = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    floor_plate_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    avg_base_rent_psf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expense_stop = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expense_structure = models.CharField(max_length=50, null=True, blank=True)
    avg_ti_psf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    avg_free_rent_months = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)

    direct_vacancy_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    sublease_vacancy_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_vacancy_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    walt_years = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    hvac_type = models.CharField(max_length=100, null=True, blank=True)
    life_safety_system = models.CharField(max_length=100, null=True, blank=True)
    backup_power = models.BooleanField(null=True, blank=True)
    fiber_providers = models.CharField(max_length=255, null=True, blank=True)

    parking_ratio_per_1000 = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    reserved_spaces = models.IntegerField(null=True, blank=True)
    unreserved_spaces = models.IntegerField(null=True, blank=True)
    monthly_parking_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    leed_certified = models.BooleanField(null=True, blank=True)
    leed_level = models.CharField(max_length=50, choices=LEED_LEVELS, null=True, blank=True)
    energy_star_score = models.IntegerField(null=True, blank=True)
    wired_score = models.CharField(max_length=50, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_office'
        verbose_name = 'Office Details'
        verbose_name_plural = 'Office Details'


class SalesCompMarketConditions(models.Model):
    """Market conditions at time of sale for context and adjustment support."""

    market_id = models.BigAutoField(primary_key=True)
    comparable = models.OneToOneField(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='market_conditions',
    )

    as_of_date = models.DateField(null=True, blank=True)

    submarket_vacancy_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    submarket_asking_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    submarket_effective_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    submarket_absorption_sf = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    submarket_inventory_sf = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    metro_vacancy_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    metro_asking_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    metro_cap_rate_avg = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)

    yoy_rent_growth = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    yoy_vacancy_change = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    under_construction_sf = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    planned_sf = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    unemployment_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    job_growth_pct = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    population_growth_pct = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    source = models.CharField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_market_conditions'
        verbose_name = 'Market Conditions'
        verbose_name_plural = 'Market Conditions'


class LkpSaleType(models.Model):
    """Lookup table for sale types."""

    code = models.CharField(max_length=50, primary_key=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    sort_order = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'lkp_sale_type'
        ordering = ['sort_order']
        verbose_name = 'Sale Type'
        verbose_name_plural = 'Sale Types'

    def __str__(self):
        return self.display_name


class LkpPriceStatus(models.Model):
    """Lookup table for price statuses."""

    code = models.CharField(max_length=50, primary_key=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    reliability_score = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'lkp_price_status'
        ordering = ['-reliability_score']
        verbose_name = 'Price Status'
        verbose_name_plural = 'Price Statuses'

    def __str__(self):
        return self.display_name


class LkpBuyerSellerType(models.Model):
    """Lookup table for buyer/seller types."""

    code = models.CharField(max_length=50, primary_key=True)
    display_name = models.CharField(max_length=100)
    sort_order = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'lkp_buyer_seller_type'
        ordering = ['sort_order']
        verbose_name = 'Buyer/Seller Type'
        verbose_name_plural = 'Buyer/Seller Types'

    def __str__(self):
        return self.display_name


class LkpBuildingClass(models.Model):
    """Lookup table for building classes."""

    code = models.CharField(max_length=10, primary_key=True)
    display_name = models.CharField(max_length=50)
    description = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'lkp_building_class'
        ordering = ['code']
        verbose_name = 'Building Class'
        verbose_name_plural = 'Building Classes'

    def __str__(self):
        return f"{self.code} - {self.display_name}"

class AIAdjustmentSuggestion(models.Model):
    """
    AI-generated adjustment suggestions for sales comparables.
    Maps to landscape.tbl_ai_adjustment_suggestions
    """

    CONFIDENCE_LEVELS = [
        ('high', 'High Confidence'),
        ('medium', 'Medium Confidence'),
        ('low', 'Low Confidence'),
        ('none', 'Insufficient Data'),
    ]

    ai_suggestion_id = models.AutoField(primary_key=True)
    comparable = models.ForeignKey(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='ai_suggestions'
    )
    adjustment_type = models.CharField(max_length=50)
    suggested_pct = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    confidence_level = models.CharField(
        max_length=20,
        choices=CONFIDENCE_LEVELS,
        null=True,
        blank=True
    )
    justification = models.TextField(null=True, blank=True)
    model_version = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_ai_adjustment_suggestions'
        unique_together = ['comparable', 'adjustment_type']
        ordering = ['comparable', 'adjustment_type']
        verbose_name = 'AI Adjustment Suggestion'
        verbose_name_plural = 'AI Adjustment Suggestions'

    def __str__(self):
        return f"AI: {self.adjustment_type} for {self.comparable}"


class CostApproach(models.Model):
    """
    Cost Approach valuation methodology.
    Maps to landscape.tbl_cost_approach
    """

    LAND_VALUATION_METHODS = [
        ('sales_comparison', 'Sales Comparison'),
        ('allocation', 'Allocation'),
        ('extraction', 'Extraction'),
        ('other', 'Other'),
    ]

    COST_METHODS = [
        ('comparative_unit', 'Comparative Unit'),
        ('unit_in_place', 'Unit-in-Place'),
        ('quantity_survey', 'Quantity Survey'),
        ('marshall_swift', 'Marshall & Swift'),
        ('other', 'Other'),
    ]

    cost_approach_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='cost_approach'
    )

    # Land Value
    land_valuation_method = models.CharField(
        max_length=50,
        choices=LAND_VALUATION_METHODS,
        null=True,
        blank=True
    )
    land_area_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    land_value_per_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_land_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Replacement Cost
    cost_method = models.CharField(
        max_length=50,
        choices=COST_METHODS,
        null=True,
        blank=True
    )
    building_area_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cost_per_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    base_replacement_cost = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    entrepreneurial_incentive_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_replacement_cost = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Depreciation
    physical_curable = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    physical_incurable_short = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    physical_incurable_long = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    functional_curable = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    functional_incurable = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    external_obsolescence = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_depreciation = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    depreciated_improvements = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Site Improvements
    site_improvements_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    site_improvements_description = models.TextField(null=True, blank=True)

    # Result
    indicated_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_cost_approach'
        verbose_name = 'Cost Approach'
        verbose_name_plural = 'Cost Approaches'

    def __str__(self):
        return f"Cost Approach for {self.project}"


class IncomeApproach(models.Model):
    """
    Income Approach valuation methodology.
    Maps to landscape.tbl_income_approach

    ARCHITECTURE NOTE (QK-16):
    This model contains fields stored ONLY in tbl_income_approach.
    Most assumptions are sourced from normalized tables via IncomeApproachDataService:
      - Vacancy/credit loss -> tbl_project_assumption (physical_vacancy_pct, bad_debt_pct)
      - DCF params -> tbl_cre_dcf_analysis (hold_period_years, discount_rate, etc.)
      - Growth rates -> core_fin_growth_rate_sets/steps (by card_type)
      - Management fee -> tbl_project_assumption (management_fee_pct)

    Migration 046 adds only 4 UI-specific fields not stored elsewhere.
    """

    CAP_RATE_METHODS = [
        ('comp_sales', 'Comparable Sales'),
        ('band_investment', 'Band of Investment'),
        ('investor_survey', 'Investor Survey'),
        ('other', 'Other'),
    ]

    NOI_BASIS_CHOICES = [
        ('trailing_12', 'Trailing 12 Months'),
        ('forward_12', 'Forward 12 Months'),
        ('avg_straddle', 'Average (Straddle)'),
        ('stabilized', 'Stabilized'),
    ]

    income_approach_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='income_approach'
    )

    # ==========================================================================
    # ORIGINAL FIELDS (exist in DB pre-migration 046)
    # ==========================================================================

    # Direct Capitalization
    market_cap_rate_method = models.CharField(
        max_length=50,
        choices=CAP_RATE_METHODS,
        null=True,
        blank=True
    )
    selected_cap_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    cap_rate_justification = models.TextField(null=True, blank=True)
    direct_cap_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # DCF Parameters (original - legacy, prefer tbl_cre_dcf_analysis via service)
    forecast_period_years = models.IntegerField(null=True, blank=True)
    terminal_cap_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    discount_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    dcf_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ==========================================================================
    # MIGRATION 046 FIELDS (UI-specific, not duplicated elsewhere)
    # Run: psql -f migrations/046_income_approach_enhancements.sql
    # ==========================================================================

    # NOI Capitalization Basis - UI state for which NOI to display
    noi_capitalization_basis = models.CharField(
        max_length=20,
        choices=NOI_BASIS_CHOICES,
        default='forward_12',
        null=True,
        blank=True,
        help_text='NOI basis for direct cap: trailing_12, forward_12, avg_straddle, stabilized'
    )

    # Stabilized Vacancy Rate - separate from physical_vacancy_pct in tbl_project_assumption
    # This is market-standard vacancy specifically for stabilized NOI calculation
    stabilized_vacancy_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.05, null=True, blank=True,
        help_text='Market-standard vacancy for stabilized NOI (0.05 = 5%)'
    )

    # Sensitivity Analysis Intervals - UI parameters for sensitivity matrix
    cap_rate_interval = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.0050, null=True, blank=True,
        help_text='Interval for cap rate sensitivity (0.0050 = 50 bps)'
    )
    discount_rate_interval = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.0050, null=True, blank=True,
        help_text='Interval for discount rate sensitivity (0.0050 = 50 bps)'
    )

    # ==========================================================================
    # BAND OF INVESTMENT FIELDS (Migration 20260227)
    # Independent market assumptions for cap rate derivation — NOT from tbl_debt_facility
    # ==========================================================================
    band_mortgage_ltv = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True,
        help_text='Market LTV ratio (e.g. 0.65 = 65%)'
    )
    band_mortgage_rate = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True,
        help_text='Market interest rate (e.g. 0.065 = 6.5%)'
    )
    band_amortization_years = models.IntegerField(
        null=True, blank=True,
        help_text='Amortization period in years (e.g. 25)'
    )
    band_equity_dividend_rate = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True,
        help_text='Required equity dividend rate (e.g. 0.10 = 10%)'
    )

    class Meta:
        managed = False
        db_table = 'tbl_income_approach'
        verbose_name = 'Income Approach'
        verbose_name_plural = 'Income Approaches'

    def __str__(self):
        return f"Income Approach for {self.project}"


class CapRateComp(models.Model):
    """
    Supporting cap rate comparables for Income Approach.
    Maps to landscape.tbl_cap_rate_comps
    """

    cap_rate_comp_id = models.AutoField(primary_key=True)
    income_approach = models.ForeignKey(
        IncomeApproach,
        on_delete=models.CASCADE,
        db_column='income_approach_id',
        related_name='cap_rate_comps'
    )
    property_address = models.CharField(max_length=255, null=True, blank=True)
    sale_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    noi = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    implied_cap_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    sale_date = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tbl_cap_rate_comps'
        ordering = ['income_approach', 'sale_date']
        verbose_name = 'Cap Rate Comparable'
        verbose_name_plural = 'Cap Rate Comparables'

    def __str__(self):
        return f"{self.property_address}: {self.implied_cap_rate}"


class ValuationReconciliation(models.Model):
    """
    Final reconciliation of three approaches to value.
    Maps to landscape.tbl_valuation_reconciliation
    """

    reconciliation_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='valuation_reconciliation'
    )

    sales_comparison_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    sales_comparison_weight = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    cost_approach_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    cost_approach_weight = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    income_approach_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    income_approach_weight = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    final_reconciled_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    reconciliation_narrative = models.TextField(null=True, blank=True)
    valuation_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_valuation_reconciliation'
        verbose_name = 'Valuation Reconciliation'
        verbose_name_plural = 'Valuation Reconciliations'

    def __str__(self):
        return f"Valuation Reconciliation for {self.project}"

    @property
    def total_weight(self):
        """Calculate total weight across all approaches."""
        return (
            float(self.sales_comparison_weight or 0) +
            float(self.cost_approach_weight or 0) +
            float(self.income_approach_weight or 0)
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Highest & Best Use (H&BU) Analysis Models
# ═══════════════════════════════════════════════════════════════════════════════


class HBUAnalysis(models.Model):
    """
    Highest & Best Use analysis implementing the four-test framework.

    Maps to landscape.tbl_hbu_analysis

    Use Cases:
    - Existing Stabilized Property: 1 row (as_improved)
    - Value-Add Analysis: 2 rows (current + renovated)
    - Proposed Development: 2 rows (as_vacant + as_improved)
    - Feasibility Study: 3+ rows (multiple alternatives)
    """

    SCENARIO_TYPES = [
        ('as_vacant', 'As Vacant'),
        ('as_improved', 'As Improved'),
        ('alternative', 'Alternative'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('ai_generated', 'AI Generated'),
        ('user_reviewed', 'User Reviewed'),
        ('final', 'Final'),
    ]

    PRODUCTIVITY_METRICS = [
        ('residual_land_value', 'Residual Land Value'),
        ('irr', 'Internal Rate of Return'),
        ('profit_margin', 'Profit Margin'),
    ]

    hbu_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='hbu_analyses'
    )

    # Scenario identification
    scenario_name = models.CharField(max_length=200)
    scenario_type = models.CharField(max_length=50, choices=SCENARIO_TYPES)

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Legally Permissible
    # ─────────────────────────────────────────────────────────────────────────
    legal_permissible = models.BooleanField(null=True, blank=True)
    legal_zoning_code = models.CharField(max_length=100, blank=True, null=True)
    legal_zoning_source_doc = models.ForeignKey(
        'documents.Document',
        on_delete=models.SET_NULL,
        db_column='legal_zoning_source_doc_id',
        null=True,
        blank=True,
        related_name='hbu_zoning_sources'
    )
    legal_permitted_uses = models.JSONField(null=True, blank=True)
    legal_requires_variance = models.BooleanField(default=False)
    legal_variance_type = models.CharField(max_length=200, blank=True, null=True)
    legal_narrative = models.TextField(blank=True, null=True)

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Physically Possible
    # ─────────────────────────────────────────────────────────────────────────
    physical_possible = models.BooleanField(null=True, blank=True)
    physical_site_adequate = models.BooleanField(null=True, blank=True)
    physical_topography_suitable = models.BooleanField(null=True, blank=True)
    physical_utilities_available = models.BooleanField(null=True, blank=True)
    physical_access_adequate = models.BooleanField(null=True, blank=True)
    physical_constraints = models.JSONField(null=True, blank=True)
    physical_narrative = models.TextField(blank=True, null=True)

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Economically Feasible
    # ─────────────────────────────────────────────────────────────────────────
    economic_feasible = models.BooleanField(null=True, blank=True)
    economic_development_cost = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    economic_stabilized_value = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    economic_residual_land_value = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    economic_profit_margin_pct = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    economic_irr_pct = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    economic_feasibility_threshold = models.CharField(
        max_length=50, blank=True, null=True
    )
    economic_narrative = models.TextField(blank=True, null=True)

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Maximally Productive
    # ─────────────────────────────────────────────────────────────────────────
    is_maximally_productive = models.BooleanField(default=False)
    productivity_rank = models.IntegerField(null=True, blank=True)
    productivity_metric = models.CharField(
        max_length=50, choices=PRODUCTIVITY_METRICS, blank=True, null=True
    )
    productivity_narrative = models.TextField(blank=True, null=True)

    # ─────────────────────────────────────────────────────────────────────────
    # Conclusion
    # ─────────────────────────────────────────────────────────────────────────
    conclusion_use_type = models.CharField(max_length=200, blank=True, null=True)
    conclusion_density = models.CharField(max_length=100, blank=True, null=True)
    conclusion_summary = models.TextField(blank=True, null=True)
    conclusion_full_narrative = models.TextField(blank=True, null=True)

    # ─────────────────────────────────────────────────────────────────────────
    # Status & Audit
    # ─────────────────────────────────────────────────────────────────────────
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, blank=True, null=True)
    updated_by = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tbl_hbu_analysis'
        ordering = ['project', 'productivity_rank', 'scenario_name']
        verbose_name = 'H&BU Analysis'
        verbose_name_plural = 'H&BU Analyses'

    def __str__(self):
        return f"{self.scenario_name} ({self.get_scenario_type_display()})"

    @property
    def passes_all_tests(self):
        """Check if this scenario passes all four H&BU tests."""
        return (
            self.legal_permissible is True and
            self.physical_possible is True and
            self.economic_feasible is True
        )

    @property
    def test_summary(self):
        """Return a summary of test results."""
        return {
            'legal': self.legal_permissible,
            'physical': self.physical_possible,
            'economic': self.economic_feasible,
            'is_hbu': self.is_maximally_productive,
        }


class HBUComparableUse(models.Model):
    """
    Individual uses tested within an H&BU analysis for feasibility comparison.

    Maps to landscape.tbl_hbu_comparable_use
    """

    comparable_use_id = models.BigAutoField(primary_key=True)
    hbu = models.ForeignKey(
        HBUAnalysis,
        on_delete=models.CASCADE,
        db_column='hbu_id',
        related_name='comparable_uses'
    )

    # Use identification
    use_name = models.CharField(max_length=200)
    use_category = models.CharField(max_length=100, blank=True, null=True)

    # Four tests for this specific use
    is_legally_permissible = models.BooleanField(null=True, blank=True)
    is_physically_possible = models.BooleanField(null=True, blank=True)
    is_economically_feasible = models.BooleanField(null=True, blank=True)

    # Key metrics
    proposed_density = models.CharField(max_length=100, blank=True, null=True)
    development_cost = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    stabilized_value = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    residual_land_value = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    irr_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Ranking
    feasibility_rank = models.IntegerField(null=True, blank=True)

    # Notes
    notes = models.TextField(blank=True, null=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tbl_hbu_comparable_use'
        ordering = ['hbu', 'feasibility_rank', 'use_name']
        verbose_name = 'H&BU Comparable Use'
        verbose_name_plural = 'H&BU Comparable Uses'

    def __str__(self):
        return f"{self.use_name} (Rank: {self.feasibility_rank or 'N/A'})"

    @property
    def passes_feasibility(self):
        """Check if this use passes all feasibility tests."""
        return (
            self.is_legally_permissible is True and
            self.is_physically_possible is True and
            self.is_economically_feasible is True
        )


class HBUZoningDocument(models.Model):
    """
    Zoning documents linked to H&BU analysis with AI-extracted data.

    Maps to landscape.tbl_hbu_zoning_document
    """

    zoning_doc_id = models.BigAutoField(primary_key=True)
    hbu = models.ForeignKey(
        HBUAnalysis,
        on_delete=models.CASCADE,
        db_column='hbu_id',
        related_name='zoning_documents'
    )
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        db_column='document_id',
        related_name='hbu_zoning_extractions'
    )

    # Extracted data
    jurisdiction_name = models.CharField(max_length=200, blank=True, null=True)
    zoning_designation = models.CharField(max_length=100, blank=True, null=True)
    permitted_uses_extracted = models.JSONField(null=True, blank=True)
    conditional_uses_extracted = models.JSONField(null=True, blank=True)
    prohibited_uses_extracted = models.JSONField(null=True, blank=True)
    development_standards_extracted = models.JSONField(null=True, blank=True)

    # Extraction metadata
    extraction_confidence = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True
    )
    extraction_date = models.DateTimeField(null=True, blank=True)
    user_verified = models.BooleanField(default=False)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tbl_hbu_zoning_document'
        ordering = ['hbu', '-created_at']
        verbose_name = 'H&BU Zoning Document'
        verbose_name_plural = 'H&BU Zoning Documents'

    def __str__(self):
        return f"Zoning: {self.zoning_designation or 'Pending'} - {self.document.doc_name if self.document else 'No doc'}"

    @property
    def has_extractions(self):
        """Check if AI extractions have been completed."""
        return self.extraction_date is not None


# ═══════════════════════════════════════════════════════════════════════════════
# Property Attribute Definitions
# ═══════════════════════════════════════════════════════════════════════════════


class PropertyAttributeDef(models.Model):
    """
    Configurable property attribute definitions for site and improvement characteristics.

    Maps to landscape.tbl_property_attribute_def

    These definitions drive:
    - Dynamic form rendering in the Property tab
    - Landscaper extraction targeting
    - USPAP-compliant property descriptions

    Categories:
    - site: Site characteristics (physical, utilities, flood, environmental)
    - improvement: Improvement characteristics (construction, mechanical, amenities, obsolescence)
    """

    CATEGORY_CHOICES = [
        ('site', 'Site'),
        ('improvement', 'Improvement'),
    ]

    DATA_TYPE_CHOICES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('boolean', 'Boolean'),
        ('date', 'Date'),
        ('select', 'Select'),
        ('multiselect', 'Multi-Select'),
        ('rating', 'Rating'),
        ('narrative', 'Narrative'),
    ]

    DISPLAY_WIDTH_CHOICES = [
        ('full', 'Full Width'),
        ('half', 'Half Width'),
        ('third', 'Third Width'),
    ]

    attribute_id = models.BigAutoField(primary_key=True)

    # Classification
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    subcategory = models.CharField(max_length=50, blank=True, null=True)

    # Attribute definition
    attribute_code = models.CharField(max_length=50)
    attribute_label = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    # Data type and validation
    data_type = models.CharField(max_length=20, choices=DATA_TYPE_CHOICES)
    options = models.JSONField(blank=True, null=True)  # For select/multiselect
    default_value = models.TextField(blank=True, null=True)
    is_required = models.BooleanField(default=False)

    # Display
    sort_order = models.IntegerField(default=0)
    display_width = models.CharField(
        max_length=20,
        choices=DISPLAY_WIDTH_CHOICES,
        default='full'
    )
    help_text = models.TextField(blank=True, null=True)

    # Property type applicability (null = all types)
    property_types = models.JSONField(blank=True, null=True)

    # Status
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_property_attribute_def'
        ordering = ['category', 'subcategory', 'sort_order']
        unique_together = ['category', 'attribute_code']
        verbose_name = 'Property Attribute Definition'
        verbose_name_plural = 'Property Attribute Definitions'

    def __str__(self):
        return f"{self.category}/{self.subcategory}: {self.attribute_label}"

    @property
    def full_code(self):
        """Return fully qualified attribute code (category.attribute_code)."""
        return f"{self.category}.{self.attribute_code}"

    def get_options_list(self):
        """Return options as list of dicts for select/multiselect types."""
        if self.options and self.data_type in ('select', 'multiselect'):
            return self.options
        return []

    @classmethod
    def get_by_category(cls, category, property_type=None, active_only=True):
        """
        Get all attribute definitions for a category.

        Args:
            category: 'site' or 'improvement'
            property_type: Optional property type code to filter by
            active_only: Only return active definitions

        Returns:
            QuerySet of PropertyAttributeDef
        """
        qs = cls.objects.filter(category=category)
        if active_only:
            qs = qs.filter(is_active=True)
        if property_type:
            # Filter where property_types is null (all types) or contains this type
            from django.db.models import Q
            qs = qs.filter(
                Q(property_types__isnull=True) |
                Q(property_types__contains=[property_type])
            )
        return qs.order_by('subcategory', 'sort_order')

    @classmethod
    def get_grouped_by_subcategory(cls, category, property_type=None):
        """
        Get attribute definitions grouped by subcategory.

        Returns:
            Dict[str, List[PropertyAttributeDef]]
        """
        from collections import defaultdict
        attrs = cls.get_by_category(category, property_type)
        grouped = defaultdict(list)
        for attr in attrs:
            grouped[attr.subcategory or 'general'].append(attr)
        return dict(grouped)


# ═══════════════════════════════════════════════════════════════════════════════
# DCF Analysis (Unified for CRE and Land Development)
# ═══════════════════════════════════════════════════════════════════════════════


class DcfAnalysis(models.Model):
    """
    Unified DCF analysis parameters for both CRE and Land Development projects.

    Maps to landscape.tbl_dcf_analysis

    property_type discriminator determines which fields are relevant:
    - cre: Uses income/expense growth, cap rates, vacancy assumptions
    - land_dev: Uses price/cost inflation, bulk sale parameters

    Use get_or_create_for_project() to ensure a record exists with defaults.
    """

    PROPERTY_TYPE_CHOICES = [
        ('cre', 'Commercial Real Estate'),
        ('land_dev', 'Land Development'),
    ]

    CAP_RATE_METHOD_CHOICES = [
        ('comp_sales', 'Comparable Sales'),
        ('band', 'Band of Investment'),
        ('survey', 'Investor Survey'),
        ('direct_entry', 'Direct Entry'),
    ]

    dcf_analysis_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='dcf_analyses'
    )

    # Property type discriminator
    property_type = models.CharField(
        max_length=20,
        choices=PROPERTY_TYPE_CHOICES,
        help_text='Property type: land_dev (from LAND project_type_code) or cre (all other types)'
    )

    # ─────────────────────────────────────────────────────────────────────────
    # COMMON FIELDS (both property types)
    # ─────────────────────────────────────────────────────────────────────────
    hold_period_years = models.IntegerField(null=True, blank=True)
    discount_rate = models.DecimalField(
        max_digits=6, decimal_places=4, null=True, blank=True,
        help_text='Discount rate for DCF NPV calculation (decimal, e.g., 0.085 = 8.5%)'
    )
    exit_cap_rate = models.DecimalField(
        max_digits=6, decimal_places=4, null=True, blank=True,
        help_text='Terminal/exit cap rate for reversion value (decimal, e.g., 0.06 = 6%)'
    )
    selling_costs_pct = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True,
        help_text='Selling costs as decimal (e.g., 0.02 = 2%)'
    )

    # ─────────────────────────────────────────────────────────────────────────
    # CRE-SPECIFIC FIELDS
    # ─────────────────────────────────────────────────────────────────────────
    going_in_cap_rate = models.DecimalField(
        max_digits=6, decimal_places=4, null=True, blank=True,
        help_text='Going-in cap rate for direct capitalization'
    )
    cap_rate_method = models.CharField(
        max_length=20, choices=CAP_RATE_METHOD_CHOICES, null=True, blank=True
    )
    sensitivity_interval = models.DecimalField(
        max_digits=6, decimal_places=4, null=True, blank=True,
        help_text='Interval for sensitivity matrix (e.g., 0.005 = 50 bps)'
    )
    vacancy_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    stabilized_vacancy = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    credit_loss = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    management_fee_pct = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    reserves_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Growth rate set FKs for CRE
    income_growth_set_id = models.IntegerField(
        null=True, blank=True,
        help_text='FK to core_fin_growth_rate_sets for CRE income growth (rent escalation)'
    )
    expense_growth_set_id = models.IntegerField(
        null=True, blank=True,
        help_text='FK to core_fin_growth_rate_sets for CRE expense growth (OpEx inflation)'
    )

    # ─────────────────────────────────────────────────────────────────────────
    # LAND DEV-SPECIFIC FIELDS
    # ─────────────────────────────────────────────────────────────────────────
    price_growth_set_id = models.IntegerField(
        null=True, blank=True,
        help_text='FK to core_fin_growth_rate_sets for Land Dev price appreciation'
    )
    cost_inflation_set_id = models.IntegerField(
        null=True, blank=True,
        help_text='FK to core_fin_growth_rate_sets for Land Dev development cost inflation'
    )

    # Bulk sale / exit assumptions
    bulk_sale_enabled = models.BooleanField(
        default=False,
        help_text='Land Dev: Whether to model bulk sale of remaining inventory at exit'
    )
    bulk_sale_period = models.IntegerField(
        null=True, blank=True,
        help_text='Period number for bulk sale exit'
    )
    bulk_sale_discount_pct = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True,
        help_text='Land Dev: Discount applied to remaining inventory in bulk sale (decimal)'
    )

    # ─────────────────────────────────────────────────────────────────────────
    # AUDIT FIELDS
    # ─────────────────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_dcf_analysis'
        unique_together = [['project', 'property_type']]
        verbose_name = 'DCF Analysis'
        verbose_name_plural = 'DCF Analyses'

    def __str__(self):
        return f"DCF Analysis for {self.project} ({self.property_type})"

    @classmethod
    def get_property_type_for_project(cls, project):
        """
        Determine the property_type based on project_type_code.

        Args:
            project: Project instance

        Returns:
            'land_dev' if project_type_code is 'LAND', otherwise 'cre'
        """
        return 'land_dev' if project.project_type_code == 'LAND' else 'cre'

    @classmethod
    def get_or_create_for_project(cls, project):
        """
        Get or create DCF analysis for a project.

        Creates with sensible defaults if no record exists.
        property_type is automatically determined from project.project_type_code.

        Args:
            project: Project instance

        Returns:
            Tuple of (DcfAnalysis instance, created boolean)
        """
        property_type = cls.get_property_type_for_project(project)

        defaults = {
            # Common defaults
            'hold_period_years': 10,
            'discount_rate': 0.10,  # 10%
            'exit_cap_rate': 0.06,  # 6%
            'selling_costs_pct': 0.02,  # 2%
        }

        if property_type == 'cre':
            defaults.update({
                'going_in_cap_rate': 0.055,  # 5.5%
                'cap_rate_method': 'comp_sales',
                'sensitivity_interval': 0.005,  # 50 bps
                'vacancy_rate': 0.05,  # 5%
                'stabilized_vacancy': 0.05,
                'credit_loss': 0.01,  # 1%
                'management_fee_pct': 0.03,  # 3%
                'reserves_per_unit': 300,
            })
        else:
            # Land Dev defaults
            defaults.update({
                'bulk_sale_enabled': False,
                'bulk_sale_discount_pct': 0.15,  # 15%
            })

        return cls.objects.get_or_create(
            project=project,
            property_type=property_type,
            defaults=defaults
        )
