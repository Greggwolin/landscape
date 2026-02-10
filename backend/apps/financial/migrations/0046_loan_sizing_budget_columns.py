"""
Migration 0046: Add loan sizing and net proceeds columns to tbl_loan.

Uses RunSQL because Loan model is unmanaged (managed=False).
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0045_lotbank_project_fields'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE landscape.tbl_loan
                    ADD COLUMN IF NOT EXISTS commitment_sizing_method VARCHAR(30) DEFAULT 'MANUAL',
                    ADD COLUMN IF NOT EXISTS ltv_basis_amount NUMERIC(15,2),
                    ADD COLUMN IF NOT EXISTS ltc_basis_amount NUMERIC(15,2),
                    ADD COLUMN IF NOT EXISTS calculated_commitment_amount NUMERIC(15,2),
                    ADD COLUMN IF NOT EXISTS governing_constraint VARCHAR(10),
                    ADD COLUMN IF NOT EXISTS net_loan_proceeds NUMERIC(15,2);

                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'ck_loan_sizing_method'
                    ) THEN
                        ALTER TABLE landscape.tbl_loan
                        ADD CONSTRAINT ck_loan_sizing_method
                        CHECK (commitment_sizing_method IN ('MANUAL', 'LTV', 'LTC', 'MIN_LTV_LTC'));
                    END IF;
                END $$;

                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'ck_loan_governing'
                    ) THEN
                        ALTER TABLE landscape.tbl_loan
                        ADD CONSTRAINT ck_loan_governing
                        CHECK (governing_constraint IN ('LTV', 'LTC', 'MANUAL') OR governing_constraint IS NULL);
                    END IF;
                END $$;
            """,
            reverse_sql="""
                ALTER TABLE landscape.tbl_loan
                    DROP CONSTRAINT IF EXISTS ck_loan_governing,
                    DROP CONSTRAINT IF EXISTS ck_loan_sizing_method,
                    DROP COLUMN IF EXISTS net_loan_proceeds,
                    DROP COLUMN IF EXISTS governing_constraint,
                    DROP COLUMN IF EXISTS calculated_commitment_amount,
                    DROP COLUMN IF EXISTS ltc_basis_amount,
                    DROP COLUMN IF EXISTS ltv_basis_amount,
                    DROP COLUMN IF EXISTS commitment_sizing_method;
            """,
        ),
    ]
