-- Migration 046: Drop duplicate indexes
-- Generated: 2026-01-06
-- Source: docs/schema/landscape_index_ownership.csv (live DB metadata via pg_constraint.conindid)
--
-- This migration removes duplicate indexes identified through analysis of the
-- landscape schema. Duplicate indexes waste storage and slow down writes.
--
-- SAFETY RULES APPLIED:
-- 1. Index ownership determined ONLY from pg_constraint.conindid (CSV: is_constraint_owned)
-- 2. NEVER drop constraint-owned indexes directly (use ALTER TABLE DROP CONSTRAINT instead)
-- 3. Keeper selection: constraint-owned > shortest conventional name > alphabetical
-- 4. All drops use IF EXISTS (idempotent)
-- 5. NO CASCADE used

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Table: knowledge_facts
-- Index definition: btree (object_entity_id)
-- Keeper: knowledge_f_object__4cb694_idx (not constraint-owned)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS landscape.knowledge_facts_object_entity_id_ca9e8ef5;

-- ----------------------------------------------------------------------------
-- Table: knowledge_sessions
-- Index definition: btree (session_start)
-- Keeper: knowledge_s_session_5b8f09_idx (not constraint-owned)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS landscape.knowledge_sessions_session_start_740f4f0a;

-- ----------------------------------------------------------------------------
-- Table: land_use_pricing
-- Index definition: UNIQUE btree (project_id, lu_type_code, product_code)
-- Keeper: land_use_pricing_project_lu_product_key (constraint-owned: land_use_pricing_project_lu_product_key, type: u)
-- NOTE: Dropping duplicate UNIQUE constraint (which auto-drops its backing index)
-- ----------------------------------------------------------------------------
ALTER TABLE landscape.land_use_pricing
  DROP CONSTRAINT IF EXISTS land_use_pricing_project_type_product_key;

-- ----------------------------------------------------------------------------
-- Table: landscaper_activity
-- Index definition: btree (project_id, created_at DESC)
-- Keeper: idx_landscaper_activity_created (not constraint-owned)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS landscape.idx_landscaper_activity_project_created;

-- ----------------------------------------------------------------------------
-- Table: landscaper_activity
-- Index definition: btree (project_id, is_read)
-- Keeper: idx_landscaper_activity_read (not constraint-owned)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS landscape.idx_landscaper_activity_project_read;

-- ----------------------------------------------------------------------------
-- Table: mkt_new_home_project
-- Index definition: btree (source_id)
-- Keeper: idx_mkt_nhp_source (not constraint-owned)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS landscape.mkt_new_home_project_source_id_cbf21c81;

-- ----------------------------------------------------------------------------
-- Table: mkt_permit_history
-- Index definition: btree (source_id)
-- Keeper: idx_mkt_permit_source (not constraint-owned)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS landscape.mkt_permit_history_source_id_4d1eb402;

-- ----------------------------------------------------------------------------
-- Table: tbl_cre_lease
-- Index definition: btree (tenant_id)
-- Keeper: idx_cre_lease_tenant (not constraint-owned)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS landscape.idx_cre_lease_tenant_id;

-- ----------------------------------------------------------------------------
-- Table: tbl_cre_space
-- Index definition: btree (cre_property_id)
-- Keeper: idx_cre_space_property (not constraint-owned)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS landscape.idx_cre_space_property_id;

-- ----------------------------------------------------------------------------
-- Table: tbl_debt_facility
-- Index definition: btree (project_id)
-- Keeper: idx_debt_project (not constraint-owned)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS landscape.idx_debt_facility_project;

-- ----------------------------------------------------------------------------
-- Table: tbl_project_assumption
-- Index definition: UNIQUE btree (project_id, assumption_key)
-- Keeper: uq_project_assumption (constraint-owned: uq_project_assumption, type: u)
-- NOTE: Dropping duplicate UNIQUE constraint (which auto-drops its backing index)
-- ----------------------------------------------------------------------------
ALTER TABLE landscape.tbl_project_assumption
  DROP CONSTRAINT IF EXISTS uq_project_assumption_key;

