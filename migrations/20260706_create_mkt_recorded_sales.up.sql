-- Migration: create mkt_recorded_sales
-- Date: 2026-07-06
-- Session: SM10-COUNTY-SALES-CONNECTOR-0706
--
-- Purpose: Market-wide corpus of recorded home sales sourced from county
-- Assessor / Recorder data (Maricopa first). This is DISTINCT from the
-- per-project appraisal comp table (tbl_sales_comparables): this table holds
-- the whole metro's recorded sales, queried by radius the same way the live
-- Redfin "Recent Sales" feed is, and it captures builder / new-construction
-- closings that never hit the MLS.
--
-- Rollback: 20260706_create_mkt_recorded_sales.down.sql

CREATE TABLE IF NOT EXISTS landscape.mkt_recorded_sales (
    recorded_sale_id    BIGSERIAL PRIMARY KEY,

    -- Source identity / lineage
    county              VARCHAR(64)  NOT NULL,           -- 'Maricopa', 'Pinal', ...
    apn                 VARCHAR(32)  NOT NULL,           -- county parcel number
    data_source         VARCHAR(64)  NOT NULL DEFAULT 'Maricopa County Records',

    -- Transaction
    sale_date           DATE,                            -- affidavit / recording sale date
    recording_date      DATE,                            -- date instrument recorded
    sale_price          NUMERIC(15,2),
    grantor             TEXT,                            -- seller (raw)
    grantee             TEXT,                            -- buyer (raw)
    deed_type           VARCHAR(64),                     -- warranty deed, quitclaim, etc. (raw)

    -- Market-quality classification (see maricopa_sales.classify_transfer)
    is_arms_length      BOOLEAN NOT NULL DEFAULT TRUE,
    exclusion_reason    VARCHAR(120),                    -- why filtered out of pricing sets

    -- Property characteristics (joined from characteristics file by APN)
    address             VARCHAR(255),
    city                VARCHAR(120),
    state               VARCHAR(2),
    zip                 VARCHAR(10),
    year_built          INTEGER,
    living_area_sf      INTEGER,
    lot_size_sf         INTEGER,
    land_use            VARCHAR(120),                    -- raw county land-use code / description
    property_type       VARCHAR(50),                     -- normalized discriminator ('LAND','Single Family',...)
    subdivision         VARCHAR(255),

    -- Geography (joined from parcels GIS layer by APN; county sales files
    -- are tabular and typically carry no lat/lng of their own)
    latitude            NUMERIC(10,7),
    longitude           NUMERIC(11,7),

    -- Full source row for audit / re-derivation without re-download
    raw_data            JSONB,

    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent upsert key: one row per parcel + sale date + price.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mkt_recorded_sales_natural
    ON landscape.mkt_recorded_sales (county, apn, sale_date, sale_price);

-- Radius queries filter on lat/lng (Haversine in the query layer, matching the
-- existing Redfin comp path) then on vintage + recency.
CREATE INDEX IF NOT EXISTS idx_mkt_recorded_sales_latlng
    ON landscape.mkt_recorded_sales (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_mkt_recorded_sales_sale_date
    ON landscape.mkt_recorded_sales (sale_date);
CREATE INDEX IF NOT EXISTS idx_mkt_recorded_sales_year_built
    ON landscape.mkt_recorded_sales (year_built);
CREATE INDEX IF NOT EXISTS idx_mkt_recorded_sales_arms_length
    ON landscape.mkt_recorded_sales (is_arms_length);

COMMENT ON TABLE landscape.mkt_recorded_sales IS
    'Metro-wide corpus of county-recorded home sales (Maricopa first). Queried by radius alongside the live Redfin feed to surface new-construction/builder closings the MLS misses. Market-level, NOT per-project — distinct from tbl_sales_comparables.';
