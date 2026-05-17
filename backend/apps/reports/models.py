"""
Models for report templates, definitions, history, and user persistence.

ReportDefinition: Catalog of what reports exist and which project types can see them.
ReportTemplate: Stores custom report configurations that can be assigned to project tabs.
ReportHistory: Tracks each report generation event.
UserReportPersonalDefault: One row per (user, report) for the user's personal layout
    overrides. Missing row means use canonical base. RP-CFRPT-2605 Phase 2.
UserSavedReport: User-named "Save As" entries. Many per user. Soft-delete via
    is_archived. RP-CFRPT-2605 Phase 2.
"""

import uuid as uuid_lib

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models


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


# =============================================================================
# RP-CFRPT-2605 Phase 2 — User persistence layer
# =============================================================================


SCOPE_CHOICES = [
    ('global', 'Global'),
    ('project', 'Project'),
    ('entity', 'Entity'),
    ('master_lease', 'Master Lease'),
    ('cross_project', 'Cross Project'),
]


class UserReportPersonalDefault(models.Model):
    """
    A user's personal layout overrides for a canonical report. One row per
    (user, report_code, scope_type, scope_id). Missing row means the canonical
    base renders unchanged.

    At launch every row has scope_type='global' and scope_id=NULL — personal
    defaults travel across every project the user touches. Other scope values
    are reserved for net-lease portfolio reports added later.

    DELETE this row = "Reset to base".
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='report_personal_defaults',
        db_column='user_id',
    )
    report_definition = models.ForeignKey(
        'ReportDefinition',
        on_delete=models.CASCADE,
        related_name='personal_defaults',
        db_column='report_code',
        to_field='report_code',
    )
    scope_type = models.CharField(
        max_length=20,
        choices=SCOPE_CHOICES,
        default='global',
        help_text='Scope of this personal default. "global" travels across every project.',
    )
    scope_id = models.IntegerField(
        null=True, blank=True,
        help_text='NULL for global/cross_project; required for project/entity/master_lease scopes.',
    )
    modification_spec = models.JSONField(
        default=dict,
        help_text='Layout overrides per Phase 1 §4 (columns, sort, filters, presentation).',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'landscape"."tbl_user_report_personal_default'
        verbose_name = 'User Report Personal Default'
        verbose_name_plural = 'User Report Personal Defaults'
        constraints = [
            models.UniqueConstraint(
                fields=('user', 'report_definition', 'scope_type', 'scope_id'),
                name='uq_personal_default_scope',
            ),
            models.CheckConstraint(
                check=(
                    models.Q(scope_type__in=('global', 'cross_project'), scope_id__isnull=True)
                    | models.Q(scope_type__in=('project', 'entity', 'master_lease'), scope_id__isnull=False)
                ),
                name='chk_personal_default_scope_id_required',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'report_definition'], name='ix_pers_def_user_report'),
            models.Index(fields=['scope_type', 'scope_id'], name='ix_pers_def_scope'),
        ]

    def __str__(self):
        return f"PersonalDefault user={self.user_id} report={self.report_definition_id} scope={self.scope_type}"


class UserSavedReport(models.Model):
    """
    A user-named "Save As" report. Many rows per user, each carries a
    user-supplied name. Unique-per-user, NOT global — user Alice's
    "Compressed Rent Roll" doesn't collide with user Bob's.

    Soft-delete via is_archived; library list filters archived out by default.

    `uuid` is the stable external identifier exposed in URLs and chat
    references. Numeric `id` stays internal.
    """

    uuid = models.UUIDField(
        unique=True,
        editable=False,
        default=uuid_lib.uuid4,
        help_text='Stable external identifier used in URLs and chat references.',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_reports',
        db_column='user_id',
    )
    base_report = models.ForeignKey(
        'ReportDefinition',
        on_delete=models.CASCADE,
        related_name='user_saved_versions',
        db_column='base_report_code',
        to_field='report_code',
    )
    name = models.CharField(
        max_length=120,
        help_text='User-supplied name. Unique per user.',
    )
    description = models.TextField(null=True, blank=True)
    scope_type = models.CharField(
        max_length=20,
        choices=SCOPE_CHOICES,
        default='global',
    )
    scope_id = models.IntegerField(null=True, blank=True)
    modification_spec = models.JSONField(default=dict)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'landscape"."tbl_user_saved_report'
        verbose_name = 'User Saved Report'
        verbose_name_plural = 'User Saved Reports'
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(
                fields=('user', 'name'),
                name='uq_saved_report_user_name',
            ),
            models.CheckConstraint(
                check=(
                    models.Q(scope_type__in=('global', 'cross_project'), scope_id__isnull=True)
                    | models.Q(scope_type__in=('project', 'entity', 'master_lease'), scope_id__isnull=False)
                ),
                name='chk_saved_report_scope_id_required',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'is_archived'], name='ix_saved_user_archived'),
            models.Index(fields=['base_report'], name='ix_saved_base_report'),
        ]

    def __str__(self):
        return f"SavedReport user={self.user_id} name={self.name!r} base={self.base_report_id}"
