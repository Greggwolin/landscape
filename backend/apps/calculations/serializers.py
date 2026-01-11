"""
Serializers for calculation requests and responses.

These define the API contracts for calculation endpoints.
"""

from rest_framework import serializers
from datetime import date


class IRRRequestSerializer(serializers.Serializer):
    """Request serializer for IRR calculation."""

    initial_investment = serializers.FloatField(
        min_value=0,
        help_text='Initial equity investment'
    )
    cash_flows = serializers.ListField(
        child=serializers.FloatField(),
        help_text='List of periodic cash flows'
    )
    reversion_value = serializers.FloatField(
        min_value=0,
        help_text='Final sale/reversion proceeds'
    )


class NPVRequestSerializer(serializers.Serializer):
    """Request serializer for NPV calculation."""

    discount_rate = serializers.FloatField(
        min_value=0,
        max_value=1,
        help_text='Discount rate as decimal (e.g., 0.10 for 10%)'
    )
    initial_investment = serializers.FloatField(
        min_value=0,
        help_text='Initial equity investment'
    )
    cash_flows = serializers.ListField(
        child=serializers.FloatField(),
        help_text='List of periodic cash flows'
    )
    reversion_value = serializers.FloatField(
        min_value=0,
        help_text='Final sale/reversion proceeds'
    )


class MetricsRequestSerializer(serializers.Serializer):
    """Request serializer for comprehensive metrics calculation."""

    initial_investment = serializers.FloatField(min_value=0)
    cash_flows = serializers.ListField(child=serializers.FloatField())
    reversion_value = serializers.FloatField(min_value=0)
    discount_rate = serializers.FloatField(
        min_value=0,
        max_value=1,
        help_text='Discount rate for NPV'
    )
    debt_service = serializers.FloatField(
        required=False,
        allow_null=True,
        min_value=0,
        help_text='Annual debt service (optional, for DSCR)'
    )


class MetricsResponseSerializer(serializers.Serializer):
    """Response serializer for metrics calculation."""

    irr = serializers.FloatField(help_text='IRR as decimal')
    irr_pct = serializers.FloatField(help_text='IRR as percentage')
    npv = serializers.FloatField(help_text='Net Present Value')
    equity_multiple = serializers.FloatField(help_text='Equity multiple (e.g., 1.85x)')
    initial_investment = serializers.FloatField()
    total_cash_flows = serializers.FloatField()
    reversion_value = serializers.FloatField()
    total_return = serializers.FloatField()
    dscr = serializers.FloatField(
        required=False,
        allow_null=True,
        help_text='Debt Service Coverage Ratio (if debt_service provided)'
    )


class CashFlowProjectionRequestSerializer(serializers.Serializer):
    """Request serializer for cash flow projection."""

    project_id = serializers.IntegerField(min_value=1)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    period_type = serializers.ChoiceField(
        choices=['monthly', 'annual'],
        default='annual'
    )

    def validate(self, data):
        """Validate start_date is before end_date."""
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError({
                'end_date': 'end_date must be after start_date'
            })
        return data


class CashFlowPeriodSerializer(serializers.Serializer):
    """Serializer for a single cash flow period."""

    period_date = serializers.DateField()
    revenue = serializers.FloatField()
    expenses = serializers.FloatField()
    noi = serializers.FloatField(help_text='Net Operating Income')
    capital_items = serializers.FloatField()
    debt_service = serializers.FloatField()
    net_cash_flow = serializers.FloatField()


class CashFlowProjectionResponseSerializer(serializers.Serializer):
    """Response serializer for cash flow projection."""

    periods = CashFlowPeriodSerializer(many=True)
    summary = serializers.DictField(
        help_text='Summary totals (total_revenue, total_expenses, total_noi)'
    )
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    period_type = serializers.CharField()


class DSCRRequestSerializer(serializers.Serializer):
    """Request serializer for DSCR calculation."""

    noi = serializers.FloatField(
        min_value=0,
        help_text='Net Operating Income'
    )
    debt_service = serializers.FloatField(
        min_value=0,
        help_text='Annual debt service'
    )

    def validate(self, data):
        """Validate debt_service is not zero."""
        if data['debt_service'] == 0:
            raise serializers.ValidationError({
                'debt_service': 'debt_service cannot be zero'
            })
        return data


