-- Universal Inventory System Schema
-- Date: 2025-10-15
-- Purpose: Replace property-type-specific tables with universal inventory-driven architecture

-- =====================================================
-- TABLE 1: Property Type Configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS landscape.tbl_property_type_config (
  config_id BIGSERIAL PRIMARY KEY,
  property_type VARCHAR(50) NOT NULL UNIQUE,
  tab_label VARCHAR(50) NOT NULL,
  description TEXT,
  default_columns JSONB NOT NULL,
  import_suggestions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE landscape.tbl_property_type_config IS 'Defines inventory table structure for each property type';
COMMENT ON COLUMN landscape.tbl_property_type_config.property_type IS 'multifamily, office, retail, mpc, industrial, hotel, self_storage';
COMMENT ON COLUMN landscape.tbl_property_type_config.tab_label IS 'Label shown in UI: Rent Roll, Lease Schedule, Parcel Table, etc.';
COMMENT ON COLUMN landscape.tbl_property_type_config.default_columns IS 'JSON array of hierarchy and data column definitions';

-- =====================================================
-- TABLE 2: Universal Inventory Item
-- =====================================================
CREATE TABLE IF NOT EXISTS landscape.tbl_inventory_item (
  item_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  property_type VARCHAR(50) NOT NULL,

  -- Universal identifier (unit/suite/parcel/room number)
  item_code VARCHAR(100) NOT NULL,

  -- Hierarchy values (flexible structure per property type)
  hierarchy_values JSONB DEFAULT '{}'::jsonb,

  -- Link to auto-generated container
  container_id BIGINT REFERENCES landscape.tbl_container(container_id) ON DELETE SET NULL,

  -- Data values (property-type-specific attributes)
  data_values JSONB DEFAULT '{}'::jsonb,

  -- Timing fields
  available_date DATE,
  absorption_month INT,
  lease_start_date DATE,
  lease_end_date DATE,

  -- Status
  status VARCHAR(50),
  is_speculative BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  sort_order INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_inventory_item_code UNIQUE (project_id, item_code)
);

COMMENT ON TABLE landscape.tbl_inventory_item IS 'Universal inventory table for all property types (units, suites, parcels, rooms, etc.)';
COMMENT ON COLUMN landscape.tbl_inventory_item.hierarchy_values IS 'JSON object with hierarchy column values, e.g., {"building": "North", "floor": "5"}';
COMMENT ON COLUMN landscape.tbl_inventory_item.data_values IS 'JSON object with data column values, e.g., {"square_feet": 750, "rent": 1450}';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_project ON landscape.tbl_inventory_item(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_container ON landscape.tbl_inventory_item(container_id);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON landscape.tbl_inventory_item(property_type);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON landscape.tbl_inventory_item(status);
CREATE INDEX IF NOT EXISTS idx_inventory_code ON landscape.tbl_inventory_item(item_code);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON landscape.tbl_inventory_item(is_active) WHERE is_active = true;

-- GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_inventory_hierarchy_gin ON landscape.tbl_inventory_item USING GIN (hierarchy_values);
CREATE INDEX IF NOT EXISTS idx_inventory_data_gin ON landscape.tbl_inventory_item USING GIN (data_values);

-- =====================================================
-- TABLE 3: Project-Specific Column Configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS landscape.tbl_project_inventory_columns (
  column_config_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

  column_name VARCHAR(50) NOT NULL,
  column_label VARCHAR(100) NOT NULL,
  column_type VARCHAR(50) NOT NULL, -- 'hierarchy' or 'data'

  -- For hierarchy columns
  container_level INT,

  -- For data columns
  data_type VARCHAR(50), -- 'text', 'number', 'currency', 'date', 'boolean', 'enum'
  enum_options JSONB,

  -- Display settings
  is_required BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  display_order INT NOT NULL,
  default_value TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_project_column UNIQUE (project_id, column_name),
  CONSTRAINT chk_column_type CHECK (column_type IN ('hierarchy', 'data')),
  CONSTRAINT chk_data_type CHECK (data_type IS NULL OR data_type IN ('text', 'number', 'currency', 'date', 'boolean', 'enum'))
);

COMMENT ON TABLE landscape.tbl_project_inventory_columns IS 'Defines custom columns for each project''s inventory table';
COMMENT ON COLUMN landscape.tbl_project_inventory_columns.column_type IS 'hierarchy columns create containers, data columns store attributes';
COMMENT ON COLUMN landscape.tbl_project_inventory_columns.container_level IS 'For hierarchy columns: which level (2,3,4,5) this column represents';

CREATE INDEX IF NOT EXISTS idx_project_columns_project ON landscape.tbl_project_inventory_columns(project_id);
CREATE INDEX IF NOT EXISTS idx_project_columns_order ON landscape.tbl_project_inventory_columns(project_id, display_order);

-- =====================================================
-- SEED DATA: Property Type Configurations
-- =====================================================

-- Configuration 1: Multifamily
INSERT INTO landscape.tbl_property_type_config (property_type, tab_label, description, default_columns, import_suggestions)
VALUES (
  'multifamily',
  'Rent Roll',
  'Residential apartment units with tenant details',
  '{
    "hierarchy": [
      {"name": "building", "label": "Building", "level": 2, "required": false},
      {"name": "floor", "label": "Floor", "level": 3, "required": false},
      {"name": "unit", "label": "Unit", "level": 4, "required": true}
    ],
    "data": [
      {"name": "bedrooms", "label": "Bedrooms", "type": "number", "required": true},
      {"name": "bathrooms", "label": "Bathrooms", "type": "number", "required": true},
      {"name": "square_feet", "label": "Square Feet", "type": "number", "required": true},
      {"name": "monthly_rent", "label": "Monthly Rent", "type": "currency", "required": true},
      {"name": "tenant_name", "label": "Tenant Name", "type": "text", "required": false},
      {"name": "lease_start", "label": "Lease Start", "type": "date", "required": false},
      {"name": "lease_end", "label": "Lease End", "type": "date", "required": false},
      {"name": "is_occupied", "label": "Occupied", "type": "boolean", "required": false}
    ]
  }',
  '["Upload rent roll CSV", "Import from property management system", "Scan rent roll PDF"]'
) ON CONFLICT (property_type) DO UPDATE SET
  tab_label = EXCLUDED.tab_label,
  default_columns = EXCLUDED.default_columns,
  import_suggestions = EXCLUDED.import_suggestions,
  updated_at = CURRENT_TIMESTAMP;

-- Configuration 2: Office
INSERT INTO landscape.tbl_property_type_config (property_type, tab_label, description, default_columns, import_suggestions)
VALUES (
  'office',
  'Lease Schedule',
  'Office suites with lease abstracts',
  '{
    "hierarchy": [
      {"name": "building", "label": "Building", "level": 2, "required": false},
      {"name": "floor", "label": "Floor", "level": 3, "required": false},
      {"name": "suite", "label": "Suite", "level": 4, "required": true}
    ],
    "data": [
      {"name": "square_feet", "label": "Square Feet", "type": "number", "required": true},
      {"name": "annual_rent_psf", "label": "Annual Rent/SF", "type": "currency", "required": true},
      {"name": "tenant_name", "label": "Tenant Name", "type": "text", "required": false},
      {"name": "lease_start", "label": "Lease Start", "type": "date", "required": false},
      {"name": "lease_end", "label": "Lease End", "type": "date", "required": false},
      {"name": "lease_term_years", "label": "Lease Term (Years)", "type": "number", "required": false},
      {"name": "annual_escalation_pct", "label": "Annual Escalation %", "type": "number", "required": false},
      {"name": "ti_allowance_psf", "label": "TI Allowance $/SF", "type": "currency", "required": false},
      {"name": "free_rent_months", "label": "Free Rent (Months)", "type": "number", "required": false}
    ]
  }',
  '["Upload lease abstract", "Import from CoStar", "Scan lease documents"]'
) ON CONFLICT (property_type) DO UPDATE SET
  tab_label = EXCLUDED.tab_label,
  default_columns = EXCLUDED.default_columns,
  updated_at = CURRENT_TIMESTAMP;

