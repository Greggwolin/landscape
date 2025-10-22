"""
Finance Structure models for cost allocation and sale settlements.

Implements the universal architecture pattern where spatial hierarchy
(containers) is separate from financial phasing (cost pools).
"""

from django.db import models
from django.contrib.postgres.fields import ArrayField
from decimal import Decimal


class FinanceStructure(models.Model):
    """
    Cost pools or obligation pools that allocate across multiple containers.

    Examples:
    - "Offsite Infrastructure Phase 1" - Capital cost pool for shared infrastructure
    - "Ground Lease Obligation" - Operating obligation pool for recurring payments
    - "Mezzanine Debt Service" - Operating obligation for debt payments

    The finance structure defines:
    - Total budget or annual amount
    - Allocation method (equal, by area, by units, custom %)
    - Which containers benefit from this pool
    """

    finance_structure_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='finance_structures'
    )

    # Identification
    structure_code = models.CharField(
        max_length=50,
        help_text='Unique code within project (e.g., OFFSITE-PH1)'
    )
    structure_name = models.CharField(
        max_length=200,
        help_text='Display name (e.g., "Offsite Infrastructure Phase 1")'
    )
    description = models.TextField(null=True, blank=True)

    # Type and behavior
    STRUCTURE_TYPE_CHOICES = [
        ('capital_cost_pool', 'Capital Cost Pool'),
        ('operating_obligation_pool', 'Operating Obligation Pool'),
    ]
    structure_type = models.CharField(
        max_length=50,
        choices=STRUCTURE_TYPE_CHOICES,
        help_text='Capital (one-time) or Operating (recurring)'
    )

    # For capital cost pools
    total_budget_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Total budget for one-time capital costs'
    )
    budget_category = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Maps to budget category (Revenue, OpEx, CapEx, etc.)'
    )

    # For operating obligation pools
    is_recurring = models.BooleanField(
        default=False,
        help_text='True for recurring obligations like ground leases'
    )
    RECURRENCE_FREQUENCY_CHOICES = [
        ('annual', 'Annual'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
    ]
    recurrence_frequency = models.CharField(
        max_length=20,
        choices=RECURRENCE_FREQUENCY_CHOICES,
        null=True,
        blank=True
    )
    annual_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Annual amount for recurring obligations'
    )

    # Allocation method
    ALLOCATION_METHOD_CHOICES = [
        ('equal', 'Equal - Split evenly across containers'),
        ('by_area', 'By Area - Proportional to acres/SF'),
        ('by_units', 'By Units - Proportional to lot/unit count'),
        ('by_custom_pct', 'Custom Percentages - Manually specified'),
    ]
    allocation_method = models.CharField(
        max_length=50,
        choices=ALLOCATION_METHOD_CHOICES,
        help_text='How costs are allocated across containers'
    )

    # Status
    is_active = models.BooleanField(default=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, null=True, blank=True)
    updated_by = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'tbl_finance_structure'
        ordering = ['project', 'structure_code']
        constraints = [
            models.UniqueConstraint(
                fields=['project', 'structure_code'],
                name='unique_structure_code'
            )
        ]

    def __str__(self):
        return f"{self.structure_code} - {self.structure_name}"

    def get_total_allocated_percentage(self):
        """Get sum of allocation percentages across all containers."""
        return self.cost_allocations.aggregate(
            total=models.Sum('allocation_percentage')
        )['total'] or Decimal('0.00')

    def get_spent_to_date(self):
        """Get total spent from budget items linked to this structure."""
        from .models import BudgetItem
        return BudgetItem.objects.filter(
            finance_structure=self,
            is_active=True
        ).aggregate(
            total=models.Sum('budgeted_amount')
        )['total'] or Decimal('0.00')

    def get_remaining_budget(self):
        """Get unspent budget remaining."""
        if not self.total_budget_amount:
            return Decimal('0.00')
        return self.total_budget_amount - self.get_spent_to_date()


