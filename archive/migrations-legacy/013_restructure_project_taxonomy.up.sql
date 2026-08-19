-- ============================================================================
-- MIGRATION 013: Restructure Project Taxonomy
-- ============================================================================
-- Purpose: Separate analysis type from property use type
-- Date: 2025-10-31
-- ============================================================================

BEGIN;

-- Step 1: Add new analysis_type column
ALTER TABLE landscape.tbl_project
ADD COLUMN analysis_type VARCHAR(50);

COMMENT ON COLUMN landscape.tbl_project.analysis_type IS 'Top-level analysis category: Land Development or Income Property';

-- Step 2: Migrate existing development_type values to analysis_type
UPDATE landscape.tbl_project
SET analysis_type = CASE
  WHEN development_type IN ('Land Development', 'Master Planned Community', 'Subdivision')
    THEN 'Land Development'
  WHEN development_type IN ('Income Property', 'Mixed-Use')
    THEN 'Income Property'
  WHEN project_type = 'Land Development'
    THEN 'Land Development'
  WHEN project_type = 'Income Property'
    THEN 'Income Property'
  ELSE 'Land Development' -- Default for any undefined cases
END;

-- Step 3: Create constraint for analysis_type
ALTER TABLE landscape.tbl_project
ADD CONSTRAINT tbl_project_analysis_type_check
CHECK (analysis_type IN ('Land Development', 'Income Property'));

-- Step 4: Ensure property_subtype column has correct type
ALTER TABLE landscape.tbl_project
ALTER COLUMN property_subtype TYPE VARCHAR(100);

COMMENT ON COLUMN landscape.tbl_project.property_subtype IS 'Specific property use type, cascades from analysis_type';

-- Step 5: Migrate existing development_type values to property_subtype
UPDATE landscape.tbl_project
SET property_subtype = CASE
  -- Land Development subtypes
  WHEN development_type = 'Master Planned Community' THEN 'Master Planned Community'
  WHEN development_type = 'Subdivision' THEN 'Subdivision'
  WHEN development_type = 'Land Development' AND property_type_code = 'Multifamily'
    THEN 'Multifamily Development'
  WHEN development_type = 'Land Development' AND property_type_code = 'Office'
    THEN 'Commercial Development'
  WHEN development_type = 'Land Development' AND property_type_code = 'Retail'
    THEN 'Commercial Development'
  WHEN development_type = 'Land Development' AND property_type_code = 'Industrial'
    THEN 'Industrial Development'
  WHEN development_type = 'Land Development' AND property_type_code = 'Mixed-Use'
    THEN 'Mixed-Use Development'

  -- Income Property subtypes (migrate from existing property_type_code if present)
  WHEN development_type = 'Income Property' AND property_type_code = 'Multifamily'
    THEN 'Garden Multifamily'
  WHEN development_type = 'Income Property' AND property_type_code = 'Office'
    THEN 'Class B Office'
  WHEN development_type = 'Income Property' AND property_type_code = 'Retail'
    THEN 'Community Retail'
  WHEN development_type = 'Income Property' AND property_type_code = 'Industrial'
    THEN 'Warehouse/Distribution'
  WHEN development_type = 'Income Property' AND property_type_code = 'Hotel'
    THEN 'Hotel'

  -- Fallback based on analysis_type
  WHEN analysis_type = 'Land Development' AND property_subtype IS NULL
    THEN 'Master Planned Community'
  WHEN analysis_type = 'Income Property' AND property_subtype IS NULL
    THEN 'Garden Multifamily'

  -- Keep existing property_subtype if already set
  ELSE COALESCE(property_subtype, 'Master Planned Community')
END
WHERE property_subtype IS NULL OR property_subtype = '';

-- Step 6: Deprecate old development_type column (don't drop yet for safety)
ALTER TABLE landscape.tbl_project
RENAME COLUMN development_type TO development_type_deprecated;

COMMENT ON COLUMN landscape.tbl_project.development_type_deprecated IS 'DEPRECATED - Use analysis_type instead. Will be dropped in future migration';

-- Step 7: Deprecate property_type_code (superseded by analysis_type + property_subtype)
ALTER TABLE landscape.tbl_project
RENAME COLUMN property_type_code TO property_type_code_deprecated;

COMMENT ON COLUMN landscape.tbl_project.property_type_code_deprecated IS 'DEPRECATED - Use analysis_type + property_subtype instead';

-- Step 8: Update tbl_project_config if it exists (for universal hierarchy labels)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'landscape'
    AND table_name = 'tbl_project_config'
  ) THEN
    -- Add analysis_type to project_config for context
    ALTER TABLE landscape.tbl_project_config
    ADD COLUMN IF NOT EXISTS analysis_type VARCHAR(50);

    COMMENT ON COLUMN landscape.tbl_project_config.analysis_type IS 'Inherited from tbl_project for hierarchy label configuration';
  END IF;
END $$;

-- Step 9: Create index for performance
CREATE INDEX IF NOT EXISTS idx_project_analysis_type
ON landscape.tbl_project(analysis_type);

CREATE INDEX IF NOT EXISTS idx_project_property_subtype
ON landscape.tbl_project(property_subtype);

-- Step 10: Insert migration tracking record
INSERT INTO landscape._migrations (migration_file, applied_at, checksum)
VALUES ('013_restructure_project_taxonomy.up.sql', NOW(), NULL)
ON CONFLICT (migration_file) DO NOTHING;

COMMIT;
