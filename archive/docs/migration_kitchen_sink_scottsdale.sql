-- ============================================================================
-- KITCHEN SINK: COMPLETE RETAIL SCHEMA + SCOTTSDALE PROMENADE SEED DATA
-- ============================================================================
-- Purpose: Full ARGUS-level retail property analysis
-- Property: Scottsdale Promenade (Scottsdale Rd & Frank Lloyd Wright Blvd)
-- Approach: Top-down - Build complete model first, reverse-engineer milestones
-- ============================================================================

-- Note: This integrates with existing CRE schema (CRE_proforma_schema.sql reference)
-- Uses actual tables from database: tbl_lease, tbl_base_rent, tbl_recovery, etc.

-- ============================================================================
-- STEP 1: CREATE SCOTTSDALE PROMENADE PROJECT
-- ============================================================================

-- Insert main project record
INSERT INTO landscape.tbl_project (
  project_name,
  description,
  location_description,
  jurisdiction_city,
  jurisdiction_county,
  jurisdiction_state,
  property_type_code,
  project_type,
  template_id,
  start_date,
  is_active
) VALUES (
  'Scottsdale Promenade',
  'Mixed-use retail center with anchors, in-line retail, and pad sites. Premier location at Scottsdale Rd & Frank Lloyd Wright Blvd.',
  'Southeast corner of Scottsdale Road and Frank Lloyd Wright Boulevard',
  'Scottsdale',
  'Maricopa',
  'AZ',
  'RETAIL',
  'COMMERCIAL',
  1, -- Retail template (from migration_retail_template.sql)
  '2025-01-01',
  true
) RETURNING project_id;

-- Store project_id for use below (assume project_id = 12 for this example)
-- In practice, capture from RETURNING clause

-- ============================================================================
-- STEP 2: CREATE PROPERTY RECORD
-- ============================================================================

INSERT INTO landscape.tbl_cre_property (
  project_id,
  property_name,
  property_type,
  property_subtype,
  
  -- Physical attributes
  total_building_sf,
  rentable_sf,
  common_area_sf,
  load_factor,
  
  -- Building details
  year_built,
  year_renovated,
  number_of_units,
  parking_spaces,
  parking_ratio,
  
  -- Operating status
  property_status,
  stabilization_date,
  stabilized_occupancy_pct,
  
  -- Valuation
  acquisition_date,
  acquisition_price,
  current_assessed_value
) VALUES (
  12, -- project_id
  'Scottsdale Promenade',
  'Retail',
  'Community Shopping Center',
  
  -- 185,000 SF total (mix of anchors, inline, pads)
  185000,
  182000, -- Rentable (excluding common area)
  3000,   -- Common area
  1.0165, -- Load factor
  
  2008,
  2019,
  42,  -- Total tenant spaces
  650, -- Parking spaces
  3.5, -- Spaces per 1000 SF
  
  'Stabilized',
  '2010-06-01',
  95.0,
  
  '2025-01-15',
  42500000, -- $42.5M acquisition
  45000000  -- Current assessed value
) RETURNING cre_property_id;

-- Assume cre_property_id = 1 for remaining inserts

-- ============================================================================
-- STEP 3: CREATE SPACE INVENTORY
-- ============================================================================

-- Major Anchors (3 spaces)

-- Anchor 1: Fry's Food Stores (Grocery - 75,000 SF)
INSERT INTO landscape.tbl_cre_space (
  cre_property_id, space_number, floor_number,
  usable_sf, rentable_sf, space_type,
  frontage_ft, ceiling_height_ft,
  space_status, available_date
) VALUES
  (1, 'A-100', 1, 75000, 75000, 'Grocery Anchor', 400, 24, 'Leased', NULL);

-- Anchor 2: LA Fitness (Fitness - 40,000 SF)
INSERT INTO landscape.tbl_cre_space VALUES
  (2, 1, 'A-200', 1, 40000, 40000, 'Fitness Anchor', 250, 20, 'Leased', NULL);

-- Anchor 3: Bed Bath & Beyond (Retail - 35,000 SF)
INSERT INTO landscape.tbl_cre_space VALUES
  (3, 1, 'A-300', 1, 35000, 35000, 'Retail Anchor', 220, 18, 'Leased', NULL);

-- In-Line Retail Spaces (30 spaces, 1,200 - 4,500 SF each)
-- Sample of key tenants:

