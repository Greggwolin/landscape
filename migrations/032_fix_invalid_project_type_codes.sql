-- 032_fix_invalid_project_type_codes.sql
-- ============================================================================
-- PROBLEM: The CHECK constraint in production had DEV instead of LAND
-- The actual constraint was: CHECK (project_type_code IN ('DEV', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'))
-- But it should be:         CHECK (project_type_code IN ('LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'))
-- ============================================================================
--
-- This migration was ALREADY RUN on 2025-12-13 via psql directly.
-- Keeping this file for documentation.
--
-- What was executed:
-- 1. DROP CONSTRAINT check_project_type_code
-- 2. UPDATE tbl_project SET project_type_code = 'LAND' WHERE project_type_code = 'DEV' (4 rows updated)
-- 3. ADD CONSTRAINT check_project_type_code CHECK (project_type_code IN ('LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'))
-- ============================================================================

-- Step 1: Drop the incorrect constraint
ALTER TABLE landscape.tbl_project DROP CONSTRAINT IF EXISTS check_project_type_code;

-- Step 2: Fix DEV -> LAND
UPDATE landscape.tbl_project
SET project_type_code = 'LAND'
WHERE project_type_code = 'DEV';

-- Step 3: Add correct constraint
ALTER TABLE landscape.tbl_project
ADD CONSTRAINT check_project_type_code
CHECK (project_type_code IN ('LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'));

-- ============================================================================
-- ADDITIONAL FIXES (if needed for future data)
-- ============================================================================

-- Show what we're about to fix
SELECT project_id, project_name, project_type_code, analysis_type, property_subtype
FROM landscape.tbl_project
WHERE project_type_code NOT IN ('LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU');

-- Fix based on analysis_type and property_subtype
UPDATE landscape.tbl_project
SET project_type_code = CASE
    -- Land Development projects -> LAND
    WHEN analysis_type = 'Land Development' THEN 'LAND'

    -- Income Property projects -> derive from property_subtype
    WHEN analysis_type = 'Income Property' THEN
        CASE
            -- Multifamily subtypes
            WHEN LOWER(property_subtype) LIKE '%garden%' THEN 'MF'
            WHEN LOWER(property_subtype) LIKE '%mid-rise%' THEN 'MF'
            WHEN LOWER(property_subtype) LIKE '%high-rise%' THEN 'MF'
            WHEN LOWER(property_subtype) LIKE '%student%' THEN 'MF'
            WHEN LOWER(property_subtype) LIKE '%senior%' THEN 'MF'
            WHEN LOWER(property_subtype) LIKE '%affordable%' THEN 'MF'
            WHEN LOWER(property_subtype) LIKE '%multifamily%' THEN 'MF'

            -- Office subtypes
            WHEN LOWER(property_subtype) LIKE '%office%' THEN 'OFF'
            WHEN LOWER(property_subtype) LIKE '%flex%' THEN 'OFF'
            WHEN LOWER(property_subtype) LIKE '%r&d%' THEN 'OFF'

            -- Retail subtypes
            WHEN LOWER(property_subtype) LIKE '%retail%' THEN 'RET'
            WHEN LOWER(property_subtype) LIKE '%center%' THEN 'RET'
            WHEN LOWER(property_subtype) LIKE '%strip%' THEN 'RET'

            -- Industrial subtypes
            WHEN LOWER(property_subtype) LIKE '%warehouse%' THEN 'IND'
            WHEN LOWER(property_subtype) LIKE '%manufacturing%' THEN 'IND'
            WHEN LOWER(property_subtype) LIKE '%industrial%' THEN 'IND'
            WHEN LOWER(property_subtype) LIKE '%storage%' THEN 'IND'
            WHEN LOWER(property_subtype) LIKE '%distribution%' THEN 'IND'

            -- Hotel subtypes
            WHEN LOWER(property_subtype) LIKE '%hotel%' THEN 'HTL'
            WHEN LOWER(property_subtype) LIKE '%service%' THEN 'HTL'
            WHEN LOWER(property_subtype) LIKE '%stay%' THEN 'HTL'
            WHEN LOWER(property_subtype) LIKE '%resort%' THEN 'HTL'
            WHEN LOWER(property_subtype) LIKE '%hospitality%' THEN 'HTL'

            -- Mixed-Use subtypes
            WHEN LOWER(property_subtype) LIKE '%mixed%' THEN 'MXU'
            WHEN property_subtype LIKE '%/%' THEN 'MXU'

            -- Default to MF for Income Property with unknown subtype
            ELSE 'MF'
        END

    -- Default to LAND for anything else
    ELSE 'LAND'
END,
updated_at = NOW()
WHERE project_type_code NOT IN ('LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU');

-- Verify fix
SELECT project_id, project_name, project_type_code, analysis_type, property_subtype
FROM landscape.tbl_project
ORDER BY project_id;
