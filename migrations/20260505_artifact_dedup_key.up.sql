-- ============================================================================
-- Migration: 20260505_artifact_dedup_key.up.sql
-- Purpose:   Add dedup_key column to tbl_artifact for per-project-per-tool
--            deduplication on artifact create.
--
--            When a tool calls create_artifact_record with a non-null
--            dedup_key, the service layer looks up an existing matching
--            artifact by (project_id, tool_name, dedup_key) and routes to
--            update_artifact_record (versioned snapshot replacement) instead
--            of creating a duplicate row.
--
--            Tool authors opt in by passing a dedup_key to the service.
--            Empty string '' means "single canonical artifact per
--            (project_id, tool_name)" — the simple case for tools like
--            get_project_profile. Non-empty values give tools a way to
--            keep multiple parallel artifact slots per project (e.g.,
--            operating statement subtypes: 't12', 'f12_proforma',
--            'current_proforma' — each gets its own slot).
--
--            NULL means "no dedup" — the legacy behavior. The model's
--            freeform create_artifact tool keeps NULL so each call creates
--            a new row.
--
-- Refs:      Chat PV52 / PV53 dedup-on-create design conversation.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.tbl_artifact
  ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(100) NULL;

-- Lookup pattern: (project_id, tool_name, dedup_key) WHERE is_archived=FALSE
-- Partial index: archived rows aren't candidates for dedup matching.
CREATE INDEX IF NOT EXISTS idx_artifact_dedup_lookup
  ON landscape.tbl_artifact (project_id, tool_name, dedup_key)
  WHERE is_archived = FALSE AND dedup_key IS NOT NULL;

COMMENT ON COLUMN landscape.tbl_artifact.dedup_key IS
  'Per-tool deduplication key. NULL = no dedup (legacy / freeform create_artifact). '
  'Empty string = single canonical artifact per (project_id, tool_name). '
  'Non-empty string = additional dimension (e.g., operating statement subtype). '
  'See create_artifact_record() in apps/artifacts/services.py.';
