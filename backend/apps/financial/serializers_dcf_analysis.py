"""
DCF Analysis Serializers

Session: QK-28 - Updated to include resolved growth rates for cash flow engine
"""

from decimal import Decimal
from rest_framework import serializers
from apps.financial.models_valuation import DcfAnalysis
from apps.financial.services.growth_rate_service import GrowthRateService


class DcfAnalysisSerializer(serializers.ModelSerializer):
    """
    Serializer for DcfAnalysis model.

    Read-only fields: dcf_analysis_id, project_id, property_type
    All other fields are optional and can be updated via PATCH.

    Includes resolved growth rates (price_growth_rate, cost_inflation_rate)
    computed from the growth rate sets for use by the cash flow engine.
    """

    # Expose project_id directly (not nested)
    project_id = serializers.IntegerField(source='project.project_id', read_only=True)

    # Resolved growth rates (computed from set_id -> rate)
    price_growth_rate = serializers.SerializerMethodField()
    cost_inflation_rate = serializers.SerializerMethodField()
    income_growth_rate = serializers.SerializerMethodField()
    expense_growth_rate = serializers.SerializerMethodField()

    def get_price_growth_rate(self, obj):
        """Get the flat price growth rate from the set."""
        if obj.price_growth_set_id:
            rate = GrowthRateService.get_flat_rate(obj.price_growth_set_id)
            return float(rate)
        return 0.03  # Default 3%

    def get_cost_inflation_rate(self, obj):
        """Get the flat cost inflation rate from the set."""
        if obj.cost_inflation_set_id:
            rate = GrowthRateService.get_flat_rate(obj.cost_inflation_set_id)
            return float(rate)
        return 0.03  # Default 3%

    def get_income_growth_rate(self, obj):
        """Get the flat income growth rate from the set (CRE only)."""
        if obj.income_growth_set_id:
            rate = GrowthRateService.get_flat_rate(obj.income_growth_set_id)
            return float(rate)
        return 0.03  # Default 3%

    def get_expense_growth_rate(self, obj):
        """Get the flat expense growth rate from the set (CRE only)."""
        if obj.expense_growth_set_id:
            rate = GrowthRateService.get_flat_rate(obj.expense_growth_set_id)
            return float(rate)
        return 0.03  # Default 3%

    class Meta:
        model = DcfAnalysis
        fields = [
            # Identity
            'dcf_analysis_id',
            'project_id',
            'property_type',

            # Common fields
            'hold_period_years',
            'discount_rate',
            'exit_cap_rate',
            'selling_costs_pct',

            # CRE-specific
            'going_in_cap_rate',
            'cap_rate_method',
            'sensitivity_interval',
            'vacancy_rate',
            'stabilized_vacancy',
            'credit_loss',
            'management_fee_pct',
            'reserves_per_unit',
            'income_growth_set_id',
            'expense_growth_set_id',

            # Land Dev-specific
            'price_growth_set_id',
            'cost_inflation_set_id',
            'bulk_sale_enabled',
            'bulk_sale_period',
            'bulk_sale_discount_pct',

            # Resolved growth rates (computed, read-only)
            'price_growth_rate',
            'cost_inflation_rate',
            'income_growth_rate',
            'expense_growth_rate',

            # Audit
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'dcf_analysis_id',
            'project_id',
            'property_type',
            'created_at',
            'updated_at',
            # Computed fields are always read-only
            'price_growth_rate',
            'cost_inflation_rate',
            'income_growth_rate',
            'expense_growth_rate',
        ]


class GrowthRateSetSerializer(serializers.Serializer):
    """
    Serializer for growth rate sets (read-only, no Django model).
    """
    set_id = serializers.IntegerField()
    set_name = serializers.CharField()
    card_type = serializers.CharField()
    is_global = serializers.BooleanField()
    is_default = serializers.BooleanField()
    project_id = serializers.IntegerField(allow_null=True, required=False)


class GrowthRateStepSerializer(serializers.Serializer):
    """
    Serializer for growth rate steps (read-only, no Django model).
    """
    step_id = serializers.IntegerField()
    step_number = serializers.IntegerField()
    from_period = serializers.IntegerField()
    to_period = serializers.IntegerField(allow_null=True)
    rate = serializers.DecimalField(max_digits=6, decimal_places=4)
