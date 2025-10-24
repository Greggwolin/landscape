"""Admin interface for Financial models."""

from django.contrib import admin
# from .models import BudgetItem, ActualItem  # Commented out - models don't match DB schema
from .models_finance_structure import (
    FinanceStructure,
    CostAllocation,
    SaleSettlement,
    ParticipationPayment,
)

# Import scenario admin (registers itself with @admin.register decorators)
from . import admin_scenario  # noqa: F401


# BudgetItem and ActualItem admin temporarily disabled
# The models have fields that don't match the actual core_fin_fact_budget table schema
# TODO: Update models to match actual database schema before re-enabling admin

# @admin.register(BudgetItem)
class BudgetItemAdmin_DISABLED(admin.ModelAdmin):
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


# @admin.register(ActualItem)
class ActualItemAdmin_DISABLED(admin.ModelAdmin):
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


# ============================================================================
# Finance Structure Admin
# ============================================================================


class CostAllocationInline(admin.TabularInline):
    """Inline admin for cost allocations within finance structure."""

    model = CostAllocation
    extra = 1
    fields = [
        'container',
        'allocation_percentage',
        'allocation_basis',
        'allocated_budget_amount',
        'spent_to_date',
        'cost_to_complete',
    ]
    readonly_fields = ['spent_to_date', 'cost_to_complete']
    autocomplete_fields = ['container']


