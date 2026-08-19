-- Migration: 20260116_value_add_v2.sql
-- Purpose: Add new fields for Value-Add UI v2 (two-panel layout with impact calculations)

-- Add cost basis toggle (SF vs Unit)
ALTER TABLE tbl_value_add_assumptions
ADD COLUMN IF NOT EXISTS reno_cost_basis VARCHAR(10) DEFAULT 'sf';

-- Add constraint if not exists (check first)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'valid_cost_basis'
    ) THEN
        ALTER TABLE tbl_value_add_assumptions
        ADD CONSTRAINT valid_cost_basis CHECK (reno_cost_basis IN ('sf', 'unit'));
    END IF;
END $$;

-- Add months to complete (renovation duration per unit)
ALTER TABLE tbl_value_add_assumptions
ADD COLUMN IF NOT EXISTS months_to_complete INTEGER DEFAULT 3;

-- Add constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'valid_months_to_complete'
    ) THEN
        ALTER TABLE tbl_value_add_assumptions
        ADD CONSTRAINT valid_months_to_complete CHECK (months_to_complete > 0);
    END IF;
END $$;

-- Rename reno_pace_per_month to reno_starts_per_month for clarity
-- First check if old column exists and new doesn't
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tbl_value_add_assumptions'
        AND column_name = 'reno_pace_per_month'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tbl_value_add_assumptions'
        AND column_name = 'reno_starts_per_month'
    ) THEN
        ALTER TABLE tbl_value_add_assumptions
        RENAME COLUMN reno_pace_per_month TO reno_starts_per_month;
    END IF;
END $$;

-- Comments
COMMENT ON COLUMN tbl_value_add_assumptions.reno_cost_basis IS 'Cost input type: sf ($/SF) or unit ($/Unit)';
COMMENT ON COLUMN tbl_value_add_assumptions.months_to_complete IS 'Duration of renovation work per unit in months';
COMMENT ON COLUMN tbl_value_add_assumptions.reno_starts_per_month IS 'Number of units entering renovation each month';
