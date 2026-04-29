-- ============================================================================
-- Migration: 20260429_create_artifact_tables.up.sql
-- Purpose:   Storage foundation for the generative artifact system
--            (Finding #4, Phase 1).
--
--            Adds:
--              - tbl_artifact: latest schema + metadata for each artifact
--              - tbl_artifact_version: append-only version log
--              - tbl_project.artifact_cascade_mode: per-project cascade flag
--                ('manual' | 'auto', default 'auto'). Phase 1 only adds the
--                column; Phase 4 wires the cascade behavior.
--
-- Refs:      Landscape app/SPEC_FINDING4_GENERATIVE_ARTIFACTS.md §5
--
-- Idempotent:
--   - Tables / indexes use IF NOT EXISTS.
--   - tbl_project ALTERs use ADD COLUMN IF NOT EXISTS and the runner's
--     pg_constraint intercept for the CHECK constraint.
-- ============================================================================

SET search_path TO landscape, public;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. tbl_project.artifact_cascade_mode
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE landscape.tbl_project
  ADD COLUMN IF NOT EXISTS artifact_cascade_mode VARCHAR(10) NOT NULL DEFAULT 'auto';

ALTER TABLE landscape.tbl_project
  ADD CONSTRAINT IF NOT EXISTS tbl_project_artifact_cascade_mode_check
  CHECK (artifact_cascade_mode IN ('manual', 'auto'));

COMMENT ON COLUMN landscape.tbl_project.artifact_cascade_mode IS
  'Generative artifacts: how cascading updates propagate. auto = silent cascade (default); manual = notify and wait for per-artifact refresh.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. tbl_artifact — latest schema + metadata
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS landscape.tbl_artifact (
    artifact_id          BIGSERIAL PRIMARY KEY,
    project_id           INTEGER NULL REFERENCES landscape.tbl_project(project_id) ON DELETE SET NULL,
    thread_id            UUID NULL,
    tool_name            VARCHAR(50) NOT NULL,
    params_json          JSONB NOT NULL,
    current_state_json   JSONB NOT NULL,
    source_pointers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    edit_target_json     JSONB NULL,
    title                VARCHAR(255) NOT NULL,
    pinned_label         VARCHAR(100) NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_edited_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id   VARCHAR(50) NOT NULL,
    is_archived          BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE landscape.tbl_artifact IS
  'Generative artifacts (Finding #4). Latest block-schema document plus metadata. Pre-project artifacts allowed via project_id IS NULL.';
COMMENT ON COLUMN landscape.tbl_artifact.current_state_json IS
  'Latest block document (vocabulary: section, table, key_value_grid, text). Append-only history lives in tbl_artifact_version.';
COMMENT ON COLUMN landscape.tbl_artifact.source_pointers_json IS
  'Per-row/cell DB row refs + capture timestamps. Drift detection and dependency lookup keyed off this.';

CREATE INDEX IF NOT EXISTS idx_artifact_project_recent
  ON landscape.tbl_artifact (project_id, last_edited_at DESC)
  WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_artifact_thread
  ON landscape.tbl_artifact (thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_artifact_pinned
  ON landscape.tbl_artifact (project_id, pinned_label)
  WHERE pinned_label IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. tbl_artifact_version — append-only version log
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS landscape.tbl_artifact_version (
    version_id         BIGSERIAL PRIMARY KEY,
    artifact_id        BIGINT NOT NULL REFERENCES landscape.tbl_artifact(artifact_id) ON DELETE CASCADE,
    version_seq        INTEGER NOT NULL,
    edited_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_by_user_id  VARCHAR(50) NOT NULL,
    edit_source        VARCHAR(20) NOT NULL,
    state_diff_json    JSONB NOT NULL,
    UNIQUE (artifact_id, version_seq)
);

ALTER TABLE landscape.tbl_artifact_version
  ADD CONSTRAINT IF NOT EXISTS tbl_artifact_version_edit_source_check
  CHECK (edit_source IN ('create', 'user_edit', 'modal_save', 'drift_pull', 'restore', 'extraction_commit', 'cascade'));

COMMENT ON TABLE landscape.tbl_artifact_version IS
  'Append-only version log. v1 stores full snapshots in state_diff_json (sized for ~30-row P&L = ~10KB). v2 may switch to RFC-6902 diffs.';
COMMENT ON COLUMN landscape.tbl_artifact_version.edit_source IS
  'create | user_edit | modal_save | drift_pull | restore | extraction_commit | cascade';

CREATE INDEX IF NOT EXISTS idx_artifact_version_artifact_recent
  ON landscape.tbl_artifact_version (artifact_id, version_seq DESC);

CREATE INDEX IF NOT EXISTS idx_artifact_version_artifact_time
  ON landscape.tbl_artifact_version (artifact_id, edited_at DESC);
