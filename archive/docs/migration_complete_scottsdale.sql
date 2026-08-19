-- ============================================================================
-- COMPLETE SCOTTSDALE PROMENADE MIGRATION
-- ============================================================================
-- Purpose: Insert Scottsdale Promenade with actual tenant roster
-- Combines: migration_kitchen_sink + migration_scottsdale_actual_roster
-- ============================================================================

-- First, create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS landscape.tbl_cre_expense_recovery (
    expense_recovery_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES landscape.tbl_cre_lease(lease_id),
    recovery_structure VARCHAR(50),
    recovery_method VARCHAR(50),
    property_tax_recovery_pct NUMERIC(6,3) DEFAULT 0,
    insurance_recovery_pct NUMERIC(6,3) DEFAULT 0,
    cam_recovery_pct NUMERIC(6,3) DEFAULT 0,
    utilities_recovery_pct NUMERIC(6,3) DEFAULT 0,
    expense_cap_psf NUMERIC(8,2),
    expense_cap_escalation_pct NUMERIC(6,3),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS landscape.tbl_cre_capital_reserve (
    capital_reserve_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES landscape.tbl_cre_property(cre_property_id),
    reserve_type VARCHAR(100),
    annual_contribution NUMERIC(12,2),
    psf_annual NUMERIC(8,2),
    balance_current NUMERIC(15,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS landscape.tbl_cre_major_maintenance (
    major_maintenance_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES landscape.tbl_cre_property(cre_property_id),
    maintenance_type VARCHAR(200),
    scheduled_year INTEGER,
    estimated_cost NUMERIC(15,2),
    priority VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add calculation period if missing
INSERT INTO landscape.tbl_calculation_period (period_number, period_type, period_start_date, period_end_date)
SELECT 1, 'Annual', '2025-01-01', '2025-12-31'
WHERE NOT EXISTS (SELECT 1 FROM landscape.tbl_calculation_period WHERE period_number = 1 AND period_type = 'Annual');

-- ============================================================================
-- EXECUTE IN TRANSACTION
-- ============================================================================

DO $$
DECLARE
    v_project_id INTEGER;
    v_property_id INTEGER;
    v_space_ids INTEGER[];
    v_tenant_ids INTEGER[];
    v_lease_ids INTEGER[];
    v_space_id INTEGER;
    v_tenant_id INTEGER;
    v_lease_id INTEGER;
BEGIN

-- ============================================================================
-- STEP 1: CREATE PROJECT
-- ============================================================================

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
  1,
  '2025-01-01',
  true
) RETURNING project_id INTO v_project_id;

RAISE NOTICE 'Created project ID: %', v_project_id;

-- ============================================================================
-- STEP 2: CREATE PROPERTY
-- ============================================================================

INSERT INTO landscape.tbl_cre_property (
  project_id,
  property_name,
  property_type,
  property_subtype,
  total_building_sf,
  rentable_sf,
  common_area_sf,
  load_factor,
  year_built,
  year_renovated,
  number_of_units,
  parking_spaces,
  parking_ratio,
  property_status,
  stabilization_date,
  stabilized_occupancy_pct,
  acquisition_date,
  acquisition_price,
  current_assessed_value
) VALUES (
  v_project_id,
  'Scottsdale Promenade',
  'Retail',
  'Community Shopping Center',
  528452,
  528452,
  5000,
  1.0095,
  2008,
  2019,
  41,
  1500,
  2.8,
  'Stabilized',
  '2010-06-01',
  97.6,
  '2025-01-15',
  42500000,
  45000000
) RETURNING cre_property_id INTO v_property_id;

RAISE NOTICE 'Created property ID: %', v_property_id;

-- ============================================================================
-- STEP 3: CREATE SPACES (41 total)
-- ============================================================================

-- Major Anchors
INSERT INTO landscape.tbl_cre_space (cre_property_id, space_number, usable_sf, rentable_sf, space_type, space_status) VALUES
  (v_property_id, 'PAD2', 133120, 133120, 'Power Center Anchor', 'Leased'),
  (v_property_id, 'MAJ4', 34922, 34922, 'Major Anchor', 'Leased'),
  (v_property_id, 'MAJ7', 34565, 34565, 'Major Anchor', 'Leased'),
  (v_property_id, 'MAJ1', 25200, 25200, 'Major Anchor', 'Leased'),
  (v_property_id, 'MAJ6', 23925, 23925, 'Major Anchor', 'Leased'),
  (v_property_id, 'MAJ10', 23656, 23656, 'Entertainment Anchor', 'Leased'),
  (v_property_id, 'MAJ9', 19444, 19444, 'Major Anchor', 'Leased'),
  (v_property_id, 'MAJ3', 18390, 18390, 'Major Anchor', 'Leased'),
  (v_property_id, 'MAJ5', 13000, 13000, 'Major Anchor', 'Leased');

-- Large Inline
INSERT INTO landscape.tbl_cre_space (cre_property_id, space_number, usable_sf, rentable_sf, space_type, space_status) VALUES
  (v_property_id, '13', 12604, 12604, 'Restaurant - Full Service', 'Leased'),
  (v_property_id, '7', 12500, 12500, 'Restaurant - Full Service', 'Leased'),
  (v_property_id, 'MAJ8A', 11008, 11008, 'Major In-Line', 'Leased'),
  (v_property_id, 'MAJ2', 10630, 10630, 'Major In-Line', 'Leased'),
  (v_property_id, 'E115', 10334, 10334, 'In-Line Retail', 'Leased'),
  (v_property_id, '12', 10000, 10000, 'Grocery - Specialty', 'Leased');

-- Medium Inline
INSERT INTO landscape.tbl_cre_space (cre_property_id, space_number, usable_sf, rentable_sf, space_type, space_status) VALUES
  (v_property_id, '3', 8695, 8695, 'Restaurant - Full Service', 'Leased'),
  (v_property_id, '14', 8650, 8650, 'Restaurant - Full Service', 'Leased'),
  (v_property_id, 'PAD8', 7350, 7350, 'Pad Site - Restaurant', 'Leased'),
  (v_property_id, '9', 7150, 7150, 'In-Line Retail', 'Leased'),
  (v_property_id, '5A2/5', 6105, 6105, 'In-Line Retail', 'Leased'),
  (v_property_id, 'MAJ8B', 5980, 5980, 'In-Line Retail', 'Leased');

-- Standard Inline (including 3 vacant)
INSERT INTO landscape.tbl_cre_space (cre_property_id, space_number, usable_sf, rentable_sf, space_type, space_status) VALUES
  (v_property_id, '5B2', 5000, 5000, 'In-Line Retail', 'Available'),
  (v_property_id, 'F107', 4784, 4784, 'In-Line Retail', 'Available'),
  (v_property_id, 'C4109', 4504, 4504, 'In-Line Retail', 'Leased'),
  (v_property_id, 'F115', 4500, 4500, 'In-Line Retail', 'Leased'),
  (v_property_id, '4', 4447, 4447, 'Bank Branch', 'Leased'),
  (v_property_id, 'D109', 4340, 4340, 'Fitness', 'Leased'),
  (v_property_id, '16A', 4334, 4334, 'Telecommunications', 'Leased'),
  (v_property_id, '11', 4186, 4186, 'Restaurant - Casual', 'Leased'),
  (v_property_id, '5A1', 4007, 4007, 'Restaurant - Bakery/Cafe', 'Leased'),
  (v_property_id, '10', 4000, 4000, 'Restaurant - QSR', 'Leased'),
  (v_property_id, 'F111', 4000, 4000, 'In-Line Retail', 'Leased'),
  (v_property_id, 'E107', 3836, 3836, 'Restaurant - Casual', 'Leased'),
  (v_property_id, 'D115', 3558, 3558, 'Personal Services', 'Leased'),
  (v_property_id, '101', 3500, 3500, 'Restaurant - Casual', 'Leased'),
  (v_property_id, 'A8', 3000, 3000, 'In-Line Retail', 'Available');

-- Small Inline
INSERT INTO landscape.tbl_cre_space (cre_property_id, space_number, usable_sf, rentable_sf, space_type, space_status) VALUES
  (v_property_id, '17A', 3000, 3000, 'Restaurant - Fast Casual', 'Leased'),
  (v_property_id, '15A', 2869, 2869, 'Restaurant - Fast Casual', 'Leased'),
  (v_property_id, '16D', 2800, 2800, 'Restaurant - Fast Casual', 'Leased'),
  (v_property_id, '17B', 2685, 2685, 'Dental Office', 'Leased'),
  (v_property_id, '104', 2640, 2640, 'Music School', 'Leased');

-- ============================================================================
-- STEP 4: CREATE TENANTS
-- ============================================================================

-- Major National/Credit Tenants
INSERT INTO landscape.tbl_cre_tenant (tenant_name, tenant_legal_name, industry, business_type, credit_rating, creditworthiness, annual_revenue, years_in_business) VALUES
  ('Living Spaces', 'Living Spaces Inc.', 'Furniture', 'Retail', 'BB', 'Good', 500000000, 20),
  ('Nordstrom Rack', 'Nordstrom Inc.', 'Department Store', 'Retail', 'BBB', 'Excellent', 15500000000, 122),
  ('Saks Off 5th', 'Saks Fifth Avenue', 'Luxury Retail', 'Retail', 'BB+', 'Good', 3000000000, 98),
  ('Michaels', 'Michaels Stores Inc.', 'Arts & Crafts', 'Retail', 'B', 'Average', 5300000000, 50),
  ('PetSmart', 'PetSmart Inc.', 'Pet Supply', 'Retail', 'BB', 'Good', 7800000000, 37),
  ('Ulta Salon', 'Ulta Beauty Inc.', 'Beauty', 'Retail', 'BBB-', 'Excellent', 10200000000, 35),
  ('Old Navy', 'Gap Inc.', 'Apparel', 'Retail', 'BBB-', 'Good', 15600000000, 30),
  ('Five Below', 'Five Below Inc.', 'Value Retail', 'Retail', 'BB+', 'Good', 3400000000, 22),
  ('Trader Joe''s', 'Trader Joe''s Company', 'Grocery - Specialty', 'Retail', 'A-', 'Excellent', 16500000000, 56),
  ('Tilly''s', 'Tillys Inc.', 'Apparel', 'Retail', 'B+', 'Average', 700000000, 40),
  ('Skechers USA', 'Skechers USA Inc.', 'Footwear', 'Retail', 'BB', 'Good', 8000000000, 32),
  ('Bank of America', 'Bank of America Corp.', 'Banking', 'Financial Services', 'A-', 'Excellent', 95000000000, 240);

-- Restaurant Tenants
INSERT INTO landscape.tbl_cre_tenant (tenant_name, industry, business_type, credit_rating, creditworthiness, annual_revenue, years_in_business) VALUES
  ('Maggiano''s Little Italy', 'Italian Restaurant', 'Full Service Restaurant', 'BB', 'Good', 450000000, 28),
  ('Cooper''s Hawk Winery', 'Winery Restaurant', 'Full Service Restaurant', 'BB+', 'Good', 400000000, 23),
  ('Benihana', 'Japanese Restaurant', 'Full Service Restaurant', 'B', 'Average', 75000000, 58),
  ('The Capital Grille', 'Steakhouse', 'Full Service Restaurant', 'BBB-', 'Excellent', 600000000, 29),
  ('Buffalo Wild Wings', 'Sports Bar', 'Casual Dining', 'BB+', 'Good', 2000000000, 42),
  ('In-N-Out Burger', 'Burger Restaurant', 'Quick Service', 'A-', 'Excellent', 1000000000, 76),
  ('Blaze Pizza', 'Pizza', 'Fast Casual', 'B+', 'Good', 350000000, 15),
  ('First Watch', 'Breakfast & Brunch', 'Casual Dining', 'BB', 'Good', 800000000, 43);

-- Specialty/Regional Tenants
INSERT INTO landscape.tbl_cre_tenant (tenant_name, industry, business_type, creditworthiness, years_in_business) VALUES
  ('Painted Tree Marketplace', 'Consignment/Boutique', 'Specialty Retail', 'Average', 8),
  ('Cost Plus World Market', 'Home Decor', 'Specialty Retail', 'Average', 58),
  ('Putting World', 'Entertainment', 'Recreation', 'Average', 12),
  ('Robbins Brothers', 'Jewelry', 'Specialty Retail', 'Good', 45),
  ('Men''s Wearhouse', 'Apparel', 'Retail', 'Average', 50),
  ('Carter''s', 'Children''s Apparel', 'Retail', 'Good', 157),
  ('Jos. A. Bank', 'Men''s Apparel', 'Retail', 'Average', 115),
  ('Anytime Fitness', 'Fitness', 'Health Club', 'Good', 22),
  ('Verizon Wireless', 'Telecommunications', 'Retail', 'Excellent', 40),
  ('World of Rugs', 'Home Furnishings', 'Specialty Retail', 'Average', 25),
  ('Ideal Image', 'Medical Aesthetics', 'Personal Services', 'Good', 20),
  ('Peachtree Dental', 'Dental', 'Healthcare', 'Average', 8),
  ('Bach to Rock', 'Music Education', 'Education Services', 'Average', 18);

-- Local/Casual Dining
INSERT INTO landscape.tbl_cre_tenant (tenant_name, industry, business_type, creditworthiness, years_in_business) VALUES
  ('Someburros', 'Mexican Food', 'Casual Dining', 'Good', 40),
  ('Paris Baguette', 'Bakery Cafe', 'Fast Casual', 'Good', 35),
  ('Picazzo''s Healthy Italian', 'Italian Restaurant', 'Casual Dining', 'Average', 20),
  ('The Original Chop Shop Co.', 'Health Food', 'Fast Casual', 'Average', 8),
  ('Modern Market', 'Farm-to-Table', 'Fast Casual', 'Good', 14);

RAISE NOTICE 'Created tenants';

-- ============================================================================
-- STEP 5: CREATE SAMPLE LEASES (Top 5 by size)
-- ============================================================================

-- Get space IDs (we'll reference by space_number)
SELECT space_id INTO v_space_id FROM landscape.tbl_cre_space WHERE cre_property_id = v_property_id AND space_number = 'PAD2';
SELECT tenant_id INTO v_tenant_id FROM landscape.tbl_cre_tenant WHERE tenant_name = 'Living Spaces';

-- LEASE 1: Living Spaces (133,120 SF Power Anchor)
INSERT INTO landscape.tbl_cre_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf,
  number_of_options, option_term_months,
  security_deposit_amount,
  exclusive_use_clause, co_tenancy_clause
) VALUES (
  v_property_id, v_space_id, v_tenant_id,
  'LVSP-2020-001', 'NNN', 'Active',
  '2020-08-15', '2021-01-01', '2036-12-31',
  192, 133120,
  2, 60,
  250000,
  'Exclusive furniture retail rights within center',
  'If occupancy drops below 80%, rent reduces 20% until stabilized'
) RETURNING lease_id INTO v_lease_id;

-- Base Rent
INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual) VALUES
  (v_lease_id, '2021-01-01', '2025-12-31', 1331200, 10.00),
  (v_lease_id, '2026-01-01', '2030-12-31', 1464320, 11.00),
  (v_lease_id, '2031-01-01', '2036-12-31', 1597440, 12.00);

-- Escalation
INSERT INTO landscape.tbl_cre_rent_escalation (lease_id, escalation_type, escalation_pct, escalation_frequency) VALUES
  (v_lease_id, 'Fixed Percentage', 2.00, 'Every 5 Years');

-- Recovery
INSERT INTO landscape.tbl_cre_expense_recovery (lease_id, recovery_structure, property_tax_recovery_pct, insurance_recovery_pct, cam_recovery_pct) VALUES
  (v_lease_id, 'Triple Net (NNN)', 100.0, 100.0, 100.0);

RAISE NOTICE 'Created Living Spaces lease';

-- LEASE 2: Trader Joe's (10,000 SF Specialty Grocery)
SELECT space_id INTO v_space_id FROM landscape.tbl_cre_space WHERE cre_property_id = v_property_id AND space_number = '12';
SELECT tenant_id INTO v_tenant_id FROM landscape.tbl_cre_tenant WHERE tenant_name = 'Trader Joe''s';

INSERT INTO landscape.tbl_cre_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf,
  number_of_options
) VALUES (
  v_property_id, v_space_id, v_tenant_id,
  'TJS-2023-002', 'NNN', 'Active',
  '2023-01-15', '2023-04-01', '2038-03-31',
  180, 10000,
  2
) RETURNING lease_id INTO v_lease_id;

-- Base Rent (Premium for grocery)
INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual) VALUES
  (v_lease_id, '2023-04-01', '2028-03-31', 350000, 35.00),
  (v_lease_id, '2028-04-01', '2033-03-31', 380000, 38.00),
  (v_lease_id, '2033-04-01', '2038-03-31', 410000, 41.00);

