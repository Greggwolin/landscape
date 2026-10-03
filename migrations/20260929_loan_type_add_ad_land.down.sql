-- Rollback of 20260929_loan_type_add_ad_land. Refuses (fails the ADD) if any
-- loan already carries ACQUISITION_DEVELOPMENT or LAND — re-type those first.

ALTER TABLE landscape.tbl_loan DROP CONSTRAINT IF EXISTS tbl_loan_loan_type_check;
ALTER TABLE landscape.tbl_loan ADD CONSTRAINT tbl_loan_loan_type_check CHECK (
  (loan_type)::text = ANY ((ARRAY[
    'CONSTRUCTION', 'BRIDGE', 'PERMANENT', 'MEZZANINE', 'LINE_OF_CREDIT',
    'PREFERRED_EQUITY'
  ])::text[])
);
