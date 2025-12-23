"""
Developer Operations models for developer fees and management overhead.

Maps to landscape.developer_fees and landscape.management_overhead tables.
"""

from django.db import models


class DeveloperFee(models.Model):
    """
    Developer fee items linked to a project.

    Maps to landscape.developer_fees table.

    Fee types include:
    - Development Fee
    - Construction Management Fee
    - Acquisition Fee
    - Disposition Fee
    - Asset Management Fee
    """

    FEE_TYPE_CHOICES = [
        ('development', 'Development Fee'),
        ('construction_mgmt', 'Construction Management Fee'),
        ('acquisition', 'Acquisition Fee'),
        ('disposition', 'Disposition Fee'),
        ('asset_mgmt', 'Asset Management Fee'),
        ('other', 'Other Fee'),
    ]

    BASIS_TYPE_CHOICES = [
        ('percent_total_cost', '% of Total Project Cost'),
        ('percent_hard_cost', '% of Hard Costs'),
        ('percent_soft_cost', '% of Soft Costs'),
        ('flat_fee', 'Flat Fee'),
        ('per_unit', 'Per Unit'),
        ('per_sf', 'Per Square Foot'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('paid', 'Paid'),
        ('partial', 'Partially Paid'),
    ]

    id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='developer_fees'
    )
    fee_type = models.CharField(
        max_length=50,
        choices=FEE_TYPE_CHOICES,
        help_text='Type of developer fee'
    )
    fee_description = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text='Description of the fee'
    )
    basis_type = models.CharField(
        max_length=50,
        choices=BASIS_TYPE_CHOICES,
        help_text='How the fee is calculated'
    )
    basis_value = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        help_text='Percentage or rate value'
    )
    calculated_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Calculated fee amount'
    )
    payment_timing = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text='When the fee is paid (e.g., "50% at closing, 50% at CO")'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text='Current status of the fee'
    )
    notes = models.TextField(
        null=True,
        blank=True,
        help_text='Additional notes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."developer_fees'
        ordering = ['fee_type', 'created_at']
        verbose_name = 'Developer Fee'
        verbose_name_plural = 'Developer Fees'

    def __str__(self):
        return f"{self.get_fee_type_display()} - {self.project_id}"


class ManagementOverhead(models.Model):
    """
    Management overhead items linked to a project.

    Maps to landscape.management_overhead table.

    Overhead includes:
    - Project management salaries
    - Office expenses
    - Insurance
    - Accounting/legal
    - Marketing
    """

    FREQUENCY_CHOICES = [
        ('one_time', 'One-Time'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
    ]

    CONTAINER_LEVEL_CHOICES = [
        ('project', 'Project'),
        ('phase', 'Phase'),
        ('subdivision', 'Subdivision'),
        ('building', 'Building'),
    ]

    id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='management_overhead'
    )
    item_name = models.CharField(
        max_length=255,
        help_text='Name of the overhead item'
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text='Amount for the overhead item'
    )
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default='monthly',
        help_text='How often the cost occurs'
    )
    start_period = models.IntegerField(
        default=1,
        help_text='Period when the cost starts'
    )
    duration_periods = models.IntegerField(
        default=1,
        help_text='Number of periods the cost applies'
    )
    container_level = models.CharField(
        max_length=20,
        choices=CONTAINER_LEVEL_CHOICES,
        null=True,
        blank=True,
        help_text='Level at which overhead is applied'
    )
    container_id = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='ID of the container if applicable'
    )
    notes = models.TextField(
        null=True,
        blank=True,
        help_text='Additional notes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."management_overhead'
        ordering = ['item_name', 'created_at']
        verbose_name = 'Management Overhead'
        verbose_name_plural = 'Management Overhead Items'

    def __str__(self):
        return f"{self.item_name} - {self.project_id}"
