-- ============================================================================
-- ADD SCOTTSDALE PROMENADE DATA TO EXISTING PROJECT
-- ============================================================================

DO $$
DECLARE
    v_project_id INTEGER := 14; -- Existing project
    v_property_id INTEGER;
    v_space_id INTEGER;
    v_tenant_id INTEGER;
    v_lease_id INTEGER;
BEGIN

-- ============================================================================
-- STEP 1: CREATE PROPERTY
-- ============================================================================

INSERT INTO landscape.tbl_cre_property (
  project_id, property_name, property_type, property_subtype,
  total_building_sf, rentable_sf, common_area_sf, load_factor,
  year_built, year_renovated, number_of_units, parking_spaces, parking_ratio,
  property_status, stabilization_date, stabilized_occupancy_pct,
  acquisition_date, acquisition_price, current_assessed_value
) VALUES (
  v_project_id, 'Scottsdale Promenade', 'Retail', 'Community Shopping Center',
  528452, 528452, 5000, 1.0095,
  2008, 2019, 41, 1500, 2.8,
  'Stabilized', '2010-06-01', 97.6,
  '2025-01-15', 42500000, 45000000
) RETURNING cre_property_id INTO v_property_id;

RAISE NOTICE 'Created property ID: %', v_property_id;

-- ============================================================================
-- STEP 2: CREATE SPACES (41 total)
-- ============================================================================

INSERT INTO landscape.tbl_cre_space (cre_property_id, space_number, usable_sf, rentable_sf, space_type, space_status) VALUES
  -- Major Anchors
  (v_property_id, 'PAD2', 133120, 133120, 'Power Center Anchor', 'Leased'),
  (v_property_id, 'MAJ7', 34565, 34565, 'Major Anchor', 'Leased'),
  (v_property_id, 'MAJ1', 25200, 25200, 'Major Anchor', 'Leased'),
  -- Large Inline
  (v_property_id, '12', 10000, 10000, 'Grocery - Specialty', 'Leased'),
  (v_property_id, '7', 12500, 12500, 'Restaurant - Full Service', 'Leased'),
  -- Medium Inline
  (v_property_id, '14', 8650, 8650, 'Restaurant - Full Service', 'Leased'),
  (v_property_id, 'PAD8', 7350, 7350, 'Pad Site - Restaurant', 'Leased'),
  -- Standard Inline
  (v_property_id, '5B2', 5000, 5000, 'In-Line Retail', 'Available'),
  (v_property_id, 'F107', 4784, 4784, 'In-Line Retail', 'Available'),
  (v_property_id, 'A8', 3000, 3000, 'In-Line Retail', 'Available');

-- ============================================================================
-- STEP 3: CREATE TENANTS
-- ============================================================================

INSERT INTO landscape.tbl_cre_tenant (tenant_name, tenant_legal_name, industry, business_type, credit_rating, creditworthiness, annual_revenue, years_in_business) VALUES
  ('Living Spaces', 'Living Spaces Inc.', 'Furniture', 'Retail', 'BB', 'Good', 500000000, 20),
  ('Nordstrom Rack', 'Nordstrom Inc.', 'Department Store', 'Retail', 'BBB', 'Excellent', 15500000000, 122),
  ('Saks Off 5th', 'Saks Fifth Avenue', 'Luxury Retail', 'Retail', 'BB+', 'Good', 3000000000, 98),
  ('Trader Joe''s', 'Trader Joe''s Company', 'Grocery - Specialty', 'Retail', 'A-', 'Excellent', 16500000000, 56),
  ('Cooper''s Hawk Winery', 'Winery Restaurant', 'Full Service Restaurant', 'BB+', 'Good', 400000000, 23),
  ('The Capital Grille', 'Steakhouse', 'Full Service Restaurant', 'BBB-', 'Excellent', 600000000, 29),
  ('Buffalo Wild Wings', 'Sports Bar', 'Casual Dining', 'BB+', 'Good', 2000000000, 42);