class CostAllocation(models.Model):
    """
    Links finance structures to containers with allocation percentages.

    Junction table enabling many-to-many relationship between
    finance structures and containers.

    Example: "Offsite Infrastructure" allocates to 8 parcels,
    each parcel gets a percentage based on lot count.
    """

    allocation_id = models.AutoField(primary_key=True)
    finance_structure = models.ForeignKey(
        FinanceStructure,
        on_delete=models.CASCADE,
        db_column='finance_structure_id',
        related_name='cost_allocations'
    )
    container = models.ForeignKey(
        'containers.Container',
        on_delete=models.CASCADE,
        db_column='container_id',
        related_name='cost_allocations'
    )

    # Allocation
    allocation_percentage = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        help_text='Percentage of total budget (0.000 to 100.000)'
    )
    ALLOCATION_BASIS_CHOICES = [
        ('area', 'By Area'),
        ('units', 'By Units'),
        ('custom', 'Custom'),
        ('equal', 'Equal'),
    ]
    allocation_basis = models.CharField(
        max_length=50,
        choices=ALLOCATION_BASIS_CHOICES,
        null=True,
        blank=True
    )

    # Calculated amounts
    allocated_budget_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Calculated: total_budget × (allocation_percentage / 100)'
    )
    spent_to_date = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    cost_to_complete = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Remaining budget allocated to this container'
    )

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_cost_allocation'
        ordering = ['finance_structure', 'container']
        constraints = [
            models.UniqueConstraint(
                fields=['finance_structure', 'container'],
                name='unique_allocation'
            )
        ]

    def __str__(self):
        return f"{self.finance_structure.structure_code} → {self.container.container_code} ({self.allocation_percentage}%)"

    def calculate_allocated_amount(self):
        """Calculate allocated budget amount based on percentage."""
        if self.finance_structure.total_budget_amount:
            return self.finance_structure.total_budget_amount * (
                self.allocation_percentage / Decimal('100.00')
            )
        return Decimal('0.00')

    def calculate_cost_to_complete(self):
        """Calculate remaining cost allocated to this container."""
        remaining = self.finance_structure.get_remaining_budget()
        return remaining * (self.allocation_percentage / Decimal('100.00'))


class SaleSettlement(models.Model):
    """
    Captures sale transactions with cost-to-complete adjustments.

    When a developer sells a parcel, the buyer receives credit for
    unspent infrastructure costs allocated to that parcel.

    Example: Sell Parcel 1 for $1.2M with $255K cost-to-complete.
    Net proceeds = $945K.

    Can include participation structures where seller retains
    a percentage of future home sale revenue.
    """

    settlement_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.PROTECT,
        db_column='project_id',
        related_name='sale_settlements'
    )
    container = models.ForeignKey(
        'containers.Container',
        on_delete=models.PROTECT,
        db_column='container_id',
        related_name='sale_settlements',
        help_text='Container (parcel/building) being sold'
    )

    # Sale details
    sale_date = models.DateField()
    buyer_name = models.CharField(max_length=200, null=True, blank=True)
    buyer_entity = models.CharField(max_length=200, null=True, blank=True)

    # Pricing
    list_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text='Gross sale price'
    )
    allocated_cost_to_complete = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Buyer credit for unspent allocated costs'
    )
    other_adjustments = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Other adjustments (closing costs, prorations, etc.)'
    )
    net_proceeds = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text='list_price - allocated_cost_to_complete - other_adjustments'
    )

    # Settlement details
    SETTLEMENT_TYPE_CHOICES = [
        ('cash_sale', 'Cash Sale'),
        ('seller_note', 'Seller Note'),
        ('earnout', 'Earnout'),
        ('participation', 'Participation'),
    ]
    settlement_type = models.CharField(
        max_length=50,
        choices=SETTLEMENT_TYPE_CHOICES,
        null=True,
        blank=True
    )
    settlement_notes = models.TextField(null=True, blank=True)

    # Cost allocation snapshot (JSONB)
    cost_allocation_detail = models.JSONField(
        null=True,
        blank=True,
        help_text='Snapshot of cost breakdown at time of sale'
    )

    # Participation structures
    has_participation = models.BooleanField(
        default=False,
        help_text='True if seller retains participation in future home sales'
    )
    participation_rate = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        null=True,
        blank=True,
        help_text='Participation percentage (e.g., 25.000 for 25%)'
    )
    PARTICIPATION_BASIS_CHOICES = [
        ('gross_home_sales', 'Gross Home Sales'),
        ('net_home_sales', 'Net Home Sales'),
    ]
    participation_basis = models.CharField(
        max_length=50,
        choices=PARTICIPATION_BASIS_CHOICES,
        null=True,
        blank=True
    )
    participation_minimum = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Floor price below which no participation is paid'
    )
    participation_target_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Target price per unit for participation calculation'
    )

    # Status
    SETTLEMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('closed', 'Closed'),
        ('cancelled', 'Cancelled'),
    ]
    settlement_status = models.CharField(
        max_length=50,
        choices=SETTLEMENT_STATUS_CHOICES,
        default='pending'
    )

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, null=True, blank=True)
    updated_by = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'tbl_sale_settlement'
        ordering = ['-sale_date']

    def __str__(self):
        return f"Settlement {self.settlement_id} - {self.container.container_code} on {self.sale_date}"

    def calculate_net_proceeds(self):
        """Calculate net proceeds after adjustments."""
        return (
            self.list_price
            - self.allocated_cost_to_complete
            - self.other_adjustments
        )


