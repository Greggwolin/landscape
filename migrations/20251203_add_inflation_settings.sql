-- Add cost/price inflation growth rate selections to project settings
ALTER TABLE landscape.tbl_project_settings
  ADD COLUMN IF NOT EXISTS cost_inflation_set_id BIGINT NULL,
  ADD COLUMN IF NOT EXISTS price_inflation_set_id BIGINT NULL;

-- Optional: index for quick lookups
CREATE INDEX IF NOT EXISTS idx_project_settings_cost_inflation_set
  ON landscape.tbl_project_settings (cost_inflation_set_id);
CREATE INDEX IF NOT EXISTS idx_project_settings_price_inflation_set
  ON landscape.tbl_project_settings (price_inflation_set_id);
