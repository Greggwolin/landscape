-- Migration: Create ingestion_source_authority table
-- Tracks implicit authority from user conflict resolution in Ingestion Workbench
-- Date: 2026-03-06

-- ====================== UP ======================

CREATE TABLE IF NOT EXISTS landscape.ingestion_source_authority (
    id              BIGSERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    source_a_doc_id INTEGER,          -- trusted document (accepted)
    source_b_doc_id INTEGER,          -- overridden document (rejected)
    field_key       VARCHAR(100),     -- specific field, or NULL for whole-document authority
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      INTEGER           -- user ID
);

CREATE INDEX IF NOT EXISTS idx_source_authority_project
    ON landscape.ingestion_source_authority (project_id);

CREATE INDEX IF NOT EXISTS idx_source_authority_docs
    ON landscape.ingestion_source_authority (source_a_doc_id, source_b_doc_id);

-- ====================== DOWN ======================
-- DROP TABLE IF EXISTS landscape.ingestion_source_authority;
