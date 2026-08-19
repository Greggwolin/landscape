-- Migration: Add tenant_name to tbl_multifamily_unit
-- Date: 2026-03-07
-- Purpose: Support rent roll ingestion — tenant name is a first-class field

-- UP
ALTER TABLE landscape.tbl_multifamily_unit
ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(200);

COMMENT ON COLUMN landscape.tbl_multifamily_unit.tenant_name
IS 'Tenant/resident name from rent roll ingestion';

-- DOWN
-- ALTER TABLE landscape.tbl_multifamily_unit DROP COLUMN IF EXISTS tenant_name;
