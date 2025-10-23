"""Admin interface for Commercial Real Estate models."""

from django.contrib import admin
from .models import CREProperty, CRETenant, CRESpace, CRELease


@admin.register(CREProperty)
class CREPropertyAdmin(admin.ModelAdmin):
    """Admin interface for CREProperty model."""

    list_display = [
        'cre_property_id',
        'property_name',
        'project',
        'property_type',
        'property_subtype',
        'rentable_sf',
        'property_status',
        'year_built',
    ]
    list_filter = ['property_type', 'property_subtype', 'property_status', 'project']
    search_fields = ['property_name', 'project__project_name']
    readonly_fields = ['cre_property_id', 'created_at', 'updated_at']
    autocomplete_fields = ['project']
    ordering = ['property_name']

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'cre_property_id',
                'project',
                'parcel_id',
                'property_name',
                'property_type',
                'property_subtype',
                'property_status',
            )
        }),
        ('Building Details', {
            'fields': (
                'total_building_sf',
                'rentable_sf',
                'usable_sf',
                'common_area_sf',
                'load_factor',
                'year_built',
                'year_renovated',
                'number_of_floors',
                'number_of_units',
            )
        }),
        ('Parking', {
            'fields': (
                'parking_spaces',
                'parking_ratio',
            ),
            'classes': ('collapse',)
        }),
        ('Financial', {
            'fields': (
                'acquisition_date',
                'acquisition_price',
                'current_assessed_value',
                'stabilization_date',
                'stabilized_occupancy_pct',
            ),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CRETenant)
class CRETenantAdmin(admin.ModelAdmin):
    """Admin interface for CRETenant model."""

    list_display = [
        'tenant_id',
        'tenant_name',
        'industry',
        'creditworthiness',
        'annual_revenue',
        'years_in_business',
    ]
    list_filter = ['industry', 'creditworthiness', 'business_type']
    search_fields = ['tenant_name', 'tenant_legal_name', 'dba_name', 'industry']
    readonly_fields = ['tenant_id', 'created_at', 'updated_at']
    ordering = ['tenant_name']

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'tenant_id',
                'tenant_name',
                'tenant_legal_name',
                'dba_name',
            )
        }),
        ('Business Information', {
            'fields': (
                'industry',
                'naics_code',
                'business_type',
                'annual_revenue',
                'years_in_business',
            )
        }),
        ('Credit Information', {
            'fields': (
                'credit_rating',
                'creditworthiness',
                'dun_bradstreet_number',
            ),
            'classes': ('collapse',)
        }),
        ('Contact Information', {
            'fields': (
                'contact_name',
                'contact_title',
                'email',
                'phone',
            )
        }),
        ('Guarantor', {
            'fields': (
                'guarantor_name',
                'guarantor_type',
            ),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CRESpace)
class CRESpaceAdmin(admin.ModelAdmin):
    """Admin interface for CRESpace model."""

    list_display = [
        'space_id',
        'cre_property',
        'space_number',
        'floor_number',
        'rentable_sf',
        'space_type',
        'space_status',
    ]
    list_filter = ['cre_property', 'space_type', 'space_status', 'floor_number']
    search_fields = ['space_number', 'cre_property__property_name']
    readonly_fields = ['space_id', 'created_at', 'updated_at']
    autocomplete_fields = ['cre_property']
    ordering = ['cre_property', 'space_number']

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'space_id',
                'cre_property',
                'space_number',
                'floor_number',
                'space_type',
                'space_status',
            )
        }),
        ('Size & Configuration', {
            'fields': (
                'rentable_sf',
                'usable_sf',
                'frontage_ft',
                'ceiling_height_ft',
            )
        }),
        ('Features', {
            'fields': (
                'number_of_offices',
                'number_of_conference_rooms',
                'has_kitchenette',
                'has_private_restroom',
            ),
            'classes': ('collapse',)
        }),
        ('Availability', {
            'fields': ('available_date',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CRELease)
class CRELeaseAdmin(admin.ModelAdmin):
    """Admin interface for CRELease model."""

    list_display = [
        'lease_id',
        'lease_number',
        'cre_property',
        'space',
        'tenant',
        'lease_status',
        'lease_commencement_date',
        'lease_expiration_date',
    ]
    list_filter = [
        'lease_status',
        'lease_type',
        'cre_property',
        'lease_commencement_date',
        'lease_expiration_date'
    ]
    search_fields = [
        'lease_number',
        'tenant__tenant_name',
        'space__space_number',
        'cre_property__property_name'
    ]
    readonly_fields = ['lease_id', 'created_at', 'updated_at']
    autocomplete_fields = ['cre_property', 'space', 'tenant']
    ordering = ['-lease_commencement_date']
    date_hierarchy = 'lease_commencement_date'

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'lease_id',
                'lease_number',
                'cre_property',
                'space',
                'tenant',
            )
        }),
        ('Lease Terms', {
            'fields': (
                'lease_type',
                'lease_status',
                'lease_execution_date',
                'lease_commencement_date',
                'rent_commencement_date',
                'lease_expiration_date',
                'lease_term_months',
                'leased_sf',
            )
        }),
        ('Options & Rights', {
            'fields': (
                'number_of_options',
                'option_term_months',
                'option_notice_months',
                'expansion_rights',
                'right_of_first_refusal',
            ),
            'classes': ('collapse',)
        }),
        ('Termination', {
            'fields': (
                'early_termination_allowed',
                'termination_notice_months',
                'termination_penalty_amount',
            ),
            'classes': ('collapse',)
        }),
        ('Security', {
            'fields': (
                'security_deposit_amount',
                'security_deposit_months',
            ),
            'classes': ('collapse',)
        }),
        ('Special Clauses', {
            'fields': (
                'exclusive_use_clause',
                'co_tenancy_clause',
                'radius_restriction',
            ),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
