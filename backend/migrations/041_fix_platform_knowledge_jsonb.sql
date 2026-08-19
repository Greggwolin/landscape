-- Migration: Fix Platform Knowledge array columns to JSONB
-- Reason: Django JSONField requires JSONB, not TEXT[]
-- Date: 2026-01-12

-- Fix tbl_platform_knowledge.property_types
ALTER TABLE landscape.tbl_platform_knowledge
    ALTER COLUMN property_types DROP DEFAULT;

ALTER TABLE landscape.tbl_platform_knowledge
    ALTER COLUMN property_types TYPE JSONB
    USING COALESCE(to_jsonb(property_types), '[]'::jsonb);

ALTER TABLE landscape.tbl_platform_knowledge
    ALTER COLUMN property_types SET DEFAULT '[]'::jsonb;

-- Fix tbl_platform_knowledge_chapters.topics
ALTER TABLE landscape.tbl_platform_knowledge_chapters
    ALTER COLUMN topics DROP DEFAULT;

ALTER TABLE landscape.tbl_platform_knowledge_chapters
    ALTER COLUMN topics TYPE JSONB
    USING COALESCE(to_jsonb(topics), '[]'::jsonb);

ALTER TABLE landscape.tbl_platform_knowledge_chapters
    ALTER COLUMN topics SET DEFAULT '[]'::jsonb;

-- Fix tbl_platform_knowledge_chapters.property_types
ALTER TABLE landscape.tbl_platform_knowledge_chapters
    ALTER COLUMN property_types DROP DEFAULT;

ALTER TABLE landscape.tbl_platform_knowledge_chapters
    ALTER COLUMN property_types TYPE JSONB
    USING COALESCE(to_jsonb(property_types), '[]'::jsonb);

ALTER TABLE landscape.tbl_platform_knowledge_chapters
    ALTER COLUMN property_types SET DEFAULT '[]'::jsonb;

-- Fix tbl_platform_knowledge_chapters.applies_to
ALTER TABLE landscape.tbl_platform_knowledge_chapters
    ALTER COLUMN applies_to DROP DEFAULT;

ALTER TABLE landscape.tbl_platform_knowledge_chapters
    ALTER COLUMN applies_to TYPE JSONB
    USING COALESCE(to_jsonb(applies_to), '[]'::jsonb);

ALTER TABLE landscape.tbl_platform_knowledge_chapters
    ALTER COLUMN applies_to SET DEFAULT '[]'::jsonb;

-- Fix tbl_platform_knowledge_chapters.chunk_ids
ALTER TABLE landscape.tbl_platform_knowledge_chapters
    ALTER COLUMN chunk_ids DROP DEFAULT;

ALTER TABLE landscape.tbl_platform_knowledge_chapters
    ALTER COLUMN chunk_ids TYPE JSONB
    USING COALESCE(to_jsonb(chunk_ids), '[]'::jsonb);

ALTER TABLE landscape.tbl_platform_knowledge_chapters
    ALTER COLUMN chunk_ids SET DEFAULT '[]'::jsonb;

-- Create new GIN indexes for JSONB containment queries
CREATE INDEX IF NOT EXISTS idx_pk_chapters_topics_gin
ON landscape.tbl_platform_knowledge_chapters USING GIN (topics jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_pk_chapters_property_types_gin
ON landscape.tbl_platform_knowledge_chapters USING GIN (property_types jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_pk_document_property_types_gin
ON landscape.tbl_platform_knowledge USING GIN (property_types jsonb_path_ops);

-- Rollback (if needed):
-- Note: Converting back to TEXT[] is more complex and may lose data
-- DROP INDEX IF EXISTS landscape.idx_pk_chapters_topics_gin;
-- DROP INDEX IF EXISTS landscape.idx_pk_chapters_property_types_gin;
-- DROP INDEX IF EXISTS landscape.idx_pk_document_property_types_gin;