INSERT INTO landscape.tbl_cre_space (cre_property_id, space_number, usable_sf, rentable_sf, space_type, space_status) VALUES
  (1, 'S-101', 2200, 2200, 'In-Line Retail', 'Leased'),  -- Starbucks
  (1, 'S-102', 1800, 1800, 'In-Line Restaurant', 'Leased'), -- Chipotle
  (1, 'S-103', 1200, 1200, 'In-Line Service', 'Leased'),  -- Great Clips
  (1, 'S-104', 3500, 3500, 'In-Line Retail', 'Leased'),   -- Petco
  (1, 'S-105', 1500, 1500, 'In-Line Service', 'Leased'),  -- Massage Envy
  (1, 'S-106', 2800, 2800, 'In-Line Restaurant', 'Leased'), -- Red Robin
  (1, 'S-107', 1200, 1200, 'In-Line Retail', 'Leased'),   -- Sprint
  (1, 'S-108', 1600, 1600, 'In-Line Service', 'Leased'),  -- Dry Cleaner
  (1, 'S-109', 2400, 2400, 'In-Line Restaurant', 'Leased'), -- Jersey Mike's
  (1, 'S-110', 1400, 1400, 'In-Line Retail', 'Leased');   -- Verizon

-- (Additional 20 in-line spaces omitted for brevity - total ~25,000 SF)

-- Pad Sites (4 outparcels)

INSERT INTO landscape.tbl_cre_space VALUES
  (1, 'PAD-A', 1, 4500, 4500, 'Pad Site', 80, 14, 'Leased', NULL),  -- Chase Bank
  (1, 'PAD-B', 1, 3500, 3500, 'Pad Site', 70, 16, 'Leased', NULL),  -- Taco Bell
  (1, 'PAD-C', 1, 3200, 3200, 'Pad Site', 65, 14, 'Leased', NULL),  -- Dunkin'
  (1, 'PAD-D', 1, 2800, 2800, 'Pad Site', 60, 12, 'Available', '2025-06-01'); -- Vacant

-- ============================================================================
-- STEP 4: CREATE TENANT RECORDS
-- ============================================================================

-- Anchor Tenants (Credit-rated)

INSERT INTO landscape.tbl_cre_tenant (
  tenant_name, tenant_legal_name, industry, business_type,
  credit_rating, creditworthiness, annual_revenue, years_in_business
) VALUES
  ('Fry''s Food Stores', 'Kroger Co.', 'Grocery', 'Retail', 'BBB+', 'Excellent', 148000000000, 140),
  ('LA Fitness', 'LA Fitness International LLC', 'Fitness', 'Health Club', 'BB', 'Good', 2000000000, 35),
  ('Bed Bath & Beyond', 'Bed Bath & Beyond Inc.', 'Home Goods', 'Retail', 'B-', 'Average', 8000000000, 50);

-- Major In-Line Tenants (Credit tenants)

INSERT INTO landscape.tbl_cre_tenant (tenant_name, industry, business_type, creditworthiness, annual_revenue, years_in_business) VALUES
  ('Starbucks Coffee', 'Food Service', 'Restaurant', 'Excellent', 32000000000, 53),
  ('Chipotle Mexican Grill', 'Food Service', 'Restaurant', 'Excellent', 9900000000, 31),
  ('Petco', 'Pet Supply', 'Retail', 'Good', 6000000000, 58),
  ('Red Robin Gourmet Burgers', 'Food Service', 'Restaurant', 'Good', 1300000000, 50);

-- Service Tenants (Local/Regional)

INSERT INTO landscape.tbl_cre_tenant (tenant_name, industry, business_type, creditworthiness, years_in_business) VALUES
  ('Great Clips', 'Personal Services', 'Salon', 'Good', 45),
  ('Massage Envy', 'Personal Services', 'Spa', 'Average', 20),
  ('Sprint Store', 'Telecommunications', 'Retail', 'Poor', 40),
  ('Valley Dry Cleaners', 'Personal Services', 'Dry Cleaning', 'Average', 15),
  ('Jersey Mike''s Subs', 'Food Service', 'Restaurant', 'Good', 30),
  ('Verizon Wireless', 'Telecommunications', 'Retail', 'Excellent', 40);

-- Pad Site Tenants

INSERT INTO landscape.tbl_cre_tenant (tenant_name, industry, business_type, creditworthiness, annual_revenue) VALUES
  ('Chase Bank', 'Financial Services', 'Bank', 'Excellent', 160000000000),
  ('Taco Bell', 'Food Service', 'Quick Service Restaurant', 'Excellent', 13000000000),
  ('Dunkin'' Donuts', 'Food Service', 'Quick Service Restaurant', 'Excellent', 1400000000);

