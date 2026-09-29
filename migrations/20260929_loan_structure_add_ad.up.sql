-- 20260929_loan_structure_add_ad  (session XN62-LANDDEBT-0929)
--
-- Gregg, 2026-09-29: three loan structures — Term, Revolver and A&D ("like a
-- term loan but with multiple advances allowed"). Widens the structure_type
-- check on landscape.tbl_loan to allow A_AND_D. Additive and idempotent.

ALTER TABLE landscape.tbl_loan DROP CONSTRAINT IF EXISTS tbl_loan_structure_type_check;
ALTER TABLE landscape.tbl_loan ADD CONSTRAINT tbl_loan_structure_type_check CHECK (
  (structure_type)::text = ANY ((ARRAY['TERM', 'REVOLVER', 'A_AND_D'])::text[])
);
