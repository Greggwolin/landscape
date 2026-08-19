-- Migration: Consolidate rent comparable tables
-- Date: 2026-03-08
-- Context: Two duplicate rent comparable tables existed with different code paths.
--   tbl_rental_comparable (23 cols, with latitude/longitude) — used by frontend + update_rental_comps tool
--   tbl_rent_comparable (21 cols, no lat/lng) — used by get/update/delete Landscaper tools + Django model
--
-- Resolution: Rewired all code to tbl_rental_comparable, migrated 57 rows, dropped tbl_rent_comparable.
-- NULL unit_type/bedrooms/bathrooms/avg_sqft/asking_rent/as_of_date filled with defaults.

-- Step 1: Migrate unique rows (already executed)
-- INSERT INTO landscape.tbl_rental_comparable (...)
-- SELECT ... FROM landscape.tbl_rent_comparable rc
-- LEFT JOIN landscape.tbl_rental_comparable rl ON ...
-- WHERE rl.comparable_id IS NULL;

-- Step 2: Drop the dead table (already executed)
DROP TABLE IF EXISTS landscape.tbl_rent_comparable CASCADE;

-- ROLLBACK: Not possible without Neon branch snapshot. Table data was migrated into tbl_rental_comparable.
