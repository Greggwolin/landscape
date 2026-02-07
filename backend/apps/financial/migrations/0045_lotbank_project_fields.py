"""
Migration 0045: Add lotbank transaction fields.

Adds:
  - tbl_project: lotbank_management_fee_pct, lotbank_default_provision_pct,
    lotbank_underwriting_fee, collateral_enforcement
  - tbl_loan: collateral_basis_type
  - tbl_division: option_deposit_pct, option_deposit_cap_pct,
    retail_lot_price, premium_pct
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0044_loan_revolver_fields'),
    ]

    operations = [
        # ── tbl_project: lotbank project-level settings ─────────────────
        migrations.RunSQL(
            sql="""
                ALTER TABLE landscape.tbl_project
                    ADD COLUMN IF NOT EXISTS collateral_enforcement VARCHAR(20) DEFAULT 'STRICT',
                    ADD COLUMN IF NOT EXISTS lotbank_management_fee_pct NUMERIC(5,4),
                    ADD COLUMN IF NOT EXISTS lotbank_default_provision_pct NUMERIC(5,4),
                    ADD COLUMN IF NOT EXISTS lotbank_underwriting_fee NUMERIC(12,2);

                COMMENT ON COLUMN landscape.tbl_project.collateral_enforcement
                    IS 'STRICT = no overlapping pledges, PERMISSIVE = warn but allow';
                COMMENT ON COLUMN landscape.tbl_project.lotbank_management_fee_pct
                    IS 'Monthly mgmt fee as decimal (0.005 = 0.5%). Only used when analysis_type=LOTBANK.';
                COMMENT ON COLUMN landscape.tbl_project.lotbank_default_provision_pct
                    IS 'Builder default provision as decimal (0.02 = 2%). Only used when analysis_type=LOTBANK.';
                COMMENT ON COLUMN landscape.tbl_project.lotbank_underwriting_fee
                    IS 'Flat underwriting fee at close ($). Only used when analysis_type=LOTBANK.';
            """,
            reverse_sql="""
                ALTER TABLE landscape.tbl_project
                    DROP COLUMN IF EXISTS collateral_enforcement,
                    DROP COLUMN IF EXISTS lotbank_management_fee_pct,
                    DROP COLUMN IF EXISTS lotbank_default_provision_pct,
                    DROP COLUMN IF EXISTS lotbank_underwriting_fee;
            """,
        ),

        # ── tbl_loan: collateral basis type ─────────────────────────────
        migrations.RunSQL(
            sql="""
                ALTER TABLE landscape.tbl_loan
                    ADD COLUMN IF NOT EXISTS collateral_basis_type VARCHAR(30) DEFAULT 'PROJECT_COST';

                COMMENT ON COLUMN landscape.tbl_loan.collateral_basis_type
                    IS 'PROJECT_COST = LTC on actual cost basis; RESIDUAL_LAND_VALUE = LTC on finished lot price minus improvements.';
            """,
            reverse_sql="""
                ALTER TABLE landscape.tbl_loan
                    DROP COLUMN IF EXISTS collateral_basis_type;
            """,
        ),

        # ── tbl_division: per-product lotbank fields ───────────────────
        migrations.RunSQL(
            sql="""
                ALTER TABLE landscape.tbl_division
                    ADD COLUMN IF NOT EXISTS option_deposit_pct NUMERIC(5,4),
                    ADD COLUMN IF NOT EXISTS option_deposit_cap_pct NUMERIC(5,4),
                    ADD COLUMN IF NOT EXISTS retail_lot_price NUMERIC(12,2),
                    ADD COLUMN IF NOT EXISTS premium_pct NUMERIC(5,4);

                COMMENT ON COLUMN landscape.tbl_division.option_deposit_pct
                    IS 'Option deposit as decimal (0.15 = 15%). Stored as decimal, NOT percentage.';
                COMMENT ON COLUMN landscape.tbl_division.option_deposit_cap_pct
                    IS 'Deposit cap ratio as decimal (0.20 = 20%). Stored as decimal, NOT percentage.';
                COMMENT ON COLUMN landscape.tbl_division.retail_lot_price
                    IS 'Per-lot option/takedown price ($).';
                COMMENT ON COLUMN landscape.tbl_division.premium_pct
                    IS 'Phase premium as decimal (0.15 = 15%). Stored as decimal, NOT percentage.';
            """,
            reverse_sql="""
                ALTER TABLE landscape.tbl_division
                    DROP COLUMN IF EXISTS option_deposit_pct,
                    DROP COLUMN IF EXISTS option_deposit_cap_pct,
                    DROP COLUMN IF EXISTS retail_lot_price,
                    DROP COLUMN IF EXISTS premium_pct;
            """,
        ),
    ]
