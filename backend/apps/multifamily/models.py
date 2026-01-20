"""
Django models for Multifamily application.

Maps to existing database tables in landscape schema:
- tbl_multifamily_unit
- tbl_multifamily_unit_type
- tbl_multifamily_lease
- tbl_multifamily_turn
"""

from django.db import models
from apps.projects.models import Project


class MultifamilyUnitType(models.Model):
    """
    Model for multifamily unit types (e.g., 1BR, 2BR, 3BR).
    Maps to landscape.tbl_multifamily_unit_type
    """

    unit_type_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='unit_types'
    )
    unit_type_code = models.CharField(max_length=50)
    bedrooms = models.DecimalField(max_digits=3, decimal_places=1)
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1)
    avg_square_feet = models.IntegerField()
    current_market_rent = models.DecimalField(max_digits=10, decimal_places=2)
    total_units = models.IntegerField()
    notes = models.TextField(null=True, blank=True)
    other_features = models.TextField(null=True, blank=True)
    floorplan_doc_id = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_multifamily_unit_type'
        unique_together = [['project', 'unit_type_code']]
        ordering = ['project', 'unit_type_code']

    def __str__(self):
        return f"{self.unit_type_code} ({self.bedrooms}BR/{self.bathrooms}BA)"


class MultifamilyUnit(models.Model):
    """
    Model for multifamily units.
    Maps to landscape.tbl_multifamily_unit
    """

    RENOVATION_STATUS_CHOICES = [
        ('ORIGINAL', 'Original'),
        ('RENOVATED', 'Renovated'),
        ('IN_PROGRESS', 'In Progress'),
        ('PLANNED', 'Planned'),
    ]

    OCCUPANCY_STATUS_CHOICES = [
        ('Occupied', 'Occupied'),
        ('Vacant', 'Vacant'),
        ('Notice', 'Notice'),
        ('Down', 'Down'),
    ]

    unit_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='multifamily_units'
    )
    unit_number = models.CharField(max_length=50)
    building_name = models.CharField(max_length=100, null=True, blank=True)
    unit_type = models.CharField(max_length=50)
    bedrooms = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    square_feet = models.IntegerField()
    current_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    market_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    occupancy_status = models.CharField(
        max_length=20,
        choices=OCCUPANCY_STATUS_CHOICES,
        null=True,
        blank=True
    )
    renovation_status = models.CharField(
        max_length=50,
        choices=RENOVATION_STATUS_CHOICES,
        default='ORIGINAL'
    )
    renovation_date = models.DateField(null=True, blank=True)
    renovation_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    other_features = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_multifamily_unit'
        unique_together = [['project', 'unit_number']]
        ordering = ['building_name', 'unit_number']

    def __str__(self):
        if self.building_name:
            return f"{self.building_name} - {self.unit_number}"
        return f"Unit {self.unit_number}"


class MultifamilyLease(models.Model):
    """
    Model for multifamily leases.
    Maps to landscape.tbl_multifamily_lease
    """

    LEASE_STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('EXPIRED', 'Expired'),
        ('NOTICE_GIVEN', 'Notice Given'),
        ('MONTH_TO_MONTH', 'Month to Month'),
        ('CANCELLED', 'Cancelled'),
    ]

    lease_id = models.AutoField(primary_key=True)
    unit = models.ForeignKey(
        MultifamilyUnit,
        on_delete=models.CASCADE,
        db_column='unit_id',
        related_name='leases'
    )
    resident_name = models.CharField(max_length=200, null=True, blank=True)
    lease_start_date = models.DateField()
    lease_end_date = models.DateField()
    lease_term_months = models.IntegerField()
    base_rent_monthly = models.DecimalField(max_digits=10, decimal_places=2)
    effective_rent_monthly = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    months_free_rent = models.IntegerField(default=0, null=True, blank=True)
    concession_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    pet_rent_monthly = models.DecimalField(max_digits=8, decimal_places=2, default=0, null=True, blank=True)
    parking_rent_monthly = models.DecimalField(max_digits=8, decimal_places=2, default=0, null=True, blank=True)
    lease_status = models.CharField(
        max_length=50,
        choices=LEASE_STATUS_CHOICES,
        default='ACTIVE'
    )
    notice_date = models.DateField(null=True, blank=True)
    notice_to_vacate_days = models.IntegerField(null=True, blank=True)
    is_renewal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_multifamily_lease'
        ordering = ['-lease_start_date']

    def __str__(self):
        return f"Lease {self.lease_id} - {self.resident_name or 'Unknown'}"


class MultifamilyTurn(models.Model):
    """
    Model for multifamily unit turns (vacancy tracking).
    Maps to landscape.tbl_multifamily_turn
    """

    TURN_STATUS_CHOICES = [
        ('VACANT', 'Vacant'),
        ('MAKE_READY', 'Make Ready'),
        ('READY', 'Ready'),
        ('LEASED', 'Leased'),
    ]

    turn_id = models.AutoField(primary_key=True)
    unit = models.ForeignKey(
        MultifamilyUnit,
        on_delete=models.CASCADE,
        db_column='unit_id',
        related_name='turns'
    )
    move_out_date = models.DateField()
    make_ready_complete_date = models.DateField(null=True, blank=True)
    next_move_in_date = models.DateField(null=True, blank=True)
    total_vacant_days = models.IntegerField(null=True, blank=True)
    cleaning_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    painting_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    carpet_flooring_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    appliance_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    other_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    # total_make_ready_cost is a generated column in the database
    total_make_ready_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    turn_status = models.CharField(
        max_length=50,
        choices=TURN_STATUS_CHOICES,
        default='VACANT'
    )
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_multifamily_turn'
        ordering = ['-move_out_date']

    def __str__(self):
        return f"Turn {self.turn_id} - Unit {self.unit.unit_number}"


class ValueAddAssumptions(models.Model):
    """
    Model for value-add underwriting assumptions.
    Maps to landscape.tbl_value_add_assumptions
    """

    value_add_id = models.AutoField(primary_key=True)
    project = models.OneToOneField(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='value_add_assumptions'
    )
    is_enabled = models.BooleanField(default=False)
    reno_cost_per_sf = models.DecimalField(max_digits=8, decimal_places=2, default=8.00)
    relocation_incentive = models.DecimalField(max_digits=10, decimal_places=2, default=1500.00)
    renovate_all = models.BooleanField(default=True)
    units_to_renovate = models.IntegerField(null=True, blank=True)
    reno_pace_per_month = models.IntegerField(default=4)
    reno_start_month = models.IntegerField(default=3)
    rent_premium_pct = models.DecimalField(max_digits=5, decimal_places=4, default=0.15)
    relet_lag_months = models.IntegerField(default=2)
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'tbl_value_add_assumptions'
        ordering = ['-updated_at']

    def __str__(self):
        return f"Value-Add Assumptions for Project {self.project_id}"
