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
    code = models.CharField(max_length=20, null=True, blank=True)
    name = models.CharField(max_length=100)
    active = models.BooleanField(default=True, db_column='active')
    notes = models.TextField(null=True, blank=True)

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
    family = models.ForeignKey(
        'landuse.Family',
        on_delete=models.CASCADE,
        db_column='family_id',
        related_name='types',
        null=True,
        blank=True
    )
    code = models.CharField(max_length=20, null=True, blank=True)
    name = models.CharField(max_length=100)
    ord = models.IntegerField(null=True, blank=True)
    active = models.BooleanField(default=True, db_column='active')
    notes = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'lu_type'
        ordering = ['ord', 'name']

    def __str__(self):
        return self.name


class LotProduct(models.Model):
    """
    Global catalog of lot products with dimensional standards.

    Maps to landscape.res_lot_product table.
    """

    product_id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=100, unique=True)
    lot_w_ft = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    lot_d_ft = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    lot_area_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    type = models.ForeignKey(
        'landuse.Type',
        on_delete=models.SET_NULL,
        db_column='type_id',
        null=True,
        blank=True,
        related_name='lot_products'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'res_lot_product'
        ordering = ['code']

    def __str__(self):
        return self.code


class ResSpec(models.Model):
    """Residential development specifications per type."""

    res_spec_id = models.AutoField(primary_key=True)
    type = models.ForeignKey(
        'landuse.Type', on_delete=models.CASCADE,
        db_column='type_id', related_name='res_specs'
    )
    dua_min = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    dua_max = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    lot_w_min_ft = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    lot_d_min_ft = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    lot_area_min_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    sb_front_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sb_side_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sb_corner_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sb_rear_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    hgt_max_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    cov_max_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    os_min_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    pk_per_unit = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    eff_date = models.DateField(null=True, blank=True)
    doc_id = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'lu_res_spec'

    def __str__(self):
        return f"ResSpec {self.res_spec_id} for type {self.type_id}"


class ComSpec(models.Model):
    """Commercial development specifications per type."""

    com_spec_id = models.AutoField(primary_key=True)
    type = models.ForeignKey(
        'landuse.Type', on_delete=models.CASCADE,
        db_column='type_id', related_name='com_specs'
    )
    far_min = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    far_max = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    cov_max_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    pk_per_ksf = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    hgt_max_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sb_front_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sb_side_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sb_corner_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sb_rear_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    os_min_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    eff_date = models.DateField(null=True, blank=True)
    doc_id = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'lu_com_spec'

    def __str__(self):
        return f"ComSpec {self.com_spec_id} for type {self.type_id}"


class DensityClassification(models.Model):
    """Density classification reference data."""

    density_id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=30)
    name = models.CharField(max_length=100)
    family_category = models.CharField(max_length=50, null=True, blank=True)
    intensity_min = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    intensity_max = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    intensity_metric = models.CharField(max_length=30, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    jurisdiction_notes = models.TextField(null=True, blank=True)
    active = models.BooleanField(default=True)
    sort_order = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'density_classification'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.code} - {self.name}"


class ProjectLandUse(models.Model):
    """Project-scoped land use type selections."""

    project_land_use_id = models.AutoField(primary_key=True)
    project_id = models.IntegerField()
    family = models.ForeignKey(
        'landuse.Family', on_delete=models.CASCADE,
        db_column='family_id', related_name='project_land_uses'
    )
    type = models.ForeignKey(
        'landuse.Type', on_delete=models.CASCADE,
        db_column='type_id', related_name='project_land_uses'
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'project_land_use'
        unique_together = [('project_id', 'type')]

    def __str__(self):
        return f"ProjectLandUse {self.project_land_use_id}: project={self.project_id}, type={self.type_id}"


class ProjectLandUseProduct(models.Model):
    """Product selections within a project land use type."""

    project_land_use_product_id = models.AutoField(primary_key=True)
    project_land_use = models.ForeignKey(
        'landuse.ProjectLandUse', on_delete=models.CASCADE,
        db_column='project_land_use_id', related_name='product_selections'
    )
    product = models.ForeignKey(
        'landuse.LotProduct', on_delete=models.CASCADE,
        db_column='product_id', related_name='project_selections'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'project_land_use_product'
        unique_together = [('project_land_use', 'product')]

    def __str__(self):
        return f"PLU Product {self.project_land_use_product_id}"
