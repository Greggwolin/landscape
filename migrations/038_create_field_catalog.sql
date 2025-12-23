-- Migration: 038_create_field_catalog.sql
-- Description: Create field catalog for Landscaper schema awareness
-- Date: 2025-12-20

-- ============================================================================
-- UP Migration
-- ============================================================================

-- Field catalog for Landscaper schema awareness
CREATE TABLE IF NOT EXISTS landscape.tbl_field_catalog (
    field_id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    description TEXT,
    data_type VARCHAR(50) NOT NULL, -- text, integer, numeric, boolean, date, timestamp, jsonb
    is_editable BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    is_calculated BOOLEAN DEFAULT false, -- true for fields like NOI, IRR that are derived
    calculation_source TEXT, -- description of how calculated fields are derived
    valid_values JSONB, -- for enums/dropdowns: ["Value1", "Value2"] or {"lookup_table": "lu_market"}
    default_value TEXT,
    unit_of_measure VARCHAR(50), -- SF, AC, USD, %, etc.
    min_value NUMERIC,
    max_value NUMERIC,
    field_group VARCHAR(100), -- logical grouping: "Location", "Financial", "Timing", etc.
    display_order INTEGER DEFAULT 0,
    applies_to_types TEXT[], -- which project types: {'LAND', 'MF', 'OFF', 'RET', 'IND'}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_name, field_name)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_field_catalog_table ON landscape.tbl_field_catalog(table_name);
CREATE INDEX IF NOT EXISTS idx_field_catalog_group ON landscape.tbl_field_catalog(field_group);
CREATE INDEX IF NOT EXISTS idx_field_catalog_editable ON landscape.tbl_field_catalog(is_editable) WHERE is_editable = true;

-- Add comment
COMMENT ON TABLE landscape.tbl_field_catalog IS 'Master catalog of all editable fields for Landscaper AI assistant';

-- ============================================================================
-- Market Lookup Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.lu_market (
    market_id SERIAL PRIMARY KEY,
    market_code VARCHAR(50) UNIQUE NOT NULL,
    market_name VARCHAR(200) NOT NULL,
    state VARCHAR(2),
    is_active BOOLEAN DEFAULT true
);

-- Seed common markets
INSERT INTO landscape.lu_market (market_code, market_name, state) VALUES
('PHX', 'Phoenix-Mesa-Chandler', 'AZ'),
('LAX', 'Los Angeles-Long Beach-Anaheim', 'CA'),
('SFO', 'San Francisco-Oakland-Berkeley', 'CA'),
('SDG', 'San Diego-Chula Vista-Carlsbad', 'CA'),
('SEA', 'Seattle-Tacoma-Bellevue', 'WA'),
('DEN', 'Denver-Aurora-Lakewood', 'CO'),
('DFW', 'Dallas-Fort Worth-Arlington', 'TX'),
('HOU', 'Houston-The Woodlands-Sugar Land', 'TX'),
('ATL', 'Atlanta-Sandy Springs-Alpharetta', 'GA'),
('MIA', 'Miami-Fort Lauderdale-Pompano Beach', 'FL'),
('NYC', 'New York-Newark-Jersey City', 'NY'),
('CHI', 'Chicago-Naperville-Elgin', 'IL'),
('BOS', 'Boston-Cambridge-Newton', 'MA'),
('WDC', 'Washington-Arlington-Alexandria', 'DC'),
('LVS', 'Las Vegas-Henderson-Paradise', 'NV'),
('POR', 'Portland-Vancouver-Hillsboro', 'OR'),
('AUS', 'Austin-Round Rock-Georgetown', 'TX'),
('NSH', 'Nashville-Davidson-Murfreesboro', 'TN'),
('CLT', 'Charlotte-Concord-Gastonia', 'NC'),
('TPA', 'Tampa-St. Petersburg-Clearwater', 'FL'),
('ORL', 'Orlando-Kissimmee-Sanford', 'FL'),
('SLC', 'Salt Lake City-Ogden', 'UT'),
('MSP', 'Minneapolis-St. Paul-Bloomington', 'MN'),
('RNO', 'Reno-Sparks', 'NV'),
('TUC', 'Tucson', 'AZ'),
('SAC', 'Sacramento-Roseville', 'CA'),
('RIV', 'Riverside-San Bernardino-Ontario', 'CA'),
('SAN', 'San Antonio-New Braunfels', 'TX')
ON CONFLICT (market_code) DO NOTHING;

-- ============================================================================
-- Seed Field Catalog - Core Project Fields
-- ============================================================================

INSERT INTO landscape.tbl_field_catalog (table_name, field_name, display_name, description, data_type, is_editable, is_calculated, valid_values, unit_of_measure, field_group, display_order, applies_to_types) VALUES

