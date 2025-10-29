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
    Comparable sales for Sales Comparison Approach.
    Maps to landscape.tbl_sales_comparables
    """

    comparable_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='sales_comparables'
    )
    comp_number = models.IntegerField(null=True, blank=True)
    property_name = models.CharField(max_length=255, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=2, null=True, blank=True)
    zip = models.CharField(max_length=10, null=True, blank=True)
    sale_date = models.DateField(null=True, blank=True)
    sale_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_per_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    year_built = models.IntegerField(null=True, blank=True)
    units = models.IntegerField(null=True, blank=True)
    building_sf = models.IntegerField(null=True, blank=True)
    cap_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    grm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    distance_from_subject = models.CharField(max_length=50, null=True, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    unit_mix = models.JSONField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
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
            adj.adjustment_pct or 0
            for adj in self.adjustments.all()
        )

        return float(self.price_per_unit) * (1 + float(total_adjustment_pct))


class SalesCompAdjustment(models.Model):
    """
    Adjustments applied to sales comparables.
    Maps to landscape.tbl_sales_comp_adjustments
    """

    ADJUSTMENT_TYPES = [
        # Transaction Adjustments
        ('property_rights', 'Property Rights'),
        ('financing', 'Financing'),
        ('conditions_of_sale', 'Conditions of Sale'),
        ('market_conditions', 'Market Conditions'),
        # Property Rights Adjustments
        ('location', 'Location'),
        ('physical_condition', 'Physical Cond'),
        ('physical_age', 'Physical - Age'),
        ('physical_unit_mix', 'Physical - Unit Mix'),
        ('economic', 'Economic'),
        ('legal', 'Legal'),
        ('other', 'Other'),
    ]

    adjustment_id = models.AutoField(primary_key=True)
    comparable = models.ForeignKey(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='adjustments'
    )
    adjustment_type = models.CharField(max_length=50, choices=ADJUSTMENT_TYPES)
    adjustment_pct = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    adjustment_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    justification = models.TextField(null=True, blank=True)

    # Interactive AI Adjustments fields
    user_adjustment_pct = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="User's final adjustment value (from Final column)"
    )
    ai_accepted = models.BooleanField(
        default=False,
        help_text="TRUE if user accepted AI suggestion via checkbox"
    )
    user_notes = models.TextField(
        null=True,
        blank=True,
        help_text="User's notes about their adjustment decision"
    )
    last_modified_by = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tbl_sales_comp_adjustments'
        ordering = ['comparable', 'adjustment_type']
        verbose_name = 'Sales Comp Adjustment'
        verbose_name_plural = 'Sales Comp Adjustments'

    def __str__(self):
        return f"{self.get_adjustment_type_display()}: {self.adjustment_pct}%"


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
    """

    CAP_RATE_METHODS = [
        ('comp_sales', 'Comparable Sales'),
        ('band_investment', 'Band of Investment'),
        ('investor_survey', 'Investor Survey'),
        ('other', 'Other'),
    ]

    income_approach_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='income_approach'
    )

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

    # DCF (optional)
    forecast_period_years = models.IntegerField(null=True, blank=True)
    terminal_cap_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    discount_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    dcf_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
