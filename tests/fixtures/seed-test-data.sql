-- Test Data Fixtures: Peoria Lakes + Carney Power Center
-- Version: v1.1 (2025-10-13)
--
-- Creates two test projects with complete financial data:
-- 1. Peoria Lakes (project_id=7) - Master Planned Community
-- 2. Carney Power Center (project_id=8) - Retail Power Center

BEGIN;

-- ============================================================================
-- CLEANUP (for idempotent loading)
-- ============================================================================

DELETE FROM landscape.tbl_lease_revenue_timing WHERE project_id IN (7, 8);
DELETE FROM landscape.tbl_revenue_timing WHERE project_id IN (7, 8);
DELETE FROM landscape.tbl_absorption_schedule WHERE project_id IN (7, 8);
DELETE FROM landscape.tbl_item_dependency WHERE dependent_item_id IN (
  SELECT budget_item_id FROM landscape.tbl_budget_items WHERE project_id IN (7, 8)
);
DELETE FROM landscape.tbl_budget_items WHERE project_id IN (7, 8);
DELETE FROM landscape.tbl_rent_roll WHERE project_id IN (7, 8);
DELETE FROM landscape.tbl_lease_assumptions WHERE project_id IN (7, 8);
DELETE FROM landscape.tbl_debt_facility WHERE project_id IN (7, 8);
DELETE FROM landscape.tbl_equity_partner WHERE project_id IN (7, 8);
DELETE FROM landscape.tbl_project WHERE project_id IN (7, 8);

-- ============================================================================
-- PROJECT 1: PEORIA LAKES (ID=7) - MASTER PLANNED COMMUNITY
-- ============================================================================

INSERT INTO landscape.tbl_project (
  project_id,
  project_name,
  project_type,
  project_address,
  city,
  state,
  zip,
  analysis_start_date,
  period_type,
  number_of_periods,
  discount_rate,
  created_at
) VALUES (
  7,
  'Peoria Lakes Phase 1',
  'Master Planned Community',
  '15000 N Lake Pleasant Parkway',
  'Peoria',
  'AZ',
  '85382',
  '2025-01-01',
  'MONTHLY',
  24,
  0.12,
  NOW()
);

-- Budget Items (Peoria Lakes)
INSERT INTO landscape.tbl_budget_items (
  project_id,
  category,
  description,
  amount,
  timing_method,
  start_period,
  periods_to_complete,
  s_curve_profile,
  notes
) VALUES
  -- 100: Mass Grading
  (7, 'SITE_WORK', '100 - Mass Grading', 1200000, 'ABSOLUTE', 0, 4, 'LINEAR', 'Initial site grading'),
  -- 101: Utilities (depends on 100 COMPLETE +1p)
  (7, 'INFRASTRUCTURE', '101 - Utilities', 800000, 'DEPENDENT', NULL, 3, 'LINEAR', 'Water, sewer, power'),
  -- 102: Roads (depends on 100 COMPLETE +0p)
  (7, 'INFRASTRUCTURE', '102 - Roads', 1500000, 'DEPENDENT', NULL, 4, 'LINEAR', 'Main roads and streets'),
  -- 103: Landscaping (depends on 102 COMPLETE +1p)
  (7, 'AMENITIES', '103 - Landscaping', 300000, 'DEPENDENT', NULL, 2, 'LINEAR', 'Common area landscaping');

-- Get budget item IDs for dependencies
DO $$
DECLARE
  item_100_id INTEGER;
  item_101_id INTEGER;
  item_102_id INTEGER;
  item_103_id INTEGER;
