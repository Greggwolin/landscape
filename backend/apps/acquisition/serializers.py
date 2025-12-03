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

    class Meta:
        model = AcquisitionEvent
        fields = [
            'acquisition_id',
            'project_id',
            'contact_id',
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
        read_only_fields = ['acquisition_id', 'created_at', 'updated_at']


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
