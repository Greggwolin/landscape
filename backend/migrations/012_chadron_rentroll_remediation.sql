-- ===============================================
-- MIGRATION: 012_chadron_rentroll_remediation.sql
-- PURPOSE: Populate rent roll data for 115 units at 14105 Chadron Ave (project_id=17)
-- SOURCE: Offering Memorandum Pages 29-34
-- DATE: 2025-10-24
-- ===============================================

BEGIN;

-- ===============================================
-- STEP 1: ALTER TABLE - Add missing columns
-- ===============================================

ALTER TABLE landscape.tbl_multifamily_unit
ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS current_rent NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS current_rent_psf NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS market_rent_psf NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS lease_start_date DATE,
ADD COLUMN IF NOT EXISTS lease_end_date DATE,
ADD COLUMN IF NOT EXISTS occupancy_status VARCHAR(20);

-- Note: is_section8, market_rent, square_feet, bedrooms, bathrooms, unit_type columns already exist

-- ===============================================
-- STEP 2: CREATE UNIT TYPES with amenity variants
-- ===============================================

-- Delete any existing unit types for this project to avoid conflicts
DELETE FROM landscape.tbl_multifamily_unit_type WHERE project_id = 17;

-- Insert unit types with amenity variants
INSERT INTO landscape.tbl_multifamily_unit_type (project_id, unit_type_code, bedrooms, bathrooms, avg_square_feet, current_market_rent, total_units, created_at, updated_at) VALUES
(17, '1BR/1BA', 1, 1, 750, 1624.00, 22, NOW(), NOW()),
(17, '2BR/2BA', 2, 2, 1035, 2136.00, 53, NOW(), NOW()),
(17, '2BR/2BA XL Patio', 2, 2, 1035, 2136.00, 3, NOW(), NOW()),
(17, '3BR/2BA', 3, 2, 1280, 2250.00, 33, NOW(), NOW()),
(17, '3BR/2BA Balcony', 3, 2, 1280, 2250.00, 1, NOW(), NOW()),
(17, '3BR/2BA Tower', 3, 2, 1280, 2250.00, 1, NOW(), NOW()),
(17, 'Commercial', 0, 0, 1101, 0, 1, NOW(), NOW()),
(17, 'Office', 0, 0, 1, 0, 1, NOW(), NOW());

-- ===============================================
-- STEP 3: UPDATE ALL 115 UNITS
-- ===============================================

-- Unit 100: Commercial - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = 'Commercial',
  bedrooms = 0,
  bathrooms = 0,
  square_feet = 1101,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 0.00,
  market_rent_psf = 0.00,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '100' AND project_id = 17;

-- Unit 101: Office - Office
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = 'Office',
  bedrooms = 0,
  bathrooms = 0,
  square_feet = 1,
  occupancy_status = 'office',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 0.00,
  market_rent_psf = 0.00,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '101' AND project_id = 17;

-- Unit 200: 3BR/2BA Tower - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA Tower',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '200' AND project_id = 17;

-- Unit 201: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '201' AND project_id = 17;

-- Unit 202: 3BR/2BA - Manager (Manager)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'manager',
  current_rent = 2790.00,
  current_rent_psf = 2.18,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2021-03-01',
  lease_end_date = '2026-02-28',
  is_section8 = FALSE,
  is_manager = TRUE
WHERE unit_number = '202' AND project_id = 17;

-- Unit 203: 1BR/1BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1700.00,
  current_rent_psf = 2.27,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2022-01-01',
  lease_end_date = '2022-12-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '203' AND project_id = 17;

-- Unit 204: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1988.00,
  current_rent_psf = 2.65,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '204' AND project_id = 17;

-- Unit 205: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '205' AND project_id = 17;

-- Unit 206: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-01-01',
  lease_end_date = '2023-12-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '206' AND project_id = 17;

-- Unit 207: 3BR/2BA Balcony - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA Balcony',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2925.00,
  current_rent_psf = 2.29,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-08-01',
  lease_end_date = '2024-07-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '207' AND project_id = 17;

