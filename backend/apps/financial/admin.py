"""Admin interface for Financial models."""

from django.contrib import admin
from .models import BudgetItem, ActualItem


@admin.register(BudgetItem)
class BudgetItemAdmin(admin.ModelAdmin):
    """Admin interface for BudgetItem model."""

    list_display = [
        'budget_item_id',
        'line_item_name',
        'project',
        'container',
        'category',
        'subcategory',
        'fiscal_year',
        'fiscal_period',
        'budgeted_amount',
        'is_rollup',
        'is_active',
    ]
    list_filter = [
        'category',
        'fiscal_year',
        'period_type',
        'is_rollup',
        'is_active',
        'project',
    ]
    search_fields = [
        'line_item_name',
        'account_code',
        'notes',
    ]
    readonly_fields = [
        'budget_item_id',
        'created_at',
        'updated_at',
    ]
    ordering = ['project', 'fiscal_year', 'fiscal_period', 'category', 'line_item_name']
    list_per_page = 50

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'budget_item_id',
                'project',
                'container',
                'line_item_name',
                'account_code',
            )
        }),
        ('Classification', {
            'fields': (
                'category',
                'subcategory',
            )
        }),
        ('Time Period', {
            'fields': (
                'fiscal_year',
                'fiscal_period',
                'period_type',
            )
        }),
        ('Financial Data', {
            'fields': (
                'budgeted_amount',
                'variance_amount',
            )
        }),
        ('Hierarchy', {
            'fields': (
                'is_rollup',
                'parent_budget_item',
            )
        }),
        ('Metadata', {
            'fields': (
                'notes',
                'attributes',
                'is_active',
                'created_at',
                'updated_at',
                'created_by',
                'updated_by',
            )
        }),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('project', 'container', 'parent_budget_item')


@admin.register(ActualItem)
class ActualItemAdmin(admin.ModelAdmin):
    """Admin interface for ActualItem model."""

    list_display = [
        'actual_item_id',
        'line_item_name',
        'project',
        'container',
        'category',
        'fiscal_year',
        'fiscal_period',
        'transaction_date',
        'actual_amount',
        'variance_amount',
        'is_active',
    ]
    list_filter = [
        'category',
        'fiscal_year',
        'is_active',
        'project',
        'transaction_date',
    ]
    search_fields = [
        'line_item_name',
        'account_code',
        'notes',
    ]
    readonly_fields = [
        'actual_item_id',
        'variance_amount',
        'variance_pct',
        'created_at',
        'updated_at',
    ]
    ordering = ['project', 'fiscal_year', 'fiscal_period', 'transaction_date']
    list_per_page = 50
    date_hierarchy = 'transaction_date'

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'actual_item_id',
                'project',
                'container',
                'budget_item',
                'line_item_name',
                'account_code',
            )
        }),
        ('Classification', {
            'fields': (
                'category',
                'subcategory',
            )
        }),
        ('Time Period', {
            'fields': (
                'fiscal_year',
                'fiscal_period',
                'transaction_date',
            )
        }),
        ('Financial Data', {
            'fields': (
                'actual_amount',
                'budgeted_amount',
                'variance_amount',
                'variance_pct',
            ),
            'description': 'Variance is automatically calculated on save.'
        }),
        ('Metadata', {
            'fields': (
                'notes',
                'attributes',
                'is_active',
                'created_at',
                'updated_at',
                'created_by',
                'updated_by',
            )
        }),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('project', 'container', 'budget_item')
