-- Landscaper Intelligence v1 — Phase 1 Database Migrations
-- Branch: feature/landscaper-intelligence-v1
-- Date: 2026-02-24
-- Pre-flight verified: All queries confirmed against live schema
--
-- INSTRUCTIONS:
-- 1. Create Neon branch from main: feature/landscaper-intelligence-v1
-- 2. Run this migration against the branch
-- 3. Verify with post-flight queries at bottom of file
-- 4. Once clean, apply to main
--
-- ROLLBACK: See bottom of file for reverse migration

-- ============================================================
-- 1.1 New Table: tbl_intake_session
-- ============================================================
CREATE TABLE landscape.tbl_intake_session (
  intake_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  intake_uuid     UUID DEFAULT gen_random_uuid() NOT NULL,
  project_id      INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  doc_id          BIGINT REFERENCES landscape.core_doc(doc_id) ON DELETE SET NULL,
  document_type   VARCHAR(50),
  status          VARCHAR(30) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','mapping_complete','values_complete','committed','abandoned')),
  created_by      INTEGER REFERENCES landscape.auth_user(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_intake_session_project ON landscape.tbl_intake_session(project_id);
CREATE INDEX idx_intake_session_doc ON landscape.tbl_intake_session(doc_id);
CREATE UNIQUE INDEX idx_intake_session_uuid ON landscape.tbl_intake_session(intake_uuid);

COMMENT ON TABLE landscape.tbl_intake_session IS 'Tracks document intake workflow sessions for Landscaper Intelligence v1';

-- ============================================================
-- 1.2 New Table: tbl_model_override
-- ============================================================
CREATE TABLE landscape.tbl_model_override (
  override_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id        INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  division_id       BIGINT REFERENCES landscape.tbl_division(division_id) ON DELETE CASCADE,
  unit_id           INTEGER REFERENCES landscape.tbl_multifamily_unit(unit_id) ON DELETE CASCADE,
  field_key         VARCHAR(100) NOT NULL,
  calculated_value  TEXT,
  override_value    TEXT NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  toggled_by        INTEGER REFERENCES landscape.auth_user(id) ON DELETE SET NULL,
  toggled_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_model_override_project ON landscape.tbl_model_override(project_id);
CREATE INDEX idx_model_override_field ON landscape.tbl_model_override(project_id, field_key);
CREATE INDEX idx_model_override_division ON landscape.tbl_model_override(division_id) WHERE division_id IS NOT NULL;
CREATE INDEX idx_model_override_unit ON landscape.tbl_model_override(unit_id) WHERE unit_id IS NOT NULL;

COMMENT ON TABLE landscape.tbl_model_override IS 'Calculated field overrides — red dot governance for Landscaper Intelligence v1';
COMMENT ON COLUMN landscape.tbl_model_override.field_key IS 'References field_registry field_key; must have field_role=output to qualify for override';

-- ============================================================
-- 1.3 Extend pending_mutations
-- ============================================================

-- Add source_type column (orthogonal to mutation_type)
ALTER TABLE landscape.pending_mutations
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(30);

-- Add CHECK constraint for source_type (separate statement for IF NOT EXISTS compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'landscape.pending_mutations'::regclass
      AND conname = 'pending_mutations_source_type_check'
  ) THEN
    ALTER TABLE landscape.pending_mutations
      ADD CONSTRAINT pending_mutations_source_type_check
        CHECK (source_type IN ('ai_extraction','user_manual','benchmark','override_toggle','revert'));
  END IF;
END $$;

-- Add scope columns for polymorphic targeting
ALTER TABLE landscape.pending_mutations
  ADD COLUMN IF NOT EXISTS division_id BIGINT;
ALTER TABLE landscape.pending_mutations
  ADD COLUMN IF NOT EXISTS unit_id INTEGER;

-- Add FK constraints only if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'landscape.pending_mutations'::regclass
      AND conname = 'pending_mutations_division_id_fkey'
  ) THEN
    ALTER TABLE landscape.pending_mutations
      ADD CONSTRAINT pending_mutations_division_id_fkey
        FOREIGN KEY (division_id) REFERENCES landscape.tbl_division(division_id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'landscape.pending_mutations'::regclass
      AND conname = 'pending_mutations_unit_id_fkey'
  ) THEN
    ALTER TABLE landscape.pending_mutations
      ADD CONSTRAINT pending_mutations_unit_id_fkey
        FOREIGN KEY (unit_id) REFERENCES landscape.tbl_multifamily_unit(unit_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Extend mutation_type CHECK to include override_toggle and revert
-- Pre-flight confirmed current constraint has 13 values; adding 2 more
ALTER TABLE landscape.pending_mutations
  DROP CONSTRAINT IF EXISTS pending_mutations_mutation_type_check;

ALTER TABLE landscape.pending_mutations
  ADD CONSTRAINT pending_mutations_mutation_type_check
    CHECK (mutation_type IN (
      'field_update','bulk_update','opex_upsert','rental_comp_upsert',
      'assumption_upsert','rent_roll_batch','comparable_upsert','comparable_delete',
      'capital_stack_upsert','capital_stack_delete','budget_upsert','budget_delete',
      'unit_delete','override_toggle','revert'
    ));

-- ============================================================
-- 1.3b Extend mutation_audit_log with source_type
-- ============================================================
ALTER TABLE landscape.mutation_audit_log
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(30);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'landscape.mutation_audit_log'::regclass
      AND conname = 'mutation_audit_log_source_type_check'
  ) THEN
    ALTER TABLE landscape.mutation_audit_log
      ADD CONSTRAINT mutation_audit_log_source_type_check
        CHECK (source_type IN ('ai_extraction','user_manual','benchmark','override_toggle','revert'));
  END IF;
END $$;

-- ============================================================
-- 1.4 Extend tbl_dynamic_column_definition
-- ============================================================
ALTER TABLE landscape.tbl_dynamic_column_definition
  ADD COLUMN IF NOT EXISTS scope VARCHAR(50);

ALTER TABLE landscape.tbl_dynamic_column_definition
  ADD COLUMN IF NOT EXISTS is_calculable BOOLEAN NOT NULL DEFAULT FALSE;

-- created_from_doc_id may overlap with existing proposed_from_document column
-- Check if proposed_from_document_id already serves this role
ALTER TABLE landscape.tbl_dynamic_column_definition
  ADD COLUMN IF NOT EXISTS created_from_doc_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'landscape.tbl_dynamic_column_definition'::regclass
      AND conname = 'tbl_dynamic_column_definition_created_from_doc_id_fkey'
  ) THEN
    ALTER TABLE landscape.tbl_dynamic_column_definition
      ADD CONSTRAINT tbl_dynamic_column_definition_created_from_doc_id_fkey
        FOREIGN KEY (created_from_doc_id) REFERENCES landscape.core_doc(doc_id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 1.5 Add value_source to target tables
-- ============================================================

-- Minimum required set
ALTER TABLE landscape.tbl_project
  ADD COLUMN IF NOT EXISTS value_source VARCHAR(20);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'landscape.tbl_project'::regclass AND conname = 'tbl_project_value_source_check') THEN
    ALTER TABLE landscape.tbl_project ADD CONSTRAINT tbl_project_value_source_check CHECK (value_source IN ('ai_extraction','user_manual','benchmark','import'));
  END IF;
END $$;

ALTER TABLE landscape.core_fin_fact_budget
  ADD COLUMN IF NOT EXISTS value_source VARCHAR(20);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'landscape.core_fin_fact_budget'::regclass AND conname = 'core_fin_fact_budget_value_source_check') THEN
    ALTER TABLE landscape.core_fin_fact_budget ADD CONSTRAINT core_fin_fact_budget_value_source_check CHECK (value_source IN ('ai_extraction','user_manual','benchmark','import'));
  END IF;
