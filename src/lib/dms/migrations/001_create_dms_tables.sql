-- DMS Core Tables Migration (v1.0)
-- Schema: landscape
-- Model: Hybrid (registry tables + JSONB profile_json with generated columns)

-- Workspaces table (default W1 Phased)
CREATE TABLE IF NOT EXISTS landscape.dms_workspaces (
    workspace_id BIGSERIAL PRIMARY KEY,
    workspace_code VARCHAR(50) UNIQUE NOT NULL,
    workspace_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default workspace if not exists
INSERT INTO landscape.dms_workspaces (workspace_code, workspace_name, description, is_default)
VALUES ('W1', 'Phased Development', 'Default phased development workspace', TRUE)
ON CONFLICT (workspace_code) DO NOTHING;

-- Custom attribute definitions
CREATE TABLE IF NOT EXISTS landscape.dms_attributes (
    attr_id BIGSERIAL PRIMARY KEY,
    attr_key VARCHAR(100) NOT NULL,
    attr_name VARCHAR(255) NOT NULL,
    attr_type VARCHAR(50) NOT NULL CHECK (attr_type IN ('text', 'number', 'date', 'boolean', 'currency', 'enum', 'lookup', 'tags', 'json')),
    attr_description TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    is_searchable BOOLEAN DEFAULT TRUE,
    validation_rules JSONB DEFAULT '{}',
    enum_values JSONB DEFAULT NULL, -- for enum type
    lookup_table VARCHAR(100) DEFAULT NULL, -- for lookup type
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(attr_key)
);

-- Document templates (bind attributes to workspace/project)
CREATE TABLE IF NOT EXISTS landscape.dms_templates (
    template_id BIGSERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    workspace_id BIGINT REFERENCES landscape.dms_workspaces(workspace_id),
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) DEFAULT NULL,
    doc_type VARCHAR(100), -- optional filter by document type
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template attribute bindings
CREATE TABLE IF NOT EXISTS landscape.dms_template_attributes (
    template_id BIGINT REFERENCES landscape.dms_templates(template_id) ON DELETE CASCADE,
    attr_id BIGINT REFERENCES landscape.dms_attributes(attr_id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT FALSE,
    default_value JSONB DEFAULT NULL,
    display_order INTEGER DEFAULT 0,
    PRIMARY KEY (template_id, attr_id)
);

-- Core document registry
CREATE TABLE IF NOT EXISTS landscape.core_doc (
    doc_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id),
    workspace_id BIGINT REFERENCES landscape.dms_workspaces(workspace_id),
    phase_id BIGINT REFERENCES landscape.tbl_phase(phase_id) DEFAULT NULL,
    parcel_id BIGINT REFERENCES landscape.tbl_parcel(parcel_id) DEFAULT NULL,
    
    -- Document metadata
    doc_name VARCHAR(500) NOT NULL,
    doc_type VARCHAR(100) NOT NULL DEFAULT 'general',
    discipline VARCHAR(100) DEFAULT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    storage_uri TEXT NOT NULL,
    
    -- Versioning
    version_no INTEGER DEFAULT 1,
    parent_doc_id BIGINT REFERENCES landscape.core_doc(doc_id) DEFAULT NULL,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'indexed', 'failed', 'archived')),
    
    -- Profile data (Hybrid model)
    profile_json JSONB DEFAULT '{}',
    
    -- Generated columns for hot fields (indexed)
    doc_date DATE GENERATED ALWAYS AS ((profile_json->>'doc_date')::DATE) STORED,
    contract_value DECIMAL(15,2) GENERATED ALWAYS AS ((profile_json->>'contract_value')::DECIMAL) STORED,
    priority VARCHAR(20) GENERATED ALWAYS AS (profile_json->>'priority') STORED,
    tags TEXT[] GENERATED ALWAYS AS (
        CASE 
            WHEN jsonb_typeof(profile_json->'tags') = 'array' 
            THEN ARRAY(SELECT jsonb_array_elements_text(profile_json->'tags'))
            ELSE NULL 
        END
    ) STORED,
    
    -- Audit fields
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document profile audit log
CREATE TABLE IF NOT EXISTS landscape.dms_profile_audit (
    audit_id BIGSERIAL PRIMARY KEY,
    doc_id BIGINT REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,
    changed_by BIGINT DEFAULT NULL,
    change_type VARCHAR(50) NOT NULL DEFAULT 'profile_update',
    old_profile_json JSONB DEFAULT '{}',
    new_profile_json JSONB DEFAULT '{}',
    changed_fields TEXT[] DEFAULT '{}',
    change_reason TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OCR/Extraction queue
CREATE TABLE IF NOT EXISTS landscape.dms_extract_queue (
    queue_id BIGSERIAL PRIMARY KEY,
    doc_id BIGINT REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,
    extract_type VARCHAR(50) NOT NULL DEFAULT 'ocr',
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT DEFAULT NULL,
    extracted_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ DEFAULT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_core_doc_project_id ON landscape.core_doc(project_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_workspace_id ON landscape.core_doc(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_phase_id ON landscape.core_doc(phase_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_parcel_id ON landscape.core_doc(parcel_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_status ON landscape.core_doc(status);
CREATE INDEX IF NOT EXISTS idx_core_doc_doc_type ON landscape.core_doc(doc_type);
CREATE INDEX IF NOT EXISTS idx_core_doc_discipline ON landscape.core_doc(discipline);
CREATE INDEX IF NOT EXISTS idx_core_doc_created_at ON landscape.core_doc(created_at);
CREATE INDEX IF NOT EXISTS idx_core_doc_sha256 ON landscape.core_doc(sha256_hash);

-- JSONB indexes for profile search
CREATE INDEX IF NOT EXISTS idx_core_doc_profile_json ON landscape.core_doc USING GIN(profile_json);
CREATE INDEX IF NOT EXISTS idx_core_doc_tags ON landscape.core_doc USING GIN(tags);

-- Generated column indexes
CREATE INDEX IF NOT EXISTS idx_core_doc_doc_date ON landscape.core_doc(doc_date);
CREATE INDEX IF NOT EXISTS idx_core_doc_contract_value ON landscape.core_doc(contract_value);
CREATE INDEX IF NOT EXISTS idx_core_doc_priority ON landscape.core_doc(priority);

-- Materialized view for search faceting
CREATE MATERIALIZED VIEW IF NOT EXISTS landscape.mv_doc_search AS
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
    d.tags,
    d.profile_json,
    d.created_at,
    d.updated_at,
    p.project_name,
    w.workspace_name,
    ph.phase_no,
    par.parcel_id as parcel_name,
    -- Searchable text (concatenated fields for full-text search)
    d.doc_name || ' ' || 
    COALESCE(d.doc_type, '') || ' ' ||
    COALESCE(d.discipline, '') || ' ' ||
    COALESCE(d.profile_json->>'description', '') || ' ' ||
    COALESCE(array_to_string(d.tags, ' '), '') as searchable_text
FROM landscape.core_doc d
LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
LEFT JOIN landscape.dms_workspaces w ON d.workspace_id = w.workspace_id
LEFT JOIN landscape.tbl_phase ph ON d.phase_id = ph.phase_id
LEFT JOIN landscape.tbl_parcel par ON d.parcel_id = par.parcel_id
WHERE d.status != 'archived';

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_doc_search_doc_id ON landscape.mv_doc_search(doc_id);
CREATE INDEX IF NOT EXISTS idx_mv_doc_search_project_id ON landscape.mv_doc_search(project_id);
CREATE INDEX IF NOT EXISTS idx_mv_doc_search_text ON landscape.mv_doc_search USING GIN(to_tsvector('english', searchable_text));

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION landscape.refresh_doc_search_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY landscape.mv_doc_search;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-refresh MV on document changes
CREATE OR REPLACE FUNCTION landscape.trigger_refresh_doc_search_mv()
RETURNS trigger AS $$
BEGIN
    -- Use pg_notify to queue refresh (can be processed by background job)
    PERFORM pg_notify('refresh_doc_search_mv', '');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_doc_search_refresh
    AFTER INSERT OR UPDATE OR DELETE ON landscape.core_doc
    FOR EACH STATEMENT
    EXECUTE FUNCTION landscape.trigger_refresh_doc_search_mv();

-- Insert some default attribute definitions
INSERT INTO landscape.dms_attributes (attr_key, attr_name, attr_type, attr_description, is_required, is_searchable, display_order) VALUES
    ('doc_date', 'Document Date', 'date', 'The official date of the document', FALSE, TRUE, 10),
    ('description', 'Description', 'text', 'Document description or summary', FALSE, TRUE, 20),
    ('contract_value', 'Contract Value', 'currency', 'Contract or financial value', FALSE, TRUE, 30),
    ('priority', 'Priority', 'enum', 'Document priority level', FALSE, TRUE, 40),
    ('status_internal', 'Internal Status', 'enum', 'Internal processing status', FALSE, TRUE, 50),
    ('tags', 'Tags', 'tags', 'Document tags for categorization', FALSE, TRUE, 60),
    ('reviewed_by', 'Reviewed By', 'text', 'Person who reviewed the document', FALSE, TRUE, 70),
    ('review_date', 'Review Date', 'date', 'Date document was reviewed', FALSE, TRUE, 80),
    ('compliance_required', 'Compliance Required', 'boolean', 'Whether compliance review is required', FALSE, TRUE, 90),
    ('external_id', 'External ID', 'text', 'External system reference ID', FALSE, TRUE, 100)
ON CONFLICT (attr_key) DO NOTHING;

-- Set enum values for priority attribute
UPDATE landscape.dms_attributes 
SET enum_values = '["Low", "Medium", "High", "Critical"]'::jsonb
WHERE attr_key = 'priority';

-- Set enum values for status_internal attribute  
UPDATE landscape.dms_attributes
SET enum_values = '["Draft", "In Review", "Approved", "Rejected", "On Hold"]'::jsonb
WHERE attr_key = 'status_internal';

-- Create a default template for general documents
INSERT INTO landscape.dms_templates (template_name, workspace_id, is_default)
SELECT 'Default Document Template', workspace_id, TRUE
FROM landscape.dms_workspaces 
WHERE workspace_code = 'W1'
ON CONFLICT DO NOTHING;

-- Bind some common attributes to the default template
INSERT INTO landscape.dms_template_attributes (template_id, attr_id, is_required, display_order)
SELECT t.template_id, a.attr_id, 
       CASE WHEN a.attr_key IN ('description') THEN TRUE ELSE FALSE END,
       a.display_order
FROM landscape.dms_templates t
CROSS JOIN landscape.dms_attributes a
WHERE t.template_name = 'Default Document Template' 
  AND a.attr_key IN ('doc_date', 'description', 'priority', 'tags')
ON CONFLICT (template_id, attr_id) DO NOTHING;