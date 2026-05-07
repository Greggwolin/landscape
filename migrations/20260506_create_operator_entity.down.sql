-- ============================================================================
-- 20260506_create_operator_entity.down.sql
-- Session: LSCMD-NLF-0506-OP1
-- Reverses 20260506_create_operator_entity.up.sql
--
-- Drops, in reverse dependency order:
--   3. tbl_tenant.operator_id column (and its index)
--   2. tbl_operator_alias table
--   1. tbl_operator table
--
-- Safe as long as no other code is reading the operator_id column on
-- tbl_tenant. Since this is the foundation migration and Increment 2 hasn't
-- run yet, nothing downstream depends on it at this point.
-- ============================================================================

BEGIN;

-- 3. Reverse the tbl_tenant column add
DROP INDEX IF EXISTS landscape.idx_tbl_tenant_operator;
ALTER TABLE landscape.tbl_tenant DROP COLUMN IF EXISTS operator_id;

-- 2. Reverse the alias table
DROP TABLE IF EXISTS landscape.tbl_operator_alias;

-- 1. Reverse the operator table
DROP TABLE IF EXISTS landscape.tbl_operator;

COMMIT;
