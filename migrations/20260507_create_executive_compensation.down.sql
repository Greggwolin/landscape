-- 20260507_create_executive_compensation.down.sql
-- Reverses the up migration. Drops the 4 Increment 7 tables in reverse dependency order.

BEGIN;
DROP TABLE IF EXISTS landscape.tbl_executive_incentive_target;
DROP TABLE IF EXISTS landscape.tbl_executive_employment_agreement;
DROP TABLE IF EXISTS landscape.tbl_executive_compensation_period;
DROP TABLE IF EXISTS landscape.tbl_executive;
COMMIT;
