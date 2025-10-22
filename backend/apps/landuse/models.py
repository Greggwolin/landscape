"""
Land use and inventory models.

Maps to landscape schema tables.
"""

from django.db import models


class InventoryItem(models.Model):
    """
    Inventory items attached to containers.

    Maps to landscape.tbl_inventory_item table.
    """

    item_id = models.AutoField(primary_key=True)
    container = models.ForeignKey(
        'containers.Container',
        on_delete=models.CASCADE,
        db_column='container_id',
        related_name='inventory_items'
    )
    family = models.ForeignKey(
        'landuse.Family',
        on_delete=models.SET_NULL,
        db_column='family_id',
        null=True,
        blank=True,
        related_name='inventory_items'
    )
    type = models.ForeignKey(
        'landuse.Type',
        on_delete=models.SET_NULL,
        db_column='type_id',
        null=True,
        blank=True,
        related_name='inventory_items'
    )
    data_values = models.JSONField(
        default=dict,
        help_text='Inventory data (units_total, acres_gross, etc.)'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_inventory_item'

    def __str__(self):
        return f"Item {self.item_id} - Container {self.container_id}"


class Family(models.Model):
    """
    Family lookup table.

    Maps to landscape.lu_family table.
    """

    family_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'lu_family'
        verbose_name_plural = 'families'

    def __str__(self):
        return self.name


class Type(models.Model):
    """
    Type lookup table.

    Maps to landscape.lu_type table.
    """

    type_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'lu_type'

    def __str__(self):
        return self.name
