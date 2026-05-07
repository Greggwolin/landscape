# Per-document chat thread link.
# DDL is handled by migrations/20260505_thread_doc_link.up.sql.
# This Django migration only updates Django's model state so ORM validation
# matches the post-DDL schema. No database operations here.
#
# Refs: Landscape app/SPEC-DocChat-DesignNote-qm-2026-05-05.md
# Session: LSCMD-DOCCHAT-0504-qm15

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('landscaper', '0004_thread_archive_fields'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='chatthread',
                    name='doc_id',
                    field=models.IntegerField(
                        blank=True,
                        null=True,
                        db_column='doc_id',
                        help_text=(
                            'Optional core_doc.doc_id this thread is bound to. '
                            'NULL for general project chats and ad-hoc threads.'
                        ),
                    ),
                ),
            ],
        ),
    ]
