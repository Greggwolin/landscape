-- 20260929_loan_type_add_ad_land  (session XN62-LANDDEBT-0929)
--
-- Gregg, 2026-09-29, "1b": A&D and Land are loan types of their own, not
-- labels on Construction and Bridge. Widens the loan_type check constraint on
-- landscape.tbl_loan to allow ACQUISITION_DEVELOPMENT and LAND. Additive: every
-- existing value stays valid. Idempotent.

ALTER TABLE landscape.tbl_loan DROP CONSTRAINT IF EXISTS tbl_loan_loan_type_check;
ALTER TABLE landscape.tbl_loan ADD CONSTRAINT tbl_loan_loan_type_check CHECK (
  (loan_type)::text = ANY ((ARRAY[
    'CONSTRUCTION', 'BRIDGE', 'PERMANENT', 'MEZZANINE', 'LINE_OF_CREDIT',
    'PREFERRED_EQUITY', 'ACQUISITION_DEVELOPMENT', 'LAND'
  ])::text[])
);
