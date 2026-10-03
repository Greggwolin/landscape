-- 20260929_loan_release_basis  (session XN62-LANDDEBT-0929)
-- Gregg, 2026-09-29: a release price "won't necessarily be per lot. it could be
-- per acre or it could be a cash sweep (100% of net cash flow from the sale
-- event)". Adds tbl_loan.release_basis: LOT | ACRE | CASH_SWEEP. NULL is read as
-- per lot, which is how every release was priced before. Idempotent.
ALTER TABLE landscape.tbl_loan ADD COLUMN IF NOT EXISTS release_basis varchar(20);
ALTER TABLE landscape.tbl_loan DROP CONSTRAINT IF EXISTS tbl_loan_release_basis_check;
ALTER TABLE landscape.tbl_loan ADD CONSTRAINT tbl_loan_release_basis_check CHECK (
  release_basis IS NULL OR release_basis IN ('LOT', 'ACRE', 'CASH_SWEEP')
);
