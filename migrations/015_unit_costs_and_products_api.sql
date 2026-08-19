-- =====================================================
-- Migration 015: Unit Cost & Product Library API Support
-- =====================================================
-- Description: Adds audit flags to support AI-sourced templates
--              and indexes to improve API performance.
-- Date: November 8, 2025
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Track AI-originated unit cost templates
-- =====================================================

ALTER TABLE landscape.core_unit_cost_template
  ADD COLUMN IF NOT EXISTS created_from_ai BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN landscape.core_unit_cost_template.created_from_ai IS
  'Indicates the template was generated from an AI benchmark suggestion';

-- =====================================================
-- 2. Performance indexes for frequent API filters
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_unit_cost_template_active
  ON landscape.core_unit_cost_template(is_active);

CREATE INDEX IF NOT EXISTS idx_unit_cost_template_category_active
  ON landscape.core_unit_cost_template(category_id, is_active);

CREATE INDEX IF NOT EXISTS idx_unit_cost_template_search
  ON landscape.core_unit_cost_template USING GIN (to_tsvector('simple', item_name));

CREATE INDEX IF NOT EXISTS idx_res_lot_product_active
  ON landscape.res_lot_product(is_active);

COMMIT;
