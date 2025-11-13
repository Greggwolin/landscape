"""Serializers for unit cost items, categories, and planning standards.

Renamed from "templates" to "items" in migration 0018 to eliminate confusion
with page templates. These serializers handle individual cost line items.
"""

from rest_framework import serializers

from apps.projects.models import Project
from .models_benchmarks import (
    CategoryTagLibrary,
    CategoryLifecycleStage,
    UnitCostCategory,
    UnitCostItem,  # Renamed from UnitCostTemplate in migration 0018
    ItemBenchmarkLink,  # Renamed from TemplateBenchmarkLink in migration 0018
    PlanningStandard,
)


class ItemBenchmarkLinkSerializer(serializers.ModelSerializer):
    """Expose basic benchmark metadata linked to a unit cost item.

    Renamed from TemplateBenchmarkLinkSerializer in migration 0018.
    """

    benchmark_name = serializers.CharField(source='benchmark.benchmark_name', read_only=True)
    benchmark_type = serializers.CharField(source='benchmark.benchmark_type', read_only=True)
    market_geography = serializers.CharField(source='benchmark.market_geography', read_only=True)

    class Meta:
        model = ItemBenchmarkLink
        fields = [
            'link_id',
            'benchmark_id',
            'benchmark_name',
            'benchmark_type',
            'market_geography',
            'is_primary',
        ]
        read_only_fields = ['link_id', 'benchmark_id', 'benchmark_name', 'benchmark_type', 'market_geography']


# Backward compatibility alias
TemplateBenchmarkLinkSerializer = ItemBenchmarkLinkSerializer


class CategoryTagLibrarySerializer(serializers.ModelSerializer):
    """Serializer for category tags."""

    class Meta:
        model = CategoryTagLibrary
        fields = [
            'tag_id',
            'tag_name',
            'tag_context',
            'is_system_default',
            'description',
            'display_order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['tag_id', 'created_at', 'updated_at']


class UnitCostCategorySerializer(serializers.ModelSerializer):
    """Serializer for unit cost categories with lifecycle stages and tags."""

    parent_name = serializers.CharField(source='parent.category_name', read_only=True)
    depth = serializers.IntegerField(read_only=True)
    has_children = serializers.SerializerMethodField()
    item_count = serializers.IntegerField(read_only=True)  # Renamed from template_count
    lifecycle_stages = serializers.SerializerMethodField()  # NEW: array of stages

    class Meta:
        model = UnitCostCategory
        fields = [
            'category_id',
            'parent',
            'parent_name',
            'category_name',
            'lifecycle_stages',  # CHANGED: from lifecycle_stage to lifecycle_stages (array)
            'tags',
            'sort_order',
            'is_active',
            'depth',
            'has_children',
            'item_count',  # Renamed from template_count
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['category_id', 'lifecycle_stages', 'depth', 'has_children', 'item_count', 'created_at', 'updated_at']

    def get_lifecycle_stages(self, obj):
        """Get all lifecycle stages this category belongs to."""
        if hasattr(obj, '_lifecycle_stages'):
            # Use prefetched data if available
            return obj._lifecycle_stages
        return obj.get_lifecycle_stages()

    def get_has_children(self, obj):
        """Check if category has child categories."""
        if hasattr(obj, 'has_children'):
            return obj.has_children
        return obj.children.exists()

    def validate_tags(self, value):
        """Ensure tags is a list."""
        if not isinstance(value, list):
            raise serializers.ValidationError("Tags must be a list.")
        return value


class UnitCostCategoryHierarchySerializer(serializers.ModelSerializer):
    """Serializer with nested children for tree display."""

    children = serializers.SerializerMethodField()
    lifecycle_stages = serializers.SerializerMethodField()

    class Meta:
        model = UnitCostCategory
        fields = [
            'category_id',
            'category_name',
            'lifecycle_stages',
            'tags',
            'sort_order',
            'is_active',
            'children',
        ]

    def get_lifecycle_stages(self, obj):
        """Get all lifecycle stages this category belongs to."""
        if hasattr(obj, '_lifecycle_stages'):
            return obj._lifecycle_stages
        return obj.get_lifecycle_stages()

    def get_children(self, obj):
        """Get nested children recursively."""
        children = obj.children.filter(is_active=True).order_by('sort_order', 'category_name')
        return UnitCostCategoryHierarchySerializer(children, many=True).data


class UnitCostItemListSerializer(serializers.ModelSerializer):
    """List serializer for unit cost items; used for accordion views and autocomplete.

    Renamed from UnitCostTemplateListSerializer in migration 0018.
    """

    category_name = serializers.CharField(source='category.category_name', read_only=True)
    has_benchmarks = serializers.SerializerMethodField()
    created_from_project_id = serializers.IntegerField(source='created_from_project.project_id', read_only=True)

    class Meta:
        model = UnitCostItem
        fields = [
            'item_id',  # Renamed from template_id
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
            'item_id',
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
        """Return whether item has any active benchmark links."""
        if hasattr(obj, 'has_benchmarks'):
            return bool(obj.has_benchmarks)
        return obj.benchmark_links.exists()


# Backward compatibility alias
UnitCostTemplateListSerializer = UnitCostItemListSerializer


class UnitCostItemDetailSerializer(UnitCostItemListSerializer):
    """Detail serializer returns benchmark metadata.

    Renamed from UnitCostTemplateDetailSerializer in migration 0018.
    """

    benchmarks = ItemBenchmarkLinkSerializer(source='benchmark_links', many=True, read_only=True)

    class Meta(UnitCostItemListSerializer.Meta):
        fields = UnitCostItemListSerializer.Meta.fields + [
            'created_at',
            'updated_at',
            'benchmarks',
        ]
        read_only_fields = UnitCostItemListSerializer.Meta.read_only_fields + [
            'created_at',
            'updated_at',
            'benchmarks',
        ]


# Backward compatibility alias
UnitCostTemplateDetailSerializer = UnitCostItemDetailSerializer


class UnitCostItemWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating unit cost items.

    Renamed from UnitCostTemplateWriteSerializer in migration 0018.
    """

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
        model = UnitCostItem
        fields = [
            'item_id',  # Renamed from template_id
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
        read_only_fields = ['item_id', 'usage_count', 'last_used_date', 'created_from_ai']

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


# Backward compatibility alias
UnitCostTemplateWriteSerializer = UnitCostItemWriteSerializer


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
