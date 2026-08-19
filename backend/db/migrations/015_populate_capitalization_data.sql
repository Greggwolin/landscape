-- ============================================================================
-- MIGRATION 015: Populate Capitalization Data for Project 11
-- ============================================================================
-- Date: 2025-10-23
-- Purpose: Populate the newly added fields with data
-- ============================================================================

-- Update project_id in waterfall tiers
UPDATE landscape.tbl_waterfall_tier wt
SET project_id = es.project_id
FROM landscape.tbl_equity_structure es
WHERE wt.equity_structure_id = es.equity_structure_id
  AND wt.project_id IS NULL;

-- Copy hurdle_rate to irr_threshold_pct
UPDATE landscape.tbl_waterfall_tier
SET irr_threshold_pct = hurdle_rate
WHERE irr_threshold_pct IS NULL AND hurdle_rate IS NOT NULL;

-- Copy tier_description to tier_name
UPDATE landscape.tbl_waterfall_tier
SET tier_name = tier_description
WHERE tier_name IS NULL;

-- Update project_id in draw schedule
UPDATE landscape.tbl_debt_draw_schedule dds
SET project_id = df.project_id
FROM landscape.tbl_debt_facility df
WHERE dds.facility_id = df.facility_id
  AND dds.project_id IS NULL;

-- Map existing draw schedule dates
UPDATE landscape.tbl_debt_draw_schedule
SET
  request_date = COALESCE(request_date, draw_request_date),
  funding_date = COALESCE(funding_date, draw_funded_date)
WHERE request_date IS NULL OR funding_date IS NULL;

-- Map interest fields
UPDATE landscape.tbl_debt_draw_schedule
SET interest_expense = COALESCE(interest_expense, interest_amount)
WHERE interest_expense IS NULL;

-- Map balance fields
UPDATE landscape.tbl_debt_draw_schedule
SET outstanding_balance = COALESCE(outstanding_balance, ending_balance)
WHERE outstanding_balance IS NULL;

-- Update Project 11 debt facility with full fields
UPDATE landscape.tbl_debt_facility
SET
  loan_amount = COALESCE(loan_amount, commitment_amount),
  interest_rate_pct = COALESCE(interest_rate_pct, interest_rate * 100),
  ltv_pct = COALESCE(ltv_pct, (covenants->>'ltv_pct')::numeric, 70),
  dscr = COALESCE(dscr, (covenants->>'dscr')::numeric, 1.25),
  amortization_years = COALESCE(amortization_years, 30),
  loan_term_years = COALESCE(loan_term_years, EXTRACT(YEAR FROM AGE(maturity_date, commitment_date))::integer),
  is_construction_loan = COALESCE(is_construction_loan, facility_type = 'CONSTRUCTION'),
  guarantee_type = COALESCE(guarantee_type, 'Recourse'),
  loan_covenant_dscr_min = COALESCE(loan_covenant_dscr_min, (covenants->>'loan_covenant_dscr_min')::numeric, 1.20),
  loan_covenant_ltv_max = COALESCE(loan_covenant_ltv_max, (covenants->>'loan_covenant_ltv_max')::numeric, 75),
  rate_type = COALESCE(rate_type, 'fixed')
WHERE project_id = 11;

-- Insert/Update equity partners for Project 11
INSERT INTO landscape.tbl_equity (
  project_id,
  equity_name,
  partner_type,
  partner_name,
  equity_class,
  ownership_pct,
  commitment_amount,
  capital_contributed,
  preferred_return_pct,
  promote_pct,
  catch_up_pct,
  irr_target_pct
) VALUES
  (11, 'LP - Institutional Investor', 'LP', 'Institutional Investor', 'Class A', 90, 4500000, 4500000, 8, 0, 0, 15),
  (11, 'GP - Sponsor', 'GP', 'Sponsor', 'Class B', 10, 0, 0, 8, 20, 50, NULL)
ON CONFLICT DO NOTHING;

-- Insert waterfall tiers for Project 11 if they don't exist
DO $$
DECLARE
  v_equity_structure_id BIGINT;
