-- Migration: Backfill dms_project_doc_types from workspace templates
-- Date: 2026-02-23
-- Purpose: Seed dms_project_doc_types for all existing projects so filters
--          are project-owned rather than resolved on-the-fly from templates.
--
-- For each project:
--   1. Use project's dms_template_id if set
--   2. Otherwise fall back to workspace default template (is_default = true)
--   3. Insert template's doc_type_options as rows with is_from_template = true
--   4. Skip projects that already have rows (idempotent)

BEGIN;

-- Seed from explicitly assigned template
INSERT INTO landscape.dms_project_doc_types (project_id, doc_type_name, display_order, is_from_template)
SELECT
  p.project_id,
  dt.doc_type_name,
  dt.ord,
  TRUE
FROM landscape.tbl_project p
JOIN landscape.dms_templates t ON t.template_id = p.dms_template_id
CROSS JOIN LATERAL unnest(t.doc_type_options) WITH ORDINALITY AS dt(doc_type_name, ord)
WHERE p.dms_template_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM landscape.dms_project_doc_types x WHERE x.project_id = p.project_id
  )
ON CONFLICT (project_id, doc_type_name) DO NOTHING;

-- Seed from workspace default for projects with no template assigned
INSERT INTO landscape.dms_project_doc_types (project_id, doc_type_name, display_order, is_from_template)
SELECT
  p.project_id,
  dt.doc_type_name,
  dt.ord,
  TRUE
FROM landscape.tbl_project p
CROSS JOIN (
  SELECT template_id, doc_type_options
  FROM landscape.dms_templates
  WHERE is_default = true
  ORDER BY template_id ASC
  LIMIT 1
) t
CROSS JOIN LATERAL unnest(t.doc_type_options) WITH ORDINALITY AS dt(doc_type_name, ord)
WHERE p.dms_template_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM landscape.dms_project_doc_types x WHERE x.project_id = p.project_id
  )
ON CONFLICT (project_id, doc_type_name) DO NOTHING;

COMMIT;

-- Rollback:
-- DELETE FROM landscape.dms_project_doc_types WHERE is_from_template = TRUE;