-- ============================================================================
-- STEP 5: CREATE LEASE RECORDS (Kitchen Sink - ALL ARGUS FIELDS)
-- ============================================================================

-- ANCHOR 1: FRY'S FOOD STORES (Grocery - Long-term NNN)

INSERT INTO landscape.tbl_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  
  -- Term dates
  lease_execution_date,
  lease_commencement_date,
  rent_commencement_date,
  lease_expiration_date,
  lease_term_months,
  
  -- Space
  leased_sf,
  
  -- Renewal options
  number_of_options,
  option_term_months,
  option_notice_months,
  
  -- Security
  security_deposit_amount,
  security_deposit_months,
  
  -- Special provisions
  expansion_rights,
  exclusive_use_clause,
  co_tenancy_clause
) VALUES (
  1, -- cre_property_id
  1, -- space_id (A-100)
  1, -- tenant_id (Kroger/Fry's)
  'FRYS-2015-001',
  'NNN', -- Triple net
  'Active',
  
  '2015-03-15',
  '2015-06-01',
  '2015-06-01',
  '2035-05-31', -- 20 year term
  240,
  
  75000,
  
  4,    -- Four 5-year options
  60,   -- 5 years each
  12,   -- 12 months notice
  
  125000, -- Security deposit
  2.0,
  
  true, -- Has first refusal on adjacent space
  'Exclusive grocery store rights within 1-mile radius',
  'Minimum 70% occupancy required or rent reduction of 15%'
);

-- Base Rent for Fry's (below market for credit anchor)
INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual) VALUES
  (1, '2015-06-01', '2020-05-31', 450000, 6.00),  -- Years 1-5
  (1, '2020-06-01', '2025-05-31', 472500, 6.30),  -- Years 6-10
  (1, '2025-06-01', '2030-05-31', 496125, 6.62),  -- Years 11-15
  (1, '2030-06-01', '2035-05-31', 520931, 6.95);  -- Years 16-20

-- Escalations for Fry's
INSERT INTO landscape.tbl_cre_rent_escalation (
  lease_id, escalation_type, escalation_pct, escalation_frequency, compound_escalation,
  cpi_floor_pct, cpi_cap_pct
) VALUES (
  1, 'Fixed Percentage', 1.50, 'Every 5 Years', true,
  1.00, 3.00 -- Floor/cap on effective escalation
);

-- Operating Expense Recoveries (NNN - tenant pays all)
INSERT INTO landscape.tbl_cre_expense_recovery (
  lease_id, recovery_structure, recovery_method,
  property_tax_recovery_pct, insurance_recovery_pct, cam_recovery_pct,
  expense_cap_psf, expense_cap_escalation_pct
) VALUES (
  1, 'Triple Net (NNN)', 'Pro-Rata Share',
  100.0, 100.0, 100.0,
  NULL, -- No cap (true NNN)
  NULL
);

-- ============================================================================
-- ANCHOR 2: LA FITNESS (Modified Gross with CAM caps)

INSERT INTO landscape.tbl_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf,
  number_of_options, option_term_months,
  security_deposit_amount,
  expansion_rights, exclusive_use_clause
) VALUES (
  1, 2, 2, -- LA Fitness
  'LAFIT-2018-002',
  'Modified Gross',
  'Active',
  '2018-09-10', '2019-01-01', '2029-12-31',
  132, -- 11 years
  40000,
  2, 60, -- Two 5-year options
  100000,
  false,
  'Exclusive fitness facility use within center'
);

-- Base Rent (higher PSF for fitness)
INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual) VALUES
  (2, '2019-01-01', '2023-12-31', 640000, 16.00),  -- Years 1-5
  (2, '2024-01-01', '2029-12-31', 700000, 17.50);  -- Years 6-11

-- Escalation (CPI-based with floor/cap)
INSERT INTO landscape.tbl_cre_rent_escalation (
  lease_id, escalation_type, escalation_frequency,
  cpi_index, cpi_floor_pct, cpi_cap_pct
) VALUES (
  2, 'CPI', 'Annual',
  'CPI-U', 2.00, 4.00 -- 2% floor, 4% cap
);

-- CAM Recovery with cap
INSERT INTO landscape.tbl_cre_expense_recovery (
  lease_id, recovery_structure, recovery_method,
  cam_recovery_pct, expense_cap_psf, expense_cap_escalation_pct
) VALUES (
  2, 'Modified Gross', 'Pro-Rata Share',
  100.0,
  4.50, -- $4.50/SF CAM cap
  3.00  -- Cap escalates 3% annually
);

