-- ===============================================
-- MIGRATION: 011_create_chadron_units.sql
-- PURPOSE: Create 115 unit records for 14105 Chadron Ave (project_id=17)
-- DATE: 2025-10-24
-- ===============================================

BEGIN;

-- Delete any existing units for this project to start fresh
DELETE FROM landscape.tbl_multifamily_unit WHERE project_id = 17;

-- Create 115 unit records
-- Building 100 (Commercial)
INSERT INTO landscape.tbl_multifamily_unit (project_id, unit_number, building_name, unit_type, bedrooms, bathrooms, square_feet, market_rent, created_at, updated_at)
VALUES
(17, '100', 'Building 100', 'Unknown', 0, 0, 0, 0, NOW(), NOW()),
(17, '101', 'Building 100', 'Unknown', 0, 0, 0, 0, NOW(), NOW());

-- Building 200
INSERT INTO landscape.tbl_multifamily_unit (project_id, unit_number, building_name, unit_type, bedrooms, bathrooms, square_feet, market_rent, created_at, updated_at)
SELECT 17, '2' || LPAD(n::text, 2, '0'), 'Building 200', 'Unknown', 0, 0, 0, 0, NOW(), NOW()
FROM generate_series(0, 12) n;

-- Building 300
INSERT INTO landscape.tbl_multifamily_unit (project_id, unit_number, building_name, unit_type, bedrooms, bathrooms, square_feet, market_rent, created_at, updated_at)
SELECT 17, '3' || LPAD(n::text, 2, '0'), 'Building 300', 'Unknown', 0, 0, 0, 0, NOW(), NOW()
FROM generate_series(0, 18) n;

-- Building 400
INSERT INTO landscape.tbl_multifamily_unit (project_id, unit_number, building_name, unit_type, bedrooms, bathrooms, square_feet, market_rent, created_at, updated_at)
SELECT 17, '4' || LPAD(n::text, 2, '0'), 'Building 400', 'Unknown', 0, 0, 0, 0, NOW(), NOW()
FROM generate_series(0, 18) n;

-- Building 500
INSERT INTO landscape.tbl_multifamily_unit (project_id, unit_number, building_name, unit_type, bedrooms, bathrooms, square_feet, market_rent, created_at, updated_at)
SELECT 17, '5' || LPAD(n::text, 2, '0'), 'Building 500', 'Unknown', 0, 0, 0, 0, NOW(), NOW()
FROM generate_series(0, 18) n;

-- Building 600
INSERT INTO landscape.tbl_multifamily_unit (project_id, unit_number, building_name, unit_type, bedrooms, bathrooms, square_feet, market_rent, created_at, updated_at)
SELECT 17, '6' || LPAD(n::text, 2, '0'), 'Building 600', 'Unknown', 0, 0, 0, 0, NOW(), NOW()
FROM generate_series(0, 18) n;

-- Building 700
INSERT INTO landscape.tbl_multifamily_unit (project_id, unit_number, building_name, unit_type, bedrooms, bathrooms, square_feet, market_rent, created_at, updated_at)
SELECT 17, '7' || LPAD(n::text, 2, '0'), 'Building 700', 'Unknown', 0, 0, 0, 0, NOW(), NOW()
FROM generate_series(0, 18) n;

-- Building 800
INSERT INTO landscape.tbl_multifamily_unit (project_id, unit_number, building_name, unit_type, bedrooms, bathrooms, square_feet, market_rent, created_at, updated_at)
SELECT 17, '8' || LPAD(n::text, 2, '0'), 'Building 800', 'Unknown', 0, 0, 0, 0, NOW(), NOW()
FROM generate_series(0, 18) n;

COMMIT;

-- Validate
SELECT COUNT(*) as total_units FROM landscape.tbl_multifamily_unit WHERE project_id=17;
