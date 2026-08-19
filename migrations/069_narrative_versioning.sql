-- Migration: 069_narrative_versioning.sql
-- Description: Add tables for narrative versioning, comments, and track changes
-- Date: 2026-01-22
-- Phase: UC6 Phase 2 - TipTap Editor with Track Changes

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- Narrative versions table
-- Stores each version of narrative content for valuation approaches
CREATE TABLE IF NOT EXISTS landscape.tbl_narrative_version (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    approach_type VARCHAR(50) NOT NULL,  -- 'sales_comparison', 'cost', 'income', 'reconciliation'
    version_number INTEGER NOT NULL,
    content JSONB NOT NULL,              -- TipTap JSON document
    content_html TEXT,                   -- Rendered HTML for display/export
    content_plain TEXT,                  -- Plain text for search/export
    status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'under_review', 'final'
    -- TODO: Add user references once auth system is implemented
    created_by INTEGER,                  -- Future FK to users table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, approach_type, version_number)
);

-- Index for fast lookups
CREATE INDEX idx_narrative_version_project_approach
ON landscape.tbl_narrative_version(project_id, approach_type);

CREATE INDEX idx_narrative_version_status
ON landscape.tbl_narrative_version(status);

-- Inline comments table
-- Stores user comments/questions within the narrative
CREATE TABLE IF NOT EXISTS landscape.tbl_narrative_comment (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES landscape.tbl_narrative_version(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    position_start INTEGER NOT NULL,     -- Character position in document
    position_end INTEGER NOT NULL,
    is_question BOOLEAN DEFAULT FALSE,   -- True if ends with ?
    is_resolved BOOLEAN DEFAULT FALSE,
    -- TODO: Add user references once auth system is implemented
    resolved_by INTEGER,                 -- Future FK to users table
    resolved_at TIMESTAMP WITH TIME ZONE,
    landscaper_response TEXT,            -- AI response to question
    created_by INTEGER,                  -- Future FK to users table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast comment lookups by version
CREATE INDEX idx_narrative_comment_version
ON landscape.tbl_narrative_comment(version_id);

CREATE INDEX idx_narrative_comment_unresolved
ON landscape.tbl_narrative_comment(version_id, is_resolved)
WHERE is_resolved = FALSE;

-- Track changes table (optional - changes can also be stored in content JSONB)
-- Stores individual text changes for diff visualization
CREATE TABLE IF NOT EXISTS landscape.tbl_narrative_change (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES landscape.tbl_narrative_version(id) ON DELETE CASCADE,
    change_type VARCHAR(20) NOT NULL,    -- 'addition', 'deletion'
    original_text TEXT,                  -- Original text (for deletions)
    new_text TEXT,                       -- New text (for additions)
    position_start INTEGER NOT NULL,
    position_end INTEGER NOT NULL,
    is_accepted BOOLEAN DEFAULT FALSE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast change lookups
CREATE INDEX idx_narrative_change_version
ON landscape.tbl_narrative_change(version_id);

CREATE INDEX idx_narrative_change_pending
ON landscape.tbl_narrative_change(version_id, is_accepted)
WHERE is_accepted = FALSE;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION landscape.update_narrative_version_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_narrative_version_timestamp
    BEFORE UPDATE ON landscape.tbl_narrative_version
    FOR EACH ROW
    EXECUTE FUNCTION landscape.update_narrative_version_timestamp();

-- Add check constraint for valid approach types
ALTER TABLE landscape.tbl_narrative_version
ADD CONSTRAINT chk_narrative_approach_type
CHECK (approach_type IN ('sales_comparison', 'cost', 'income', 'reconciliation'));

-- Add check constraint for valid status values
ALTER TABLE landscape.tbl_narrative_version
ADD CONSTRAINT chk_narrative_status
CHECK (status IN ('draft', 'under_review', 'final'));

-- Add check constraint for valid change types
ALTER TABLE landscape.tbl_narrative_change
ADD CONSTRAINT chk_narrative_change_type
CHECK (change_type IN ('addition', 'deletion'));

-- ============================================================================
-- DOWN MIGRATION (Rollback)
-- ============================================================================
-- To rollback this migration, run the following:
/*
DROP TRIGGER IF EXISTS trigger_update_narrative_version_timestamp ON landscape.tbl_narrative_version;
DROP FUNCTION IF EXISTS landscape.update_narrative_version_timestamp();
DROP TABLE IF EXISTS landscape.tbl_narrative_change;
DROP TABLE IF EXISTS landscape.tbl_narrative_comment;
DROP TABLE IF EXISTS landscape.tbl_narrative_version;
*/
