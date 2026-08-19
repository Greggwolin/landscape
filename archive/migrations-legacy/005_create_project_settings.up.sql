BEGIN;

CREATE TABLE IF NOT EXISTS landscape.tbl_project_settings (
    project_id BIGINT PRIMARY KEY,
    default_currency VARCHAR(3) DEFAULT 'USD',
    default_period_type VARCHAR(20) DEFAULT 'monthly',
    global_inflation_rate NUMERIC DEFAULT 0.03,
    analysis_start_date DATE,
    analysis_end_date DATE,
    discount_rate NUMERIC DEFAULT 0.10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_project_settings_project
      FOREIGN KEY (project_id)
      REFERENCES landscape.tbl_project(project_id)
      ON DELETE CASCADE,
    CONSTRAINT ck_project_settings_dates
      CHECK (analysis_end_date IS NULL OR analysis_start_date IS NULL OR analysis_end_date >= analysis_start_date)
);

CREATE INDEX IF NOT EXISTS idx_project_settings_currency
  ON landscape.tbl_project_settings(default_currency);

COMMIT;
