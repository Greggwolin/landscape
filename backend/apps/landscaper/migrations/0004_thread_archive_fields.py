# Universal Archive Pattern Phase 1a — chat threads.
# DDL is handled by migrations/20260505_thread_archive_fields.up.sql.
# This Django migration only updates Django's model state so ORM validation
# matches the post-DDL schema. No database operations here.
#
# Refs: Landscape app/SPEC-Universal-Archive-Pattern-PV-2026-05-05.md §4.1
# Session: LSCMD-UNIV-ARCHIVE-PHASE1A-PV05-2026-05-05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('landscaper', '0003_unassigned_threads'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='chatthread',
                    name='is_archived',
                    field=models.BooleanField(
                        default=False,
                        help_text='Universal Archive Pattern: TRUE = soft-archived (hidden from default lists, recoverable). FALSE = live.',
                    ),
                ),
                migrations.AddField(
                    model_name='chatthread',
                    name='archived_at',
                    field=models.DateTimeField(
                        blank=True,
                        null=True,
                        help_text='When the thread was archived (NULL when is_archived = FALSE).',
                    ),
                ),
                migrations.AddField(
                    model_name='chatthread',
                    name='archived_by_user_id',
                    field=models.CharField(
                        max_length=50,
                        blank=True,
                        null=True,
                        help_text='User who archived the thread (NULL when is_archived = FALSE).',
                    ),
                ),
            ],
        ),
    ]
