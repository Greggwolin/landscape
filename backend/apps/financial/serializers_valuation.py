"""
Serializers for Valuation models.

Provides serialization for comprehensive property appraisal including:
- Sales Comparison Approach
- Cost Approach
- Income Approach
- Valuation Reconciliation
"""

from django.db import transaction
from rest_framework import serializers
from .models_valuation import (
    SalesComparable,
    SalesCompUnitMix,
    SalesCompTenant,
    SalesCompHistory,
    SalesCompAdjustment,
    SalesCompIndustrial,
    SalesCompHospitality,
    SalesCompLand,
    SalesCompSelfStorage,
    SalesCompStorageUnitMix,
    SalesCompSpecialtyHousing,
    SalesCompManufactured,
    SalesCompRetail,
    SalesCompOffice,
    SalesCompMarketConditions,
    LkpSaleType,
    LkpPriceStatus,
    LkpBuyerSellerType,
    LkpBuildingClass,
    AIAdjustmentSuggestion,
    CostApproach,
    IncomeApproach,
    CapRateComp,
    ValuationReconciliation,
    HBUAnalysis,
    HBUComparableUse,
    HBUZoningDocument,
    PropertyAttributeDef,
)
from apps.projects.models import Project
from decimal import Decimal, InvalidOperation


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


class LkpSaleTypeSerializer(serializers.ModelSerializer):
    """Lookup serializer for sale types."""

    class Meta:
        model = LkpSaleType
        fields = '__all__'
        read_only_fields = ['code', 'display_name', 'description', 'sort_order']


class LkpPriceStatusSerializer(serializers.ModelSerializer):
    """Lookup serializer for price statuses."""

    class Meta:
        model = LkpPriceStatus
        fields = '__all__'
        read_only_fields = ['code', 'display_name', 'description', 'reliability_score']


class LkpBuyerSellerTypeSerializer(serializers.ModelSerializer):
    """Lookup serializer for buyer/seller types."""

    class Meta:
        model = LkpBuyerSellerType
        fields = '__all__'
        read_only_fields = ['code', 'display_name', 'sort_order']


class LkpBuildingClassSerializer(serializers.ModelSerializer):
    """Lookup serializer for building classes."""

    class Meta:
        model = LkpBuildingClass
        fields = '__all__'
        read_only_fields = ['code', 'display_name', 'description']


class SalesCompUnitMixSerializer(serializers.ModelSerializer):
    """Nested serializer for multifamily unit mix rows."""

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)

    class Meta:
        model = SalesCompUnitMix
        exclude = ['comparable']
        read_only_fields = ['unit_mix_id', 'created_at', 'updated_at', 'comparable_id']


class SalesCompTenantSerializer(serializers.ModelSerializer):
    """Nested serializer for tenant roster rows."""

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)

    class Meta:
        model = SalesCompTenant
        exclude = ['comparable']
        read_only_fields = ['tenant_id', 'created_at', 'updated_at', 'comparable_id']


class SalesCompHistorySerializer(serializers.ModelSerializer):
    """Nested serializer for prior sale history rows."""

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)

    class Meta:
        model = SalesCompHistory
        exclude = ['comparable']
        read_only_fields = ['history_id', 'created_at', 'comparable_id']


class SalesCompAdjustmentSerializer(serializers.ModelSerializer):
    """
    Serializer for SalesCompAdjustment model.
    Used for both standalone adjustment endpoints and nested comp writes.
    """

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)
    adjustment_type_display = serializers.CharField(
        source='get_adjustment_type_display',
        read_only=True
    )

    class Meta:
        model = SalesCompAdjustment
        exclude = ['comparable']
        read_only_fields = ['adjustment_id', 'created_at', 'comparable_id']


class SalesCompIndustrialSerializer(serializers.ModelSerializer):
    """Serializer for industrial extension table."""

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)

    class Meta:
        model = SalesCompIndustrial
        exclude = ['comparable']
        read_only_fields = ['industrial_id', 'created_at', 'updated_at', 'comparable_id']


class SalesCompHospitalitySerializer(serializers.ModelSerializer):
    """Serializer for hospitality extension table."""

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)

    class Meta:
        model = SalesCompHospitality
        exclude = ['comparable']
        read_only_fields = ['hospitality_id', 'created_at', 'updated_at', 'comparable_id']


