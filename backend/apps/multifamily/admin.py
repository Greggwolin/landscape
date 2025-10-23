"""Admin interface for Multifamily models."""

from django.contrib import admin
from .models import (
    MultifamilyUnit,
    MultifamilyUnitType,
    MultifamilyLease,
    MultifamilyTurn,
)


@admin.register(MultifamilyUnitType)
class MultifamilyUnitTypeAdmin(admin.ModelAdmin):
    """Admin interface for MultifamilyUnitType model."""

    list_display = [
        'unit_type_id',
        'project',
        'unit_type_code',
        'bedrooms',
        'bathrooms',
        'avg_square_feet',
        'current_market_rent',
        'total_units',
    ]
    list_filter = ['project', 'bedrooms', 'bathrooms']
    search_fields = ['unit_type_code', 'project__project_name']
    readonly_fields = ['unit_type_id', 'created_at', 'updated_at']
    autocomplete_fields = ['project']
    ordering = ['project', 'unit_type_code']

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'unit_type_id',
                'project',
                'unit_type_code',
            )
        }),
        ('Unit Configuration', {
            'fields': (
                'bedrooms',
                'bathrooms',
                'avg_square_feet',
            )
        }),
        ('Financial', {
            'fields': (
                'current_market_rent',
                'total_units',
            )
        }),
        ('Additional Details', {
            'fields': (
                'notes',
                'other_features',
                'floorplan_doc_id',
            ),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MultifamilyUnit)
class MultifamilyUnitAdmin(admin.ModelAdmin):
    """Admin interface for MultifamilyUnit model."""

    list_display = [
        'unit_id',
        'project',
        'building_name',
        'unit_number',
        'unit_type',
        'bedrooms',
        'bathrooms',
        'square_feet',
        'market_rent',
        'renovation_status',
    ]
    list_filter = ['project', 'building_name', 'unit_type', 'renovation_status']
    search_fields = ['unit_number', 'building_name', 'project__project_name']
    readonly_fields = ['unit_id', 'created_at', 'updated_at']
    autocomplete_fields = ['project']
    ordering = ['project', 'building_name', 'unit_number']

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'unit_id',
                'project',
                'unit_number',
                'building_name',
            )
        }),
        ('Unit Details', {
            'fields': (
                'unit_type',
                'bedrooms',
                'bathrooms',
                'square_feet',
                'market_rent',
            )
        }),
        ('Renovation', {
            'fields': (
                'renovation_status',
                'renovation_date',
                'renovation_cost',
            ),
            'classes': ('collapse',)
        }),
        ('Additional Details', {
            'fields': ('other_features',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MultifamilyLease)
class MultifamilyLeaseAdmin(admin.ModelAdmin):
    """Admin interface for MultifamilyLease model."""

    list_display = [
        'lease_id',
        'unit',
        'resident_name',
        'lease_start_date',
        'lease_end_date',
        'base_rent_monthly',
        'lease_status',
        'is_renewal',
    ]
    list_filter = ['lease_status', 'is_renewal', 'lease_start_date', 'lease_end_date']
    search_fields = ['resident_name', 'unit__unit_number', 'unit__building_name']
    readonly_fields = ['lease_id', 'created_at', 'updated_at']
    autocomplete_fields = ['unit']
    ordering = ['-lease_start_date']
    date_hierarchy = 'lease_start_date'

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'lease_id',
                'unit',
                'resident_name',
            )
        }),
        ('Lease Terms', {
            'fields': (
                'lease_start_date',
                'lease_end_date',
                'lease_term_months',
                'lease_status',
                'is_renewal',
            )
        }),
        ('Rent & Fees', {
            'fields': (
                'base_rent_monthly',
                'effective_rent_monthly',
                'pet_rent_monthly',
                'parking_rent_monthly',
            )
        }),
        ('Concessions & Deposits', {
            'fields': (
                'months_free_rent',
                'concession_amount',
                'security_deposit',
            ),
            'classes': ('collapse',)
        }),
        ('Notice Information', {
            'fields': (
                'notice_date',
                'notice_to_vacate_days',
            ),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MultifamilyTurn)
class MultifamilyTurnAdmin(admin.ModelAdmin):
    """Admin interface for MultifamilyTurn model."""

    list_display = [
        'turn_id',
        'unit',
        'move_out_date',
        'make_ready_complete_date',
        'next_move_in_date',
        'total_vacant_days',
        'total_make_ready_cost',
        'turn_status',
    ]
    list_filter = ['turn_status', 'move_out_date']
    search_fields = ['unit__unit_number', 'unit__building_name', 'notes']
    readonly_fields = ['turn_id', 'total_make_ready_cost', 'created_at', 'updated_at']
    autocomplete_fields = ['unit']
    ordering = ['-move_out_date']
    date_hierarchy = 'move_out_date'

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'turn_id',
                'unit',
                'turn_status',
            )
        }),
        ('Dates', {
            'fields': (
                'move_out_date',
                'make_ready_complete_date',
                'next_move_in_date',
                'total_vacant_days',
            )
        }),
        ('Make Ready Costs', {
            'fields': (
                'cleaning_cost',
                'painting_cost',
                'carpet_flooring_cost',
                'appliance_cost',
                'other_cost',
                'total_make_ready_cost',
            )
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
