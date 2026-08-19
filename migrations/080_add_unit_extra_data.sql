-- Migration: Add extra_data JSONB field to tbl_multifamily_unit
-- Purpose: Store additional extraction data that doesn't map to schema fields
-- (Tags, delinquency amounts, payment plan status, etc.)

-- UP
ALTER TABLE landscape.tbl_multifamily_unit
ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN landscape.tbl_multifamily_unit.extra_data IS
'Additional extraction data that does not map to schema fields. May include: tags, section_8 flags, delinquent_rent, payment_plan status, unlawful_detainer flags, rent_received, recertification dates, etc.';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_mf_unit_extra_data_gin
ON landscape.tbl_multifamily_unit USING GIN (extra_data)
WHERE extra_data IS NOT NULL;

-- DOWN (rollback)
-- DROP INDEX IF EXISTS landscape.idx_mf_unit_extra_data_gin;
-- ALTER TABLE landscape.tbl_multifamily_unit DROP COLUMN IF EXISTS extra_data;
