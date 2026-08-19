-- Migration: Fix mv_doc_search to exclude soft-deleted documents
-- Date: 2026-02-05
-- Description: Update view to filter out documents with deleted_at set

-- Drop and recreate the view with soft delete filter
DROP VIEW IF EXISTS landscape.mv_doc_search CASCADE;

CREATE VIEW landscape.mv_doc_search AS
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
    p.project_name,
    (ph.phase_no)::text AS phase_name,
    NULL::text AS parcel_name,
    fl.folder_id,
    f.path AS folder_path,
    f.name AS folder_name,
    dt.extracted_text,
    dt.word_count,
    COALESCE(d.doc_name, '')::text || ' ' ||
    COALESCE(d.doc_type, '')::text || ' ' ||
    COALESCE(d.discipline, '')::text || ' ' ||
    COALESCE(p.project_name, '')::text || ' ' ||
    COALESCE(f.name, '')::text || ' ' ||
    COALESCE(dt.extracted_text, '') AS searchable_text
FROM landscape.core_doc d
LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
LEFT JOIN landscape.tbl_phase ph ON d.phase_id = ph.phase_id
LEFT JOIN landscape.core_doc_folder_link fl ON d.doc_id = fl.doc_id
LEFT JOIN landscape.core_doc_folder f ON fl.folder_id = f.folder_id
LEFT JOIN landscape.core_doc_text dt ON d.doc_id = dt.doc_id
WHERE d.status != 'archived'
  AND d.deleted_at IS NULL;  -- Exclude soft-deleted documents

-- ROLLBACK:
-- DROP VIEW IF EXISTS landscape.mv_doc_search CASCADE;
-- Then recreate without the deleted_at filter
