-- ============================================================================
-- 20260507_create_concept_catalog.down.sql
-- Session: LSCMD-NLF-0507-OP3
-- Reverses 20260507_create_concept_catalog.up.sql
--
-- Drops in reverse dependency order:
--   5. concept_id column on tbl_lease_nl_ext
--   4. tbl_concept_field
--   3. tbl_operator_concept
--   2. tbl_concept
--   1. tbl_concept_category
--
-- Strictly additive in the up; this fully reverses to pre-state. Any seeded
-- data is lost (tables get dropped). If the EDGAR-seeded catalog needs to
-- be preserved across a rollback, take a manual backup first.
-- ============================================================================

BEGIN;

-- 5. Reverse the lease extension column add
DROP INDEX IF EXISTS landscape.idx_tbl_lease_nl_ext_concept;
ALTER TABLE landscape.tbl_lease_nl_ext DROP COLUMN IF EXISTS concept_id;

-- 4. Reverse the concept-field definitions table
DROP TABLE IF EXISTS landscape.tbl_concept_field;

-- 3. Reverse the operator-concept junction
DROP TABLE IF EXISTS landscape.tbl_operator_concept;

-- 2. Reverse the concept catalog itself
DROP TABLE IF EXISTS landscape.tbl_concept;

-- 1. Reverse the concept-category lookup
DROP TABLE IF EXISTS landscape.tbl_concept_category;

COMMIT;