-- Basic Info (display_order 1xx)
('tbl_project', 'project_name', 'Project Name', 'Name of the project', 'text', true, false, NULL, NULL, 'Basic Info', 100, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'description', 'Description', 'Project description or notes', 'text', true, false, NULL, NULL, 'Basic Info', 101, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'project_type', 'Project Type', 'Primary project type code', 'text', true, false, '["LAND", "MF", "OFF", "RET", "IND", "HTL", "MXU"]', NULL, 'Basic Info', 102, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'financial_model_type', 'Financial Model Type', 'Type of financial model', 'text', true, false, '["Land Development", "Income Property", "Mixed-Use"]', NULL, 'Basic Info', 103, '{LAND,MF,OFF,RET,IND}'),

-- Location fields (display_order 2xx)
('tbl_project', 'project_address', 'Address', 'Street address of the property', 'text', true, false, NULL, NULL, 'Location', 200, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'street_address', 'Street Address', 'Street address (alternate field)', 'text', true, false, NULL, NULL, 'Location', 201, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'city', 'City', 'City where property is located', 'text', true, false, NULL, NULL, 'Location', 210, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'jurisdiction_city', 'Jurisdiction City', 'City jurisdiction (for permits/zoning)', 'text', true, false, NULL, NULL, 'Location', 211, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'county', 'County', 'County where property is located', 'text', true, false, NULL, NULL, 'Location', 220, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'jurisdiction_county', 'Jurisdiction County', 'County jurisdiction', 'text', true, false, NULL, NULL, 'Location', 221, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'state', 'State', 'State where property is located', 'text', true, false, NULL, NULL, 'Location', 230, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'jurisdiction_state', 'Jurisdiction State', 'State jurisdiction', 'text', true, false, NULL, NULL, 'Location', 231, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'zip_code', 'Zip Code', 'Postal/ZIP code', 'text', true, false, NULL, NULL, 'Location', 240, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'location_lat', 'Latitude', 'GPS latitude coordinate', 'numeric', true, false, NULL, NULL, 'Location', 250, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'location_lon', 'Longitude', 'GPS longitude coordinate', 'numeric', true, false, NULL, NULL, 'Location', 251, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'location_description', 'Location Description', 'Text description of location', 'text', true, false, NULL, NULL, 'Location', 252, '{LAND,MF,OFF,RET,IND}'),

-- Market Geography (display_order 3xx)
('tbl_project', 'market', 'Market', 'MSA/Market area name', 'text', true, false, '{"lookup_table": "lu_market"}', NULL, 'Market', 300, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'submarket', 'Submarket', 'Submarket within MSA', 'text', true, false, NULL, NULL, 'Market', 301, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'market_velocity_annual', 'Market Velocity', 'Annual market absorption rate', 'numeric', true, false, NULL, 'units/year', 'Market', 302, '{LAND,MF}'),

-- Size metrics (display_order 4xx)
('tbl_project', 'acres_gross', 'Gross Acres', 'Total site acreage before deductions', 'numeric', true, false, NULL, 'AC', 'Size', 400, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'target_units', 'Target Units', 'Total planned units', 'integer', true, false, NULL, 'units', 'Size', 410, '{LAND,MF}'),

-- Pricing (display_order 5xx)
('tbl_project', 'price_range_low', 'Price Range Low', 'Low end of price range', 'numeric', true, false, NULL, 'USD', 'Pricing', 500, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'price_range_high', 'Price Range High', 'High end of price range', 'numeric', true, false, NULL, 'USD', 'Pricing', 501, '{LAND,MF,OFF,RET,IND}'),

-- Financial (display_order 6xx)
('tbl_project', 'discount_rate_pct', 'Discount Rate', 'Discount rate for NPV calculations', 'numeric', true, false, NULL, '%', 'Financial', 600, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'cost_of_capital_pct', 'Cost of Capital', 'Weighted average cost of capital', 'numeric', true, false, NULL, '%', 'Financial', 601, '{LAND,MF,OFF,RET,IND}'),

-- Analysis Timing (display_order 7xx)
('tbl_project', 'analysis_start_date', 'Analysis Start Date', 'Start date for financial analysis', 'date', true, false, NULL, NULL, 'Timing', 700, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'analysis_end_date', 'Analysis End Date', 'End date for financial analysis', 'date', true, false, NULL, NULL, 'Timing', 701, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'calculation_frequency', 'Calculation Frequency', 'Frequency of cash flow calculations', 'text', true, false, '["Monthly", "Quarterly", "Annual"]', NULL, 'Timing', 702, '{LAND,MF,OFF,RET,IND}'),

