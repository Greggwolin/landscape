-- Migration: Add template_id to tbl_project
-- Purpose: Store template reference for progressive complexity system
-- Date: 2025-10-16

-- Add template_id column
ALTER TABLE landscape.tbl_project
  ADD COLUMN IF NOT EXISTS template_id BIGINT REFERENCES landscape.tbl_property_use_template(template_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_project_template
  ON landscape.tbl_project(template_id);

-- Add comment
COMMENT ON COLUMN landscape.tbl_project.template_id IS
  'References the template used during project creation, represents complexity level and feature modules';

-- Note: No backfill for existing projects - they remain in legacy state
-- Projects 7 and 11 can be manually updated when ready

