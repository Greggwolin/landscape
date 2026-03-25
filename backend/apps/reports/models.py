"""
Models for report templates, definitions, and history.

ReportDefinition: Catalog of what reports exist and which project types can see them.
ReportTemplate: Stores custom report configurations that can be assigned to project tabs.
ReportHistory: Tracks each report generation event.
"""

from django.db import models
from django.contrib.postgres.fields import ArrayField


class ReportDefinition(models.Model):
    """
    Report catalog — defines what reports exist and which project types can see them.
    Separate from ReportTemplate which defines how to render a specific report format.
    """

    READINESS_CHOICES = [
        ('ready', 'Ready'),
        ('partial', 'Partial'),
        ('not_ready', 'Not Ready'),
    ]

    TIER_CHOICES = [
        ('essential', 'Essential'),
        ('advanced', 'Advanced'),
        ('premium', 'Premium'),
    ]

    report_code = models.CharField(max_length=50, unique=True)
    report_name = models.CharField(max_length=200)
    report_category = models.CharField(max_length=50)
    property_types = ArrayField(
        models.CharField(max_length=10),
        default=list,
        help_text="Project type codes: LAND, MF, OFF, RET, IND, HTL, MXU"
    )
    report_tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='essential')
    description = models.TextField(blank=True, default='')
    argus_equivalent = models.CharField(max_length=200, blank=True, default='')
    spec_file = models.CharField(max_length=100, blank=True, default='')
    data_readiness = models.CharField(max_length=20, choices=READINESS_CHOICES, default='not_ready')
    generator_class = models.CharField(max_length=100, blank=True, default='')
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landscape"."tbl_report_definition'
        managed = True
        ordering = ['sort_order']

    def __str__(self):
        return f"{self.report_code}: {self.report_name}"


class ReportHistory(models.Model):
    """Tracks each report generation event for audit/re-run purposes."""

    report_definition = models.ForeignKey(
        ReportDefinition,
        on_delete=models.CASCADE,
        related_name='history'
    )
    project_id = models.BigIntegerField()
    parameters = models.JSONField(default=dict, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    export_format = models.CharField(max_length=20, default='html')
    file_path = models.TextField(blank=True, default='')
    generation_time_ms = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'landscape"."tbl_report_history'
        managed = True
        ordering = ['-generated_at']

    def __str__(self):
        return f"{self.report_definition.report_code} for project {self.project_id}"


class ReportTemplate(models.Model):
    """
    Custom report template configuration.

    Defines what sections to include in a report and which project tabs
    should display an export button for this template.
    """

    OUTPUT_FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('powerpoint', 'PowerPoint'),
    ]

    template_name = models.CharField(max_length=200, help_text="Display name for this report template")
    description = models.TextField(blank=True, null=True, help_text="Brief description of what this report includes")
    output_format = models.CharField(
        max_length=20,
        choices=OUTPUT_FORMAT_CHOICES,
        default='pdf',
        help_text="Output file format for generated reports"
    )
    assigned_tabs = models.JSONField(
        default=list,
        help_text="List of tab names where this report's export button should appear"
    )
    sections = models.JSONField(
        default=list,
        help_text="List of section names to include in the generated report"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Only active templates appear in export dropdowns"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.TextField(blank=True, null=True, help_text="User who created this template")
    report_definition = models.ForeignKey(
        'ReportDefinition',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='templates'
    )
    property_types = ArrayField(
        models.CharField(max_length=10),
        default=list,
        blank=True
    )
    report_category = models.CharField(max_length=50, blank=True, default='')

    class Meta:
        db_table = 'landscape"."report_templates'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['is_active'], name='idx_report_active'),
        ]

    def __str__(self):
        return f"{self.template_name} ({self.output_format})"

    def __repr__(self):
        return f"<ReportTemplate: {self.template_name} - {len(self.sections)} sections>"
