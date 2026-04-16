# Chat Canvas Phase 1: Unassigned Thread Support
# DDL is handled by migrations/20260416_chat_canvas_unassigned_threads.sql.
# This Django migration only updates Django's model state so ORM validation
# matches the post-DDL schema. No database operations here.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('landscaper', '0002_intelligence_tables'),
        ('projects', '0006_intelligence_tables'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterField(
                    model_name='chatthread',
                    name='project',
                    field=models.ForeignKey(
                        blank=True,
                        db_column='project_id',
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='chat_threads',
                        to='projects.project',
                    ),
                ),
                migrations.AlterField(
                    model_name='chatthread',
                    name='page_context',
                    field=models.CharField(
                        blank=True,
                        choices=[
                            ('home', 'Home'),
                            ('property', 'Property'),
                            ('operations', 'Operations'),
                            ('feasibility', 'Feasibility'),
                            ('capitalization', 'Capitalization'),
                            ('reports', 'Reports'),
                            ('documents', 'Documents'),
                            ('general', 'General'),
                        ],
                        help_text='Soft tag for UI awareness; not required for unassigned threads.',
                        max_length=50,
                        null=True,
                    ),
                ),
            ],
        ),
    ]
