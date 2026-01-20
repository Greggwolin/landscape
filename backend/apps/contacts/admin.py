"""
Django admin configuration for contacts app.
"""

from django.contrib import admin
from .models import Cabinet, Contact, ContactRole, ContactRelationship, ProjectContact


@admin.register(Cabinet)
class CabinetAdmin(admin.ModelAdmin):
    list_display = ['cabinet_id', 'cabinet_name', 'owner_user_id', 'cabinet_type', 'is_active', 'created_at']
    list_filter = ['cabinet_type', 'is_active']
    search_fields = ['cabinet_name', 'owner_user_id']
    readonly_fields = ['cabinet_id', 'created_at', 'updated_at']


@admin.register(ContactRole)
class ContactRoleAdmin(admin.ModelAdmin):
    list_display = ['role_id', 'role_code', 'role_label', 'role_category', 'is_system', 'is_active', 'display_order']
    list_filter = ['role_category', 'is_system', 'is_active']
    search_fields = ['role_code', 'role_label']
    readonly_fields = ['role_id', 'created_at', 'updated_at']
    ordering = ['display_order', 'role_label']


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['contact_id', 'name', 'contact_type', 'company_name', 'email', 'is_active']
    list_filter = ['contact_type', 'is_active', 'cabinet']
    search_fields = ['name', 'company_name', 'email']
    readonly_fields = ['contact_id', 'created_at', 'updated_at']
    raw_id_fields = ['cabinet']


@admin.register(ContactRelationship)
class ContactRelationshipAdmin(admin.ModelAdmin):
    list_display = ['relationship_id', 'contact', 'relationship_type', 'related_to', 'role_title', 'is_current']
    list_filter = ['relationship_type']
    search_fields = ['contact__name', 'related_to__name', 'role_title']
    readonly_fields = ['relationship_id', 'created_at', 'updated_at']
    raw_id_fields = ['cabinet', 'contact', 'related_to']

    def is_current(self, obj):
        return obj.end_date is None
    is_current.boolean = True


@admin.register(ProjectContact)
class ProjectContactAdmin(admin.ModelAdmin):
    list_display = ['project_contact_id', 'project', 'contact', 'role', 'is_primary', 'is_billing_contact']
    list_filter = ['is_primary', 'is_billing_contact', 'role__role_category']
    search_fields = ['project__project_name', 'contact__name']
    readonly_fields = ['project_contact_id', 'created_at', 'updated_at']
    raw_id_fields = ['project', 'contact', 'role']