-- Configuration 3: MPC (Master Planned Community)
INSERT INTO landscape.tbl_property_type_config (property_type, tab_label, description, default_columns, import_suggestions)
VALUES (
  'mpc',
  'Parcel Table',
  'Master planned community lots and parcels',
  '{
    "hierarchy": [
      {"name": "plan_area", "label": "Plan Area", "level": 2, "required": false},
      {"name": "phase", "label": "Phase", "level": 3, "required": false},
      {"name": "parcel", "label": "Parcel", "level": 4, "required": false},
      {"name": "lot", "label": "Lot", "level": 5, "required": true}
    ],
    "data": [
      {"name": "acres", "label": "Acres", "type": "number", "required": true},
      {"name": "product_type", "label": "Product Type", "type": "text", "required": true},
      {"name": "lot_price", "label": "Lot Price", "type": "currency", "required": true},
      {"name": "builder_buyer", "label": "Builder/Buyer", "type": "text", "required": false},
      {"name": "sale_date", "label": "Sale Date", "type": "date", "required": false},
      {"name": "close_date", "label": "Close Date", "type": "date", "required": false},
      {"name": "status", "label": "Status", "type": "enum", "enum_options": ["Sold", "Available", "Future", "Reserved"], "required": true}
    ]
  }',
  '["Upload parcel exhibit", "Scan plat map", "Import from GIS system"]'
) ON CONFLICT (property_type) DO UPDATE SET
  tab_label = EXCLUDED.tab_label,
  default_columns = EXCLUDED.default_columns,
  updated_at = CURRENT_TIMESTAMP;