BEGIN
  SELECT budget_item_id INTO item_100_id FROM landscape.tbl_budget_items WHERE project_id=7 AND description='100 - Mass Grading';
  SELECT budget_item_id INTO item_101_id FROM landscape.tbl_budget_items WHERE project_id=7 AND description='101 - Utilities';
  SELECT budget_item_id INTO item_102_id FROM landscape.tbl_budget_items WHERE project_id=7 AND description='102 - Roads';
  SELECT budget_item_id INTO item_103_id FROM landscape.tbl_budget_items WHERE project_id=7 AND description='103 - Landscaping';

  -- Dependencies (Peoria Lakes)
  -- 101 depends on 100 COMPLETE +1p
  INSERT INTO landscape.tbl_item_dependency (
    dependent_item_type, dependent_item_table, dependent_item_id,
    trigger_item_type, trigger_item_table, trigger_item_id,
    trigger_event, offset_periods, is_hard_dependency
  ) VALUES (
    'COST', 'tbl_budget_items', item_101_id,
    'COST', 'tbl_budget_items', item_100_id,
    'COMPLETE', 1, TRUE
  );

  -- 102 depends on 100 COMPLETE +0p
  INSERT INTO landscape.tbl_item_dependency (
    dependent_item_type, dependent_item_table, dependent_item_id,
    trigger_item_type, trigger_item_table, trigger_item_id,
    trigger_event, offset_periods, is_hard_dependency
  ) VALUES (
    'COST', 'tbl_budget_items', item_102_id,
    'COST', 'tbl_budget_items', item_100_id,
    'COMPLETE', 0, TRUE
  );

  -- 103 depends on 102 COMPLETE +1p
  INSERT INTO landscape.tbl_item_dependency (
    dependent_item_type, dependent_item_table, dependent_item_id,
    trigger_item_type, trigger_item_table, trigger_item_id,
    trigger_event, offset_periods, is_hard_dependency
  ) VALUES (
    'COST', 'tbl_budget_items', item_103_id,
    'COST', 'tbl_budget_items', item_102_id,
    'COMPLETE', 1, TRUE
  );
END $$;

-- Absorption Schedule (Peoria Lakes)
INSERT INTO landscape.tbl_absorption_schedule (
  project_id,
  revenue_stream_name,
  start_period,
  periods_to_complete,
  timing_method,
  units_per_period,
  total_units,
  base_price_per_unit,
  price_escalation_pct,
  notes
) VALUES (
  7,
  'A1 - For-sale Lots',
  6,                    -- Start P6
  10,                   -- Duration 10 periods
  'ABSOLUTE',
  8,                    -- 8 units per period
  80,                   -- Total 80 units
  85000,                -- $85K base price
  0.005,                -- 0.5% per period escalation
  'Single-family residential lots'
);

-- Leases (Peoria Lakes)
-- L1: Office Lease
INSERT INTO landscape.tbl_rent_roll (
  project_id,
  tenant_name,
  space_type,
  lease_start_date,
  lease_end_date,
  lease_term_months,
  leased_sf,
  base_rent_psf_annual,
  escalation_type,
  escalation_value,
  escalation_frequency_months,
  recovery_structure,
  cam_recovery_rate,
  tax_recovery_rate,
  insurance_recovery_rate,
  free_rent_months,
  free_rent_start_month,
  has_percentage_rent,
  lease_status
) VALUES (
  7,
  'L1 - Office Tenant',
  'OFFICE',
  '2025-01-01',
  '2026-07-01',         -- Ends P18
  18,
  10000,
  28.00,
  'FIXED_PERCENT',
  0.03,                 -- 3% annual
  12,
  'MODIFIED_GROSS',
  0.90,                 -- 90% CAM recovery
  0.00,
  0.00,
  2,                    -- 2 months free
  1,                    -- Start month 1
  FALSE,
  'ACTIVE'
);

-- L2: Retail Lease
INSERT INTO landscape.tbl_rent_roll (
  project_id,
  tenant_name,
  space_type,
  lease_start_date,
  lease_end_date,
  lease_term_months,
  leased_sf,
  base_rent_psf_annual,
  escalation_type,
  escalation_value,
  escalation_frequency_months,
  recovery_structure,
  cam_recovery_rate,
  tax_recovery_rate,
  insurance_recovery_rate,
  free_rent_months,
  has_percentage_rent,
  percentage_rent_rate,
  percentage_rent_breakpoint,
  lease_status
) VALUES (
  7,
  'L2 - Retail Tenant',
  'RETAIL',
  '2025-01-01',
  '2027-01-01',         -- Ends P24
  24,
  5000,
  32.00,
  'NONE',
  NULL,
  12,
  'GROSS',
  1.00,
  1.00,
  1.00,
  0,                    -- No free rent
  TRUE,
  0.08,                 -- 8% overage
  3000000,              -- $3M annual breakpoint
  'ACTIVE'
);

