-- =====================================================================
-- Increment 8 — DOWN migration
-- Reverses 20260508_increment_8_lineage_and_provenance.up.sql
-- =====================================================================

SET search_path TO landscape, public;

-- 4. tbl_lease — drop termination columns
ALTER TABLE landscape.tbl_lease DROP CONSTRAINT IF EXISTS tbl_lease_terminated_by_ml_fkey;
ALTER TABLE landscape.tbl_lease DROP CONSTRAINT IF EXISTS tbl_lease_termination_reason_check;
DROP INDEX IF EXISTS landscape.idx_lease_terminated_by_ml;
ALTER TABLE landscape.tbl_lease DROP COLUMN IF EXISTS terminated_by_master_lease_id;
ALTER TABLE landscape.tbl_lease DROP COLUMN IF EXISTS terminated_at;
ALTER TABLE landscape.tbl_lease DROP COLUMN IF EXISTS termination_reason;

-- 3. tbl_master_lease — drop lineage columns
ALTER TABLE landscape.tbl_master_lease DROP CONSTRAINT IF EXISTS tbl_master_lease_replaces_self_fkey;
ALTER TABLE landscape.tbl_master_lease DROP CONSTRAINT IF EXISTS tbl_master_lease_lineage_type_check;
DROP INDEX IF EXISTS landscape.idx_master_lease_replaces;
ALTER TABLE landscape.tbl_master_lease DROP COLUMN IF EXISTS lineage_type;
ALTER TABLE landscape.tbl_master_lease DROP COLUMN IF EXISTS replaces_master_lease_id;
ALTER TABLE landscape.tbl_master_lease DROP COLUMN IF EXISTS created_from_doc_ids;

-- 2. tbl_master_lease_property — drop original-basis columns
ALTER TABLE landscape.tbl_master_lease_property DROP COLUMN IF EXISTS original_acquisition_date;
ALTER TABLE landscape.tbl_master_lease_property DROP COLUMN IF EXISTS original_acquisition_price;
ALTER TABLE landscape.tbl_master_lease_property DROP COLUMN IF EXISTS original_going_in_cap_rate;
ALTER TABLE landscape.tbl_master_lease_property DROP COLUMN IF EXISTS snapshot_only;

-- 1. tbl_parcel_acquisition_history — drop table
DROP TABLE IF EXISTS landscape.tbl_parcel_acquisition_history CASCADE;
