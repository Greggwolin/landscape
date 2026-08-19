-- Migration: Create doc_geo_tag table for independent document geographic tagging
-- Date: 2026-02-13
-- Purpose: Documents need independent geographic tagging for Knowledge Library faceted search

-- ============================================================================
-- UP
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.doc_geo_tag (
    doc_geo_tag_id  SERIAL PRIMARY KEY,
    doc_id          INTEGER NOT NULL REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,
    geo_level       VARCHAR(20) NOT NULL,   -- 'country', 'region', 'state', 'msa', 'county', 'city'
    geo_value       VARCHAR(100) NOT NULL,  -- 'US', 'West', 'Arizona', 'Phoenix-Mesa-Chandler', 'Maricopa', 'Phoenix'
    geo_source      VARCHAR(20) DEFAULT 'inferred',  -- 'inferred' (from project), 'ai_extracted', 'user_assigned'
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(doc_id, geo_level, geo_value)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_doc_geo_tag_doc ON landscape.doc_geo_tag(doc_id);
CREATE INDEX IF NOT EXISTS idx_doc_geo_tag_level_value ON landscape.doc_geo_tag(geo_level, geo_value);

-- ============================================================================
-- DOWN (Rollback)
-- ============================================================================
-- DROP INDEX IF EXISTS landscape.idx_doc_geo_tag_level_value;
-- DROP INDEX IF EXISTS landscape.idx_doc_geo_tag_doc;
-- DROP TABLE IF EXISTS landscape.doc_geo_tag;
