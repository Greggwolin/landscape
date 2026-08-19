-- Migration: Add fields needed for project creation workflow (TC29)

-- Add property_type_code for standardized property types
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS property_type_code VARCHAR(50);

-- Add description field
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add developer_owner field
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS developer_owner TEXT;

-- Add is_active field
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add created_at/updated_at if they don't exist
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Comment to document the property_type_code values
COMMENT ON COLUMN landscape.tbl_project.property_type_code IS 'Standardized property type: mpc, office, retail, multifamily, industrial, hotel';

-- Verification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'landscape'
  AND table_name = 'tbl_project'
  AND column_name IN ('property_type_code', 'description', 'developer_owner', 'is_active', 'created_at', 'updated_at')
ORDER BY column_name;