-- Ownership (display_order 8xx)
('tbl_project', 'legal_owner', 'Legal Owner', 'Legal owner entity name', 'text', true, false, NULL, NULL, 'Ownership', 800, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'developer_owner', 'Developer', 'Developer or sponsor name', 'text', true, false, NULL, NULL, 'Ownership', 801, '{LAND,MF,OFF,RET,IND}'),

-- Status (display_order 9xx)
('tbl_project', 'is_active', 'Is Active', 'Whether project is active', 'boolean', true, false, NULL, NULL, 'Status', 900, '{LAND,MF,OFF,RET,IND}'),

-- Calculated fields (not editable)
('tbl_project', 'noi', 'NOI', 'Net Operating Income - calculated from income less expenses', 'numeric', false, true, NULL, 'USD', 'Calculated', 1000, '{MF,OFF,RET,IND}'),
('tbl_project', 'irr', 'IRR', 'Internal Rate of Return - calculated from cash flows', 'numeric', false, true, NULL, '%', 'Calculated', 1001, '{LAND,MF,OFF,RET,IND}'),
('tbl_project', 'equity_multiple', 'Equity Multiple', 'Total return divided by equity invested', 'numeric', false, true, NULL, 'x', 'Calculated', 1002, '{LAND,MF,OFF,RET,IND}')

