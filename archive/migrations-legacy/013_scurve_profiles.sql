-- ============================================================================
-- Migration 013: S-Curve Distribution Profiles
-- Date: 2025-11-10
-- Purpose: Create curve profile catalog + steepness modifier for budget timing
-- Context: Enables ARGUS-style cumulative percentage curves with presets
-- ============================================================================

-- ============================================================================
-- 1. Named Curve Profiles (cumulative percentages at each decile)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.core_fin_curve_profile (
    curve_id      SERIAL PRIMARY KEY,
    curve_name    VARCHAR(50) NOT NULL UNIQUE,
    curve_code    VARCHAR(10) NOT NULL UNIQUE,
    description   TEXT,

    -- Cumulative % of total amount spent/received by each 10% time increment
    pct_at_10   NUMERIC(5,2) NOT NULL CHECK (pct_at_10  BETWEEN 0 AND 100),
    pct_at_20   NUMERIC(5,2) NOT NULL CHECK (pct_at_20  BETWEEN 0 AND 100),
    pct_at_30   NUMERIC(5,2) NOT NULL CHECK (pct_at_30  BETWEEN 0 AND 100),
    pct_at_40   NUMERIC(5,2) NOT NULL CHECK (pct_at_40  BETWEEN 0 AND 100),
    pct_at_50   NUMERIC(5,2) NOT NULL CHECK (pct_at_50  BETWEEN 0 AND 100),
    pct_at_60   NUMERIC(5,2) NOT NULL CHECK (pct_at_60  BETWEEN 0 AND 100),
    pct_at_70   NUMERIC(5,2) NOT NULL CHECK (pct_at_70  BETWEEN 0 AND 100),
    pct_at_80   NUMERIC(5,2) NOT NULL CHECK (pct_at_80  BETWEEN 0 AND 100),
    pct_at_90   NUMERIC(5,2) NOT NULL CHECK (pct_at_90  BETWEEN 0 AND 100),
    pct_at_100  NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (pct_at_100 = 100),

    -- Metadata
    is_active   BOOLEAN DEFAULT TRUE,
    is_system   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure cumulative percentages are non-decreasing
    CONSTRAINT cumulative_increasing CHECK (
        pct_at_10 <= pct_at_20 AND
        pct_at_20 <= pct_at_30 AND
        pct_at_30 <= pct_at_40 AND
        pct_at_40 <= pct_at_50 AND
        pct_at_50 <= pct_at_60 AND
        pct_at_60 <= pct_at_70 AND
        pct_at_70 <= pct_at_80 AND
        pct_at_80 <= pct_at_90 AND
        pct_at_90 <= pct_at_100
    )
);

CREATE INDEX IF NOT EXISTS idx_curve_profile_code
    ON landscape.core_fin_curve_profile(curve_code);

CREATE INDEX IF NOT EXISTS idx_curve_profile_active
    ON landscape.core_fin_curve_profile(is_active)
    WHERE is_active = TRUE;

COMMENT ON TABLE landscape.core_fin_curve_profile IS
'Named S-curve profiles for cost/revenue distribution timing';

COMMENT ON COLUMN landscape.core_fin_curve_profile.pct_at_10 IS
'Cumulative % of total amount spent/received by 10% time elapsed';

-- Seed default profiles (mirrors ARGUS S/S1-S4)
INSERT INTO landscape.core_fin_curve_profile (
    curve_name, curve_code, description,
    pct_at_10, pct_at_20, pct_at_30, pct_at_40, pct_at_50,
    pct_at_60, pct_at_70, pct_at_80, pct_at_90, pct_at_100,
    is_system
) VALUES
    (
        'Standard S-Curve',
        'S',
        'Classic S-curve with gradual start, steep middle, gradual finish',
        5.0, 11.0, 19.0, 30.0, 50.0,
        70.0, 81.0, 89.0, 95.0, 100.0,
        TRUE
    ),
    (
        'Front-Loaded',
        'S1',
        'More spending early - typical for engineering, permits, mobilization',
        15.0, 28.0, 40.0, 52.0, 64.0,
        75.0, 84.0, 91.0, 96.0, 100.0,
        TRUE
    ),
    (
        'Back-Loaded',
        'S2',
        'More spending late - typical for landscaping, punch list, closeout',
        4.0, 9.0, 16.0, 25.0, 36.0,
        48.0, 60.0, 72.0, 85.0, 100.0,
        TRUE
    ),
    (
        'Aggressive',
        'S3',
        'Very steep middle transition - compressed construction schedule',
        3.0, 8.0, 15.0, 25.0, 50.0,
        75.0, 85.0, 92.0, 97.0, 100.0,
        TRUE
    ),
    (
        'Conservative',
        'S4',
        'Very gradual ramp - high uncertainty or extended timeline',
        8.0, 15.0, 23.0, 32.0, 50.0,
        68.0, 77.0, 85.0, 92.0, 100.0,
        TRUE
    )
ON CONFLICT (curve_code) DO NOTHING;

-- ============================================================================
-- 2. Steepness modifier column on budget facts
-- ============================================================================

ALTER TABLE landscape.core_fin_fact_budget
    ADD COLUMN IF NOT EXISTS curve_steepness NUMERIC(5,2)
        DEFAULT 50.00
        CHECK (curve_steepness BETWEEN 0 AND 100);

COMMENT ON COLUMN landscape.core_fin_fact_budget.curve_steepness IS
'Steepness modifier (0-100 scale) for custom S-curves. 50 = standard.';

CREATE INDEX IF NOT EXISTS idx_fact_budget_curve
    ON landscape.core_fin_fact_budget(curve_id, timing_method);
