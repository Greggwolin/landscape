# Chat Canvas Phase 1: link core_doc rows to unassigned Landscaper threads.
# DDL (ADD COLUMN thread_id + FK + partial index) is handled by
# migrations/20260416_chat_canvas_unassigned_threads.sql.
# This Django migration only updates state for the managed=False Document model.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0005_intelligence_tables'),
        ('landscaper', '0003_unassigned_threads'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='document',
                    name='thread',
                    field=models.ForeignKey(
                        blank=True,
                        db_column='thread_id',
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='documents',
                        to='landscaper.chatthread',
                    ),
                ),
            ],
        ),
    ]
