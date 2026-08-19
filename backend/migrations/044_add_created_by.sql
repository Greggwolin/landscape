-- Migration: Add created_by column + drop global UNIQUE on project_name
-- Date: 2026-03-01
-- Reason: Multi-tenancy flaw — project_name was globally unique across all users.
--         Two different users could not create projects with the same name.
--         Adding created_by TEXT to tag ownership on project creation.
--
-- NOTE: This duplicates migrations/20260301_drop_project_name_unique.sql
--       which was already applied to the database during this session.

-- UP
ALTER TABLE landscape.tbl_project DROP CONSTRAINT IF EXISTS tbl_project_project_name_key;
ALTER TABLE landscape.tbl_project ADD COLUMN IF NOT EXISTS created_by TEXT;

-- DOWN (rollback)
-- ALTER TABLE landscape.tbl_project ADD CONSTRAINT tbl_project_project_name_key UNIQUE (project_name);
-- ALTER TABLE landscape.tbl_project DROP COLUMN IF EXISTS created_by;