END $$;

ALTER TABLE landscape.tbl_project_assumption
  ADD COLUMN IF NOT EXISTS value_source VARCHAR(20);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'landscape.tbl_project_assumption'::regclass AND conname = 'tbl_project_assumption_value_source_check') THEN
    ALTER TABLE landscape.tbl_project_assumption ADD CONSTRAINT tbl_project_assumption_value_source_check CHECK (value_source IN ('ai_extraction','user_manual','benchmark','import'));
  END IF;
END $$;

ALTER TABLE landscape.tbl_operating_expenses
  ADD COLUMN IF NOT EXISTS value_source VARCHAR(20);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'landscape.tbl_operating_expenses'::regclass AND conname = 'tbl_operating_expenses_value_source_check') THEN
    ALTER TABLE landscape.tbl_operating_expenses ADD CONSTRAINT tbl_operating_expenses_value_source_check CHECK (value_source IN ('ai_extraction','user_manual','benchmark','import'));
  END IF;
END $$;

ALTER TABLE landscape.tbl_multifamily_unit
  ADD COLUMN IF NOT EXISTS value_source VARCHAR(20);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'landscape.tbl_multifamily_unit'::regclass AND conname = 'tbl_multifamily_unit_value_source_check') THEN
    ALTER TABLE landscape.tbl_multifamily_unit ADD CONSTRAINT tbl_multifamily_unit_value_source_check CHECK (value_source IN ('ai_extraction','user_manual','benchmark','import'));
  END IF;
END $$;

-- Extended set
ALTER TABLE landscape.tbl_multifamily_unit_type
  ADD COLUMN IF NOT EXISTS value_source VARCHAR(20);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'landscape.tbl_multifamily_unit_type'::regclass AND conname = 'tbl_multifamily_unit_type_value_source_check') THEN
    ALTER TABLE landscape.tbl_multifamily_unit_type ADD CONSTRAINT tbl_multifamily_unit_type_value_source_check CHECK (value_source IN ('ai_extraction','user_manual','benchmark','import'));
  END IF;
END $$;

