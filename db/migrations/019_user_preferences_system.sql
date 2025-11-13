-- Migration 019: User Preferences System
-- Purpose: Centralized user preference storage for UI state persistence
-- Date: 2025-11-13
-- Status: Phase 1 Implementation

-- =============================================================================
-- USER PREFERENCES TABLE
-- =============================================================================
-- Stores all user-level preferences with flexible JSON structure
-- Supports scoped preferences (project-specific, global, etc.)

CREATE TABLE IF NOT EXISTS landscape.tbl_user_preference (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    preference_key VARCHAR(255) NOT NULL,
    preference_value JSONB NOT NULL DEFAULT '{}',
    scope_type VARCHAR(50) DEFAULT 'global', -- 'global', 'project', 'organization'
    scope_id INTEGER, -- project_id, organization_id, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one preference key per scope per user
    CONSTRAINT unique_user_preference UNIQUE (user_id, preference_key, scope_type, scope_id)
);

-- Add indexes for common queries
CREATE INDEX idx_user_preference_user_id ON landscape.tbl_user_preference(user_id);
CREATE INDEX idx_user_preference_scope ON landscape.tbl_user_preference(scope_type, scope_id);
CREATE INDEX idx_user_preference_key ON landscape.tbl_user_preference(preference_key);
CREATE INDEX idx_user_preference_updated ON landscape.tbl_user_preference(updated_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION landscape.fn_update_user_preference_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_preference_updated
    BEFORE UPDATE ON landscape.tbl_user_preference
    FOR EACH ROW
    EXECUTE FUNCTION landscape.fn_update_user_preference_timestamp();

-- =============================================================================
-- COMMON PREFERENCE SCHEMAS
-- =============================================================================
-- Document expected structure for common preference types

COMMENT ON TABLE landscape.tbl_user_preference IS
'User preference storage with flexible JSON structure. Common preference_key values:
- theme: { mode: "light" | "dark" }
- budget.grouping: { isGrouped: boolean, expandedCategories: string[] }
- budget.filters: { containerIds: number[], showInactive: boolean }
- budget.columns: { hidden: string[], order: string[] }
- grid.pageSize: { value: number }
- map.defaults: { zoom: number, center: [lat, lon] }
scope_type determines context: global (all projects), project (specific project), organization';

-- =============================================================================
-- PREFERENCE MIGRATION HELPERS
-- =============================================================================
-- Helper function to migrate localStorage to database

CREATE OR REPLACE FUNCTION landscape.fn_migrate_user_preference(
    p_user_id INTEGER,
    p_preference_key VARCHAR(255),
    p_preference_value JSONB,
    p_scope_type VARCHAR(50) DEFAULT 'global',
    p_scope_id INTEGER DEFAULT NULL
)
RETURNS landscape.tbl_user_preference AS $$
DECLARE
    v_result landscape.tbl_user_preference;
BEGIN
    INSERT INTO landscape.tbl_user_preference (
        user_id,
        preference_key,
        preference_value,
        scope_type,
        scope_id
    ) VALUES (
        p_user_id,
        p_preference_key,
        p_preference_value,
        p_scope_type,
        p_scope_id
    )
    ON CONFLICT (user_id, preference_key, scope_type, scope_id)
    DO UPDATE SET
        preference_value = EXCLUDED.preference_value,
        updated_at = CURRENT_TIMESTAMP
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.fn_migrate_user_preference IS
'Upsert helper for migrating localStorage preferences to database.
Usage: SELECT landscape.fn_migrate_user_preference(1, ''theme'', ''{"mode":"dark"}'', ''global'', NULL);';

-- =============================================================================
-- PREFERENCE CLEANUP FUNCTIONS
-- =============================================================================
-- Remove stale preferences older than N days

CREATE OR REPLACE FUNCTION landscape.fn_cleanup_stale_preferences(
    p_days_threshold INTEGER DEFAULT 180
)
RETURNS TABLE(deleted_count INTEGER) AS $$
BEGIN
    RETURN QUERY
    WITH deleted AS (
        DELETE FROM landscape.tbl_user_preference
        WHERE last_accessed_at < CURRENT_TIMESTAMP - (p_days_threshold || ' days')::INTERVAL
        RETURNING preference_id
    )
    SELECT COUNT(*)::INTEGER FROM deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.fn_cleanup_stale_preferences IS
'Removes preferences not accessed in N days (default 180). Run periodically as maintenance.';

-- =============================================================================
-- SAMPLE DATA FOR TESTING
-- =============================================================================
-- Insert sample preferences for testing (using user_id=1 as default dev user)

DO $$
BEGIN
    -- Global theme preference
    PERFORM landscape.fn_migrate_user_preference(
        1, -- user_id
        'theme',
        '{"mode": "light"}'::jsonb,
        'global',
        NULL
    );

    -- Project-scoped budget grouping (project 7 - Peoria Lakes)
    PERFORM landscape.fn_migrate_user_preference(
        1,
        'budget.grouping',
        '{"isGrouped": true, "expandedCategories": []}'::jsonb,
        'project',
        7
    );

    RAISE NOTICE 'Sample user preferences created successfully';
END $$;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- View all preferences for a user
-- SELECT * FROM landscape.tbl_user_preference WHERE user_id = 1;

-- Get specific preference
-- SELECT preference_value
-- FROM landscape.tbl_user_preference
-- WHERE user_id = 1
--   AND preference_key = 'theme'
--   AND scope_type = 'global';

-- Get project-scoped preferences
-- SELECT preference_key, preference_value
-- FROM landscape.tbl_user_preference
-- WHERE user_id = 1
--   AND scope_type = 'project'
--   AND scope_id = 7;
