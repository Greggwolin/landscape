-- CoStar parity expansion for sales comparables (landscape schema)
-- Idempotent, additive migration script

-- Step 2: Extend Base Table - Transaction Fields
ALTER TABLE landscape.tbl_sales_comparables
    ADD COLUMN IF NOT EXISTS costar_comp_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS price_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS comp_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS sale_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS sale_conditions VARCHAR(100),
    ADD COLUMN IF NOT EXISTS hold_period_months INTEGER,
    ADD COLUMN IF NOT EXISTS days_on_market INTEGER,
    ADD COLUMN IF NOT EXISTS asking_price NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS transfer_tax NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS document_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS escrow_length_days INTEGER,
    ADD COLUMN IF NOT EXISTS percent_leased_at_sale NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS actual_cap_rate NUMERIC(6,4),
    ADD COLUMN IF NOT EXISTS pro_forma_cap_rate NUMERIC(6,4),
    ADD COLUMN IF NOT EXISTS grm NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS gim NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS noi_at_sale NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS gross_income_at_sale NUMERIC(15,2);

-- Step 3: Extend Base Table - Financing Fields
ALTER TABLE landscape.tbl_sales_comparables
    ADD COLUMN IF NOT EXISTS financing_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS financing_lender VARCHAR(255),
    ADD COLUMN IF NOT EXISTS financing_amount NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS financing_rate NUMERIC(6,4),
    ADD COLUMN IF NOT EXISTS financing_term_months INTEGER,
    ADD COLUMN IF NOT EXISTS loan_to_value NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS assumed_financing BOOLEAN DEFAULT FALSE;

-- Step 4: Extend Base Table - Buyer/Seller Fields
ALTER TABLE landscape.tbl_sales_comparables
    ADD COLUMN IF NOT EXISTS recorded_buyer VARCHAR(255),
    ADD COLUMN IF NOT EXISTS true_buyer VARCHAR(255),
    ADD COLUMN IF NOT EXISTS buyer_contact VARCHAR(500),
    ADD COLUMN IF NOT EXISTS buyer_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS recorded_seller VARCHAR(255),
    ADD COLUMN IF NOT EXISTS true_seller VARCHAR(255),
    ADD COLUMN IF NOT EXISTS seller_contact VARCHAR(500),
    ADD COLUMN IF NOT EXISTS seller_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS buyer_broker_company VARCHAR(255),
    ADD COLUMN IF NOT EXISTS buyer_broker_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS buyer_broker_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS listing_broker_company VARCHAR(255),
    ADD COLUMN IF NOT EXISTS listing_broker_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS listing_broker_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS no_broker_deal BOOLEAN DEFAULT FALSE;

-- Step 5: Extend Base Table - Building/Property Fields
ALTER TABLE landscape.tbl_sales_comparables
    ADD COLUMN IF NOT EXISTS property_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS property_subtype VARCHAR(100),
    ADD COLUMN IF NOT EXISTS building_class VARCHAR(10),
    ADD COLUMN IF NOT EXISTS costar_star_rating NUMERIC(2,1),
    ADD COLUMN IF NOT EXISTS location_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS num_buildings INTEGER,
    ADD COLUMN IF NOT EXISTS num_floors INTEGER,
    ADD COLUMN IF NOT EXISTS typical_floor_sf NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS tenancy_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS owner_occupied BOOLEAN,
    ADD COLUMN IF NOT EXISTS avg_unit_size_sf NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS units_per_acre NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS parking_spaces INTEGER,
    ADD COLUMN IF NOT EXISTS parking_ratio NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS parking_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS elevators INTEGER,
    ADD COLUMN IF NOT EXISTS zoning VARCHAR(100),
    ADD COLUMN IF NOT EXISTS construction_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS roof_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS hvac_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS sprinklered BOOLEAN;

