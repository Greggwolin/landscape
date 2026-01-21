-- Migration 067: Income Property Extension Tables
-- Date: 2026-01-20
-- Status: PENDING
-- Purpose: Create property-type-specific extension tables for ARGUS-grade analysis
-- Part of: Income Property Schema Architecture (Core + Extension pattern)
--
-- Extension Pattern:
-- Core tables (tbl_income_property, tbl_space, tbl_lease) contain universal fields
-- Extension tables contain property-type-specific fields
-- 1:1 relationship via FK to core table PK

-- ============================================================================
-- MULTIFAMILY EXTENSIONS
-- ============================================================================

-- tbl_income_property_mf_ext - Multifamily property extension
CREATE TABLE IF NOT EXISTS landscape.tbl_income_property_mf_ext (
    income_property_id INTEGER PRIMARY KEY
        REFERENCES landscape.tbl_income_property(income_property_id) ON DELETE CASCADE,

    -- Unit Mix Summary
    total_units INTEGER,
    total_bedrooms INTEGER,
    avg_unit_sf NUMERIC(10,2),

    -- Unit Type Breakdown
    studio_count INTEGER DEFAULT 0,
    one_bed_count INTEGER DEFAULT 0,
    two_bed_count INTEGER DEFAULT 0,
    three_bed_count INTEGER DEFAULT 0,
    four_plus_bed_count INTEGER DEFAULT 0,

    -- Amenities (building-level)
    has_pool BOOLEAN DEFAULT FALSE,
    has_fitness_center BOOLEAN DEFAULT FALSE,
    has_clubhouse BOOLEAN DEFAULT FALSE,
    has_business_center BOOLEAN DEFAULT FALSE,
    has_pet_park BOOLEAN DEFAULT FALSE,
    has_ev_charging BOOLEAN DEFAULT FALSE,
    has_package_lockers BOOLEAN DEFAULT FALSE,
    has_controlled_access BOOLEAN DEFAULT FALSE,

    -- Parking
    surface_parking_spaces INTEGER DEFAULT 0,
    covered_parking_spaces INTEGER DEFAULT 0,
    garage_parking_spaces INTEGER DEFAULT 0,
    parking_revenue_monthly NUMERIC(12,2),

    -- Utility Configuration
    utility_billing_type VARCHAR(50), -- RUBS, submetered, owner-paid
    water_metering VARCHAR(50), -- master, individual
    electric_metering VARCHAR(50), -- master, individual
    gas_metering VARCHAR(50), -- master, individual, none

    -- Market Positioning
    class_rating VARCHAR(10), -- A, B, C, D
    repositioning_potential BOOLEAN DEFAULT FALSE,
    value_add_score INTEGER, -- 1-10

    -- Rent Control
    is_rent_controlled BOOLEAN DEFAULT FALSE,
    rent_control_jurisdiction VARCHAR(100),
    allowable_annual_increase_pct NUMERIC(5,2),

    -- Affordable Housing
    has_affordable_units BOOLEAN DEFAULT FALSE,
    affordable_unit_count INTEGER DEFAULT 0,
    lihtc_expiration_date DATE,
    section_8_contract_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tbl_space_mf_ext - Multifamily unit extension (1:1 with tbl_space for MF units)
CREATE TABLE IF NOT EXISTS landscape.tbl_space_mf_ext (
    space_id INTEGER PRIMARY KEY
        REFERENCES landscape.tbl_space(space_id) ON DELETE CASCADE,

    -- Unit Details
    unit_type VARCHAR(50), -- studio, 1BR, 2BR, 2BR+den, etc.
    bedrooms INTEGER,
    bathrooms NUMERIC(3,1),
    half_baths INTEGER DEFAULT 0,

    -- Unit Features
    has_washer_dryer BOOLEAN DEFAULT FALSE,
    washer_dryer_type VARCHAR(20), -- in-unit, hookups, none
    has_dishwasher BOOLEAN DEFAULT FALSE,
    has_fireplace BOOLEAN DEFAULT FALSE,
    has_balcony BOOLEAN DEFAULT FALSE,
    has_patio BOOLEAN DEFAULT FALSE,
    balcony_sf NUMERIC(8,2),

    -- Finishes
    floor_type VARCHAR(50), -- hardwood, vinyl, carpet, tile
    countertop_type VARCHAR(50), -- granite, quartz, laminate
    cabinet_type VARCHAR(50), -- shaker, flat-panel, raised-panel
    appliance_package VARCHAR(50), -- standard, stainless, premium

    -- Views/Location
    view_type VARCHAR(50), -- pool, courtyard, street, city, none
    floor_premium_pct NUMERIC(5,2), -- premium for higher floors
    corner_unit BOOLEAN DEFAULT FALSE,

    -- ARGUS Fields
    market_rent NUMERIC(10,2),
    effective_rent NUMERIC(10,2),
    loss_to_lease NUMERIC(10,2),
    concession_value NUMERIC(10,2),

    -- Renovation Status
    renovation_status VARCHAR(50), -- classic, partial, full
    last_renovation_date DATE,
    renovation_cost NUMERIC(12,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tbl_lease_mf_ext - Multifamily lease extension
CREATE TABLE IF NOT EXISTS landscape.tbl_lease_mf_ext (
    lease_id INTEGER PRIMARY KEY
        REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

    -- Rent Details
    base_rent_monthly NUMERIC(10,2),
    pet_rent_monthly NUMERIC(10,2),
    parking_rent_monthly NUMERIC(10,2),
    storage_rent_monthly NUMERIC(10,2),
    other_rent_monthly NUMERIC(10,2),

    -- Concessions
    move_in_concession NUMERIC(10,2),
    recurring_concession NUMERIC(10,2),
    concession_months INTEGER,
    net_effective_rent NUMERIC(10,2),

    -- Tenant Profile
    household_size INTEGER,
    household_income NUMERIC(12,2),
    income_to_rent_ratio NUMERIC(5,2),

    -- Lease Status
    mtm_rate_premium_pct NUMERIC(5,2), -- month-to-month premium
    renewal_probability_pct NUMERIC(5,2),

    -- Affordable Housing
    is_affordable_unit BOOLEAN DEFAULT FALSE,
    ami_percentage INTEGER, -- 30%, 50%, 60%, 80%
    voucher_type VARCHAR(50), -- Section 8, VASH, etc.
    voucher_amount NUMERIC(10,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RETAIL EXTENSIONS
-- ============================================================================

-- tbl_income_property_ret_ext - Retail property extension
CREATE TABLE IF NOT EXISTS landscape.tbl_income_property_ret_ext (
    income_property_id INTEGER PRIMARY KEY
        REFERENCES landscape.tbl_income_property(income_property_id) ON DELETE CASCADE,

    -- Property Configuration
    retail_type VARCHAR(50), -- strip, neighborhood, community, regional, power
    anchor_count INTEGER DEFAULT 0,
    junior_anchor_count INTEGER DEFAULT 0,
    inline_shop_count INTEGER,
    pad_site_count INTEGER DEFAULT 0,
    outparcel_count INTEGER DEFAULT 0,

    -- Traffic & Access
    daily_traffic_count INTEGER,
    traffic_count_date DATE,
    signalized_intersection BOOLEAN DEFAULT FALSE,
    highway_visibility BOOLEAN DEFAULT FALSE,
    pylon_sign BOOLEAN DEFAULT FALSE,
    monument_sign BOOLEAN DEFAULT FALSE,

    -- Demographics
    population_1_mile INTEGER,
    population_3_mile INTEGER,
    population_5_mile INTEGER,
    median_hh_income_3_mile NUMERIC(12,2),
    daytime_population_3_mile INTEGER,

    -- Parking
    parking_ratio NUMERIC(5,2), -- spaces per 1000 SF
    surface_parking_spaces INTEGER,
    structured_parking_spaces INTEGER,
    parking_field_condition VARCHAR(50),

    -- Tenant Mix
    national_tenant_pct NUMERIC(5,2),
    regional_tenant_pct NUMERIC(5,2),
    local_tenant_pct NUMERIC(5,2),
    food_tenant_pct NUMERIC(5,2),
    service_tenant_pct NUMERIC(5,2),

    -- Financial Metrics
    sales_psf_inline NUMERIC(10,2),
    sales_psf_anchor NUMERIC(10,2),
    occupancy_cost_ratio NUMERIC(5,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tbl_space_ret_ext - Retail space extension
CREATE TABLE IF NOT EXISTS landscape.tbl_space_ret_ext (
    space_id INTEGER PRIMARY KEY
        REFERENCES landscape.tbl_space(space_id) ON DELETE CASCADE,

    -- Space Classification
    retail_space_type VARCHAR(50), -- anchor, junior-anchor, inline, pad, outparcel, kiosk
    tenant_category VARCHAR(50), -- grocery, drug, apparel, restaurant, service, etc.

    -- Physical Characteristics
    frontage_ft NUMERIC(8,2),
    depth_ft NUMERIC(8,2),
    storefront_ft NUMERIC(8,2),
    corner_location BOOLEAN DEFAULT FALSE,
    end_cap BOOLEAN DEFAULT FALSE,

    -- Utilities & Infrastructure
    grease_trap BOOLEAN DEFAULT FALSE,
    hood_system BOOLEAN DEFAULT FALSE,
    walk_in_cooler BOOLEAN DEFAULT FALSE,
    drive_thru BOOLEAN DEFAULT FALSE,
    patio_sf NUMERIC(8,2),

    -- Visibility
    visibility_score INTEGER, -- 1-10
    highway_frontage BOOLEAN DEFAULT FALSE,
    main_entrance_proximity BOOLEAN DEFAULT FALSE,

    -- Sales Performance
    reported_sales NUMERIC(14,2),
    sales_reporting_date DATE,
    sales_psf NUMERIC(10,2),
    breakpoint_achieved BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tbl_lease_ret_ext - Retail lease extension
CREATE TABLE IF NOT EXISTS landscape.tbl_lease_ret_ext (
    lease_id INTEGER PRIMARY KEY
        REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

    -- Base Rent Structure
    rent_structure VARCHAR(50), -- NNN, modified-gross, gross, percentage-only

    -- CAM/Expense Recovery
    cam_base_year INTEGER,
    cam_base_amount NUMERIC(12,2),
    cam_cap_amount NUMERIC(12,2),
    cam_cap_escalation_pct NUMERIC(5,2),
    cam_controllable_cap BOOLEAN DEFAULT FALSE,
    admin_fee_pct NUMERIC(5,2),

    -- Real Estate Tax Recovery
    tax_base_year INTEGER,
    tax_base_amount NUMERIC(12,2),
    tax_cap_amount NUMERIC(12,2),

    -- Insurance Recovery
    insurance_base_year INTEGER,
    insurance_base_amount NUMERIC(12,2),

    -- Percentage Rent
    natural_breakpoint BOOLEAN DEFAULT FALSE,
    artificial_breakpoint BOOLEAN DEFAULT FALSE,
    breakpoint_amount NUMERIC(14,2),
    percentage_rate NUMERIC(5,2),
    percentage_rent_exclusions TEXT,

    -- Co-Tenancy
    opening_co_tenancy TEXT,
    operating_co_tenancy TEXT,
    co_tenancy_remedy VARCHAR(50), -- rent reduction, termination, both
    rent_reduction_pct NUMERIC(5,2),

    -- Exclusive Use
    exclusive_use_clause TEXT,
    exclusive_radius_miles NUMERIC(5,2),

    -- Kick-Out Rights
    kick_out_date DATE,
    kick_out_sales_threshold NUMERIC(14,2),

    -- Assignment/Subletting
    assignment_fee NUMERIC(10,2),
    subletting_allowed BOOLEAN DEFAULT FALSE,
    profit_sharing_pct NUMERIC(5,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDUSTRIAL EXTENSIONS
-- ============================================================================

-- tbl_income_property_ind_ext - Industrial property extension
CREATE TABLE IF NOT EXISTS landscape.tbl_income_property_ind_ext (
    income_property_id INTEGER PRIMARY KEY
        REFERENCES landscape.tbl_income_property(income_property_id) ON DELETE CASCADE,

    -- Property Classification
    industrial_type VARCHAR(50), -- warehouse, distribution, manufacturing, flex, cold-storage
    building_class VARCHAR(10), -- A, B, C

    -- Building Specifications
    clear_height_ft NUMERIC(6,2),
    min_clear_height_ft NUMERIC(6,2),
    column_spacing VARCHAR(50), -- e.g., "50x50"
    floor_thickness_inches NUMERIC(4,1),
    floor_load_psf NUMERIC(8,2),

    -- Dock Configuration
    dock_high_doors INTEGER DEFAULT 0,
    grade_level_doors INTEGER DEFAULT 0,
    drive_in_doors INTEGER DEFAULT 0,
    dock_door_ratio NUMERIC(8,4), -- doors per 10,000 SF
    dock_levelers INTEGER DEFAULT 0,
    dock_seals INTEGER DEFAULT 0,

    -- Truck Court
    truck_court_depth_ft NUMERIC(8,2),
    trailer_parking_spaces INTEGER DEFAULT 0,
    auto_parking_spaces INTEGER DEFAULT 0,
    secured_truck_yard BOOLEAN DEFAULT FALSE,

    -- Power & Utilities
    electrical_service VARCHAR(50), -- e.g., "3000A, 480V/277V, 3-phase"
    electrical_amps INTEGER,
    electrical_volts INTEGER,
    backup_generator BOOLEAN DEFAULT FALSE,
    generator_kw INTEGER,

    -- Fire Protection
    sprinkler_system VARCHAR(50), -- ESFR, in-rack, wet, dry
    sprinkler_density VARCHAR(50), -- e.g., "0.45 GPM/SF over 2000 SF"
    fire_pump BOOLEAN DEFAULT FALSE,
    fire_pump_gpm INTEGER,

    -- HVAC
    hvac_type VARCHAR(50), -- none, warehouse-only, full-climate
    office_hvac_tons INTEGER,
    warehouse_hvac_tons INTEGER,

    -- Rail
    rail_served BOOLEAN DEFAULT FALSE,
    rail_car_capacity INTEGER,
    rail_siding_ft NUMERIC(8,2),

    -- Environmental
    phase_1_date DATE,
    phase_2_required BOOLEAN DEFAULT FALSE,
    environmental_issues TEXT,

    -- Food/Pharma Grade
    food_grade BOOLEAN DEFAULT FALSE,
    pharma_grade BOOLEAN DEFAULT FALSE,
    temperature_controlled BOOLEAN DEFAULT FALSE,
    temperature_zones INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tbl_space_ind_ext - Industrial space extension
CREATE TABLE IF NOT EXISTS landscape.tbl_space_ind_ext (
    space_id INTEGER PRIMARY KEY
        REFERENCES landscape.tbl_space(space_id) ON DELETE CASCADE,

    -- Space Breakdown
    warehouse_sf NUMERIC(12,2),
    office_sf NUMERIC(10,2),
    mezzanine_sf NUMERIC(10,2),
    outdoor_storage_sf NUMERIC(10,2),

    -- Office Finish
    office_finish_level VARCHAR(50), -- shell, spec, build-to-suit
    office_ratio_pct NUMERIC(5,2),

    -- Dock Access
    dedicated_docks INTEGER DEFAULT 0,
    shared_dock_access BOOLEAN DEFAULT FALSE,

    -- Power
    dedicated_electrical BOOLEAN DEFAULT FALSE,
    electrical_amps INTEGER,

    -- Improvements
    rack_system BOOLEAN DEFAULT FALSE,
    rack_value NUMERIC(12,2),
    crane_system BOOLEAN DEFAULT FALSE,
    crane_capacity_tons NUMERIC(8,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tbl_lease_ind_ext - Industrial lease extension
CREATE TABLE IF NOT EXISTS landscape.tbl_lease_ind_ext (
    lease_id INTEGER PRIMARY KEY
        REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

    -- Rent Structure
    rent_structure VARCHAR(50), -- NNN, modified-NNN, gross-industrial

    -- CAM Components
    cam_includes_roof BOOLEAN DEFAULT TRUE,
    cam_includes_structure BOOLEAN DEFAULT TRUE,
    cam_includes_parking BOOLEAN DEFAULT TRUE,
    management_fee_pct NUMERIC(5,2),

    -- Tenant Improvements
    landlord_ti_allowance NUMERIC(12,2),
    landlord_ti_psf NUMERIC(8,2),
    tenant_ti_investment NUMERIC(12,2),

    -- Building-Specific
    clear_height_requirement_ft NUMERIC(6,2),
    dock_requirement INTEGER,
    power_requirement_amps INTEGER,

    -- Operations
    operating_hours VARCHAR(100),
    hazmat_use BOOLEAN DEFAULT FALSE,
    hazmat_description TEXT,

    -- Expansion/Contraction
    expansion_option_sf NUMERIC(10,2),
    expansion_option_rent_psf NUMERIC(8,2),
    contraction_option BOOLEAN DEFAULT FALSE,
    contraction_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR EXTENSION TABLES
-- ============================================================================

-- Multifamily indexes
CREATE INDEX IF NOT EXISTS idx_income_property_mf_class
    ON landscape.tbl_income_property_mf_ext(class_rating);

CREATE INDEX IF NOT EXISTS idx_space_mf_unit_type
    ON landscape.tbl_space_mf_ext(unit_type);

CREATE INDEX IF NOT EXISTS idx_space_mf_market_rent
    ON landscape.tbl_space_mf_ext(market_rent);

-- Retail indexes
CREATE INDEX IF NOT EXISTS idx_income_property_ret_type
    ON landscape.tbl_income_property_ret_ext(retail_type);

CREATE INDEX IF NOT EXISTS idx_space_ret_type
    ON landscape.tbl_space_ret_ext(retail_space_type);

CREATE INDEX IF NOT EXISTS idx_lease_ret_structure
    ON landscape.tbl_lease_ret_ext(rent_structure);

-- Industrial indexes
CREATE INDEX IF NOT EXISTS idx_income_property_ind_type
    ON landscape.tbl_income_property_ind_ext(industrial_type);

CREATE INDEX IF NOT EXISTS idx_income_property_ind_clear_height
    ON landscape.tbl_income_property_ind_ext(clear_height_ft);

CREATE INDEX IF NOT EXISTS idx_space_ind_warehouse_sf
    ON landscape.tbl_space_ind_ext(warehouse_sf);

-- ============================================================================
-- VALIDATION QUERY
-- ============================================================================

/*
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns c
     WHERE c.table_name = t.table_name AND c.table_schema = 'landscape') as column_count
FROM information_schema.tables t
WHERE table_schema = 'landscape'
AND table_name LIKE 'tbl_%_ext'
ORDER BY table_name;
*/

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================

/*
-- Drop all extension tables (order doesn't matter, no inter-dependencies)
DROP TABLE IF EXISTS landscape.tbl_income_property_mf_ext;
DROP TABLE IF EXISTS landscape.tbl_space_mf_ext;
DROP TABLE IF EXISTS landscape.tbl_lease_mf_ext;

DROP TABLE IF EXISTS landscape.tbl_income_property_ret_ext;
DROP TABLE IF EXISTS landscape.tbl_space_ret_ext;
DROP TABLE IF EXISTS landscape.tbl_lease_ret_ext;

DROP TABLE IF EXISTS landscape.tbl_income_property_ind_ext;
DROP TABLE IF EXISTS landscape.tbl_space_ind_ext;
DROP TABLE IF EXISTS landscape.tbl_lease_ind_ext;
*/
