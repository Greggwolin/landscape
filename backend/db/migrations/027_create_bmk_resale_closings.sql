-- Migration: Create bmk_resale_closings table
-- Description: Stores resale/closing records from Redfin and other MLS sources
-- for comparable sales analysis in napkin mode pricing.

CREATE TABLE IF NOT EXISTS landscape.bmk_resale_closings (
    id SERIAL PRIMARY KEY,

    -- Identity (required)
    source VARCHAR(32) NOT NULL,          -- e.g., 'redfin', 'mls', 'recorder'
    source_id VARCHAR(64) NOT NULL,       -- MLS# or source-specific unique ID

    -- Transaction (required)
    sale_price INTEGER NOT NULL,          -- Closing/sale price in dollars
    sale_date DATE NOT NULL,              -- Closing date

    -- Location
    address_line1 VARCHAR(256),           -- Street address
    city VARCHAR(64),
    state CHAR(2),                        -- 2-letter state abbreviation
    zip_code VARCHAR(10),
    lat DECIMAL(10, 7),                   -- Latitude
    lng DECIMAL(10, 7),                   -- Longitude

    -- Property classification
    property_type VARCHAR(32),            -- 'house', 'condo', 'townhouse'

    -- Transaction details
    list_price INTEGER,                   -- Original list price
    list_date DATE,                       -- Listing date
    days_on_market SMALLINT,              -- Days on market

    -- Physical characteristics
    sqft INTEGER,                         -- Living area square footage
    lot_sqft INTEGER,                     -- Lot size in square feet
    price_per_sqft INTEGER,               -- $/sqft (derived)
    year_built SMALLINT,                  -- Year built
    beds SMALLINT,                        -- Bedroom count
    baths DECIMAL(3, 1),                  -- Bathroom count (e.g., 2.5)

    -- Builder info (if detectable)
    builder_name VARCHAR(128),            -- Builder name if known
    subdivision_name VARCHAR(256),        -- Subdivision/community name

    -- Metadata
    source_url TEXT,                      -- Link to listing

    -- Timestamps
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Uniqueness constraint for upsert
    UNIQUE (source, source_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bmk_resale_closings_source
    ON landscape.bmk_resale_closings (source);

CREATE INDEX IF NOT EXISTS idx_bmk_resale_closings_sale_date
    ON landscape.bmk_resale_closings (sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_bmk_resale_closings_location
    ON landscape.bmk_resale_closings (city, state);

CREATE INDEX IF NOT EXISTS idx_bmk_resale_closings_geo
    ON landscape.bmk_resale_closings (lat, lng);

CREATE INDEX IF NOT EXISTS idx_bmk_resale_closings_year_built
    ON landscape.bmk_resale_closings (year_built);

-- Comment on table
COMMENT ON TABLE landscape.bmk_resale_closings IS
    'Resale/closing records from Redfin and MLS sources for comparable sales analysis';