-- Debt Facility (Peoria Lakes)
INSERT INTO landscape.tbl_debt_facility (
  project_id,
  facility_type,
  commitment_amount,
  interest_rate,
  draw_trigger_type,
  notes
) VALUES (
  7,
  'CONSTRUCTION',
  5000000,              -- $5M facility
  0.09,                 -- 9% interest
  'COST_INCURRED',
  'C1 - Construction Loan'
);

-- Equity Partners (Peoria Lakes)
INSERT INTO landscape.tbl_equity_partner (
  project_id,
  partner_name,
  partner_type,
  ownership_percentage,
  preferred_return,
  promote_percentage,
  promote_hurdle,
  notes
) VALUES
  (7, 'General Partner', 'GP', 0.10, NULL, 0.20, 0.14, 'GP 10%, Promote 20% over 14% IRR'),
  (7, 'Limited Partner', 'LP', 0.90, 0.08, NULL, NULL, 'LP 90%, Pref 8%');

-- ============================================================================
-- PROJECT 2: CARNEY POWER CENTER (ID=8) - RETAIL POWER CENTER
-- ============================================================================

INSERT INTO landscape.tbl_project (
  project_id,
  project_name,
  project_type,
  project_address,
  city,
  state,
  zip,
  analysis_start_date,
  period_type,
  number_of_periods,
  discount_rate,
  total_land_acres,
  created_at
) VALUES (
  8,
  'Carney Power Center',
  'Retail Power Center',
  '4500 W Camelback Road',
  'Phoenix',
  'AZ',
  '85031',
  '2025-01-01',
  'MONTHLY',
  24,
  0.10,
  200.0,                -- 200 acres
  NOW()
);

-- Leases (Carney Power Center - 5 Tenants)
-- All tenants use same baseline terms per spec
INSERT INTO landscape.tbl_rent_roll (
  project_id,
  tenant_name,
  space_type,
  lease_start_date,
  lease_end_date,
  lease_term_months,
  leased_sf,
  base_rent_psf_annual,
  escalation_type,
  escalation_value,
  escalation_frequency_months,
  recovery_structure,
  cam_recovery_rate,
  tax_recovery_rate,
  insurance_recovery_rate,
  free_rent_months,
  has_percentage_rent,
  percentage_rent_rate,
  percentage_rent_breakpoint,
  lease_status
) VALUES
  -- C-T1
  (8, 'C-T1 - Retail Tenant', 'RETAIL', '2025-02-01', '2027-02-01', 24, 5000, 32.00,
   'NONE', NULL, 12, 'GROSS', 1.00, 1.00, 1.00, 0, TRUE, 0.08, 3000000, 'ACTIVE'),

  -- C-T2
  (8, 'C-T2 - Retail Tenant', 'RETAIL', '2025-02-01', '2027-02-01', 24, 5000, 32.00,
   'NONE', NULL, 12, 'GROSS', 1.00, 1.00, 1.00, 0, TRUE, 0.08, 3000000, 'ACTIVE'),

  -- C-T3
  (8, 'C-T3 - Retail Tenant', 'RETAIL', '2025-02-01', '2027-02-01', 24, 5000, 32.00,
   'NONE', NULL, 12, 'GROSS', 1.00, 1.00, 1.00, 0, TRUE, 0.08, 3000000, 'ACTIVE'),

  -- C-T4
  (8, 'C-T4 - Retail Tenant', 'RETAIL', '2025-02-01', '2027-02-01', 24, 5000, 32.00,
   'NONE', NULL, 12, 'GROSS', 1.00, 1.00, 1.00, 0, TRUE, 0.08, 3000000, 'ACTIVE'),

  -- C-T5
  (8, 'C-T5 - Retail Tenant', 'RETAIL', '2025-02-01', '2027-02-01', 24, 5000, 32.00,
   'NONE', NULL, 12, 'GROSS', 1.00, 1.00, 1.00, 0, TRUE, 0.08, 3000000, 'ACTIVE');

