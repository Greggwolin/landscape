-- =============================================================
-- 010_media_classification_intent.sql
-- Add content_intent and default_action to lu_media_classification
-- Add suggested_action and user_action to core_doc_media
-- Update media_scan_status constraint with new states
-- =============================================================

-- =============================================================
-- 1. Add content_intent and default_action to lu_media_classification
-- =============================================================
ALTER TABLE landscape.lu_media_classification
    ADD COLUMN IF NOT EXISTS content_intent VARCHAR(20),
    ADD COLUMN IF NOT EXISTS default_action VARCHAR(20);

-- Add constraints (idempotent)
ALTER TABLE landscape.lu_media_classification
    DROP CONSTRAINT IF EXISTS chk_content_intent;
ALTER TABLE landscape.lu_media_classification
    ADD CONSTRAINT chk_content_intent CHECK (
        content_intent IN ('visual_asset', 'data_source', 'hybrid', 'decoration', 'unknown')
    );

ALTER TABLE landscape.lu_media_classification
    DROP CONSTRAINT IF EXISTS chk_default_action;
ALTER TABLE landscape.lu_media_classification
    ADD CONSTRAINT chk_default_action CHECK (
        default_action IN ('save_image', 'extract_data', 'both', 'ignore')
    );

COMMENT ON COLUMN landscape.lu_media_classification.content_intent IS 'What the image represents: visual_asset, data_source, hybrid, decoration, unknown';
COMMENT ON COLUMN landscape.lu_media_classification.default_action IS 'Default action for preview modal: save_image, extract_data, both, ignore';

-- =============================================================
-- 2. Update existing seed data with intent and action mappings
-- =============================================================
UPDATE landscape.lu_media_classification SET content_intent = 'visual_asset', default_action = 'save_image'   WHERE classification_code = 'property_photo';
UPDATE landscape.lu_media_classification SET content_intent = 'visual_asset', default_action = 'save_image'   WHERE classification_code = 'aerial_photo';
UPDATE landscape.lu_media_classification SET content_intent = 'visual_asset', default_action = 'save_image'   WHERE classification_code = 'site_plan';
UPDATE landscape.lu_media_classification SET content_intent = 'visual_asset', default_action = 'save_image'   WHERE classification_code = 'floor_plan';
UPDATE landscape.lu_media_classification SET content_intent = 'hybrid',       default_action = 'save_image'   WHERE classification_code = 'aerial_map';
UPDATE landscape.lu_media_classification SET content_intent = 'hybrid',       default_action = 'save_image'   WHERE classification_code = 'zoning_map';
UPDATE landscape.lu_media_classification SET content_intent = 'hybrid',       default_action = 'save_image'   WHERE classification_code = 'location_map';
UPDATE landscape.lu_media_classification SET content_intent = 'hybrid',       default_action = 'save_image'   WHERE classification_code = 'planning_map';
UPDATE landscape.lu_media_classification SET content_intent = 'data_source',  default_action = 'extract_data' WHERE classification_code = 'chart';
UPDATE landscape.lu_media_classification SET content_intent = 'data_source',  default_action = 'extract_data' WHERE classification_code = 'infographic';
UPDATE landscape.lu_media_classification SET content_intent = 'visual_asset', default_action = 'save_image'   WHERE classification_code = 'rendering';
UPDATE landscape.lu_media_classification SET content_intent = 'visual_asset', default_action = 'save_image'   WHERE classification_code = 'before_after';
UPDATE landscape.lu_media_classification SET content_intent = 'decoration',   default_action = 'ignore'       WHERE classification_code = 'logo';
UPDATE landscape.lu_media_classification SET content_intent = 'unknown',      default_action = 'save_image'   WHERE classification_code = 'other';

-- =============================================================
-- 3. Add suggested_action and user_action to core_doc_media
-- =============================================================
ALTER TABLE landscape.core_doc_media
    ADD COLUMN IF NOT EXISTS suggested_action VARCHAR(20);

ALTER TABLE landscape.core_doc_media
    DROP CONSTRAINT IF EXISTS chk_suggested_action;
ALTER TABLE landscape.core_doc_media
    ADD CONSTRAINT chk_suggested_action CHECK (
        suggested_action IS NULL OR suggested_action IN ('save_image', 'extract_data', 'both', 'ignore')
    );

ALTER TABLE landscape.core_doc_media
    ADD COLUMN IF NOT EXISTS user_action VARCHAR(20);

ALTER TABLE landscape.core_doc_media
    DROP CONSTRAINT IF EXISTS chk_user_action;
ALTER TABLE landscape.core_doc_media
    ADD CONSTRAINT chk_user_action CHECK (
        user_action IS NULL OR user_action IN ('save_image', 'extract_data', 'both', 'ignore')
    );

COMMENT ON COLUMN landscape.core_doc_media.suggested_action IS 'AI-suggested action based on classification content_intent. Drives preview modal pre-selection.';
COMMENT ON COLUMN landscape.core_doc_media.user_action IS 'User-chosen action from preview modal. NULL until user interacts. Overrides suggested_action.';

-- =============================================================
-- 4. Update media_scan_status constraint with new states
-- =============================================================
ALTER TABLE landscape.core_doc DROP CONSTRAINT IF EXISTS chk_media_scan_status;
ALTER TABLE landscape.core_doc ADD CONSTRAINT chk_media_scan_status CHECK (
    media_scan_status IN (
        'unscanned', 'scanning', 'scanned',
        'extracting', 'extracted',
        'classifying', 'classified',
        'complete', 'error', 'not_applicable'
    )
);

-- =============================================================
-- Register migration
-- =============================================================
INSERT INTO landscape._migrations (migration_file)
VALUES ('010_media_classification_intent.sql')
ON CONFLICT (migration_file) DO NOTHING;
