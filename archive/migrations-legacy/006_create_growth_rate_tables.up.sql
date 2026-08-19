BEGIN;

-- Growth Rate Sets table - manages named rate profiles
CREATE TABLE IF NOT EXISTS landscape.core_fin_growth_rate_sets (
  set_id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL,
  card_type VARCHAR(50) NOT NULL, -- 'cost', 'revenue', 'absorption'
  set_name VARCHAR(100) NOT NULL DEFAULT 'Custom 1',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, card_type, set_name)
);

-- Growth Rate Steps table - individual rate steps within each set
CREATE TABLE IF NOT EXISTS landscape.core_fin_growth_rate_steps (
  step_id SERIAL PRIMARY KEY,
  set_id INTEGER NOT NULL REFERENCES landscape.core_fin_growth_rate_sets(set_id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  from_period INTEGER NOT NULL,
  periods INTEGER, -- NULL means "E" (end of analysis)
  rate NUMERIC(5,2) NOT NULL, -- percentage rate like 2.75
  thru_period INTEGER, -- calculated field
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(set_id, step_number)
);

-- Add growth rate set reference to existing budget facts
ALTER TABLE landscape.core_fin_fact_budget
ADD COLUMN IF NOT EXISTS growth_rate_set_id INTEGER REFERENCES landscape.core_fin_growth_rate_sets(set_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_growth_rate_sets_project_card
ON landscape.core_fin_growth_rate_sets(project_id, card_type);

CREATE INDEX IF NOT EXISTS idx_growth_rate_steps_set
ON landscape.core_fin_growth_rate_steps(set_id, step_number);

-- Sample data for development (will be replaced with actual project data)
INSERT INTO landscape.core_fin_growth_rate_sets (project_id, card_type, set_name, is_default)
VALUES
  (1, 'cost', 'Development Costs', TRUE),
  (1, 'cost', 'Custom 1', FALSE),
  (1, 'cost', 'Custom 2', FALSE),
  (1, 'cost', 'Custom 3', FALSE),
  (1, 'revenue', 'Revenue Growth', TRUE),
  (1, 'revenue', 'Custom 1', FALSE),
  (1, 'revenue', 'Custom 2', FALSE),
  (1, 'revenue', 'Custom 3', FALSE),
  (1, 'absorption', 'Absorption Rates', TRUE),
  (1, 'absorption', 'Custom 1', FALSE),
  (1, 'absorption', 'Custom 2', FALSE),
  (1, 'absorption', 'Custom 3', FALSE)
ON CONFLICT (project_id, card_type, set_name) DO NOTHING;

COMMIT;