class SalesCompLandSerializer(serializers.ModelSerializer):
    """Serializer for land extension table."""

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)

    class Meta:
        model = SalesCompLand
        exclude = ['comparable']
        read_only_fields = ['land_id', 'created_at', 'updated_at', 'comparable_id']


class SalesCompStorageUnitMixSerializer(serializers.ModelSerializer):
    """Serializer for self-storage unit mix rows."""

    storage_comp_id = serializers.IntegerField(source='storage_comp.storage_id', read_only=True)

    class Meta:
        model = SalesCompStorageUnitMix
        exclude = ['storage_comp']
        read_only_fields = ['unit_mix_id', 'created_at', 'storage_comp_id']


class SalesCompSelfStorageSerializer(serializers.ModelSerializer):
    """Serializer for self-storage extension table with nested unit mix rows."""

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)
    storage_unit_mix = SalesCompStorageUnitMixSerializer(source='unit_mix', many=True, required=False)

    class Meta:
        model = SalesCompSelfStorage
        exclude = ['comparable']
        read_only_fields = ['storage_id', 'created_at', 'updated_at', 'comparable_id']


class SalesCompSpecialtyHousingSerializer(serializers.ModelSerializer):
    """Serializer for specialty housing extension table."""

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)

    class Meta:
        model = SalesCompSpecialtyHousing
        exclude = ['comparable']
        read_only_fields = ['specialty_id', 'created_at', 'updated_at', 'comparable_id']


class SalesCompManufacturedSerializer(serializers.ModelSerializer):
    """Serializer for manufactured housing extension table."""

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)

    class Meta:
        model = SalesCompManufactured
        exclude = ['comparable']
        read_only_fields = ['manufactured_id', 'created_at', 'updated_at', 'comparable_id']


class SalesCompRetailSerializer(serializers.ModelSerializer):
    """Serializer for retail extension table."""

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)

    class Meta:
        model = SalesCompRetail
        exclude = ['comparable']
        read_only_fields = ['retail_id', 'created_at', 'updated_at', 'comparable_id']


class SalesCompOfficeSerializer(serializers.ModelSerializer):
    """Serializer for office extension table."""

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)

    class Meta:
        model = SalesCompOffice
        exclude = ['comparable']
        read_only_fields = ['office_id', 'created_at', 'updated_at', 'comparable_id']


class SalesCompMarketConditionsSerializer(serializers.ModelSerializer):
    """Serializer for market conditions extension table."""

    comparable_id = serializers.IntegerField(source='comparable.comparable_id', read_only=True)

    class Meta:
        model = SalesCompMarketConditions
        exclude = ['comparable']
        read_only_fields = ['market_id', 'created_at', 'comparable_id']


class SalesComparableListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for project-scoped list endpoints."""

    adjustment_count = serializers.SerializerMethodField()
    has_unit_mix = serializers.SerializerMethodField()

    class Meta:
        model = SalesComparable
        fields = [
            'comparable_id',
            'project',
            'comp_number',
            'property_name',
            'address',
            'city',
            'state',
            'zip',
            'sale_date',
            'sale_price',
            'sale_conditions',
            'property_rights',
            'price_per_unit',
            'price_per_sf',
            'land_area_sf',
            'land_area_acres',
            'cap_rate',
            'grm',
            'units',
            'building_sf',
            'zoning',
            'entitlements',
            'year_built',
            'property_type',
            'latitude',
            'longitude',
            'distance_from_subject',
            'verification_status',
            'adjustment_count',
            'has_unit_mix',
        ]

    def get_adjustment_count(self, obj):
        return obj.adjustments.count()

    def get_has_unit_mix(self, obj):
        return obj.unit_mix_details.exists()


class SalesComparableDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for create/retrieve/update with nested 1:many child writes.
    1:1 extension tables are exposed read-only in this pass.
    """

    unit_mix = SalesCompUnitMixSerializer(source='unit_mix_details', many=True, required=False)
    tenants = SalesCompTenantSerializer(many=True, required=False)
    history = SalesCompHistorySerializer(source='sale_history', many=True, required=False)
    adjustments = SalesCompAdjustmentSerializer(many=True, required=False)

    industrial_details = SalesCompIndustrialSerializer(read_only=True)
    hospitality_details = SalesCompHospitalitySerializer(read_only=True)
    land_details = SalesCompLandSerializer(read_only=True)
    self_storage_details = SalesCompSelfStorageSerializer(read_only=True)
    specialty_housing_details = SalesCompSpecialtyHousingSerializer(read_only=True)
    manufactured_details = SalesCompManufacturedSerializer(read_only=True)
    retail_details = SalesCompRetailSerializer(read_only=True)
    office_details = SalesCompOfficeSerializer(read_only=True)
    market_conditions = SalesCompMarketConditionsSerializer(read_only=True)

    class Meta:
        model = SalesComparable
        fields = [field.name for field in SalesComparable._meta.fields] + [
            'unit_mix',
            'tenants',
            'history',
            'adjustments',
            'industrial_details',
            'hospitality_details',
            'land_details',
            'self_storage_details',
            'specialty_housing_details',
            'manufactured_details',
            'retail_details',
            'office_details',
            'market_conditions',
        ]
        read_only_fields = [
            'comparable_id',
            'created_at',
            'updated_at',
            'price_per_unit',
            'price_per_sf',
            'cap_rate',
            'grm',
        ]
        extra_kwargs = {
            'project': {'required': False},
        }

    @staticmethod
    def _to_decimal(value):
        if value in (None, ''):
            return None
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return None

    def _recalculate_derived_fields(self, instance):
        sale_price = self._to_decimal(instance.sale_price)
        units = self._to_decimal(instance.units)
        building_sf = self._to_decimal(instance.building_sf)

        if sale_price is not None and units is not None and units > 0:
            instance.price_per_unit = sale_price / units
        else:
            instance.price_per_unit = None

        if sale_price is not None and building_sf is not None and building_sf > 0:
            instance.price_per_sf = sale_price / building_sf
        else:
            instance.price_per_sf = None

        instance.save(update_fields=['price_per_unit', 'price_per_sf'])

    def _create_unit_mix_rows(self, comparable, rows):
        if not rows:
            return
        SalesCompUnitMix.objects.bulk_create(
            [SalesCompUnitMix(comparable=comparable, **row) for row in rows]
        )

    def _create_tenant_rows(self, comparable, rows):
        if not rows:
            return
        SalesCompTenant.objects.bulk_create(
            [SalesCompTenant(comparable=comparable, **row) for row in rows]
        )

    def _create_history_rows(self, comparable, rows):
        if not rows:
            return
        SalesCompHistory.objects.bulk_create(
            [SalesCompHistory(comparable=comparable, **row) for row in rows]
        )

    def _create_adjustment_rows(self, comparable, rows):
        if not rows:
            return
        SalesCompAdjustment.objects.bulk_create(
            [SalesCompAdjustment(comparable=comparable, **row) for row in rows]
        )

    @transaction.atomic
    def create(self, validated_data):
        unit_mix_data = validated_data.pop('unit_mix_details', [])
        tenant_data = validated_data.pop('tenants', [])
        history_data = validated_data.pop('sale_history', [])
        adjustment_data = validated_data.pop('adjustments', [])

        comparable = SalesComparable.objects.create(**validated_data)
        self._recalculate_derived_fields(comparable)
        self._create_unit_mix_rows(comparable, unit_mix_data)
        self._create_tenant_rows(comparable, tenant_data)
        self._create_history_rows(comparable, history_data)
        self._create_adjustment_rows(comparable, adjustment_data)
        return comparable

    @transaction.atomic
    def update(self, instance, validated_data):
        unit_mix_data = validated_data.pop('unit_mix_details', None)
        tenant_data = validated_data.pop('tenants', None)
        history_data = validated_data.pop('sale_history', None)
        adjustment_data = validated_data.pop('adjustments', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        self._recalculate_derived_fields(instance)

        if unit_mix_data is not None:
            instance.unit_mix_details.all().delete()
            self._create_unit_mix_rows(instance, unit_mix_data)

        if tenant_data is not None:
            instance.tenants.all().delete()
            self._create_tenant_rows(instance, tenant_data)

        if history_data is not None:
            instance.sale_history.all().delete()
            self._create_history_rows(instance, history_data)

        if adjustment_data is not None:
            instance.adjustments.all().delete()
            self._create_adjustment_rows(instance, adjustment_data)

        return instance


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
            'property_type',
            'comp_number',
            'property_name',
            'address',
            'city',
            'state',
            'zip',
            'sale_date',
            'sale_price',
            'sale_conditions',
            'property_rights',
            'price_per_unit',
            'price_per_sf',
            'year_built',
            'units',
            'building_sf',
            'land_area_sf',
            'land_area_acres',
            'zoning',
            'entitlements',
            'cap_rate',
            'grm',
            'distance_from_subject',
            'latitude',
            'longitude',
            'unit_mix',
            'notes',
            'extra_data',
            'adjustments',
            'ai_suggestions',
            'adjusted_price_per_unit',
            'total_adjustment_pct',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'comparable_id',
            'created_at',
            'updated_at',
            'price_per_unit',
            'price_per_sf',
            'cap_rate',
            'grm',
        ]

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

    @staticmethod
    def _to_decimal(value):
        if value in (None, ''):
            return None
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return None

    def _recalculate_derived_fields(self, instance):
        sale_price = self._to_decimal(instance.sale_price)
        units = self._to_decimal(instance.units)
        building_sf = self._to_decimal(instance.building_sf)

        if sale_price is not None and units is not None and units > 0:
            instance.price_per_unit = sale_price / units
        else:
            instance.price_per_unit = None

        if sale_price is not None and building_sf is not None and building_sf > 0:
            instance.price_per_sf = sale_price / building_sf
        else:
            instance.price_per_sf = None

        instance.save(update_fields=['price_per_unit', 'price_per_sf'])

    def create(self, validated_data):
        instance = super().create(validated_data)
        self._recalculate_derived_fields(instance)
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        self._recalculate_derived_fields(instance)
        return instance


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


