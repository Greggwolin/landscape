"""
Django models for Commercial Real Estate (CRE) application.

Maps to existing database tables in landscape schema:
- tbl_cre_property
- tbl_cre_space
- tbl_cre_tenant
- tbl_cre_lease
"""

from django.db import models
from apps.projects.models import Project


class CREProperty(models.Model):
    """
    Model for commercial real estate properties.
    Maps to landscape.tbl_cre_property
    """

    cre_property_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='cre_properties',
        null=True,
        blank=True
    )
    parcel_id = models.IntegerField(null=True, blank=True)
    property_name = models.CharField(max_length=200, null=True, blank=True)
    property_type = models.CharField(max_length=50, null=True, blank=True)
    property_subtype = models.CharField(max_length=50, null=True, blank=True)
    total_building_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rentable_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    usable_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    common_area_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    load_factor = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    year_built = models.IntegerField(null=True, blank=True)
    year_renovated = models.IntegerField(null=True, blank=True)
    number_of_floors = models.IntegerField(null=True, blank=True)
    number_of_units = models.IntegerField(null=True, blank=True)
    parking_spaces = models.IntegerField(null=True, blank=True)
    parking_ratio = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    property_status = models.CharField(max_length=50, null=True, blank=True)
    stabilization_date = models.DateField(null=True, blank=True)
    stabilized_occupancy_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    acquisition_date = models.DateField(null=True, blank=True)
    acquisition_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    current_assessed_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_cre_property'
        ordering = ['property_name']

    def __str__(self):
        return self.property_name or f"Property {self.cre_property_id}"


class CRETenant(models.Model):
    """
    Model for commercial tenants.
    Maps to landscape.tbl_cre_tenant
    """

    tenant_id = models.AutoField(primary_key=True)
    tenant_name = models.CharField(max_length=200)
    tenant_legal_name = models.CharField(max_length=200, null=True, blank=True)
    dba_name = models.CharField(max_length=200, null=True, blank=True)
    industry = models.CharField(max_length=100, null=True, blank=True)
    naics_code = models.CharField(max_length=10, null=True, blank=True)
    business_type = models.CharField(max_length=50, null=True, blank=True)
    credit_rating = models.CharField(max_length=20, null=True, blank=True)
    creditworthiness = models.CharField(max_length=50, null=True, blank=True)
    dun_bradstreet_number = models.CharField(max_length=20, null=True, blank=True)
    annual_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    years_in_business = models.IntegerField(null=True, blank=True)
    contact_name = models.CharField(max_length=100, null=True, blank=True)
    contact_title = models.CharField(max_length=100, null=True, blank=True)
    email = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    guarantor_name = models.CharField(max_length=200, null=True, blank=True)
    guarantor_type = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_cre_tenant'
        ordering = ['tenant_name']

    def __str__(self):
        return self.tenant_name


class CRESpace(models.Model):
    """
    Model for rentable commercial spaces.
    Maps to landscape.tbl_cre_space
    """

    space_id = models.AutoField(primary_key=True)
    cre_property = models.ForeignKey(
        CREProperty,
        on_delete=models.CASCADE,
        db_column='cre_property_id',
        related_name='spaces',
        null=True,
        blank=True
    )
    space_number = models.CharField(max_length=50, null=True, blank=True)
    floor_number = models.IntegerField(null=True, blank=True)
    usable_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rentable_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    space_type = models.CharField(max_length=50, null=True, blank=True)
    frontage_ft = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    ceiling_height_ft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    number_of_offices = models.IntegerField(null=True, blank=True)
    number_of_conference_rooms = models.IntegerField(null=True, blank=True)
    has_kitchenette = models.BooleanField(default=False)
    has_private_restroom = models.BooleanField(default=False)
    space_status = models.CharField(max_length=50, null=True, blank=True)
    available_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_cre_space'
        ordering = ['cre_property', 'space_number']

    def __str__(self):
        return f"Space {self.space_number or self.space_id}"


class CRELease(models.Model):
    """
    Model for commercial leases.
    Maps to landscape.tbl_cre_lease
    """

    lease_id = models.AutoField(primary_key=True)
    cre_property = models.ForeignKey(
        CREProperty,
        on_delete=models.CASCADE,
        db_column='cre_property_id',
        related_name='leases',
        null=True,
        blank=True
    )
    space = models.ForeignKey(
        CRESpace,
        on_delete=models.CASCADE,
        db_column='space_id',
        related_name='leases',
        null=True,
        blank=True
    )
    tenant = models.ForeignKey(
        CRETenant,
        on_delete=models.CASCADE,
        db_column='tenant_id',
        related_name='leases',
        null=True,
        blank=True
    )
    lease_number = models.CharField(max_length=50, null=True, blank=True)
    lease_type = models.CharField(max_length=50, null=True, blank=True)
    lease_status = models.CharField(max_length=50, null=True, blank=True)
    lease_execution_date = models.DateField(null=True, blank=True)
    lease_commencement_date = models.DateField(null=True, blank=True)
    rent_commencement_date = models.DateField(null=True, blank=True)
    lease_expiration_date = models.DateField(null=True, blank=True)
    lease_term_months = models.IntegerField(null=True, blank=True)
    leased_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    number_of_options = models.IntegerField(null=True, blank=True)
    option_term_months = models.IntegerField(null=True, blank=True)
    option_notice_months = models.IntegerField(null=True, blank=True)
    early_termination_allowed = models.BooleanField(default=False)
    termination_notice_months = models.IntegerField(null=True, blank=True)
    termination_penalty_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    security_deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    security_deposit_months = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    expansion_rights = models.BooleanField(default=False)
    right_of_first_refusal = models.BooleanField(default=False)
    exclusive_use_clause = models.TextField(null=True, blank=True)
    co_tenancy_clause = models.TextField(null=True, blank=True)
    radius_restriction = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_cre_lease'
        ordering = ['-lease_commencement_date']

    def __str__(self):
        return f"Lease {self.lease_number or self.lease_id}"
