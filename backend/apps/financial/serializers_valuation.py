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
    HBUAnalysis,
    HBUComparableUse,
    HBUZoningDocument,
)
from apps.projects.models import Project
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

    # project_id works for both read and write
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        source='project'
    )
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

    # project_id works for both read and write
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        source='project'
    )
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
    Serializer for IncomeApproach model - covers tbl_income_approach fields only.

    ARCHITECTURE NOTE (QK-16):
    This serializer covers ONLY fields stored in tbl_income_approach.
    For complete Income Approach data (including aggregated assumptions from
    tbl_project_assumption, tbl_cre_dcf_analysis, core_fin_growth_rate_sets),
    use views_income_approach.py which combines this with IncomeApproachDataService.

    Fields from other tables NOT included here:
      - vacancy_rate -> tbl_project_assumption.physical_vacancy_pct
      - credit_loss_rate -> tbl_project_assumption.bad_debt_pct
      - management_fee_pct -> tbl_project_assumption.management_fee_pct
      - hold_period_years -> tbl_cre_dcf_analysis.hold_period_years
      - income_growth_rate -> core_fin_growth_rate_sets (card_type='revenue')
      - expense_growth_rate -> core_fin_growth_rate_sets (card_type='cost')
    """

    # project_id works for both read and write
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        source='project'
    )
    market_cap_rate_method_display = serializers.CharField(
        source='get_market_cap_rate_method_display',
        read_only=True
    )
    noi_capitalization_basis_display = serializers.CharField(
        source='get_noi_capitalization_basis_display',
        read_only=True
    )
    cap_rate_comps = CapRateCompSerializer(many=True, read_only=True)

    class Meta:
        model = IncomeApproach
        fields = [
            'income_approach_id',
            'project_id',
            # NOI Basis (Migration 046)
            'noi_capitalization_basis',
            'noi_capitalization_basis_display',
            # Direct Capitalization
            'market_cap_rate_method',
            'market_cap_rate_method_display',
            'selected_cap_rate',
            'cap_rate_justification',
            'direct_cap_value',
            # DCF Parameters (original, legacy - prefer tbl_cre_dcf_analysis)
            'forecast_period_years',
            'terminal_cap_rate',
            'discount_rate',
            'dcf_value',
            # Sensitivity Intervals (Migration 046)
            'stabilized_vacancy_rate',
            'cap_rate_interval',
            'discount_rate_interval',
            # Related
            'cap_rate_comps',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['income_approach_id', 'created_at', 'updated_at']


# Backward compatibility alias
IncomeApproachLegacySerializer = IncomeApproachSerializer


class ValuationReconciliationSerializer(serializers.ModelSerializer):
    """
    Serializer for ValuationReconciliation model.
    """

    # project_id works for both read and write
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        source='project'
    )
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


# ═══════════════════════════════════════════════════════════════════════════════
# Highest & Best Use (H&BU) Analysis Serializers
# ═══════════════════════════════════════════════════════════════════════════════


class HBUZoningDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for HBUZoningDocument - zoning docs linked to H&BU with extractions.
    """

    document_name = serializers.CharField(
        source='document.doc_name',
        read_only=True
    )
    has_extractions = serializers.BooleanField(read_only=True)

    class Meta:
        model = HBUZoningDocument
        fields = [
            'zoning_doc_id',
            'hbu_id',
            'document_id',
            'document_name',
            # Extracted data
            'jurisdiction_name',
            'zoning_designation',
            'permitted_uses_extracted',
            'conditional_uses_extracted',
            'prohibited_uses_extracted',
            'development_standards_extracted',
            # Metadata
            'extraction_confidence',
            'extraction_date',
            'user_verified',
            'has_extractions',
            'created_at',
        ]
        read_only_fields = ['zoning_doc_id', 'created_at', 'has_extractions']


