-- Migration 066: Income Property Table Renames
-- Date: 2026-01-20
-- Status: EXECUTED
-- Purpose: Rename CRE-prefixed tables to universal income property names
-- Part of: Income Property Schema Architecture (Core + Extension pattern)
--
-- EXECUTION NOTES:
-- Some tables (tbl_lease, tbl_space, tbl_tenant) already existed in the schema
-- with their own data, so the CRE tables were handled as follows:
--
-- Successfully renamed:
-- tbl_cre_property (2 rows)          → tbl_income_property
-- tbl_cre_base_rent (13 rows)        → tbl_rent_schedule
-- tbl_cre_expense_recovery (1 row)   → tbl_expense_recovery
-- tbl_cre_percentage_rent (1 row)    → tbl_percentage_rent
-- tbl_cre_rent_escalation (2 rows)   → tbl_rent_escalation
--
-- Handled separately (existing tables with same name):
-- tbl_cre_lease (5 rows)             → tbl_commercial_lease (kept separate)
-- tbl_cre_space                      → tbl_space already existed (41 rows)
-- tbl_cre_tenant                     → tbl_tenant already existed (78 rows)

-- ============================================================================
-- PHASE 1: RENAME TABLES THAT DON'T CONFLICT
-- ============================================================================

-- Leaf tables (no inbound FKs from other CRE tables)
ALTER TABLE IF EXISTS landscape.tbl_cre_base_rent
    RENAME TO tbl_rent_schedule;

ALTER TABLE IF EXISTS landscape.tbl_cre_expense_recovery
    RENAME TO tbl_expense_recovery;

ALTER TABLE IF EXISTS landscape.tbl_cre_percentage_rent
    RENAME TO tbl_percentage_rent;

ALTER TABLE IF EXISTS landscape.tbl_cre_rent_escalation
    RENAME TO tbl_rent_escalation;

-- Root table (parent of CRE hierarchy)
ALTER TABLE IF EXISTS landscape.tbl_cre_property
    RENAME TO tbl_income_property;

-- Handle lease separately - rename to commercial_lease since tbl_lease exists
ALTER TABLE IF EXISTS landscape.tbl_cre_lease
    RENAME TO tbl_commercial_lease;

-- ============================================================================
-- PHASE 2: RENAME PRIMARY KEY COLUMNS
-- ============================================================================

-- Rename cre_property_id to income_property_id in tbl_income_property
ALTER TABLE IF EXISTS landscape.tbl_income_property
    RENAME COLUMN cre_property_id TO income_property_id;

-- Rename the FK column in child tables (if they have cre_property_id)
-- tbl_space may have been the original CRE space table renamed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'landscape'
        AND table_name = 'tbl_space'
        AND column_name = 'cre_property_id'
    ) THEN
        ALTER TABLE landscape.tbl_space RENAME COLUMN cre_property_id TO income_property_id;
    END IF;
END $$;

-- Rename FK in commercial_lease
ALTER TABLE IF EXISTS landscape.tbl_commercial_lease
    RENAME COLUMN cre_property_id TO income_property_id;

-- ============================================================================
-- PHASE 3: RENAME SEQUENCES
-- ============================================================================

ALTER SEQUENCE IF EXISTS landscape.tbl_cre_property_cre_property_id_seq
    RENAME TO tbl_income_property_income_property_id_seq;

ALTER SEQUENCE IF EXISTS landscape.tbl_cre_base_rent_base_rent_id_seq
    RENAME TO tbl_rent_schedule_rent_schedule_id_seq;

ALTER SEQUENCE IF EXISTS landscape.tbl_cre_expense_recovery_expense_recovery_id_seq
    RENAME TO tbl_expense_recovery_expense_recovery_id_seq;

ALTER SEQUENCE IF EXISTS landscape.tbl_cre_percentage_rent_percentage_rent_id_seq
    RENAME TO tbl_percentage_rent_percentage_rent_id_seq;

