-- Migration 014 Rollback: Budget Category Hierarchy System
-- Reverts all changes from 014_budget_category_system.up.sql

-- Drop views
DROP VIEW IF EXISTS landscape.vw_budget_category_hierarchy;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_validate_budget_category_hierarchy ON landscape.core_budget_category;
DROP TRIGGER IF EXISTS trg_update_budget_category_timestamp ON landscape.core_budget_category;

-- Drop functions
DROP FUNCTION IF EXISTS landscape.validate_budget_category_hierarchy();
DROP FUNCTION IF EXISTS landscape.update_budget_category_timestamp();

-- Remove category columns from budget fact table
ALTER TABLE landscape.core_fin_fact_budget
    DROP COLUMN IF EXISTS category_l1_id,
    DROP COLUMN IF EXISTS category_l2_id,
    DROP COLUMN IF EXISTS category_l3_id,
    DROP COLUMN IF EXISTS category_l4_id;

-- Drop main table (CASCADE will handle foreign key constraints)
DROP TABLE IF EXISTS landscape.core_budget_category CASCADE;
