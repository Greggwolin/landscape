-- Migration: 039_picklist_display_and_subtypes.sql
-- Description: Add picklist display configuration and property subtypes tables
-- Date: 2025-12-20

-- =====================================================
-- UP MIGRATION
-- =====================================================

-- 1. Picklist display format configuration
CREATE TABLE IF NOT EXISTS landscape.lu_picklist_display_config (
    config_id SERIAL PRIMARY KEY,
    list_code VARCHAR(50) NOT NULL,           -- e.g., 'property_type', 'phase_status'
    context VARCHAR(50) NOT NULL,             -- 'dropdown', 'grid', 'report', 'export'
    display_format VARCHAR(20) NOT NULL,      -- 'code', 'name', 'code_name', 'name_code'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(list_code, context)
);

COMMENT ON TABLE landscape.lu_picklist_display_config IS 'Controls how picklist values display in different UI contexts';

-- Seed default display formats
INSERT INTO landscape.lu_picklist_display_config (list_code, context, display_format) VALUES
-- Property Type
('property_type', 'dropdown', 'code'),
('property_type', 'grid', 'code_name'),
('property_type', 'report', 'name'),
('property_type', 'export', 'code'),

-- Analysis Type
('analysis_type', 'dropdown', 'name'),
('analysis_type', 'grid', 'name'),
('analysis_type', 'report', 'name'),
('analysis_type', 'export', 'code'),

-- Phase Status
('phase_status', 'dropdown', 'name'),
('phase_status', 'grid', 'name'),
('phase_status', 'report', 'name'),
('phase_status', 'export', 'code'),

-- Lease Status
('lease_status', 'dropdown', 'name'),
('lease_status', 'grid', 'name'),
('lease_status', 'report', 'name'),
('lease_status', 'export', 'code'),

-- Property Class
('property_class', 'dropdown', 'name'),
('property_class', 'grid', 'name'),
('property_class', 'report', 'name'),
('property_class', 'export', 'code'),

-- Market
('market', 'dropdown', 'code'),
('market', 'grid', 'name'),
('market', 'report', 'name'),
('market', 'export', 'code'),

-- Ownership Type
('ownership_type', 'dropdown', 'name'),
('ownership_type', 'grid', 'name'),
('ownership_type', 'report', 'name'),
('ownership_type', 'export', 'code')

ON CONFLICT (list_code, context) DO NOTHING;

-- 2. Property subtype lookup with cascading dependency
CREATE TABLE IF NOT EXISTS landscape.lu_property_subtype (
    subtype_id SERIAL PRIMARY KEY,
    property_type_code VARCHAR(10) NOT NULL,  -- Parent: MF, OFF, RET, etc.
    subtype_code VARCHAR(50) NOT NULL,
    subtype_name VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_type_code, subtype_code)
);

COMMENT ON TABLE landscape.lu_property_subtype IS 'Property subtypes with cascading dependency on property_type';

-- Seed subtypes by property type
INSERT INTO landscape.lu_property_subtype (property_type_code, subtype_code, subtype_name, sort_order) VALUES
-- Multifamily
('MF', 'GARDEN', 'Garden-Style Apartment', 1),
('MF', 'MIDRISE', 'Mid-Rise Apartment', 2),
('MF', 'HIGHRISE', 'High-Rise Apartment', 3),
('MF', 'STUDENT', 'Student Housing', 4),
('MF', 'SENIOR', 'Senior Housing', 5),
('MF', 'AFFORDABLE', 'Affordable Housing', 6),
('MF', 'WORKFORCE', 'Workforce Housing', 7),
('MF', 'LUXURY', 'Luxury Apartment', 8),

-- Office
('OFF', 'CLASS_A', 'Class A Office', 1),
('OFF', 'CLASS_B', 'Class B Office', 2),
('OFF', 'CLASS_C', 'Class C Office', 3),
('OFF', 'MEDICAL', 'Medical Office', 4),
('OFF', 'FLEX_RD', 'Flex/R&D', 5),
('OFF', 'COWORK', 'Coworking', 6),
('OFF', 'GOVT', 'Government', 7),

-- Retail
('RET', 'NEIGHBORHOOD', 'Neighborhood Center', 1),
('RET', 'COMMUNITY', 'Community Center', 2),
('RET', 'POWER', 'Power Center', 3),
('RET', 'LIFESTYLE', 'Lifestyle Center', 4),
('RET', 'STRIP', 'Strip Center', 5),
('RET', 'REGIONAL', 'Regional Mall', 6),
('RET', 'SINGLE_TENANT', 'Single-Tenant Retail', 7),
('RET', 'OUTLET', 'Outlet Center', 8),

-- Industrial
('IND', 'WAREHOUSE', 'Warehouse/Distribution', 1),
('IND', 'MANUFACTURING', 'Manufacturing', 2),
('IND', 'FLEX', 'Flex Space', 3),
('IND', 'COLD_STORAGE', 'Cold Storage', 4),
('IND', 'SELF_STORAGE', 'Self-Storage', 5),
('IND', 'DATA_CENTER', 'Data Center', 6),
('IND', 'LAST_MILE', 'Last-Mile Delivery', 7),

-- Hotel
('HTL', 'FULL_SERVICE', 'Full-Service Hotel', 1),
('HTL', 'LIMITED_SERVICE', 'Limited-Service Hotel', 2),
('HTL', 'EXTENDED_STAY', 'Extended Stay', 3),
('HTL', 'BOUTIQUE', 'Boutique Hotel', 4),
('HTL', 'RESORT', 'Resort', 5),
('HTL', 'CASINO', 'Casino Hotel', 6),

-- Land
('LAND', 'MPC', 'Master Planned Community', 1),
('LAND', 'SUBDIVISION', 'Subdivision', 2),
('LAND', 'INFILL', 'Infill Development', 3),
('LAND', 'ENTITLED', 'Entitled Land', 4),
('LAND', 'RAW', 'Raw Land', 5),

-- Mixed-Use
('MXU', 'VERTICAL', 'Vertical Mixed-Use', 1),
('MXU', 'HORIZONTAL', 'Horizontal Mixed-Use', 2),
('MXU', 'TRANSIT', 'Transit-Oriented Development', 3),
('MXU', 'LIVE_WORK', 'Live-Work', 4)

ON CONFLICT (property_type_code, subtype_code) DO UPDATE SET
    subtype_name = EXCLUDED.subtype_name,
    sort_order = EXCLUDED.sort_order;

-- 3. Mark deprecated fields in tbl_project
COMMENT ON COLUMN landscape.tbl_project.project_type IS 'DEPRECATED: Use analysis_type instead';

-- =====================================================
-- DOWN MIGRATION (Rollback)
-- =====================================================

-- To rollback:
-- DROP TABLE IF EXISTS landscape.lu_picklist_display_config;
-- DROP TABLE IF EXISTS landscape.lu_property_subtype;
-- COMMENT ON COLUMN landscape.tbl_project.project_type IS NULL;
