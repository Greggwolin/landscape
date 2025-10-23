"""Admin interface for Container models."""

from django.contrib import admin
from .models import Container


@admin.register(Container)
class ContainerAdmin(admin.ModelAdmin):
    """Admin interface for Container model."""

    list_display = [
        'container_id',
        'container_code',
        'display_name',
        'project',
        'container_level',
        'parent_container',
        'sort_order',
        'is_active',
    ]
    list_filter = [
        'container_level',
        'is_active',
        'project',
    ]
    search_fields = [
        'container_code',
        'display_name',
    ]
    readonly_fields = [
        'container_id',
        'created_at',
        'updated_at',
    ]
    ordering = ['project', 'container_level', 'sort_order', 'container_code']
    list_per_page = 50

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'container_id',
                'project',
                'container_code',
                'display_name',
            )
        }),
        ('Hierarchy', {
            'fields': (
                'container_level',
                'parent_container',
                'sort_order',
            )
        }),
        ('Data', {
            'fields': (
                'attributes',
            )
        }),
        ('Status', {
            'fields': (
                'is_active',
                'created_at',
                'updated_at',
            )
        }),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('project', 'parent_container')


# ContainerType admin removed - table tbl_container_type doesn't exist in database
# If needed, create the table first with a migration before registering admin