INSERT INTO landscape.tbl_cre_rent_escalation (lease_id, escalation_type, escalation_pct, escalation_frequency) VALUES
  (v_lease_id, 'Fixed Percentage', 2.00, 'Every 5 Years');

INSERT INTO landscape.tbl_cre_expense_recovery (lease_id, recovery_structure, property_tax_recovery_pct, insurance_recovery_pct, cam_recovery_pct) VALUES
  (v_lease_id, 'Triple Net (NNN)', 100.0, 100.0, 100.0);

RAISE NOTICE 'Created Trader Joes lease';

-- LEASE 3: Cooper's Hawk (12,500 SF Restaurant with Percentage Rent)
SELECT space_id INTO v_space_id FROM landscape.tbl_cre_space WHERE cre_property_id = v_property_id AND space_number = '7';
SELECT tenant_id INTO v_tenant_id FROM landscape.tbl_cre_tenant WHERE tenant_name = 'Cooper''s Hawk Winery';

INSERT INTO landscape.tbl_cre_lease (
  cre_property_id, space_id, tenant_id,
  lease_number, lease_type, lease_status,
  lease_execution_date, lease_commencement_date, lease_expiration_date,
  lease_term_months, leased_sf,
  number_of_options,
  expansion_rights
) VALUES (
  v_property_id, v_space_id, v_tenant_id,
  'COOP-2021-003', 'NNN', 'Active',
  '2021-07-01', '2021-10-01', '2031-09-30',
  120, 12500,
  2,
  true
) RETURNING lease_id INTO v_lease_id;

