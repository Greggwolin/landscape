"""
Portfolio models for fund-level analysis.

Supports Landscaper-driven portfolio creation: clone a project N times with
staggered acquisitions and randomized size variation, then aggregate cash flows
and run fund-level GP/LP waterfall distribution.

Maps to landscape.tbl_portfolio* tables.
Scope: Underwriting mode only (not Valuation).
"""

import uuid
from django.conf import settings
from django.db import models
from decimal import Decimal


class Portfolio(models.Model):
    """
    Portfolio entity grouping multiple cloned projects for fund-level analysis.

    Maps to landscape.tbl_portfolio.

    Created conversationally via Landscaper. Each portfolio has a fund structure
    (LP/GP split) and waterfall configuration. Member projects are cloned from
    a template with date offsets and randomized size scalars.
    """

    portfolio_id = models.AutoField(primary_key=True)
    portfolio_name = models.CharField(
        max_length=200,
        help_text='Display name (e.g., "Chadron Portfolio")'
    )
    description = models.TextField(
        null=True,
        blank=True,
        help_text='Optional description of fund strategy or thesis'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        db_column='created_by_id',
        null=True,
        blank=True,
        related_name='portfolios'
    )

    # Fund structure (simple — no management/acquisition/disposition fees initially)
    lp_ownership_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('70.00'),
        help_text='LP ownership percentage (e.g., 70.00 for 70%)'
    )
    gp_ownership_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('30.00'),
        help_text='GP co-invest percentage (e.g., 30.00 for 30%)'
    )
    fund_equity_total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Total fund equity commitment (optional — for deployment optimization)'
    )
    leverage_target_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Target leverage as % of total capitalization (optional)'
    )

    # Status
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_portfolio'
        ordering = ['-created_at']
        verbose_name = 'Portfolio'
        verbose_name_plural = 'Portfolios'

    def __str__(self):
        return self.portfolio_name


class PortfolioMember(models.Model):
    """
    Junction linking a cloned project to a portfolio.

    Maps to landscape.tbl_portfolio_member.

    Each member represents either:
    - The template project (is_template=True, never modified)
    - A cloned project with date offset and randomized size scalar

    Size scalar is applied at clone time to unit counts, which cascades
    through GPR → EGI → NOI → debt sizing → equity naturally via the
    existing IncomePropertyCashFlowService.
    """

    member_id = models.AutoField(primary_key=True)
    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        db_column='portfolio_id',
        related_name='members'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='portfolio_memberships'
    )
    source_project = models.ForeignKey(
        'projects.Project',
        on_delete=models.SET_NULL,
        db_column='source_project_id',
        null=True,
        blank=True,
        related_name='portfolio_clones',
        help_text='FK to the template project this member was cloned from'
    )

    # Clone parameters
    date_offset_months = models.IntegerField(
        default=0,
        help_text='Months after portfolio start date for this acquisition'
    )
    size_scalar = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('1.0000'),
        help_text='Randomized multiplier applied at clone time (e.g., 0.8500–1.1500)'
    )
    size_low = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        help_text='Lower bound of size range for reroll'
    )
    size_high = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        help_text='Upper bound of size range for reroll'
    )
    acquisition_date = models.DateField(
        null=True,
        blank=True,
        help_text='Computed acquisition date (template date + offset)'
    )

    # Ordering and flags
    sort_order = models.IntegerField(default=0)
    is_template = models.BooleanField(
        default=False,
        help_text='True for the source/template project (never modified)'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_portfolio_member'
        ordering = ['sort_order']
        unique_together = [('portfolio', 'project')]
        verbose_name = 'Portfolio Member'
        verbose_name_plural = 'Portfolio Members'

    def __str__(self):
        label = '(template)' if self.is_template else f'scalar={self.size_scalar}'
        return f'{self.portfolio.portfolio_name} → {self.project} [{label}]'


class PortfolioWaterfallTier(models.Model):
    """
    Fund-level waterfall tier configuration.

    Maps to landscape.tbl_portfolio_waterfall_tier.

    Distinct from property-level waterfall (tbl_waterfall_tier). This operates
    on consolidated portfolio cash flows, not individual property cash flows.
    The GP/LP split is on the blended portfolio return.

    Typical setup:
      Tier 1: PREF 8.0% → 100/0 LP/GP (preferred return)
      Tier 2: IRR 15.0% → 80/20 LP/GP (first promote)
      Tier 3: IRR 20.0% → 50/50 LP/GP (second promote)
    """

    HURDLE_TYPE_CHOICES = [
        ('PREF', 'Preferred Return'),
        ('IRR', 'IRR Hurdle'),
        ('EMX', 'Equity Multiple Hurdle'),
    ]

    tier_id = models.AutoField(primary_key=True)
    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        db_column='portfolio_id',
        related_name='waterfall_tiers'
    )

    # Tier configuration
    tier_number = models.IntegerField(
        help_text='Sequential tier number (1 = first tier, typically pref return)'
    )
    tier_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Optional display name (e.g., "Preferred Return", "First Promote")'
    )
    hurdle_type = models.CharField(
        max_length=10,
        choices=HURDLE_TYPE_CHOICES,
        default='IRR',
        help_text='PREF = preferred return, IRR = IRR hurdle, EMX = equity multiple hurdle'
    )
    hurdle_rate = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        default=Decimal('0.0000'),
        help_text='Hurdle rate as percentage (e.g., 8.0000 for 8% pref)'
    )
    lp_split_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('100.00'),
        help_text='LP share of distributions in this tier (e.g., 80.00 for 80%)'
    )
    gp_split_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='GP share of distributions in this tier (e.g., 20.00 for 20%)'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_portfolio_waterfall_tier'
        ordering = ['tier_number']
        unique_together = [('portfolio', 'tier_number')]
        verbose_name = 'Portfolio Waterfall Tier'
        verbose_name_plural = 'Portfolio Waterfall Tiers'

    def __str__(self):
        return f'{self.portfolio.portfolio_name} Tier {self.tier_number}: {self.hurdle_type} {self.hurdle_rate}%'


