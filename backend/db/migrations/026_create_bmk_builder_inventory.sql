-- Migration: 026_create_bmk_builder_inventory
-- Description: Create builder inventory table for QMI/spec home listings
-- Date: 2025-12-03

-- =============================================================================
-- Table: bmk_builder_inventory
-- Purpose: Stores quick-move-in and spec home listings from builder sources
-- =============================================================================

CREATE TABLE IF NOT EXISTS landscape.bmk_builder_inventory (
    id SERIAL PRIMARY KEY,

    -- Identity (composite unique key)
    source VARCHAR(32) NOT NULL,           -- 'lennar', 'nhs', etc.
    source_id VARCHAR(64) NOT NULL,        -- Listing ID from source

    -- Relationships (soft FKs via source + source_id pattern)
    community_source_id VARCHAR(64),       -- FK to parent community
    plan_source_id VARCHAR(64),            -- FK to plan (if known)

    -- Location
    address_line1 VARCHAR(256),
    city VARCHAR(64),
    state CHAR(2),
    zip_code VARCHAR(10),
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),

    -- Status & Pricing
    status VARCHAR(32),                    -- 'Available', 'Pending', 'Sold'
    price_current INTEGER,
    price_original INTEGER,

    -- Physical characteristics
    sqft_actual INTEGER,
    beds_actual SMALLINT,
    baths_actual DECIMAL(3, 1),
    lot_sqft INTEGER,

    -- Dates
    move_in_date DATE,

    -- Metadata
    source_url TEXT,

    -- Timestamps
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint for upsert
    UNIQUE (source, source_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bmk_inventory_community
    ON landscape.bmk_builder_inventory (source, community_source_id);

CREATE INDEX IF NOT EXISTS idx_bmk_inventory_status
    ON landscape.bmk_builder_inventory (status);

CREATE INDEX IF NOT EXISTS idx_bmk_inventory_price
    ON landscape.bmk_builder_inventory (price_current)
    WHERE price_current IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bmk_inventory_geo
    ON landscape.bmk_builder_inventory (lat, lng)
    WHERE lat IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bmk_inventory_city_state
    ON landscape.bmk_builder_inventory (city, state);

CREATE INDEX IF NOT EXISTS idx_bmk_inventory_last_seen
    ON landscape.bmk_builder_inventory (last_seen_at);

CREATE INDEX IF NOT EXISTS idx_bmk_inventory_move_in
    ON landscape.bmk_builder_inventory (move_in_date)
    WHERE move_in_date IS NOT NULL;

-- Add comment
COMMENT ON TABLE landscape.bmk_builder_inventory IS
    'Quick-move-in and spec home listings from builder sources with current pricing and availability';
