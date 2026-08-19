-- Migration: Add granularity settings to tbl_project_config
-- Date: 2025-11-01
-- Session: QS02

-- Add granularity columns if they don't exist
ALTER TABLE landscape.tbl_project_config
ADD COLUMN IF NOT EXISTS level1_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS level1_label VARCHAR(50) DEFAULT 'Area',
ADD COLUMN IF NOT EXISTS level2_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS level2_label VARCHAR(50) DEFAULT 'Phase',
ADD COLUMN IF NOT EXISTS level3_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS level3_label VARCHAR(50) DEFAULT 'Parcel',
ADD COLUMN IF NOT EXISTS auto_number BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create default project config for existing projects if needed
INSERT INTO landscape.tbl_project_config (
  project_id,
  level1_enabled,
  level1_label,
  level2_enabled,
  level2_label,
  level3_enabled,
  level3_label,
  auto_number
)
SELECT
  project_id,
  true,
  'Area',
  true,
  'Phase',
  true,
  'Parcel',
  false
FROM landscape.tbl_projects
WHERE project_id NOT IN (SELECT project_id FROM landscape.tbl_project_config)
ON CONFLICT (project_id) DO NOTHING;

-- Update existing configs with defaults
UPDATE landscape.tbl_project_config
SET
  level1_enabled = COALESCE(level1_enabled, true),
  level1_label = COALESCE(level1_label, 'Area'),
  level2_enabled = COALESCE(level2_enabled, true),
  level2_label = COALESCE(level2_label, 'Phase'),
  level3_enabled = COALESCE(level3_enabled, true),
  level3_label = COALESCE(level3_label, 'Parcel'),
  auto_number = COALESCE(auto_number, false)
WHERE level1_label IS NULL OR level2_label IS NULL OR level3_label IS NULL;