-- Configuration 4: Retail
INSERT INTO landscape.tbl_property_type_config (property_type, tab_label, description, default_columns, import_suggestions)
VALUES (
  'retail',
  'Tenant Mix',
  'Retail shopping center tenant roster',
  '{
    "hierarchy": [
      {"name": "building", "label": "Building", "level": 2, "required": false},
      {"name": "space", "label": "Space", "level": 3, "required": true}
    ],
    "data": [
      {"name": "square_feet", "label": "Square Feet", "type": "number", "required": true},
      {"name": "annual_rent_psf", "label": "Annual Rent/SF", "type": "currency", "required": true},
      {"name": "tenant_name", "label": "Tenant Name", "type": "text", "required": false},
      {"name": "tenant_category", "label": "Category", "type": "enum", "enum_options": ["Anchor", "Shop", "Restaurant", "Service"], "required": false},
      {"name": "percentage_rent_pct", "label": "% Rent", "type": "number", "required": false},
      {"name": "sales_breakpoint", "label": "Sales Breakpoint", "type": "currency", "required": false}
    ]
  }',
  '["Upload tenant roster", "Import from Placer.ai", "Scan site plan"]'
) ON CONFLICT (property_type) DO UPDATE SET
  tab_label = EXCLUDED.tab_label,
  default_columns = EXCLUDED.default_columns,
  updated_at = CURRENT_TIMESTAMP;

-- Configuration 5: Industrial
INSERT INTO landscape.tbl_property_type_config (property_type, tab_label, description, default_columns, import_suggestions)
VALUES (
  'industrial',
  'Lease Schedule',
  'Industrial warehouse and distribution spaces',
  '{
    "hierarchy": [
      {"name": "building", "label": "Building", "level": 2, "required": true},
      {"name": "bay", "label": "Bay", "level": 3, "required": false}
    ],
    "data": [
      {"name": "square_feet", "label": "Square Feet", "type": "number", "required": true},
      {"name": "annual_rent_psf", "label": "Annual Rent/SF", "type": "currency", "required": true},
      {"name": "tenant_name", "label": "Tenant Name", "type": "text", "required": false},
      {"name": "clear_height_ft", "label": "Clear Height (ft)", "type": "number", "required": false},
      {"name": "loading_docks", "label": "Loading Docks", "type": "number", "required": false},
      {"name": "is_triple_net", "label": "Triple Net", "type": "boolean", "required": false}
    ]
  }',
  '["Upload lease schedule", "Import from property system"]'
) ON CONFLICT (property_type) DO UPDATE SET
  tab_label = EXCLUDED.tab_label,
  default_columns = EXCLUDED.default_columns,
  updated_at = CURRENT_TIMESTAMP;

-- Configuration 6: Hotel
INSERT INTO landscape.tbl_property_type_config (property_type, tab_label, description, default_columns, import_suggestions)
VALUES (
  'hotel',
  'Room Inventory',
  'Hotel room types and details',
  '{
    "hierarchy": [
      {"name": "tower", "label": "Tower/Building", "level": 2, "required": false},
      {"name": "floor", "label": "Floor", "level": 3, "required": false},
      {"name": "room", "label": "Room", "level": 4, "required": true}
    ],
    "data": [
      {"name": "room_type", "label": "Room Type", "type": "enum", "enum_options": ["King", "Queen", "Double Queen", "Suite", "Executive"], "required": true},
      {"name": "square_feet", "label": "Square Feet", "type": "number", "required": true},
      {"name": "average_daily_rate", "label": "ADR", "type": "currency", "required": true},
      {"name": "view_type", "label": "View", "type": "text", "required": false},
      {"name": "bed_count", "label": "Bed Count", "type": "number", "required": false}
    ]
  }',
  '["Upload room list", "Import from PMS system"]'
) ON CONFLICT (property_type) DO UPDATE SET
  tab_label = EXCLUDED.tab_label,
  default_columns = EXCLUDED.default_columns,
  updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- HELPER FUNCTION: Auto-create containers from inventory