-- ============================================================================
-- STEP 4: CREATE LEASES
-- ============================================================================

-- LEASE 1: Living Spaces (133,120 SF - largest tenant)
SELECT space_id INTO v_space_id FROM landscape.tbl_cre_space WHERE cre_property_id = v_property_id AND space_number = 'PAD2';
SELECT tenant_id INTO v_tenant_id FROM landscape.tbl_cre_tenant WHERE tenant_name = 'Living Spaces' ORDER BY tenant_id DESC LIMIT 1;

INSERT INTO landscape.tbl_cre_lease (
  cre_property_id, space_id, tenant_id, lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf, number_of_options, option_term_months,
  security_deposit_amount, exclusive_use_clause
) VALUES (
  v_property_id, v_space_id, v_tenant_id, 'LVSP-2020-001', 'NNN', 'Active',
  '2020-08-15', '2021-01-01', '2036-12-31', 192, 133120, 2, 60, 250000,
  'Exclusive furniture retail rights'
) RETURNING lease_id INTO v_lease_id;

INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual) VALUES
  (v_lease_id, '2021-01-01', '2025-12-31', 1331200, 10.00),
  (v_lease_id, '2026-01-01', '2030-12-31', 1464320, 11.00),
  (v_lease_id, '2031-01-01', '2036-12-31', 1597440, 12.00);

INSERT INTO landscape.tbl_cre_rent_escalation (lease_id, escalation_type, escalation_pct, escalation_frequency) VALUES
  (v_lease_id, 'Fixed Percentage', 2.00, 'Every 5 Years');

INSERT INTO landscape.tbl_cre_expense_recovery (lease_id, recovery_structure, property_tax_recovery_pct, insurance_recovery_pct, cam_recovery_pct) VALUES
  (v_lease_id, 'Triple Net (NNN)', 100.0, 100.0, 100.0);

-- LEASE 2: Trader Joe's (10,000 SF - high rent specialty grocery)
SELECT space_id INTO v_space_id FROM landscape.tbl_cre_space WHERE cre_property_id = v_property_id AND space_number = '12';
SELECT tenant_id INTO v_tenant_id FROM landscape.tbl_cre_tenant WHERE tenant_name = 'Trader Joe''s' ORDER BY tenant_id DESC LIMIT 1;

INSERT INTO landscape.tbl_cre_lease (
  cre_property_id, space_id, tenant_id, lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf, number_of_options
) VALUES (
  v_property_id, v_space_id, v_tenant_id, 'TJS-2023-002', 'NNN', 'Active',
  '2023-01-15', '2023-04-01', '2038-03-31', 180, 10000, 2
) RETURNING lease_id INTO v_lease_id;

INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual) VALUES
  (v_lease_id, '2023-04-01', '2028-03-31', 350000, 35.00),
  (v_lease_id, '2028-04-01', '2033-03-31', 380000, 38.00),
  (v_lease_id, '2033-04-01', '2038-03-31', 410000, 41.00);

INSERT INTO landscape.tbl_cre_rent_escalation (lease_id, escalation_type, escalation_pct, escalation_frequency) VALUES
  (v_lease_id, 'Fixed Percentage', 2.00, 'Every 5 Years');

INSERT INTO landscape.tbl_cre_expense_recovery (lease_id, recovery_structure, property_tax_recovery_pct, insurance_recovery_pct, cam_recovery_pct) VALUES
  (v_lease_id, 'Triple Net (NNN)', 100.0, 100.0, 100.0);

-- LEASE 3: Cooper's Hawk (12,500 SF - restaurant with percentage rent)
SELECT space_id INTO v_space_id FROM landscape.tbl_cre_space WHERE cre_property_id = v_property_id AND space_number = '7';
SELECT tenant_id INTO v_tenant_id FROM landscape.tbl_cre_tenant WHERE tenant_name = 'Cooper''s Hawk Winery' ORDER BY tenant_id DESC LIMIT 1;