# ═══════════════════════════════════════════════════════════════════════════════
# Property Attribute Definition Serializers
# ═══════════════════════════════════════════════════════════════════════════════


class PropertyAttributeDefSerializer(serializers.ModelSerializer):
    """
    Full serializer for PropertyAttributeDef.
    Used for API endpoints that manage attribute definitions.
    """

    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    data_type_display = serializers.CharField(
        source='get_data_type_display',
        read_only=True
    )
    full_code = serializers.CharField(read_only=True)
    options_list = serializers.SerializerMethodField()

    class Meta:
        model = PropertyAttributeDef
        fields = [
            'attribute_id',
            # Classification
            'category',
            'category_display',
            'subcategory',
            # Attribute definition
            'attribute_code',
            'attribute_label',
            'description',
            'full_code',
            # Data type
            'data_type',
            'data_type_display',
            'options',
            'options_list',
            'default_value',
            'is_required',
            # Display
            'sort_order',
            'display_width',
            'help_text',
            # Property types
            'property_types',
            # Status
            'is_system',
            'is_active',
            # Audit
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['attribute_id', 'created_at', 'updated_at', 'full_code']

    def get_options_list(self, obj):
        """Return parsed options for select/multiselect types."""
        return obj.get_options_list()


class PropertyAttributeDefListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing attribute definitions.
    """

    class Meta:
        model = PropertyAttributeDef
        fields = [
            'attribute_id',
            'category',
            'subcategory',
            'attribute_code',
            'attribute_label',
            'data_type',
            'is_required',
            'sort_order',
            'is_system',
            'is_active',
        ]


class PropertyAttributeGroupedSerializer(serializers.Serializer):
    """
    Serializer for grouped attribute definitions by subcategory.
    Used for rendering dynamic forms in the UI.
    """

    category = serializers.CharField()
    subcategories = serializers.DictField(
        child=PropertyAttributeDefSerializer(many=True)
    )


class ProjectPropertyAttributesSerializer(serializers.Serializer):
    """
    Serializer for project property attributes (the JSONB values).
    Used for reading/writing site_attributes and improvement_attributes.
    """

    site_attributes = serializers.JSONField(default=dict)
    improvement_attributes = serializers.JSONField(default=dict)

    def validate_site_attributes(self, value):
        """Validate site_attributes against defined attribute codes."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("site_attributes must be a dict")
        return value

    def validate_improvement_attributes(self, value):
        """Validate improvement_attributes against defined attribute codes."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("improvement_attributes must be a dict")
        return value
