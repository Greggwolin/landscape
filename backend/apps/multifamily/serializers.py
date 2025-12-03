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
        # Use prefetched active_leases if available, otherwise query normally
        if hasattr(obj, 'active_leases'):
            current_lease = obj.active_leases[0] if obj.active_leases else None
        else:
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
    building_name = serializers.CharField(source='unit.building_name', read_only=True, allow_null=True)
    project_id = serializers.IntegerField(source='unit.project.project_id', read_only=True)
    # Include unit fields for RentRollGrid compatibility - writable for inline editing
    unit_type = serializers.CharField(required=False)
    square_feet = serializers.IntegerField(required=False)
    bedrooms = serializers.DecimalField(required=False, max_digits=3, decimal_places=1, allow_null=True)
    bathrooms = serializers.DecimalField(required=False, max_digits=3, decimal_places=2, allow_null=True)
    market_rent = serializers.DecimalField(required=False, max_digits=10, decimal_places=2, allow_null=True)
    other_features = serializers.CharField(required=False, allow_null=True, allow_blank=True)

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
            # Unit fields for grid display
            'unit_type',
            'square_feet',
            'bedrooms',
            'bathrooms',
            'market_rent',
            'other_features',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['lease_id', 'created_at', 'updated_at']

    def to_representation(self, instance):
        """Add unit fields to the representation."""
        data = super().to_representation(instance)
        # Populate unit fields from the related unit
        if instance.unit:
            data['unit_type'] = instance.unit.unit_type
            data['square_feet'] = instance.unit.square_feet
            data['bedrooms'] = instance.unit.bedrooms
            data['bathrooms'] = instance.unit.bathrooms
            data['market_rent'] = instance.unit.market_rent
            data['other_features'] = instance.unit.other_features
        return data

    def update(self, instance, validated_data):
        """Handle updates to both lease and unit fields."""
        # Extract unit fields from validated data
        unit_fields = {}
        unit_field_names = ['unit_type', 'square_feet', 'bedrooms', 'bathrooms', 'market_rent', 'other_features']

        for field in unit_field_names:
            if field in validated_data:
                unit_fields[field] = validated_data.pop(field)

        # Update the unit if any unit fields were provided
        if unit_fields:
            unit = instance.unit
            for field, value in unit_fields.items():
                setattr(unit, field, value)
            unit.save()

        # Update the lease with remaining fields
        return super().update(instance, validated_data)


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
