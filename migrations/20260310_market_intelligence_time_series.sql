-- ============================================================================
-- Migration: Market Intelligence Time Series Infrastructure
-- Date: 2026-03-10
-- Purpose: Create three-table normalized schema for storing market time series
--          data from multiple sources (FRED, Realtor.com, HBACA, Cromford, etc.)
--          across multiple geographies and property types.
--
-- Design:
--   tbl_market_geography  — Geography hierarchy (MSA → City → Zip → Submarket)
--   tbl_market_series     — Series registry (what metric, from where, for where)
--   tbl_market_observation — Actual data points (date + value)
--
-- Existing tables NOT touched:
--   market_activity       — 9,392 rows of HBACA permit data (keep as-is, migrate later)
--   market_assumptions    — Project-level assumptions (separate concern)
--   market_competitive_projects — Comp survey data (separate concern)
--   lu_market             — Lookup table (seeded into geography table below)
-- ============================================================================

SET search_path TO landscape, public;

-- ============================================================================
-- TABLE 1: tbl_market_geography
-- Hierarchical geography model with self-referencing parent.
-- Supports MSA, county, city, zip, submarket levels.
-- ============================================================================
CREATE TABLE IF NOT EXISTS tbl_market_geography (
    geography_id        SERIAL PRIMARY KEY,
    parent_geography_id INTEGER REFERENCES tbl_market_geography(geography_id),
    geo_level           VARCHAR(20) NOT NULL
                        CHECK (geo_level IN ('national','state','msa','county','city','zip','submarket','custom')),
    geo_name            VARCHAR(200) NOT NULL,
    geo_code            VARCHAR(50),          -- FIPS, CBSA, ZIP code, etc.
    state_code          VARCHAR(2),           -- Two-letter state abbreviation
    cbsa_code           VARCHAR(10),          -- CBSA code for MSA-level (e.g., '38060' for Phoenix)
    fips_code           VARCHAR(10),          -- County/place FIPS
    latitude            NUMERIC(10, 7),
    longitude           NUMERIC(10, 7),
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: no duplicate geo at same level with same code
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_geo_level_code
    ON tbl_market_geography(geo_level, geo_code)
    WHERE geo_code IS NOT NULL;

-- Index for hierarchy traversal
CREATE INDEX IF NOT EXISTS idx_market_geo_parent
    ON tbl_market_geography(parent_geography_id);

COMMENT ON TABLE tbl_market_geography IS 'Hierarchical geography dimension for market intelligence data. Supports national → state → MSA → county → city → zip → submarket.';


-- ============================================================================
-- TABLE 2: tbl_market_series
-- Registry of all tracked data series. Each row = one metric from one source
-- for one geography. Decoupled from project — this is market-level data.
-- ============================================================================
CREATE TABLE IF NOT EXISTS tbl_market_series (
    series_id           SERIAL PRIMARY KEY,
    series_code         VARCHAR(100) NOT NULL,  -- e.g., 'MORTGAGE30US', 'RDC_MEDIAN_LISTING_PRICE'
    source              VARCHAR(50) NOT NULL,   -- e.g., 'FRED', 'RDC', 'HBACA', 'CROMFORD', 'CENSUS'
    geography_id        INTEGER REFERENCES tbl_market_geography(geography_id),
    property_type       VARCHAR(20),            -- NULL=all, 'RES','MF','OFF','RET','IND','LAND'
    category            VARCHAR(50),            -- e.g., 'mortgage_rates', 'home_prices', 'permits', 'inventory'
    frequency           VARCHAR(20) NOT NULL DEFAULT 'monthly'
                        CHECK (frequency IN ('daily','weekly','monthly','quarterly','annual')),
    unit                VARCHAR(50),            -- e.g., 'percent', 'dollars', 'units', 'index', 'months_supply'
    display_name        VARCHAR(200) NOT NULL,  -- Human-readable: "30-Year Fixed Mortgage Rate"
    description         TEXT,                   -- Longer explanation
    source_series_id    VARCHAR(100),           -- External ID at source (FRED series ID, etc.)
    source_url          TEXT,                   -- URL to source data page
    is_active           BOOLEAN DEFAULT TRUE,
    last_observation_date DATE,                 -- Denormalized for quick freshness checks
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one series per source+code+geography+property_type combo
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_series_unique
    ON tbl_market_series(series_code, source, COALESCE(geography_id, 0), COALESCE(property_type, ''));

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_market_series_source ON tbl_market_series(source);
CREATE INDEX IF NOT EXISTS idx_market_series_category ON tbl_market_series(category);
CREATE INDEX IF NOT EXISTS idx_market_series_geo ON tbl_market_series(geography_id);

COMMENT ON TABLE tbl_market_series IS 'Registry of tracked market data series. Each row = one metric from one source for one geography. Decoupled from individual projects.';


-- ============================================================================
-- TABLE 3: tbl_market_observation
-- The actual data points. One row per series per date.
-- This is the "fact" table — will grow large over time.
-- ============================================================================
CREATE TABLE IF NOT EXISTS tbl_market_observation (
    observation_id      BIGSERIAL PRIMARY KEY,
    series_id           INTEGER NOT NULL REFERENCES tbl_market_series(series_id) ON DELETE CASCADE,
    obs_date            DATE NOT NULL,
    value               NUMERIC,               -- NULL = missing/unreported for that period
    value_text          VARCHAR(100),           -- For non-numeric values (e.g., 'N/A', qualitative)
    revision_of         BIGINT,                 -- Points to prior observation_id if this is a revision
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Primary lookup pattern: get all observations for a series, ordered by date
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_obs_series_date
    ON tbl_market_observation(series_id, obs_date);

-- Partition-friendly index for date range queries across series
CREATE INDEX IF NOT EXISTS idx_market_obs_date
    ON tbl_market_observation(obs_date);

COMMENT ON TABLE tbl_market_observation IS 'Time series data points. One row per series per observation date. Supports revisions via revision_of pointer.';


-- ============================================================================
-- SEED DATA: Core Geographies
-- Seed from lu_market + add hierarchy for Phoenix metro area
-- ============================================================================

-- National level
INSERT INTO tbl_market_geography (geo_level, geo_name, geo_code, state_code)
VALUES ('national', 'United States', 'US', NULL)
ON CONFLICT DO NOTHING;

-- State level
INSERT INTO tbl_market_geography (geo_level, geo_name, geo_code, state_code, parent_geography_id)
SELECT 'state', 'Arizona', 'AZ', 'AZ', g.geography_id
FROM tbl_market_geography g WHERE g.geo_code = 'US'
ON CONFLICT DO NOTHING;

-- MSA level — Phoenix-Mesa-Chandler
INSERT INTO tbl_market_geography (geo_level, geo_name, geo_code, state_code, cbsa_code, parent_geography_id)
SELECT 'msa', 'Phoenix-Mesa-Chandler MSA', '38060', 'AZ', '38060', g.geography_id
FROM tbl_market_geography g WHERE g.geo_code = 'AZ' AND g.geo_level = 'state'
ON CONFLICT DO NOTHING;

-- City level — Key Phoenix metro cities (HBACA permit cities)
-- Parent = Phoenix MSA
DO $$
DECLARE
    msa_id INTEGER;
BEGIN
    SELECT geography_id INTO msa_id
    FROM tbl_market_geography
    WHERE geo_code = '38060' AND geo_level = 'msa';

    IF msa_id IS NOT NULL THEN
        INSERT INTO tbl_market_geography (geo_level, geo_name, state_code, cbsa_code, parent_geography_id) VALUES
            ('city', 'Phoenix', 'AZ', '38060', msa_id),
            ('city', 'Mesa', 'AZ', '38060', msa_id),
            ('city', 'Chandler', 'AZ', '38060', msa_id),
            ('city', 'Scottsdale', 'AZ', '38060', msa_id),
            ('city', 'Tempe', 'AZ', '38060', msa_id),
            ('city', 'Gilbert', 'AZ', '38060', msa_id),
            ('city', 'Glendale', 'AZ', '38060', msa_id),
            ('city', 'Peoria', 'AZ', '38060', msa_id),
            ('city', 'Surprise', 'AZ', '38060', msa_id),
            ('city', 'Avondale', 'AZ', '38060', msa_id),
            ('city', 'Goodyear', 'AZ', '38060', msa_id),
            ('city', 'Buckeye', 'AZ', '38060', msa_id),
            ('city', 'Casa Grande', 'AZ', '38060', msa_id),
            ('city', 'Maricopa', 'AZ', '38060', msa_id),
            ('city', 'Queen Creek', 'AZ', '38060', msa_id),
            ('city', 'Florence', 'AZ', '38060', msa_id),
            ('city', 'Apache Junction', 'AZ', '38060', msa_id),
            ('city', 'Fountain Hills', 'AZ', '38060', msa_id),
            ('city', 'Litchfield Park', 'AZ', '38060', msa_id),
            ('city', 'Paradise Valley', 'AZ', '38060', msa_id),
            ('city', 'Tolleson', 'AZ', '38060', msa_id),
            ('city', 'El Mirage', 'AZ', '38060', msa_id),
            ('city', 'Wickenburg', 'AZ', '38060', msa_id),
            ('city', 'Carefree', 'AZ', '38060', msa_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;


-- ============================================================================
-- SEED DATA: Core FRED Series
-- 9 FRED series from the Housing Master Dataset
-- ============================================================================
DO $$
DECLARE
    national_id INTEGER;
    az_id INTEGER;
    msa_id INTEGER;
BEGIN
    SELECT geography_id INTO national_id FROM tbl_market_geography WHERE geo_code = 'US' AND geo_level = 'national';
    SELECT geography_id INTO az_id FROM tbl_market_geography WHERE geo_code = 'AZ' AND geo_level = 'state';
    SELECT geography_id INTO msa_id FROM tbl_market_geography WHERE geo_code = '38060' AND geo_level = 'msa';

    INSERT INTO tbl_market_series (series_code, source, geography_id, category, frequency, unit, display_name, source_series_id, source_url) VALUES
        -- National mortgage/economic series
        ('MORTGAGE30US', 'FRED', national_id, 'mortgage_rates', 'monthly', 'percent',
         '30-Year Fixed Mortgage Rate', 'MORTGAGE30US',
         'https://fred.stlouisfed.org/series/MORTGAGE30US'),

        ('MORTGAGE15US', 'FRED', national_id, 'mortgage_rates', 'monthly', 'percent',
         '15-Year Fixed Mortgage Rate', 'MORTGAGE15US',
         'https://fred.stlouisfed.org/series/MORTGAGE15US'),

        ('FEDFUNDS', 'FRED', national_id, 'economic', 'monthly', 'percent',
         'Federal Funds Rate', 'FEDFUNDS',
         'https://fred.stlouisfed.org/series/FEDFUNDS'),

        ('CPIAUCSL', 'FRED', national_id, 'economic', 'monthly', 'index',
         'Consumer Price Index (All Urban)', 'CPIAUCSL',
         'https://fred.stlouisfed.org/series/CPIAUCSL'),

        ('PPIACO', 'FRED', national_id, 'economic', 'monthly', 'index',
         'Producer Price Index (All Commodities)', 'PPIACO',
         'https://fred.stlouisfed.org/series/PPIACO'),

        -- National home price index
        ('CSUSHPINSA', 'FRED', national_id, 'home_prices', 'monthly', 'index',
         'Case-Shiller US National Home Price Index', 'CSUSHPINSA',
         'https://fred.stlouisfed.org/series/CSUSHPINSA'),

        -- Phoenix-specific series
        ('PHXRNSA', 'FRED', msa_id, 'home_prices', 'monthly', 'index',
         'Case-Shiller Phoenix Home Price Index', 'PHXRNSA',
         'https://fred.stlouisfed.org/series/PHXRNSA'),

        -- Arizona HPI
        ('AZSTHPI', 'FRED', az_id, 'home_prices', 'quarterly', 'index',
         'Arizona All-Transactions House Price Index', 'AZSTHPI',
         'https://fred.stlouisfed.org/series/AZSTHPI'),

        -- Phoenix MSA HPI
        ('ATNHPIUS38060Q', 'FRED', msa_id, 'home_prices', 'quarterly', 'index',
         'Phoenix MSA All-Transactions House Price Index', 'ATNHPIUS38060Q',
         'https://fred.stlouisfed.org/series/ATNHPIUS38060Q')
    ON CONFLICT DO NOTHING;
END $$;


-- ============================================================================
-- SEED DATA: RDC (Realtor.com) Series — Phoenix MSA
-- 7 columns from the Housing Master Dataset mapped to series
-- ============================================================================
DO $$
DECLARE
    msa_id INTEGER;
BEGIN
    SELECT geography_id INTO msa_id FROM tbl_market_geography WHERE geo_code = '38060' AND geo_level = 'msa';

    INSERT INTO tbl_market_series (series_code, source, geography_id, property_type, category, frequency, unit, display_name) VALUES
        ('RDC_MEDIAN_LISTING_PRICE',     'RDC', msa_id, 'RES', 'home_prices',  'monthly', 'dollars',       'Median Listing Price'),
        ('RDC_MEDIAN_LISTING_PPSF',      'RDC', msa_id, 'RES', 'home_prices',  'monthly', 'dollars_per_sf','Median Listing Price per Sq Ft'),
        ('RDC_MEDIAN_DAYS_ON_MARKET',    'RDC', msa_id, 'RES', 'inventory',    'monthly', 'days',          'Median Days on Market'),
        ('RDC_NEW_LISTING_COUNT',        'RDC', msa_id, 'RES', 'inventory',    'monthly', 'units',         'New Listing Count'),
        ('RDC_ACTIVE_LISTING_COUNT',     'RDC', msa_id, 'RES', 'inventory',    'monthly', 'units',         'Active Listing Count'),
        ('RDC_MEDIAN_SOLD_PRICE',        'RDC', msa_id, 'RES', 'home_prices',  'monthly', 'dollars',       'Median Sold Price'),
        ('RDC_PRICE_REDUCED_COUNT',      'RDC', msa_id, 'RES', 'inventory',    'monthly', 'units',         'Price Reduced Count')
    ON CONFLICT DO NOTHING;
END $$;


-- ============================================================================
-- SEED DATA: HBACA Permit Series — Per City
-- One series per city for SFD permits (primary metric in Housing Master)
-- ============================================================================
DO $$
DECLARE
    city RECORD;
BEGIN
    FOR city IN
        SELECT geography_id, geo_name
        FROM tbl_market_geography
        WHERE geo_level = 'city' AND state_code = 'AZ' AND cbsa_code = '38060'
    LOOP
        INSERT INTO tbl_market_series (
            series_code, source, geography_id, property_type, category,
            frequency, unit, display_name
        ) VALUES (
            'HBACA_SFD_PERMITS_' || UPPER(REPLACE(REPLACE(city.geo_name, ' ', '_'), '''', '')),
            'HBACA',
            city.geography_id,
            'LAND',
            'permits',
            'monthly',
            'units',
            'SFD Building Permits — ' || city.geo_name
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;


-- ============================================================================
-- UPDATE TRIGGER: auto-update updated_at on geography and series tables
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_market_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_market_geography_updated ON tbl_market_geography;
CREATE TRIGGER trg_market_geography_updated
    BEFORE UPDATE ON tbl_market_geography
    FOR EACH ROW EXECUTE FUNCTION trg_market_updated_at();

DROP TRIGGER IF EXISTS trg_market_series_updated ON tbl_market_series;
CREATE TRIGGER trg_market_series_updated
    BEFORE UPDATE ON tbl_market_series
    FOR EACH ROW EXECUTE FUNCTION trg_market_updated_at();


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- To undo this migration:
--
-- DROP TRIGGER IF EXISTS trg_market_series_updated ON tbl_market_series;
-- DROP TRIGGER IF EXISTS trg_market_geography_updated ON tbl_market_geography;
-- DROP FUNCTION IF EXISTS trg_market_updated_at();
-- DROP TABLE IF EXISTS tbl_market_observation CASCADE;
-- DROP TABLE IF EXISTS tbl_market_series CASCADE;
-- DROP TABLE IF EXISTS tbl_market_geography CASCADE;
-- ============================================================================
