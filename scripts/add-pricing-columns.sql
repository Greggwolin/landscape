-- Add pricing columns to market_assumptions table
-- This extends the table to support land use pricing data

ALTER TABLE landscape.market_assumptions
ADD COLUMN IF NOT EXISTS lu_type_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(20),
ADD COLUMN IF NOT EXISTS inflation_type VARCHAR(50);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_market_assumptions_project_lutype
ON landscape.market_assumptions(project_id, lu_type_code);

-- Add foreign key constraint to lu_subtype if needed
-- ALTER TABLE landscape.market_assumptions
-- ADD CONSTRAINT fk_market_assumptions_lu_subtype
-- FOREIGN KEY (lu_type_code) REFERENCES landscape.lu_subtype(code);