ALTER SEQUENCE IF EXISTS landscape.tbl_cre_rent_escalation_escalation_id_seq
    RENAME TO tbl_rent_escalation_escalation_id_seq;

ALTER SEQUENCE IF EXISTS landscape.tbl_cre_lease_lease_id_seq
    RENAME TO tbl_commercial_lease_lease_id_seq;

-- ============================================================================
-- PHASE 4: ADD PROPERTY_TYPE DISCRIMINATOR TO CORE TABLES
-- ============================================================================

-- Add property_type column to income_property for Core + Extension pattern
ALTER TABLE IF EXISTS landscape.tbl_income_property
    ADD COLUMN IF NOT EXISTS property_type_code VARCHAR(10) DEFAULT 'CRE';

-- Update existing records to have proper type codes based on property_type field
UPDATE landscape.tbl_income_property
SET property_type_code = CASE
    WHEN property_type ILIKE '%apartment%' OR property_type ILIKE '%multifamily%' THEN 'MF'
    WHEN property_type ILIKE '%retail%' OR property_type ILIKE '%shopping%' THEN 'RET'
    WHEN property_type ILIKE '%industrial%' OR property_type ILIKE '%warehouse%' THEN 'IND'
    WHEN property_type ILIKE '%office%' THEN 'OFF'
    ELSE 'CRE'
END
WHERE property_type_code IS NULL OR property_type_code = 'CRE';

-- Add space_type discriminator to tbl_space
ALTER TABLE IF EXISTS landscape.tbl_space
    ADD COLUMN IF NOT EXISTS space_type_code VARCHAR(10) DEFAULT 'CRE';

-- Add lease_type discriminator to both lease tables
ALTER TABLE IF EXISTS landscape.tbl_lease
    ADD COLUMN IF NOT EXISTS lease_type_code VARCHAR(10) DEFAULT 'MF';

ALTER TABLE IF EXISTS landscape.tbl_commercial_lease
    ADD COLUMN IF NOT EXISTS lease_type_code VARCHAR(10) DEFAULT 'CRE';

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

/*
-- Check renamed tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'landscape'
AND table_name IN (
    'tbl_income_property', 'tbl_commercial_lease',
    'tbl_rent_schedule', 'tbl_expense_recovery',
    'tbl_percentage_rent', 'tbl_rent_escalation'
);

-- Check no CRE tables remain
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'landscape'
AND table_name LIKE 'tbl_cre_%';

-- Verify data preserved
SELECT 'tbl_income_property' as tbl, COUNT(*) FROM landscape.tbl_income_property
UNION ALL
SELECT 'tbl_commercial_lease', COUNT(*) FROM landscape.tbl_commercial_lease;
*/

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================

/*
-- Rename back to CRE
ALTER TABLE landscape.tbl_income_property RENAME TO tbl_cre_property;
ALTER TABLE landscape.tbl_commercial_lease RENAME TO tbl_cre_lease;
ALTER TABLE landscape.tbl_rent_schedule RENAME TO tbl_cre_base_rent;
ALTER TABLE landscape.tbl_expense_recovery RENAME TO tbl_cre_expense_recovery;
ALTER TABLE landscape.tbl_percentage_rent RENAME TO tbl_cre_percentage_rent;
ALTER TABLE landscape.tbl_rent_escalation RENAME TO tbl_cre_rent_escalation;

-- Rename columns back
ALTER TABLE landscape.tbl_cre_property RENAME COLUMN income_property_id TO cre_property_id;
ALTER TABLE landscape.tbl_cre_lease RENAME COLUMN income_property_id TO cre_property_id;

-- Drop discriminator columns
ALTER TABLE landscape.tbl_cre_property DROP COLUMN IF EXISTS property_type_code;
ALTER TABLE landscape.tbl_space DROP COLUMN IF EXISTS space_type_code;
ALTER TABLE landscape.tbl_lease DROP COLUMN IF EXISTS lease_type_code;
ALTER TABLE landscape.tbl_cre_lease DROP COLUMN IF EXISTS lease_type_code;
*/
