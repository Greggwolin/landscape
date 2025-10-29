"""
Serializers for Valuation models.

Provides serialization for comprehensive property appraisal including:
- Sales Comparison Approach
- Cost Approach
- Income Approach
- Valuation Reconciliation
"""

from rest_framework import serializers
from .models_valuation import (
    SalesComparable,
    SalesCompAdjustment,
    AIAdjustmentSuggestion,
    CostApproach,
    IncomeApproach,
    CapRateComp,
    ValuationReconciliation,
)
from decimal import Decimal


class AIAdjustmentSuggestionSerializer(serializers.ModelSerializer):
    """Serializer for AI adjustment suggestions"""

    class Meta:
        model = AIAdjustmentSuggestion
        fields = [
            'ai_suggestion_id',
            'comparable_id',
            'adjustment_type',
            'suggested_pct',
            'confidence_level',
            'justification',
            'model_version',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['ai_suggestion_id', 'created_at', 'updated_at']


class SalesCompAdjustmentSerializer(serializers.ModelSerializer):
    """
    Serializer for SalesCompAdjustment model.
    """

    adjustment_type_display = serializers.CharField(
        source='get_adjustment_type_display',
        read_only=True
    )

    class Meta:
        model = SalesCompAdjustment
        fields = [
            'adjustment_id',
            'comparable_id',
            'adjustment_type',
            'adjustment_type_display',
            'adjustment_pct',
            'adjustment_amount',
            'justification',
            'user_adjustment_pct',
            'ai_accepted',
            'user_notes',
            'last_modified_by',
            'created_at',
        ]
        read_only_fields = ['adjustment_id', 'created_at']


class SalesComparableSerializer(serializers.ModelSerializer):
    """
    Serializer for SalesComparable model with nested adjustments.
    """

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)
    adjustments = SalesCompAdjustmentSerializer(many=True, read_only=True)
    ai_suggestions = AIAdjustmentSuggestionSerializer(many=True, read_only=True)
    adjusted_price_per_unit = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    total_adjustment_pct = serializers.SerializerMethodField()

    class Meta:
        model = SalesComparable
        fields = [
            'comparable_id',
            'project_id',
            'comp_number',
            'property_name',
            'address',
            'city',
            'state',
            'zip',
            'sale_date',
            'sale_price',
            'price_per_unit',
            'price_per_sf',
            'year_built',
            'units',
            'building_sf',
            'cap_rate',
            'grm',
            'distance_from_subject',
            'latitude',
            'longitude',
            'unit_mix',
            'notes',
            'adjustments',
            'ai_suggestions',
            'adjusted_price_per_unit',
            'total_adjustment_pct',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['comparable_id', 'created_at', 'updated_at']

    def get_total_adjustment_pct(self, obj):
        """Calculate total adjustment percentage from all adjustments.
        Uses user adjustments if available, otherwise uses original adjustments.
        """
        total = 0
        for adj in obj.adjustments.all():
            if adj.user_adjustment_pct is not None:
                total += float(adj.user_adjustment_pct)
            elif adj.adjustment_pct is not None:
                total += float(adj.adjustment_pct)
        return round(total, 3)


class CostApproachSerializer(serializers.ModelSerializer):
    """
    Serializer for CostApproach model.
    """

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)
    land_valuation_method_display = serializers.CharField(
        source='get_land_valuation_method_display',
        read_only=True
    )
    cost_method_display = serializers.CharField(
        source='get_cost_method_display',
        read_only=True
    )

    class Meta:
        model = CostApproach
        fields = [
            'cost_approach_id',
            'project_id',
            # Land Value
            'land_valuation_method',
            'land_valuation_method_display',
            'land_area_sf',
            'land_value_per_sf',
            'total_land_value',
            # Replacement Cost
            'cost_method',
            'cost_method_display',
            'building_area_sf',
            'cost_per_sf',
            'base_replacement_cost',
            'entrepreneurial_incentive_pct',
            'total_replacement_cost',
            # Depreciation
            'physical_curable',
            'physical_incurable_short',
            'physical_incurable_long',
            'functional_curable',
            'functional_incurable',
            'external_obsolescence',
            'total_depreciation',
            'depreciated_improvements',
            # Site Improvements
            'site_improvements_cost',
            'site_improvements_description',
            # Result
            'indicated_value',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['cost_approach_id', 'created_at', 'updated_at']


class CapRateCompSerializer(serializers.ModelSerializer):
    """
    Serializer for CapRateComp model.
    """

    class Meta:
        model = CapRateComp
        fields = [
            'cap_rate_comp_id',
            'income_approach_id',
            'property_address',
            'sale_price',
            'noi',
            'implied_cap_rate',
            'sale_date',
            'notes',
            'created_at',
        ]
        read_only_fields = ['cap_rate_comp_id', 'created_at']


class IncomeApproachSerializer(serializers.ModelSerializer):
    """
    Serializer for IncomeApproach model with nested cap rate comps.
    """

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)
    market_cap_rate_method_display = serializers.CharField(
        source='get_market_cap_rate_method_display',
        read_only=True
    )
    cap_rate_comps = CapRateCompSerializer(many=True, read_only=True)

    class Meta:
        model = IncomeApproach
        fields = [
            'income_approach_id',
            'project_id',
            # Direct Capitalization
            'market_cap_rate_method',
            'market_cap_rate_method_display',
            'selected_cap_rate',
            'cap_rate_justification',
            'direct_cap_value',
            # DCF
            'forecast_period_years',
            'terminal_cap_rate',
            'discount_rate',
            'dcf_value',
            # Related
            'cap_rate_comps',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['income_approach_id', 'created_at', 'updated_at']


class ValuationReconciliationSerializer(serializers.ModelSerializer):
    """
    Serializer for ValuationReconciliation model.
    """

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)
    total_weight = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = ValuationReconciliation
        fields = [
            'reconciliation_id',
            'project_id',
            'sales_comparison_value',
            'sales_comparison_weight',
            'cost_approach_value',
            'cost_approach_weight',
            'income_approach_value',
            'income_approach_weight',
            'final_reconciled_value',
            'reconciliation_narrative',
            'valuation_date',
            'total_weight',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['reconciliation_id', 'created_at', 'updated_at']

    def validate(self, data):
        """Validate that total weights don't exceed 1.0."""
        total = (
            float(data.get('sales_comparison_weight', 0) or 0) +
            float(data.get('cost_approach_weight', 0) or 0) +
            float(data.get('income_approach_weight', 0) or 0)
        )
        if total > 1.01:  # Allow small rounding error
            raise serializers.ValidationError(
                "Total weights cannot exceed 1.00 (100%)"
            )
        return data


class ValuationSummarySerializer(serializers.Serializer):
    """
    Summary serializer that combines all valuation approaches for a project.
    """

    project_id = serializers.IntegerField()
    sales_comparables = SalesComparableSerializer(many=True)
    sales_comparison_summary = serializers.DictField()
    cost_approach = CostApproachSerializer()
    income_approach = IncomeApproachSerializer()
    reconciliation = ValuationReconciliationSerializer()
