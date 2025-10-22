"""
Financial models for budget and actual financial data.

Maps to landscape.core_fin_fact_* tables.
"""

from django.db import models
from decimal import Decimal

# Import finance structure models
from .models_finance_structure import (
    FinanceStructure,
    CostAllocation,
    SaleSettlement,
    ParticipationPayment,
)


class BudgetItem(models.Model):
    """
    Budget line items with hierarchical rollup capability.

    Maps to landscape.core_fin_fact_budget table.

    Budget items can be:
    - Direct entries (revenue, expenses, capital)
    - Container-level aggregations
    - Project-level rollups
    """

    budget_item_id = models.AutoField(primary_key=True, db_column='fact_id')
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='budget_items'
    )
    container = models.ForeignKey(
        'containers.Container',
        on_delete=models.CASCADE,
        db_column='container_id',
        null=True,
        blank=True,
        related_name='budget_items',
        help_text='Optional container association for hierarchy'
    )
    finance_structure = models.ForeignKey(
        FinanceStructure,
        on_delete=models.SET_NULL,
        db_column='finance_structure_id',
        null=True,
        blank=True,
        related_name='budget_items',
        help_text='Optional link to finance structure cost pool'
    )

    # Financial Classification
    category = models.CharField(
        max_length=50,
        help_text='Category: Revenue, OpEx, CapEx, Financing, etc.'
    )
    subcategory = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Subcategory: Rent, Payroll, Land, Debt Service, etc.'
    )
    line_item_name = models.CharField(
        max_length=200,
        help_text='Display name for budget line'
    )
    account_code = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text='GL account code'
    )

    # Time Period
    fiscal_year = models.IntegerField(help_text='Fiscal year (e.g., 2025)')
    fiscal_period = models.SmallIntegerField(
        null=True,
        blank=True,
        help_text='Period 1-12 for monthly, null for annual'
    )
    period_type = models.CharField(
        max_length=20,
        default='annual',
        choices=[
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annual', 'Annual'),
        ]
    )

    # Financial Values
    budgeted_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Budgeted amount for period'
    )
    variance_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Variance vs actual (if available)'
    )

    # Hierarchy and Rollup
    is_rollup = models.BooleanField(
        default=False,
        help_text='True if this is an aggregated/calculated value'
    )
    parent_budget_item = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_items',
        help_text='Parent budget item for hierarchical rollups'
    )

    # Metadata
    notes = models.TextField(null=True, blank=True)
    attributes = models.JSONField(
        default=dict,
        blank=True,
        help_text='Flexible attributes (assumptions, drivers, etc.)'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, null=True, blank=True)
    updated_by = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'core_fin_fact_budget'
        ordering = ['fiscal_year', 'fiscal_period', 'category', 'line_item_name']
        indexes = [
            models.Index(fields=['project', 'fiscal_year']),
            models.Index(fields=['container', 'fiscal_year']),
            models.Index(fields=['category', 'fiscal_year']),
        ]

    def __str__(self):
        period = f"P{self.fiscal_period}" if self.fiscal_period else "Annual"
        return f"{self.line_item_name} - FY{self.fiscal_year} {period}"

    def get_children_total(self):
        """Get sum of all child budget items."""
        return self.child_items.filter(
            is_active=True
        ).aggregate(
            total=models.Sum('budgeted_amount')
        )['total'] or Decimal('0.00')

    def get_rollup_by_category(self, fiscal_year=None):
        """
        Get budget rollup grouped by category for this project/container.

        Returns dict like:
        {
            'Revenue': Decimal('1500000.00'),
            'OpEx': Decimal('500000.00'),
            'CapEx': Decimal('2000000.00')
        }
        """
        qs = BudgetItem.objects.filter(
            project=self.project,
            is_active=True,
            is_rollup=False  # Only sum direct entries, not rollups
        )

        if self.container:
            qs = qs.filter(container=self.container)

        if fiscal_year:
            qs = qs.filter(fiscal_year=fiscal_year)

        rollup = qs.values('category').annotate(
            total=models.Sum('budgeted_amount')
        ).order_by('category')

        return {item['category']: item['total'] for item in rollup}


class ActualItem(models.Model):
    """
    Actual financial transactions/results.

    Maps to landscape.core_fin_fact_actual table.

    Used for:
    - Recording actual revenue and expenses
    - Variance analysis vs budget
    - Historical financial performance
    """

    actual_item_id = models.AutoField(primary_key=True, db_column='fact_id')
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='actual_items'
    )
    container = models.ForeignKey(
        'containers.Container',
        on_delete=models.CASCADE,
        db_column='container_id',
        null=True,
        blank=True,
        related_name='actual_items'
    )
    budget_item = models.ForeignKey(
        BudgetItem,
        on_delete=models.SET_NULL,
        db_column='budget_item_id',
        null=True,
        blank=True,
        related_name='actuals',
        help_text='Link to corresponding budget item'
    )

    # Financial Classification
    category = models.CharField(max_length=50)
    subcategory = models.CharField(max_length=100, null=True, blank=True)
    line_item_name = models.CharField(max_length=200)
    account_code = models.CharField(max_length=50, null=True, blank=True)

    # Time Period
    fiscal_year = models.IntegerField()
    fiscal_period = models.SmallIntegerField(null=True, blank=True)
    transaction_date = models.DateField(
        null=True,
        blank=True,
        help_text='Actual transaction date'
    )

    # Financial Values
    actual_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    budgeted_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Corresponding budget amount for variance'
    )
    variance_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Actual - Budget'
    )
    variance_pct = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='(Actual - Budget) / Budget * 100'
    )

    # Metadata
    notes = models.TextField(null=True, blank=True)
    attributes = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, null=True, blank=True)
    updated_by = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'core_fin_fact_actual'
        ordering = ['fiscal_year', 'fiscal_period', 'transaction_date', 'category']
        indexes = [
            models.Index(fields=['project', 'fiscal_year']),
            models.Index(fields=['container', 'fiscal_year']),
            models.Index(fields=['transaction_date']),
        ]

    def __str__(self):
        period = f"P{self.fiscal_period}" if self.fiscal_period else "Annual"
        return f"{self.line_item_name} - FY{self.fiscal_year} {period} - ${self.actual_amount}"

    def calculate_variance(self):
        """Calculate variance amounts and percentages."""
        if self.budgeted_amount is not None:
            self.variance_amount = self.actual_amount - self.budgeted_amount
            if self.budgeted_amount != 0:
                self.variance_pct = (
                    self.variance_amount / self.budgeted_amount * Decimal('100.00')
                )

    def save(self, *args, **kwargs):
        """Override save to auto-calculate variance."""
        self.calculate_variance()
        super().save(*args, **kwargs)