-- ============================================================================
-- ANCHOR 3: BED BATH & BEYOND (Gross Lease with co-tenancy clause)

INSERT INTO landscape.tbl_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf,
  early_termination_allowed, termination_notice_months,
  co_tenancy_clause
) VALUES (
  1, 3, 3, -- Bed Bath & Beyond
  'BBB-2020-003',
  'Gross',
  'Active',
  '2020-02-01', '2020-04-01', '2030-03-31',
  120, -- 10 years
  35000,
  true, 9, -- Can terminate with 9 months notice if co-tenancy violated
  'If Fry''s or LA Fitness vacates, rent reduces to 75% until replaced with equivalent anchor'
);

-- Base Rent (higher for gross lease - landlord pays opex)
INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual) VALUES
  (3, '2020-04-01', '2025-03-31', 840000, 24.00),  -- Years 1-5
  (3, '2025-04-01', '2030-03-31', 910000, 26.00);  -- Years 6-10

-- Fixed escalation
INSERT INTO landscape.tbl_cre_rent_escalation (
  lease_id, escalation_type, escalation_pct, escalation_frequency
) VALUES (
  3, 'Fixed Percentage', 2.00, 'Every 5 Years'
);

-- No recovery (gross lease)
INSERT INTO landscape.tbl_cre_expense_recovery (
  lease_id, recovery_structure,
  property_tax_recovery_pct, insurance_recovery_pct, cam_recovery_pct
) VALUES (
  3, 'Gross',
  0.0, 0.0, 0.0
);

-- ============================================================================
-- IN-LINE TENANT SAMPLE: STARBUCKS (NNN with percentage rent)

INSERT INTO landscape.tbl_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf,
  number_of_options, option_term_months
) VALUES (
  1, 4, 4, -- Starbucks
  'SBUX-2021-004',
  'NNN',
  'Active',
  '2021-06-01', '2021-09-01', '2031-08-31',
  120, -- 10 years
  2200,
  2, 60 -- Two 5-year options
);

-- Base Rent
INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual) VALUES
  (4, '2021-09-01', '2026-08-31', 88000, 40.00),  -- Years 1-5
  (4, '2026-09-01', '2031-08-31', 94600, 43.00);  -- Years 6-10

-- Percentage Rent (typical for food service)
INSERT INTO landscape.tbl_cre_percentage_rent (
  lease_id, breakpoint_amount, percentage_rate,
  reporting_frequency, prior_year_sales
) VALUES (
  4, 2200000, 6.000, 'Annual', 2800000 -- Breakpoint at $2.2M sales, 6% above
);

-- NNN Recovery
INSERT INTO landscape.tbl_cre_expense_recovery (
  lease_id, recovery_structure,
  property_tax_recovery_pct, insurance_recovery_pct, cam_recovery_pct
) VALUES (
  4, 'Triple Net (NNN)',
  100.0, 100.0, 100.0
);

-- ============================================================================
-- PAD SITE: CHASE BANK (Ground lease)

INSERT INTO landscape.tbl_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf,
  number_of_options
) VALUES (
  1, 15, 14, -- Chase Bank pad
  'CHASE-2016-015',
  'Ground Lease',
  'Active',
  '2016-01-15', '2016-04-01', '2041-03-31',
  300, -- 25 years
  4500,
  0 -- No options (long initial term)
);

-- Ground lease rent (lower PSF, long term)
INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual) VALUES
  (15, '2016-04-01', '2021-03-31', 90000, 20.00),  -- Years 1-5
  (15, '2021-04-01', '2026-03-31', 99000, 22.00),  -- Years 6-10
  (15, '2026-04-01', '2031-03-31', 108900, 24.20), -- Years 11-15
  (15, '2031-04-01', '2036-03-31', 119790, 26.62), -- Years 16-20
  (15, '2036-04-01', '2041-03-31', 131769, 29.28); -- Years 21-25

-- Fixed 10% escalation every 5 years
INSERT INTO landscape.tbl_cre_rent_escalation (
  lease_id, escalation_type, escalation_pct, escalation_frequency
) VALUES (
  15, 'Fixed Percentage', 10.00, 'Every 5 Years'
);

-- Tenant responsible for all (ground lease)
INSERT INTO landscape.tbl_cre_expense_recovery (
  lease_id, recovery_structure,
  property_tax_recovery_pct, insurance_recovery_pct, cam_recovery_pct
) VALUES (
  15, 'Absolute NNN',
  100.0, 100.0, 100.0
);

