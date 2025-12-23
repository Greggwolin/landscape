-- Project-level active operating expense scenario selection

ALTER TABLE landscape.tbl_project
    ADD COLUMN IF NOT EXISTS active_opex_discriminator VARCHAR(100) DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_project_active_opex_discriminator
    ON landscape.tbl_project (active_opex_discriminator);

COMMENT ON COLUMN landscape.tbl_project.active_opex_discriminator IS
    'Active statement_discriminator for operating expenses (defaults to legacy \"default\")';
