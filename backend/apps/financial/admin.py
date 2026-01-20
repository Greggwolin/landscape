"""Admin interface for Financial models."""

from django.contrib import admin
# from .models import BudgetItem, ActualItem  # Commented out - models don't match DB schema
from .models_finance_structure import (
    FinanceStructure,
    CostAllocation,
    SaleSettlement,
    ParticipationPayment,
)
from .models_valuation import (
    HBUAnalysis,
    HBUComparableUse,
    HBUZoningDocument,
    PropertyAttributeDef,
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


# ============================================================================
# H&BU (Highest & Best Use) Admin
# ============================================================================


class HBUComparableUseInline(admin.TabularInline):
    """Inline admin for comparable uses within H&BU analysis."""

    model = HBUComparableUse
    extra = 0
    fields = [
        'use_name',
        'use_category',
        'is_legally_permissible',
        'is_physically_possible',
        'is_economically_feasible',
        'residual_land_value',
        'feasibility_rank',
    ]


class HBUZoningDocumentInline(admin.TabularInline):
    """Inline admin for zoning documents within H&BU analysis."""

    model = HBUZoningDocument
    extra = 0
    fields = [
        'document',
        'jurisdiction_name',
        'zoning_designation',
        'extraction_confidence',
        'user_verified',
    ]
    readonly_fields = ['extraction_confidence']


@admin.register(HBUAnalysis)
class HBUAnalysisAdmin(admin.ModelAdmin):
    """Admin interface for H&BU Analysis."""

    list_display = [
        'hbu_id',
        'project',
        'scenario_name',
        'scenario_type',
        'legal_permissible',
        'physical_possible',
        'economic_feasible',
        'is_maximally_productive',
        'productivity_rank',
        'status',
    ]
    list_filter = [
        'scenario_type',
        'status',
        'legal_permissible',
        'physical_possible',
        'economic_feasible',
        'is_maximally_productive',
        'project',
    ]
    search_fields = [
        'scenario_name',
        'legal_zoning_code',
        'conclusion_use_type',
        'project__project_name',
    ]
    readonly_fields = [
        'hbu_id',
        'created_at',
        'updated_at',
    ]
    inlines = [HBUComparableUseInline, HBUZoningDocumentInline]
    ordering = ['project', 'productivity_rank', 'scenario_name']
    list_per_page = 50

    fieldsets = (
        ('Scenario', {
            'fields': (
                'hbu_id',
                'project',
                'scenario_name',
                'scenario_type',
                'status',
            )
        }),
        ('1. Legally Permissible', {
            'fields': (
                'legal_permissible',
                'legal_zoning_code',
                'legal_zoning_source_doc',
                'legal_permitted_uses',
                'legal_requires_variance',
                'legal_variance_type',
                'legal_narrative',
            ),
            'classes': ('collapse',),
        }),
        ('2. Physically Possible', {
            'fields': (
                'physical_possible',
                'physical_site_adequate',
                'physical_topography_suitable',
                'physical_utilities_available',
                'physical_access_adequate',
                'physical_constraints',
                'physical_narrative',
            ),
            'classes': ('collapse',),
        }),
        ('3. Economically Feasible', {
            'fields': (
                'economic_feasible',
                'economic_development_cost',
                'economic_stabilized_value',
                'economic_residual_land_value',
                'economic_profit_margin_pct',
                'economic_irr_pct',
                'economic_feasibility_threshold',
                'economic_narrative',
            ),
            'classes': ('collapse',),
        }),
        ('4. Maximally Productive', {
            'fields': (
                'is_maximally_productive',
                'productivity_rank',
                'productivity_metric',
                'productivity_narrative',
            ),
            'classes': ('collapse',),
        }),
        ('Conclusion', {
            'fields': (
                'conclusion_use_type',
                'conclusion_density',
                'conclusion_summary',
                'conclusion_full_narrative',
            ),
        }),
        ('Audit', {
            'fields': (
                'created_at',
                'updated_at',
                'created_by',
                'updated_by',
            ),
            'classes': ('collapse',),
        }),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('project', 'legal_zoning_source_doc')


@admin.register(HBUComparableUse)
class HBUComparableUseAdmin(admin.ModelAdmin):
    """Admin interface for H&BU Comparable Use."""

    list_display = [
        'comparable_use_id',
        'hbu',
        'use_name',
        'use_category',
        'is_legally_permissible',
        'is_physically_possible',
        'is_economically_feasible',
        'residual_land_value',
        'feasibility_rank',
    ]
    list_filter = [
        'use_category',
        'is_legally_permissible',
        'is_physically_possible',
        'is_economically_feasible',
        'hbu__project',
    ]
    search_fields = [
        'use_name',
        'hbu__scenario_name',
    ]
    readonly_fields = ['comparable_use_id', 'created_at']
    ordering = ['hbu', 'feasibility_rank', 'use_name']
    list_per_page = 50

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('hbu', 'hbu__project')


@admin.register(HBUZoningDocument)
class HBUZoningDocumentAdmin(admin.ModelAdmin):
    """Admin interface for H&BU Zoning Document."""

    list_display = [
        'zoning_doc_id',
        'hbu',
        'document',
        'jurisdiction_name',
        'zoning_designation',
        'extraction_confidence',
        'user_verified',
    ]
    list_filter = [
        'user_verified',
        'hbu__project',
    ]
    search_fields = [
        'jurisdiction_name',
        'zoning_designation',
        'hbu__scenario_name',
    ]
    readonly_fields = ['zoning_doc_id', 'created_at']
    ordering = ['hbu', '-created_at']
    list_per_page = 50

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('hbu', 'document')


# ============================================================================
# Property Attribute Definitions Admin
# ============================================================================


@admin.register(PropertyAttributeDef)
class PropertyAttributeDefAdmin(admin.ModelAdmin):
    """Admin interface for Property Attribute Definitions."""

    list_display = [
        'attribute_id',
        'category',
        'subcategory',
        'attribute_code',
        'attribute_label',
        'data_type',
        'is_required',
        'sort_order',
        'is_system',
        'is_active',
    ]
    list_filter = [
        'category',
        'subcategory',
        'data_type',
        'is_required',
        'is_system',
        'is_active',
    ]
    search_fields = [
        'attribute_code',
        'attribute_label',
        'description',
        'help_text',
    ]
    readonly_fields = [
        'attribute_id',
        'created_at',
        'updated_at',
    ]
    ordering = ['category', 'subcategory', 'sort_order']
    list_per_page = 50
    list_editable = ['sort_order', 'is_active']

    fieldsets = (
        ('Classification', {
            'fields': (
                'attribute_id',
                'category',
                'subcategory',
            )
        }),
        ('Attribute Definition', {
            'fields': (
                'attribute_code',
                'attribute_label',
                'description',
            )
        }),
        ('Data Type & Validation', {
            'fields': (
                'data_type',
                'options',
                'default_value',
                'is_required',
            )
        }),
        ('Display', {
            'fields': (
                'sort_order',
                'display_width',
                'help_text',
            )
        }),
        ('Applicability', {
            'fields': (
                'property_types',
            ),
            'description': 'Leave empty to apply to all property types'
        }),
        ('Status', {
            'fields': (
                'is_system',
                'is_active',
            )
        }),
        ('Audit', {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',),
        }),
    )

    def get_queryset(self, request):
        """Standard queryset - no relations needed."""
        return super().get_queryset(request)
