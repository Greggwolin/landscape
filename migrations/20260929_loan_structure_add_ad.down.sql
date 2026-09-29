-- Rollback of 20260929_loan_structure_add_ad. Fails if any loan is A_AND_D —
-- re-structure those first.
ALTER TABLE landscape.tbl_loan DROP CONSTRAINT IF EXISTS tbl_loan_structure_type_check;
ALTER TABLE landscape.tbl_loan ADD CONSTRAINT tbl_loan_structure_type_check CHECK (
  (structure_type)::text = ANY ((ARRAY['TERM', 'REVOLVER'])::text[])
);