-- Unit 208: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-03-01',
  lease_end_date = '2024-02-29',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '208' AND project_id = 17;

-- Unit 209: 1BR/1BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1700.00,
  current_rent_psf = 2.27,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2022-03-01',
  lease_end_date = '2023-02-28',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '209' AND project_id = 17;

-- Unit 210: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-10-01',
  lease_end_date = '2024-09-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '210' AND project_id = 17;

-- Unit 211: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '211' AND project_id = 17;

-- Unit 212: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1384.00,
  current_rent_psf = 1.85,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2014-04-01',
  lease_end_date = '2015-03-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '212' AND project_id = 17;

-- Unit 300: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '300' AND project_id = 17;

-- Unit 301: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-09-01',
  lease_end_date = '2024-08-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '301' AND project_id = 17;

-- Unit 302: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '302' AND project_id = 17;

-- Unit 303: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-10-01',
  lease_end_date = '2024-09-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '303' AND project_id = 17;

-- Unit 304: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2625.00,
  current_rent_psf = 2.05,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-09-01',
  lease_end_date = '2024-08-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '304' AND project_id = 17;

-- Unit 305: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '305' AND project_id = 17;

-- Unit 306: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2605.00,
  current_rent_psf = 2.52,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '306' AND project_id = 17;

-- Unit 307: 2BR/2BA XL Patio - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA XL Patio',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2588.00,
  current_rent_psf = 2.5,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '307' AND project_id = 17;

-- Unit 308: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2925.00,
  current_rent_psf = 2.29,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-08-01',
  lease_end_date = '2024-07-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '308' AND project_id = 17;

-- Unit 309: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '309' AND project_id = 17;

-- Unit 310: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2155.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2018-10-01',
  lease_end_date = '2019-09-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '310' AND project_id = 17;

-- Unit 311: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '311' AND project_id = 17;

-- Unit 312: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2900.00,
  current_rent_psf = 2.27,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-10-01',
  lease_end_date = '2024-09-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '312' AND project_id = 17;

-- Unit 313: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '313' AND project_id = 17;

-- Unit 314: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-10-01',
  lease_end_date = '2024-09-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '314' AND project_id = 17;

-- Unit 315: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-08-01',
  lease_end_date = '2024-07-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '315' AND project_id = 17;

-- Unit 316: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2605.00,
  current_rent_psf = 2.52,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-08-01',
  lease_end_date = '2024-07-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '316' AND project_id = 17;

-- Unit 317: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-09-01',
  lease_end_date = '2024-08-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '317' AND project_id = 17;

-- Unit 318: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-09-01',
  lease_end_date = '2024-08-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '318' AND project_id = 17;

-- Unit 400: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '400' AND project_id = 17;

-- Unit 401: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-08-01',
  lease_end_date = '2024-07-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '401' AND project_id = 17;

-- Unit 402: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '402' AND project_id = 17;

-- Unit 403: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-09-01',
  lease_end_date = '2024-08-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '403' AND project_id = 17;

-- Unit 404: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2625.00,
  current_rent_psf = 2.05,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-08-01',
  lease_end_date = '2024-07-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '404' AND project_id = 17;

-- Unit 405: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '405' AND project_id = 17;

-- Unit 406: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2605.00,
  current_rent_psf = 2.52,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '406' AND project_id = 17;

-- Unit 407: 2BR/2BA XL Patio - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA XL Patio',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2588.00,
  current_rent_psf = 2.5,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '407' AND project_id = 17;

-- Unit 408: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2925.00,
  current_rent_psf = 2.29,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '408' AND project_id = 17;

-- Unit 409: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '409' AND project_id = 17;

-- Unit 410: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2155.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2018-09-01',
  lease_end_date = '2019-08-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '410' AND project_id = 17;

-- Unit 411: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '411' AND project_id = 17;

-- Unit 412: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2900.00,
  current_rent_psf = 2.27,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-09-01',
  lease_end_date = '2024-08-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '412' AND project_id = 17;

-- Unit 413: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '413' AND project_id = 17;

