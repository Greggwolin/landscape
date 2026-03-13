"""
Add index_rate_pct to tbl_loan for floating-rate loans.
This stores the current index rate (e.g., SOFR = 4.30%) so that
all-in rate can be calculated as index_rate + spread.
Also makes commitment_amount nullable to prevent save failures
when the user hasn't entered a commitment yet.
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0050_fix_loan_takes_out_fk_on_delete'),
    ]

    operations = [
        # Add index_rate_pct column
        migrations.AddField(
            model_name='loan',
            name='index_rate_pct',
            field=models.DecimalField(
                max_digits=6,
                decimal_places=3,
                null=True,
                blank=True,
                help_text='Current index rate (e.g., SOFR rate) as a percentage',
            ),
        ),
        # Make commitment_amount nullable so loans can be saved incrementally
        migrations.AlterField(
            model_name='loan',
            name='commitment_amount',
            field=models.DecimalField(
                max_digits=15,
                decimal_places=2,
                null=True,
                blank=True,
                default=0,
            ),
        ),
    ]
