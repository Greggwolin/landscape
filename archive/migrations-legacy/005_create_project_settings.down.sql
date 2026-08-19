BEGIN;

DROP INDEX IF EXISTS idx_project_settings_currency;
DROP TABLE IF EXISTS landscape.tbl_project_settings;

COMMIT;