-- Unit 414: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-09-01',
  lease_end_date = '2024-08-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '414' AND project_id = 17;

-- Unit 415: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '415' AND project_id = 17;

-- Unit 416: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2605.00,
  current_rent_psf = 2.52,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '416' AND project_id = 17;

-- Unit 417: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-08-01',
  lease_end_date = '2024-07-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '417' AND project_id = 17;

-- Unit 418: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-08-01',
  lease_end_date = '2024-07-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '418' AND project_id = 17;

-- Unit 500: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '500' AND project_id = 17;

-- Unit 501: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '501' AND project_id = 17;

-- Unit 502: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '502' AND project_id = 17;

-- Unit 503: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-08-01',
  lease_end_date = '2024-07-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '503' AND project_id = 17;

-- Unit 504: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2625.00,
  current_rent_psf = 2.05,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '504' AND project_id = 17;

-- Unit 505: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '505' AND project_id = 17;

-- Unit 506: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2605.00,
  current_rent_psf = 2.52,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '506' AND project_id = 17;

-- Unit 507: 2BR/2BA XL Patio - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA XL Patio',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2588.00,
  current_rent_psf = 2.5,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '507' AND project_id = 17;

-- Unit 508: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2925.00,
  current_rent_psf = 2.29,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '508' AND project_id = 17;

-- Unit 509: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '509' AND project_id = 17;

-- Unit 510: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2155.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2018-08-01',
  lease_end_date = '2019-07-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '510' AND project_id = 17;

-- Unit 511: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '511' AND project_id = 17;

-- Unit 512: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2900.00,
  current_rent_psf = 2.27,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-08-01',
  lease_end_date = '2024-07-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '512' AND project_id = 17;

-- Unit 513: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '513' AND project_id = 17;

-- Unit 514: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-08-01',
  lease_end_date = '2024-07-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '514' AND project_id = 17;

-- Unit 515: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '515' AND project_id = 17;

-- Unit 516: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2605.00,
  current_rent_psf = 2.52,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '516' AND project_id = 17;

-- Unit 517: 2BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2152.00,
  current_rent_psf = 2.08,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '517' AND project_id = 17;

-- Unit 518: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '518' AND project_id = 17;

-- Unit 600: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 1693.00,
  current_rent_psf = 1.64,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2015-08-01',
  lease_end_date = '2016-07-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '600' AND project_id = 17;

-- Unit 601: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 3000.00,
  current_rent_psf = 2.34,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '601' AND project_id = 17;

-- Unit 602: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-07-01',
  lease_end_date = '2024-06-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '602' AND project_id = 17;

-- Unit 603: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2925.00,
  current_rent_psf = 2.29,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '603' AND project_id = 17;

-- Unit 604: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '604' AND project_id = 17;

-- Unit 605: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2920.00,
  current_rent_psf = 2.28,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '605' AND project_id = 17;

-- Unit 606: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '606' AND project_id = 17;

-- Unit 607: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '607' AND project_id = 17;

-- Unit 608: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '608' AND project_id = 17;

-- Unit 609: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-03-01',
  lease_end_date = '2024-02-28',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '609' AND project_id = 17;

-- Unit 610: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '610' AND project_id = 17;

-- Unit 611: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2625.00,
  current_rent_psf = 2.05,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '611' AND project_id = 17;

-- Unit 612: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '612' AND project_id = 17;

-- Unit 613: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '613' AND project_id = 17;

-- Unit 614: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '614' AND project_id = 17;

-- Unit 615: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2925.00,
  current_rent_psf = 2.29,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '615' AND project_id = 17;

-- Unit 616: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-03-01',
  lease_end_date = '2024-02-28',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '616' AND project_id = 17;

-- Unit 617: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-03-01',
  lease_end_date = '2024-02-28',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '617' AND project_id = 17;

-- Unit 618: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-03-01',
  lease_end_date = '2024-02-28',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '618' AND project_id = 17;

-- Unit 700: 2BR/2BA - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '700' AND project_id = 17;

