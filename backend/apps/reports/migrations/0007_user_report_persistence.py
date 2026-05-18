"""
Migration: Create persistence layer for the chat-forward reports redesign.

Adds two new tables:

1. tbl_user_report_personal_default — one row per (user, report_code, scope, scope_id)
   storing a user's personal layout overrides on a canonical report. Missing row
   means use canonical base. DELETE = "Reset to base".

2. tbl_user_saved_report — many rows per user, each a named "Save As" entry built
   on top of a canonical report. Soft-delete via is_archived.

Per Phase 1 design (RP-CFRPT-2605):
- scope_type/scope_id CHECK constraint enforces consistency from day one
  (global/cross_project => scope_id NULL; project/entity/master_lease => scope_id NOT NULL).
- modification_spec JSONB carries layout overrides (columns, sort, filters, etc.).
- Saved-report `name` is unique per user (NOT global) so user A's "Compressed Rent
  Roll" doesn't collide with user B's.
- FK to ReportDefinition via report_code (to_field) — referential integrity at the
  DB layer prevents orphan layouts pointing at deleted canonical reports.

Forward-compat: scope_type accepts 'entity' / 'master_lease' / 'cross_project'
from day one for net-lease portfolio reports added later, without migration.

LSCMD-RP-CFRPT-2605-PH2.
"""

import uuid

import django.contrib.postgres.indexes
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


SCOPE_CHOICES = [
    ('global', 'Global'),
    ('project', 'Project'),
    ('entity', 'Entity'),
    ('master_lease', 'Master Lease'),
    ('cross_project', 'Cross Project'),
]


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0006_update_data_readiness'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # =====================================================================
        # tbl_user_report_personal_default
        # =====================================================================
        migrations.CreateModel(
            name='UserReportPersonalDefault',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scope_type', models.CharField(
                    max_length=20,
                    choices=SCOPE_CHOICES,
                    default='global',
                    help_text='Scope of this personal default. "global" travels across every project.',
                )),
                ('scope_id', models.IntegerField(
                    null=True, blank=True,
                    help_text='NULL for global/cross_project; required for project/entity/master_lease scopes.',
                )),
                ('modification_spec', models.JSONField(
                    default=dict,
                    help_text='Layout overrides per Phase 1 §4 (columns, sort, filters, presentation).',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_used_at', models.DateTimeField(null=True, blank=True)),
                ('user', models.ForeignKey(
                    db_column='user_id',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='report_personal_defaults',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('report_definition', models.ForeignKey(
                    db_column='report_code',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='personal_defaults',
                    to='reports.reportdefinition',
                    to_field='report_code',
                )),
            ],
            options={
                'db_table': 'landscape"."tbl_user_report_personal_default',
                'verbose_name': 'User Report Personal Default',
                'verbose_name_plural': 'User Report Personal Defaults',
            },
        ),
        migrations.AddConstraint(
            model_name='userreportpersonaldefault',
            constraint=models.UniqueConstraint(
                fields=('user', 'report_definition', 'scope_type', 'scope_id'),
                name='uq_personal_default_scope',
            ),
        ),
        migrations.AddConstraint(
            model_name='userreportpersonaldefault',
            constraint=models.CheckConstraint(
                check=(
                    models.Q(scope_type__in=('global', 'cross_project'), scope_id__isnull=True)
                    | models.Q(scope_type__in=('project', 'entity', 'master_lease'), scope_id__isnull=False)
                ),
                name='chk_personal_default_scope_id_required',
            ),
        ),
        migrations.AddIndex(
            model_name='userreportpersonaldefault',
            index=models.Index(
                fields=['user', 'report_definition'],
                name='ix_pers_def_user_report',
            ),
        ),
        migrations.AddIndex(
            model_name='userreportpersonaldefault',
            index=models.Index(
                fields=['scope_type', 'scope_id'],
                name='ix_pers_def_scope',
            ),
        ),

        # =====================================================================
        # tbl_user_saved_report
        # =====================================================================
        migrations.CreateModel(
            name='UserSavedReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uuid', models.UUIDField(
                    unique=True,
                    editable=False,
                    default=uuid.uuid4,
                    help_text='Stable external identifier used in URLs and chat references.',
                )),
                ('name', models.CharField(
                    max_length=120,
                    help_text='User-supplied name. Unique per user.',
                )),
                ('description', models.TextField(null=True, blank=True)),
                ('scope_type', models.CharField(
                    max_length=20,
                    choices=SCOPE_CHOICES,
                    default='global',
                )),
                ('scope_id', models.IntegerField(null=True, blank=True)),
                ('modification_spec', models.JSONField(default=dict)),
                ('is_archived', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_used_at', models.DateTimeField(null=True, blank=True)),
                ('user', models.ForeignKey(
                    db_column='user_id',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='saved_reports',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('base_report', models.ForeignKey(
                    db_column='base_report_code',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='user_saved_versions',
                    to='reports.reportdefinition',
                    to_field='report_code',
                )),
            ],
            options={
                'db_table': 'landscape"."tbl_user_saved_report',
                'verbose_name': 'User Saved Report',
                'verbose_name_plural': 'User Saved Reports',
                'ordering': ['-updated_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='usersavedreport',
            constraint=models.UniqueConstraint(
                fields=('user', 'name'),
                name='uq_saved_report_user_name',
            ),
        ),
        migrations.AddConstraint(
            model_name='usersavedreport',
            constraint=models.CheckConstraint(
                check=(
                    models.Q(scope_type__in=('global', 'cross_project'), scope_id__isnull=True)
                    | models.Q(scope_type__in=('project', 'entity', 'master_lease'), scope_id__isnull=False)
                ),
                name='chk_saved_report_scope_id_required',
            ),
        ),
        migrations.AddIndex(
            model_name='usersavedreport',
            index=models.Index(
                fields=['user', 'is_archived'],
                name='ix_saved_user_archived',
            ),
        ),
        migrations.AddIndex(
            model_name='usersavedreport',
            index=models.Index(
                fields=['base_report'],
                name='ix_saved_base_report',
            ),
        ),
    ]
