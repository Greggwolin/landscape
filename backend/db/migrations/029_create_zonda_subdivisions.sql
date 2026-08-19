-- Migration: Create zonda_subdivisions table
-- Description: Zonda subdivision inventory data - supply-side market intelligence
-- Date: 2025-12-03

-- ============================================================================
-- TABLE: zonda_subdivisions
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.zonda_subdivisions (
    id SERIAL PRIMARY KEY,
    msa_code VARCHAR(10) NOT NULL DEFAULT '38060',  -- Phoenix MSA

    -- Subdivision info
    project_name VARCHAR(200) NOT NULL,
    builder VARCHAR(200),
    mpc VARCHAR(200),                               -- Master Planned Community

    -- Property characteristics
    property_type VARCHAR(50),                      -- "Detached", "Attached"
    style VARCHAR(50),                              -- "Single Family", "Townhome"

    -- Lot dimensions
    lot_size_sf INT,                                -- Total lot SF
    lot_width INT,                                  -- Width in feet (45, 50, 55, etc.)
    lot_depth INT,                                  -- Depth in feet (parsed from Product)
    product_code VARCHAR(20),                       -- "45x115", "50x120"

    -- Inventory
    units_sold INT,
    units_remaining INT,

    -- Home sizes
    size_min_sf INT,
    size_max_sf INT,
    size_avg_sf INT,

    -- Pricing (base prices, not closing prices)
    price_min NUMERIC(12,2),
    price_max NUMERIC(12,2),
    price_avg NUMERIC(12,2),

    -- Location
    latitude NUMERIC(10,6),
    longitude NUMERIC(10,6),

    -- Metadata
    special_features TEXT,                          -- "Gated", "Golf", etc.
    source_file VARCHAR(200),
    source_date DATE,                               -- When Zonda data was collected
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one record per project + product combination
    UNIQUE (msa_code, project_name, product_code)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Lot width queries (common for pricing analysis)
CREATE INDEX IF NOT EXISTS idx_zonda_msa_lotwidth
    ON landscape.zonda_subdivisions(msa_code, lot_width);

-- Location-based queries
CREATE INDEX IF NOT EXISTS idx_zonda_location
    ON landscape.zonda_subdivisions(latitude, longitude);

-- Builder analysis
CREATE INDEX IF NOT EXISTS idx_zonda_builder
    ON landscape.zonda_subdivisions(builder);

-- MPC analysis
CREATE INDEX IF NOT EXISTS idx_zonda_mpc
    ON landscape.zonda_subdivisions(mpc);

-- Price range queries
CREATE INDEX IF NOT EXISTS idx_zonda_price
    ON landscape.zonda_subdivisions(msa_code, price_avg);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE landscape.zonda_subdivisions IS
    'Zonda subdivision inventory data. Supply-side market intelligence including active inventory, base pricing, lot dimensions, and builder information.';

COMMENT ON COLUMN landscape.zonda_subdivisions.msa_code IS
    'Metropolitan Statistical Area code. Default 38060 for Phoenix-Mesa-Chandler.';

COMMENT ON COLUMN landscape.zonda_subdivisions.project_name IS
    'Subdivision or community name from Zonda.';

COMMENT ON COLUMN landscape.zonda_subdivisions.mpc IS
    'Master Planned Community name. Nullable for standalone subdivisions.';

COMMENT ON COLUMN landscape.zonda_subdivisions.lot_width IS
    'Lot width in feet. Common values: 40, 45, 50, 55, 60, 65, 70, 75, 80.';

COMMENT ON COLUMN landscape.zonda_subdivisions.product_code IS
    'Product dimension code in WxD format. E.g., 45x115 = 45ft wide x 115ft deep.';

COMMENT ON COLUMN landscape.zonda_subdivisions.units_remaining IS
    'Unsold inventory count as of source_date.';

COMMENT ON COLUMN landscape.zonda_subdivisions.price_avg IS
    'Average base price. Not closing price - does not include options/upgrades.';

COMMENT ON COLUMN landscape.zonda_subdivisions.special_features IS
    'Special features like Active Adult, Gated, Golf, etc.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'landscape'
  AND table_name = 'zonda_subdivisions'
ORDER BY ordinal_position;
