-- Migration: 024_create_bmk_builder_communities
-- Description: Create builder community benchmarks table for aggregated builder data
-- Date: 2025-12-03

-- =============================================================================
-- Table: bmk_builder_communities
-- Purpose: Stores normalized community data from Lennar, NHS, and other builders
-- =============================================================================

CREATE TABLE IF NOT EXISTS landscape.bmk_builder_communities (
    id SERIAL PRIMARY KEY,

    -- Identity (composite unique key)
    source VARCHAR(32) NOT NULL,           -- 'lennar', 'nhs', 'taylor_morrison', etc.
    source_id VARCHAR(64) NOT NULL,        -- MD5 of URL or native ID

    -- Builder & Community
    builder_name VARCHAR(128) NOT NULL,
    community_name VARCHAR(256) NOT NULL,
    market_label VARCHAR(64),              -- e.g., 'Phoenix, AZ'

    -- Location
    city VARCHAR(64),
    state CHAR(2),
    zip_code VARCHAR(10),
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),

    -- Pricing (ranges)
    price_min INTEGER,
    price_max INTEGER,

    -- Size (ranges)
    sqft_min INTEGER,
    sqft_max INTEGER,
    beds_min SMALLINT,
    beds_max SMALLINT,
    baths_min DECIMAL(3, 1),
    baths_max DECIMAL(3, 1),

    -- Fees
    hoa_monthly INTEGER,

    -- Metadata
    product_types VARCHAR(256),            -- Comma-separated: 'SFD,TH,Condo'
    plan_count SMALLINT,
    inventory_count SMALLINT,
    source_url TEXT,

    -- Timestamps
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint for upsert
    UNIQUE (source, source_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bmk_communities_builder
    ON landscape.bmk_builder_communities (builder_name);

CREATE INDEX IF NOT EXISTS idx_bmk_communities_market
    ON landscape.bmk_builder_communities (market_label);

CREATE INDEX IF NOT EXISTS idx_bmk_communities_city_state
    ON landscape.bmk_builder_communities (city, state);

CREATE INDEX IF NOT EXISTS idx_bmk_communities_geo
    ON landscape.bmk_builder_communities (lat, lng)
    WHERE lat IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bmk_communities_last_seen
    ON landscape.bmk_builder_communities (last_seen_at);

CREATE INDEX IF NOT EXISTS idx_bmk_communities_price_range
    ON landscape.bmk_builder_communities (price_min, price_max)
    WHERE price_min IS NOT NULL;

-- Add comment
COMMENT ON TABLE landscape.bmk_builder_communities IS
    'Builder community benchmarks aggregated from Lennar, NHS, and multi-builder recon tools';
