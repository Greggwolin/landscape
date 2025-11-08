"""Serializers for unit cost templates, categories, and planning standards."""

from rest_framework import serializers

from apps.projects.models import Project
from .models_benchmarks import (
    UnitCostCategory,
    UnitCostTemplate,
    TemplateBenchmarkLink,
    PlanningStandard,
)


class TemplateBenchmarkLinkSerializer(serializers.ModelSerializer):
    """Expose basic benchmark metadata linked to a unit cost template."""

    benchmark_name = serializers.CharField(source='benchmark.benchmark_name', read_only=True)
    benchmark_type = serializers.CharField(source='benchmark.benchmark_type', read_only=True)
    market_geography = serializers.CharField(source='benchmark.market_geography', read_only=True)

    class Meta:
        model = TemplateBenchmarkLink
        fields = [
            'link_id',
            'benchmark_id',
            'benchmark_name',
            'benchmark_type',
            'market_geography',
            'is_primary',
        ]
        read_only_fields = ['link_id', 'benchmark_id', 'benchmark_name', 'benchmark_type', 'market_geography']


class UnitCostCategorySerializer(serializers.ModelSerializer):
    """Serializer for unit cost categories with template counts."""

    template_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = UnitCostCategory
        fields = [
            'category_id',
            'category_name',
            'cost_scope',
            'cost_type',
            'development_stage',
            'sort_order',
            'template_count',
        ]
        read_only_fields = [
            'category_id',
            'category_name',
            'cost_scope',
            'cost_type',
            'development_stage',
            'sort_order',
            'template_count',
        ]


class StageGroupedCategoriesSerializer(serializers.Serializer):
    """Serializer for categories grouped by development stage."""

    stage1_entitlements = UnitCostCategorySerializer(many=True)
    stage2_engineering = UnitCostCategorySerializer(many=True)
    stage3_development = UnitCostCategorySerializer(many=True)


class UnitCostTemplateListSerializer(serializers.ModelSerializer):
    """List serializer for templates; used for accordion views and autocomplete."""

    category_name = serializers.CharField(source='category.category_name', read_only=True)
    has_benchmarks = serializers.SerializerMethodField()
    created_from_project_id = serializers.IntegerField(source='created_from_project.project_id', read_only=True)

    class Meta:
        model = UnitCostTemplate
        fields = [
            'template_id',
            'category_id',
            'category_name',
            'item_name',
            'default_uom_code',
            'typical_mid_value',
            'quantity',
            'market_geography',
            'source',
            'as_of_date',
            'project_type_code',
            'usage_count',
            'last_used_date',
            'has_benchmarks',
            'created_from_ai',
            'created_from_project_id',
            'is_active',
        ]
        read_only_fields = [
            'template_id',
            'category_id',
            'category_name',
            'usage_count',
            'last_used_date',
            'has_benchmarks',
            'created_from_ai',
            'created_from_project_id',
            'is_active',
        ]

    def get_has_benchmarks(self, obj) -> bool:
        """Return whether template has any active benchmark links."""
        if hasattr(obj, 'has_benchmarks'):
            return bool(obj.has_benchmarks)
        return obj.benchmark_links.exists()


class UnitCostTemplateDetailSerializer(UnitCostTemplateListSerializer):
    """Detail serializer returns benchmark metadata."""

    benchmarks = TemplateBenchmarkLinkSerializer(source='benchmark_links', many=True, read_only=True)

    class Meta(UnitCostTemplateListSerializer.Meta):
        fields = UnitCostTemplateListSerializer.Meta.fields + [
            'created_at',
            'updated_at',
            'benchmarks',
        ]
        read_only_fields = UnitCostTemplateListSerializer.Meta.read_only_fields + [
            'created_at',
            'updated_at',
            'benchmarks',
        ]


class UnitCostTemplateWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating templates."""

    category_id = serializers.PrimaryKeyRelatedField(
        source='category',
        queryset=UnitCostCategory.objects.filter(is_active=True),
        required=True
    )
    created_from_project_id = serializers.PrimaryKeyRelatedField(
        source='created_from_project',
        queryset=Project.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = UnitCostTemplate
        fields = [
            'template_id',
            'category_id',
            'item_name',
            'default_uom_code',
            'typical_mid_value',
            'quantity',
            'market_geography',
            'source',
            'as_of_date',
            'project_type_code',
            'usage_count',
            'last_used_date',
            'is_active',
            'created_from_project_id',
            'created_from_ai',
        ]
        read_only_fields = ['template_id', 'usage_count', 'last_used_date', 'created_from_ai']

    def validate_quantity(self, value):
        """Ensure quantity, when provided, is non-negative."""
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError('Quantity must be zero or greater.')
        return value

    def validate_project_type_code(self, value: str) -> str:
        """Ensure project type code is one of the supported values."""
        allowed = {'LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'}
        upper = (value or '').upper()
        if upper and upper not in allowed:
            raise serializers.ValidationError(f"project_type_code must be one of {', '.join(sorted(allowed))}")
        return upper or 'LAND'


class PlanningStandardSerializer(serializers.ModelSerializer):
    """Serializer for global planning defaults."""

    class Meta:
        model = PlanningStandard
        fields = [
            'standard_id',
            'standard_name',
            'default_planning_efficiency',
            'default_street_row_pct',
            'default_park_dedication_pct',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['standard_id', 'standard_name', 'created_at', 'updated_at']