-- Unit 701: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 3000.00,
  current_rent_psf = 2.34,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '701' AND project_id = 17;

-- Unit 702: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-06-01',
  lease_end_date = '2024-05-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '702' AND project_id = 17;

-- Unit 703: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2925.00,
  current_rent_psf = 2.29,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '703' AND project_id = 17;

-- Unit 704: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-05-01',
  lease_end_date = '2024-04-30',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '704' AND project_id = 17;

-- Unit 705: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2920.00,
  current_rent_psf = 2.28,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '705' AND project_id = 17;

-- Unit 706: 1BR/1BA - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '706' AND project_id = 17;

-- Unit 707: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '707' AND project_id = 17;

-- Unit 708: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '708' AND project_id = 17;

-- Unit 709: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-02-01',
  lease_end_date = '2024-01-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '709' AND project_id = 17;

-- Unit 710: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '710' AND project_id = 17;

-- Unit 711: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2625.00,
  current_rent_psf = 2.05,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '711' AND project_id = 17;

-- Unit 712: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-03-01',
  lease_end_date = '2024-02-28',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '712' AND project_id = 17;

-- Unit 713: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 1923.00,
  current_rent_psf = 1.5,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2014-08-01',
  lease_end_date = '2015-07-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '713' AND project_id = 17;

-- Unit 714: 1BR/1BA - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '714' AND project_id = 17;

-- Unit 715: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2925.00,
  current_rent_psf = 2.29,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-03-01',
  lease_end_date = '2024-02-28',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '715' AND project_id = 17;

-- Unit 716: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-02-01',
  lease_end_date = '2024-01-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '716' AND project_id = 17;

-- Unit 717: 3BR/2BA - Occupied (Section 8)
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-02-01',
  lease_end_date = '2024-01-31',
  is_section8 = TRUE,
  is_manager = FALSE
WHERE unit_number = '717' AND project_id = 17;

-- Unit 718: 1BR/1BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'occupied',
  current_rent = 1918.00,
  current_rent_psf = 2.56,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = '2023-02-01',
  lease_end_date = '2024-01-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '718' AND project_id = 17;

-- Unit 800: 2BR/2BA - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '800' AND project_id = 17;

-- Unit 801: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 3000.00,
  current_rent_psf = 2.34,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '801' AND project_id = 17;

-- Unit 802: 1BR/1BA - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '802' AND project_id = 17;

-- Unit 803: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2925.00,
  current_rent_psf = 2.29,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-03-01',
  lease_end_date = '2024-02-28',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '803' AND project_id = 17;

-- Unit 804: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-04-01',
  lease_end_date = '2024-03-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '804' AND project_id = 17;

-- Unit 805: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2920.00,
  current_rent_psf = 2.28,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-03-01',
  lease_end_date = '2024-02-28',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '805' AND project_id = 17;

-- Unit 806: 1BR/1BA - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '806' AND project_id = 17;

-- Unit 807: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2332.00,
  current_rent_psf = 1.82,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-03-01',
  lease_end_date = '2024-02-28',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '807' AND project_id = 17;

-- Unit 808: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-03-01',
  lease_end_date = '2024-02-28',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '808' AND project_id = 17;

-- Unit 809: 3BR/2BA - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '809' AND project_id = 17;

-- Unit 810: 1BR/1BA - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '810' AND project_id = 17;

-- Unit 811: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2625.00,
  current_rent_psf = 2.05,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-03-01',
  lease_end_date = '2024-02-28',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '811' AND project_id = 17;

-- Unit 812: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-02-01',
  lease_end_date = '2024-01-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '812' AND project_id = 17;

-- Unit 813: 3BR/2BA - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '813' AND project_id = 17;

-- Unit 814: 1BR/1BA - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '814' AND project_id = 17;

-- Unit 815: 3BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'occupied',
  current_rent = 2925.00,
  current_rent_psf = 2.29,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = '2023-02-01',
  lease_end_date = '2024-01-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '815' AND project_id = 17;

