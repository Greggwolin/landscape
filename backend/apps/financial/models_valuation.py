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
    units = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # Changed to support acres with decimals
    building_sf = models.CharField(max_length=255, null=True, blank=True)  # Changed to CharField to support entitlements text for land sales
    cap_rate = models.CharField(max_length=255, null=True, blank=True)  # Changed to CharField to support utilities text for land sales
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