class DSCRResponseSerializer(serializers.Serializer):
    """Response serializer for DSCR calculation."""

    dscr = serializers.FloatField(help_text='Debt Service Coverage Ratio')
    noi = serializers.FloatField()
    debt_service = serializers.FloatField()
    coverage_status = serializers.CharField(
        help_text='OK if >= 1.25, Warning if < 1.25, Critical if < 1.0'
    )


# ============================================================================
# WATERFALL SERIALIZERS
# ============================================================================

class WaterfallCashFlowSerializer(serializers.Serializer):
    """Serializer for individual waterfall cash flow."""
    period_id = serializers.IntegerField(help_text='Period identifier')
    date = serializers.DateField(help_text='Cash flow date')
    amount = serializers.DecimalField(
        max_digits=20,
        decimal_places=2,
        help_text='Cash flow amount (negative = contribution, positive = distribution)'
    )


class WaterfallTierConfigSerializer(serializers.Serializer):
    """Serializer for waterfall tier configuration."""
    tier_number = serializers.IntegerField(min_value=1, max_value=5)
    tier_name = serializers.CharField(required=False, allow_blank=True)
    irr_hurdle = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        required=False,
        allow_null=True,
        help_text='IRR hurdle as percentage (e.g., 8 for 8%)'
    )
    emx_hurdle = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        required=False,
        allow_null=True,
        help_text='Equity multiple hurdle (e.g., 1.5 for 1.5x)'
    )
    promote_percent = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=0,
        help_text='GP promote percentage (e.g., 20 for 20%)'
    )
    lp_split_pct = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        help_text='LP split percentage (e.g., 72 for 72%)'
    )
    gp_split_pct = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        help_text='GP split percentage (e.g., 28 for 28%)'
    )


class WaterfallSettingsSerializer(serializers.Serializer):
    """Serializer for waterfall calculation settings."""
    hurdle_method = serializers.ChoiceField(
        choices=['IRR', 'EMx', 'IRR_EMx'],
        default='IRR',
        help_text='Method for calculating hurdles'
    )
    num_tiers = serializers.IntegerField(
        min_value=2,
        max_value=5,
        default=3,
        help_text='Number of active tiers'
    )
    return_of_capital = serializers.ChoiceField(
        choices=['LP First', 'Pari Passu'],
        default='Pari Passu',
        help_text='Return of capital priority in Tier 1'
    )
    gp_catch_up = serializers.BooleanField(
        default=True,
        help_text='Whether GP catches up in Tier 1'
    )
    lp_ownership = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=0.90,
        help_text='LP ownership as decimal (e.g., 0.90 for 90%)'
    )
    preferred_return_pct = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=8,
        help_text='LP preferred return rate as percentage'
    )


class WaterfallCalculateRequestSerializer(serializers.Serializer):
    """Request serializer for waterfall calculation."""
    tiers = WaterfallTierConfigSerializer(many=True)
    settings = WaterfallSettingsSerializer()
    cash_flows = WaterfallCashFlowSerializer(many=True)

    def validate_tiers(self, tiers):
        """Validate tier configuration."""
        if not tiers:
            raise serializers.ValidationError('At least one tier is required')

        tier_numbers = [t['tier_number'] for t in tiers]
        if len(tier_numbers) != len(set(tier_numbers)):
            raise serializers.ValidationError('Duplicate tier numbers')

        if 1 not in tier_numbers:
            raise serializers.ValidationError('Tier 1 is required')

        return tiers

    def validate_cash_flows(self, cash_flows):
        """Validate cash flows."""
        if not cash_flows:
            raise serializers.ValidationError('At least one cash flow is required')

        # Must have at least one negative (contribution) and one positive (distribution)
        has_negative = any(cf['amount'] < 0 for cf in cash_flows)
        has_positive = any(cf['amount'] > 0 for cf in cash_flows)

        if not has_negative:
            raise serializers.ValidationError('Must have at least one contribution (negative cash flow)')

        return cash_flows


