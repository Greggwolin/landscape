-- Migration: Add acquisition_fee_pct to tbl_property_acquisition
-- Date: 2026-04-01
-- Reason: Support "Asset Acquisition Fee %" field across all property types

-- UP
ALTER TABLE landscape.tbl_property_acquisition
ADD COLUMN IF NOT EXISTS acquisition_fee_pct DECIMAL(6,3) NULL DEFAULT NULL;

COMMENT ON COLUMN landscape.tbl_property_acquisition.acquisition_fee_pct
IS 'Asset acquisition fee as percentage of purchase price (e.g., 1.0 = 1%)';

-- DOWN (rollback)
-- ALTER TABLE landscape.tbl_property_acquisition DROP COLUMN IF EXISTS acquisition_fee_pct;
