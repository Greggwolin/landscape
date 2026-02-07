"""
Container models for hierarchical project organization.

Maps to landscape.tbl_container table.
"""

from django.db import models


class Container(models.Model):
    """
    Hierarchical container for organizing project structure.

    Supports 3-level hierarchy:
    - Level 1: Top-level divisions (e.g., Residential, Commercial)
    - Level 2: Sub-divisions (e.g., For-Sale, For-Rent)
    - Level 3: Detailed units (e.g., Building A, Building B)

    Each container can have:
    - Direct inventory items (units, acres)
    - Child containers
    - Aggregated data from all descendants
    """

    container_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='containers'
    )
    parent_container = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        db_column='parent_container_id',
        null=True,
        blank=True,
        related_name='children'
    )
    container_level = models.SmallIntegerField(
        choices=[
            (1, 'Level 1 - Division'),
            (2, 'Level 2 - Subdivision'),
            (3, 'Level 3 - Unit'),
        ],
        help_text='Hierarchy level (1-3)'
    )
    container_code = models.CharField(
        max_length=50,
        help_text='Unique code within project (e.g., RES-FS-A)'
    )
    display_name = models.CharField(
        max_length=200,
        help_text='User-friendly display name'
    )
    sort_order = models.IntegerField(
        null=True,
        blank=True,
        help_text='Display order within parent'
    )
    attributes = models.JSONField(
        default=dict,
        blank=True,
        help_text='Flexible attributes (units, acres, status, etc.)'
    )
    is_active = models.BooleanField(default=True)

    # ── Lotbank per-product fields (division level) ─────────────────
    # All _pct fields stored as DECIMALS (0.15 = 15%), NOT percentages.
    option_deposit_pct = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True,
        help_text='Option deposit as decimal (0.15 = 15%).'
    )
    option_deposit_cap_pct = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True,
        help_text='Deposit cap ratio as decimal (0.20 = 20%).'
    )
    retail_lot_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Per-lot option/takedown price ($).'
    )
    premium_pct = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True,
        help_text='Phase premium as decimal (0.15 = 15%).'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_container'
        ordering = ['container_level', 'sort_order', 'container_id']
        constraints = [
            models.UniqueConstraint(
                fields=['project', 'container_code'],
                name='uq_container_code'
            )
        ]

    def __str__(self):
        return f"{self.container_code} - {self.display_name}"

    def get_all_children(self):
        """Recursively get all descendant containers."""
        children = list(self.children.all())
        for child in list(children):
            children.extend(child.get_all_children())
        return children

    def get_aggregated_units(self):
        """Get total units from direct inventory and all children."""
        # Direct units from inventory items
        from apps.landuse.models import InventoryItem
        direct_units = InventoryItem.objects.filter(
            container=self,
            is_active=True
        ).aggregate(
            total=models.Sum('data_values__units_total')
        )['total'] or 0

        # Aggregated units from children
        child_units = sum(
            child.get_aggregated_units() for child in self.children.all()
        )

        return direct_units + child_units

    def get_aggregated_acres(self):
        """Get total acres from direct inventory and all children."""
        # Direct acres from inventory items
        from apps.landuse.models import InventoryItem
        direct_acres = InventoryItem.objects.filter(
            container=self,
            is_active=True
        ).aggregate(
            total=models.Sum('data_values__acres_gross')
        )['total'] or 0

        # Aggregated acres from children
        child_acres = sum(
            child.get_aggregated_acres() for child in self.children.all()
        )

        return direct_acres + child_acres


class ContainerType(models.Model):
    """
    Lookup table for container types.

    Maps to landscape.tbl_container_type table.
    """

    container_type_id = models.AutoField(primary_key=True)
    type_code = models.CharField(max_length=50, unique=True)
    type_name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'tbl_container_type'
        ordering = ['type_name']

    def __str__(self):
        return self.type_name
