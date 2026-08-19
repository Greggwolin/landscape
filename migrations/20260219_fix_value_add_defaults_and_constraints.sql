-- Migration: 20260219_fix_value_add_defaults_and_constraints.sql
-- Purpose: Fix value-add assumption defaults and CHECK constraints
--
-- Bug A: Column defaults pre-populate non-zero values for new projects.
--         All numeric value-add fields should default to NULL (unconfigured).
-- Bug B: CHECK constraints reject NULL values, causing save errors when
--         fields are cleared or left blank.
--
-- This migration:
-- 1. Changes column defaults to NULL for configurable numeric fields
-- 2. Relaxes CHECK constraints to allow NULL (unconfigured state)
-- 3. Does NOT modify existing project data

BEGIN;

-- =============================================================================
-- 1. ALTER COLUMN DEFAULTS TO NULL
-- =============================================================================

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN reno_cost_per_sf DROP DEFAULT;

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN relocation_incentive DROP DEFAULT;

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN reno_starts_per_month DROP DEFAULT;

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN reno_start_month DROP DEFAULT;

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN rent_premium_pct DROP DEFAULT;

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN relet_lag_months DROP DEFAULT;

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN months_to_complete DROP DEFAULT;

-- Ensure these columns allow NULL
ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN reno_cost_per_sf DROP NOT NULL;

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN relocation_incentive DROP NOT NULL;

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN reno_starts_per_month DROP NOT NULL;

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN reno_start_month DROP NOT NULL;

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN rent_premium_pct DROP NOT NULL;

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN relet_lag_months DROP NOT NULL;

ALTER TABLE landscape.tbl_value_add_assumptions
  ALTER COLUMN months_to_complete DROP NOT NULL;

-- =============================================================================
-- 2. RELAX CHECK CONSTRAINTS TO ALLOW NULL
-- =============================================================================

-- Drop and recreate constraints that don't allow NULL

-- valid_pace: reno_starts_per_month > 0  →  NULL OR > 0
ALTER TABLE landscape.tbl_value_add_assumptions
  DROP CONSTRAINT IF EXISTS valid_pace;
ALTER TABLE landscape.tbl_value_add_assumptions
  ADD CONSTRAINT valid_pace CHECK (reno_starts_per_month IS NULL OR reno_starts_per_month > 0);

-- valid_start: reno_start_month >= 1  →  NULL OR >= 1
ALTER TABLE landscape.tbl_value_add_assumptions
  DROP CONSTRAINT IF EXISTS valid_start;
ALTER TABLE landscape.tbl_value_add_assumptions
  ADD CONSTRAINT valid_start CHECK (reno_start_month IS NULL OR reno_start_month >= 1);

-- valid_premium: rent_premium_pct >= 0 AND <= 1  →  NULL OR (>= 0 AND <= 1)
ALTER TABLE landscape.tbl_value_add_assumptions
  DROP CONSTRAINT IF EXISTS valid_premium;
ALTER TABLE landscape.tbl_value_add_assumptions
  ADD CONSTRAINT valid_premium CHECK (rent_premium_pct IS NULL OR (rent_premium_pct >= 0 AND rent_premium_pct <= 1));

-- valid_months_to_complete: months_to_complete > 0  →  NULL OR > 0
ALTER TABLE landscape.tbl_value_add_assumptions
  DROP CONSTRAINT IF EXISTS valid_months_to_complete;
ALTER TABLE landscape.tbl_value_add_assumptions
  ADD CONSTRAINT valid_months_to_complete CHECK (months_to_complete IS NULL OR months_to_complete > 0);

-- valid_units already allows NULL — leave as is

COMMIT;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
--
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   ALTER COLUMN reno_cost_per_sf SET DEFAULT 8.00;
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   ALTER COLUMN relocation_incentive SET DEFAULT 1500.00;
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   ALTER COLUMN reno_starts_per_month SET DEFAULT 4;
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   ALTER COLUMN reno_start_month SET DEFAULT 3;
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   ALTER COLUMN rent_premium_pct SET DEFAULT 0.15;
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   ALTER COLUMN relet_lag_months SET DEFAULT 2;
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   ALTER COLUMN months_to_complete SET DEFAULT 3;
--
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   DROP CONSTRAINT IF EXISTS valid_pace;
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   ADD CONSTRAINT valid_pace CHECK (reno_starts_per_month > 0);
--
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   DROP CONSTRAINT IF EXISTS valid_start;
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   ADD CONSTRAINT valid_start CHECK (reno_start_month >= 1);
--
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   DROP CONSTRAINT IF EXISTS valid_premium;
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   ADD CONSTRAINT valid_premium CHECK (rent_premium_pct >= 0 AND rent_premium_pct <= 1);
--
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   DROP CONSTRAINT IF EXISTS valid_months_to_complete;
-- ALTER TABLE landscape.tbl_value_add_assumptions
--   ADD CONSTRAINT valid_months_to_complete CHECK (months_to_complete > 0);
--
-- COMMIT;
