-- Migration: Add confidence and data_source columns to tbl_absorption_schedule
-- Date: 2026-02-26
-- Purpose: Support absorption data provenance tracking for land dev ingestion tools

-- ============================================================================
-- UP
-- ============================================================================

ALTER TABLE landscape.tbl_absorption_schedule
    ADD COLUMN IF NOT EXISTS confidence VARCHAR(20) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT NULL;

COMMENT ON COLUMN landscape.tbl_absorption_schedule.confidence IS
    'Data confidence level: observed (market data), inferred (derived from comps), assumed (user estimate)';

COMMENT ON COLUMN landscape.tbl_absorption_schedule.data_source IS
    'Source of absorption data (e.g., Metrostudy Q4 2025, Builder interview, Zonda report)';

-- ============================================================================
-- DOWN (rollback)
-- ============================================================================
-- ALTER TABLE landscape.tbl_absorption_schedule DROP COLUMN IF EXISTS confidence;
-- ALTER TABLE landscape.tbl_absorption_schedule DROP COLUMN IF EXISTS data_source;
