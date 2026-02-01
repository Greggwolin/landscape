from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0003_add_opex_benchmark'),
    ]

    operations = [
        migrations.AddField(
            model_name='platformknowledgechunk',
            name='category',
            field=models.CharField(
                default='general',
                help_text='High-level classification for ingestion scripts (e.g., alpha_docs)',
                max_length=100
            ),
        ),
        migrations.AddField(
            model_name='platformknowledgechunk',
            name='metadata',
            field=models.JSONField(
                default=dict,
                help_text='Supplemental metadata to support filtered retrieval'
            ),
        ),
    ]
