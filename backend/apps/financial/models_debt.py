"""
Debt models for unified loan and draw schedule tables.

Maps to landscape.tbl_loan and related junction tables.
"""

from django.db import models

from .models_periods import CalculationPeriod


class Loan(models.Model):
    """Unified debt instrument (term loans and revolvers)."""

    loan_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='loans'
    )

    # Classification
    loan_name = models.CharField(max_length=255)
    loan_type = models.CharField(max_length=50)
    structure_type = models.CharField(max_length=20, default='TERM')
    lender_name = models.CharField(max_length=255, null=True, blank=True)
    seniority = models.IntegerField(default=1)
    status = models.CharField(max_length=20, null=True, blank=True, default='active')

    # Sizing
    commitment_amount = models.DecimalField(max_digits=15, decimal_places=2)
    loan_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    loan_to_cost_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    loan_to_value_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    commitment_sizing_method = models.CharField(max_length=30, null=True, blank=True, default='MANUAL')
    ltv_basis_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    ltc_basis_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    calculated_commitment_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    governing_constraint = models.CharField(max_length=10, null=True, blank=True)
    net_loan_proceeds = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Interest Rate
    interest_rate_pct = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    interest_rate_decimal = models.DecimalField(max_digits=6, decimal_places=5, null=True, blank=True)
    interest_type = models.CharField(max_length=50, null=True, blank=True, default='Fixed')
    interest_index = models.CharField(max_length=50, null=True, blank=True)
    interest_spread_bps = models.IntegerField(null=True, blank=True)
    rate_floor_pct = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    rate_cap_pct = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    rate_reset_frequency = models.CharField(max_length=20, null=True, blank=True)
    interest_calculation = models.CharField(max_length=50, null=True, blank=True, default='SIMPLE')
    interest_payment_method = models.CharField(max_length=50, null=True, blank=True, default='paid_current')

    # Timing
    loan_start_date = models.DateField(null=True, blank=True)
    loan_maturity_date = models.DateField(null=True, blank=True)
    maturity_period = models.ForeignKey(
        CalculationPeriod,
        on_delete=models.SET_NULL,
        db_column='maturity_period_id',
        null=True,
        blank=True,
        related_name='maturity_loans'
    )
    loan_term_months = models.IntegerField(null=True, blank=True)
    loan_term_years = models.IntegerField(null=True, blank=True)
    amortization_months = models.IntegerField(null=True, blank=True)
    amortization_years = models.IntegerField(null=True, blank=True)
    interest_only_months = models.IntegerField(null=True, blank=True, default=0)
    payment_frequency = models.CharField(max_length=50, null=True, blank=True, default='MONTHLY')
    commitment_date = models.DateField(null=True, blank=True)

    # Fees
    origination_fee_pct = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    exit_fee_pct = models.DecimalField(max_digits=5, decimal_places=3, null=True, blank=True)
    unused_fee_pct = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    commitment_fee_pct = models.DecimalField(max_digits=5, decimal_places=3, null=True, blank=True)
    extension_fee_bps = models.IntegerField(null=True, blank=True)
    extension_fee_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    prepayment_penalty_years = models.IntegerField(null=True, blank=True)
    closing_costs_appraisal = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    closing_costs_legal = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    closing_costs_other = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Reserves
    interest_reserve_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    interest_reserve_funded_upfront = models.BooleanField(default=False, null=True, blank=True)
    interest_reserve_inflator = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, default=1.0)
    reserve_requirements = models.JSONField(default=dict, blank=True)
    replacement_reserve_per_unit = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    tax_insurance_escrow_months = models.IntegerField(null=True, blank=True)
    initial_reserve_months = models.IntegerField(null=True, blank=True)

    # Covenants
    covenants = models.JSONField(default=dict, blank=True)
    loan_covenant_dscr_min = models.DecimalField(max_digits=5, decimal_places=3, null=True, blank=True)
    loan_covenant_ltv_max = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    loan_covenant_occupancy_min = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    covenant_test_frequency = models.CharField(max_length=20, null=True, blank=True, default='Quarterly')

    # Guarantee / Recourse
    guarantee_type = models.CharField(max_length=50, null=True, blank=True)
    guarantor_name = models.CharField(max_length=200, null=True, blank=True)
    recourse_carveout_provisions = models.TextField(null=True, blank=True)
    recourse_type = models.CharField(max_length=30, null=True, blank=True, default='FULL')

    # Extensions
    extension_options = models.IntegerField(null=True, blank=True, default=0)
    extension_option_years = models.IntegerField(null=True, blank=True)

    # Revolver-specific
    draw_trigger_type = models.CharField(max_length=50, null=True, blank=True, default='COST_INCURRED')
    commitment_balance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    drawn_to_date = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, default=0)
    is_construction_loan = models.BooleanField(default=False, null=True, blank=True)

    # Release pricing
    release_price_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    minimum_release_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    repayment_acceleration = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, default=1.0)

    # Collateral basis (lotbank revolvers)
    collateral_basis_type = models.CharField(
        max_length=30, null=True, blank=True, default='PROJECT_COST',
        help_text='PROJECT_COST = LTC on actual cost; RESIDUAL_LAND_VALUE = LTC on finished lot price minus improvements'
    )

    # Refinancing linkage
    takes_out_loan = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        db_column='takes_out_loan_id',
        null=True,
        blank=True,
        related_name='refinanced_by'
    )

    # Profit participation
    can_participate_in_profits = models.BooleanField(default=False, null=True, blank=True)
    profit_participation_tier = models.IntegerField(null=True, blank=True)
    profit_participation_pct = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)

    # Calculated / Tracking
    monthly_payment = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    annual_debt_service = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Audit
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.TextField(null=True, blank=True)
    updated_by = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'tbl_loan'

    def __str__(self):
        return f"{self.loan_name} ({self.loan_type})"


