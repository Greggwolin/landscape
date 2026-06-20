-- Rollback for 20260620_overlay_source_provenance.up.sql
-- Session: LSCMD-PLANEXTRACT-P1-0620-ot4

DROP INDEX IF EXISTS landscape.idx_tbl_project_overlay_source_doc_id;

ALTER TABLE landscape.tbl_project_overlay
    DROP COLUMN IF EXISTS source_crop_bbox,
    DROP COLUMN IF EXISTS source_page,
    DROP COLUMN IF EXISTS source_doc_id;