BEGIN
  -- Get or create equity structure
  SELECT equity_structure_id INTO v_equity_structure_id
  FROM landscape.tbl_equity_structure
  WHERE project_id = 11
  LIMIT 1;

  IF v_equity_structure_id IS NULL THEN
    INSERT INTO landscape.tbl_equity_structure (project_id, structure_name, structure_description)
    VALUES (11, 'Standard Waterfall', 'Standard LP/GP waterfall with preferred return and promote')
    RETURNING equity_structure_id INTO v_equity_structure_id;
  END IF;

  -- Insert tiers
  INSERT INTO landscape.tbl_waterfall_tier (
    equity_structure_id,
    project_id,
    tier_number,
    tier_name,
    tier_description,
    irr_threshold_pct,
    hurdle_rate,
    hurdle_type,
    lp_split_pct,
    gp_split_pct,
    is_active
  ) VALUES
    (v_equity_structure_id, 11, 1, 'Return of Capital', 'Return of invested capital', NULL, NULL, NULL, 90, 10, TRUE),
    (v_equity_structure_id, 11, 2, 'Preferred Return (8%)', '8% preferred return to LP', 8, 8, 'irr', 90, 10, TRUE),
    (v_equity_structure_id, 11, 3, 'GP Catch-Up', 'GP catches up to 50% of distributions', 10, 10, 'irr', 50, 50, FALSE),
    (v_equity_structure_id, 11, 4, 'Promote (80/20 Split)', 'Remaining distributions 80/20 LP/GP', 15, 15, 'irr', 80, 20, TRUE)
  ON CONFLICT DO NOTHING;
END $$;

-- Insert sample draw schedule items for Project 11
DO $$
DECLARE
  v_facility_id BIGINT;
  v_period_ids BIGINT[];
BEGIN
  -- Get facility
  SELECT facility_id INTO v_facility_id
  FROM landscape.tbl_debt_facility
  WHERE project_id = 11 AND is_construction_loan = TRUE
  LIMIT 1;

  IF v_facility_id IS NOT NULL THEN
    -- Get first 5 period IDs
    SELECT ARRAY_AGG(period_id ORDER BY period_sequence) INTO v_period_ids
    FROM (
      SELECT period_id, period_sequence
      FROM landscape.tbl_calculation_period
      WHERE project_id = 11
      ORDER BY period_sequence
      LIMIT 5
    ) sub;

    IF array_length(v_period_ids, 1) >= 1 THEN
      INSERT INTO landscape.tbl_debt_draw_schedule (
        facility_id, project_id, period_id, draw_number, draw_amount, draw_date, draw_purpose, draw_status, cumulative_drawn
      ) VALUES
        (v_facility_id, 11, v_period_ids[1], 1, 2000000, '2025-01-15', 'Acquisition', 'FUNDED', 2000000)
      ON CONFLICT (facility_id, period_id) DO UPDATE
      SET draw_purpose = 'Acquisition', draw_date = '2025-01-15', draw_number = 1;
    END IF;

    IF array_length(v_period_ids, 1) >= 2 THEN
      INSERT INTO landscape.tbl_debt_draw_schedule (
        facility_id, project_id, period_id, draw_number, draw_amount, draw_date, draw_purpose, draw_status, cumulative_drawn
      ) VALUES
        (v_facility_id, 11, v_period_ids[2], 2, 1500000, '2025-03-15', 'Renovations - Phase 1', 'PROJECTED', 3500000)
      ON CONFLICT (facility_id, period_id) DO UPDATE
      SET draw_purpose = 'Renovations - Phase 1', draw_date = '2025-03-15', draw_number = 2;
    END IF;

    IF array_length(v_period_ids, 1) >= 3 THEN
      INSERT INTO landscape.tbl_debt_draw_schedule (
        facility_id, project_id, period_id, draw_number, draw_amount, draw_date, draw_purpose, draw_status, cumulative_drawn
      ) VALUES
        (v_facility_id, 11, v_period_ids[3], 3, 2000000, '2025-05-15', 'Renovations - Phase 2', 'PROJECTED', 5500000)
      ON CONFLICT (facility_id, period_id) DO UPDATE
      SET draw_purpose = 'Renovations - Phase 2', draw_date = '2025-05-15', draw_number = 3;
    END IF;

    IF array_length(v_period_ids, 1) >= 4 THEN
      INSERT INTO landscape.tbl_debt_draw_schedule (
        facility_id, project_id, period_id, draw_number, draw_amount, draw_date, draw_purpose, draw_status, cumulative_drawn
      ) VALUES
        (v_facility_id, 11, v_period_ids[4], 4, 1500000, '2025-07-15', 'Common Area Improvements', 'PROJECTED', 7000000)
      ON CONFLICT (facility_id, period_id) DO UPDATE
      SET draw_purpose = 'Common Area Improvements', draw_date = '2025-07-15', draw_number = 4;
    END IF;

    IF array_length(v_period_ids, 1) >= 5 THEN
      INSERT INTO landscape.tbl_debt_draw_schedule (
        facility_id, project_id, period_id, draw_number, draw_amount, draw_date, draw_purpose, draw_status, cumulative_drawn
      ) VALUES
        (v_facility_id, 11, v_period_ids[5], 5, 1000000, '2025-09-15', 'Contingency Reserve', 'PROJECTED', 8000000)
      ON CONFLICT (facility_id, period_id) DO UPDATE
      SET draw_purpose = 'Contingency Reserve', draw_date = '2025-09-15', draw_number = 5;
    END IF;
  END IF;
END $$;
