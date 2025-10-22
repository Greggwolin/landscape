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