-- Lease Assumptions (for rollover analysis)
INSERT INTO landscape.tbl_lease_assumptions (
  project_id,
  space_type,
  market_rent_psf_annual,
  market_rent_growth_rate,
  renewal_probability,
  downtime_months,
  ti_psf_renewal,
  ti_psf_new_tenant,
  lc_psf_renewal,
  lc_psf_new_tenant,
  free_rent_months_renewal,
  free_rent_months_new_tenant,
  effective_date
) VALUES
  (7, 'OFFICE', 30.00, 0.03, 0.70, 6, 5.00, 20.00, 2.00, 10.00, 1, 3, '2025-01-01'),
  (7, 'RETAIL', 35.00, 0.025, 0.75, 4, 3.00, 15.00, 1.50, 8.00, 0, 2, '2025-01-01'),
  (8, 'RETAIL', 34.00, 0.025, 0.75, 4, 3.00, 15.00, 1.50, 8.00, 0, 2, '2025-01-01');

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
DECLARE
  peoria_budget_count INTEGER;
  peoria_dep_count INTEGER;
  peoria_absorption_count INTEGER;
  peoria_lease_count INTEGER;
  carney_lease_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO peoria_budget_count FROM landscape.tbl_budget_items WHERE project_id=7;
  SELECT COUNT(*) INTO peoria_dep_count FROM landscape.tbl_item_dependency WHERE dependent_item_id IN (
    SELECT budget_item_id FROM landscape.tbl_budget_items WHERE project_id=7
  );
  SELECT COUNT(*) INTO peoria_absorption_count FROM landscape.tbl_absorption_schedule WHERE project_id=7;
  SELECT COUNT(*) INTO peoria_lease_count FROM landscape.tbl_rent_roll WHERE project_id=7;
  SELECT COUNT(*) INTO carney_lease_count FROM landscape.tbl_rent_roll WHERE project_id=8;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Test Data Fixtures Loaded Successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 PEORIA LAKES (Project ID: 7)';
  RAISE NOTICE '   Type: Master Planned Community';
  RAISE NOTICE '   Budget Items: % (100-103)', peoria_budget_count;
  RAISE NOTICE '   Dependencies: % (101→100, 102→100, 103→102)', peoria_dep_count;
  RAISE NOTICE '   Absorption Schedules: % (A1 - For-sale Lots)', peoria_absorption_count;
  RAISE NOTICE '   Leases: % (L1-Office, L2-Retail)', peoria_lease_count;
  RAISE NOTICE '   Periods: P0-P23 (24 months)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 CARNEY POWER CENTER (Project ID: 8)';
  RAISE NOTICE '   Type: Retail Power Center (200 acres)';
  RAISE NOTICE '   Leases: % (C-T1 through C-T5)', carney_lease_count;
  RAISE NOTICE '   Periods: P0-P23 (24 months)';
  RAISE NOTICE '   Location: Phoenix, AZ';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Expected Timeline (Peoria Lakes):';
  RAISE NOTICE '   100: P0-P3 (Mass Grading)';
  RAISE NOTICE '   102: P4-P7 (Roads, after 100 COMPLETE +0p)';
  RAISE NOTICE '   101: P5-P7 (Utilities, after 100 COMPLETE +1p)';
  RAISE NOTICE '   103: P9-P10 (Landscaping, after 102 COMPLETE +1p)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Expected Absorption (Peoria Lakes):';
  RAISE NOTICE '   A1: P6-P15 (10 periods × 8 units = 80 lots)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Expected Lease Revenue (Both Projects):';
  RAISE NOTICE '   Peoria: 2 leases × ~20 periods = ~40 timing rows';
  RAISE NOTICE '   Carney: 5 leases × 24 periods = 120 timing rows';
  RAISE NOTICE '';
END $$;

COMMIT;

-- Verify data
SELECT
  project_id,
  project_name,
  project_type,
  city,
  number_of_periods,
  (SELECT COUNT(*) FROM landscape.tbl_budget_items WHERE project_id=p.project_id) AS budget_items,
  (SELECT COUNT(*) FROM landscape.tbl_rent_roll WHERE project_id=p.project_id) AS leases,
  (SELECT COUNT(*) FROM landscape.tbl_absorption_schedule WHERE project_id=p.project_id) AS absorption_schedules
FROM landscape.tbl_project p
WHERE project_id IN (7, 8)
ORDER BY project_id;