class PortfolioResult(models.Model):
    """
    Cached portfolio calculation results.

    Maps to landscape.tbl_portfolio_result.

    Each calculation run creates a new result row. result_json holds the full
    period-by-period stacked cash flows. Landscaper tools return scalar summaries
    from the top-level fields and slice result_json on demand to minimize token
    consumption.
    """

    result_id = models.AutoField(primary_key=True)
    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        db_column='portfolio_id',
        related_name='results'
    )
    run_id = models.UUIDField(
        default=uuid.uuid4,
        help_text='UUID for each calculation run. Reroll creates a new run.'
    )

    # Portfolio-level metrics
    consolidated_irr = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True,
        help_text='Portfolio-level IRR (XIRR on consolidated equity cash flows)'
    )
    consolidated_emx = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True,
        help_text='Portfolio equity multiple (total distributions / total equity)'
    )
    total_equity_deployed = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        help_text='Sum of all property equity investments'
    )
    peak_equity = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        help_text='Maximum cumulative equity outstanding at any point'
    )
    total_debt_peak = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        help_text='Maximum total debt outstanding across all properties'
    )

    # GP metrics
    gp_irr = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True,
        help_text='GP partner-level IRR'
    )
    gp_emx = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True,
        help_text='GP equity multiple'
    )
    gp_total_distributions = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    gp_promote_earned = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        help_text='Total promote distributions earned by GP across all tiers'
    )

    # LP metrics
    lp_irr = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True,
        help_text='LP partner-level IRR'
    )
    lp_emx = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True,
        help_text='LP equity multiple'
    )
    lp_total_distributions = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )

    # Full period-by-period data
    result_json = models.JSONField(
        null=True,
        blank=True,
        help_text='Full period-by-period stacked cash flows, per-property metrics, and waterfall detail. Sliced by Landscaper tools on demand.'
    )

    # Timestamps
    run_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_portfolio_result'
        ordering = ['-run_date']
        unique_together = [('portfolio', 'run_id')]
        verbose_name = 'Portfolio Result'
        verbose_name_plural = 'Portfolio Results'

    def __str__(self):
        return f'{self.portfolio.portfolio_name} run {self.run_id} ({self.run_date})'
