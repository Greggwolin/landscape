"""
Models for the contacts app.

IMPORTANT: All models use managed=False to prevent Django from modifying the existing schema.
Tables are mapped to the landscape schema in Neon PostgreSQL.
"""

from django.db import models


class Cabinet(models.Model):
    """
    Security/tenancy boundary containing all of a user's or enterprise's data.

    Analogous to a NetDocuments cabinet or a filing cabinet containing multiple drawers.
    All projects, contacts, and documents belong to a cabinet.
    """
    cabinet_id = models.BigAutoField(primary_key=True)
    cabinet_name = models.CharField(max_length=200)
    owner_user_id = models.TextField()  # Clerk user ID or similar auth provider ID
    cabinet_type = models.CharField(
        max_length=50,
        default='standard',
        choices=[
            ('standard', 'Standard'),
            ('enterprise', 'Enterprise'),
            ('personal', 'Personal'),
        ]
    )
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'tbl_cabinet'
        managed = False
        ordering = ['cabinet_name']
        verbose_name = 'Cabinet'
        verbose_name_plural = 'Cabinets'

    def __str__(self):
        return self.cabinet_name


class ContactRole(models.Model):
    """
    Configurable contact roles.

    System roles (cabinet_id=NULL) are defaults available to all cabinets.
    Cabinet-specific roles allow customization per tenant.
    """
    ROLE_CATEGORIES = [
        ('Principal', 'Principal'),
        ('Financing', 'Financing'),
        ('Advisor', 'Advisor'),
        ('Contact', 'Contact'),
        ('Other', 'Other'),
    ]

    role_id = models.AutoField(primary_key=True)
    cabinet = models.ForeignKey(
        Cabinet,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column='cabinet_id',
        related_name='custom_roles',
        help_text='NULL for system roles, cabinet_id for custom roles'
    )
    role_code = models.CharField(max_length=50)
    role_label = models.CharField(max_length=100)
    role_category = models.CharField(max_length=50, choices=ROLE_CATEGORIES)
    typical_contact_types = models.JSONField(
        default=list,
        blank=True,
        help_text='JSON array of contact types this role typically applies to'
    )
    description = models.TextField(blank=True, null=True)
    display_order = models.IntegerField(default=100)
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_contact_role'
        managed = False
        ordering = ['display_order', 'role_label']
        verbose_name = 'Contact Role'
        verbose_name_plural = 'Contact Roles'

    def __str__(self):
        return self.role_label


class Contact(models.Model):
    """
    Cabinet-level contact database.

    Contains people and entities that can be associated with multiple projects.
    Contacts are scoped to a cabinet for multi-tenant isolation.
    """
    CONTACT_TYPES = [
        ('Person', 'Person'),
        ('Company', 'Company'),
        ('Entity', 'Entity'),
        ('Fund', 'Fund'),
        ('Government', 'Government'),
        ('Other', 'Other'),
    ]

    contact_id = models.BigAutoField(primary_key=True)
    cabinet = models.ForeignKey(
        Cabinet,
        on_delete=models.CASCADE,
        db_column='cabinet_id',
        related_name='contacts'
    )
    contact_type = models.CharField(max_length=50, choices=CONTACT_TYPES)

    # Core fields
    name = models.CharField(max_length=200)
    display_name = models.CharField(max_length=200, blank=True, null=True)

    # Person-specific fields
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    title = models.CharField(max_length=100, blank=True, null=True)

    # Company/Entity fields
    company_name = models.CharField(max_length=200, blank=True, null=True)
    entity_type = models.CharField(max_length=100, blank=True, null=True)

    # Contact info
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    phone_mobile = models.CharField(max_length=50, blank=True, null=True)

    # Address
    address_line1 = models.CharField(max_length=255, blank=True, null=True)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=50, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, default='United States')

    # Metadata
    notes = models.TextField(blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'tbl_contact'
        managed = False
        ordering = ['name']
        verbose_name = 'Contact'
        verbose_name_plural = 'Contacts'

    def __str__(self):
        if self.company_name and self.contact_type == 'Person':
            return f"{self.name} @ {self.company_name}"
        return self.name

    @property
    def full_address(self):
        """Returns formatted full address."""
        parts = [
            self.address_line1,
            self.address_line2,
            f"{self.city}, {self.state} {self.postal_code}" if self.city else None,
            self.country if self.country != 'United States' else None
        ]
        return '\n'.join(p for p in parts if p)


class ContactRelationship(models.Model):
    """
    Defines relationships between contacts.

    This is a graph structure supporting relationships like:
    - Person works for Company (Employee)
    - Entity is subsidiary of Company (Subsidiary)
    - Person is principal of Entity (Principal)
    """
    RELATIONSHIP_TYPES = [
        ('Employee', 'Employee'),
        ('Principal', 'Principal'),
        ('Subsidiary', 'Subsidiary'),
        ('Affiliate', 'Affiliate'),
        ('Member', 'Member'),
        ('Counsel', 'Counsel'),
        ('Advisor', 'Advisor'),
        ('Spouse', 'Spouse'),
        ('Other', 'Other'),
    ]

    relationship_id = models.BigAutoField(primary_key=True)
    cabinet = models.ForeignKey(
        Cabinet,
        on_delete=models.CASCADE,
        db_column='cabinet_id',
        related_name='contact_relationships'
    )
    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        db_column='contact_id',
        related_name='relationships_from'
    )
    related_to = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        db_column='related_to_id',
        related_name='relationships_to'
    )
    relationship_type = models.CharField(max_length=50, choices=RELATIONSHIP_TYPES)
    role_title = models.CharField(max_length=200, blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_contact_relationship'
        managed = False
        ordering = ['-created_at']
        verbose_name = 'Contact Relationship'
        verbose_name_plural = 'Contact Relationships'
        constraints = [
            models.UniqueConstraint(
                fields=['contact', 'related_to', 'relationship_type'],
                name='uq_contact_relationship'
            )
        ]

    def __str__(self):
        return f"{self.contact} → {self.relationship_type} → {self.related_to}"

    @property
    def is_current(self):
        """Returns True if relationship is current (no end_date)."""
        return self.end_date is None


class ProjectContact(models.Model):
    """
    Junction table linking contacts to projects with role assignments.

    Enables a contact to be associated with multiple projects with different roles.
    """
    project_contact_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='project_contacts'
    )
    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        db_column='contact_id',
        related_name='project_assignments'
    )
    role = models.ForeignKey(
        ContactRole,
        on_delete=models.PROTECT,
        db_column='role_id',
        related_name='project_contacts'
    )
    is_primary = models.BooleanField(
        default=False,
        help_text='Primary client/entity for dashboard grouping'
    )
    is_billing_contact = models.BooleanField(
        default=False,
        help_text='Receives invoices'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_project_contact'
        managed = False
        ordering = ['role__display_order', 'contact__name']
        verbose_name = 'Project Contact'
        verbose_name_plural = 'Project Contacts'
        constraints = [
            models.UniqueConstraint(
                fields=['project', 'contact', 'role'],
                name='uq_project_contact_role'
            )
        ]

    def __str__(self):
        return f"{self.contact} ({self.role}) on {self.project}"
