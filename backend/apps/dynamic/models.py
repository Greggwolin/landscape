"""
Dynamic Columns Models

Implements EAV (Entity-Attribute-Value) pattern for extensible columns.
Allows Landscaper to propose new columns from unrecognized data,
users to accept/reject proposed columns, and dynamic columns to appear
in grids like the rent roll.
"""

from django.db import models
from django.conf import settings


class DynamicColumnDefinition(models.Model):
    """Defines a dynamic column for a project/table."""

    class DataType(models.TextChoices):
        TEXT = 'text', 'Text'
        NUMBER = 'number', 'Number'
        CURRENCY = 'currency', 'Currency'
        PERCENT = 'percent', 'Percentage'
        BOOLEAN = 'boolean', 'Yes/No'
        DATE = 'date', 'Date'

    class Source(models.TextChoices):
        USER = 'user', 'User Created'
        LANDSCAPER = 'landscaper', 'Landscaper Proposed'
        EXTRACTION = 'extraction', 'Auto-Extracted'

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='dynamic_columns'
    )
    table_name = models.CharField(
        max_length=100,
        help_text="Target table: 'multifamily_unit', 'land_parcel', etc."
    )
    column_key = models.CharField(
        max_length=100,
        help_text="Internal key, e.g., 'delinquent_rent', 'section_8'"
    )
    display_label = models.CharField(
        max_length=100,
        help_text="User-facing label, e.g., 'Delinquent Rent', 'Section 8'"
    )
    data_type = models.CharField(
        max_length=20,
        choices=DataType.choices,
        default=DataType.TEXT
    )
    format_pattern = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Format pattern, e.g., '$#,##0.00' for currency"
    )
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.USER
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_dynamic_columns'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    # For proposed columns (not yet accepted by user)
    is_proposed = models.BooleanField(default=False)
    proposed_from_document = models.ForeignKey(
        'documents.Document',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='proposed_columns'
    )

    # Display order
    display_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'landscape"."tbl_dynamic_column_definition'
        unique_together = [['project', 'table_name', 'column_key']]
        ordering = ['display_order', 'created_at']
        verbose_name = 'Dynamic Column Definition'
        verbose_name_plural = 'Dynamic Column Definitions'

    def __str__(self):
        status = ' (proposed)' if self.is_proposed else ''
        return f"{self.project_id}:{self.table_name}.{self.column_key}{status}"


class DynamicColumnValue(models.Model):
    """Stores values for dynamic columns (EAV pattern)."""

    column_definition = models.ForeignKey(
        DynamicColumnDefinition,
        on_delete=models.CASCADE,
        related_name='values'
    )
    row_id = models.IntegerField(
        help_text="ID of the row in the target table (e.g., unit_id)"
    )

    # Store value in appropriate type column
    value_text = models.TextField(null=True, blank=True)
    value_number = models.DecimalField(
        max_digits=18,
        decimal_places=4,
        null=True,
        blank=True
    )
    value_boolean = models.BooleanField(null=True, blank=True)
    value_date = models.DateField(null=True, blank=True)

    # Extraction metadata
    confidence = models.FloatField(null=True, blank=True)
    extracted_from = models.ForeignKey(
        'documents.Document',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='extracted_dynamic_values'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tbl_dynamic_column_value'
        unique_together = [['column_definition', 'row_id']]
        indexes = [
            models.Index(fields=['column_definition', 'row_id']),
            models.Index(fields=['row_id']),
        ]
        verbose_name = 'Dynamic Column Value'
        verbose_name_plural = 'Dynamic Column Values'

    def __str__(self):
        return f"{self.column_definition.column_key}[{self.row_id}]"

    @property
    def value(self):
        """Get the typed value based on column definition."""
        dtype = self.column_definition.data_type
        if dtype == 'boolean':
            return self.value_boolean
        elif dtype in ('number', 'currency', 'percent'):
            return self.value_number
        elif dtype == 'date':
            return self.value_date
        else:
            return self.value_text

    @value.setter
    def value(self, val):
        """Set the value in the appropriate field."""
        dtype = self.column_definition.data_type
        # Reset all
        self.value_text = None
        self.value_number = None
        self.value_boolean = None
        self.value_date = None

        if val is None:
            return

        if dtype == 'boolean':
            self.value_boolean = bool(val)
        elif dtype in ('number', 'currency', 'percent'):
            self.value_number = val
        elif dtype == 'date':
            self.value_date = val
        else:
            self.value_text = str(val)
