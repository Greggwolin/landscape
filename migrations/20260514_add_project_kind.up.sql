-- ============================================================================
-- Migration: 20260514_add_project_kind.up.sql
-- Purpose:   Add project_kind discriminator to tbl_project so user "home"
--            projects can coexist with real estate projects in the same table
--            without polluting real-estate-scoped queries.
--
--            User home projects are placeholder rows that exist solely to give
--            non-project chat threads a parent project_id (the threads FK is
--            NOT NULL). They never carry property, financial, or comparable
--            data. The kind column is the binary flag that real-estate queries
--            and Landscaper financial tools use to skip these rows.
--
-- Refs:      LF-USERDASH-0514 v2 Phase 2.
--            Companion spec: workspace/LF-USERDASH-0514.md §"User Project".
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- ============================================================================

SET search_path TO landscape, public;

-- ── Column ──────────────────────────────────────────────────────────────────
-- VARCHAR with explicit CHECK constraint over enum-style values. CHECK chosen
-- over Postgres ENUM type so we can add new kinds later without an ALTER TYPE
-- (e.g., 'system', 'shared', 'template' someday).
ALTER TABLE landscape.tbl_project
  ADD COLUMN IF NOT EXISTS project_kind VARCHAR(20) NOT NULL DEFAULT 'real_estate';

-- Drop-and-recreate the check so re-runs converge to the current valid-value
-- list without erroring on duplicate constraint names.
ALTER TABLE landscape.tbl_project
  DROP CONSTRAINT IF EXISTS chk_tbl_project_kind;

ALTER TABLE landscape.tbl_project
  ADD CONSTRAINT chk_tbl_project_kind
  CHECK (project_kind IN ('real_estate', 'user_home'));

-- ── Index ───────────────────────────────────────────────────────────────────
-- Partial index optimized for the dominant query: "list real estate projects
-- the user can see." Project lists, dropdowns, comp lookups, financial loops
-- all read with project_kind = 'real_estate' filter.
CREATE INDEX IF NOT EXISTS idx_tbl_project_kind_real_estate
  ON landscape.tbl_project (project_kind, is_active, project_id)
  WHERE project_kind = 'real_estate';

-- Reverse-direction index for the "find this user's home project" lookup,
-- which keys off (created_by_id, project_kind).
CREATE INDEX IF NOT EXISTS idx_tbl_project_user_home
  ON landscape.tbl_project (created_by_id, project_kind)
  WHERE project_kind = 'user_home';

-- ── Documentation ───────────────────────────────────────────────────────────
COMMENT ON COLUMN landscape.tbl_project.project_kind IS
  'Project discriminator. ''real_estate'' = a real CRE/land project with property and financial data. ''user_home'' = placeholder row owning a user''s non-project chat threads (no property data). Real-estate-scoped queries filter on project_kind = ''real_estate''. See LF-USERDASH-0514.';