-- Unit 816: 2BR/2BA - Occupied
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '2BR/2BA',
  bedrooms = 2,
  bathrooms = 2,
  square_feet = 1035,
  occupancy_status = 'occupied',
  current_rent = 2450.00,
  current_rent_psf = 2.37,
  market_rent = 2136.00,
  market_rent_psf = 2.06,
  lease_start_date = '2023-01-01',
  lease_end_date = '2023-12-31',
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '816' AND project_id = 17;

-- Unit 817: 3BR/2BA - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '3BR/2BA',
  bedrooms = 3,
  bathrooms = 2,
  square_feet = 1280,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 2250.00,
  market_rent_psf = 1.76,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '817' AND project_id = 17;

-- Unit 818: 1BR/1BA - Vacant
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '1BR/1BA',
  bedrooms = 1,
  bathrooms = 1,
  square_feet = 750,
  occupancy_status = 'vacant',
  current_rent = NULL,
  current_rent_psf = NULL,
  market_rent = 1624.00,
  market_rent_psf = 2.17,
  lease_start_date = NULL,
  lease_end_date = NULL,
  is_section8 = FALSE,
  is_manager = FALSE
WHERE unit_number = '818' AND project_id = 17;

COMMIT;

-- ===============================================
-- STEP 4: VALIDATION QUERIES
-- ===============================================
-- Run these queries manually after migration to verify data integrity

-- Total unit count
-- SELECT COUNT(*) as total_units FROM landscape.tbl_multifamily_unit WHERE project_id=17;
-- Expected: 115

-- Occupancy breakdown
-- SELECT occupancy_status, COUNT(*) as count
-- FROM landscape.tbl_multifamily_unit WHERE project_id=17
-- GROUP BY occupancy_status
-- ORDER BY occupancy_status;
-- Expected: occupied=102, vacant=11, manager=1, office=1

-- Section 8 count
-- SELECT COUNT(*) as section_8_units FROM landscape.tbl_multifamily_unit
-- WHERE project_id=17 AND is_section8=TRUE;
-- Expected: 42

-- Manager unit count
-- SELECT COUNT(*) as manager_units FROM landscape.tbl_multifamily_unit
-- WHERE project_id=17 AND is_manager=TRUE;
-- Expected: 1 (unit 202)

-- Total monthly rent (occupied units only, excluding manager)
-- SELECT SUM(current_rent) as total_monthly_rent FROM landscape.tbl_multifamily_unit
-- WHERE project_id=17 AND occupancy_status IN ('occupied', 'manager');
-- Expected: ~$448,876 (±$100)

-- SF validation (check for corrupted data)
-- SELECT COUNT(*) as units_with_crazy_sf FROM landscape.tbl_multifamily_unit
-- WHERE project_id=17 AND square_feet > 10000;
-- Expected: 0

-- Unit type distribution
-- SELECT unit_type, COUNT(*) as unit_count
-- FROM landscape.tbl_multifamily_unit
-- WHERE project_id=17
-- GROUP BY unit_type
-- ORDER BY unit_type;
-- Expected counts: 1BR/1BA=22, 2BR/2BA≈53, 3BR/2BA≈33, etc.

-- Rent range validation
-- SELECT
--   bedrooms,
--   MIN(current_rent) as min_rent,
--   MAX(current_rent) as max_rent,
--   AVG(current_rent) as avg_rent
-- FROM landscape.tbl_multifamily_unit
-- WHERE project_id=17 AND occupancy_status='occupied'
-- GROUP BY bedrooms
-- ORDER BY bedrooms;
-- Expected ranges: 1BR $1,384-$1,988, 2BR $1,693-$2,605, 3BR $1,923-$3,000

-- Lease date validation (all occupied should have dates)
-- SELECT COUNT(*) as occupied_without_lease_dates FROM landscape.tbl_multifamily_unit
-- WHERE project_id=17
--   AND occupancy_status='occupied'
--   AND (lease_start_date IS NULL OR lease_end_date IS NULL);
-- Expected: 0

-- ===============================================
-- MIGRATION COMPLETE
-- ===============================================
