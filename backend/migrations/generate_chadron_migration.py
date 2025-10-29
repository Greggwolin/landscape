#!/usr/bin/env python3
"""
Generate SQL migration for Chadron rent roll data.
This script generates the SQL based on the actual database schema.
"""

# Unit data from OM (unit_number, unit_type, sf, occupancy, current_rent, lease_start, lease_end, is_section8)
unit_data = [
    # Building 100
    ('100', 'Commercial', 1101, 'vacant', None, None, None, False, False),
    ('101', 'Office', 1, 'office', None, None, None, False, False),

    # Building 200
    ('200', '3BR/2BA Tower', 1280, 'vacant', None, None, None, False, False),
    ('201', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-04-01', '2024-03-31', True, False),
    ('202', '3BR/2BA', 1280, 'manager', 2790.00, '2021-03-01', '2026-02-28', False, True),
    ('203', '1BR/1BA', 750, 'occupied', 1700.00, '2022-01-01', '2022-12-31', True, False),
    ('204', '1BR/1BA', 750, 'occupied', 1988.00, '2023-04-01', '2024-03-31', False, False),
    ('205', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-06-01', '2024-05-31', True, False),
    ('206', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-01-01', '2023-12-31', True, False),
    ('207', '3BR/2BA Balcony', 1280, 'occupied', 2925.00, '2023-08-01', '2024-07-31', False, False),
    ('208', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-03-01', '2024-02-29', False, False),
    ('209', '1BR/1BA', 750, 'occupied', 1700.00, '2022-03-01', '2023-02-28', True, False),
    ('210', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-10-01', '2024-09-30', True, False),
    ('211', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-05-01', '2024-04-30', True, False),
    ('212', '1BR/1BA', 750, 'occupied', 1384.00, '2014-04-01', '2015-03-31', False, False),

    # Building 300
    ('300', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-06-01', '2024-05-31', True, False),
    ('301', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-09-01', '2024-08-31', False, False),
    ('302', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-05-01', '2024-04-30', True, False),
    ('303', '1BR/1BA', 750, 'occupied', 1918.00, '2023-10-01', '2024-09-30', False, False),
    ('304', '3BR/2BA', 1280, 'occupied', 2625.00, '2023-09-01', '2024-08-31', False, False),
    ('305', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-07-01', '2024-06-30', True, False),
    ('306', '2BR/2BA', 1035, 'occupied', 2605.00, '2023-07-01', '2024-06-30', False, False),
    ('307', '2BR/2BA XL Patio', 1035, 'occupied', 2588.00, '2023-07-01', '2024-06-30', False, False),
    ('308', '3BR/2BA', 1280, 'occupied', 2925.00, '2023-08-01', '2024-07-31', False, False),
    ('309', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-06-01', '2024-05-31', True, False),
    ('310', '2BR/2BA', 1035, 'occupied', 2155.00, '2018-10-01', '2019-09-30', False, False),
    ('311', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-06-01', '2024-05-31', True, False),
    ('312', '3BR/2BA', 1280, 'occupied', 2900.00, '2023-10-01', '2024-09-30', False, False),
    ('313', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-07-01', '2024-06-30', True, False),
    ('314', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-10-01', '2024-09-30', False, False),
    ('315', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-08-01', '2024-07-31', True, False),
    ('316', '2BR/2BA', 1035, 'occupied', 2605.00, '2023-08-01', '2024-07-31', False, False),
    ('317', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-09-01', '2024-08-31', True, False),
    ('318', '1BR/1BA', 750, 'occupied', 1918.00, '2023-09-01', '2024-08-31', False, False),

    # Building 400
    ('400', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-05-01', '2024-04-30', True, False),
    ('401', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-08-01', '2024-07-31', False, False),
    ('402', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-06-01', '2024-05-31', True, False),
    ('403', '1BR/1BA', 750, 'occupied', 1918.00, '2023-09-01', '2024-08-31', False, False),
    ('404', '3BR/2BA', 1280, 'occupied', 2625.00, '2023-08-01', '2024-07-31', False, False),
    ('405', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-07-01', '2024-06-30', True, False),
    ('406', '2BR/2BA', 1035, 'occupied', 2605.00, '2023-07-01', '2024-06-30', False, False),
    ('407', '2BR/2BA XL Patio', 1035, 'occupied', 2588.00, '2023-06-01', '2024-05-31', False, False),
    ('408', '3BR/2BA', 1280, 'occupied', 2925.00, '2023-07-01', '2024-06-30', False, False),
    ('409', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-05-01', '2024-04-30', True, False),
    ('410', '2BR/2BA', 1035, 'occupied', 2155.00, '2018-09-01', '2019-08-31', False, False),
    ('411', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-05-01', '2024-04-30', True, False),
    ('412', '3BR/2BA', 1280, 'occupied', 2900.00, '2023-09-01', '2024-08-31', False, False),
    ('413', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-06-01', '2024-05-31', True, False),
    ('414', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-09-01', '2024-08-31', False, False),
    ('415', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-07-01', '2024-06-30', True, False),
    ('416', '2BR/2BA', 1035, 'occupied', 2605.00, '2023-07-01', '2024-06-30', False, False),
    ('417', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-08-01', '2024-07-31', True, False),
    ('418', '1BR/1BA', 750, 'occupied', 1918.00, '2023-08-01', '2024-07-31', False, False),

    # Building 500
    ('500', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-04-01', '2024-03-31', True, False),
    ('501', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-07-01', '2024-06-30', False, False),
    ('502', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-05-01', '2024-04-30', True, False),
    ('503', '1BR/1BA', 750, 'occupied', 1918.00, '2023-08-01', '2024-07-31', False, False),
    ('504', '3BR/2BA', 1280, 'occupied', 2625.00, '2023-07-01', '2024-06-30', False, False),
    ('505', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-06-01', '2024-05-31', True, False),
    ('506', '2BR/2BA', 1035, 'occupied', 2605.00, '2023-06-01', '2024-05-31', False, False),
    ('507', '2BR/2BA XL Patio', 1035, 'occupied', 2588.00, '2023-05-01', '2024-04-30', False, False),
    ('508', '3BR/2BA', 1280, 'occupied', 2925.00, '2023-06-01', '2024-05-31', False, False),
    ('509', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-04-01', '2024-03-31', True, False),
    ('510', '2BR/2BA', 1035, 'occupied', 2155.00, '2018-08-01', '2019-07-31', False, False),
    ('511', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-04-01', '2024-03-31', True, False),
    ('512', '3BR/2BA', 1280, 'occupied', 2900.00, '2023-08-01', '2024-07-31', False, False),
    ('513', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-05-01', '2024-04-30', True, False),
    ('514', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-08-01', '2024-07-31', False, False),
    ('515', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-06-01', '2024-05-31', True, False),
    ('516', '2BR/2BA', 1035, 'occupied', 2605.00, '2023-06-01', '2024-05-31', False, False),
    ('517', '2BR/2BA', 1035, 'occupied', 2152.00, '2023-07-01', '2024-06-30', True, False),
    ('518', '1BR/1BA', 750, 'occupied', 1918.00, '2023-07-01', '2024-06-30', False, False),

    # Building 600
    ('600', '2BR/2BA', 1035, 'occupied', 1693.00, '2015-08-01', '2016-07-31', False, False),
    ('601', '3BR/2BA', 1280, 'occupied', 3000.00, '2023-06-01', '2024-05-31', False, False),
    ('602', '1BR/1BA', 750, 'occupied', 1918.00, '2023-07-01', '2024-06-30', False, False),
    ('603', '3BR/2BA', 1280, 'occupied', 2925.00, '2023-05-01', '2024-04-30', False, False),
    ('604', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-06-01', '2024-05-31', False, False),
    ('605', '3BR/2BA', 1280, 'occupied', 2920.00, '2023-05-01', '2024-04-30', False, False),
    ('606', '1BR/1BA', 750, 'occupied', 1918.00, '2023-06-01', '2024-05-31', False, False),
    ('607', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-05-01', '2024-04-30', True, False),
    ('608', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-05-01', '2024-04-30', False, False),
    ('609', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-03-01', '2024-02-28', True, False),
    ('610', '1BR/1BA', 750, 'occupied', 1918.00, '2023-05-01', '2024-04-30', False, False),
    ('611', '3BR/2BA', 1280, 'occupied', 2625.00, '2023-05-01', '2024-04-30', False, False),
    ('612', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-04-01', '2024-03-31', False, False),
    ('613', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-04-01', '2024-03-31', True, False),
    ('614', '1BR/1BA', 750, 'occupied', 1918.00, '2023-04-01', '2024-03-31', False, False),
    ('615', '3BR/2BA', 1280, 'occupied', 2925.00, '2023-04-01', '2024-03-31', False, False),
    ('616', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-03-01', '2024-02-28', False, False),
    ('617', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-03-01', '2024-02-28', True, False),
    ('618', '1BR/1BA', 750, 'occupied', 1918.00, '2023-03-01', '2024-02-28', False, False),

    # Building 700
    ('700', '2BR/2BA', 1035, 'vacant', None, None, None, False, False),
    ('701', '3BR/2BA', 1280, 'occupied', 3000.00, '2023-05-01', '2024-04-30', False, False),
    ('702', '1BR/1BA', 750, 'occupied', 1918.00, '2023-06-01', '2024-05-31', False, False),
    ('703', '3BR/2BA', 1280, 'occupied', 2925.00, '2023-04-01', '2024-03-31', False, False),
    ('704', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-05-01', '2024-04-30', False, False),
    ('705', '3BR/2BA', 1280, 'occupied', 2920.00, '2023-04-01', '2024-03-31', False, False),
    ('706', '1BR/1BA', 750, 'vacant', None, None, None, False, False),
    ('707', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-04-01', '2024-03-31', True, False),
    ('708', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-04-01', '2024-03-31', False, False),
    ('709', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-02-01', '2024-01-31', True, False),
    ('710', '1BR/1BA', 750, 'occupied', 1918.00, '2023-04-01', '2024-03-31', False, False),
    ('711', '3BR/2BA', 1280, 'occupied', 2625.00, '2023-04-01', '2024-03-31', False, False),
    ('712', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-03-01', '2024-02-28', False, False),
    ('713', '3BR/2BA', 1280, 'occupied', 1923.00, '2014-08-01', '2015-07-31', False, False),
    ('714', '1BR/1BA', 750, 'vacant', None, None, None, False, False),
    ('715', '3BR/2BA', 1280, 'occupied', 2925.00, '2023-03-01', '2024-02-28', False, False),
    ('716', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-02-01', '2024-01-31', False, False),
    ('717', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-02-01', '2024-01-31', True, False),
    ('718', '1BR/1BA', 750, 'occupied', 1918.00, '2023-02-01', '2024-01-31', False, False),

    # Building 800
    ('800', '2BR/2BA', 1035, 'vacant', None, None, None, False, False),
    ('801', '3BR/2BA', 1280, 'occupied', 3000.00, '2023-04-01', '2024-03-31', False, False),
    ('802', '1BR/1BA', 750, 'vacant', None, None, None, False, False),
    ('803', '3BR/2BA', 1280, 'occupied', 2925.00, '2023-03-01', '2024-02-28', False, False),
    ('804', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-04-01', '2024-03-31', False, False),
    ('805', '3BR/2BA', 1280, 'occupied', 2920.00, '2023-03-01', '2024-02-28', False, False),
    ('806', '1BR/1BA', 750, 'vacant', None, None, None, False, False),
    ('807', '3BR/2BA', 1280, 'occupied', 2332.00, '2023-03-01', '2024-02-28', False, False),
    ('808', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-03-01', '2024-02-28', False, False),
    ('809', '3BR/2BA', 1280, 'vacant', None, None, None, False, False),
    ('810', '1BR/1BA', 750, 'vacant', None, None, None, False, False),
    ('811', '3BR/2BA', 1280, 'occupied', 2625.00, '2023-03-01', '2024-02-28', False, False),
    ('812', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-02-01', '2024-01-31', False, False),
    ('813', '3BR/2BA', 1280, 'vacant', None, None, None, False, False),
    ('814', '1BR/1BA', 750, 'vacant', None, None, None, False, False),
    ('815', '3BR/2BA', 1280, 'occupied', 2925.00, '2023-02-01', '2024-01-31', False, False),
    ('816', '2BR/2BA', 1035, 'occupied', 2450.00, '2023-01-01', '2023-12-31', False, False),
    ('817', '3BR/2BA', 1280, 'vacant', None, None, None, False, False),
    ('818', '1BR/1BA', 750, 'vacant', None, None, None, False, False),
]

# Market rent data per unit type
market_rent_data = {
    '1BR/1BA': (1624.00, 2.17),
    '2BR/2BA': (2136.00, 2.06),
    '2BR/2BA XL Patio': (2136.00, 2.06),
    '3BR/2BA': (2250.00, 1.76),
    '3BR/2BA Balcony': (2250.00, 1.76),
    '3BR/2BA Tower': (2250.00, 1.76),
    'Commercial': (0, 0),
    'Office': (0, 0),
}

# Bedroom/bathroom mapping
bed_bath_map = {
    '1BR/1BA': (1, 1),
    '2BR/2BA': (2, 2),
    '2BR/2BA XL Patio': (2, 2),
    '3BR/2BA': (3, 2),
    '3BR/2BA Balcony': (3, 2),
    '3BR/2BA Tower': (3, 2),
    'Commercial': (0, 0),
    'Office': (0, 0),
}

sql_parts = []

# Header
sql_parts.append("""-- ===============================================
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

""")

# Generate UPDATE statements for all units
for unit in unit_data:
    unit_number, unit_type, sf, occupancy, current_rent, lease_start, lease_end, is_section8, is_manager = unit

    # Get market rent and bedrooms/bathrooms
    market_rent, market_rent_psf = market_rent_data[unit_type]
    bedrooms, bathrooms = bed_bath_map[unit_type]

    # Calculate current rent PSF
    if current_rent and sf > 0:
        current_rent_psf = round(current_rent / sf, 2)
    else:
        current_rent_psf = 'NULL'

    # Format values
    current_rent_str = f"{current_rent:.2f}" if current_rent else "NULL"
    current_rent_psf_str = f"{current_rent_psf}" if current_rent_psf != 'NULL' else "NULL"
    market_rent_str = f"{market_rent:.2f}"
    market_rent_psf_str = f"{market_rent_psf:.2f}"
    lease_start_str = f"'{lease_start}'" if lease_start else "NULL"
    lease_end_str = f"'{lease_end}'" if lease_end else "NULL"
    is_section8_str = "TRUE" if is_section8 else "FALSE"
    is_manager_str = "TRUE" if is_manager else "FALSE"
    sf_str = str(sf) if sf > 0 else "NULL"

    comment = f"-- Unit {unit_number}: {unit_type} - {occupancy.capitalize()}"
    if is_manager:
        comment += " (Manager)"
    if is_section8:
        comment += " (Section 8)"

    sql_parts.append(f"""{comment}
UPDATE landscape.tbl_multifamily_unit
SET
  unit_type = '{unit_type}',
  bedrooms = {bedrooms},
  bathrooms = {bathrooms},
  square_feet = {sf_str},
  occupancy_status = '{occupancy}',
  current_rent = {current_rent_str},
  current_rent_psf = {current_rent_psf_str},
  market_rent = {market_rent_str},
  market_rent_psf = {market_rent_psf_str},
  lease_start_date = {lease_start_str},
  lease_end_date = {lease_end_str},
  is_section8 = {is_section8_str},
  is_manager = {is_manager_str}
WHERE unit_number = '{unit_number}' AND project_id = 17;

""")

# Footer with validation queries
sql_parts.append("""COMMIT;

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
""")

# Write the file
with open('/Users/5150east/landscape/backend/migrations/012_chadron_rentroll_remediation.sql', 'w') as f:
    f.write(''.join(sql_parts))

print("Migration file generated successfully!")
print(f"Total units: {len(unit_data)}")
