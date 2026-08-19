CREATE TABLE IF NOT EXISTS tbl_value_add_assumptions (
    value_add_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES tbl_project(project_id) NOT NULL UNIQUE,

    -- Renovation Program
    is_enabled BOOLEAN DEFAULT FALSE,
    reno_cost_per_sf NUMERIC(8,2) DEFAULT 8.00,
    relocation_incentive NUMERIC(10,2) DEFAULT 1500.00,
    renovate_all BOOLEAN DEFAULT TRUE,
    units_to_renovate INTEGER,
    reno_pace_per_month INTEGER DEFAULT 4,
    reno_start_month INTEGER DEFAULT 3,

    -- Rent Premium Capture
    rent_premium_pct NUMERIC(5,4) DEFAULT 0.15,
    relet_lag_months INTEGER DEFAULT 2,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_units CHECK (units_to_renovate IS NULL OR units_to_renovate > 0),
    CONSTRAINT valid_pace CHECK (reno_pace_per_month > 0),
    CONSTRAINT valid_start CHECK (reno_start_month >= 1),
    CONSTRAINT valid_premium CHECK (rent_premium_pct >= 0 AND rent_premium_pct <= 1)
);

COMMENT ON TABLE tbl_value_add_assumptions IS 'Value-add renovation program assumptions for multifamily underwriting';
COMMENT ON COLUMN tbl_value_add_assumptions.reno_cost_per_sf IS 'Interior renovation cost per square foot';
COMMENT ON COLUMN tbl_value_add_assumptions.relocation_incentive IS 'Lease buyout / move-out incentive per unit';
COMMENT ON COLUMN tbl_value_add_assumptions.rent_premium_pct IS 'Percentage rent increase post-renovation (0.15 = 15%)';
COMMENT ON COLUMN tbl_value_add_assumptions.relet_lag_months IS 'Months from vacancy to new lease at premium rent';
