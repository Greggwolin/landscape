-- Migration: Create tbl_expense_comparable
-- Date: 2026-03-24
-- Purpose: Store expense comparable operating statements (JSONB expenses column)

-- UP
CREATE TABLE IF NOT EXISTS landscape.tbl_expense_comparable (
  comparable_id    SERIAL PRIMARY KEY,
  project_id       INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  property_name    VARCHAR(200) NOT NULL,
  address          VARCHAR(300),
  distance_miles   NUMERIC(5,2),
  year_built       INTEGER,
  total_units      INTEGER,
  total_sqft       INTEGER,
  -- Operating statement as JSONB: { "Real Estate Taxes": 285000, "Property Insurance": 78000, ... }
  expenses         JSONB NOT NULL DEFAULT '{}',
  total_opex       NUMERIC(12,2),  -- Cached sum for quick reads
  data_source      VARCHAR(100),   -- CoStar, Manual Entry, Broker, etc.
  as_of_date       DATE,
  notes            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  latitude         NUMERIC(10,7),
  longitude        NUMERIC(10,7),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expense_comparable_project ON landscape.tbl_expense_comparable(project_id);
CREATE INDEX idx_expense_comparable_active ON landscape.tbl_expense_comparable(project_id, is_active);

-- DOWN
-- DROP INDEX IF EXISTS landscape.idx_expense_comparable_active;
-- DROP INDEX IF EXISTS landscape.idx_expense_comparable_project;
-- DROP TABLE IF EXISTS landscape.tbl_expense_comparable;
