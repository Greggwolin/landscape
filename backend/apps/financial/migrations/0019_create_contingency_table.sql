-- Migration: Create contingency standards table
-- Simple table to store contingency percentage benchmarks

BEGIN;

CREATE TABLE IF NOT EXISTS landscape.tbl_benchmark_contingency (
  benchmark_id INTEGER PRIMARY KEY REFERENCES landscape.tbl_global_benchmark_registry(benchmark_id) ON DELETE CASCADE,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_benchmark_contingency_benchmark_id
  ON landscape.tbl_benchmark_contingency(benchmark_id);

COMMIT;

-- Notes:
-- percentage: Store as 0-100 (e.g., 5.5 for 5.5%)
-- NUMERIC(5,2) allows values from 0.00 to 999.99
