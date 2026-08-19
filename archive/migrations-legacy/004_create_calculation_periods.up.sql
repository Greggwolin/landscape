BEGIN;

CREATE TABLE IF NOT EXISTS landscape.tbl_calculation_period (
    period_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    period_sequence INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_calculation_period_project
      FOREIGN KEY (project_id)
      REFERENCES landscape.tbl_project(project_id)
      ON DELETE CASCADE,
    CONSTRAINT uq_calculation_period_sequence UNIQUE (project_id, period_sequence),
    CONSTRAINT ck_calculation_period_dates
      CHECK (period_end_date >= period_start_date)
);

CREATE INDEX IF NOT EXISTS idx_calculation_period_project
  ON landscape.tbl_calculation_period(project_id, period_sequence);

CREATE TABLE IF NOT EXISTS landscape.tbl_budget_timing (
    timing_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fact_id BIGINT NOT NULL,
    period_id BIGINT NOT NULL,
    amount NUMERIC NOT NULL,
    timing_method VARCHAR(20) DEFAULT 'distributed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_budget_timing_fact
      FOREIGN KEY (fact_id)
      REFERENCES landscape.core_fin_fact_budget(fact_id)
      ON DELETE CASCADE,
    CONSTRAINT fk_budget_timing_period
      FOREIGN KEY (period_id)
      REFERENCES landscape.tbl_calculation_period(period_id)
      ON DELETE CASCADE,
    CONSTRAINT uq_budget_timing UNIQUE (fact_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_budget_timing_fact
  ON landscape.tbl_budget_timing(fact_id);

CREATE INDEX IF NOT EXISTS idx_budget_timing_period
  ON landscape.tbl_budget_timing(period_id);

COMMIT;
