"""Serializers for Land Development app."""

from rest_framework import serializers


# ── Acreage Allocation ────────────────────────────────────────────────────


class AcreageAllocationSerializer(serializers.Serializer):
    """Read/write serializer for tbl_acreage_allocation rows."""

    allocation_id = serializers.IntegerField(read_only=True)
    project_id = serializers.IntegerField(read_only=True)
    phase_id = serializers.IntegerField(required=False, allow_null=True)
    parcel_id = serializers.IntegerField(required=False, allow_null=True)
    allocation_type_id = serializers.IntegerField(required=False, allow_null=True)
    allocation_type_code = serializers.CharField(max_length=50)
    allocation_type_name = serializers.CharField(read_only=True, required=False)
    acres = serializers.DecimalField(max_digits=12, decimal_places=4)
    notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    confidence_score = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True
    )
    value_source = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    source_doc_id = serializers.IntegerField(required=False, allow_null=True)
    source_page = serializers.IntegerField(required=False, allow_null=True)
    source_snippet = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class AcreageAllocationWriteSerializer(serializers.Serializer):
    """Validation for creating/updating a single allocation."""

    allocation_type_code = serializers.CharField(max_length=50)
    acres = serializers.DecimalField(max_digits=12, decimal_places=4)
    phase_id = serializers.IntegerField(required=False, allow_null=True)
    parcel_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    confidence_score = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True
    )
    value_source = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    source_doc_id = serializers.IntegerField(required=False, allow_null=True)
    source_page = serializers.IntegerField(required=False, allow_null=True)
    source_snippet = serializers.CharField(required=False, allow_null=True, allow_blank=True)


# ── Land Planning ─────────────────────────────────────────────────────────


class LandPlanningInputSerializer(serializers.Serializer):
    """Input validation for land planning computation."""

    gross_acres = serializers.FloatField(
        min_value=0.01,
        help_text='Total gross acreage of the site'
    )

    # Lot dimensions — provide EITHER product_id OR explicit w/d
    lot_product_id = serializers.IntegerField(
        required=False, allow_null=True,
        help_text='res_lot_product.product_id (resolves dimensions automatically)'
    )
    lot_w_ft = serializers.FloatField(
        required=False, allow_null=True,
        help_text='Lot width in feet (explicit override)'
    )
    lot_d_ft = serializers.FloatField(
        required=False, allow_null=True,
        help_text='Lot depth in feet (explicit override)'
    )
    lot_area_sf = serializers.FloatField(
        required=False, allow_null=True,
        help_text='Lot area in sq ft (explicit override, else w*d)'
    )

    # Yield-band adjustment inputs
    constraint_risk = serializers.ChoiceField(
        choices=['low', 'medium', 'high'],
        default='medium',
        help_text='Site constraint risk level'
    )
    row_burden = serializers.ChoiceField(
        choices=['light', 'typical', 'heavy'],
        default='typical',
        help_text='Right-of-way burden'
    )
    layout_style = serializers.ChoiceField(
        choices=['grid', 'curvilinear', 'cul_de_sac'],
        default='curvilinear',
        help_text='Street layout style'
    )
    open_space_pct = serializers.FloatField(
        default=10.0,
        min_value=0.0,
        max_value=100.0,
        help_text='Jurisdiction open space requirement (%)'
    )

    # Optional RYF overrides
    ryf_conservative = serializers.FloatField(required=False, allow_null=True)
    ryf_base = serializers.FloatField(required=False, allow_null=True)
    ryf_optimistic = serializers.FloatField(required=False, allow_null=True)

    def validate(self, data):
        """Ensure either lot_product_id or lot_w_ft is provided."""
        if not data.get('lot_product_id') and not data.get('lot_w_ft'):
            raise serializers.ValidationError(
                'Must provide either lot_product_id or lot_w_ft/lot_d_ft'
            )
        return data
