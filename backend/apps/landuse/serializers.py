"""Serializers for Land Use application."""

from decimal import Decimal

from rest_framework import serializers
from .models import (
    InventoryItem, Family, Type, LotProduct,
    ResSpec, ComSpec, DensityClassification,
    ProjectLandUse, ProjectLandUseProduct,
)


class FamilySerializer(serializers.ModelSerializer):
    """Serializer for Family lookup model."""

    type_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Family
        fields = ['family_id', 'code', 'name', 'active', 'notes', 'type_count']
        read_only_fields = ['family_id']


class TypeSerializer(serializers.ModelSerializer):
    """Serializer for Type lookup model."""

    family_id = serializers.IntegerField(read_only=True)
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Type
        fields = [
            'type_id', 'family_id', 'code', 'name', 'ord',
            'active', 'notes', 'product_count',
        ]
        read_only_fields = ['type_id']


class InventoryItemSerializer(serializers.ModelSerializer):
    """Serializer for InventoryItem model."""

    container_code = serializers.CharField(source='container.container_code', read_only=True)
    family_name = serializers.CharField(source='family.name', read_only=True)
    type_name = serializers.CharField(source='type.name', read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            'item_id',
            'container_id',
            'container_code',
            'family_id',
            'family_name',
            'type_id',
            'type_name',
            'data_values',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['item_id', 'created_at', 'updated_at']


class LotProductSerializer(serializers.ModelSerializer):
    """Serializer for global lot product catalog."""

    type_id = serializers.PrimaryKeyRelatedField(
        source='type',
        queryset=Type.objects.all(),
        required=False,
        allow_null=True
    )
    type_name = serializers.CharField(source='type.name', read_only=True)
    density_per_acre = serializers.SerializerMethodField()

    class Meta:
        model = LotProduct
        fields = [
            'product_id',
            'code',
            'lot_w_ft',
            'lot_d_ft',
            'lot_area_sf',
            'type_id',
            'type_name',
            'is_active',
            'created_at',
            'updated_at',
            'density_per_acre',
        ]
        read_only_fields = ['product_id', 'lot_area_sf', 'created_at', 'updated_at', 'density_per_acre', 'type_name']

    def validate(self, attrs):
        """Auto-calculate lot area when width and depth provided."""
        lot_w_ft = attrs.get('lot_w_ft', getattr(self.instance, 'lot_w_ft', None))
        lot_d_ft = attrs.get('lot_d_ft', getattr(self.instance, 'lot_d_ft', None))

        if lot_w_ft and lot_w_ft <= 0:
            raise serializers.ValidationError({'lot_w_ft': 'Lot width must be greater than zero.'})
        if lot_d_ft and lot_d_ft <= 0:
            raise serializers.ValidationError({'lot_d_ft': 'Lot depth must be greater than zero.'})

        if lot_w_ft and lot_d_ft:
            attrs['lot_area_sf'] = (Decimal(lot_w_ft) * Decimal(lot_d_ft)).quantize(Decimal('0.01'))

        return attrs

    def get_density_per_acre(self, obj):
        """Compute density using global planning efficiency defaults."""
        if not obj.lot_area_sf or obj.lot_area_sf <= 0:
            return None

        efficiency = self.context.get('planning_efficiency')
        if efficiency is None:
            from apps.financial.models_benchmarks import PlanningStandard

            standard = PlanningStandard.objects.filter(is_active=True).order_by('standard_id').first()
            efficiency = float(standard.default_planning_efficiency) if standard else 1.0
            self.context['planning_efficiency'] = efficiency

        try:
            area = float(obj.lot_area_sf)
            if area <= 0:
                return None
            density = (43560.0 / area) * float(efficiency)
            return round(density, 2)
        except (TypeError, ValueError):
            return None


class ResSpecSerializer(serializers.ModelSerializer):
    """Serializer for residential development specifications."""

    class Meta:
        model = ResSpec
        fields = [
            'res_spec_id', 'type_id',
            'dua_min', 'dua_max',
            'lot_w_min_ft', 'lot_d_min_ft', 'lot_area_min_sf',
            'sb_front_ft', 'sb_side_ft', 'sb_corner_ft', 'sb_rear_ft',
            'hgt_max_ft', 'cov_max_pct', 'os_min_pct', 'pk_per_unit',
            'notes', 'eff_date', 'doc_id',
        ]
        read_only_fields = ['res_spec_id']


class ComSpecSerializer(serializers.ModelSerializer):
    """Serializer for commercial development specifications."""

    class Meta:
        model = ComSpec
        fields = [
            'com_spec_id', 'type_id',
            'far_min', 'far_max',
            'cov_max_pct', 'pk_per_ksf',
            'hgt_max_ft',
            'sb_front_ft', 'sb_side_ft', 'sb_corner_ft', 'sb_rear_ft',
            'os_min_pct',
            'notes', 'eff_date', 'doc_id',
        ]
        read_only_fields = ['com_spec_id']


class DensityClassificationSerializer(serializers.ModelSerializer):
    """Serializer for density classification reference."""

    class Meta:
        model = DensityClassification
        fields = [
            'density_id', 'code', 'name', 'family_category',
            'intensity_min', 'intensity_max', 'intensity_metric',
            'description', 'jurisdiction_notes',
            'active', 'sort_order',
        ]
        read_only_fields = ['density_id']


class ProjectLandUseProductSerializer(serializers.ModelSerializer):
    """Serializer for product selections within a project land use type."""

    product_code = serializers.CharField(source='product.code', read_only=True)
    lot_w_ft = serializers.DecimalField(
        source='product.lot_w_ft', max_digits=10, decimal_places=2, read_only=True
    )
    lot_d_ft = serializers.DecimalField(
        source='product.lot_d_ft', max_digits=10, decimal_places=2, read_only=True
    )
    lot_area_sf = serializers.DecimalField(
        source='product.lot_area_sf', max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = ProjectLandUseProduct
        fields = [
            'project_land_use_product_id',
            'product_id', 'product_code',
            'lot_w_ft', 'lot_d_ft', 'lot_area_sf',
            'is_active', 'created_at',
        ]
        read_only_fields = ['project_land_use_product_id', 'created_at']


class ProjectLandUseSerializer(serializers.ModelSerializer):
    """Serializer for project-scoped land use type selections."""

    family_name = serializers.CharField(source='family.name', read_only=True)
    family_code = serializers.CharField(source='family.code', read_only=True)
    type_name = serializers.CharField(source='type.name', read_only=True)
    type_code = serializers.CharField(source='type.code', read_only=True)
    product_selections = ProjectLandUseProductSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectLandUse
        fields = [
            'project_land_use_id', 'project_id',
            'family_id', 'family_name', 'family_code',
            'type_id', 'type_name', 'type_code',
            'is_active', 'notes',
            'product_selections',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['project_land_use_id', 'created_at', 'updated_at']
