-- Rollback: restore the column defaults from 012_multifamily_assumptions.up.sql.
--
-- Restoring these re-introduces the defect: an INSERT that omits any of these
-- columns is handed a deal term the user never chose. Roll back only to get an
-- older application build working, and roll forward again as soon as possible.

ALTER TABLE landscape.tbl_property_acquisition
    ALTER COLUMN closing_costs_pct      SET DEFAULT 0.015,
    ALTER COLUMN due_diligence_days     SET DEFAULT 30,
    ALTER COLUMN sale_costs_pct         SET DEFAULT 0.015,
    ALTER COLUMN broker_commission_pct  SET DEFAULT 0.025,
    ALTER COLUMN land_pct               SET DEFAULT 20.0,
    ALTER COLUMN improvement_pct        SET DEFAULT 80.0;
