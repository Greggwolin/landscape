-- ============================================================================
-- Migration: 20260514c_make_analysis_fields_nullable.up.sql
-- Purpose:   Allow analysis_perspective and analysis_purpose to be NULL.
--
--            Both columns are real-estate-domain enums:
--              analysis_perspective ∈ ('INVESTMENT', 'DEVELOPMENT')
--              analysis_purpose     ∈ ('VALUATION', 'UNDERWRITING')
--
--            For user_home placeholder rows (project_kind='user_home') these
--            are semantically meaningless. The Project model already declares
--            both fields with blank=True, null=True, but the DB columns were
--            tightened to NOT NULL by an older migration. Drop NOT NULL so the
--            home-project insert path (apps.projects.services.home_project)
--            stops tripping on these columns.
--
--            Application-layer enforcement: real-estate row creation paths
--            (the project setup wizard, Landscaper project-creation tools, etc.)
--            should continue to require both values via serializer / form
--            validation. NULL is only legitimate for project_kind='user_home'.
--
-- Refs:      LF-USERDASH-0514 v2 Phase 2 (Cowork follow-up #2).
--            Companion: 20260514_add_project_kind.up.sql,
--                       20260514_make_project_type_code_nullable.up.sql.
--
-- Safety:    No data change. Existing rows retain non-null values. CHECK
--            constraints chk_analysis_perspective and chk_analysis_purpose
--            remain in force and continue to validate any non-null value
--            against the allowed enum.
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.tbl_project
  ALTER COLUMN analysis_perspective DROP NOT NULL;

ALTER TABLE landscape.tbl_project
  ALTER COLUMN analysis_purpose DROP NOT NULL;