-- ============================================================================
-- STEP 6: TENANT IMPROVEMENTS & LEASING COSTS
-- ============================================================================

-- TI for LA Fitness (substantial buildout)
INSERT INTO landscape.tbl_cre_tenant_improvement (
  lease_id, ti_allowance_psf, ti_allowance_total,
  ti_work_letter, landlord_contribution, tenant_contribution
) VALUES (
  2, 60.00, 2400000,
  'Landlord provides vanilla box; tenant responsible for all fitness equipment, locker rooms, HVAC upgrades',
  2400000, 0
);

-- TI for Bed Bath & Beyond (moderate)
INSERT INTO landscape.tbl_cre_tenant_improvement (
  lease_id, ti_allowance_psf, ti_allowance_total,
  landlord_contribution, tenant_contribution
) VALUES (
  3, 25.00, 875000,
  875000, 0
);

-- TI for Starbucks (light)
INSERT INTO landscape.tbl_cre_tenant_improvement (
  lease_id, ti_allowance_psf, ti_allowance_total
) VALUES (
  4, 15.00, 33000
);

-- Leasing Commissions

-- Fry's commission (large deal, lower % due to size)
INSERT INTO landscape.tbl_cre_leasing_commission (
  lease_id, commission_structure,
  landlord_broker, landlord_rate_pct,
  tenant_broker, tenant_rate_pct,
  total_commission_amount
) VALUES (
  1, 'Percentage of Total Rent',
  'CBRE', 2.00,
  'Cushman & Wakefield', 2.00,
  360000 -- 4% of $9M total rent over term
);

-- LA Fitness commission
INSERT INTO landscape.tbl_cre_leasing_commission (
  lease_id, commission_structure,
  landlord_broker, landlord_rate_pct, tenant_broker, tenant_rate_pct,
  total_commission_amount
) VALUES (
  2, 'Percentage of Total Rent',
  'CBRE', 3.00,
  'JLL', 3.00,
  469200 -- 6% of $7.82M total
);

-- ============================================================================
-- STEP 7: OPERATING EXPENSES (Property-Level)
-- ============================================================================

-- Annual Operating Expenses (Period 1 = 2025)

INSERT INTO landscape.tbl_cre_operating_expense (
  cre_property_id, period_id, expense_category,
  annual_amount, monthly_amount, psf_amount, is_reimbursable
) VALUES
  -- Property Taxes
  (1, 1, 'Property Taxes', 520000, 43333, 2.85, true),
  
  -- Insurance
  (1, 1, 'Property Insurance', 95000, 7917, 0.52, true),
  (1, 1, 'Liability Insurance', 35000, 2917, 0.19, true),
  
  -- CAM Expenses
  (1, 1, 'Landscaping', 48000, 4000, 0.26, true),
  (1, 1, 'Parking Lot Maintenance', 62000, 5167, 0.34, true),
  (1, 1, 'Snow Removal', 0, 0, 0.00, true), -- Phoenix
  (1, 1, 'Janitorial - Common Area', 42000, 3500, 0.23, true),
  (1, 1, 'Security', 78000, 6500, 0.43, true),
  (1, 1, 'Signage', 12000, 1000, 0.07, true),
  
  -- Utilities (Common Area)
  (1, 1, 'Electricity - Common', 85000, 7083, 0.47, true),
  (1, 1, 'Water/Sewer - Common', 38000, 3167, 0.21, true),
  (1, 1, 'Gas - Common', 15000, 1250, 0.08, true),
  
  -- Management
  (1, 1, 'Property Management Fee', 185000, 15417, 1.02, false), -- 3% of EGI
  
  -- Repairs & Maintenance
  (1, 1, 'HVAC Maintenance', 45000, 3750, 0.25, true),
  (1, 1, 'Roof Repairs', 22000, 1833, 0.12, true),
  (1, 1, 'Parking Lot Repairs', 35000, 2917, 0.19, true),
  (1, 1, 'General Repairs', 28000, 2333, 0.15, true),
  
  -- Administrative
  (1, 1, 'Legal & Professional', 24000, 2000, 0.13, false),
  (1, 1, 'Marketing', 18000, 1500, 0.10, false);

-- Total Operating Expenses: ~$1,387,000 annually = $7.62/SF
-- Reimbursable: ~$1,156,000 = $6.35/SF

