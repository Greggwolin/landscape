-- 20260507_create_unit_operations.down.sql
-- Reverses the up migration. Drops tbl_unit_operations.

BEGIN;
DROP TABLE IF EXISTS landscape.tbl_unit_operations;
COMMIT;
