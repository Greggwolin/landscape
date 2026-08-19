-- Migration 037: Add landscaper_activity table for activity feed
-- Phase 3 of Landscaper integration

-- ─────────────────────────────────────────────────────────────────────────────
-- UP Migration
-- ─────────────────────────────────────────────────────────────────────────────

-- Create landscaper_activity table
CREATE TABLE IF NOT EXISTS landscape.landscaper_activity (
    activity_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('status', 'decision', 'update', 'alert')),
    title VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('complete', 'partial', 'blocked', 'pending')),
    confidence VARCHAR(20) CHECK (confidence IN ('high', 'medium', 'low') OR confidence IS NULL),
    link VARCHAR(255),
    blocked_by TEXT,
    details JSONB,
    highlight_fields JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    source_type VARCHAR(50),
    source_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_landscaper_activity_project_created
    ON landscape.landscaper_activity(project_id, created_at DESC);

CREATE INDEX idx_landscaper_activity_project_read
    ON landscape.landscaper_activity(project_id, is_read);

CREATE INDEX idx_landscaper_activity_source
    ON landscape.landscaper_activity(source_type, source_id);

-- Add comment
COMMENT ON TABLE landscape.landscaper_activity IS 'Activity feed items for Landscaper panel - tracks document extractions, analysis status, and user decisions';

-- Seed some sample activities for testing (project_id = 1)
INSERT INTO landscape.landscaper_activity
    (project_id, activity_type, title, summary, status, confidence, link, details, is_read, created_at)
VALUES
    (1, 'status', 'Market Analysis', 'Absorption 4.2/mo, pricing $52-58K supported by comps', 'complete', 'high', '/planning/market',
     '["Based on Zonda Nov 2025 data", "3 comparable subdivisions analyzed"]'::jsonb, false, NOW()),
    (1, 'status', 'Budget', '$18.2M total development cost', 'partial', 'medium', '/budget',
     '["Using regional benchmarks for grading", "No civil engineer estimate uploaded"]'::jsonb, false, NOW() - INTERVAL '1 hour'),
    (1, 'decision', 'Underwriting', 'Cannot complete feasibility analysis', 'blocked', NULL, NULL,
     NULL, true, NOW() - INTERVAL '2 hours'),
    (1, 'update', 'Documents', '12 files ingested, 3 issues', 'partial', NULL, '/documents',
     '["8 fully processed", "3 partial extraction", "1 conflict detected"]'::jsonb, true, NOW() - INTERVAL '3 hours');

-- Update blocked_by for the blocked item
UPDATE landscape.landscaper_activity
SET blocked_by = 'Need target IRR and hold period'
WHERE project_id = 1 AND title = 'Underwriting';


-- ─────────────────────────────────────────────────────────────────────────────
-- DOWN Migration (Rollback)
-- ─────────────────────────────────────────────────────────────────────────────

-- To rollback, run:
-- DROP TABLE IF EXISTS landscape.landscaper_activity CASCADE;