-- Step 6: Extend Base Table - Land Fields
ALTER TABLE landscape.tbl_sales_comparables
    ADD COLUMN IF NOT EXISTS land_area_sf NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS land_area_acres NUMERIC(12,4),
    ADD COLUMN IF NOT EXISTS far_allowed NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS far_actual NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS num_parcels INTEGER,
    ADD COLUMN IF NOT EXISTS topography VARCHAR(100),
    ADD COLUMN IF NOT EXISTS utilities_available VARCHAR(255),
    ADD COLUMN IF NOT EXISTS entitlements VARCHAR(500),
    ADD COLUMN IF NOT EXISTS environmental_issues TEXT;

-- Step 7: Extend Base Table - Tax/Assessment Fields
ALTER TABLE landscape.tbl_sales_comparables
    ADD COLUMN IF NOT EXISTS total_assessed_value NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS land_assessed_value NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS improved_assessed_value NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS assessment_year INTEGER,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS tax_per_unit NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS percent_improved NUMERIC(5,2);

-- Step 8: Extend Base Table - Location/Market Fields
ALTER TABLE landscape.tbl_sales_comparables
    ADD COLUMN IF NOT EXISTS metro_market VARCHAR(100),
    ADD COLUMN IF NOT EXISTS submarket VARCHAR(100),
    ADD COLUMN IF NOT EXISTS county VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cbsa VARCHAR(150),
    ADD COLUMN IF NOT EXISTS csa VARCHAR(150),
    ADD COLUMN IF NOT EXISTS dma VARCHAR(150),
    ADD COLUMN IF NOT EXISTS walk_score INTEGER,
    ADD COLUMN IF NOT EXISTS transit_score INTEGER,
    ADD COLUMN IF NOT EXISTS bike_score INTEGER,
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,7);

-- Step 9: Extend Base Table - Verification/Source Fields
ALTER TABLE landscape.tbl_sales_comparables
    ADD COLUMN IF NOT EXISTS data_source VARCHAR(50),
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS verification_source VARCHAR(255),
    ADD COLUMN IF NOT EXISTS verification_date DATE,
    ADD COLUMN IF NOT EXISTS transaction_notes TEXT,
    ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Step 10: Extend Base Table - Portfolio/JSONB Fields
ALTER TABLE landscape.tbl_sales_comparables
    ADD COLUMN IF NOT EXISTS is_portfolio_sale BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS portfolio_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS portfolio_property_count INTEGER,
    ADD COLUMN IF NOT EXISTS price_allocation_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS allocated_price NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS site_amenities JSONB,
    ADD COLUMN IF NOT EXISTS extra_data JSONB,
    ADD COLUMN IF NOT EXISTS raw_import_data JSONB;

-- Step 11: Add Indexes on Base Table
CREATE INDEX IF NOT EXISTS idx_sales_comp_costar_id
    ON landscape.tbl_sales_comparables(costar_comp_id);
CREATE INDEX IF NOT EXISTS idx_sales_comp_property_type
    ON landscape.tbl_sales_comparables(property_type);
CREATE INDEX IF NOT EXISTS idx_sales_comp_submarket
    ON landscape.tbl_sales_comparables(submarket);
