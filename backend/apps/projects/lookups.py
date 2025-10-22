"""
Lookup table models for Projects app.

These models map to the lu_* (lookup) tables in the landscape schema.
All use managed=False to prevent Django from modifying the schema.

Standard lookup table pattern:
- Primary key: {table}_id (AutoField)
- code: Short code/abbreviation (e.g., 'RES', 'COM')
- name: Human-readable name (e.g., 'Residential', 'Commercial')
- ord: Sort order
- active: Boolean flag for active/inactive
"""

from django.db import models


class LookupFamily(models.Model):
    """
    Lookup: Family categories (Residential, Commercial, Industrial, etc.)
    Maps to: lu_family
    """
    family_id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    ord = models.IntegerField(null=True, blank=True)
    active = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'lu_family'
        managed = False
        ordering = ['ord', 'name']
        verbose_name = 'Family'
        verbose_name_plural = 'Families'

    def __str__(self):
        return self.name


class LookupType(models.Model):
    """
    Lookup: Property types (BTR, Condo, Golf Course, etc.)
    Maps to: lu_type
    """
    type_id = models.AutoField(primary_key=True)
    family = models.ForeignKey(
        LookupFamily,
        on_delete=models.DO_NOTHING,
        db_column='family_id',
        null=True,
        blank=True
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    ord = models.IntegerField(null=True, blank=True)
    active = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'lu_type'
        managed = False
        ordering = ['ord', 'name']
        verbose_name = 'Property Type'
        verbose_name_plural = 'Property Types'

    def __str__(self):
        return f"{self.code} - {self.name}"


class LookupSubtype(models.Model):
    """
    Lookup: Property subtypes (Apartments, Condominiums, etc.)
    Maps to: lu_subtype
    """
    subtype_id = models.AutoField(primary_key=True)
    family = models.ForeignKey(
        LookupFamily,
        on_delete=models.DO_NOTHING,
        db_column='family_id',
        null=True,
        blank=True
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    ord = models.IntegerField(null=True, blank=True)
    active = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lu_subtype'
        managed = False
        ordering = ['ord', 'name']
        verbose_name = 'Property Subtype'
        verbose_name_plural = 'Property Subtypes'

    def __str__(self):
        return f"{self.code} - {self.name}"


class PropertyTypeConfig(models.Model):
    """
    Application-level property type configuration
    Maps to: tbl_property_type_config

    Defines the main property types used throughout the application:
    - mpc (Master Planned Community)
    - multifamily
    - office
    - retail
    - industrial
    - hotel
    """
    config_id = models.AutoField(primary_key=True)
    property_type = models.CharField(max_length=50, unique=True)
    tab_label = models.CharField(max_length=50)
    description = models.TextField(null=True, blank=True)
    default_columns = models.JSONField()
    import_suggestions = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_property_type_config'
        managed = False
        ordering = ['property_type']
        verbose_name = 'Property Type Config'
        verbose_name_plural = 'Property Type Configs'

    def __str__(self):
        return self.property_type.upper()
