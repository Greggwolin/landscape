-- Migration: Create tbl_cabinet table
-- Purpose: Security/tenancy boundary containing all of a user's or enterprise's data
-- Date: 2026-01-20
-- Part of Cabinet/Contact Architecture implementation

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

-- Create the cabinet table
CREATE TABLE IF NOT EXISTS landscape.tbl_cabinet (
    cabinet_id BIGSERIAL PRIMARY KEY,
    cabinet_name VARCHAR(200) NOT NULL,
    owner_user_id TEXT NOT NULL,  -- Clerk user ID or similar auth provider ID
    cabinet_type VARCHAR(50) DEFAULT 'standard' CHECK (cabinet_type IN ('standard', 'enterprise', 'personal')),
    settings JSONB DEFAULT '{}',  -- Default preferences, templates, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Index for user lookup (find cabinets by owner)
CREATE INDEX IF NOT EXISTS idx_cabinet_owner ON landscape.tbl_cabinet(owner_user_id);

-- Index for active cabinets
CREATE INDEX IF NOT EXISTS idx_cabinet_active ON landscape.tbl_cabinet(is_active) WHERE is_active = TRUE;

-- Add table comment
COMMENT ON TABLE landscape.tbl_cabinet IS 'Security/tenancy boundary. All projects, contacts, and documents belong to a cabinet.';
COMMENT ON COLUMN landscape.tbl_cabinet.cabinet_id IS 'Primary key';
COMMENT ON COLUMN landscape.tbl_cabinet.cabinet_name IS 'Display name for the cabinet';
COMMENT ON COLUMN landscape.tbl_cabinet.owner_user_id IS 'Auth provider user ID (e.g., Clerk user ID)';
COMMENT ON COLUMN landscape.tbl_cabinet.cabinet_type IS 'Type of cabinet: standard (default), enterprise (multi-user), personal (single user)';
COMMENT ON COLUMN landscape.tbl_cabinet.settings IS 'JSON object storing cabinet-level preferences and configuration';

-- Create a default cabinet for existing data migration
INSERT INTO landscape.tbl_cabinet (cabinet_name, owner_user_id, cabinet_type)
VALUES ('Default Cabinet', 'system', 'standard')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP INDEX IF EXISTS landscape.idx_cabinet_active;
-- DROP INDEX IF EXISTS landscape.idx_cabinet_owner;
-- DROP TABLE IF EXISTS landscape.tbl_cabinet;
