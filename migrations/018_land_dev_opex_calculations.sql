BEGIN;

ALTER TABLE landscape.tbl_operating_expenses 
    ADD COLUMN IF NOT EXISTS calculation_basis VARCHAR(50) DEFAULT 'FIXED_AMOUNT',
    ADD COLUMN IF NOT EXISTS unit_amount NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS is_auto_calculated BOOLEAN DEFAULT FALSE;

ALTER TABLE landscape.tbl_operating_expenses
    DROP CONSTRAINT IF EXISTS chk_calculation_basis;

ALTER TABLE landscape.tbl_operating_expenses
    ADD CONSTRAINT chk_calculation_basis 
    CHECK (calculation_basis IN (
      'FIXED_AMOUNT',
      'PER_UNSOLD_PARCEL',
      'PER_UNSOLD_ACRE',
      'PER_PCT_UNSOLD'
    ));

CREATE INDEX IF NOT EXISTS idx_opex_project_account 
    ON landscape.tbl_operating_expenses(project_id, account_id);

COMMENT ON COLUMN landscape.tbl_operating_expenses.calculation_basis IS 
'Determines how annual_amount is calculated: FIXED_AMOUNT (user entry), PER_UNSOLD_PARCEL (unit_amount × parcel count), PER_UNSOLD_ACRE (unit_amount × acres), PER_PCT_UNSOLD (unit_amount × % unsold)';

COMMENT ON COLUMN landscape.tbl_operating_expenses.unit_amount IS 
'Cost per unit for inventory-linked calculations. E.g., $5,000 per parcel for property taxes, $200 per acre for landscape maintenance';

COMMENT ON COLUMN landscape.tbl_operating_expenses.is_auto_calculated IS 
'If TRUE, annual_amount is computed automatically and should be read-only in UI. If FALSE, user can edit annual_amount directly.';

COMMIT;
