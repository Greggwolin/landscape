"""
Models for report templates and configurations.

ReportTemplate: Stores custom report configurations that can be assigned to project tabs.
Users configure which sections to include and which tabs should show export buttons.
"""

from django.db import models


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
