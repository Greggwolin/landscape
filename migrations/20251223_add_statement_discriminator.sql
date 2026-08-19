-- Add statement_discriminator to OpEx canonical table for scenario/source separation

ALTER TABLE landscape.tbl_operating_expenses
    ADD COLUMN IF NOT EXISTS statement_discriminator VARCHAR(100) DEFAULT 'default';

-- Enforce uniqueness per statement for category- and account-based rows separately
CREATE UNIQUE INDEX IF NOT EXISTS ux_opex_proj_cat_stmt
    ON landscape.tbl_operating_expenses (project_id, category_id, statement_discriminator)
    WHERE category_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_opex_proj_acct_stmt
    ON landscape.tbl_operating_expenses (project_id, account_id, statement_discriminator)
    WHERE account_id IS NOT NULL;

-- Helpful lookup index for filtering by project + statement
CREATE INDEX IF NOT EXISTS idx_opex_project_statement
    ON landscape.tbl_operating_expenses (project_id, statement_discriminator);