class LoanContainer(models.Model):
    """Junction table linking loans to divisions (containers)."""

    loan_container_id = models.BigAutoField(primary_key=True)
    loan = models.ForeignKey(
        Loan,
        on_delete=models.CASCADE,
        db_column='loan_id',
        related_name='loan_containers'
    )
    division_id = models.BigIntegerField()
    allocation_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    collateral_type = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tbl_loan_container'


class LoanFinanceStructure(models.Model):
    """Junction table linking loans to finance structures."""

    loan_fs_id = models.BigAutoField(primary_key=True)
    loan = models.ForeignKey(
        Loan,
        on_delete=models.CASCADE,
        db_column='loan_id',
        related_name='loan_finance_structures'
    )
    finance_structure_id = models.BigIntegerField()
    contribution_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tbl_loan_finance_structure'


class DebtDrawSchedule(models.Model):
    """Period draw schedule for loans."""

    draw_id = models.BigAutoField(primary_key=True)
    loan = models.ForeignKey(
        Loan,
        on_delete=models.CASCADE,
        db_column='loan_id',
        related_name='draws'
    )
    period = models.ForeignKey(
        CalculationPeriod,
        on_delete=models.CASCADE,
        db_column='period_id',
        related_name='debt_draws'
    )

    # Draw details
    draw_number = models.IntegerField(null=True, blank=True)
    draw_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    cumulative_drawn = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    available_remaining = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    beginning_balance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    ending_balance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    draw_date = models.DateField(null=True, blank=True)
    draw_purpose = models.CharField(max_length=200, null=True, blank=True)
    draw_status = models.CharField(max_length=20, null=True, blank=True, default='PROJECTED')

    # Interest tracking
    interest_rate_pct = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    interest_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    interest_expense = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    interest_paid = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    deferred_interest = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, default=0)
    cumulative_interest = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    principal_payment = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    outstanding_balance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Fees
    unused_fee_charge = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    commitment_fee_charge = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    other_fees = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0)

    # Approval workflow
    request_date = models.DateField(null=True, blank=True)
    approval_date = models.DateField(null=True, blank=True)
    funding_date = models.DateField(null=True, blank=True)
    inspector_approval = models.BooleanField(null=True, blank=True)
    lender_approval = models.BooleanField(null=True, blank=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_debt_draw_schedule'