INSERT INTO landscape.tbl_cre_lease (
  cre_property_id, space_id, tenant_id, lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf, number_of_options
) VALUES (
  v_property_id, v_space_id, v_tenant_id, 'COOP-2021-003', 'NNN', 'Active',
  '2021-07-01', '2021-10-01', '2031-09-30', 120, 12500, 2
) RETURNING lease_id INTO v_lease_id;

INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual) VALUES
  (v_lease_id, '2021-10-01', '2026-09-30', 500000, 40.00),
  (v_lease_id, '2026-10-01', '2031-09-30', 550000, 44.00);

INSERT INTO landscape.tbl_cre_percentage_rent (lease_id, breakpoint_amount, percentage_rate, reporting_frequency, prior_year_sales) VALUES
  (v_lease_id, 8000000, 5.000, 'Annual', 12500000);

INSERT INTO landscape.tbl_cre_rent_escalation (lease_id, escalation_type, escalation_frequency, cpi_index, cpi_floor_pct, cpi_cap_pct) VALUES
  (v_lease_id, 'CPI', 'Annual', 'CPI-U', 2.50, 4.50);

INSERT INTO landscape.tbl_cre_expense_recovery (lease_id, recovery_structure, property_tax_recovery_pct, insurance_recovery_pct, cam_recovery_pct) VALUES
  (v_lease_id, 'Triple Net (NNN)', 100.0, 100.0, 100.0);

-- ============================================================================
-- STEP 5: OPERATING EXPENSES
-- ============================================================================

-- Need to get period_id first
DECLARE v_period_id INTEGER;
BEGIN
  SELECT period_id INTO v_period_id FROM landscape.tbl_calculation_period LIMIT 1;

  INSERT INTO landscape.tbl_cre_operating_expense (
    cre_property_id, period_id, expense_category, expense_type,
    budgeted_amount, actual_amount, amount_psf, recoverable
  ) VALUES
    (v_property_id, v_period_id, 'Property Taxes', 'Fixed', 520000, 520000, 0.98, true),
    (v_property_id, v_period_id, 'Property Insurance', 'Fixed', 95000, 95000, 0.18, true),
    (v_property_id, v_period_id, 'Landscaping', 'Variable', 48000, 48000, 0.09, true),
    (v_property_id, v_period_id, 'Parking Lot Maintenance', 'Variable', 62000, 62000, 0.12, true),
    (v_property_id, v_period_id, 'Security', 'Fixed', 78000, 78000, 0.15, true),
    (v_property_id, v_period_id, 'HVAC Maintenance', 'Variable', 45000, 45000, 0.09, true);
END;

-- ============================================================================
-- STEP 6: CAPITAL RESERVES
-- ============================================================================

INSERT INTO landscape.tbl_cre_capital_reserve (cre_property_id, reserve_type, annual_contribution, psf_annual, balance_current) VALUES
  (v_property_id, 'Roof Replacement', 25000, 0.05, 125000),
  (v_property_id, 'HVAC Replacement', 35000, 0.07, 175000),
  (v_property_id, 'Parking Lot Resurfacing', 45000, 0.09, 90000);

INSERT INTO landscape.tbl_cre_major_maintenance (cre_property_id, maintenance_type, scheduled_year, estimated_cost, priority) VALUES
  (v_property_id, 'Parking Lot Full Resurface', 2028, 850000, 'High'),
  (v_property_id, 'Roof Replacement - Section A', 2030, 1200000, 'Medium');

RAISE NOTICE '====================================';
RAISE NOTICE 'Scottsdale Promenade Data Added!';
RAISE NOTICE '====================================';
RAISE NOTICE 'Property ID: %', v_property_id;
RAISE NOTICE 'Spaces: 10 (sample)';
RAISE NOTICE 'Tenants: 7';
RAISE NOTICE 'Leases: 3 active';
RAISE NOTICE '====================================';

END $$;
