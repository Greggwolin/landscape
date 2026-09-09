"""Drop the invented deal-term defaults from PropertyAcquisition.

0002_initial mirrored the same values the view was handing out as "defaults"
for a project with no record: 1.5% closing costs, 30 due-diligence days, 1.5%
sale costs, a 2.5% broker commission, and a 20/80 land/improvement split that
drives depreciation. A value written by the model layer is as invented as one
written by the app — a save that omitted the field wrote it anyway.

PropertyAcquisition is `managed = False`, so this migration performs no DDL; it
records the field-state change so `makemigrations` stays quiet and the model
history is honest. The live column defaults are dropped by the raw-SQL
migration `migrations/20260904_drop_invented_acquisition_defaults.up.sql`.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('acquisition', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='propertyacquisition',
            name='closing_costs_pct',
            field=models.DecimalField(
                blank=True, decimal_places=3,
                help_text='Closing costs as % of purchase price',
                max_digits=6, null=True,
            ),
        ),
        migrations.AlterField(
            model_name='propertyacquisition',
            name='due_diligence_days',
            field=models.IntegerField(
                blank=True, help_text='Due diligence period in days', null=True,
            ),
        ),
        migrations.AlterField(
            model_name='propertyacquisition',
            name='sale_costs_pct',
            field=models.DecimalField(
                blank=True, decimal_places=3,
                help_text='Sale closing costs as % of sale price',
                max_digits=6, null=True,
            ),
        ),
        migrations.AlterField(
            model_name='propertyacquisition',
            name='broker_commission_pct',
            field=models.DecimalField(
                blank=True, decimal_places=3,
                help_text='Broker commission as % of sale price',
                max_digits=6, null=True,
            ),
        ),
        migrations.AlterField(
            model_name='propertyacquisition',
            name='land_pct',
            field=models.DecimalField(
                blank=True, decimal_places=2,
                help_text='Land percentage of total basis',
                max_digits=5, null=True,
            ),
        ),
        migrations.AlterField(
            model_name='propertyacquisition',
            name='improvement_pct',
            field=models.DecimalField(
                blank=True, decimal_places=2,
                help_text='Improvement percentage of total basis',
                max_digits=5, null=True,
            ),
        ),
    ]
