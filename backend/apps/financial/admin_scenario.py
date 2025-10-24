"""
Scenario Management Admin
Feature: SCENARIO-001
Created: 2025-10-24

Admin interface for scenario management.
"""

from django.contrib import admin
from .models_scenario import Scenario, ScenarioComparison


@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = [
        'scenario_name', 'project', 'scenario_type',
        'is_active', 'is_locked', 'display_order',
        'created_at'
    ]
    list_filter = ['scenario_type', 'is_active', 'is_locked', 'project']
    search_fields = ['scenario_name', 'description', 'scenario_code']
    readonly_fields = ['scenario_code', 'created_at', 'updated_at']

    fieldsets = (
        ('Basic Info', {
            'fields': ('project', 'scenario_name', 'scenario_type', 'scenario_code')
        }),
        ('Status', {
            'fields': ('is_active', 'is_locked', 'display_order')
        }),
        ('Display', {
            'fields': ('description', 'color_hex')
        }),
        ('Variance Settings', {
            'fields': (
                'variance_method',
                'revenue_variance_pct',
                'cost_variance_pct',
                'absorption_variance_pct',
                'start_date_offset_months'
            ),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at', 'cloned_from'),
            'classes': ('collapse',)
        }),
    )

    actions = ['activate_scenarios', 'lock_scenarios', 'unlock_scenarios']

    def activate_scenarios(self, request, queryset):
        """Bulk activate scenarios (one per project)"""
        for scenario in queryset:
            Scenario.objects.filter(project=scenario.project).update(is_active=False)
            scenario.is_active = True
            scenario.save()
    activate_scenarios.short_description = "Activate selected scenarios"

    def lock_scenarios(self, request, queryset):
        queryset.update(is_locked=True)
    lock_scenarios.short_description = "Lock selected scenarios"

    def unlock_scenarios(self, request, queryset):
        queryset.exclude(scenario_type='base').update(is_locked=False)
    unlock_scenarios.short_description = "Unlock selected scenarios"


@admin.register(ScenarioComparison)
class ScenarioComparisonAdmin(admin.ModelAdmin):
    list_display = ['comparison_name', 'project', 'comparison_type', 'created_at']
    list_filter = ['comparison_type', 'project']
    search_fields = ['comparison_name']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Info', {
            'fields': ('project', 'comparison_name', 'comparison_type')
        }),
        ('Scenarios', {
            'fields': ('scenario_ids', 'scenario_probabilities')
        }),
        ('Results', {
            'fields': ('comparison_results',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
