"""
Valuation Serializers

Serializers for narrative versioning API endpoints.
"""

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from rest_framework import serializers

from .models import (
    NarrativeVersion,
    NarrativeComment,
    NarrativeChange,
    LandComparable,
    LandCompAdjustment,
    ContainerCostMetadata,
    CostApproachDepreciation,
)


class NarrativeCommentSerializer(serializers.ModelSerializer):
    """Serializer for inline comments."""

    class Meta:
        model = NarrativeComment
        fields = [
            'id',
            'version_id',
            'comment_text',
            'position_start',
            'position_end',
            'is_question',
            'is_resolved',
            'resolved_by',
            'resolved_at',
            'landscaper_response',
            'created_by',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'is_question']

    def create(self, validated_data):
        # Auto-detect if comment is a question
        comment_text = validated_data.get('comment_text', '')
        validated_data['is_question'] = comment_text.strip().endswith('?')
        return super().create(validated_data)


class NarrativeChangeSerializer(serializers.ModelSerializer):
    """Serializer for track changes."""

    class Meta:
        model = NarrativeChange
        fields = [
            'id',
            'version_id',
            'change_type',
            'original_text',
            'new_text',
            'position_start',
            'position_end',
            'is_accepted',
            'accepted_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class NarrativeVersionSerializer(serializers.ModelSerializer):
    """Serializer for narrative versions with nested comments and changes."""

    comments = NarrativeCommentSerializer(many=True, read_only=True)
    changes = NarrativeChangeSerializer(many=True, read_only=True)
    comment_count = serializers.SerializerMethodField()
    unresolved_comment_count = serializers.SerializerMethodField()
    pending_change_count = serializers.SerializerMethodField()

    class Meta:
        model = NarrativeVersion
        fields = [
            'id',
            'project_id',
            'approach_type',
            'version_number',
            'content',
            'content_html',
            'content_plain',
            'status',
            'created_by',
            'created_at',
            'updated_at',
            'comments',
            'changes',
            'comment_count',
            'unresolved_comment_count',
            'pending_change_count',
        ]
        read_only_fields = ['id', 'version_number', 'created_at', 'updated_at']

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_unresolved_comment_count(self, obj):
        return obj.comments.filter(is_resolved=False).count()

    def get_pending_change_count(self, obj):
        return obj.changes.filter(is_accepted=False).count()


class NarrativeVersionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for version list (without nested data)."""

    comment_count = serializers.SerializerMethodField()
    unresolved_comment_count = serializers.SerializerMethodField()

    class Meta:
        model = NarrativeVersion
        fields = [
            'id',
            'version_number',
            'status',
            'created_by',
            'created_at',
            'updated_at',
            'comment_count',
            'unresolved_comment_count',
        ]

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_unresolved_comment_count(self, obj):
        return obj.comments.filter(is_resolved=False).count()


class NarrativeVersionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new narrative versions."""

    class Meta:
        model = NarrativeVersion
        fields = [
            'project_id',
            'approach_type',
            'content',
            'content_html',
            'content_plain',
            'status',
            'created_by',
        ]

    def create(self, validated_data):
        # Auto-increment version number
        project_id = validated_data['project_id']
        approach_type = validated_data['approach_type']

        # Get the latest version number for this project/approach
        latest = NarrativeVersion.objects.filter(
            project_id=project_id,
            approach_type=approach_type
        ).order_by('-version_number').first()

        validated_data['version_number'] = (latest.version_number + 1) if latest else 1

        return super().create(validated_data)


class AcceptChangesSerializer(serializers.Serializer):
    """Serializer for accepting all track changes."""

    accept_all = serializers.BooleanField(default=True)
    change_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text='Optional list of specific change IDs to accept'
    )


