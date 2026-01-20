-- ============================================================================
-- Migration: 064_property_attributes_seed.sql
-- Description: Seed Property Attribute Definitions
-- Date: 2026-01-20
--
-- System-defined attributes (~35 total across site and improvement categories)
-- These drive dynamic form rendering and Landscaper extraction
-- ============================================================================

BEGIN;

-- ============================================================================
-- SITE ATTRIBUTES
-- ============================================================================

-- Physical characteristics
INSERT INTO landscape.tbl_property_attribute_def
(category, subcategory, attribute_code, attribute_label, data_type, sort_order, is_system, help_text)
VALUES
('site', 'physical', 'frontage', 'Street Frontage', 'narrative', 10, TRUE,
 'List streets and frontage dimensions (e.g., "Main St: 200 ft, Oak Ave: 150 ft")'),
('site', 'physical', 'corner_lot', 'Corner Lot', 'boolean', 20, TRUE, NULL),
('site', 'physical', 'topography_detail', 'Topography Details', 'narrative', 30, TRUE,
 'Describe grade changes, drainage patterns, usable area'),
('site', 'physical', 'soil_type', 'Soil Type', 'text', 40, TRUE, 'Per geotechnical report if available')
ON CONFLICT (category, attribute_code) DO NOTHING;

-- Utilities
INSERT INTO landscape.tbl_property_attribute_def
(category, subcategory, attribute_code, attribute_label, data_type, options, sort_order, is_system)
VALUES
('site', 'utilities', 'water_provider', 'Water Provider', 'text', NULL, 100, TRUE),
('site', 'utilities', 'water_status', 'Water Status', 'select',
 '[{"value": "available", "label": "Available at Site"}, {"value": "nearby", "label": "Nearby"}, {"value": "none", "label": "Not Available"}]', 101, TRUE),
('site', 'utilities', 'sewer_provider', 'Sewer Provider', 'text', NULL, 110, TRUE),
('site', 'utilities', 'sewer_status', 'Sewer Status', 'select',
 '[{"value": "available", "label": "Available at Site"}, {"value": "nearby", "label": "Nearby"}, {"value": "septic", "label": "Septic Required"}]', 111, TRUE),
('site', 'utilities', 'electric_provider', 'Electric Provider', 'text', NULL, 120, TRUE),
('site', 'utilities', 'gas_provider', 'Gas Provider', 'text', NULL, 130, TRUE),
('site', 'utilities', 'telecom_providers', 'Telecom/Internet', 'text', NULL, 140, TRUE)
ON CONFLICT (category, attribute_code) DO NOTHING;

-- Flood
INSERT INTO landscape.tbl_property_attribute_def
(category, subcategory, attribute_code, attribute_label, data_type, sort_order, is_system, help_text)
VALUES
('site', 'flood', 'fema_map_number', 'FEMA Map Number', 'text', 200, TRUE, 'Panel number from flood map'),
('site', 'flood', 'fema_map_date', 'FEMA Map Date', 'date', 201, TRUE, 'Effective date of flood map'),
('site', 'flood', 'flood_zone_narrative', 'Flood Zone Description', 'narrative', 210, TRUE,
 'Describe flood risk implications')
ON CONFLICT (category, attribute_code) DO NOTHING;

-- Environmental
INSERT INTO landscape.tbl_property_attribute_def
(category, subcategory, attribute_code, attribute_label, data_type, options, sort_order, is_system)
VALUES
('site', 'environmental', 'wetlands_present', 'Wetlands Present', 'boolean', NULL, 300, TRUE),
('site', 'environmental', 'wetlands_narrative', 'Wetlands Description', 'narrative', NULL, 301, TRUE),
('site', 'environmental', 'hazmat_concern', 'Hazardous Materials Concern', 'boolean', NULL, 310, TRUE),
('site', 'environmental', 'hazmat_narrative', 'Hazmat Description', 'narrative', NULL, 311, TRUE),
('site', 'environmental', 'esa_phase', 'ESA Phase', 'select',
 '[{"value": "none", "label": "None"}, {"value": "phase1", "label": "Phase I"}, {"value": "phase2", "label": "Phase II"}]', 320, TRUE)
ON CONFLICT (category, attribute_code) DO NOTHING;


-- ============================================================================
-- IMPROVEMENT ATTRIBUTES
-- ============================================================================

-- Construction
INSERT INTO landscape.tbl_property_attribute_def
(category, subcategory, attribute_code, attribute_label, data_type, options, sort_order, is_system)
VALUES
('improvement', 'construction', 'frame_type', 'Frame Type', 'select',
 '[{"value": "wood", "label": "Wood Frame"}, {"value": "steel", "label": "Steel Frame"}, {"value": "concrete", "label": "Concrete"}, {"value": "masonry", "label": "Masonry"}]', 100, TRUE),
('improvement', 'construction', 'foundation_type', 'Foundation Type', 'select',
 '[{"value": "slab", "label": "Concrete Slab"}, {"value": "crawl", "label": "Crawl Space"}, {"value": "basement", "label": "Basement"}, {"value": "post_tension", "label": "Post-Tension"}]', 110, TRUE),
('improvement', 'construction', 'exterior_walls', 'Exterior Walls', 'text', NULL, 120, TRUE),
('improvement', 'construction', 'roof_type', 'Roof Type', 'select',
 '[{"value": "flat", "label": "Flat"}, {"value": "pitched", "label": "Pitched"}, {"value": "hip", "label": "Hip"}, {"value": "mansard", "label": "Mansard"}]', 130, TRUE),
('improvement', 'construction', 'roof_cover', 'Roof Cover', 'text', NULL, 131, TRUE),
('improvement', 'construction', 'windows', 'Windows', 'text', NULL, 140, TRUE)
ON CONFLICT (category, attribute_code) DO NOTHING;