ALTER TABLE landscape.tbl_acreage_allocation
  ADD COLUMN IF NOT EXISTS value_source VARCHAR(20);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'landscape.tbl_acreage_allocation'::regclass AND conname = 'tbl_acreage_allocation_value_source_check') THEN
    ALTER TABLE landscape.tbl_acreage_allocation ADD CONSTRAINT tbl_acreage_allocation_value_source_check CHECK (value_source IN ('ai_extraction','user_manual','benchmark','import'));
  END IF;
END $$;

-- ============================================================
-- POST-FLIGHT VERIFICATION QUERIES
-- Run these after migration to confirm success
-- ============================================================

-- V1: New tables created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'landscape' AND table_name IN ('tbl_intake_session','tbl_model_override') ORDER BY table_name;
-- Expected: tbl_intake_session, tbl_model_override

-- V2: pending_mutations has new columns
-- SELECT column_name FROM information_schema.columns WHERE table_schema = 'landscape' AND table_name = 'pending_mutations' AND column_name IN ('source_type','division_id','unit_id');
-- Expected: 3 rows

-- V3: mutation_audit_log has source_type
-- SELECT column_name FROM information_schema.columns WHERE table_schema = 'landscape' AND table_name = 'mutation_audit_log' AND column_name = 'source_type';
-- Expected: 1 row

-- V4: value_source columns added
-- SELECT table_name FROM information_schema.columns WHERE table_schema = 'landscape' AND column_name = 'value_source' ORDER BY table_name;
-- Expected: 7 tables

-- V5: No duplicate dynamic field tables
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'landscape' AND table_name LIKE '%dynamic%' ORDER BY table_name;
-- Expected: tbl_dynamic_column_definition, tbl_dynamic_column_value ONLY

-- V6: tbl_model_mutation was NOT created
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'landscape' AND table_name = 'tbl_model_mutation';
-- Expected: 0

-- V7: pending_mutations CHECK constraint includes new types
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'landscape.pending_mutations'::regclass AND conname = 'pending_mutations_mutation_type_check';
-- Expected: includes 'override_toggle' and 'revert'

-- ============================================================
-- ROLLBACK
-- ============================================================
-- To reverse this migration (in order):
--
-- ALTER TABLE landscape.tbl_acreage_allocation DROP COLUMN IF EXISTS value_source;
-- ALTER TABLE landscape.tbl_multifamily_unit_type DROP COLUMN IF EXISTS value_source;
-- ALTER TABLE landscape.tbl_multifamily_unit DROP COLUMN IF EXISTS value_source;
-- ALTER TABLE landscape.tbl_operating_expenses DROP COLUMN IF EXISTS value_source;
-- ALTER TABLE landscape.tbl_project_assumption DROP COLUMN IF EXISTS value_source;
-- ALTER TABLE landscape.core_fin_fact_budget DROP COLUMN IF EXISTS value_source;
-- ALTER TABLE landscape.tbl_project DROP COLUMN IF EXISTS value_source;
--
-- ALTER TABLE landscape.tbl_dynamic_column_definition DROP COLUMN IF EXISTS created_from_doc_id;
-- ALTER TABLE landscape.tbl_dynamic_column_definition DROP COLUMN IF EXISTS is_calculable;
-- ALTER TABLE landscape.tbl_dynamic_column_definition DROP COLUMN IF EXISTS scope;
--
-- ALTER TABLE landscape.mutation_audit_log DROP CONSTRAINT IF EXISTS mutation_audit_log_source_type_check;
-- ALTER TABLE landscape.mutation_audit_log DROP COLUMN IF EXISTS source_type;
--
-- ALTER TABLE landscape.pending_mutations DROP CONSTRAINT IF EXISTS pending_mutations_mutation_type_check;
-- ALTER TABLE landscape.pending_mutations ADD CONSTRAINT pending_mutations_mutation_type_check
--   CHECK (mutation_type IN ('field_update','bulk_update','opex_upsert','rental_comp_upsert',
--     'assumption_upsert','rent_roll_batch','comparable_upsert','comparable_delete',
--     'capital_stack_upsert','capital_stack_delete','budget_upsert','budget_delete','unit_delete'));
-- ALTER TABLE landscape.pending_mutations DROP CONSTRAINT IF EXISTS pending_mutations_unit_id_fkey;
-- ALTER TABLE landscape.pending_mutations DROP CONSTRAINT IF EXISTS pending_mutations_division_id_fkey;
-- ALTER TABLE landscape.pending_mutations DROP COLUMN IF EXISTS unit_id;
-- ALTER TABLE landscape.pending_mutations DROP COLUMN IF EXISTS division_id;
-- ALTER TABLE landscape.pending_mutations DROP CONSTRAINT IF EXISTS pending_mutations_source_type_check;
-- ALTER TABLE landscape.pending_mutations DROP COLUMN IF EXISTS source_type;
--
-- DROP TABLE IF EXISTS landscape.tbl_model_override;
-- DROP TABLE IF EXISTS landscape.tbl_intake_session;
