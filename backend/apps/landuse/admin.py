"""Admin interface for Land Use models."""

from django.contrib import admin
from .models import InventoryItem, Family, Type


@admin.register(Family)
class FamilyAdmin(admin.ModelAdmin):
    """Admin interface for Family lookup model."""

    list_display = ['family_id', 'name', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    readonly_fields = ['family_id']


@admin.register(Type)
class TypeAdmin(admin.ModelAdmin):
    """Admin interface for Type lookup model."""

    list_display = ['type_id', 'name', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    readonly_fields = ['type_id']


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    """Admin interface for InventoryItem model."""

    list_display = ['item_id', 'container', 'family', 'type', 'is_active']
    list_filter = ['is_active', 'family', 'type']
    search_fields = ['container__container_code']
    readonly_fields = ['item_id', 'created_at', 'updated_at']
    autocomplete_fields = ['container', 'family', 'type']

    fieldsets = (
        ('Basic Information', {
            'fields': ('item_id', 'container', 'family', 'type')
        }),
        ('Data', {
            'fields': ('data_values', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
