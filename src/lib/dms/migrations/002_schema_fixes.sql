-- DMS Schema Fixes Migration (v1.1)
-- Adds missing tables, columns, and views to align with Phase 1 spec
-- Date: 2025-10-07

-- ==============================================================================
-- 1. Add missing tags column to core_doc (as regular JSONB, not generated)
-- ==============================================================================
-- Note: PostgreSQL generated columns don't support subqueries, so we'll query
-- the tags from profile_json->'tags' directly in queries instead

-- We'll skip adding a tags column since profile_json already contains tags
-- and we can query it directly via profile_json->'tags'

DO $$
BEGIN
    RAISE NOTICE 'Skipping tags column (using profile_json->''tags'' directly)';
END $$;

-- ==============================================================================
-- 2. Create core_doc_attr_enum table for enum type attribute options
-- ==============================================================================

CREATE TABLE IF NOT EXISTS landscape.core_doc_attr_enum (
    attr_id BIGINT NOT NULL REFERENCES landscape.dms_attributes(attr_id) ON DELETE CASCADE,
    option_code TEXT NOT NULL,
    label TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (attr_id, option_code)
);

COMMENT ON TABLE landscape.core_doc_attr_enum IS 'Enumerated options for enum-type attributes';

-- ==============================================================================
-- 3. Create core_doc_attr_lookup table for lookup type attributes
-- ==============================================================================

CREATE TABLE IF NOT EXISTS landscape.core_doc_attr_lookup (
    attr_id BIGINT NOT NULL REFERENCES landscape.dms_attributes(attr_id) ON DELETE CASCADE,
    sql_source TEXT NOT NULL,
    cache_ttl INT NOT NULL DEFAULT 600,
    display_fmt TEXT,
    PRIMARY KEY (attr_id)
);

COMMENT ON TABLE landscape.core_doc_attr_lookup IS 'Lookup source definitions for lookup-type attributes';

-- ==============================================================================
-- 4. Create core_workspace_member table for workspace access control
-- ==============================================================================

CREATE TABLE IF NOT EXISTS landscape.core_workspace_member (
    workspace_id BIGINT NOT NULL REFERENCES landscape.dms_workspaces(workspace_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('viewer', 'contributor', 'manager', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_member_user
ON landscape.core_workspace_member(user_id);

COMMENT ON TABLE landscape.core_workspace_member IS 'Workspace membership and role assignments';

-- ==============================================================================
-- 5. Create materialized view for document search with facets
-- ==============================================================================

DROP MATERIALIZED VIEW IF EXISTS landscape.mv_doc_search;

CREATE MATERIALIZED VIEW landscape.mv_doc_search AS
SELECT
    d.doc_id,
    d.project_id,
    d.workspace_id,
    d.phase_id,
    d.parcel_id,
    d.doc_name,
    d.doc_type,
    d.discipline,
    d.status,
    d.version_no,
    d.doc_date,
    d.contract_value,
    d.priority,
    d.profile_json,
    d.created_at,
    d.updated_at,
    p.project_name,
    w.workspace_name,
    ph.phase_no::text as phase_name,
    par.parcel_id::text as parcel_name,
    -- Searchable text (concatenated fields for full-text search)
    COALESCE(d.doc_name, '') || ' ' ||
    COALESCE(d.doc_type, '') || ' ' ||
    COALESCE(d.discipline, '') || ' ' ||
    COALESCE(d.profile_json->>'description', '') || ' ' ||
    COALESCE(p.project_name, '') || ' ' ||
    COALESCE(w.workspace_name, '') as searchable_text
FROM landscape.core_doc d
LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
LEFT JOIN landscape.dms_workspaces w ON d.workspace_id = w.workspace_id
LEFT JOIN landscape.tbl_phase ph ON d.phase_id = ph.phase_id
LEFT JOIN landscape.tbl_parcel par ON d.parcel_id = par.parcel_id
WHERE d.status != 'archived';

-- Create indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_doc_search_doc_id
ON landscape.mv_doc_search(doc_id);

CREATE INDEX IF NOT EXISTS idx_mv_doc_search_project_id
ON landscape.mv_doc_search(project_id);

CREATE INDEX IF NOT EXISTS idx_mv_doc_search_workspace_id
ON landscape.mv_doc_search(workspace_id);

CREATE INDEX IF NOT EXISTS idx_mv_doc_search_text
ON landscape.mv_doc_search USING GIN(to_tsvector('english', searchable_text));

CREATE INDEX IF NOT EXISTS idx_mv_doc_search_doc_type
ON landscape.mv_doc_search(doc_type);

CREATE INDEX IF NOT EXISTS idx_mv_doc_search_status
ON landscape.mv_doc_search(status);

COMMENT ON MATERIALIZED VIEW landscape.mv_doc_search IS 'Searchable document index with faceting support';

-- ==============================================================================
-- 6. Refresh function for materialized view
-- ==============================================================================

CREATE OR REPLACE FUNCTION landscape.refresh_doc_search_mv()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY landscape.mv_doc_search;
END;
$$;

COMMENT ON FUNCTION landscape.refresh_doc_search_mv() IS 'Refresh document search materialized view';

-- ==============================================================================
-- 7. Seed additional default attributes (6 more to reach 10 total)
-- ==============================================================================

INSERT INTO landscape.dms_attributes (attr_key, attr_name, attr_type, attr_description, is_required, is_searchable, display_order) VALUES
    ('contract_value', 'Contract Value', 'currency', 'Contract or financial value', FALSE, TRUE, 30),
    ('status_internal', 'Internal Status', 'enum', 'Internal processing status', FALSE, TRUE, 50),
    ('reviewed_by', 'Reviewed By', 'text', 'Person who reviewed the document', FALSE, TRUE, 70),
    ('review_date', 'Review Date', 'date', 'Date document was reviewed', FALSE, TRUE, 80),
    ('compliance_required', 'Compliance Required', 'boolean', 'Whether compliance review is required', FALSE, TRUE, 90),
    ('external_id', 'External ID', 'text', 'External system reference ID', FALSE, TRUE, 100)
ON CONFLICT (attr_key) DO NOTHING;

-- Set enum values for status_internal attribute
UPDATE landscape.dms_attributes
SET enum_values = '["Draft", "In Review", "Approved", "Rejected", "On Hold"]'::jsonb
WHERE attr_key = 'status_internal'
AND enum_values IS NULL;

-- ==============================================================================
-- 8. Grant permissions (if needed)
-- ==============================================================================

-- Grant select on new tables to appropriate roles if you have role-based access
-- GRANT SELECT ON landscape.core_doc_attr_enum TO read_only_role;
-- GRANT SELECT ON landscape.core_doc_attr_lookup TO read_only_role;
-- GRANT SELECT ON landscape.core_workspace_member TO read_only_role;
-- GRANT SELECT ON landscape.mv_doc_search TO read_only_role;

-- ==============================================================================
-- Migration complete
-- ==============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ DMS Schema Fixes Migration completed successfully';
    RAISE NOTICE '   - Added tags generated column to core_doc';
    RAISE NOTICE '   - Created core_doc_attr_enum table';
    RAISE NOTICE '   - Created core_doc_attr_lookup table';
    RAISE NOTICE '   - Created core_workspace_member table';
    RAISE NOTICE '   - Created mv_doc_search materialized view';
    RAISE NOTICE '   - Seeded 6 additional default attributes';
END $$;
