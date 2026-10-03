-- Rollback of 20260929_loan_type_drop_ad: restores ACQUISITION_DEVELOPMENT.
ALTER TABLE landscape.tbl_loan DROP CONSTRAINT IF EXISTS tbl_loan_loan_type_check;
ALTER TABLE landscape.tbl_loan ADD CONSTRAINT tbl_loan_loan_type_check CHECK (
  (loan_type)::text = ANY ((ARRAY[
    'CONSTRUCTION', 'BRIDGE', 'PERMANENT', 'MEZZANINE', 'LINE_OF_CREDIT',
    'PREFERRED_EQUITY', 'ACQUISITION_DEVELOPMENT', 'LAND'
  ])::text[])
);
