-- Drop the invented deal-term column defaults on tbl_property_acquisition.
--
-- 012_multifamily_assumptions.up.sql created the table with DEFAULTs that
-- amount to a set of deal terms nobody chose: 1.5% closing costs, 30 days of
-- due diligence, 1.5% sale costs, a 2.5% broker commission, and a 20/80
-- land/improvement split that drives depreciation. A value written by the
-- database is as invented as one written by the app — an INSERT that omits the
-- column gets the number anyway, and it is then indistinguishable from a figure
-- the user typed.
--
-- Product rule (2026-09-04): the app must never supply a financial assumption
-- the user did not choose. NULL now means "not set" and stays that way until
-- somebody sets it.
--
-- Existing rows are NOT touched. A row that already carries 0.015 may well have
-- been confirmed by a person, and this migration cannot tell the difference;
-- rewriting them to NULL would destroy real input to remove invented input.
-- Only future writes change behavior.
--
-- hold_period_years and exit_cap_rate are absent here on purpose: they are
-- NOT NULL with no column default, so the database never invented them.

ALTER TABLE landscape.tbl_property_acquisition
    ALTER COLUMN closing_costs_pct      DROP DEFAULT,
    ALTER COLUMN due_diligence_days     DROP DEFAULT,
    ALTER COLUMN sale_costs_pct         DROP DEFAULT,
    ALTER COLUMN broker_commission_pct  DROP DEFAULT,
    ALTER COLUMN land_pct               DROP DEFAULT,
    ALTER COLUMN improvement_pct        DROP DEFAULT;

COMMENT ON COLUMN landscape.tbl_property_acquisition.land_pct IS
    'Land share of basis. NULL = not set by the user; never defaulted. Drives depreciation with improvement_pct.';
COMMENT ON COLUMN landscape.tbl_property_acquisition.improvement_pct IS
    'Improvement share of basis. NULL = not set by the user; never defaulted. Depreciable basis.';