class LandComparableSerializer(serializers.ModelSerializer):
    """Serializer for land comparables with derived fields."""

    project_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = LandComparable
        fields = [
            'land_comparable_id',
            'project',
            'project_id',
            'comp_number',
            'address',
            'city',
            'state',
            'zip',
            'sale_date',
            'sale_price',
            'land_area_sf',
            'land_area_acres',
            'price_per_sf',
            'price_per_acre',
            'zoning',
            'source',
            'latitude',
            'longitude',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'land_comparable_id',
            'project',
            'land_area_acres',
            'price_per_sf',
            'price_per_acre',
            'created_at',
            'updated_at',
        ]

    def _to_decimal(self, value):
        if value is None:
            return None
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return None

    def _apply_derived_fields(self, data, instance=None):
        sale_price = data.get('sale_price')
        area_sf = data.get('land_area_sf')

        if sale_price is None and instance is not None:
            sale_price = instance.sale_price
        if area_sf is None and instance is not None:
            area_sf = instance.land_area_sf

        sale_price_dec = self._to_decimal(sale_price)
        area_sf_dec = self._to_decimal(area_sf)

        if area_sf_dec:
            acres = (area_sf_dec / Decimal('43560')).quantize(
                Decimal('0.0001'),
                rounding=ROUND_HALF_UP
            )
            data['land_area_acres'] = acres
        else:
            data['land_area_acres'] = None

        if sale_price_dec and area_sf_dec:
            price_sf = (sale_price_dec / area_sf_dec).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP
            )
            data['price_per_sf'] = price_sf
        else:
            data['price_per_sf'] = None

        if sale_price_dec and area_sf_dec:
            acres_value = data.get('land_area_acres')
            acres_dec = self._to_decimal(acres_value)
            if acres_dec:
                price_acre = (sale_price_dec / acres_dec).quantize(
                    Decimal('0.01'),
                    rounding=ROUND_HALF_UP
                )
                data['price_per_acre'] = price_acre
            else:
                data['price_per_acre'] = None
        else:
            data['price_per_acre'] = None

        return data

    def create(self, validated_data):
        project_id = validated_data.pop('project_id', None)
        validated_data = self._apply_derived_fields(validated_data)
        if project_id:
            validated_data['project_id'] = project_id
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('project_id', None)
        validated_data = self._apply_derived_fields(validated_data, instance)
        return super().update(instance, validated_data)


class LandCompAdjustmentSerializer(serializers.ModelSerializer):
    """Serializer for individual adjustment entries."""

    class Meta:
        model = LandCompAdjustment
        fields = [
            'adjustment_id',
            'land_comparable',
            'adjustment_type',
            'adjustment_pct',
            'adjustment_amount',
            'justification',
            'created_at',
        ]
        read_only_fields = ['adjustment_id', 'created_at']


class ContainerCostMetadataSerializer(serializers.ModelSerializer):
    """Serializer for container-level cost metadata."""

    class Meta:
        model = ContainerCostMetadata
        fields = [
            'cost_metadata_id',
            'container',
            'cost_source',
            'source_section',
            'source_page',
            'cost_date',
            'construction_class',
            'quality',
            'num_stories',
            'base_cost_per_sf',
            'height_per_story_factor',
            'perimeter_factor',
            'current_cost_multiplier',
            'local_area_multiplier',
            'indirect_cost_pct',
            'entrepreneurial_profit_pct',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['cost_metadata_id', 'created_at', 'updated_at']


class CostApproachDepreciationSerializer(serializers.ModelSerializer):
    """Serializer for project-level depreciation breakdown."""

    total_depreciation = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()

    class Meta:
        model = CostApproachDepreciation
        fields = [
            'depreciation_id',
            'project',
            'project_id',
            'physical_curable',
            'physical_incurable_short',
            'physical_incurable_long',
            'functional_curable',
            'functional_incurable',
            'external_obsolescence',
            'effective_age_years',
            'remaining_life_years',
            'depreciation_method',
            'notes',
            'total_depreciation',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['depreciation_id', 'project', 'created_at', 'updated_at']

    def get_total_depreciation(self, obj):
        subtotal = sum(
            value for value in [
                obj.physical_curable,
                obj.physical_incurable_short,
                obj.physical_incurable_long,
                obj.functional_curable,
                obj.functional_incurable,
                obj.external_obsolescence,
            ]
            if value is not None
        )
        return float(subtotal)

    def get_project_id(self, obj):
        return obj.project_id

    def create(self, validated_data):
        project_id = self.context.get('project_id')
        if project_id:
            validated_data['project_id'] = project_id
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('project_id', None)
        return super().update(instance, validated_data)
