-- Location Brief — universal Landscaper tool
-- Persistent cache keyed by (location_key, depth). Invalidation is
-- release-schedule-driven: FRED series carry next_release_date, Census
-- ACS 5-Year drops annually in December. A brief is fresh until EITHER
-- (a) any underlying FRED series has a scheduled release after the
-- cached_at timestamp, or (b) the Census vintage rolls over.
--
-- Briefs are tied to the user (not the thread or project) so a user
-- who asks about Phoenix twice in a week sees the same brief without
-- re-spending tokens. If Gregg later wants per-thread briefs we add a
-- thread_id column and a unique index on (thread_id, location_key, depth).

-- UP
BEGIN;

-- 1. Persistent briefs (one row per user × location × depth combo)
CREATE TABLE IF NOT EXISTS landscape.tbl_location_brief (
    brief_id            BIGSERIAL PRIMARY KEY,
    user_id             UUID,                    -- NULL = anonymous / shared
    location_key        TEXT NOT NULL,           -- normalized "phoenix-az" style
    location_display    TEXT NOT NULL,           -- "Phoenix, AZ" for UI
    property_type       VARCHAR(16) NOT NULL,    -- LAND, MF, OFF, etc.
    depth               VARCHAR(16) NOT NULL DEFAULT 'standard',  -- condensed | standard | comprehensive
    center_lat          NUMERIC(10, 6),
    center_lon          NUMERIC(10, 6),
    geo_hierarchy       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {state, county, msa, city, cbsa_type}
    indicators          JSONB NOT NULL DEFAULT '{}'::jsonb,   -- raw FRED + Census values
    sections            JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{title, content}, ...]
    summary             TEXT,
    data_as_of          DATE,                    -- latest observation date across indicators
    next_refresh_at     TIMESTAMPTZ,             -- earliest scheduled release among sources
    cached_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accessed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    access_count        INTEGER NOT NULL DEFAULT 1
);

-- One canonical brief per (user, location, depth)
CREATE UNIQUE INDEX IF NOT EXISTS uq_location_brief_user_loc_depth
    ON landscape.tbl_location_brief (COALESCE(user_id::text, ''), location_key, depth);

CREATE INDEX IF NOT EXISTS idx_location_brief_user
    ON landscape.tbl_location_brief (user_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_brief_refresh
    ON landscape.tbl_location_brief (next_refresh_at)
    WHERE next_refresh_at IS NOT NULL;

COMMIT;

-- DOWN (rollback)
-- BEGIN;
-- DROP INDEX IF EXISTS landscape.idx_location_brief_refresh;
-- DROP INDEX IF EXISTS landscape.idx_location_brief_user;
-- DROP INDEX IF EXISTS landscape.uq_location_brief_user_loc_depth;
-- DROP TABLE IF EXISTS landscape.tbl_location_brief;
-- COMMIT;
