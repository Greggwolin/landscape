-- ============================================================================
-- Migration: 20260514_make_project_type_code_nullable.up.sql
-- Purpose:   Allow tbl_project.project_type_code to be NULL.
--
--            User home projects (project_kind='user_home', added in the
--            companion migration 20260514_add_project_kind) are placeholder
--            rows that own a user's non-project chat threads. They carry no
--            property data and have no meaningful property-type semantics —
--            'LAND', 'MF', 'OFF', etc. all misclassify a chat-parent row.
--
--            Pre-this-migration the column was NOT NULL with a DB default of
--            'LAND'. Django's ORM .create() sends explicit NULL for fields
--            not passed in kwargs, which overrides the DB default and trips
--            the NOT NULL constraint when home_project.get_or_create runs.
--            Dropping NOT NULL fixes the home-project insert path cleanly
--            and lets us keep project_type_code semantically honest (NULL
--            for non-real-estate rows; a valid code for real-estate rows).
--
-- Refs:      LF-USERDASH-0514 v2 Phase 2 (Cowork follow-up).
--            Companion: 20260514_add_project_kind.up.sql.
--
-- Safety:    No data change. Existing rows retain their non-null values; the
--            check_project_type_code CHECK constraint still validates any
--            non-null value against the allowed property-type enum.
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.tbl_project
  ALTER COLUMN project_type_code DROP NOT NULL;

COMMENT ON COLUMN landscape.tbl_project.project_type_code IS
  'Property type discriminator (LAND/MF/OFF/RET/IND/HTL/MXU). Required for project_kind=''real_estate'' rows; NULL is permitted on project_kind=''user_home'' placeholder rows that have no property semantics. Validate at the application layer if a real-estate row must always have a code.';
