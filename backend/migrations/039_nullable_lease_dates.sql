-- Migration: Allow NULL values for lease date columns
-- Reason: Landscaper should not invent dates when source documents don't have them.
--         If a rent roll doesn't include lease start/end dates, those fields should be NULL.
-- Date: 2026-01-11

-- Make lease_start_date nullable
ALTER TABLE landscape.tbl_multifamily_lease
    ALTER COLUMN lease_start_date DROP NOT NULL;

-- Make lease_end_date nullable
ALTER TABLE landscape.tbl_multifamily_lease
    ALTER COLUMN lease_end_date DROP NOT NULL;

-- Make lease_term_months nullable
ALTER TABLE landscape.tbl_multifamily_lease
    ALTER COLUMN lease_term_months DROP NOT NULL;

-- Add comment explaining why these are nullable
COMMENT ON COLUMN landscape.tbl_multifamily_lease.lease_start_date IS
    'Lease start date. NULL if source document does not contain this information.';
COMMENT ON COLUMN landscape.tbl_multifamily_lease.lease_end_date IS
    'Lease end date. NULL if source document does not contain this information.';
COMMENT ON COLUMN landscape.tbl_multifamily_lease.lease_term_months IS
    'Lease term in months. NULL if source document does not contain this information.';

-- Rollback (if needed):
-- ALTER TABLE landscape.tbl_multifamily_lease ALTER COLUMN lease_start_date SET NOT NULL;
-- ALTER TABLE landscape.tbl_multifamily_lease ALTER COLUMN lease_end_date SET NOT NULL;
-- ALTER TABLE landscape.tbl_multifamily_lease ALTER COLUMN lease_term_months SET NOT NULL;