class HBUComparableUseSerializer(serializers.ModelSerializer):
    """
    Serializer for HBUComparableUse - individual uses tested in feasibility studies.
    """

    passes_feasibility = serializers.BooleanField(read_only=True)

    class Meta:
        model = HBUComparableUse
        fields = [
            'comparable_use_id',
            'hbu_id',
            # Use identification
            'use_name',
            'use_category',
            # Tests
            'is_legally_permissible',
            'is_physically_possible',
            'is_economically_feasible',
            'passes_feasibility',
            # Metrics
            'proposed_density',
            'development_cost',
            'stabilized_value',
            'residual_land_value',
            'irr_pct',
            # Ranking
            'feasibility_rank',
            'notes',
            'created_at',
        ]
        read_only_fields = ['comparable_use_id', 'created_at', 'passes_feasibility']


class HBUAnalysisSerializer(serializers.ModelSerializer):
    """
    Full serializer for HBUAnalysis with nested comparable uses and zoning docs.
    """

    # project_id works for both read and write
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        source='project'
    )
    scenario_type_display = serializers.CharField(
        source='get_scenario_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    productivity_metric_display = serializers.CharField(
        source='get_productivity_metric_display',
        read_only=True
    )
    comparable_uses = HBUComparableUseSerializer(many=True, read_only=True)
    zoning_documents = HBUZoningDocumentSerializer(many=True, read_only=True)
    passes_all_tests = serializers.BooleanField(read_only=True)
    test_summary = serializers.DictField(read_only=True)

    class Meta:
        model = HBUAnalysis
        fields = [
            'hbu_id',
            'project_id',
            # Scenario
            'scenario_name',
            'scenario_type',
            'scenario_type_display',
            # 1. Legally Permissible
            'legal_permissible',
            'legal_zoning_code',
            'legal_zoning_source_doc_id',
            'legal_permitted_uses',
            'legal_requires_variance',
            'legal_variance_type',
            'legal_narrative',
            # 2. Physically Possible
            'physical_possible',
            'physical_site_adequate',
            'physical_topography_suitable',
            'physical_utilities_available',
            'physical_access_adequate',
            'physical_constraints',
            'physical_narrative',
            # 3. Economically Feasible
            'economic_feasible',
            'economic_development_cost',
            'economic_stabilized_value',
            'economic_residual_land_value',
            'economic_profit_margin_pct',
            'economic_irr_pct',
            'economic_feasibility_threshold',
            'economic_narrative',
            # 4. Maximally Productive
            'is_maximally_productive',
            'productivity_rank',
            'productivity_metric',
            'productivity_metric_display',
            'productivity_narrative',
            # Conclusion
            'conclusion_use_type',
            'conclusion_density',
            'conclusion_summary',
            'conclusion_full_narrative',
            # Computed
            'passes_all_tests',
            'test_summary',
            # Related
            'comparable_uses',
            'zoning_documents',
            # Status & Audit
            'status',
            'status_display',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        ]
        read_only_fields = [
            'hbu_id',
            'created_at',
            'updated_at',
            'passes_all_tests',
            'test_summary',
        ]


class HBUAnalysisSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for H&BU list views.
    """

    scenario_type_display = serializers.CharField(
        source='get_scenario_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    passes_all_tests = serializers.BooleanField(read_only=True)

    class Meta:
        model = HBUAnalysis
        fields = [
            'hbu_id',
            'scenario_name',
            'scenario_type',
            'scenario_type_display',
            'legal_permissible',
            'physical_possible',
            'economic_feasible',
            'is_maximally_productive',
            'productivity_rank',
            'economic_residual_land_value',
            'economic_irr_pct',
            'conclusion_use_type',
            'passes_all_tests',
            'status',
            'status_display',
            'updated_at',
        ]


class HBUCompareRequestSerializer(serializers.Serializer):
    """
    Serializer for H&BU comparison request.
    """

    METRIC_CHOICES = [
        ('residual_land_value', 'Residual Land Value'),
        ('irr', 'Internal Rate of Return'),
        ('profit_margin', 'Profit Margin'),
    ]

    comparison_metric = serializers.ChoiceField(
        choices=METRIC_CHOICES,
        default='residual_land_value'
    )


class HBUCompareResponseSerializer(serializers.Serializer):
    """
    Serializer for H&BU comparison response.
    """

    comparison_metric = serializers.CharField()
    rankings = serializers.ListField(
        child=serializers.DictField()
    )
    winner = serializers.DictField(allow_null=True)
