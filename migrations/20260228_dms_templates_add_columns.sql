-- Migration: Add doc_type_options and description columns to dms_templates
-- Date: 2026-02-28
-- Purpose: The project creation route (api/projects/minimal) and reseed script
--          both expect doc_type_options (TEXT[]) and description (TEXT) on
--          dms_templates, but the original 001_create_dms_tables migration
--          never created them. This causes a 500 error on project creation.

BEGIN;

-- Add missing columns
ALTER TABLE landscape.dms_templates
  ADD COLUMN IF NOT EXISTS doc_type_options TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- Seed the Default template's doc_type_options (matches reseedDmsTemplates.ts)
UPDATE landscape.dms_templates
SET doc_type_options = ARRAY[
  'general', 'contract', 'invoice', 'report', 'drawing',
  'permit', 'correspondence', 'proposal', 'budget', 'schedule'
],
    description = 'Standard document types',
    updated_at = NOW()
WHERE template_name = 'Default Document Template'
  AND doc_type_options = '{}';

-- Seed the Valuation template if it exists
UPDATE landscape.dms_templates
SET doc_type_options = ARRAY[
  'Agreement', 'Title', 'Closing', 'Correspondence', 'Loan Documents',
  'Operations', 'Sets', 'Lease', 'Other Research', 'Reports, Studies',
  'Entity Documents', 'Other', 'Invoice'
],
    description = 'Valuation/underwriting document types',
    updated_at = NOW()
WHERE template_name = 'Valuation'
  AND doc_type_options = '{}';

COMMIT;

-- Rollback:
-- ALTER TABLE landscape.dms_templates DROP COLUMN IF EXISTS doc_type_options;
-- ALTER TABLE landscape.dms_templates DROP COLUMN IF EXISTS description;
