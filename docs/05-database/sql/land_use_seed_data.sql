-- Land Use Management Seed Data
-- Default families, subtypes, and land use codes with programming

-- Insert Land Use Families
INSERT INTO landscape.lu_family (name, ord, active, notes) VALUES
('Residential', 1, TRUE, 'All residential development types'),
('Commercial', 2, TRUE, 'Office, retail, and service commercial uses'),
('Industrial', 3, TRUE, 'Manufacturing, warehouse, and distribution uses'),
('Mixed Use', 4, TRUE, 'Combined residential and commercial developments'),
('Civic/Institutional', 5, TRUE, 'Public, educational, and institutional uses'),
('Recreation', 6, TRUE, 'Parks, recreation, and open space uses')
ON CONFLICT (name) DO NOTHING;

-- Insert Residential Subtypes
INSERT INTO landscape.lu_subtype (family_id, code, name, ord, active, notes) VALUES
((SELECT family_id FROM landscape.lu_family WHERE name = 'Residential'), 'LDR', 'Low Density Residential', 1, TRUE, '3-6 dwelling units per acre'),
((SELECT family_id FROM landscape.lu_family WHERE name = 'Residential'), 'MDR', 'Medium Density Residential', 2, TRUE, '7-12 dwelling units per acre'),
((SELECT family_id FROM landscape.lu_family WHERE name = 'Residential'), 'HDR', 'High Density Residential', 3, TRUE, '13-25 dwelling units per acre'),
((SELECT family_id FROM landscape.lu_family WHERE name = 'Residential'), 'MHDR', 'Multi-Family High Density', 4, TRUE, '25+ dwelling units per acre')
ON CONFLICT (family_id, code) DO NOTHING;

-- Insert Commercial Subtypes
INSERT INTO landscape.lu_subtype (family_id, code, name, ord, active, notes) VALUES
((SELECT family_id FROM landscape.lu_family WHERE name = 'Commercial'), 'OFF', 'Office', 1, TRUE, 'General and professional office uses'),
((SELECT family_id FROM landscape.lu_family WHERE name = 'Commercial'), 'RET', 'Retail', 2, TRUE, 'Shopping, restaurants, and consumer services'),
((SELECT family_id FROM landscape.lu_family WHERE name = 'Commercial'), 'HOSP', 'Hospitality', 3, TRUE, 'Hotels, resorts, and lodging'),
((SELECT family_id FROM landscape.lu_family WHERE name = 'Commercial'), 'SVC', 'Service Commercial', 4, TRUE, 'Auto service, repair, and trade services')
ON CONFLICT (family_id, code) DO NOTHING;

-- Insert Industrial Subtypes  
INSERT INTO landscape.lu_subtype (family_id, code, name, ord, active, notes) VALUES
((SELECT family_id FROM landscape.lu_family WHERE name = 'Industrial'), 'LI', 'Light Industrial', 1, TRUE, 'Light manufacturing and assembly'),
((SELECT family_id FROM landscape.lu_family WHERE name = 'Industrial'), 'WHD', 'Warehouse/Distribution', 2, TRUE, 'Storage and distribution facilities'),
((SELECT family_id FROM landscape.lu_family WHERE name = 'Industrial'), 'FLX', 'Flex Industrial', 3, TRUE, 'Flexible industrial/office space'),
((SELECT family_id FROM landscape.lu_family WHERE name = 'Industrial'), 'DATA', 'Data Center', 4, TRUE, 'Data centers and telecommunications')
ON CONFLICT (family_id, code) DO NOTHING;

-- Insert Land Use Codes for Residential
INSERT INTO landscape.tbl_landuse (subtype_id, landuse_code, landuse_type, name, description, active) VALUES
((SELECT subtype_id FROM landscape.lu_subtype WHERE code = 'LDR'), 'SFD', 'Single Family Detached', 'Single Family Detached', 'Traditional single family homes on individual lots', TRUE),
((SELECT subtype_id FROM landscape.lu_subtype WHERE code = 'MDR'), 'SFA', 'Single Family Attached', 'Single Family Attached', 'Townhomes and duplexes', TRUE),
((SELECT subtype_id FROM landscape.lu_subtype WHERE code = 'HDR'), 'TH', 'Townhomes', 'Townhomes', 'Attached townhome development', TRUE),
((SELECT subtype_id FROM landscape.lu_subtype WHERE code = 'MHDR'), 'MF', 'Multi-Family', 'Multi-Family Residential', 'Apartment and condominium buildings', TRUE)
ON CONFLICT (landuse_code) DO NOTHING;

-- Insert Land Use Codes for Commercial
INSERT INTO landscape.tbl_landuse (subtype_id, landuse_code, landuse_type, name, description, active) VALUES
((SELECT subtype_id FROM landscape.lu_subtype WHERE code = 'OFF'), 'GOFF', 'General Office', 'General Office', 'Standard office buildings', TRUE),
((SELECT subtype_id FROM landscape.lu_subtype WHERE code = 'OFF'), 'MOFF', 'Medical Office', 'Medical Office', 'Medical and professional office', TRUE),
((SELECT subtype_id FROM landscape.lu_subtype WHERE code = 'RET'), 'SHOP', 'Shopping Center', 'Shopping Center', 'Retail shopping centers', TRUE),
((SELECT subtype_id FROM landscape.lu_subtype WHERE code = 'RET'), 'REST', 'Restaurant', 'Restaurant', 'Restaurants and food service', TRUE),
((SELECT subtype_id FROM landscape.lu_subtype WHERE code = 'HOSP'), 'HOTEL', 'Hotel', 'Hotel', 'Hotels and extended stay', TRUE)
ON CONFLICT (landuse_code) DO NOTHING;

