"""
Serializers for Multifamily application.
"""

from rest_framework import serializers
from .models import (
    MultifamilyUnit,
    MultifamilyUnitType,
    MultifamilyLease,
    MultifamilyTurn,
    ValueAddAssumptions,
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
            'current_rent',
            'market_rent',
            'occupancy_status',
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


class ValueAddAssumptionsSerializer(serializers.ModelSerializer):
    """Serializer for ValueAddAssumptions model."""

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)

    class Meta:
        model = ValueAddAssumptions
        fields = [
            'value_add_id',
            'project_id',
            'is_enabled',
            'reno_cost_per_sf',
            'reno_cost_basis',
            'relocation_incentive',
            'renovate_all',
            'units_to_renovate',
            'reno_starts_per_month',
            'reno_start_month',
            'months_to_complete',
            'rent_premium_pct',
            'relet_lag_months',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['value_add_id', 'created_at', 'updated_at']

    def validate(self, attrs):
        """Enforce basic field constraints."""
        reno_cost_per_sf = attrs.get('reno_cost_per_sf')
        relocation_incentive = attrs.get('relocation_incentive')
        reno_starts_per_month = attrs.get('reno_starts_per_month')
        reno_start_month = attrs.get('reno_start_month')
        months_to_complete = attrs.get('months_to_complete')
        rent_premium_pct = attrs.get('rent_premium_pct')
        relet_lag_months = attrs.get('relet_lag_months')
        renovate_all = attrs.get('renovate_all')
        units_to_renovate = attrs.get('units_to_renovate')
        reno_cost_basis = attrs.get('reno_cost_basis')

        if reno_cost_per_sf is not None and reno_cost_per_sf <= 0:
            raise serializers.ValidationError({'reno_cost_per_sf': 'Must be greater than 0.'})
        if relocation_incentive is not None and relocation_incentive < 0:
            raise serializers.ValidationError({'relocation_incentive': 'Must be 0 or greater.'})
        if reno_starts_per_month is not None and reno_starts_per_month <= 0:
            raise serializers.ValidationError({'reno_starts_per_month': 'Must be greater than 0.'})
        if reno_start_month is not None and reno_start_month < 1:
            raise serializers.ValidationError({'reno_start_month': 'Must be 1 or greater.'})
        if months_to_complete is not None and months_to_complete < 1:
            raise serializers.ValidationError({'months_to_complete': 'Must be 1 or greater.'})
        if rent_premium_pct is not None and (rent_premium_pct < 0 or rent_premium_pct > 1):
            raise serializers.ValidationError({'rent_premium_pct': 'Must be between 0 and 1.'})
        if relet_lag_months is not None and relet_lag_months < 0:
            raise serializers.ValidationError({'relet_lag_months': 'Must be 0 or greater.'})
        if renovate_all is False:
            if units_to_renovate is None or units_to_renovate <= 0:
                raise serializers.ValidationError({'units_to_renovate': 'Enter a positive unit count.'})
        if reno_cost_basis is not None and reno_cost_basis not in ('sf', 'unit'):
            raise serializers.ValidationError({'reno_cost_basis': 'Must be "sf" or "unit".'})

        return attrs


class OccupancyReportSerializer(serializers.Serializer):
    """Serializer for occupancy reports."""

    total_units = serializers.IntegerField()
    occupied_units = serializers.IntegerField()
    vacant_units = serializers.IntegerField()
    occupancy_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    total_market_rent = serializers.DecimalField(max_digits=12, decimal_places=2)
    actual_rent = serializers.DecimalField(max_digits=12, decimal_places=2)
    loss_to_vacancy = serializers.DecimalField(max_digits=12, decimal_places=2)
