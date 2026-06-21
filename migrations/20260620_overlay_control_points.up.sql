-- Control-point georeferencing for plan overlays (D16).
--
-- Stores the user-placed control points (image-pixel ↔ map lng/lat pairs) that were
-- used to georeference a draped plan, so the placement can be re-edited later. The
-- *result* of the transform (the four corner coordinates) continues to live in the
-- existing `corners` column — this column preserves the inputs, not the output.
--
-- Additive + nullable: manual drapes and existing rows are unaffected.
--
-- LSCMD-CW-PLANEXTRACT-CP-0620-ot4
-- Refs: src/lib/gis/controlPoints.ts, src/components/map-tab/extract/PlanExtractCanvas.tsx

ALTER TABLE landscape.tbl_project_overlay
  ADD COLUMN IF NOT EXISTS control_points JSONB;

COMMENT ON COLUMN landscape.tbl_project_overlay.control_points IS
  'Array of {img:{x,y}, map:[lng,lat], snapped:bool} control points used to georeference '
  'the drape (D16). NULL for manually-placed (4-corner) overlays. The solved corners live '
  'in the corners column.';
