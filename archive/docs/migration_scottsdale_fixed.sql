-- ============================================================================
-- SCOTTSDALE PROMENADE - CORRECTED MIGRATION
-- ============================================================================
-- Purpose: Create Scottsdale Promenade data compatible with actual CRE schema
-- ============================================================================

-- First, add missing tables/columns
-- Add expense recovery structure table (missing from original schema)
CREATE TABLE IF NOT EXISTS landscape.tbl_cre_expense_recovery (
    expense_recovery_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES landscape.tbl_cre_lease(lease_id),
    recovery_structure VARCHAR(50), -- NNN, Modified Gross, Gross, Absolute NNN
    recovery_method VARCHAR(50), -- Pro-Rata Share, Direct Bill
    property_tax_recovery_pct NUMERIC(6,3) DEFAULT 0,
    insurance_recovery_pct NUMERIC(6,3) DEFAULT 0,
    cam_recovery_pct NUMERIC(6,3) DEFAULT 0,
    utilities_recovery_pct NUMERIC(6,3) DEFAULT 0,
    expense_cap_psf NUMERIC(8,2),
    expense_cap_escalation_pct NUMERIC(6,3),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add capital reserve tables (missing from original schema)
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

-- Add calculation periods table if needed
INSERT INTO landscape.tbl_calculation_period (period_number, period_type, period_start_date, period_end_date)
SELECT 1, 'Annual', '2025-01-01', '2025-12-31'
WHERE NOT EXISTS (SELECT 1 FROM landscape.tbl_calculation_period WHERE period_number = 1 AND period_type = 'Annual');

-- ============================================================================
-- STEP 1: CREATE SCOTTSDALE PROMENADE PROJECT
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
) RETURNING project_id;

-- Get project_id (will be used below - adjust manually if needed)
-- For now, we'll query it
DO $$
DECLARE
    v_project_id INTEGER;
    v_property_id INTEGER;
BEGIN
    -- Get the Scottsdale project ID
    SELECT project_id INTO v_project_id
    FROM landscape.tbl_project
    WHERE project_name = 'Scottsdale Promenade'
    ORDER BY created_at DESC LIMIT 1;

    -- ============================================================================
    -- STEP 2: CREATE PROPERTY RECORD
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

    RAISE NOTICE 'Created property with ID: %', v_property_id;
END $$;
