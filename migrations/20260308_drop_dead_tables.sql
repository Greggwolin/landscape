-- Migration: Drop dead-weight tables identified in schema audit
-- Date: 2026-03-08
-- Context: Tables confirmed unreferenced (or superseded) by codebase grep + FK audit
-- Audit: Phase 1 traced all code paths in backend/, src/, and Landscaper tools
--
-- NOT dropped (require code consolidation first):
--   - tbl_rent_comparable / tbl_rental_comparable — both actively used by different code paths
--   - tbl_contacts_legacy — v_project_contacts view + vw_budget_grid_items view depend on it;
--     contacts route.ts reads from v_project_contacts. Needs view rewrite + API migration.

BEGIN;

-- ============================================================
-- 1. Drop FK constraints that reference tables we're removing
-- ============================================================

-- tbl_operating_expenses.account_id -> tbl_opex_accounts_deprecated
ALTER TABLE landscape.tbl_operating_expenses DROP CONSTRAINT IF EXISTS tbl_operating_expenses_account_id_fkey;

-- ============================================================
-- 2. Drop dead duplicate: OpEx singular (keep tbl_operating_expenses plural)
--    Evidence: All API routes, Landscaper tool_executor, mutation_service,
--    extraction_writer, and workbench_views use the plural table.
--    tbl_expense_detail (0 rows) has FK to this table — CASCADE handles it.
-- ============================================================
DROP TABLE IF EXISTS landscape.tbl_operating_expense CASCADE;

-- ============================================================
-- 3. Drop backup tables (dated snapshots, no code references)
-- ============================================================
DROP TABLE IF EXISTS landscape.core_category_lifecycle_stages_backup_20260126;
DROP TABLE IF EXISTS landscape.core_unit_cost_category_backup_20260126;
DROP TABLE IF EXISTS landscape.tbl_acquisition_backup_20260202;

-- ============================================================
-- 4. Drop deprecated table
-- ============================================================

-- tbl_opex_accounts_deprecated: deprecated by name, self-referential FK only
-- FK from tbl_operating_expenses already removed above
DROP TABLE IF EXISTS landscape.tbl_opex_accounts_deprecated CASCADE;

-- ============================================================
-- 5. Drop one-time migration artifacts
-- ============================================================
DROP TABLE IF EXISTS landscape.extraction_mapping_doctype_migration_log;
DROP TABLE IF EXISTS landscape.opex_account_migration_map;

COMMIT;

-- ============================================================
-- ROLLBACK (manual — tables cannot be recreated with data)
-- If needed, restore from Neon branch snapshot taken before this migration.
-- ============================================================
