-- Rollback of 20260929_loan_release_basis.
ALTER TABLE landscape.tbl_loan DROP CONSTRAINT IF EXISTS tbl_loan_release_basis_check;
ALTER TABLE landscape.tbl_loan DROP COLUMN IF EXISTS release_basis;
