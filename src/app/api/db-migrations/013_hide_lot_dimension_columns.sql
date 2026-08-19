-- Migration: Hide lot_w_ft and lot_d_ft columns in templates
-- These are auto-calculated from product selection but should not be visible

-- Note: This doesn't affect the tbl_template_column_config table
-- because that table doesn't have an is_visible column.
-- The visibility is controlled in tbl_project_inventory_columns when the template is applied.

-- Update the POST /api/projects endpoint to handle visibility based on column name
-- For now, just document that lot_w_ft and lot_d_ft should be hidden when applying templates

SELECT 'Migration 013: Document hidden columns for template application' as status;

-- Columns that should be hidden when applying templates:
-- - lot_w_ft (auto-calculated from product)
-- - lot_d_ft (auto-calculated from product)

-- Columns that should be visible:
-- - lot_area_sf (displayed to user)
-- - acres_gross (displayed to user)
-- - acres_net (displayed to user)
