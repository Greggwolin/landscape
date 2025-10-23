"""
Serializers for Commercial Real Estate application.
"""

from rest_framework import serializers
from .models import CREProperty, CRETenant, CRESpace, CRELease


class CREPropertySerializer(serializers.ModelSerializer):
    """Serializer for CREProperty model."""

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)

    class Meta:
        model = CREProperty
        fields = [
            'cre_property_id',
            'project_id',
            'project_name',
            'parcel_id',
            'property_name',
            'property_type',
            'property_subtype',
            'total_building_sf',
            'rentable_sf',
            'usable_sf',
            'common_area_sf',
            'load_factor',
            'year_built',
            'year_renovated',
            'number_of_floors',
            'number_of_units',
            'parking_spaces',
            'parking_ratio',
            'property_status',
            'stabilization_date',
            'stabilized_occupancy_pct',
            'acquisition_date',
            'acquisition_price',
            'current_assessed_value',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['cre_property_id', 'created_at', 'updated_at']


class CRETenantSerializer(serializers.ModelSerializer):
    """Serializer for CRETenant model."""

    active_leases_count = serializers.SerializerMethodField()

    class Meta:
        model = CRETenant
        fields = [
            'tenant_id',
            'tenant_name',
            'tenant_legal_name',
            'dba_name',
            'industry',
            'naics_code',
            'business_type',
            'credit_rating',
            'creditworthiness',
            'dun_bradstreet_number',
            'annual_revenue',
            'years_in_business',
            'contact_name',
            'contact_title',
            'email',
            'phone',
            'guarantor_name',
            'guarantor_type',
            'active_leases_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['tenant_id', 'created_at', 'updated_at']

    def get_active_leases_count(self, obj):
        """Get count of active leases for this tenant."""
        return obj.leases.filter(lease_status='ACTIVE').count()


class CRESpaceSerializer(serializers.ModelSerializer):
    """Serializer for CRESpace model."""

    property_name = serializers.CharField(source='cre_property.property_name', read_only=True)
    current_tenant = serializers.SerializerMethodField()

    class Meta:
        model = CRESpace
        fields = [
            'space_id',
            'cre_property_id',
            'property_name',
            'space_number',
            'floor_number',
            'usable_sf',
            'rentable_sf',
            'space_type',
            'frontage_ft',
            'ceiling_height_ft',
            'number_of_offices',
            'number_of_conference_rooms',
            'has_kitchenette',
            'has_private_restroom',
            'space_status',
            'available_date',
            'current_tenant',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['space_id', 'created_at', 'updated_at']

    def get_current_tenant(self, obj):
        """Get the current tenant for this space."""
        current_lease = obj.leases.filter(lease_status='ACTIVE').first()
        if current_lease and current_lease.tenant:
            return {
                'tenant_id': current_lease.tenant.tenant_id,
                'tenant_name': current_lease.tenant.tenant_name,
                'lease_id': current_lease.lease_id
            }
        return None


class CRELeaseSerializer(serializers.ModelSerializer):
    """Serializer for CRELease model."""

    property_name = serializers.CharField(source='cre_property.property_name', read_only=True)
    space_number = serializers.CharField(source='space.space_number', read_only=True)
    tenant_name = serializers.CharField(source='tenant.tenant_name', read_only=True)

    class Meta:
        model = CRELease
        fields = [
            'lease_id',
            'cre_property_id',
            'property_name',
            'space_id',
            'space_number',
            'tenant_id',
            'tenant_name',
            'lease_number',
            'lease_type',
            'lease_status',
            'lease_execution_date',
            'lease_commencement_date',
            'rent_commencement_date',
            'lease_expiration_date',
            'lease_term_months',
            'leased_sf',
            'number_of_options',
            'option_term_months',
            'option_notice_months',
            'early_termination_allowed',
            'termination_notice_months',
            'termination_penalty_amount',
            'security_deposit_amount',
            'security_deposit_months',
            'expansion_rights',
            'right_of_first_refusal',
            'exclusive_use_clause',
            'co_tenancy_clause',
            'radius_restriction',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['lease_id', 'created_at', 'updated_at']


class RentRollSerializer(serializers.Serializer):
    """Serializer for rent roll reports."""

    space_number = serializers.CharField()
    tenant_name = serializers.CharField()
    rentable_sf = serializers.DecimalField(max_digits=10, decimal_places=2)
    lease_status = serializers.CharField()
    lease_start_date = serializers.DateField()
    lease_expiration_date = serializers.DateField()
    monthly_base_rent = serializers.DecimalField(max_digits=12, decimal_places=2)
    annual_rent_psf = serializers.DecimalField(max_digits=10, decimal_places=2)
