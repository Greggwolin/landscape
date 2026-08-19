-- Migration: Add parking_rent, pet_rent, past_due_amount, deposit_amount to tbl_multifamily_unit
-- Date: 2026-03-08
-- Purpose: Extend rent roll unit table with commonly extracted ancillary fields

-- UP
ALTER TABLE landscape.tbl_multifamily_unit
  ADD COLUMN IF NOT EXISTS parking_rent NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pet_rent NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS past_due_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2);

COMMENT ON COLUMN landscape.tbl_multifamily_unit.parking_rent IS 'Monthly parking rent charge';
COMMENT ON COLUMN landscape.tbl_multifamily_unit.pet_rent IS 'Monthly pet rent charge';
COMMENT ON COLUMN landscape.tbl_multifamily_unit.past_due_amount IS 'Past due / delinquent balance';
COMMENT ON COLUMN landscape.tbl_multifamily_unit.deposit_amount IS 'Security deposit amount';

-- DOWN
-- ALTER TABLE landscape.tbl_multifamily_unit
--   DROP COLUMN IF EXISTS parking_rent,
--   DROP COLUMN IF EXISTS pet_rent,
--   DROP COLUMN IF EXISTS past_due_amount,
--   DROP COLUMN IF EXISTS deposit_amount;
