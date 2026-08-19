-- Migration: Fix transaction cost value column precision
-- The current NUMERIC(8,4) is too small for transaction costs
-- which can easily exceed $9,999
-- Change to NUMERIC(12,2) to match unit_cost table

BEGIN;

-- Alter the value column to allow larger numbers
ALTER TABLE landscape.tbl_benchmark_transaction_cost
  ALTER COLUMN value TYPE NUMERIC(12,2);

COMMIT;

-- Notes:
-- NUMERIC(12,2) allows values up to 9,999,999,999.99
-- This matches the unit_cost table definition (line 98 of migration 0014)
-- Previous: NUMERIC(8,4) max = 9,999.9999
-- New: NUMERIC(12,2) max = 9,999,999,999.99