-- Insert Land Use Codes for Industrial
INSERT INTO landscape.tbl_landuse (subtype_id, landuse_code, landuse_type, name, description, active) VALUES
((SELECT subtype_id FROM landscape.lu_subtype WHERE code = 'LI'), 'MFG', 'Light Manufacturing', 'Light Manufacturing', 'Light manufacturing and assembly', TRUE),
((SELECT subtype_id FROM landscape.lu_subtype WHERE code = 'WHD'), 'WARE', 'Warehouse', 'Warehouse', 'Storage and distribution warehouses', TRUE),
((SELECT subtype_id FROM landscape.lu_subtype WHERE code = 'FLX'), 'FLEX', 'Flex Space', 'Flex Space', 'Flexible industrial/office combinations', TRUE)
ON CONFLICT (landuse_code) DO NOTHING;

-- Programming Data for Residential
INSERT INTO landscape.tbl_landuse_program (landuse_code, dwelling_units_per_acre, average_unit_size_sf) VALUES
('SFD', 4.5, 2500),
('SFA', 8.0, 1800),
('TH', 16.0, 1600),
('MF', 35.0, 1100)
ON CONFLICT (landuse_code) DO NOTHING;

-- Programming Data for Commercial
INSERT INTO landscape.tbl_landuse_program (
    landuse_code, rsf_to_gfa_eff, employee_density, floor_plate_efficiency, 
    clear_height_ft, loading_dock_ratio, truck_court_depth_ft
) VALUES
('GOFF', 0.85, 250.0, 0.82, 9.0, 0.0, 0.0),
('MOFF', 0.80, 200.0, 0.78, 10.0, 0.0, 0.0),
('SHOP', 0.88, 400.0, 0.85, 12.0, 1.0, 30.0),
('REST', 0.75, 150.0, 0.70, 10.0, 0.5, 25.0),
('HOTEL', 0.65, 300.0, 0.70, 9.0, 0.2, 20.0)
ON CONFLICT (landuse_code) DO NOTHING;

-- Programming Data for Industrial
INSERT INTO landscape.tbl_landuse_program (
    landuse_code, rsf_to_gfa_eff, employee_density, floor_plate_efficiency,
    clear_height_ft, loading_dock_ratio, truck_court_depth_ft, trailer_parking_ratio
) VALUES
('MFG', 0.90, 500.0, 0.88, 16.0, 2.0, 40.0, 0.5),
('WARE', 0.92, 1000.0, 0.90, 24.0, 4.0, 50.0, 1.0),
('FLEX', 0.85, 400.0, 0.82, 14.0, 1.5, 35.0, 0.3)
ON CONFLICT (landuse_code) DO NOTHING;

-- Zoning Controls for Residential
INSERT INTO landscape.tbl_zoning_control (
    landuse_code, site_coverage_pct, site_far, max_stories, max_height_ft,
    parking_ratio_per1000sf, parking_stall_sf, site_common_area_pct
) VALUES
('SFD', 40.0, 0.6, 3, 35.0, 2000.0, 350.0, 15.0),
('SFA', 50.0, 0.8, 3, 35.0, 1500.0, 320.0, 20.0),
('TH', 60.0, 1.2, 4, 45.0, 1200.0, 300.0, 25.0),
('MF', 70.0, 2.0, 6, 75.0, 1000.0, 280.0, 30.0)
ON CONFLICT (landuse_code) DO NOTHING;

-- Zoning Controls for Commercial
INSERT INTO landscape.tbl_zoning_control (
    landuse_code, site_coverage_pct, site_far, max_stories, max_height_ft,
    parking_ratio_per1000sf, parking_stall_sf, site_common_area_pct
) VALUES
('GOFF', 60.0, 3.0, 12, 150.0, 3.0, 300.0, 10.0),
('MOFF', 50.0, 2.5, 8, 100.0, 4.0, 320.0, 15.0),
('SHOP', 70.0, 1.5, 4, 50.0, 4.5, 280.0, 5.0),
('REST', 60.0, 1.2, 3, 40.0, 8.0, 300.0, 10.0),
('HOTEL', 40.0, 2.0, 10, 120.0, 1.2, 300.0, 20.0)
ON CONFLICT (landuse_code) DO NOTHING;

-- Zoning Controls for Industrial
INSERT INTO landscape.tbl_zoning_control (
    landuse_code, site_coverage_pct, site_far, max_stories, max_height_ft,
    parking_ratio_per1000sf, parking_stall_sf, site_common_area_pct
) VALUES
('MFG', 70.0, 1.0, 3, 40.0, 2.0, 350.0, 5.0),
('WARE', 80.0, 0.6, 2, 35.0, 1.0, 400.0, 5.0),
('FLEX', 65.0, 1.5, 4, 50.0, 2.5, 320.0, 10.0)
ON CONFLICT (landuse_code) DO NOTHING;