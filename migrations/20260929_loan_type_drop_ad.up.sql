-- 20260929_loan_type_drop_ad  (session XN62-LANDDEBT-0929)
-- Gregg, 2026-09-29: A&D is a loan STRUCTURE (several advances), not a loan
-- type; "land loans don't have additional advances, A&D loans do". Removes
-- ACQUISITION_DEVELOPMENT from the loan_type list added earlier the same day
-- (no loan ever carried it). LAND stays. Idempotent.
ALTER TABLE landscape.tbl_loan DROP CONSTRAINT IF EXISTS tbl_loan_loan_type_check;
ALTER TABLE landscape.tbl_loan ADD CONSTRAINT tbl_loan_loan_type_check CHECK (
  (loan_type)::text = ANY ((ARRAY[
    'CONSTRUCTION', 'BRIDGE', 'PERMANENT', 'MEZZANINE', 'LINE_OF_CREDIT',
    'PREFERRED_EQUITY', 'LAND'
  ])::text[])
);
