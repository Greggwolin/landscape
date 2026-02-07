"""
Migration 0044: Add revolver-specific fields to tbl_loan.

Uses RunSQL because Loan model is managed=False (unmanaged).
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0022_add_vertical_construction_categories'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE landscape.tbl_loan
                    ADD COLUMN IF NOT EXISTS interest_reserve_inflator NUMERIC(5,2) DEFAULT 1.0,
                    ADD COLUMN IF NOT EXISTS repayment_acceleration NUMERIC(5,2) DEFAULT 1.0,
                    ADD COLUMN IF NOT EXISTS closing_costs_appraisal NUMERIC(12,2),
                    ADD COLUMN IF NOT EXISTS closing_costs_legal NUMERIC(12,2),
                    ADD COLUMN IF NOT EXISTS closing_costs_other NUMERIC(12,2),
                    ADD COLUMN IF NOT EXISTS recourse_type VARCHAR(30) DEFAULT 'FULL';
            """,
            reverse_sql="""
                ALTER TABLE landscape.tbl_loan
                    DROP COLUMN IF EXISTS interest_reserve_inflator,
                    DROP COLUMN IF EXISTS repayment_acceleration,
                    DROP COLUMN IF EXISTS closing_costs_appraisal,
                    DROP COLUMN IF EXISTS closing_costs_legal,
                    DROP COLUMN IF EXISTS closing_costs_other,
                    DROP COLUMN IF EXISTS recourse_type;
            """,
        ),
    ]