-- Base Rent
INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual) VALUES
  (v_lease_id, '2021-10-01', '2026-09-30', 500000, 40.00),
  (v_lease_id, '2026-10-01', '2031-09-30', 550000, 44.00);

-- Percentage Rent
INSERT INTO landscape.tbl_cre_percentage_rent (lease_id, breakpoint_amount, percentage_rate, reporting_frequency, prior_year_sales) VALUES
  (v_lease_id, 8000000, 5.000, 'Annual', 12500000);

-- Escalation
INSERT INTO landscape.tbl_cre_rent_escalation (lease_id, escalation_type, escalation_frequency, cpi_index, cpi_floor_pct, cpi_cap_pct) VALUES
  (v_lease_id, 'CPI', 'Annual', 'CPI-U', 2.50, 4.50);

-- Recovery
INSERT INTO landscape.tbl_cre_expense_recovery (lease_id, recovery_structure, property_tax_recovery_pct, insurance_recovery_pct, cam_recovery_pct) VALUES
  (v_lease_id, 'Triple Net (NNN)', 100.0, 100.0, 100.0);

RAISE NOTICE 'Created Coopers Hawk lease';

-- ============================================================================
-- STEP 6: OPERATING EXPENSES
-- ============================================================================

INSERT INTO landscape.tbl_cre_operating_expense (
  cre_property_id, period_id, expense_category, expense_type,
  budgeted_amount, actual_amount, amount_psf, recoverable
) VALUES
  (v_property_id, 1, 'Property Taxes', 'Fixed', 520000, 520000, 0.98, true),
  (v_property_id, 1, 'Property Insurance', 'Fixed', 95000, 95000, 0.18, true),
  (v_property_id, 1, 'Liability Insurance', 'Fixed', 35000, 35000, 0.07, true),
  (v_property_id, 1, 'Landscaping', 'Variable', 48000, 48000, 0.09, true),
  (v_property_id, 1, 'Parking Lot Maintenance', 'Variable', 62000, 62000, 0.12, true),
  (v_property_id, 1, 'Janitorial - Common Area', 'Variable', 42000, 42000, 0.08, true),
  (v_property_id, 1, 'Security', 'Fixed', 78000, 78000, 0.15, true),
  (v_property_id, 1, 'Electricity - Common', 'Variable', 85000, 85000, 0.16, true),
  (v_property_id, 1, 'Water/Sewer - Common', 'Variable', 38000, 38000, 0.07, true),
  (v_property_id, 1, 'HVAC Maintenance', 'Variable', 45000, 45000, 0.09, true),
  (v_property_id, 1, 'General Repairs', 'Variable', 28000, 28000, 0.05, true);

