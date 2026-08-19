-- Migration: 025_create_bmk_builder_plans
-- Description: Create builder plans benchmarks table for floor plan data
-- Date: 2025-12-03

-- =============================================================================
-- Table: bmk_builder_plans
-- Purpose: Stores normalized floor plan data from builder sources
-- =============================================================================

CREATE TABLE IF NOT EXISTS landscape.bmk_builder_plans (
    id SERIAL PRIMARY KEY,

    -- Identity (composite unique key)
    source VARCHAR(32) NOT NULL,           -- 'lennar', 'nhs', etc.
    source_id VARCHAR(64) NOT NULL,        -- Plan ID from source
    community_source_id VARCHAR(64) NOT NULL, -- FK to parent community's source_id

    -- Plan details
    plan_name VARCHAR(128) NOT NULL,
    series_name VARCHAR(64),
    product_type VARCHAR(32),              -- 'SFD', 'TH', 'Condo'

    -- Pricing
    base_price INTEGER,

    -- Size (ranges)
    sqft_min INTEGER,
    sqft_max INTEGER,
    beds_min SMALLINT,
    beds_max SMALLINT,
    baths_min DECIMAL(3, 1),
    baths_max DECIMAL(3, 1),

    -- Physical characteristics
    garage_spaces SMALLINT,
    stories SMALLINT,

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
CREATE INDEX IF NOT EXISTS idx_bmk_plans_community
    ON landscape.bmk_builder_plans (source, community_source_id);

CREATE INDEX IF NOT EXISTS idx_bmk_plans_product_type
    ON landscape.bmk_builder_plans (product_type);

CREATE INDEX IF NOT EXISTS idx_bmk_plans_base_price
    ON landscape.bmk_builder_plans (base_price)
    WHERE base_price IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bmk_plans_sqft
    ON landscape.bmk_builder_plans (sqft_min, sqft_max)
    WHERE sqft_min IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bmk_plans_last_seen
    ON landscape.bmk_builder_plans (last_seen_at);

-- Add comment
COMMENT ON TABLE landscape.bmk_builder_plans IS
    'Individual floor plans within builder communities, with base pricing and specifications';