-- Mechanical
INSERT INTO landscape.tbl_property_attribute_def
(category, subcategory, attribute_code, attribute_label, data_type, options, sort_order, is_system)
VALUES
('improvement', 'mechanical', 'hvac_type', 'HVAC Type', 'select',
 '[{"value": "central", "label": "Central"}, {"value": "split", "label": "Mini-Split"}, {"value": "ptac", "label": "PTAC"}, {"value": "window", "label": "Window Units"}]', 200, TRUE),
('improvement', 'mechanical', 'hvac_age', 'HVAC Age (Years)', 'number', NULL, 201, TRUE),
('improvement', 'mechanical', 'water_heater_type', 'Water Heater', 'select',
 '[{"value": "central", "label": "Central Boiler"}, {"value": "individual_tank", "label": "Individual Tank"}, {"value": "individual_tankless", "label": "Individual Tankless"}]', 210, TRUE),
('improvement', 'mechanical', 'metering', 'Utility Metering', 'select',
 '[{"value": "master", "label": "Master Metered"}, {"value": "individual", "label": "Individually Metered"}, {"value": "rubs", "label": "RUBS"}]', 220, TRUE),
('improvement', 'mechanical', 'fire_protection', 'Fire Protection', 'multiselect',
 '[{"value": "sprinkler", "label": "Sprinklers"}, {"value": "smoke_detectors", "label": "Smoke Detectors"}, {"value": "alarm", "label": "Fire Alarm"}, {"value": "extinguishers", "label": "Fire Extinguishers"}]', 230, TRUE),
('improvement', 'mechanical', 'security', 'Security Features', 'multiselect',
 '[{"value": "gated", "label": "Gated Entry"}, {"value": "cameras", "label": "Security Cameras"}, {"value": "patrol", "label": "Security Patrol"}, {"value": "intercom", "label": "Intercom"}]', 240, TRUE),
('improvement', 'mechanical', 'elevator_count', 'Elevator Count', 'number', NULL, 250, TRUE)
ON CONFLICT (category, attribute_code) DO NOTHING;

-- Amenities (project-level)
INSERT INTO landscape.tbl_property_attribute_def
(category, subcategory, attribute_code, attribute_label, data_type, options, sort_order, is_system)
VALUES
('improvement', 'amenities', 'project_amenities', 'Project Amenities', 'multiselect',
 '[
   {"value": "pool", "label": "Swimming Pool"},
   {"value": "fitness", "label": "Fitness Center"},
   {"value": "clubhouse", "label": "Clubhouse"},
   {"value": "laundry", "label": "Laundry Facility"},
   {"value": "playground", "label": "Playground"},
   {"value": "bbq", "label": "BBQ/Picnic Area"},
   {"value": "dog_park", "label": "Dog Park"},
   {"value": "business_center", "label": "Business Center"},
   {"value": "package_lockers", "label": "Package Lockers"},
   {"value": "covered_parking", "label": "Covered Parking"},
   {"value": "garage", "label": "Garage Parking"},
   {"value": "ev_charging", "label": "EV Charging"}
 ]', 300, TRUE),
('improvement', 'amenities', 'unit_amenities', 'Unit Amenities', 'multiselect',
 '[
   {"value": "washer_dryer", "label": "Washer/Dryer"},
   {"value": "wd_hookups", "label": "W/D Hookups"},
   {"value": "dishwasher", "label": "Dishwasher"},
   {"value": "microwave", "label": "Microwave"},
   {"value": "disposal", "label": "Garbage Disposal"},
   {"value": "ac", "label": "Air Conditioning"},
   {"value": "patio_balcony", "label": "Patio/Balcony"},
   {"value": "storage", "label": "Storage"},
   {"value": "fireplace", "label": "Fireplace"},
   {"value": "hardwood", "label": "Hardwood Floors"},
   {"value": "granite", "label": "Granite Counters"},
   {"value": "stainless", "label": "Stainless Appliances"}
 ]', 310, TRUE)
ON CONFLICT (category, attribute_code) DO NOTHING;

-- Obsolescence (for cost approach)
INSERT INTO landscape.tbl_property_attribute_def
(category, subcategory, attribute_code, attribute_label, data_type, sort_order, is_system, help_text)
VALUES
('improvement', 'obsolescence', 'physical_deterioration', 'Physical Deterioration', 'narrative', 400, TRUE,
 'Describe deferred maintenance, wear and tear, short-lived items needing replacement'),
('improvement', 'obsolescence', 'functional_obsolescence', 'Functional Obsolescence', 'narrative', 410, TRUE,
 'Describe layout issues, outdated features, superadequacies or deficiencies'),
('improvement', 'obsolescence', 'external_obsolescence', 'External Obsolescence', 'narrative', 420, TRUE,
 'Describe market conditions, location factors, or external influences affecting value')
ON CONFLICT (category, attribute_code) DO NOTHING;


COMMIT;


-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run after migration to verify:
--
-- SELECT category, subcategory, COUNT(*) as count
-- FROM landscape.tbl_property_attribute_def
-- GROUP BY category, subcategory
-- ORDER BY category, subcategory;
--
-- Expected output:
-- category    | subcategory    | count
-- ------------|----------------|------
-- improvement | amenities      | 2
-- improvement | construction   | 6
-- improvement | mechanical     | 7
-- improvement | obsolescence   | 3
-- site        | environmental  | 5
-- site        | flood          | 3
-- site        | physical       | 4
-- site        | utilities      | 7
--
-- Total: 37 attributes


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- To roll back this migration:
--
-- DELETE FROM landscape.tbl_property_attribute_def WHERE is_system = TRUE;
