"""
Add basis field to tbl_sale_benchmarks for storing percentage calculation basis.

This field stores what the percentage should be applied to:
- For commissions: 'gross_sale_price' or 'net_sale_price'
- For transaction costs: 'gross_sale_price', 'net_sale_price', 'purchase_price', or 'loan_amount'
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('sales_absorption', '0002_set_global_benchmarks'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE landscape.tbl_sale_benchmarks
            ADD COLUMN IF NOT EXISTS basis VARCHAR(50);

            COMMENT ON COLUMN landscape.tbl_sale_benchmarks.basis IS
            'What the percentage is applied to (e.g., gross_sale_price, net_sale_price, purchase_price, loan_amount)';

            -- Set default basis for existing commission benchmarks
            UPDATE landscape.tbl_sale_benchmarks
            SET basis = 'net_sale_price'
            WHERE benchmark_type = 'commission' AND rate_pct IS NOT NULL AND basis IS NULL;
            """,
            reverse_sql="""
            ALTER TABLE landscape.tbl_sale_benchmarks
            DROP COLUMN IF EXISTS basis;
            """
        ),
    ]
