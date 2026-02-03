"""
Serializers for Acquisition models.
"""

from rest_framework import serializers
from .models import AcquisitionEvent, PropertyAcquisition


class AcquisitionEventSerializer(serializers.ModelSerializer):
    """
    Serializer for AcquisitionEvent model (ledger entries).
    """

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)

    # Category fields - writable by ID
    category_id = serializers.IntegerField(
        source='category.category_id',
        allow_null=True,
        required=False
    )
    subcategory_id = serializers.IntegerField(
        source='subcategory.category_id',
        allow_null=True,
        required=False
    )

    # Read-only display names
    category_name = serializers.CharField(
        source='category.category_name',
        read_only=True
    )
    subcategory_name = serializers.CharField(
        source='subcategory.category_name',
        read_only=True
    )

    class Meta:
        model = AcquisitionEvent
        fields = [
            'acquisition_id',
            'project_id',
            'contact_id',
            'category_id',
            'subcategory_id',
            'category_name',
            'subcategory_name',
            'event_date',
            'event_type',
            'description',
            'amount',
            'is_applied_to_purchase',
            'goes_hard_date',
            'is_conditional',
            'units_conveyed',
            'measure_id',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['acquisition_id', 'category_name', 'subcategory_name', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        """Handle category_id and subcategory_id updates."""
        # Extract category IDs from flat data before validation
        internal = super().to_internal_value(data)

        # Handle category_id
        if 'category_id' in data:
            cat_id = data.get('category_id')
            if cat_id is None or cat_id == '':
                internal['category'] = None
            else:
                from apps.financial.models_benchmarks import UnitCostCategory
                try:
                    internal['category'] = UnitCostCategory.objects.get(category_id=int(cat_id))
                except (UnitCostCategory.DoesNotExist, ValueError, TypeError):
                    internal['category'] = None

        # Handle subcategory_id
        if 'subcategory_id' in data:
            subcat_id = data.get('subcategory_id')
            if subcat_id is None or subcat_id == '':
                internal['subcategory'] = None
            else:
                from apps.financial.models_benchmarks import UnitCostCategory
                try:
                    internal['subcategory'] = UnitCostCategory.objects.get(category_id=int(subcat_id))
                except (UnitCostCategory.DoesNotExist, ValueError, TypeError):
                    internal['subcategory'] = None

        return internal


class PropertyAcquisitionSerializer(serializers.ModelSerializer):
    """
    Serializer for PropertyAcquisition model (assumptions and disposition planning).
    """

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)

    class Meta:
        model = PropertyAcquisition
        fields = [
            'acquisition_id',
            'project_id',
            'purchase_price',
            'acquisition_date',
            'hold_period_years',
            'exit_cap_rate',
            'sale_date',
            'closing_costs_pct',
            'due_diligence_days',
            'earnest_money',
            'sale_costs_pct',
            'broker_commission_pct',
            'price_per_unit',
            'price_per_sf',
            'legal_fees',
            'financing_fees',
            'third_party_reports',
            'depreciation_basis',
            'land_pct',
            'improvement_pct',
            'is_1031_exchange',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['acquisition_id', 'created_at', 'updated_at']
