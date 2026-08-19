-- 017_unit_cost_template_extensions.sql
-- Adds inline-editing support columns for unit cost templates.

ALTER TABLE landscape.core_unit_cost_template
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS source VARCHAR(200),
  ADD COLUMN IF NOT EXISTS as_of_date DATE;