@admin.register(FinanceStructure)
class FinanceStructureAdmin(admin.ModelAdmin):
    """Admin interface for FinanceStructure model."""

    list_display = [
        'finance_structure_id',
        'structure_code',
        'structure_name',
        'project',
        'structure_type',
        'total_budget_amount',
        'allocation_method',
        'is_recurring',
        'is_active',
    ]
    list_filter = [
        'structure_type',
        'allocation_method',
        'is_recurring',
        'is_active',
        'project',
    ]
    search_fields = [
        'structure_code',
        'structure_name',
        'description',
    ]
    readonly_fields = [
        'finance_structure_id',
        'created_at',
        'updated_at',
    ]
    autocomplete_fields = ['project']
    inlines = [CostAllocationInline]
    ordering = ['project', 'structure_code']
    list_per_page = 50

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'finance_structure_id',
                'project',
                'structure_code',
                'structure_name',
                'description',
            )
        }),
        ('Structure Type', {
            'fields': (
                'structure_type',
                'allocation_method',
            )
        }),
        ('Capital Cost Pool', {
            'fields': (
                'total_budget_amount',
                'budget_category',
            ),
            'classes': ('collapse',),
            'description': 'Fields for one-time capital cost pools'
        }),
        ('Operating Obligation Pool', {
            'fields': (
                'is_recurring',
                'recurrence_frequency',
                'annual_amount',
            ),
            'classes': ('collapse',),
            'description': 'Fields for recurring obligations (ground leases, etc.)'
        }),
        ('Status & Audit', {
            'fields': (
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
        return qs.select_related('project').prefetch_related('cost_allocations')

    actions = ['auto_calculate_allocations']

    @admin.action(description='Auto-calculate allocations for selected structures')
    def auto_calculate_allocations(self, request, queryset):
        """Bulk action to auto-calculate allocations."""
        from django.db import connection

        count = 0
        for structure in queryset:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM landscape.auto_calculate_allocations(%s)",
                    [structure.finance_structure_id]
                )
                count += cursor.rowcount

        self.message_user(
            request,
            f'Successfully calculated allocations for {queryset.count()} structures ({count} total allocations)'
        )


@admin.register(CostAllocation)
class CostAllocationAdmin(admin.ModelAdmin):
    """Admin interface for CostAllocation model."""

    list_display = [
        'allocation_id',
        'finance_structure',
        'container',
        'allocation_percentage',
        'allocation_basis',
        'allocated_budget_amount',
        'spent_to_date',
        'cost_to_complete',
    ]
    list_filter = [
        'allocation_basis',
        'finance_structure__project',
    ]
    search_fields = [
        'finance_structure__structure_code',
        'finance_structure__structure_name',
        'container__container_code',
        'container__display_name',
    ]
    readonly_fields = [
        'allocation_id',
        'created_at',
        'updated_at',
    ]
    autocomplete_fields = ['finance_structure', 'container']
    ordering = ['finance_structure', 'container']
    list_per_page = 50

    fieldsets = (
        ('Allocation', {
            'fields': (
                'allocation_id',
                'finance_structure',
                'container',
            )
        }),
        ('Percentage & Basis', {
            'fields': (
                'allocation_percentage',
                'allocation_basis',
            )
        }),
        ('Calculated Amounts', {
            'fields': (
                'allocated_budget_amount',
                'spent_to_date',
                'cost_to_complete',
            ),
            'description': 'Amounts are auto-calculated based on budget activity'
        }),
        ('Audit', {
            'fields': (
                'created_at',
                'updated_at',
            )
        }),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('finance_structure', 'container')


class ParticipationPaymentInline(admin.TabularInline):
    """Inline admin for participation payments within sale settlement."""

    model = ParticipationPayment
    extra = 0
    fields = [
        'payment_date',
        'homes_closed_count',
        'gross_home_sales',
        'participation_amount',
        'net_participation_payment',
        'payment_status',
    ]
    readonly_fields = ['payment_date', 'participation_amount', 'net_participation_payment']


@admin.register(SaleSettlement)
class SaleSettlementAdmin(admin.ModelAdmin):
    """Admin interface for SaleSettlement model."""

    list_display = [
        'settlement_id',
        'project',
        'container',
        'sale_date',
        'buyer_name',
        'list_price',
        'allocated_cost_to_complete',
        'net_proceeds',
        'has_participation',
        'settlement_status',
    ]
    list_filter = [
        'settlement_status',
        'settlement_type',
        'has_participation',
        'project',
        'sale_date',
    ]
    search_fields = [
        'buyer_name',
        'buyer_entity',
        'container__container_code',
        'container__display_name',
    ]
    readonly_fields = [
        'settlement_id',
        'created_at',
        'updated_at',
    ]
    autocomplete_fields = ['project', 'container']
    inlines = [ParticipationPaymentInline]
    ordering = ['-sale_date']
    list_per_page = 50
    date_hierarchy = 'sale_date'

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'settlement_id',
                'project',
                'container',
                'sale_date',
            )
        }),
        ('Buyer Information', {
            'fields': (
                'buyer_name',
                'buyer_entity',
            )
        }),
        ('Financial Terms', {
            'fields': (
                'list_price',
                'allocated_cost_to_complete',
                'other_adjustments',
                'net_proceeds',
            )
        }),
        ('Settlement Details', {
            'fields': (
                'settlement_type',
                'settlement_status',
                'settlement_notes',
                'cost_allocation_detail',
            )
        }),
        ('Participation Structure', {
            'fields': (
                'has_participation',
                'participation_rate',
                'participation_basis',
                'participation_minimum',
                'participation_target_price',
            ),
            'classes': ('collapse',),
            'description': 'Revenue sharing structure for home sales'
        }),
        ('Audit', {
            'fields': (
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
        return qs.select_related('project', 'container').prefetch_related('participation_payments')


@admin.register(ParticipationPayment)
class ParticipationPaymentAdmin(admin.ModelAdmin):
    """Admin interface for ParticipationPayment model."""

    list_display = [
        'payment_id',
        'settlement',
        'project',
        'payment_date',
        'homes_closed_count',
        'gross_home_sales',
        'net_participation_payment',
        'payment_status',
    ]
    list_filter = [
        'payment_status',
        'project',
        'payment_date',
    ]
    search_fields = [
        'settlement__buyer_name',
        'settlement__container__container_code',
    ]
    readonly_fields = [
        'payment_id',
        'created_at',
        'updated_at',
    ]
    autocomplete_fields = ['settlement', 'project']
    ordering = ['-payment_date']
    list_per_page = 50
    date_hierarchy = 'payment_date'

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'payment_id',
                'settlement',
                'project',
                'payment_date',
                'payment_period',
            )
        }),
        ('Home Sales Data', {
            'fields': (
                'homes_closed_count',
                'gross_home_sales',
                'participation_base',
            )
        }),
        ('Payment Calculation', {
            'fields': (
                'participation_amount',
                'less_base_allocation',
                'net_participation_payment',
            ),
            'description': 'Net payment = participation_amount - less_base_allocation'
        }),
        ('Cumulative Tracking', {
            'fields': (
                'cumulative_homes_closed',
                'cumulative_participation_paid',
            )
        }),
        ('Status & Audit', {
            'fields': (
                'payment_status',
                'created_at',
                'updated_at',
            )
        }),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('settlement', 'project')
