BEGIN;

DROP INDEX IF EXISTS idx_project_config_asset_type;
DROP TABLE IF EXISTS landscape.tbl_project_config;

DROP INDEX IF EXISTS idx_container_parent;
DROP INDEX IF EXISTS idx_container_project_level;
DROP TABLE IF EXISTS landscape.tbl_container;

COMMIT;
