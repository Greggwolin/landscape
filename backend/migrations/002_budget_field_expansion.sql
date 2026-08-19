-- =============================================================================
-- Budget Field Expansion Migration (QW82 Phase 1)
-- Adds all 49 fields to core_fin_fact_budget for ARGUS Developer parity
-- Session: QW82 | Date: 2025-01-16
-- =============================================================================

BEGIN;

-- STANDARD MODE: Timing & Escalation (missing fields)
ALTER TABLE landscape.core_fin_fact_budget
  ADD COLUMN IF NOT EXISTS escalation_method VARCHAR(20) CHECK (escalation_method IN ('to_start', 'through_duration')),
  ADD COLUMN IF NOT EXISTS curve_profile VARCHAR(20) CHECK (curve_profile IN ('standard', 'front_loaded', 'back_loaded')),
  ADD COLUMN IF NOT EXISTS curve_steepness DECIMAL(5,2) CHECK (curve_steepness >= 0 AND curve_steepness <= 100),
  ADD COLUMN IF NOT EXISTS curve_id BIGINT REFERENCES landscape.core_fin_curve(curve_id);

-- STANDARD MODE: Classification (missing fields)
ALTER TABLE landscape.core_fin_fact_budget
  ADD COLUMN IF NOT EXISTS scope_override VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cost_type VARCHAR(20) CHECK (cost_type IN ('direct', 'indirect', 'soft', 'financing')),
  ADD COLUMN IF NOT EXISTS tax_treatment VARCHAR(20) CHECK (tax_treatment IN ('capitalizable', 'deductible', 'non_deductible')),
  ADD COLUMN IF NOT EXISTS internal_memo TEXT,
  ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(200);

-- STANDARD MODE: Rename 'periods' to 'periods_to_complete' for clarity
ALTER TABLE landscape.core_fin_fact_budget
  RENAME COLUMN periods TO periods_to_complete;

-- DETAIL MODE: Advanced Timing / CPM (11 fields)
ALTER TABLE landscape.core_fin_fact_budget
  ADD COLUMN IF NOT EXISTS baseline_start_date DATE,
  ADD COLUMN IF NOT EXISTS baseline_end_date DATE,
  ADD COLUMN IF NOT EXISTS actual_start_date DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date DATE,
  ADD COLUMN IF NOT EXISTS percent_complete DECIMAL(5,2) CHECK (percent_complete >= 0 AND percent_complete <= 100),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS float_days INTEGER,
  ADD COLUMN IF NOT EXISTS early_start_date DATE,
  ADD COLUMN IF NOT EXISTS late_finish_date DATE,
  ADD COLUMN IF NOT EXISTS milestone_id BIGINT;

-- DETAIL MODE: Financial Controls (10 fields)
ALTER TABLE landscape.core_fin_fact_budget
  ADD COLUMN IF NOT EXISTS budget_version VARCHAR(20) CHECK (budget_version IN ('original', 'revised', 'forecast')),
  ADD COLUMN IF NOT EXISTS version_as_of_date DATE,
  ADD COLUMN IF NOT EXISTS funding_id BIGINT REFERENCES landscape.core_fin_funding_source(funding_source_id),
  ADD COLUMN IF NOT EXISTS funding_draw_pct DECIMAL(5,2) CHECK (funding_draw_pct >= 0 AND funding_draw_pct <= 100),
  ADD COLUMN IF NOT EXISTS draw_schedule VARCHAR(20) CHECK (draw_schedule IN ('as_incurred', 'monthly', 'milestone')),
  ADD COLUMN IF NOT EXISTS retention_pct DECIMAL(5,2) CHECK (retention_pct >= 0 AND retention_pct <= 100),
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50),
  ADD COLUMN IF NOT EXISTS invoice_frequency VARCHAR(20) CHECK (invoice_frequency IN ('monthly', 'milestone', 'completion')),
  ADD COLUMN IF NOT EXISTS cost_allocation VARCHAR(20) CHECK (cost_allocation IN ('direct', 'shared', 'pro_rata')),
  ADD COLUMN IF NOT EXISTS is_reimbursable BOOLEAN DEFAULT FALSE;

