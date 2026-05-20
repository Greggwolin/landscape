# ChatThread.created_by — ownership FK.
# DDL handled by migrations/20260519_add_chatthread_created_by.up.sql.
# This Django migration only updates ORM state so model validation
# matches the post-DDL schema. No database operations here.
#
# Refs: LSCMD-THREAD-VISIBILITY-FIX-0519

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('landscaper', '0005_thread_doc_link'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='chatthread',
                    name='created_by',
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        db_column='created_by',
                        on_delete=models.deletion.SET_NULL,
                        related_name='chat_threads_created',
                        to=settings.AUTH_USER_MODEL,
                        help_text='User who created the thread. NULL for pre-fix legacy rows.',
                    ),
                ),
            ],
        ),
    ]