class ParticipationPayment(models.Model):
    """
    Tracks ongoing participation payments for home sale revenue sharing.

    When settlement includes participation, payments are calculated
    as homes close over time.

    Example: Developer sold parcel with 25% participation in home sales.
    As builder closes homes, participation payments are made based on
    actual sales prices.
    """

    payment_id = models.AutoField(primary_key=True)
    settlement = models.ForeignKey(
        SaleSettlement,
        on_delete=models.CASCADE,
        db_column='settlement_id',
        related_name='participation_payments'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.PROTECT,
        db_column='project_id',
        related_name='participation_payments'
    )

    # Payment details
    payment_date = models.DateField()
    payment_period = models.IntegerField(
        null=True,
        blank=True,
        help_text='Links to calculation period if applicable'
    )

    # Home sale details
    homes_closed_count = models.IntegerField(
        help_text='Number of homes closed this period'
    )
    gross_home_sales = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text='Total home sales revenue this period'
    )
    participation_base = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Amount used for participation calc'
    )

    # Payment calculation
    participation_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text='Gross participation (sales × participation_rate)'
    )
    less_base_allocation = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Pro-rata portion of original settlement payment'
    )
    net_participation_payment = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text='Net payment: participation_amount - less_base_allocation'
    )

    # Cumulative tracking
    cumulative_homes_closed = models.IntegerField(
        null=True,
        blank=True,
        help_text='Total homes closed to date'
    )
    cumulative_participation_paid = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Total participation paid to date'
    )

    # Status
    PAYMENT_STATUS_CHOICES = [
        ('calculated', 'Calculated'),
        ('paid', 'Paid'),
        ('disputed', 'Disputed'),
    ]
    payment_status = models.CharField(
        max_length=50,
        choices=PAYMENT_STATUS_CHOICES,
        default='calculated'
    )

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_participation_payment'
        ordering = ['settlement', '-payment_date']

    def __str__(self):
        return f"Payment {self.payment_id} - Settlement {self.settlement_id} on {self.payment_date}"

    def calculate_participation_payment(self):
        """Calculate participation payment for this period."""
        # Gross participation
        participation = self.gross_home_sales * (
            self.settlement.participation_rate / Decimal('100.00')
        )

        # Less base allocation (pro-rata of original payment)
        # This prevents double-counting
        total_lots = self.settlement.container.attributes.get('units_total', 0)
        if total_lots > 0:
            base_per_lot = self.settlement.list_price / Decimal(str(total_lots))
            base_allocation = base_per_lot * Decimal(str(self.homes_closed_count))
        else:
            base_allocation = Decimal('0.00')

        # Net payment (cannot be negative)
        net_payment = max(Decimal('0.00'), participation - base_allocation)

        return {
            'participation_amount': participation,
            'less_base_allocation': base_allocation,
            'net_participation_payment': net_payment,
        }