-- ----------------------------------------------------------------------------
-- Table: tbl_sale_settlement
-- Index definition: btree (container_id)
-- Keeper: idx_settlement_container (not constraint-owned)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS landscape.idx_sale_settlement_container;

-- ----------------------------------------------------------------------------
-- Table: tbl_user_preference
-- Index definition: btree (preference_key)
-- Keeper: tbl_user_pr_prefere_c180c6_idx (not constraint-owned)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS landscape.tbl_user_preference_preference_key_328aa664;

COMMIT;

-- ============================================================================
-- DOWN MIGRATION (ROLLBACK)
-- ============================================================================

-- To rollback, recreate the dropped indexes and constraints:
/*
BEGIN;

-- knowledge_facts
CREATE INDEX knowledge_facts_object_entity_id_ca9e8ef5 ON landscape.knowledge_facts USING btree (object_entity_id);

-- knowledge_sessions
CREATE INDEX knowledge_sessions_session_start_740f4f0a ON landscape.knowledge_sessions USING btree (session_start);

-- land_use_pricing (recreate duplicate constraint)
ALTER TABLE landscape.land_use_pricing
  ADD CONSTRAINT land_use_pricing_project_type_product_key UNIQUE (project_id, lu_type_code, product_code);

-- landscaper_activity
CREATE INDEX idx_landscaper_activity_project_created ON landscape.landscaper_activity USING btree (project_id, created_at DESC);
CREATE INDEX idx_landscaper_activity_project_read ON landscape.landscaper_activity USING btree (project_id, is_read);

-- mkt_new_home_project
CREATE INDEX mkt_new_home_project_source_id_cbf21c81 ON landscape.mkt_new_home_project USING btree (source_id);

-- mkt_permit_history
CREATE INDEX mkt_permit_history_source_id_4d1eb402 ON landscape.mkt_permit_history USING btree (source_id);

-- tbl_cre_lease
CREATE INDEX idx_cre_lease_tenant_id ON landscape.tbl_cre_lease USING btree (tenant_id);

-- tbl_cre_space
CREATE INDEX idx_cre_space_property_id ON landscape.tbl_cre_space USING btree (cre_property_id);

-- tbl_debt_facility
CREATE INDEX idx_debt_facility_project ON landscape.tbl_debt_facility USING btree (project_id);

-- tbl_project_assumption (recreate duplicate constraint)
ALTER TABLE landscape.tbl_project_assumption
  ADD CONSTRAINT uq_project_assumption_key UNIQUE (project_id, assumption_key);

-- tbl_sale_settlement
CREATE INDEX idx_sale_settlement_container ON landscape.tbl_sale_settlement USING btree (container_id);

-- tbl_user_preference
CREATE INDEX tbl_user_preference_preference_key_328aa664 ON landscape.tbl_user_preference USING btree (preference_key);

COMMIT;
*/

-- ============================================================================
-- VERIFICATION QUERY
-- Re-detect duplicate index groups after migration
-- ============================================================================
/*
WITH idx AS (
  SELECT
    t.relname AS table_name,
    i.relname AS index_name,
    pg_get_indexdef(i.oid) AS indexdef,
    EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.oid) AS is_constraint_owned
  FROM pg_class i
  JOIN pg_index ix ON ix.indexrelid = i.oid
  JOIN pg_class t ON t.oid = ix.indrelid
  JOIN pg_namespace ns ON ns.oid = t.relnamespace
  WHERE ns.nspname = 'landscape'
    AND t.relkind IN ('r','p')
),
normalized AS (
  SELECT
    table_name,
    index_name,
    indexdef,
    is_constraint_owned,
    -- Normalize: remove index name from definition
    regexp_replace(indexdef, 'INDEX\s+\S+\s+ON', 'INDEX ON') AS normalized_def
  FROM idx
)
SELECT
  table_name,
  COUNT(*) AS duplicate_count,
  array_agg(index_name ORDER BY index_name) AS index_names
FROM normalized
GROUP BY table_name, normalized_def
HAVING COUNT(*) > 1
ORDER BY table_name;

-- Expected result after migration: 0 rows (no duplicates remaining)
*/
