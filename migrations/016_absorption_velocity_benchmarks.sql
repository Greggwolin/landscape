SET search_path TO landscape;

-- ============================================================================
-- ABSORPTION VELOCITY BENCHMARK - GLOBAL ASSUMPTION
-- ============================================================================
-- Purpose: Single annual velocity assumption for MPC absorption rates
--          Used as default for project-level velocity inputs
--          Informed by RCLCO rankings, Zonda local data, market studies
-- ============================================================================

-- User-facing benchmark (simple)
CREATE TABLE bmk_absorption_velocity (
    absorption_velocity_id BIGSERIAL PRIMARY KEY,
    benchmark_id BIGINT REFERENCES tbl_global_benchmark_registry(benchmark_id),

    -- Single velocity input
    velocity_annual INTEGER NOT NULL, -- units per year

    -- Optional context
    market_geography VARCHAR(100), -- "Phoenix Metro", "Houston", etc.
    project_scale VARCHAR(20), -- 'small' | 'medium' | 'large' (optional)

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bmk_absorption_benchmark ON bmk_absorption_velocity(benchmark_id);
CREATE INDEX idx_bmk_absorption_geography ON bmk_absorption_velocity(market_geography);

COMMENT ON TABLE bmk_absorption_velocity IS 'Global absorption velocity assumptions - annual MPC sales rates';

-- ============================================================================
-- LANDSCAPER INTELLIGENCE LAYER (under the hood)
-- ============================================================================
-- Purpose: Granular subdivision data that Landscaper uses to inform velocity
--          recommendations. User uploads RCLCO/Zonda reports, AI extracts
--          and stores details here. This data is NOT directly visible to users
--          in the benchmark tile, but powers Landscaper guidance.
-- ============================================================================

CREATE TABLE landscaper_absorption_detail (
    detail_id BIGSERIAL PRIMARY KEY,
    benchmark_id BIGINT REFERENCES tbl_global_benchmark_registry(benchmark_id), -- links to simple benchmark

    -- Data source tracking
    data_source_type VARCHAR(50) NOT NULL, -- 'RCLCO_national' | 'Zonda_local' | 'MLS' | 'project_actual'
    source_document_id INTEGER, -- FK to document management system
    extraction_date TIMESTAMP DEFAULT NOW(),
    as_of_period VARCHAR(20), -- "Q3 2023", "Mid-Year 2025", etc.

    -- Granular details
    subdivision_name VARCHAR(200),
    mpc_name VARCHAR(200), -- for RCLCO national data
    city VARCHAR(100),
    state VARCHAR(2),
    market_geography VARCHAR(100), -- standardized market name

    -- Absorption metrics
    annual_sales INTEGER, -- for RCLCO MPC-level data
    monthly_rate NUMERIC(8,2), -- for Zonda subdivision-level data
    yoy_change_pct NUMERIC(6,2), -- year-over-year % change

    -- Product details (for local comps)
    lot_size_sf INTEGER,
    price_point_low NUMERIC(12,2),
    price_point_high NUMERIC(12,2),
    builder_name VARCHAR(100),
    active_subdivisions_count INTEGER, -- for aggregated data

    -- Optional metadata
    product_mix_json JSONB, -- {"SFR": 0.7, "townhome": 0.3}
    market_tier VARCHAR(20), -- 'primary' | 'secondary' | 'tertiary'
    competitive_supply VARCHAR(20), -- 'low' | 'medium' | 'high'

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_landscaper_absorption_benchmark ON landscaper_absorption_detail(benchmark_id);
CREATE INDEX idx_landscaper_absorption_source ON landscaper_absorption_detail(data_source_type);
CREATE INDEX idx_landscaper_absorption_geography ON landscaper_absorption_detail(market_geography);
CREATE INDEX idx_landscaper_absorption_lot_size ON landscaper_absorption_detail(lot_size_sf);
CREATE INDEX idx_landscaper_absorption_period ON landscaper_absorption_detail(as_of_period);

COMMENT ON TABLE landscaper_absorption_detail IS 'Granular absorption data for Landscaper intelligence - not directly visible in benchmark UI';

-- ============================================================================
-- PROJECT-LEVEL VELOCITY FIELD
-- ============================================================================
-- Add to existing tbl_project table

ALTER TABLE tbl_project
ADD COLUMN market_velocity_annual INTEGER,
ADD COLUMN velocity_override_reason TEXT;

COMMENT ON COLUMN tbl_project.market_velocity_annual IS 'Annual absorption velocity (units/year) - defaults from benchmark, can be overridden';
COMMENT ON COLUMN tbl_project.velocity_override_reason IS 'User explanation if overriding global benchmark velocity';
