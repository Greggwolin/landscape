# Per-thread "where was this thread last productive" pointer.
#
# DDL is handled by migrations/20260728_thread_last_destination.up.sql.
# This Django migration only updates Django's model state so ORM validation
# matches the post-DDL schema. No database operations here — same
# SeparateDatabaseAndState pattern as 0005_thread_doc_link.
#
# Refs: Landscape app/Reopening-a-Chat-Where-It-Left-Off-2026-07-28.html
# Session: LSCMD-THREADDEST-0728-TA1

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('landscaper', '0006_chatthread_created_by'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='chatthread',
                    name='last_destination',
                    field=models.JSONField(
                        blank=True,
                        null=True,
                        db_column='last_destination',
                        help_text=(
                            'Where this thread was last productive: '
                            '{kind, artifactId|route, screen, tool, label, at}. '
                            'NULL = nothing restorable.'
                        ),
                    ),
                ),
            ],
        ),
    ]
