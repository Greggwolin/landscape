-- ============================================================================
-- LAND USE TAXONOMY LABEL CONFIGURATION
-- ============================================================================
-- Purpose: Add customizable labels for land use hierarchy in land development projects
-- Applies: Only to land development and subdivision projects (MPC, Land Development)
-- Date: 2025-10-30
-- Migration: 017
-- ============================================================================

-- Add land use label columns to existing tbl_project_config
ALTER TABLE landscape.tbl_project_config
ADD COLUMN IF NOT EXISTS land_use_level1_label VARCHAR(50) DEFAULT 'Family',
ADD COLUMN IF NOT EXISTS land_use_level1_label_plural VARCHAR(50) DEFAULT 'Families',
ADD COLUMN IF NOT EXISTS land_use_level2_label VARCHAR(50) DEFAULT 'Type',
ADD COLUMN IF NOT EXISTS land_use_level2_label_plural VARCHAR(50) DEFAULT 'Types',
ADD COLUMN IF NOT EXISTS land_use_level3_label VARCHAR(50) DEFAULT 'Product',
ADD COLUMN IF NOT EXISTS land_use_level3_label_plural VARCHAR(50) DEFAULT 'Products';

-- Add comments for documentation
COMMENT ON COLUMN landscape.tbl_project_config.land_use_level1_label IS
  'Top-level land use classification label (e.g., Family, Category, Classification). Used in inventory/planning interfaces for land development projects.';

COMMENT ON COLUMN landscape.tbl_project_config.land_use_level1_label_plural IS
  'Plural form of level 1 label for UI display';

COMMENT ON COLUMN landscape.tbl_project_config.land_use_level2_label IS
  'Second-level land use classification label (e.g., Type, Use, Subtype). Represents subdivisions within a Family.';

COMMENT ON COLUMN landscape.tbl_project_config.land_use_level2_label_plural IS
  'Plural form of level 2 label for UI display';

COMMENT ON COLUMN landscape.tbl_project_config.land_use_level3_label IS
  'Product-level land use classification label (e.g., Product, Series, Model). Represents specific lot products.';

COMMENT ON COLUMN landscape.tbl_project_config.land_use_level3_label_plural IS
  'Plural form of level 3 label for UI display';

-- Update existing projects to have explicit default values
-- This ensures existing projects continue working with the same terminology
UPDATE landscape.tbl_project_config
SET
  land_use_level1_label = COALESCE(land_use_level1_label, 'Family'),
  land_use_level1_label_plural = COALESCE(land_use_level1_label_plural, 'Families'),
  land_use_level2_label = COALESCE(land_use_level2_label, 'Type'),
  land_use_level2_label_plural = COALESCE(land_use_level2_label_plural, 'Types'),
  land_use_level3_label = COALESCE(land_use_level3_label, 'Product'),
  land_use_level3_label_plural = COALESCE(land_use_level3_label_plural, 'Products')
WHERE land_use_level1_label IS NULL
   OR land_use_level2_label IS NULL
   OR land_use_level3_label IS NULL;

-- Create index for potential future queries (optional, but recommended)
CREATE INDEX IF NOT EXISTS idx_project_config_land_use_labels
  ON landscape.tbl_project_config(land_use_level1_label, land_use_level2_label, land_use_level3_label);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The updated_at trigger will automatically fire on any changes to these columns
-- No additional triggers needed.
-- ============================================================================

-- Verify migration
SELECT
  COUNT(*) as total_projects,
  COUNT(DISTINCT land_use_level1_label) as unique_level1_labels,
  COUNT(DISTINCT land_use_level2_label) as unique_level2_labels,
  COUNT(DISTINCT land_use_level3_label) as unique_level3_labels
FROM landscape.tbl_project_config;
