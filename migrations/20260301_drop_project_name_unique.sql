-- Migration: Drop global UNIQUE constraint on project_name
-- Date: 2026-03-01
-- Reason: project_name was globally unique across all users/accounts.
--         Two different users could not create projects with the same name.
--         This is a multi-tenancy flaw — project names should only need to be
--         unique within an account/user scope (if at all).
--
-- Also adds created_by column for future multi-tenancy scoping.

-- UP
ALTER TABLE landscape.tbl_project DROP CONSTRAINT IF EXISTS tbl_project_project_name_key;
ALTER TABLE landscape.tbl_project ADD COLUMN IF NOT EXISTS created_by TEXT;

-- DOWN (rollback)
-- ALTER TABLE landscape.tbl_project ADD CONSTRAINT tbl_project_project_name_key UNIQUE (project_name);
-- ALTER TABLE landscape.tbl_project DROP COLUMN IF EXISTS created_by;