-- =====================================================
CREATE OR REPLACE FUNCTION landscape.auto_create_containers_from_inventory(
  p_project_id BIGINT,
  p_item_id BIGINT
) RETURNS BIGINT AS $$
DECLARE
  v_item RECORD;
  v_hierarchy_cols RECORD;
  v_parent_container_id BIGINT;
  v_current_container_id BIGINT;
  v_container_name TEXT;
  v_level INT;
BEGIN
  -- Get the inventory item
  SELECT * INTO v_item
  FROM landscape.tbl_inventory_item
  WHERE item_id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item % not found', p_item_id;
  END IF;

  -- Start with property container as parent (level 1)
  SELECT container_id INTO v_parent_container_id
  FROM landscape.tbl_container
  WHERE project_id = p_project_id
    AND container_level = 1
    AND is_active = true
  LIMIT 1;

  -- If no property container exists, create it
  IF v_parent_container_id IS NULL THEN
    INSERT INTO landscape.tbl_container (
      project_id, container_level, container_code, display_name, is_active
    ) VALUES (
      p_project_id, 1, 'PROPERTY', 'Property', true
    ) RETURNING container_id INTO v_parent_container_id;
  END IF;

  -- Loop through hierarchy columns in order
  FOR v_hierarchy_cols IN
    SELECT column_name, column_label, container_level
    FROM landscape.tbl_project_inventory_columns
    WHERE project_id = p_project_id
      AND column_type = 'hierarchy'
    ORDER BY container_level ASC
  LOOP
    -- Get the value for this hierarchy level from JSONB
    v_container_name := v_item.hierarchy_values->>v_hierarchy_cols.column_name;

    IF v_container_name IS NOT NULL AND v_container_name != '' THEN
      -- Check if container already exists at this level with this parent
      SELECT container_id INTO v_current_container_id
      FROM landscape.tbl_container
      WHERE project_id = p_project_id
        AND container_level = v_hierarchy_cols.container_level
        AND parent_container_id = v_parent_container_id
        AND display_name = v_container_name
        AND is_active = true
      LIMIT 1;

      -- If doesn't exist, create it
      IF v_current_container_id IS NULL THEN
        INSERT INTO landscape.tbl_container (
          project_id,
          parent_container_id,
          container_level,
          container_code,
          display_name,
          sort_order,
          is_active
        ) VALUES (
          p_project_id,
          v_parent_container_id,
          v_hierarchy_cols.container_level,
          v_container_name,
          v_container_name,
          0,
          true
        ) RETURNING container_id INTO v_current_container_id;
      END IF;

      -- This becomes the parent for the next level
      v_parent_container_id := v_current_container_id;
    END IF;
  END LOOP;

  -- Update the inventory item with the deepest container
  UPDATE landscape.tbl_inventory_item
  SET container_id = v_parent_container_id,
      updated_at = CURRENT_TIMESTAMP
  WHERE item_id = p_item_id;

  RETURN v_parent_container_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.auto_create_containers_from_inventory IS 'Automatically creates container hierarchy from inventory item hierarchy values';

-- =====================================================
-- TRIGGER: Auto-create containers when inventory item inserted/updated
-- =====================================================
CREATE OR REPLACE FUNCTION landscape.trigger_auto_create_containers()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if hierarchy_values changed or new record
  IF (TG_OP = 'INSERT') OR
     (TG_OP = 'UPDATE' AND NEW.hierarchy_values IS DISTINCT FROM OLD.hierarchy_values) THEN
    PERFORM landscape.auto_create_containers_from_inventory(NEW.project_id, NEW.item_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_create_containers
  AFTER INSERT OR UPDATE ON landscape.tbl_inventory_item
  FOR EACH ROW
  EXECUTE FUNCTION landscape.trigger_auto_create_containers();

COMMENT ON TRIGGER trg_auto_create_containers ON landscape.tbl_inventory_item IS 'Automatically creates container hierarchy when inventory items are added or hierarchy changes';
