"""
Serializers for Multifamily application.
"""

from rest_framework import serializers
from .models import (
    MultifamilyUnit,
    MultifamilyUnitType,
    MultifamilyLease,
    MultifamilyTurn,
)


class MultifamilyUnitTypeSerializer(serializers.ModelSerializer):
    """Serializer for MultifamilyUnitType model."""

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)

    class Meta:
        model = MultifamilyUnitType
        fields = [
            'unit_type_id',
            'project_id',
            'unit_type_code',
            'bedrooms',
            'bathrooms',
            'avg_square_feet',
            'current_market_rent',
            'total_units',
            'notes',
            'other_features',
            'floorplan_doc_id',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['unit_type_id', 'created_at', 'updated_at']


class MultifamilyUnitSerializer(serializers.ModelSerializer):
    """Serializer for MultifamilyUnit model."""

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)
    current_lease = serializers.SerializerMethodField()

    class Meta:
        model = MultifamilyUnit
        fields = [
            'unit_id',
            'project_id',
            'unit_number',
            'building_name',
            'unit_type',
            'bedrooms',
            'bathrooms',
            'square_feet',
            'market_rent',
            'renovation_status',
            'renovation_date',
            'renovation_cost',
            'other_features',
            'current_lease',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['unit_id', 'created_at', 'updated_at']

    def get_current_lease(self, obj):
        """Get the current active lease for this unit."""
        current_lease = obj.leases.filter(lease_status='ACTIVE').first()
        if current_lease:
            return {
                'lease_id': current_lease.lease_id,
                'resident_name': current_lease.resident_name,
                'lease_start_date': current_lease.lease_start_date,
                'lease_end_date': current_lease.lease_end_date,
                'base_rent_monthly': float(current_lease.base_rent_monthly),
            }
        return None


class MultifamilyLeaseSerializer(serializers.ModelSerializer):
    """Serializer for MultifamilyLease model."""

    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    building_name = serializers.CharField(source='unit.building_name', read_only=True)
    project_id = serializers.IntegerField(source='unit.project.project_id', read_only=True)

    class Meta:
        model = MultifamilyLease
        fields = [
            'lease_id',
            'unit_id',
            'unit_number',
            'building_name',
            'project_id',
            'resident_name',
            'lease_start_date',
            'lease_end_date',
            'lease_term_months',
            'base_rent_monthly',
            'effective_rent_monthly',
            'months_free_rent',
            'concession_amount',
            'security_deposit',
            'pet_rent_monthly',
            'parking_rent_monthly',
            'lease_status',
            'notice_date',
            'notice_to_vacate_days',
            'is_renewal',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['lease_id', 'created_at', 'updated_at']


class MultifamilyTurnSerializer(serializers.ModelSerializer):
    """Serializer for MultifamilyTurn model."""

    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    building_name = serializers.CharField(source='unit.building_name', read_only=True)
    project_id = serializers.IntegerField(source='unit.project.project_id', read_only=True)

    class Meta:
        model = MultifamilyTurn
        fields = [
            'turn_id',
            'unit_id',
            'unit_number',
            'building_name',
            'project_id',
            'move_out_date',
            'make_ready_complete_date',
            'next_move_in_date',
            'total_vacant_days',
            'cleaning_cost',
            'painting_cost',
            'carpet_flooring_cost',
            'appliance_cost',
            'other_cost',
            'total_make_ready_cost',
            'turn_status',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['turn_id', 'total_make_ready_cost', 'created_at', 'updated_at']


class OccupancyReportSerializer(serializers.Serializer):
    """Serializer for occupancy reports."""

    total_units = serializers.IntegerField()
    occupied_units = serializers.IntegerField()
    vacant_units = serializers.IntegerField()
    occupancy_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    total_market_rent = serializers.DecimalField(max_digits=12, decimal_places=2)
    actual_rent = serializers.DecimalField(max_digits=12, decimal_places=2)
    loss_to_vacancy = serializers.DecimalField(max_digits=12, decimal_places=2)
