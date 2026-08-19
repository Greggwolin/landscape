-- Migration: 013_add_parcel_description.sql
-- Date: 2025-10-31
-- Description: Add description column to tbl_parcel for planning notes

-- Add description column to tbl_parcel
ALTER TABLE landscape.tbl_parcel
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment explaining the column's purpose
COMMENT ON COLUMN landscape.tbl_parcel.description IS 'Parcel description for planning notes and details';

-- Update any existing NULL descriptions to empty string for consistency (optional)
-- UPDATE landscape.tbl_parcel SET description = '' WHERE description IS NULL;