RAISE NOTICE 'Created operating expenses';

-- ============================================================================
-- STEP 7: CAPITAL RESERVES
-- ============================================================================

INSERT INTO landscape.tbl_cre_capital_reserve (cre_property_id, reserve_type, annual_contribution, psf_annual, balance_current) VALUES
  (v_property_id, 'Roof Replacement', 25000, 0.05, 125000),
  (v_property_id, 'HVAC Replacement', 35000, 0.07, 175000),
  (v_property_id, 'Parking Lot Resurfacing', 45000, 0.09, 90000),
  (v_property_id, 'General Capital', 20000, 0.04, 80000);

INSERT INTO landscape.tbl_cre_major_maintenance (cre_property_id, maintenance_type, scheduled_year, estimated_cost, priority) VALUES
  (v_property_id, 'Parking Lot Full Resurface', 2028, 850000, 'High'),
  (v_property_id, 'Roof Replacement - Section A', 2030, 1200000, 'Medium'),
  (v_property_id, 'HVAC Replacement - Anchors', 2032, 600000, 'Medium'),
  (v_property_id, 'Facade Refresh', 2027, 350000, 'Low');

RAISE NOTICE 'Created capital reserves and maintenance schedule';

-- ============================================================================
-- SUMMARY
-- ============================================================================

RAISE NOTICE '===========================================';
RAISE NOTICE 'Scottsdale Promenade Migration Complete!';
RAISE NOTICE '===========================================';
RAISE NOTICE 'Project ID: %', v_project_id;
RAISE NOTICE 'Property ID: %', v_property_id;
RAISE NOTICE 'Spaces Created: 41';
RAISE NOTICE 'Tenants Created: 38';
RAISE NOTICE 'Leases Created: 3 (sample - more can be added)';
RAISE NOTICE 'Operating Expenses: 11 categories';
RAISE NOTICE 'Capital Reserves: 4 types';
RAISE NOTICE '===========================================';

END $$;