class WaterfallPeriodResultSerializer(serializers.Serializer):
    """Serializer for period-level waterfall result."""
    period_id = serializers.IntegerField()
    date = serializers.DateField()
    net_cash_flow = serializers.DecimalField(max_digits=20, decimal_places=2)
    cumulative_cash_flow = serializers.DecimalField(max_digits=20, decimal_places=2)

    # Contributions
    lp_contribution = serializers.DecimalField(max_digits=20, decimal_places=2)
    gp_contribution = serializers.DecimalField(max_digits=20, decimal_places=2)

    # Distributions by tier
    tier1_lp_dist = serializers.DecimalField(max_digits=20, decimal_places=2)
    tier1_gp_dist = serializers.DecimalField(max_digits=20, decimal_places=2)
    tier2_lp_dist = serializers.DecimalField(max_digits=20, decimal_places=2)
    tier2_gp_dist = serializers.DecimalField(max_digits=20, decimal_places=2)
    tier3_lp_dist = serializers.DecimalField(max_digits=20, decimal_places=2)
    tier3_gp_dist = serializers.DecimalField(max_digits=20, decimal_places=2)
    tier4_lp_dist = serializers.DecimalField(max_digits=20, decimal_places=2, required=False)
    tier4_gp_dist = serializers.DecimalField(max_digits=20, decimal_places=2, required=False)
    tier5_lp_dist = serializers.DecimalField(max_digits=20, decimal_places=2, required=False)
    tier5_gp_dist = serializers.DecimalField(max_digits=20, decimal_places=2, required=False)

    # Metrics
    lp_irr = serializers.DecimalField(max_digits=10, decimal_places=6, allow_null=True)
    gp_irr = serializers.DecimalField(max_digits=10, decimal_places=6, allow_null=True)
    lp_emx = serializers.DecimalField(max_digits=10, decimal_places=4, allow_null=True)
    gp_emx = serializers.DecimalField(max_digits=10, decimal_places=4, allow_null=True)


class WaterfallPartnerSummarySerializer(serializers.Serializer):
    """Serializer for partner summary in waterfall result."""
    partner_id = serializers.IntegerField()
    partner_type = serializers.CharField()
    partner_name = serializers.CharField()

    # Distributions by category
    preferred_return = serializers.DecimalField(max_digits=20, decimal_places=2)
    return_of_capital = serializers.DecimalField(max_digits=20, decimal_places=2)
    excess_cash_flow = serializers.DecimalField(max_digits=20, decimal_places=2)
    promote = serializers.DecimalField(max_digits=20, decimal_places=2, required=False)

    # Totals
    total_distributions = serializers.DecimalField(max_digits=20, decimal_places=2)
    total_contributions = serializers.DecimalField(max_digits=20, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=20, decimal_places=2)

    # Returns
    irr = serializers.DecimalField(max_digits=10, decimal_places=6)
    equity_multiple = serializers.DecimalField(max_digits=10, decimal_places=4)

    # Per-tier breakdown
    tier1 = serializers.DecimalField(max_digits=20, decimal_places=2)
    tier2 = serializers.DecimalField(max_digits=20, decimal_places=2)
    tier3 = serializers.DecimalField(max_digits=20, decimal_places=2)
    tier4 = serializers.DecimalField(max_digits=20, decimal_places=2)
    tier5 = serializers.DecimalField(max_digits=20, decimal_places=2)


class WaterfallProjectSummarySerializer(serializers.Serializer):
    """Serializer for project summary in waterfall result."""
    total_equity = serializers.DecimalField(max_digits=20, decimal_places=2)
    lp_equity = serializers.DecimalField(max_digits=20, decimal_places=2)
    gp_equity = serializers.DecimalField(max_digits=20, decimal_places=2)
    total_distributed = serializers.DecimalField(max_digits=20, decimal_places=2)
    lp_distributed = serializers.DecimalField(max_digits=20, decimal_places=2)
    gp_distributed = serializers.DecimalField(max_digits=20, decimal_places=2)
    project_irr = serializers.DecimalField(max_digits=10, decimal_places=6)
    project_emx = serializers.DecimalField(max_digits=10, decimal_places=4)


class WaterfallCalculateResponseSerializer(serializers.Serializer):
    """Response serializer for waterfall calculation."""
    period_results = WaterfallPeriodResultSerializer(many=True)
    lp_summary = WaterfallPartnerSummarySerializer()
    gp_summary = WaterfallPartnerSummarySerializer()
    project_summary = WaterfallProjectSummarySerializer()
    success = serializers.BooleanField(default=True)
    engine = serializers.CharField(default='python')
