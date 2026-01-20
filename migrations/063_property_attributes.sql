-- ============================================================================
-- Migration: 063_property_attributes.sql
-- Description: Property Attributes Schema - Core fields + configurable attributes
-- Date: 2026-01-20
--
-- Implements Core + Configurable pattern for USPAP property descriptions:
-- - Core fields: Discrete columns on tbl_project for commonly queried data
-- - JSONB columns: Flexible storage for user-configurable attributes
-- - Attribute definitions: tbl_property_attribute_def drives UI rendering and extraction
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ADD CORE FIELDS TO tbl_project
-- These are discrete columns for universally-needed, frequently-queried data
-- ============================================================================

-- Site characteristics
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS site_shape VARCHAR(50),
ADD COLUMN IF NOT EXISTS site_utility_rating INTEGER CHECK (site_utility_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS location_rating INTEGER CHECK (location_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS access_rating INTEGER CHECK (access_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS visibility_rating INTEGER CHECK (visibility_rating BETWEEN 1 AND 5);

-- Improvement characteristics
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS building_count INTEGER,
ADD COLUMN IF NOT EXISTS net_rentable_area NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS land_to_building_ratio NUMERIC(6,3),
ADD COLUMN IF NOT EXISTS construction_class VARCHAR(20),
ADD COLUMN IF NOT EXISTS construction_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5);

-- Parking
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS parking_spaces INTEGER,
ADD COLUMN IF NOT EXISTS parking_ratio NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS parking_type VARCHAR(50);

-- Economic life (for cost approach depreciation)
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS effective_age INTEGER,
ADD COLUMN IF NOT EXISTS total_economic_life INTEGER,
ADD COLUMN IF NOT EXISTS remaining_economic_life INTEGER;

-- JSONB columns for configurable attributes
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS site_attributes JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS improvement_attributes JSONB DEFAULT '{}';

-- Comments for new columns
COMMENT ON COLUMN landscape.tbl_project.site_shape IS 'Site shape description (rectangular, irregular, triangular, etc.)';
COMMENT ON COLUMN landscape.tbl_project.site_utility_rating IS 'Site utility rating 1-5 (1=poor, 5=excellent)';
COMMENT ON COLUMN landscape.tbl_project.location_rating IS 'Location quality rating 1-5';
COMMENT ON COLUMN landscape.tbl_project.access_rating IS 'Access/ingress-egress rating 1-5';
COMMENT ON COLUMN landscape.tbl_project.visibility_rating IS 'Visibility/exposure rating 1-5';

COMMENT ON COLUMN landscape.tbl_project.building_count IS 'Number of buildings on site';
COMMENT ON COLUMN landscape.tbl_project.net_rentable_area IS 'Net rentable area in SF';
COMMENT ON COLUMN landscape.tbl_project.land_to_building_ratio IS 'Land area to building area ratio';
COMMENT ON COLUMN landscape.tbl_project.construction_class IS 'Construction class (A, B, C, D, S)';
COMMENT ON COLUMN landscape.tbl_project.construction_type IS 'Construction type (wood frame, steel, concrete, masonry)';
COMMENT ON COLUMN landscape.tbl_project.condition_rating IS 'Physical condition rating 1-5';
COMMENT ON COLUMN landscape.tbl_project.quality_rating IS 'Quality/finish rating 1-5';

COMMENT ON COLUMN landscape.tbl_project.parking_spaces IS 'Total parking spaces';
COMMENT ON COLUMN landscape.tbl_project.parking_ratio IS 'Parking ratio (spaces per unit or per 1000 SF)';
COMMENT ON COLUMN landscape.tbl_project.parking_type IS 'Parking type (surface, covered, garage, subterranean)';

COMMENT ON COLUMN landscape.tbl_project.effective_age IS 'Effective age in years (for depreciation)';
COMMENT ON COLUMN landscape.tbl_project.total_economic_life IS 'Total economic life in years';
COMMENT ON COLUMN landscape.tbl_project.remaining_economic_life IS 'Remaining economic life in years';

COMMENT ON COLUMN landscape.tbl_project.site_attributes IS 'Configurable site attributes JSONB (frontage, utilities, flood, environmental, etc.)';
COMMENT ON COLUMN landscape.tbl_project.improvement_attributes IS 'Configurable improvement attributes JSONB (mechanical, amenities, obsolescence, etc.)';

-- Indexes for JSONB columns (GIN for efficient queries)
CREATE INDEX IF NOT EXISTS idx_project_site_attributes ON landscape.tbl_project USING GIN (site_attributes);
CREATE INDEX IF NOT EXISTS idx_project_improvement_attributes ON landscape.tbl_project USING GIN (improvement_attributes);


-- ============================================================================
-- SECTION 2: PROPERTY ATTRIBUTE DEFINITIONS TABLE
-- Drives dynamic form rendering and Landscaper extraction
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_property_attribute_def (
    attribute_id BIGSERIAL PRIMARY KEY,

    -- Classification
    category VARCHAR(50) NOT NULL CHECK (category IN ('site', 'improvement')),
    subcategory VARCHAR(50),  -- e.g., 'utilities', 'construction', 'mechanical', 'amenities'

    -- Attribute definition
    attribute_code VARCHAR(50) NOT NULL,
    attribute_label VARCHAR(100) NOT NULL,
    description TEXT,

    -- Data type and validation
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN (
        'text', 'number', 'boolean', 'date',
        'select', 'multiselect', 'rating', 'narrative'
    )),
    options JSONB,  -- For select/multiselect: [{"value": "wood_frame", "label": "Wood Frame"}, ...]
    default_value TEXT,
    is_required BOOLEAN DEFAULT FALSE,

    -- Display
    sort_order INTEGER DEFAULT 0,
    display_width VARCHAR(20) DEFAULT 'full',  -- 'full', 'half', 'third'
    help_text TEXT,

    -- Property type applicability (null = all types)
    property_types JSONB,  -- ['MF', 'OFF', 'RET'] or null for all

    -- Status
    is_system BOOLEAN DEFAULT FALSE,  -- System-defined vs user-defined
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(category, attribute_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prop_attr_def_category ON landscape.tbl_property_attribute_def(category, is_active);
CREATE INDEX IF NOT EXISTS idx_prop_attr_def_subcategory ON landscape.tbl_property_attribute_def(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_prop_attr_def_property_types ON landscape.tbl_property_attribute_def USING GIN (property_types);

-- Comments
COMMENT ON TABLE landscape.tbl_property_attribute_def IS 'Defines configurable property attributes for site and improvement characteristics. Drives dynamic form rendering and Landscaper extraction.';
COMMENT ON COLUMN landscape.tbl_property_attribute_def.category IS 'Attribute category: site or improvement';
COMMENT ON COLUMN landscape.tbl_property_attribute_def.subcategory IS 'Sub-grouping: utilities, construction, mechanical, amenities, etc.';
COMMENT ON COLUMN landscape.tbl_property_attribute_def.attribute_code IS 'Unique code within category for programmatic access';
COMMENT ON COLUMN landscape.tbl_property_attribute_def.data_type IS 'Data type: text, number, boolean, date, select, multiselect, rating, narrative';
COMMENT ON COLUMN landscape.tbl_property_attribute_def.options IS 'For select/multiselect: array of {value, label} options';
COMMENT ON COLUMN landscape.tbl_property_attribute_def.property_types IS 'Property types this attribute applies to (null = all)';
COMMENT ON COLUMN landscape.tbl_property_attribute_def.is_system IS 'TRUE for system-defined attributes, FALSE for user-defined';


-- ============================================================================
-- SECTION 3: Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION landscape.fn_prop_attr_def_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prop_attr_def_updated_at ON landscape.tbl_property_attribute_def;
CREATE TRIGGER trg_prop_attr_def_updated_at
    BEFORE UPDATE ON landscape.tbl_property_attribute_def
    FOR EACH ROW
    EXECUTE FUNCTION landscape.fn_prop_attr_def_updated_at();


COMMIT;


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- To roll back this migration:
--
-- DROP TRIGGER IF EXISTS trg_prop_attr_def_updated_at ON landscape.tbl_property_attribute_def;
-- DROP FUNCTION IF EXISTS landscape.fn_prop_attr_def_updated_at();
-- DROP TABLE IF EXISTS landscape.tbl_property_attribute_def;
--
-- ALTER TABLE landscape.tbl_project
-- DROP COLUMN IF EXISTS site_shape,
-- DROP COLUMN IF EXISTS site_utility_rating,
-- DROP COLUMN IF EXISTS location_rating,
-- DROP COLUMN IF EXISTS access_rating,
-- DROP COLUMN IF EXISTS visibility_rating,
-- DROP COLUMN IF EXISTS building_count,
-- DROP COLUMN IF EXISTS net_rentable_area,
-- DROP COLUMN IF EXISTS land_to_building_ratio,
-- DROP COLUMN IF EXISTS construction_class,
-- DROP COLUMN IF EXISTS construction_type,
-- DROP COLUMN IF EXISTS condition_rating,
-- DROP COLUMN IF EXISTS quality_rating,
-- DROP COLUMN IF EXISTS parking_spaces,
-- DROP COLUMN IF EXISTS parking_ratio,
-- DROP COLUMN IF EXISTS parking_type,
-- DROP COLUMN IF EXISTS effective_age,
-- DROP COLUMN IF EXISTS total_economic_life,
-- DROP COLUMN IF EXISTS remaining_economic_life,
-- DROP COLUMN IF EXISTS site_attributes,
-- DROP COLUMN IF EXISTS improvement_attributes;
