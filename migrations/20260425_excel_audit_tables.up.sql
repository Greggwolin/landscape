-- ============================================================================
-- Migration: 20260425_excel_audit_tables.sql
-- Purpose:   Storage for Excel audit pipeline (Phases 4-7).
--            Adds tbl_excel_audit + tbl_excel_audit_finding, and the
--            source_cell column on ai_extraction_staging called for in
--            docs/14-specifications/chat-canvas-and-excel-audit.md §3.6.
-- Phase 4 (waterfall classifier) needs these tables to persist results
-- across sessions; Phases 5-7 will write to the same tables incrementally.
--
-- Idempotent: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so re-running
-- against a partially-applied environment is safe.
-- ============================================================================

SET search_path TO landscape, public;

-- ────────────────────────────────────────────────────────────────────────────
-- UP
-- ────────────────────────────────────────────────────────────────────────────

-- 1. tbl_excel_audit — one row per audited core_doc
CREATE TABLE IF NOT EXISTS landscape.tbl_excel_audit (
    audit_id            BIGSERIAL PRIMARY KEY,
    doc_id              BIGINT NOT NULL,
    project_id          BIGINT NULL,
    tier                TEXT NULL,
    waterfall_class     JSONB NULL,
    replication         JSONB NULL,
    sources_uses        JSONB NULL,
    trust_score         NUMERIC(5, 2) NULL,
    report_html_path    TEXT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tbl_excel_audit_doc_unique UNIQUE (doc_id),
    CONSTRAINT tbl_excel_audit_tier_check CHECK (
        tier IS NULL OR tier IN ('flat', 'assumption_heavy', 'full_model')
    ),
    CONSTRAINT tbl_excel_audit_trust_range CHECK (
        trust_score IS NULL OR (trust_score >= 0 AND trust_score <= 100)
    )
);

COMMENT ON TABLE  landscape.tbl_excel_audit IS
    'Excel audit pipeline results (Phases 4-7). One row per core_doc.';
COMMENT ON COLUMN landscape.tbl_excel_audit.tier IS
    'Phase 0 classification: flat | assumption_heavy | full_model';
COMMENT ON COLUMN landscape.tbl_excel_audit.waterfall_class IS
    'Phase 4 output: waterfall_type, tiers, pref rate, splits, source_cells';
COMMENT ON COLUMN landscape.tbl_excel_audit.replication IS
    'Phase 5 output: cell-by-cell Excel-vs-Python comparison; phase_5b debt nested under "debt" key';
COMMENT ON COLUMN landscape.tbl_excel_audit.sources_uses IS
    'Phase 6 output: located/built S&U schedule + balance check';
COMMENT ON COLUMN landscape.tbl_excel_audit.trust_score IS
    'Phase 7 output: weighted 0-100 trust score';

CREATE INDEX IF NOT EXISTS idx_tbl_excel_audit_doc_id
    ON landscape.tbl_excel_audit (doc_id);
CREATE INDEX IF NOT EXISTS idx_tbl_excel_audit_project_id
    ON landscape.tbl_excel_audit (project_id)
    WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tbl_excel_audit_updated_at
    ON landscape.tbl_excel_audit (updated_at DESC);

-- 2. tbl_excel_audit_finding — denormalized findings across all phases
CREATE TABLE IF NOT EXISTS landscape.tbl_excel_audit_finding (
    finding_id          BIGSERIAL PRIMARY KEY,
    audit_id            BIGINT NOT NULL,
    phase               TEXT NOT NULL,
    severity            TEXT NOT NULL DEFAULT 'low',
    category            TEXT NOT NULL DEFAULT 'general',
    sheet_cell          TEXT NULL,
    message             TEXT NOT NULL,
    feeds_outputs       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tbl_excel_audit_finding_audit_fk
        FOREIGN KEY (audit_id)
        REFERENCES landscape.tbl_excel_audit (audit_id)
        ON DELETE CASCADE,
    CONSTRAINT tbl_excel_audit_finding_phase_check CHECK (
        phase IN ('phase_4', 'phase_5', 'phase_5b', 'phase_6', 'phase_7')
    ),
    CONSTRAINT tbl_excel_audit_finding_severity_check CHECK (
        severity IN ('critical', 'high', 'medium', 'low')
    )
);

COMMENT ON TABLE landscape.tbl_excel_audit_finding IS
    'Denormalized findings emitted by Excel audit phases 4-7. Re-runs of a phase replace prior findings for that (audit_id, phase) pair.';

CREATE INDEX IF NOT EXISTS idx_tbl_excel_audit_finding_audit_id
    ON landscape.tbl_excel_audit_finding (audit_id);
CREATE INDEX IF NOT EXISTS idx_tbl_excel_audit_finding_severity
    ON landscape.tbl_excel_audit_finding (severity)
    WHERE severity IN ('critical', 'high');

-- 3. ai_extraction_staging.source_cell column (per spec §3.6.1)
-- Used by Phase 3 (assumption extractor) and any future phase that stages
-- Excel-derived rows. Closes the post-alpha source_page gap for Excel files.
ALTER TABLE landscape.ai_extraction_staging
    ADD COLUMN IF NOT EXISTS source_cell TEXT NULL;

COMMENT ON COLUMN landscape.ai_extraction_staging.source_cell IS
    'Sheet!Cell reference for Excel-extracted values, e.g. "Assumptions!B47". NULL for non-Excel sources.';

CREATE INDEX IF NOT EXISTS idx_ai_extraction_staging_source_cell
    ON landscape.ai_extraction_staging (source_cell)
    WHERE source_cell IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- DOWN  (manual rollback — uncomment and run separately if needed)
-- ────────────────────────────────────────────────────────────────────────────
--
-- DROP INDEX IF EXISTS landscape.idx_ai_extraction_staging_source_cell;
-- ALTER TABLE landscape.ai_extraction_staging DROP COLUMN IF EXISTS source_cell;
--
-- DROP INDEX IF EXISTS landscape.idx_tbl_excel_audit_finding_severity;
-- DROP INDEX IF EXISTS landscape.idx_tbl_excel_audit_finding_audit_id;
-- DROP TABLE IF EXISTS landscape.tbl_excel_audit_finding;
--
-- DROP INDEX IF EXISTS landscape.idx_tbl_excel_audit_updated_at;
-- DROP INDEX IF EXISTS landscape.idx_tbl_excel_audit_project_id;
-- DROP INDEX IF EXISTS landscape.idx_tbl_excel_audit_doc_id;
-- DROP TABLE IF EXISTS landscape.tbl_excel_audit;
