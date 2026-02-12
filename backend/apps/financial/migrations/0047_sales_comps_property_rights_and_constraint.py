"""
Migration 0047: Sales comparables property rights + derived pricing constraint cleanup.

Adds property_rights to landscape.tbl_sales_comparables and removes the restrictive
check_price_per_unit constraint so backend-derived values can be saved safely.
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0046_loan_sizing_budget_columns'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE landscape.tbl_sales_comparables
                    ADD COLUMN IF NOT EXISTS property_rights VARCHAR(50);

                COMMENT ON COLUMN landscape.tbl_sales_comparables.property_rights
                    IS 'Fee Simple, Leased Fee, Leasehold, Partial Interest, etc.';

                ALTER TABLE landscape.tbl_sales_comparables
                    DROP CONSTRAINT IF EXISTS check_price_per_unit;
            """,
            reverse_sql="""
                ALTER TABLE landscape.tbl_sales_comparables
                    DROP COLUMN IF EXISTS property_rights;

                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'check_price_per_unit'
                    ) THEN
                        ALTER TABLE landscape.tbl_sales_comparables
                        ADD CONSTRAINT check_price_per_unit
                        CHECK (((price_per_unit IS NULL) OR (price_per_unit > (100000)::numeric)));
                    END IF;
                END $$;
            """,
        ),
    ]
