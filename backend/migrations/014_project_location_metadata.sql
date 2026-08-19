-- ============================================================================
-- PROJECT TAB - LOCATION & METADATA FIELDS
-- ============================================================================
-- Purpose: Add missing fields for Project tab display
-- Property: Chadron Terrace (project_id=17) as test case
-- Date: 2025-10-26
-- ============================================================================

-- Add location fields
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS street_address VARCHAR(200),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(10),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS county VARCHAR(100),
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'United States',
ADD COLUMN IF NOT EXISTS market VARCHAR(100),
ADD COLUMN IF NOT EXISTS submarket VARCHAR(100);

-- Add parcel/legal fields
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS apn_primary VARCHAR(50),
ADD COLUMN IF NOT EXISTS apn_secondary VARCHAR(50),
ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(50);

-- Add property classification fields
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS property_subtype VARCHAR(100),
ADD COLUMN IF NOT EXISTS property_class VARCHAR(10);

-- Add physical characteristic fields
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS lot_size_sf NUMERIC,
ADD COLUMN IF NOT EXISTS lot_size_acres NUMERIC,
ADD COLUMN IF NOT EXISTS gross_sf NUMERIC,
ADD COLUMN IF NOT EXISTS total_units INTEGER,
ADD COLUMN IF NOT EXISTS year_built INTEGER,
ADD COLUMN IF NOT EXISTS stories INTEGER;

-- Add pricing/valuation fields
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS asking_price NUMERIC,
ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC,
ADD COLUMN IF NOT EXISTS price_per_sf NUMERIC,
ADD COLUMN IF NOT EXISTS cap_rate_current NUMERIC,
ADD COLUMN IF NOT EXISTS cap_rate_proforma NUMERIC;

-- Add current financial fields
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS current_gpr NUMERIC,
ADD COLUMN IF NOT EXISTS current_other_income NUMERIC,
ADD COLUMN IF NOT EXISTS current_gpi NUMERIC,
ADD COLUMN IF NOT EXISTS current_vacancy_rate NUMERIC,
ADD COLUMN IF NOT EXISTS current_egi NUMERIC,
ADD COLUMN IF NOT EXISTS current_opex NUMERIC,
ADD COLUMN IF NOT EXISTS current_noi NUMERIC;

-- Add proforma financial fields
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS proforma_gpr NUMERIC,
ADD COLUMN IF NOT EXISTS proforma_other_income NUMERIC,
ADD COLUMN IF NOT EXISTS proforma_gpi NUMERIC,
ADD COLUMN IF NOT EXISTS proforma_vacancy_rate NUMERIC,
ADD COLUMN IF NOT EXISTS proforma_egi NUMERIC,
ADD COLUMN IF NOT EXISTS proforma_opex NUMERIC,
ADD COLUMN IF NOT EXISTS proforma_noi NUMERIC;

-- Add broker/brokerage fields
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS listing_brokerage VARCHAR(200);

-- Add administrative/tracking fields
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS job_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS version_reference VARCHAR(50);

-- Add comments
COMMENT ON COLUMN landscape.tbl_project.street_address IS 'Street address separate from full address field';
COMMENT ON COLUMN landscape.tbl_project.city IS 'City name';
COMMENT ON COLUMN landscape.tbl_project.state IS 'State abbreviation';
COMMENT ON COLUMN landscape.tbl_project.zip_code IS 'ZIP/Postal code';
COMMENT ON COLUMN landscape.tbl_project.county IS 'County name (e.g., Los Angeles)';
COMMENT ON COLUMN landscape.tbl_project.market IS 'Primary market (e.g., Los Angeles County)';
COMMENT ON COLUMN landscape.tbl_project.submarket IS 'Submarket within market (e.g., South Bay)';
COMMENT ON COLUMN landscape.tbl_project.apn_primary IS 'Primary Assessor Parcel Number';
COMMENT ON COLUMN landscape.tbl_project.apn_secondary IS 'Secondary APN if multiple parcels';
COMMENT ON COLUMN landscape.tbl_project.ownership_type IS 'Fee Simple, Leasehold, etc.';
COMMENT ON COLUMN landscape.tbl_project.property_subtype IS 'Detailed property type (e.g., Garden Apartments)';
COMMENT ON COLUMN landscape.tbl_project.property_class IS 'Property class: A, B, C, etc.';
COMMENT ON COLUMN landscape.tbl_project.listing_brokerage IS 'Brokerage company name';

-- ============================================================================
-- POPULATE CHADRON PROPERTY DATA
-- ============================================================================

UPDATE landscape.tbl_project
SET
  -- Location Info
  street_address = '14105 Chadron Avenue',
  city = 'Hawthorne',
  state = 'CA',
  zip_code = '90250',
  county = 'Los Angeles',
  country = 'United States',
  market = 'Los Angeles County',
  submarket = 'South Bay',

  -- Also update jurisdiction fields for consistency
  jurisdiction_city = 'Hawthorne',
  jurisdiction_state = 'CA',
  jurisdiction_county = 'Los Angeles',

  -- Parcel Info
  apn_primary = '4052-022-015',
  apn_secondary = '4052-022-016',
  ownership_type = 'Fee Simple',

  -- Property Classification
  property_type_code = 'MULTIFAMILY',
  project_type = 'Multifamily',
  property_subtype = 'Garden Apartments',
  property_class = 'B',

  -- Physical Characteristics
  lot_size_sf = 119748,
  lot_size_acres = 2.75,
  acres_gross = 2.75,
  gross_sf = 138504,
  total_units = 113,
  year_built = 2016,
  stories = 4,

  -- Pricing & Valuation
  asking_price = 47500000,
  price_per_unit = 420354,
  price_per_sf = 342.95,
  cap_rate_current = 0.0400,
  cap_rate_proforma = 0.0654,

  -- Financial Performance (Current)
  current_gpr = 3072516,
  current_other_income = 61513,
  current_gpi = 3134029,
  current_vacancy_rate = 0.03,
  current_egi = 3041854,
  current_opex = 1141837,
  current_noi = 1900016,

  -- Financial Performance (Proforma)
  proforma_gpr = 4356996,
  proforma_other_income = 61513,
  proforma_gpi = 4418509,
  proforma_vacancy_rate = 0.03,
  proforma_egi = 4287799,
  proforma_opex = 1182816,
  proforma_noi = 3104983,

  -- Broker Info
  listing_brokerage = 'Colliers International'

WHERE project_id = 17;

-- Verify update
SELECT
  project_id,
  project_name,
  street_address,
  city,
  county,
  state,
  apn_primary,
  apn_secondary,
  ownership_type,
  property_subtype,
  property_class,
  listing_brokerage,
  total_units,
  asking_price
FROM landscape.tbl_project
WHERE project_id = 17;
