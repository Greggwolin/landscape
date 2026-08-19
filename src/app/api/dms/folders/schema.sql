-- Step 7: Smart Folders + Full-Text Search
-- Database schema for folders, folder links, smart filters, and text storage

-- 1. Folders table
CREATE TABLE IF NOT EXISTS landscape.core_doc_folder (
  folder_id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES landscape.core_doc_folder(folder_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL, -- Materialized path like '/parent/child'
  sort_order INTEGER DEFAULT 0,
  default_profile JSONB DEFAULT '{}'::jsonb, -- Default profile values to apply to docs
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_folder_path UNIQUE(path),
  CONSTRAINT parent_not_self CHECK (folder_id != parent_id)
);

-- Index for tree queries
CREATE INDEX IF NOT EXISTS idx_folder_parent ON landscape.core_doc_folder(parent_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_folder_path ON landscape.core_doc_folder USING btree(path);

-- 2. Document <-> Folder link (1:1 - doc can only be in one folder)
CREATE TABLE IF NOT EXISTS landscape.core_doc_folder_link (
  doc_id INTEGER NOT NULL REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,
  folder_id INTEGER NOT NULL REFERENCES landscape.core_doc_folder(folder_id) ON DELETE CASCADE,
  linked_at TIMESTAMP DEFAULT NOW(),
  inherited BOOLEAN DEFAULT true, -- Whether profile was inherited from folder

  PRIMARY KEY(doc_id)
);

-- Index for folder queries
CREATE INDEX IF NOT EXISTS idx_folder_link_folder ON landscape.core_doc_folder_link(folder_id);

-- 3. Smart Filters
CREATE TABLE IF NOT EXISTS landscape.core_doc_smartfilter (
  filter_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  query JSONB NOT NULL, -- Search query in same format as /api/dms/search
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for active filters
CREATE INDEX IF NOT EXISTS idx_smartfilter_active ON landscape.core_doc_smartfilter(is_active) WHERE is_active = true;

-- 4. Document full-text storage (optional - can also be Meili-only)
CREATE TABLE IF NOT EXISTS landscape.core_doc_text (
  doc_id INTEGER PRIMARY KEY REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,
  extracted_text TEXT, -- Full extracted text from OCR/pdf.js
  word_count INTEGER,
  extraction_method VARCHAR(50), -- 'pdf.js', 'tesseract', 'api'
  extracted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_doc_text_fts ON landscape.core_doc_text USING gin(to_tsvector('english', extracted_text));

-- 5. Update materialized view to include folder info
DROP MATERIALIZED VIEW IF EXISTS landscape.mv_doc_search CASCADE;

CREATE MATERIALIZED VIEW landscape.mv_doc_search AS
SELECT
  d.doc_id,
  d.project_id,
  d.workspace_id,
  d.doc_name,
  d.doc_type,
  d.discipline,
  d.status,
  d.version_no,
  d.storage_uri,
  d.mime_type,
  d.file_size_bytes,
  d.doc_date,
  d.contract_value,
  d.priority,
  d.profile_json,
  d.created_at,
  d.updated_at,

  -- Project/phase info
  p.project_name,
  ph.phase_no::text as phase_name,
  NULL as parcel_name,

  -- Folder info
  fl.folder_id,
  f.path as folder_path,
  f.name as folder_name,

  -- Full-text
  dt.extracted_text,
  dt.word_count,

  -- Searchable text (combined)
  COALESCE(d.doc_name, '') || ' ' ||
  COALESCE(d.doc_type, '') || ' ' ||
  COALESCE(d.discipline, '') || ' ' ||
  COALESCE(p.project_name, '') || ' ' ||
  COALESCE(f.name, '') || ' ' ||
  COALESCE(dt.extracted_text, '') as searchable_text

FROM landscape.core_doc d
LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
LEFT JOIN landscape.tbl_phase ph ON d.phase_id = ph.phase_id
LEFT JOIN landscape.core_doc_folder_link fl ON d.doc_id = fl.doc_id
LEFT JOIN landscape.core_doc_folder f ON fl.folder_id = f.folder_id
LEFT JOIN landscape.core_doc_text dt ON d.doc_id = dt.doc_id
WHERE d.status != 'archived';

-- Index the materialized view
CREATE UNIQUE INDEX ON landscape.mv_doc_search(doc_id);
CREATE INDEX ON landscape.mv_doc_search(project_id);
CREATE INDEX ON landscape.mv_doc_search(workspace_id);
CREATE INDEX ON landscape.mv_doc_search(doc_type);
CREATE INDEX ON landscape.mv_doc_search(folder_id);
CREATE INDEX ON landscape.mv_doc_search USING gin(to_tsvector('english', searchable_text));

-- 6. Function to update folder path on parent change
CREATE OR REPLACE FUNCTION landscape.update_folder_path()
RETURNS TRIGGER AS $$
BEGIN
  -- Update path based on parent
  IF NEW.parent_id IS NULL THEN
    NEW.path := '/' || NEW.name;
  ELSE
    NEW.path := (SELECT path FROM landscape.core_doc_folder WHERE folder_id = NEW.parent_id) || '/' || NEW.name;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update path
DROP TRIGGER IF EXISTS trg_folder_path ON landscape.core_doc_folder;
CREATE TRIGGER trg_folder_path
  BEFORE INSERT OR UPDATE OF name, parent_id ON landscape.core_doc_folder
  FOR EACH ROW
  EXECUTE FUNCTION landscape.update_folder_path();

-- 7. Function to apply folder inheritance
CREATE OR REPLACE FUNCTION landscape.apply_folder_inheritance(
  p_doc_id INTEGER,
  p_folder_id INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_folder_profile JSONB;
  v_current_profile JSONB;
  v_new_profile JSONB;
  v_opt_out BOOLEAN;
BEGIN
  -- Get current document profile
  SELECT profile_json INTO v_current_profile
  FROM landscape.core_doc
  WHERE doc_id = p_doc_id;

  -- Check if document has opted out
  v_opt_out := COALESCE((v_current_profile->>'_inherit')::boolean, true) = false;

  IF v_opt_out THEN
    RETURN v_current_profile;
  END IF;

  -- Get folder default profile
  SELECT default_profile INTO v_folder_profile
  FROM landscape.core_doc_folder
  WHERE folder_id = p_folder_id;

  -- Merge: folder values overwrite document values
  v_new_profile := v_current_profile || v_folder_profile;

  -- Update document
  UPDATE landscape.core_doc
  SET profile_json = v_new_profile,
      updated_at = NOW()
  WHERE doc_id = p_doc_id;

  -- Log to audit history
  INSERT INTO landscape.ai_review_history (
    doc_id,
    action_type,
    old_json,
    new_json,
    operation_summary,
    created_at
  ) VALUES (
    p_doc_id,
    'folder_inherit',
    v_current_profile,
    v_new_profile,
    jsonb_build_object(
      'folder_id', p_folder_id,
      'changes', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(v_folder_profile)
      )
    ),
    NOW()
  );

  RETURN v_new_profile;
END;
$$ LANGUAGE plpgsql;

-- 8. Seed some default folders
INSERT INTO landscape.core_doc_folder (name, parent_id, default_profile, sort_order)
VALUES
  ('Root', NULL, '{}'::jsonb, 0),
  ('Plans', 1, '{"doc_type": "plan", "discipline": "architecture"}'::jsonb, 1),
  ('Reports', 1, '{"doc_type": "report"}'::jsonb, 2),
  ('Contracts', 1, '{"doc_type": "contract", "priority": "high"}'::jsonb, 3),
  ('Photos', 1, '{"doc_type": "photo"}'::jsonb, 4)
ON CONFLICT (path) DO NOTHING;

COMMENT ON TABLE landscape.core_doc_folder IS 'Folder hierarchy for organizing documents';
COMMENT ON TABLE landscape.core_doc_folder_link IS 'Links documents to folders (1:1 relationship)';
COMMENT ON TABLE landscape.core_doc_smartfilter IS 'Saved search queries for smart folders';
COMMENT ON TABLE landscape.core_doc_text IS 'Extracted full-text content from documents';
COMMENT ON FUNCTION landscape.apply_folder_inheritance IS 'Merges folder default_profile into document profile_json';
