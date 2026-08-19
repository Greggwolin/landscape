-- =============================================================
-- DMS Media Asset Extraction - Phase 1: Schema & Migration
-- Migration: 009_dms_media_assets.sql
-- =============================================================

-- =============================================================
-- lu_media_classification
-- Taxonomy for auto-classifying extracted media assets
-- =============================================================
CREATE TABLE IF NOT EXISTS landscape.lu_media_classification (
    classification_id   SERIAL PRIMARY KEY,
    classification_code VARCHAR(50)  NOT NULL UNIQUE,
    classification_name VARCHAR(100) NOT NULL,
    description         TEXT,
    badge_color         VARCHAR(20)  NOT NULL,       -- CSS color token for DMS badge
    badge_icon          VARCHAR(50),                  -- Icon identifier (e.g., 'camera', 'map', 'chart')
    sort_order          INTEGER      NOT NULL DEFAULT 0,
    is_active           BOOLEAN      NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE landscape.lu_media_classification IS 'Classification taxonomy for media assets extracted from DMS documents';
COMMENT ON COLUMN landscape.lu_media_classification.badge_color IS 'Color token for DMS list view badges. Maps to CoreUI CSS variables.';

INSERT INTO landscape.lu_media_classification
    (classification_code, classification_name, description, badge_color, badge_icon, sort_order)
VALUES
    ('property_photo',   'Property Photo',      'Exterior or interior photographs of a property',                    'primary',   'camera',       10),
    ('aerial_photo',     'Aerial Photo',         'Aerial or drone photography of a property or site',               'primary',   'camera',       20),
    ('site_plan',        'Site Plan',            'Site plan, plat map, or lot layout drawing',                       'success',   'map',          30),
    ('floor_plan',       'Floor Plan',           'Unit or building floor plan',                                      'success',   'map',          40),
    ('aerial_map',       'Aerial Map',           'Annotated aerial/satellite map with overlays (retailers, roads)',  'danger',    'globe',        50),
    ('zoning_map',       'Zoning Map',           'Zoning designation map with color-coded zones',                    'danger',    'globe',        60),
    ('location_map',     'Location Map',         'General location or submarket map',                                'danger',    'globe',        70),
    ('planning_map',     'Planning Map',         'Master planning area map with parcel labels and density data',     'danger',    'globe',        80),
    ('chart',            'Chart / Graph',        'Financial chart, graph, or data visualization',                    'warning',   'bar-chart',    90),
    ('infographic',      'Infographic',          'Infographic or data-rich visual summary',                          'warning',   'bar-chart',    100),
    ('rendering',        'Rendering',            'Architectural rendering or conceptual illustration',               'info',      'image',        110),
    ('before_after',     'Before / After',       'Before-and-after comparison photo pair',                           'info',      'image',        120),
    ('logo',             'Logo / Branding',      'Company or property logo, branding element',                       'secondary', 'tag',          130),
    ('other',            'Other',                'Unclassified or miscellaneous image',                              'secondary', 'file',         140)
ON CONFLICT (classification_code) DO NOTHING;

-- =============================================================
-- core_doc_media
-- Individual media assets extracted from parent documents
-- =============================================================
CREATE TABLE IF NOT EXISTS landscape.core_doc_media (
    media_id            BIGSERIAL    PRIMARY KEY,
    doc_id              BIGINT       NOT NULL REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,
    project_id          BIGINT       REFERENCES landscape.tbl_project(project_id),
    workspace_id        BIGINT       REFERENCES landscape.dms_workspaces(workspace_id),

    -- Classification
    classification_id   INTEGER      REFERENCES landscape.lu_media_classification(classification_id),
    ai_classification   VARCHAR(50),                  -- Raw AI classification output before mapping
    ai_confidence       NUMERIC(5,4),                 -- Classification confidence 0.0000-1.0000
    user_override       BOOLEAN      NOT NULL DEFAULT false,  -- True if user manually reclassified

    -- Source location
    source_page         INTEGER,                      -- Page number in parent document (1-indexed)
    source_region       JSONB,                        -- Bounding box {x, y, width, height} if region capture
    extraction_method   VARCHAR(30)  NOT NULL DEFAULT 'embedded',
        -- 'embedded'     = discrete image object extracted from PDF
        -- 'page_capture' = full page rendered as image
        -- 'region'       = user-defined or AI-defined page region
        -- 'upload'       = standalone image uploaded directly (not extracted)

    -- Asset metadata
    asset_name          VARCHAR(500),                 -- Display name (auto-generated or user-edited)
    storage_uri         TEXT         NOT NULL,         -- Path to extracted image file
    thumbnail_uri       TEXT,                          -- Path to thumbnail (generated on extraction)
    mime_type           VARCHAR(100) NOT NULL DEFAULT 'image/png',
    file_size_bytes     BIGINT,
    width_px            INTEGER,
    height_px           INTEGER,
    dpi                 INTEGER,                       -- Resolution if available from source

    -- Descriptive
    caption             TEXT,                          -- User or AI-generated caption
    alt_text            TEXT,                          -- Accessibility text
    tags                TEXT[],                        -- Freeform tags for search
    ai_description      TEXT,                          -- AI-generated description of image contents

    -- Status
    status              VARCHAR(20)  NOT NULL DEFAULT 'extracted',
        -- 'pending'    = scan identified but not yet extracted
        -- 'extracted'  = extracted and stored
        -- 'classified' = AI classification complete
        -- 'verified'   = user verified classification
        -- 'rejected'   = user rejected / marked for deletion

    -- Audit
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by          BIGINT,
    deleted_at          TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT chk_media_extraction_method CHECK (
        extraction_method IN ('embedded', 'page_capture', 'region', 'upload')
    ),
    CONSTRAINT chk_media_status CHECK (
        status IN ('pending', 'extracted', 'classified', 'verified', 'rejected')
    ),
    CONSTRAINT chk_media_confidence CHECK (
        ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)
    )
);

