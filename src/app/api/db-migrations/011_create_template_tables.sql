-- Migration: Create template system for project creation (TC29 + TC27 Phase 4)

-- Table for property use templates
CREATE TABLE IF NOT EXISTS landscape.tbl_property_use_template (
  template_id BIGSERIAL PRIMARY KEY,
  template_name VARCHAR(100) NOT NULL,
  property_type VARCHAR(50) NOT NULL, -- 'mpc', 'office', 'retail', 'multifamily', 'industrial', 'hotel'
  template_category VARCHAR(50), -- 'residential', 'commercial', 'mixed-use', etc.
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for template column configurations
CREATE TABLE IF NOT EXISTS landscape.tbl_template_column_config (
  template_column_id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES landscape.tbl_property_use_template(template_id) ON DELETE CASCADE,
  column_name VARCHAR(100) NOT NULL,
  column_label VARCHAR(100) NOT NULL,
  column_type VARCHAR(20) NOT NULL CHECK (column_type IN ('hierarchy', 'data')),
  data_type VARCHAR(50), -- 'text', 'number', 'currency', 'date', 'boolean', 'enum'
  container_level INTEGER, -- For hierarchy columns: 1, 2, 3, 4, 5
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  -- DVL (Domain Value List) configuration
  data_source_table VARCHAR(100), -- e.g., 'lu_family', 'lu_type', 'res_lot_product'
  data_source_value_col VARCHAR(50), -- e.g., 'family_id', 'type_id', 'product_id'
  data_source_label_col VARCHAR(50), -- e.g., 'name', 'code'
  parent_column_name VARCHAR(50), -- For cascading dropdowns
  junction_table VARCHAR(100), -- For many-to-many (e.g., 'type_lot_product')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_template_property_type
  ON landscape.tbl_property_use_template(property_type, is_active);

CREATE INDEX IF NOT EXISTS idx_template_column_template
  ON landscape.tbl_template_column_config(template_id, display_order);

-- Comments
COMMENT ON TABLE landscape.tbl_property_use_template IS 'Reusable templates for different property types and use cases';
COMMENT ON TABLE landscape.tbl_template_column_config IS 'Column configurations for each template, defining structure and data sources';
COMMENT ON COLUMN landscape.tbl_template_column_config.parent_column_name IS 'Used for cascading dropdowns - references another column that filters this one';
COMMENT ON COLUMN landscape.tbl_template_column_config.junction_table IS 'For many-to-many relationships like type_lot_product';

-- Verification
SELECT 'Template tables created successfully' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'landscape' AND table_name LIKE '%template%' ORDER BY table_name;
