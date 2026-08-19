-- ============================================================================
-- Migration: Add unit_type_name column to tbl_multifamily_unit_type
-- Date: 2026-03-09
-- Purpose: Both the mutation service and extraction writer reference
--          unit_type_name as a display-friendly label (e.g. "1 Bedroom / 1 Bath")
--          distinct from unit_type_code (e.g. "1BR/1BA"). The column was never
--          created, causing silent errors on INSERT/upsert paths.
-- ============================================================================

-- UP
ALTER TABLE landscape.tbl_multifamily_unit_type
  ADD COLUMN IF NOT EXISTS unit_type_name VARCHAR(100);

-- Backfill: copy unit_type_code into unit_type_name for existing rows
UPDATE landscape.tbl_multifamily_unit_type
SET unit_type_name = unit_type_code
WHERE unit_type_name IS NULL;

COMMENT ON COLUMN landscape.tbl_multifamily_unit_type.unit_type_name
  IS 'Human-readable unit type label (e.g. "1 Bedroom / 1 Bathroom"). Falls back to unit_type_code if not provided.';

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- ALTER TABLE landscape.tbl_multifamily_unit_type DROP COLUMN IF EXISTS unit_type_name;
