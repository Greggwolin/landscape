-- ============================================================================
-- 20260507_create_master_lease_entity.down.sql
-- Session: LSCMD-NLF-0507-OP4
-- Reverses 20260507_create_master_lease_entity.up.sql
--
-- Drops in reverse dependency order:
--   4. FK constraint on tbl_lease_nl_ext.master_lease_id
--   3. tbl_master_lease_property
--   2. tbl_master_lease_amendment
--   1. tbl_master_lease
--
-- Strictly additive in the up; this fully reverses to pre-state. Any seeded
-- master lease data is lost (tables get dropped). The master_lease_id column
-- on tbl_lease_nl_ext stays — it's a pre-Increment-4 artifact from Increment 2.
-- ============================================================================

BEGIN;

-- 4. Drop the FK constraint (the column itself stays, since it was added in Increment 2)
ALTER TABLE landscape.tbl_lease_nl_ext
    DROP CONSTRAINT IF EXISTS tbl_lease_nl_ext_master_lease_id_fkey;

-- 3. Reverse the per-property allocation table
DROP TABLE IF EXISTS landscape.tbl_master_lease_property;

-- 2. Reverse the amendment history
DROP TABLE IF EXISTS landscape.tbl_master_lease_amendment;

-- 1. Reverse the master lease entity
DROP TABLE IF EXISTS landscape.tbl_master_lease;

COMMIT;
