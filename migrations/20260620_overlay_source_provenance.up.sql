-- Plan Extraction Phase 1 (extract + place): source-document provenance on overlays.
--
-- Records which document / page / page-region a site-plan overlay PNG was
-- extracted from. All columns are nullable with no defaults, so existing
-- overlays (uploaded by hand) keep loading unchanged. The migration runner
-- re-applies every .up.sql on each run, so this is written idempotently.
--
-- Session: LSCMD-PLANEXTRACT-P1-0620-ot4

ALTER TABLE landscape.tbl_project_overlay
    ADD COLUMN IF NOT EXISTS source_doc_id BIGINT
        REFERENCES landscape.core_doc(doc_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source_page INTEGER,
    ADD COLUMN IF NOT EXISTS source_crop_bbox JSONB;

CREATE INDEX IF NOT EXISTS idx_tbl_project_overlay_source_doc_id
    ON landscape.tbl_project_overlay (source_doc_id);

COMMENT ON COLUMN landscape.tbl_project_overlay.source_doc_id IS
    'core_doc the overlay PNG was extracted from; NULL for manually-uploaded overlays. Phase 1 plan extract+place.';
COMMENT ON COLUMN landscape.tbl_project_overlay.source_page IS
    '1-indexed page in the source document the crop came from.';
COMMENT ON COLUMN landscape.tbl_project_overlay.source_crop_bbox IS
    'JSONB crop rect in PDF page points {x0,y0,x1,y1} the PNG was clipped to.';