CREATE INDEX IF NOT EXISTS idx_sales_comp_sale_date
    ON landscape.tbl_sales_comparables(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_comp_building_class
    ON landscape.tbl_sales_comparables(building_class);
CREATE INDEX IF NOT EXISTS idx_sales_comp_location
    ON landscape.tbl_sales_comparables(latitude, longitude);

-- Step 12: Create Multifamily Unit Mix Table
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_unit_mix (
    unit_mix_id BIGSERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,

    -- Unit Configuration
    bed_count INTEGER,
    bath_count NUMERIC(3,1),
    unit_type VARCHAR(50),

    -- Quantity & Size
    unit_count INTEGER NOT NULL,
    unit_pct NUMERIC(5,2),
    avg_unit_sf NUMERIC(8,2),
    total_sf NUMERIC(12,2),

    -- Rent Data (at time of sale)
    asking_rent_min NUMERIC(10,2),
    asking_rent_max NUMERIC(10,2),
    asking_rent_per_sf_min NUMERIC(8,2),
    asking_rent_per_sf_max NUMERIC(8,2),
    effective_rent_min NUMERIC(10,2),
    effective_rent_max NUMERIC(10,2),
    effective_rent_per_sf_min NUMERIC(8,2),
    effective_rent_per_sf_max NUMERIC(8,2),

    -- Vacancy & Concessions
    vacant_units INTEGER DEFAULT 0,
    concession_pct NUMERIC(5,2),
    monthly_discount NUMERIC(10,2),
    one_time_concession NUMERIC(10,2),

    -- Rent Control
    is_rent_regulated BOOLEAN DEFAULT FALSE,
    rent_type VARCHAR(50),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_unit_mix_comparable
    ON landscape.tbl_sales_comp_unit_mix(comparable_id);
CREATE INDEX IF NOT EXISTS idx_comp_unit_mix_beds
    ON landscape.tbl_sales_comp_unit_mix(bed_count);

-- Step 13: Create Tenant Roster Table (Office/Retail)
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_tenants (
    tenant_id BIGSERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,

    -- Tenant Info
    tenant_name VARCHAR(255) NOT NULL,
    tenant_type VARCHAR(50),
    is_anchor BOOLEAN DEFAULT FALSE,
    credit_rating VARCHAR(20),

    -- Space
    leased_sf NUMERIC(12,2),
    floor_number VARCHAR(50),
    suite_number VARCHAR(50),
    pct_of_building NUMERIC(5,2),

    -- Lease Terms
    lease_start_date DATE,
    lease_expiration_date DATE,
    lease_term_months INTEGER,
    lease_type VARCHAR(50),

    -- Rent
    base_rent_psf NUMERIC(10,2),
    base_rent_annual NUMERIC(15,2),
    expense_stop NUMERIC(10,2),
    ti_allowance_psf NUMERIC(10,2),
    free_rent_months INTEGER,

    -- Options
    renewal_options TEXT,
    expansion_options TEXT,
    termination_options TEXT,

    -- Retail-Specific
    sales_psf NUMERIC(10,2),
    pct_rent_breakpoint NUMERIC(15,2),
    pct_rent_rate NUMERIC(5,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_tenants_comparable
    ON landscape.tbl_sales_comp_tenants(comparable_id);
CREATE INDEX IF NOT EXISTS idx_comp_tenants_expiration
    ON landscape.tbl_sales_comp_tenants(lease_expiration_date);
CREATE INDEX IF NOT EXISTS idx_comp_tenants_anchor
    ON landscape.tbl_sales_comp_tenants(is_anchor) WHERE is_anchor = TRUE;

-- Step 14: Create Sale History Table
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_history (
    history_id BIGSERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,

    sale_date DATE NOT NULL,
    sale_price NUMERIC(15,2),
    price_per_sf NUMERIC(10,2),
    price_per_unit NUMERIC(10,2),

    buyer_name VARCHAR(255),
    seller_name VARCHAR(255),
    sale_type VARCHAR(50),
    document_number VARCHAR(50),

    is_arms_length BOOLEAN DEFAULT TRUE,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_history_comparable
    ON landscape.tbl_sales_comp_history(comparable_id);
CREATE INDEX IF NOT EXISTS idx_comp_history_date
    ON landscape.tbl_sales_comp_history(sale_date DESC);

-- Step 15: Create Industrial-Specific Table
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_industrial (
    industrial_id BIGSERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,

    -- Building Specs
    clear_height_min NUMERIC(6,2),
    clear_height_max NUMERIC(6,2),
    column_spacing VARCHAR(50),

    -- Loading
    dock_doors_exterior INTEGER,
    dock_doors_interior INTEGER,
    drive_in_doors INTEGER,
    rail_doors INTEGER,

    -- Yard/Parking
    trailer_parking_spaces INTEGER,
    auto_parking_spaces INTEGER,
    yard_area_sf NUMERIC(12,2),
    fenced_yard BOOLEAN,

    -- Utilities/Infrastructure
    rail_access BOOLEAN DEFAULT FALSE,
    rail_served BOOLEAN DEFAULT FALSE,
    crane_capacity_tons NUMERIC(8,2),
    crane_count INTEGER,
    power_voltage INTEGER,
    power_amps INTEGER,
    power_phase INTEGER,

    -- Office Component
    office_sf NUMERIC(12,2),
    office_pct NUMERIC(5,2),

    -- Environmental
    environmental_phase1 BOOLEAN,
    environmental_phase2 BOOLEAN,
    environmental_issues TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_comp_industrial UNIQUE (comparable_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_industrial_comparable
    ON landscape.tbl_sales_comp_industrial(comparable_id);

-- Step 16: Create Hospitality-Specific Table
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_hospitality (
    hospitality_id BIGSERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,

    -- Room Count
    total_rooms INTEGER,
    available_rooms INTEGER,
    suites_count INTEGER,

    -- Performance Metrics (at sale or TTM)
    occupancy_rate NUMERIC(5,2),
    adr NUMERIC(10,2),
    revpar NUMERIC(10,2),
    total_revenue NUMERIC(15,2),
    rooms_revenue NUMERIC(15,2),
    fb_revenue NUMERIC(15,2),
    other_revenue NUMERIC(15,2),

    -- Brand/Management
    flag_brand VARCHAR(100),
    franchise_company VARCHAR(255),
    management_company VARCHAR(255),
    chain_scale VARCHAR(50),

    -- Property Details
    meeting_space_sf NUMERIC(12,2),
    restaurant_count INTEGER,
    pool BOOLEAN,
    fitness_center BOOLEAN,
    spa BOOLEAN,

    -- History
    last_renovation_year INTEGER,
    last_pia_year INTEGER,

    -- Agreement Details
    franchise_expiration DATE,
    management_expiration DATE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_comp_hospitality UNIQUE (comparable_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_hospitality_comparable
    ON landscape.tbl_sales_comp_hospitality(comparable_id);
CREATE INDEX IF NOT EXISTS idx_comp_hospitality_brand
    ON landscape.tbl_sales_comp_hospitality(flag_brand);

-- Step 17: Create Land-Specific Table
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_land (
    land_id BIGSERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,

    -- Zoning/Entitlements
    current_zoning VARCHAR(100),
    proposed_zoning VARCHAR(100),
    zoning_description TEXT,
    entitled BOOLEAN DEFAULT FALSE,
    entitlement_status VARCHAR(100),
    approved_uses TEXT,
    approved_density NUMERIC(10,2),
    approved_units INTEGER,
    approved_sf NUMERIC(15,2),
    max_far NUMERIC(6,2),
    max_height_ft NUMERIC(8,2),

    -- Physical
    topography VARCHAR(100),
    shape VARCHAR(50),
    frontage_ft NUMERIC(10,2),
    depth_ft NUMERIC(10,2),
    corner_lot BOOLEAN DEFAULT FALSE,
    flood_zone VARCHAR(50),
    wetlands_pct NUMERIC(5,2),

    -- Utilities
    water_available BOOLEAN,
    sewer_available BOOLEAN,
    gas_available BOOLEAN,
    electric_available BOOLEAN,
    utility_notes TEXT,

    -- Improvements
    existing_improvements TEXT,
    demolition_required BOOLEAN DEFAULT FALSE,
    demolition_cost_estimate NUMERIC(12,2),

    -- Environmental
    phase1_complete BOOLEAN,
    phase2_complete BOOLEAN,
    remediation_required BOOLEAN DEFAULT FALSE,
    remediation_cost_estimate NUMERIC(12,2),

    -- Development Costs
    impact_fees_estimate NUMERIC(12,2),
    offsite_costs_estimate NUMERIC(12,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_comp_land UNIQUE (comparable_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_land_comparable
    ON landscape.tbl_sales_comp_land(comparable_id);
CREATE INDEX IF NOT EXISTS idx_comp_land_entitled
    ON landscape.tbl_sales_comp_land(entitled);

-- Step 18: Create Self-Storage Tables
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_self_storage (
    storage_id BIGSERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,

    -- Unit Count
    total_units INTEGER,
    climate_controlled_units INTEGER,
    non_climate_units INTEGER,
    climate_controlled_pct NUMERIC(5,2),

    -- Size
    total_net_rentable_sf NUMERIC(12,2),
    climate_controlled_sf NUMERIC(12,2),
    avg_unit_size_sf NUMERIC(8,2),

    -- Occupancy & Revenue
    physical_occupancy NUMERIC(5,2),
    economic_occupancy NUMERIC(5,2),
    avg_rent_psf NUMERIC(8,2),
    gross_potential_rent NUMERIC(15,2),

    -- Features
    drive_up_access_pct NUMERIC(5,2),
    elevator_served_pct NUMERIC(5,2),
    rv_boat_parking_spaces INTEGER,
    vehicle_storage_spaces INTEGER,

    -- Operations
    management_type VARCHAR(50),
    brand_flag VARCHAR(100),
    third_party_managed BOOLEAN,

    -- Expansion
    expansion_potential BOOLEAN,
    expansion_units INTEGER,
    expansion_sf NUMERIC(12,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_comp_self_storage UNIQUE (comparable_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_self_storage_comparable
    ON landscape.tbl_sales_comp_self_storage(comparable_id);

-- Storage Unit Mix (child of self-storage)
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_storage_unit_mix (
    unit_mix_id BIGSERIAL PRIMARY KEY,
    storage_comp_id BIGINT NOT NULL REFERENCES landscape.tbl_sales_comp_self_storage(storage_id) ON DELETE CASCADE,

    unit_size_category VARCHAR(50),
    unit_width_ft NUMERIC(6,2),
    unit_depth_ft NUMERIC(6,2),
    unit_sf NUMERIC(8,2),

    unit_count INTEGER,
    climate_controlled BOOLEAN DEFAULT FALSE,
    drive_up_access BOOLEAN DEFAULT FALSE,

    asking_rent NUMERIC(10,2),
    effective_rent NUMERIC(10,2),
    occupancy_pct NUMERIC(5,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storage_unit_mix_parent
    ON landscape.tbl_sales_comp_storage_unit_mix(storage_comp_id);

-- Step 19: Create Specialty Housing Table (Senior/Student)
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_specialty_housing (
    specialty_id BIGSERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,

    housing_type VARCHAR(50) NOT NULL,

    -- Capacity
    total_beds INTEGER,
    total_units INTEGER,
    avg_beds_per_unit NUMERIC(4,2),

    -- Senior Housing Specific
    independent_living_units INTEGER,
    assisted_living_units INTEGER,
    memory_care_units INTEGER,
    skilled_nursing_beds INTEGER,
    license_type VARCHAR(100),

    -- Student Housing Specific
    affiliated_university VARCHAR(255),
    distance_to_campus_miles NUMERIC(6,2),
    by_the_bed_leasing BOOLEAN,
    furnished BOOLEAN,

    -- Performance
    occupancy_rate NUMERIC(5,2),
    avg_monthly_rent NUMERIC(10,2),
    avg_daily_rate NUMERIC(10,2),
    revenue_per_bed NUMERIC(10,2),

    -- Operations
    operator_name VARCHAR(255),
    third_party_managed BOOLEAN,
    medicaid_certified BOOLEAN,
    medicare_certified BOOLEAN,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_comp_specialty_housing UNIQUE (comparable_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_specialty_comparable
    ON landscape.tbl_sales_comp_specialty_housing(comparable_id);
CREATE INDEX IF NOT EXISTS idx_comp_specialty_type
    ON landscape.tbl_sales_comp_specialty_housing(housing_type);

-- Step 20: Create Manufactured Housing Table
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_manufactured (
    manufactured_id BIGSERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,

    -- Pad/Site Count
    total_pads INTEGER,
    occupied_pads INTEGER,
    vacant_pads INTEGER,
    occupancy_rate NUMERIC(5,2),

    -- Ownership Mix
    park_owned_homes INTEGER,
    resident_owned_homes INTEGER,

    -- Revenue
    avg_pad_rent NUMERIC(10,2),
    total_pad_income NUMERIC(15,2),
    home_rental_income NUMERIC(15,2),
    utility_income NUMERIC(15,2),
    other_income NUMERIC(15,2),

    -- Utilities
    water_sewer_type VARCHAR(50),
    utilities_included VARCHAR(255),
    submetered BOOLEAN,

    -- Amenities
    clubhouse BOOLEAN,
    pool BOOLEAN,
    laundry_facility BOOLEAN,
    playground BOOLEAN,

    -- Age Restriction
    all_ages BOOLEAN DEFAULT TRUE,
    senior_community BOOLEAN DEFAULT FALSE,
    min_age INTEGER,

    -- RV Section
    rv_spaces INTEGER,
    rv_avg_rent NUMERIC(10,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_comp_manufactured UNIQUE (comparable_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_manufactured_comparable
    ON landscape.tbl_sales_comp_manufactured(comparable_id);

-- Step 21: Create Retail-Specific Table
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_retail (
    retail_id BIGSERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,

    -- Center Type
    center_type VARCHAR(100),
    anchor_tenant VARCHAR(255),
    shadow_anchor VARCHAR(255),

    -- Size Breakdown
    anchor_sf NUMERIC(12,2),
    junior_anchor_sf NUMERIC(12,2),
    inline_sf NUMERIC(12,2),
    outparcel_count INTEGER,
    outparcel_sf NUMERIC(12,2),

    -- Performance
    anchor_sales_psf NUMERIC(10,2),
    inline_sales_psf NUMERIC(10,2),
    total_sales_psf NUMERIC(10,2),

    -- Lease Structure
    avg_base_rent_psf NUMERIC(10,2),
    avg_cam_psf NUMERIC(10,2),
    avg_all_in_rent_psf NUMERIC(10,2),
    expense_structure VARCHAR(50),

    -- Traffic
    traffic_count INTEGER,
    traffic_count_source VARCHAR(100),

    -- Visibility
    signage_type VARCHAR(100),
    pylon_sign BOOLEAN,
    monument_sign BOOLEAN,
    freeway_visible BOOLEAN,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_comp_retail UNIQUE (comparable_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_retail_comparable
    ON landscape.tbl_sales_comp_retail(comparable_id);
CREATE INDEX IF NOT EXISTS idx_comp_retail_center_type
    ON landscape.tbl_sales_comp_retail(center_type);

-- Step 22: Create Office-Specific Table
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_office (
    office_id BIGSERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,

    -- Building Configuration
    rentable_sf NUMERIC(12,2),
    usable_sf NUMERIC(12,2),
    loss_factor NUMERIC(5,2),
    floor_plate_sf NUMERIC(10,2),

    -- Lease Structure
    avg_base_rent_psf NUMERIC(10,2),
    expense_stop NUMERIC(10,2),
    expense_structure VARCHAR(50),
    avg_ti_psf NUMERIC(10,2),
    avg_free_rent_months NUMERIC(4,1),

    -- Occupancy
    direct_vacancy_pct NUMERIC(5,2),
    sublease_vacancy_pct NUMERIC(5,2),
    total_vacancy_pct NUMERIC(5,2),

    -- WALT (Weighted Average Lease Term)
    walt_years NUMERIC(5,2),

    -- Building Systems
    hvac_type VARCHAR(100),
    life_safety_system VARCHAR(100),
    backup_power BOOLEAN,
    fiber_providers VARCHAR(255),

    -- Parking
    parking_ratio_per_1000 NUMERIC(6,2),
    reserved_spaces INTEGER,
    unreserved_spaces INTEGER,
    monthly_parking_rate NUMERIC(10,2),

    -- Certifications
    leed_certified BOOLEAN,
    leed_level VARCHAR(50),
    energy_star_score INTEGER,
    wired_score VARCHAR(50),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_comp_office UNIQUE (comparable_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_office_comparable
    ON landscape.tbl_sales_comp_office(comparable_id);

-- Step 23: Create Market Conditions Table
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_market_conditions (
    market_id BIGSERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,

    -- As of sale date
    as_of_date DATE,

    -- Submarket Metrics
    submarket_vacancy_rate NUMERIC(5,2),
    submarket_asking_rent NUMERIC(10,2),
    submarket_effective_rent NUMERIC(10,2),
    submarket_absorption_sf NUMERIC(15,2),
    submarket_inventory_sf NUMERIC(15,2),

    -- Metro Metrics
    metro_vacancy_rate NUMERIC(5,2),
    metro_asking_rent NUMERIC(10,2),
    metro_cap_rate_avg NUMERIC(6,4),

    -- Trends
    yoy_rent_growth NUMERIC(6,2),
    yoy_vacancy_change NUMERIC(6,2),

    -- Supply
    under_construction_sf NUMERIC(15,2),
    planned_sf NUMERIC(15,2),

    -- Economic
    unemployment_rate NUMERIC(5,2),
    job_growth_pct NUMERIC(6,2),
    population_growth_pct NUMERIC(6,2),

    source VARCHAR(100),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_comp_market_conditions UNIQUE (comparable_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_market_comparable
    ON landscape.tbl_sales_comp_market_conditions(comparable_id);

-- Step 24: Extend Adjustments Table for Landscaper AI
ALTER TABLE landscape.tbl_sales_comp_adjustments
    ADD COLUMN IF NOT EXISTS landscaper_analysis TEXT,
    ADD COLUMN IF NOT EXISTS user_override_analysis TEXT,
    ADD COLUMN IF NOT EXISTS analysis_inputs JSONB,
    ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
    ADD COLUMN IF NOT EXISTS approved_by INTEGER,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS subject_value VARCHAR(255),
    ADD COLUMN IF NOT EXISTS comp_value VARCHAR(255);

-- Step 25: Create Lookup Tables
CREATE TABLE IF NOT EXISTS landscape.lkp_sale_type (
    code VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INTEGER
);

INSERT INTO landscape.lkp_sale_type (code, display_name, sort_order) VALUES
    ('INVESTMENT', 'Investment Sale', 1),
    ('OWNER_USER', 'Owner-User Sale', 2),
    ('1031_EXCHANGE', '1031 Exchange', 3),
    ('REO', 'REO/Bank Owned', 4),
    ('SHORT_SALE', 'Short Sale', 5),
    ('AUCTION', 'Auction Sale', 6),
    ('PORTFOLIO', 'Portfolio Sale', 7),
    ('SALE_LEASEBACK', 'Sale-Leaseback', 8),
    ('GROUND_LEASE', 'Ground Lease', 9),
    ('ENTITY_TRANSFER', 'Entity/Stock Transfer', 10),
    ('OTHER', 'Other', 99)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS landscape.lkp_price_status (
    code VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    reliability_score INTEGER
);

INSERT INTO landscape.lkp_price_status (code, display_name, reliability_score) VALUES
    ('CONFIRMED', 'Confirmed', 100),
    ('ALLOCATED', 'Allocated (Portfolio)', 70),
    ('ESTIMATED', 'Estimated', 50),
    ('REPORTED', 'Reported (Unverified)', 60),
    ('UNDISCLOSED', 'Undisclosed', 0)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS landscape.lkp_buyer_seller_type (
    code VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    sort_order INTEGER
);

INSERT INTO landscape.lkp_buyer_seller_type (code, display_name, sort_order) VALUES
    ('INDIVIDUAL', 'Individual/Private', 1),
    ('DEVELOPER_LOCAL', 'Developer - Local', 2),
    ('DEVELOPER_REGIONAL', 'Developer - Regional', 3),
    ('DEVELOPER_NATIONAL', 'Developer - National', 4),
    ('INSTITUTIONAL', 'Institutional Investor', 5),
    ('REIT_PUBLIC', 'Public REIT', 6),
    ('REIT_PRIVATE', 'Private REIT', 7),
    ('PENSION_FUND', 'Pension Fund', 8),
    ('LIFE_INSURANCE', 'Life Insurance Company', 9),
    ('FAMILY_OFFICE', 'Family Office', 10),
    ('PRIVATE_EQUITY', 'Private Equity', 11),
    ('FOREIGN_INVESTOR', 'Foreign Investor', 12),
    ('GOVERNMENT', 'Government/Agency', 13),
    ('NONPROFIT', 'Nonprofit/Religious', 14),
    ('BANK_LENDER', 'Bank/Lender', 15),
    ('OTHER', 'Other', 99)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS landscape.lkp_building_class (
    code VARCHAR(10) PRIMARY KEY,
    display_name VARCHAR(50) NOT NULL,
    description TEXT
);

INSERT INTO landscape.lkp_building_class (code, display_name, description) VALUES
    ('A', 'Class A', 'Highest quality, newest, best locations, premium rents'),
    ('A-', 'Class A-', 'High quality, minor deficiencies from Class A'),
    ('B+', 'Class B+', 'Above average quality, well-maintained'),
    ('B', 'Class B', 'Average quality, good condition, fair rents'),
    ('B-', 'Class B-', 'Below average, needs some updates'),
    ('C+', 'Class C+', 'Functional but dated'),
    ('C', 'Class C', 'Older, lower rents, may need renovation'),
    ('C-', 'Class C-', 'Poor condition, significant deferred maintenance'),
    ('D', 'Class D', 'Distressed, major renovation or redevelopment needed')
ON CONFLICT (code) DO NOTHING;

-- Step 26: Create Unified View
CREATE OR REPLACE VIEW landscape.v_sales_comparables_full AS
SELECT
    sc.*,
    -- Multifamily aggregates
    (SELECT COUNT(*) FROM landscape.tbl_sales_comp_unit_mix um WHERE um.comparable_id = sc.comparable_id) AS unit_mix_count,
    (SELECT SUM(unit_count) FROM landscape.tbl_sales_comp_unit_mix um WHERE um.comparable_id = sc.comparable_id) AS total_units_from_mix,
    -- Tenant aggregates
    (SELECT COUNT(*) FROM landscape.tbl_sales_comp_tenants t WHERE t.comparable_id = sc.comparable_id) AS tenant_count,
    (SELECT SUM(leased_sf) FROM landscape.tbl_sales_comp_tenants t WHERE t.comparable_id = sc.comparable_id) AS total_leased_sf,
    -- Sale history count
    (SELECT COUNT(*) FROM landscape.tbl_sales_comp_history h WHERE h.comparable_id = sc.comparable_id) AS prior_sales_count,
    -- Property-type-specific flags
    EXISTS(SELECT 1 FROM landscape.tbl_sales_comp_industrial i WHERE i.comparable_id = sc.comparable_id) AS has_industrial_data,
    EXISTS(SELECT 1 FROM landscape.tbl_sales_comp_hospitality hs WHERE hs.comparable_id = sc.comparable_id) AS has_hospitality_data,
    EXISTS(SELECT 1 FROM landscape.tbl_sales_comp_land l WHERE l.comparable_id = sc.comparable_id) AS has_land_data,
    EXISTS(SELECT 1 FROM landscape.tbl_sales_comp_self_storage ss WHERE ss.comparable_id = sc.comparable_id) AS has_self_storage_data,
    EXISTS(SELECT 1 FROM landscape.tbl_sales_comp_retail r WHERE r.comparable_id = sc.comparable_id) AS has_retail_data,
    EXISTS(SELECT 1 FROM landscape.tbl_sales_comp_office o WHERE o.comparable_id = sc.comparable_id) AS has_office_data,
    EXISTS(SELECT 1 FROM landscape.tbl_sales_comp_specialty_housing sh WHERE sh.comparable_id = sc.comparable_id) AS has_specialty_data,
    EXISTS(SELECT 1 FROM landscape.tbl_sales_comp_manufactured m WHERE m.comparable_id = sc.comparable_id) AS has_manufactured_data
FROM landscape.tbl_sales_comparables sc;
