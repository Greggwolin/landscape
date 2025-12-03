"""Admin interface for Market Intelligence models."""

from django.contrib import admin
from .models import AIIngestionHistory, MarketCompetitiveProject, MarketMacroData


@admin.register(AIIngestionHistory)
class AIIngestionHistoryAdmin(admin.ModelAdmin):
    """Admin interface for AIIngestionHistory model."""
    
    list_display = [
        'ingestion_id',
        'doc_id',
        'ingestion_date',
        'model_used',
        'confidence_score',
        'validation_status'
    ]
    list_filter = ['validation_status', 'model_used', 'ingestion_date']
    search_fields = ['doc_id', 'model_used']
    readonly_fields = ['ingestion_id', 'ingestion_date', 'created_at']
    ordering = ['-ingestion_date']
    date_hierarchy = 'ingestion_date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('ingestion_id', 'doc_id', 'ingestion_date')
        }),
        ('AI Processing', {
            'fields': ('model_used', 'confidence_score', 'validation_status')
        }),
        ('Extracted Data', {
            'fields': ('extracted_data',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(MarketCompetitiveProject)
class MarketCompetitiveProjectAdmin(admin.ModelAdmin):
    """Admin interface for Competitive Projects."""

    list_display = [
        'comp_name',
        'project',
        'status',
        'total_units',
        'price_range',
        'absorption_rate_monthly',
        'data_source',
        'created_at'
    ]
    list_filter = ['status', 'data_source', 'created_at']
    search_fields = ['comp_name', 'comp_address', 'project__project_name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Project Information', {
            'fields': ('project', 'comp_name', 'comp_address')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude')
        }),
        ('Development Details', {
            'fields': ('total_units', 'price_min', 'price_max', 'absorption_rate_monthly', 'status')
        }),
        ('Data Source', {
            'fields': ('data_source', 'source_url')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def price_range(self, obj):
        """Display price range."""
        if obj.price_min and obj.price_max:
            return f"${obj.price_min:,.0f} - ${obj.price_max:,.0f}"
        return "N/A"
    price_range.short_description = 'Price Range'


@admin.register(MarketMacroData)
class MarketMacroDataAdmin(admin.ModelAdmin):
    """Admin interface for Market Macro Data."""

    list_display = [
        'project',
        'data_year',
        'population_growth_rate',
        'employment_trend',
        'median_income',
        'data_source',
        'created_at'
    ]
    list_filter = ['employment_trend', 'data_source', 'data_year', 'created_at']
    search_fields = ['project__project_name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-data_year', '-created_at']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Project Information', {
            'fields': ('project', 'data_year')
        }),
        ('Demographics', {
            'fields': ('population_growth_rate', 'household_formation_rate', 'median_income')
        }),
        ('Economic Indicators', {
            'fields': ('employment_trend', 'building_permits_annual')
        }),
        ('Data Source', {
            'fields': ('data_source', 'source_url')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
