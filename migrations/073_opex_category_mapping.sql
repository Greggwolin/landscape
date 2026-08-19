-- Migration: 073_opex_category_mapping.sql
-- Purpose: Create new OpEx categories and map existing tbl_operating_expenses rows to category_id
-- Date: 2026-01-27
-- Depends on: 072_add_opex_source_column.sql (source column must exist)
-- Note: This migration documents the data mapping done during wiring task

-- ============================================================================
-- UP: Create new categories and map data
-- ============================================================================

-- 1. Create new categories under 4550 Payroll & Personnel
INSERT INTO landscape.core_unit_cost_category
  (account_number, category_name, parent_id, is_active, created_at, updated_at)
SELECT '4559', 'Worker''s Compensation', 89, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.core_unit_cost_category WHERE account_number = '4559'
);

-- 2. Create new categories under 4400 Administrative
INSERT INTO landscape.core_unit_cost_category
  (account_number, category_name, parent_id, is_active, created_at, updated_at)
SELECT '4432', 'Bank Charges', 56, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.core_unit_cost_category WHERE account_number = '4432'
);

INSERT INTO landscape.core_unit_cost_category
  (account_number, category_name, parent_id, is_active, created_at, updated_at)
SELECT '4433', 'Computer/Software', 56, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.core_unit_cost_category WHERE account_number = '4433'
);

-- 3. Map unmapped expense rows to appropriate categories
-- Note: These updates are idempotent (WHERE category_id IS NULL)

-- management_offsite -> 4412 Off-Site Management Fee
UPDATE landscape.tbl_operating_expenses
SET category_id = (SELECT category_id FROM landscape.core_unit_cost_category WHERE account_number = '4412')
WHERE expense_category = 'management_offsite' AND category_id IS NULL;

-- workmans_comp -> 4559 Worker's Compensation
UPDATE landscape.tbl_operating_expenses
SET category_id = (SELECT category_id FROM landscape.core_unit_cost_category WHERE account_number = '4559')
WHERE expense_category = 'workmans_comp' AND category_id IS NULL;

-- office_supplies -> 4431 Office Supplies
UPDATE landscape.tbl_operating_expenses
SET category_id = (SELECT category_id FROM landscape.core_unit_cost_category WHERE account_number = '4431')
WHERE expense_category = 'office_supplies' AND category_id IS NULL;

-- legal -> 4420 Professional Fees
UPDATE landscape.tbl_operating_expenses
SET category_id = (SELECT category_id FROM landscape.core_unit_cost_category WHERE account_number = '4420')
WHERE expense_category = 'legal' AND category_id IS NULL;

-- computer_software -> 4433 Computer/Software
UPDATE landscape.tbl_operating_expenses
SET category_id = (SELECT category_id FROM landscape.core_unit_cost_category WHERE account_number = '4433')
WHERE expense_category = 'computer_software' AND category_id IS NULL;

-- bank_charges -> 4432 Bank Charges
UPDATE landscape.tbl_operating_expenses
SET category_id = (SELECT category_id FROM landscape.core_unit_cost_category WHERE account_number = '4432')
WHERE expense_category = 'bank_charges' AND category_id IS NULL;

-- outside_services -> 4340 Contracted Services
UPDATE landscape.tbl_operating_expenses
SET category_id = (SELECT category_id FROM landscape.core_unit_cost_category WHERE account_number = '4340')
WHERE expense_category = 'outside_services' AND category_id IS NULL;

-- ============================================================================
-- DOWN: Rollback
-- ============================================================================
-- Note: Rolling back data mapping would require storing original values
-- The category_id values can be set back to NULL if needed:
--
-- UPDATE landscape.tbl_operating_expenses
-- SET category_id = NULL
-- WHERE expense_category IN ('management_offsite', 'workmans_comp', 'office_supplies',
--                            'legal', 'computer_software', 'bank_charges', 'outside_services');
--
-- DELETE FROM landscape.core_unit_cost_category WHERE account_number IN ('4559', '4432', '4433');