-- DETAIL MODE: Period Allocation (6 fields - period_allocations is separate table)
ALTER TABLE landscape.core_fin_fact_budget
  ADD COLUMN IF NOT EXISTS allocation_method VARCHAR(20) CHECK (allocation_method IN ('even', 'curve', 'custom')),
  ADD COLUMN IF NOT EXISTS cf_start_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cf_distribution VARCHAR(100),
  ADD COLUMN IF NOT EXISTS allocated_total DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS allocation_variance DECIMAL(18,2);

-- DETAIL MODE: Documentation & Audit (10 fields)
ALTER TABLE landscape.core_fin_fact_budget
  ADD COLUMN IF NOT EXISTS bid_date DATE,
  ADD COLUMN IF NOT EXISTS bid_amount DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS bid_variance DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS change_order_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS change_order_total DECIMAL(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by BIGINT,
  ADD COLUMN IF NOT EXISTS approval_date DATE,
  ADD COLUMN IF NOT EXISTS document_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_modified_by BIGINT,
  ADD COLUMN IF NOT EXISTS last_modified_date TIMESTAMP;

-- Add column comments for documentation
COMMENT ON COLUMN landscape.core_fin_fact_budget.escalation_method IS 'How escalation compounds: to_start or through_duration';
COMMENT ON COLUMN landscape.core_fin_fact_budget.curve_profile IS 'S-curve shape: standard, front_loaded, or back_loaded';
COMMENT ON COLUMN landscape.core_fin_fact_budget.curve_steepness IS 'Curve steepness 0-100 (only when timing_method=curve)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.periods_to_complete IS 'Duration in number of periods (renamed from periods)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.scope_override IS 'Force budget item into different scope/container';
COMMENT ON COLUMN landscape.core_fin_fact_budget.cost_type IS 'Classification: direct, indirect, soft, or financing';
COMMENT ON COLUMN landscape.core_fin_fact_budget.tax_treatment IS 'Tax accounting: capitalizable, deductible, or non_deductible';
COMMENT ON COLUMN landscape.core_fin_fact_budget.internal_memo IS 'Internal notes not included in exports';
COMMENT ON COLUMN landscape.core_fin_fact_budget.percent_complete IS 'Progress tracking 0-100%';
COMMENT ON COLUMN landscape.core_fin_fact_budget.status IS 'Work status: not_started, in_progress, completed, or cancelled';
COMMENT ON COLUMN landscape.core_fin_fact_budget.is_critical IS 'True if on critical path (CPM computed)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.float_days IS 'Schedule slack in days (CPM computed)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.budget_version IS 'Version type: original, revised, or forecast';
COMMENT ON COLUMN landscape.core_fin_fact_budget.funding_draw_pct IS 'Percentage drawn from this funding source (0-100)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.retention_pct IS 'Holdback percentage (0-100)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.allocation_method IS 'How costs allocate across periods: even, curve, or custom';
COMMENT ON COLUMN landscape.core_fin_fact_budget.cf_start_flag IS 'Marks cash flow beginning';
COMMENT ON COLUMN landscape.core_fin_fact_budget.allocated_total IS 'Sum of all period allocations';
COMMENT ON COLUMN landscape.core_fin_fact_budget.allocation_variance IS 'allocated_total - amount (should be 0)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.bid_variance IS 'amount - bid_amount';
COMMENT ON COLUMN landscape.core_fin_fact_budget.approval_status IS 'Approval workflow: pending, approved, or rejected';

-- Create index on commonly filtered fields
CREATE INDEX IF NOT EXISTS idx_budget_status ON landscape.core_fin_fact_budget(status);
CREATE INDEX IF NOT EXISTS idx_budget_approval_status ON landscape.core_fin_fact_budget(approval_status);
CREATE INDEX IF NOT EXISTS idx_budget_is_critical ON landscape.core_fin_fact_budget(is_critical) WHERE is_critical = TRUE;
CREATE INDEX IF NOT EXISTS idx_budget_funding_id ON landscape.core_fin_fact_budget(funding_id);
CREATE INDEX IF NOT EXISTS idx_budget_milestone_id ON landscape.core_fin_fact_budget(milestone_id);

COMMIT;

-- =============================================================================
-- VERIFICATION QUERY
-- Run this after migration to confirm all fields exist:
-- =============================================================================
-- SELECT column_name, data_type, character_maximum_length, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'landscape'
--   AND table_name = 'core_fin_fact_budget'
-- ORDER BY ordinal_position;