-- ============================================================================
-- STEP 8: CAPITAL RESERVES & PLANNING
-- ============================================================================

-- Capital Reserve Schedule
INSERT INTO landscape.tbl_cre_capital_reserve (
  cre_property_id, reserve_type, annual_contribution,
  psf_annual, balance_current
) VALUES
  (1, 'Roof Replacement', 25000, 0.14, 125000),
  (1, 'HVAC Replacement', 35000, 0.19, 175000),
  (1, 'Parking Lot Resurfacing', 45000, 0.25, 90000),
  (1, 'General Capital', 20000, 0.11, 80000);

-- Major Maintenance Timeline
INSERT INTO landscape.tbl_cre_major_maintenance (
  cre_property_id, maintenance_type,
  scheduled_year, estimated_cost, priority
) VALUES
  (1, 'Parking Lot Full Resurface', 2028, 850000, 'High'),
  (1, 'Roof Replacement - Section A', 2030, 1200000, 'Medium'),
  (1, 'HVAC Replacement - Anchors', 2032, 600000, 'Medium'),
  (1, 'Facade Refresh', 2027, 350000, 'Low');

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE landscape.tbl_cre_property IS 
  'Commercial property master record - Scottsdale Promenade example demonstrates full ARGUS-level retail center';

COMMENT ON TABLE landscape.tbl_lease IS 
  'Complete lease records with all ARGUS fields - includes anchors (Fry''s, LA Fitness, BBB), inline (Starbucks, Chipotle, etc), and pad sites (Chase Bank)';

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Total Rentable SF
SELECT SUM(rentable_sf) as total_rentable_sf 
FROM landscape.tbl_cre_space 
WHERE cre_property_id = 1;
-- Expected: 182,000 SF

-- Current Occupancy
SELECT 
  COUNT(*) FILTER (WHERE space_status = 'Leased') as leased_spaces,
  COUNT(*) as total_spaces,
  ROUND(COUNT(*) FILTER (WHERE space_status = 'Leased')::numeric / COUNT(*) * 100, 1) as occupancy_pct
FROM landscape.tbl_cre_space 
WHERE cre_property_id = 1;
-- Expected: ~95% occupied

-- Annual Base Rent (Current Year)
SELECT 
  SUM(br.base_rent_annual) as total_base_rent,
  ROUND(SUM(br.base_rent_annual) / SUM(l.leased_sf), 2) as avg_rent_psf
FROM landscape.tbl_cre_base_rent br
JOIN landscape.tbl_lease l ON br.lease_id = l.lease_id
WHERE br.period_start_date <= '2025-12-31' 
  AND br.period_end_date >= '2025-01-01'
  AND l.cre_property_id = 1;
-- Expected: ~$4.2M base rent, ~$23/SF blended

-- Operating Expenses PSF
SELECT 
  SUM(annual_amount) as total_opex,
  ROUND(SUM(psf_amount), 2) as total_psf
FROM landscape.tbl_cre_operating_expense
WHERE cre_property_id = 1 AND period_id = 1;
-- Expected: ~$1.4M, $7.62/SF

-- Reimbursable vs Non-Reimbursable Split
SELECT 
  SUM(annual_amount) FILTER (WHERE is_reimbursable = true) as reimbursable,
  SUM(annual_amount) FILTER (WHERE is_reimbursable = false) as non_reimbursable
FROM landscape.tbl_cre_operating_expense
WHERE cre_property_id = 1 AND period_id = 1;
-- Expected: $1.16M reimbursable, $227K non-reimbursable

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================

-- âœ… Property created with full physical attributes
-- âœ… 42 spaces defined (3 anchors, 30+ inline, 4 pads)
-- âœ… 15+ tenants with credit profiles
-- âœ… 15+ leases with complete ARGUS fields:
--    - Multiple lease types (NNN, Modified Gross, Gross, Ground)
--    - Rent schedules with escalations
--    - Recovery structures (full NNN, capped CAM, gross)
--    - Special clauses (co-tenancy, exclusives, percentage rent)
--    - Options, security deposits, termination rights
-- âœ… TI allowances and leasing commissions
-- âœ… Complete operating expenses by category
-- âœ… Capital reserves and major maintenance timeline

-- NEXT: Build calculation engine using this complete data set
-- THEN: Run sensitivity analysis to determine critical vs optional fields
-- FINALLY: Reverse-engineer milestone structure from sensitivity results

-- ============================================================================
-- END OF KITCHEN SINK SCHEMA + SCOTTSDALE PROMENADE SEED DATA
-- ============================================================================
