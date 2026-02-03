"""
Acquisition models for property acquisition tracking.

Maps to landscape.tbl_acquisition and landscape.tbl_property_acquisition tables.
"""

from django.db import models
from decimal import Decimal


class AcquisitionEvent(models.Model):
    """
    Acquisition ledger events (ALTA-inspired).

    Maps to landscape.tbl_acquisition table.

    Tracks all acquisition-related events:
    - Deposits (earnest money, down payments)
    - Credits (seller credits, closing cost credits)
    - Fees (due diligence, inspection, legal)
    - Other transaction events
    """

    acquisition_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='acquisition_events'
    )
    contact_id = models.IntegerField(
        null=True,
        blank=True,
        help_text='Reference to contact (buyer, seller, etc.)'
    )

    # Category Classification (references core_unit_cost_category)
    category = models.ForeignKey(
        'financial.UnitCostCategory',
        on_delete=models.SET_NULL,
        db_column='category_id',
        related_name='acquisition_events_as_category',
        null=True,
        blank=True,
        help_text='Parent category (e.g., 1100 Due Diligence, 1200 Transaction Costs)'
    )
    subcategory = models.ForeignKey(
        'financial.UnitCostCategory',
        on_delete=models.SET_NULL,
        db_column='subcategory_id',
        related_name='acquisition_events_as_subcategory',
        null=True,
        blank=True,
        help_text='Child subcategory (e.g., 1110 Phase I Environmental)'
    )

    # Event Details
    event_date = models.DateField(null=True, blank=True, help_text='Date of the acquisition event')
    event_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Type of event: Deposit, Credit, Fee, etc.'
    )
    description = models.TextField(null=True, blank=True, help_text='Event description')

    # Financial
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Transaction amount'
    )
    is_applied_to_purchase = models.BooleanField(
        default=True,
        help_text='Whether this event affects the net purchase price'
    )

    # Contingency and Goes-Hard
    goes_hard_date = models.DateField(
        null=True,
        blank=True,
        help_text='Date when deposit becomes non-refundable (goes hard)'
    )
    is_conditional = models.BooleanField(
        null=True,
        blank=True,
        help_text='Whether this event is conditional'
    )

    # Measurement
    units_conveyed = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Units conveyed (acres, SF, etc.)'
    )
    measure_id = models.IntegerField(
        null=True,
        blank=True,
        help_text='Reference to unit of measure'
    )

    # Metadata
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_acquisition'
        ordering = ['event_date', 'acquisition_id']

    def __str__(self):
        return f"{self.event_type or 'Event'} - {self.description or 'No description'} ({self.amount or 0})"


class PropertyAcquisition(models.Model):
    """
    Property acquisition assumptions and disposition planning.

    Maps to landscape.tbl_property_acquisition table.

    Stores high-level acquisition parameters and exit strategy assumptions.
    """

    acquisition_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='property_acquisition'
    )

    # Purchase Details
    purchase_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text='Purchase price'
    )
    acquisition_date = models.DateField(help_text='Acquisition date')

    # Holding and Exit Strategy
    hold_period_years = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text='Expected hold period in years'
    )
    exit_cap_rate = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        help_text='Exit cap rate for disposition'
    )
    sale_date = models.DateField(
        null=True,
        blank=True,
        help_text='Planned or actual sale date'
    )

    # Transaction Costs
    closing_costs_pct = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        null=True,
        blank=True,
        default=Decimal('0.015'),
        help_text='Closing costs as % of purchase price'
    )
    due_diligence_days = models.IntegerField(
        null=True,
        blank=True,
        default=30,
        help_text='Due diligence period in days'
    )
    earnest_money = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Earnest money deposit amount'
    )

    # Disposition Costs
    sale_costs_pct = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        null=True,
        blank=True,
        default=Decimal('0.015'),
        help_text='Sale closing costs as % of sale price'
    )
    broker_commission_pct = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        null=True,
        blank=True,
        default=Decimal('0.025'),
        help_text='Broker commission as % of sale price'
    )

    # Pricing Metrics
    price_per_unit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Price per unit (per door, per lot, etc.)'
    )
    price_per_sf = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Price per square foot'
    )

    # Soft Costs
    legal_fees = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Legal fees'
    )
    financing_fees = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Financing/loan fees'
    )
    third_party_reports = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Third-party reports (appraisals, inspections, etc.)'
    )

    # Tax Basis Allocation
    depreciation_basis = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Depreciable basis for tax purposes'
    )
    land_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        default=Decimal('20.0'),
        help_text='Land percentage of total basis'
    )
    improvement_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        default=Decimal('80.0'),
        help_text='Improvement percentage of total basis'
    )

    # Tax Strategy
    is_1031_exchange = models.BooleanField(
        default=False,
        help_text='Whether this is part of a 1031 exchange'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_property_acquisition'
        ordering = ['-acquisition_date']

    def __str__(self):
        return f"Acquisition for Project {self.project_id} - ${self.purchase_price}"
