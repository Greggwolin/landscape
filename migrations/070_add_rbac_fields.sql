-- Migration: 070_add_rbac_fields.sql
-- Purpose: Add role-based access control fields for User and Project ownership
-- Date: 2026-01-25

-- ============================================================================
-- UP: Add RBAC fields
-- ============================================================================

-- 1. Add demo_projects_provisioned column to auth_user table
ALTER TABLE landscape.auth_user
ADD COLUMN IF NOT EXISTS demo_projects_provisioned BOOLEAN DEFAULT FALSE;

-- 2. Migrate existing role='user' to 'alpha_tester'
UPDATE landscape.auth_user
SET role = 'alpha_tester'
WHERE role = 'user' OR role IS NULL OR role = '';

-- 3. Add created_by_id column to tbl_project for ownership tracking
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS created_by_id INTEGER;

-- 4. Add foreign key constraint (nullable to support existing projects)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_created_by'
    ) THEN
        ALTER TABLE landscape.tbl_project
        ADD CONSTRAINT fk_project_created_by
        FOREIGN KEY (created_by_id) REFERENCES landscape.auth_user(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Add index for efficient ownership queries
CREATE INDEX IF NOT EXISTS idx_tbl_project_created_by_id
ON landscape.tbl_project(created_by_id);

-- 6. Add check constraint for valid role values (advisory, not enforced by DB)
COMMENT ON COLUMN landscape.auth_user.role IS 'User role: admin or alpha_tester';
COMMENT ON COLUMN landscape.auth_user.demo_projects_provisioned IS 'Whether demo projects have been provisioned for this user';
COMMENT ON COLUMN landscape.tbl_project.created_by_id IS 'User who created this project (for RBAC ownership)';

-- ============================================================================
-- DOWN: Rollback RBAC fields
-- ============================================================================

-- To rollback, run these commands:
--
-- -- Remove index
-- DROP INDEX IF EXISTS landscape.idx_tbl_project_created_by_id;
--
-- -- Remove foreign key constraint
-- ALTER TABLE landscape.tbl_project DROP CONSTRAINT IF EXISTS fk_project_created_by;
--
-- -- Remove created_by_id column
-- ALTER TABLE landscape.tbl_project DROP COLUMN IF EXISTS created_by_id;
--
-- -- Remove demo_projects_provisioned column
-- ALTER TABLE landscape.auth_user DROP COLUMN IF EXISTS demo_projects_provisioned;
--
-- -- Revert role to 'user' (optional - depends on business logic)
-- UPDATE landscape.auth_user SET role = 'user' WHERE role = 'alpha_tester';