ON CONFLICT (table_name, field_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    data_type = EXCLUDED.data_type,
    is_editable = EXCLUDED.is_editable,
    is_calculated = EXCLUDED.is_calculated,
    valid_values = EXCLUDED.valid_values,
    unit_of_measure = EXCLUDED.unit_of_measure,
    field_group = EXCLUDED.field_group,
    display_order = EXCLUDED.display_order,
    applies_to_types = EXCLUDED.applies_to_types,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- Seed Field Catalog - Parcel Fields
-- ============================================================================

INSERT INTO landscape.tbl_field_catalog (table_name, field_name, display_name, description, data_type, is_editable, is_calculated, valid_values, unit_of_measure, field_group, display_order, applies_to_types) VALUES

('tbl_parcel', 'parcel_name', 'Parcel Name', 'Name or identifier for the parcel', 'text', true, false, NULL, NULL, 'Parcel Info', 100, '{LAND}'),
('tbl_parcel', 'parcel_type', 'Parcel Type', 'Type of parcel (residential, commercial, etc.)', 'text', true, false, NULL, NULL, 'Parcel Info', 101, '{LAND}'),
('tbl_parcel', 'lot_count', 'Lot Count', 'Number of lots in parcel', 'integer', true, false, NULL, 'lots', 'Parcel Info', 110, '{LAND}'),
('tbl_parcel', 'net_acres', 'Net Acres', 'Net developable acres', 'numeric', true, false, NULL, 'AC', 'Parcel Info', 120, '{LAND}'),
('tbl_parcel', 'gross_acres', 'Gross Acres', 'Total parcel acreage', 'numeric', true, false, NULL, 'AC', 'Parcel Info', 121, '{LAND}'),
('tbl_parcel', 'avg_lot_size_sf', 'Avg Lot Size', 'Average lot size in square feet', 'numeric', true, false, NULL, 'SF', 'Parcel Info', 130, '{LAND}'),
('tbl_parcel', 'avg_lot_price', 'Avg Lot Price', 'Average price per lot', 'numeric', true, false, NULL, 'USD', 'Parcel Info', 140, '{LAND}'),
('tbl_parcel', 'total_revenue', 'Total Revenue', 'Total expected revenue from parcel', 'numeric', true, false, NULL, 'USD', 'Parcel Info', 150, '{LAND}'),
('tbl_parcel', 'absorption_rate', 'Absorption Rate', 'Monthly absorption rate', 'numeric', true, false, NULL, 'lots/month', 'Parcel Info', 160, '{LAND}'),
('tbl_parcel', 'status', 'Status', 'Current parcel status', 'text', true, false, '["Planning", "Entitled", "Under Development", "Active", "Sold Out"]', NULL, 'Parcel Info', 170, '{LAND}'),
('tbl_parcel', 'notes', 'Notes', 'Parcel notes', 'text', true, false, NULL, NULL, 'Parcel Info', 180, '{LAND}'),
('tbl_parcel', 'is_active', 'Is Active', 'Whether parcel is active', 'boolean', true, false, NULL, NULL, 'Parcel Info', 190, '{LAND}')

ON CONFLICT (table_name, field_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_editable = EXCLUDED.is_editable,
    valid_values = EXCLUDED.valid_values,
    unit_of_measure = EXCLUDED.unit_of_measure,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- Seed Field Catalog - Phase Fields
-- ============================================================================

INSERT INTO landscape.tbl_field_catalog (table_name, field_name, display_name, description, data_type, is_editable, is_calculated, valid_values, unit_of_measure, field_group, display_order, applies_to_types) VALUES

('tbl_phase', 'phase_name', 'Phase Name', 'Name of the phase', 'text', true, false, NULL, NULL, 'Phase Info', 100, '{LAND}'),
('tbl_phase', 'phase_number', 'Phase Number', 'Numeric order of the phase', 'integer', true, false, NULL, NULL, 'Phase Info', 101, '{LAND}'),
('tbl_phase', 'lot_count', 'Lot Count', 'Number of lots in phase', 'integer', true, false, NULL, 'lots', 'Phase Info', 110, '{LAND}'),
('tbl_phase', 'start_date', 'Start Date', 'Planned or actual start date', 'date', true, false, NULL, NULL, 'Phase Info', 120, '{LAND}'),
('tbl_phase', 'end_date', 'End Date', 'Planned or actual completion date', 'date', true, false, NULL, NULL, 'Phase Info', 121, '{LAND}'),
('tbl_phase', 'budget_amount', 'Budget Amount', 'Phase budget amount', 'numeric', true, false, NULL, 'USD', 'Phase Info', 130, '{LAND}'),
('tbl_phase', 'status', 'Status', 'Current phase status', 'text', true, false, '["Planning", "Approved", "Under Construction", "Active", "Complete", "On Hold", "Cancelled"]', NULL, 'Phase Info', 140, '{LAND}'),
('tbl_phase', 'notes', 'Notes', 'Phase notes', 'text', true, false, NULL, NULL, 'Phase Info', 150, '{LAND}'),
('tbl_phase', 'is_active', 'Is Active', 'Whether phase is active', 'boolean', true, false, NULL, NULL, 'Phase Info', 160, '{LAND}')

ON CONFLICT (table_name, field_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_editable = EXCLUDED.is_editable,
    valid_values = EXCLUDED.valid_values,
    unit_of_measure = EXCLUDED.unit_of_measure,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- Seed Field Catalog - Multifamily Unit Type Fields
-- ============================================================================

INSERT INTO landscape.tbl_field_catalog (table_name, field_name, display_name, description, data_type, is_editable, is_calculated, valid_values, unit_of_measure, field_group, display_order, applies_to_types) VALUES

('tbl_unit_type', 'unit_type_code', 'Unit Type Code', 'Unit type identifier (e.g., 1BR-A, 2BR-B)', 'text', true, false, NULL, NULL, 'Unit Mix', 100, '{MF}'),
('tbl_unit_type', 'unit_type_name', 'Unit Type Name', 'Descriptive name for unit type', 'text', true, false, NULL, NULL, 'Unit Mix', 101, '{MF}'),
('tbl_unit_type', 'bedroom_count', 'Bedrooms', 'Number of bedrooms', 'integer', true, false, '[0, 1, 2, 3, 4, 5]', 'BR', 'Unit Mix', 110, '{MF}'),
('tbl_unit_type', 'bathroom_count', 'Bathrooms', 'Number of bathrooms', 'numeric', true, false, '[1.0, 1.5, 2.0, 2.5, 3.0, 3.5]', 'BA', 'Unit Mix', 111, '{MF}'),
('tbl_unit_type', 'square_feet', 'Square Feet', 'Unit square footage', 'integer', true, false, NULL, 'SF', 'Unit Mix', 120, '{MF}'),
('tbl_unit_type', 'unit_count', 'Unit Count', 'Number of units of this type', 'integer', true, false, NULL, 'units', 'Unit Mix', 130, '{MF}'),
('tbl_unit_type', 'current_market_rent', 'Market Rent', 'Current market rent per unit', 'numeric', true, false, NULL, 'USD/mo', 'Unit Mix', 140, '{MF}'),
('tbl_unit_type', 'proforma_rent', 'Proforma Rent', 'Projected stabilized rent', 'numeric', true, false, NULL, 'USD/mo', 'Unit Mix', 141, '{MF}')

ON CONFLICT (table_name, field_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_editable = EXCLUDED.is_editable,
    valid_values = EXCLUDED.valid_values,
    unit_of_measure = EXCLUDED.unit_of_measure,
    updated_at = CURRENT_TIMESTAMP;


-- ============================================================================
-- DOWN Migration (Rollback)
-- ============================================================================

-- To rollback:
-- DROP TABLE IF EXISTS landscape.tbl_field_catalog;
-- DROP TABLE IF EXISTS landscape.lu_market;