COMMENT ON TABLE landscape.core_doc_media IS 'Individual media assets (images, maps, plans) extracted from DMS documents or uploaded directly';
COMMENT ON COLUMN landscape.core_doc_media.doc_id IS 'Parent document this media was extracted from';
COMMENT ON COLUMN landscape.core_doc_media.extraction_method IS 'How the image was obtained: embedded object, full page capture, region crop, or direct upload';
COMMENT ON COLUMN landscape.core_doc_media.source_region IS 'Bounding box JSON {x, y, width, height} for region-based extraction';
COMMENT ON COLUMN landscape.core_doc_media.ai_description IS 'AI-generated description of image contents for search and Landscaper context';

CREATE INDEX IF NOT EXISTS idx_media_doc_id     ON landscape.core_doc_media(doc_id);
CREATE INDEX IF NOT EXISTS idx_media_project_id ON landscape.core_doc_media(project_id);
CREATE INDEX IF NOT EXISTS idx_media_class_id   ON landscape.core_doc_media(classification_id);
CREATE INDEX IF NOT EXISTS idx_media_status     ON landscape.core_doc_media(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_method     ON landscape.core_doc_media(extraction_method);
CREATE INDEX IF NOT EXISTS idx_media_tags       ON landscape.core_doc_media USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_media_deleted    ON landscape.core_doc_media(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================
-- core_doc_media_link
-- Attach any media asset to any entity in the system
-- =============================================================
CREATE TABLE IF NOT EXISTS landscape.core_doc_media_link (
    link_id         BIGSERIAL    PRIMARY KEY,
    media_id        BIGINT       NOT NULL REFERENCES landscape.core_doc_media(media_id) ON DELETE CASCADE,

    -- Polymorphic target
    entity_type     VARCHAR(50)  NOT NULL,
        -- Supported entity types:
        -- 'project'          -> tbl_project.project_id
        -- 'phase'            -> tbl_phase.phase_id
        -- 'parcel'           -> tbl_parcel.parcel_id
        -- 'unit'             -> tbl_multifamily_unit.unit_id
        -- 'lease'            -> tbl_lease.lease_id
        -- 'comp_property'    -> market_competitive_projects.id
        -- 'comp_sale'        -> (future sale comp table)
        -- 'budget_item'      -> tbl_budget.budget_id
        -- 'absorption'       -> tbl_absorption_schedule.absorption_id
        -- 'document'         -> core_doc.doc_id (link media to a different doc than source)
    entity_id       BIGINT       NOT NULL,

    -- Context
    link_purpose    VARCHAR(50),                      -- 'hero_image', 'thumbnail', 'reference', 'comparison', etc.
    display_order   INTEGER      NOT NULL DEFAULT 0,  -- For ordering multiple images on an entity
    notes           TEXT,

    -- Audit
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by      BIGINT,

    -- Prevent duplicate links
    CONSTRAINT uq_media_entity_link UNIQUE (media_id, entity_type, entity_id)
);

COMMENT ON TABLE landscape.core_doc_media_link IS 'Polymorphic join table linking media assets to any entity (project, parcel, unit, comp, etc.)';
COMMENT ON COLUMN landscape.core_doc_media_link.entity_type IS 'Target entity table identifier. Not enforced by FK - validated at application layer.';
COMMENT ON COLUMN landscape.core_doc_media_link.link_purpose IS 'How the image is used on the entity: hero_image, thumbnail, reference, comparison, etc.';

CREATE INDEX IF NOT EXISTS idx_media_link_media   ON landscape.core_doc_media_link(media_id);
CREATE INDEX IF NOT EXISTS idx_media_link_entity  ON landscape.core_doc_media_link(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_link_purpose ON landscape.core_doc_media_link(link_purpose) WHERE link_purpose IS NOT NULL;

-- =============================================================
-- Add media scan tracking to core_doc
-- Drives the badge display in DMS list view
-- =============================================================
ALTER TABLE landscape.core_doc
    ADD COLUMN IF NOT EXISTS media_scan_status VARCHAR(20) DEFAULT 'unscanned',
    ADD COLUMN IF NOT EXISTS media_scan_json   JSONB;

COMMENT ON COLUMN landscape.core_doc.media_scan_status IS
    'Media scan state: unscanned, scanning, scanned, extracting, complete, error';
COMMENT ON COLUMN landscape.core_doc.media_scan_json IS
    'Cached media summary for badge rendering. Schema: {total: N, by_color: {primary: N, success: N, ...}, by_type: {property_photo: {total: N, extracted: N}, ...}}';

ALTER TABLE landscape.core_doc
    DROP CONSTRAINT IF EXISTS chk_media_scan_status;

ALTER TABLE landscape.core_doc
    ADD CONSTRAINT chk_media_scan_status CHECK (
        media_scan_status IN ('unscanned', 'scanning', 'scanned', 'extracting', 'complete', 'error', 'not_applicable')
    );

CREATE INDEX IF NOT EXISTS idx_doc_media_scan ON landscape.core_doc(media_scan_status)
    WHERE media_scan_status NOT IN ('complete', 'not_applicable', 'unscanned');

-- =============================================================
-- vw_doc_media_summary
-- Quick view for DMS list rendering with badge counts
-- =============================================================
CREATE OR REPLACE VIEW landscape.vw_doc_media_summary AS
WITH doc_counts AS (
    SELECT
        d.doc_id,
        d.doc_name,
        d.doc_type,
        d.project_id,
        d.media_scan_status,
        d.media_scan_json,
        COUNT(m.media_id) FILTER (WHERE m.deleted_at IS NULL) AS total_media,
        COUNT(m.media_id) FILTER (WHERE m.status = 'pending' AND m.deleted_at IS NULL) AS pending_count,
        COUNT(m.media_id) FILTER (WHERE m.status IN ('extracted', 'classified', 'verified') AND m.deleted_at IS NULL) AS extracted_count
    FROM landscape.core_doc d
    LEFT JOIN landscape.core_doc_media m ON d.doc_id = m.doc_id
    WHERE d.deleted_at IS NULL
    GROUP BY d.doc_id, d.doc_name, d.doc_type, d.project_id, d.media_scan_status, d.media_scan_json
),
badge_rollup AS (
    SELECT
        color_counts.doc_id,
        jsonb_object_agg(color_counts.badge_color, color_counts.media_count ORDER BY color_counts.badge_color) AS badge_counts
    FROM (
        SELECT
            m.doc_id,
            COALESCE(lc.badge_color, 'secondary') AS badge_color,
            COUNT(m.media_id) AS media_count
        FROM landscape.core_doc_media m
        LEFT JOIN landscape.lu_media_classification lc ON m.classification_id = lc.classification_id
        WHERE m.deleted_at IS NULL
        GROUP BY m.doc_id, COALESCE(lc.badge_color, 'secondary')
    ) AS color_counts
    GROUP BY color_counts.doc_id
)
SELECT
    dc.doc_id,
    dc.doc_name,
    dc.doc_type,
    dc.project_id,
    dc.media_scan_status,
    dc.media_scan_json,
    dc.total_media,
    dc.pending_count,
    dc.extracted_count,
    br.badge_counts
FROM doc_counts dc
LEFT JOIN badge_rollup br ON br.doc_id = dc.doc_id;

COMMENT ON VIEW landscape.vw_doc_media_summary IS 'DMS list view helper: media asset counts and badge color aggregations per document';

-- Register in _migrations
INSERT INTO landscape._migrations (migration_file)
VALUES ('009_dms_media_assets.sql')
ON CONFLICT (migration_file) DO NOTHING;
