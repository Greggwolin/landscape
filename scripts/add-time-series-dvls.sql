-- Add time series DVL columns to market_assumptions table
-- This enables market factors to include $/Yr, $/Qtr, $/Mo pricing options

ALTER TABLE landscape.market_assumptions
ADD COLUMN IF NOT EXISTS dvl_per_year DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS dvl_per_quarter DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS dvl_per_month DECIMAL(15,2);

-- Add comments for clarity
COMMENT ON COLUMN landscape.market_assumptions.dvl_per_year IS 'Market factor DVL in dollars per year ($/Yr)';
COMMENT ON COLUMN landscape.market_assumptions.dvl_per_quarter IS 'Market factor DVL in dollars per quarter ($/Qtr)';
COMMENT ON COLUMN landscape.market_assumptions.dvl_per_month IS 'Market factor DVL in dollars per month ($/Mo)';

-- Add index for better performance on time series queries
CREATE INDEX IF NOT EXISTS idx_market_assumptions_dvl_timeseries
ON landscape.market_assumptions(project_id, dvl_per_year, dvl_per_quarter, dvl_per_month);