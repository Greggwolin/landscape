-- =====================================================
-- Migration 013: Add template_id to tbl_project
-- =====================================================
-- Description: Links projects to their template for complexity tracking
-- Date: October 16, 2025
-- =====================================================

BEGIN;

-- Add template_id column to tbl_project
ALTER TABLE landscape.tbl_project
  ADD COLUMN IF NOT EXISTS template_id BIGINT
  REFERENCES landscape.tbl_property_use_template(template_id);

-- Create index for template lookups
CREATE INDEX IF NOT EXISTS idx_project_template
  ON landscape.tbl_project(template_id);

-- Add comment explaining the column
COMMENT ON COLUMN landscape.tbl_project.template_id IS
  'References the template used during project creation, represents complexity level';

-- Verification
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'landscape'
  AND table_name = 'tbl_project'
  AND column_name = 'template_id';

COMMIT;
