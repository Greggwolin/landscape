from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('knowledge', '0003_add_opex_benchmark'),
    ]

    operations = [
        migrations.AddField(
            model_name='platformknowledge',
            name='page_count',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
