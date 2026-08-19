-- Migration: Seed MPC property use templates (TC29)

-- Template 1: Standard MPC (Area → Phase → Parcel)
INSERT INTO landscape.tbl_property_use_template (template_name, property_type, template_category, description)
VALUES (
  'Standard MPC - 3 Level Hierarchy',
  'mpc',
  'residential',
  'Standard master-planned community with Area → Phase → Parcel hierarchy. Includes lot product types and metrics.'
)
RETURNING template_id;

-- Get the template_id for Standard MPC
DO $$
DECLARE
  v_template_id BIGINT;
BEGIN
  SELECT template_id INTO v_template_id
  FROM landscape.tbl_property_use_template
  WHERE template_name = 'Standard MPC - 3 Level Hierarchy';

  -- Hierarchy Columns
  INSERT INTO landscape.tbl_template_column_config (
    template_id, column_name, column_label, column_type, container_level, display_order, is_required
  ) VALUES
  (v_template_id, 'area', 'Planning Area', 'hierarchy', 1, 1, true),
  (v_template_id, 'phase', 'Phase', 'hierarchy', 2, 2, true),
  (v_template_id, 'parcel', 'Parcel', 'hierarchy', 3, 3, true);

  -- Data Columns with DVL configurations
  INSERT INTO landscape.tbl_template_column_config (
    template_id, column_name, column_label, column_type, data_type, display_order, is_required,
    data_source_table, data_source_value_col, data_source_label_col, parent_column_name, junction_table
  ) VALUES
  -- Family dropdown
  (v_template_id, 'family_id', 'Family', 'data', 'enum', 10, true,
   'lu_family', 'family_id', 'name', NULL, NULL),

  -- Type dropdown (cascades from family)
  (v_template_id, 'type_id', 'Type', 'data', 'enum', 11, true,
   'lu_type', 'type_id', 'name', 'family_id', NULL),

  -- Lot Product dropdown (cascades from type via junction table)
  (v_template_id, 'product_id', 'Lot Product', 'data', 'enum', 12, true,
   'res_lot_product', 'product_id', 'code', 'type_id', 'type_lot_product'),

  -- Metrics
  (v_template_id, 'units_total', 'Units Total', 'data', 'number', 20, false,
   NULL, NULL, NULL, NULL, NULL),

  (v_template_id, 'lot_w_ft', 'Lot Width (ft)', 'data', 'number', 21, false,
   NULL, NULL, NULL, NULL, NULL),

  (v_template_id, 'lot_d_ft', 'Lot Depth (ft)', 'data', 'number', 22, false,
   NULL, NULL, NULL, NULL, NULL),

  (v_template_id, 'lot_area_sf', 'Lot Area (SF)', 'data', 'number', 23, false,
   NULL, NULL, NULL, NULL, NULL),

  (v_template_id, 'acres_gross', 'Acres (Gross)', 'data', 'number', 24, false,
   NULL, NULL, NULL, NULL, NULL),

  (v_template_id, 'acres_net', 'Acres (Net)', 'data', 'number', 25, false,
   NULL, NULL, NULL, NULL, NULL);

END $$;


-- Template 2: Simple MPC (2 Level - Phase → Parcel only)
INSERT INTO landscape.tbl_property_use_template (template_name, property_type, template_category, description)
VALUES (
  'Simple MPC - 2 Level Hierarchy',
  'mpc',
  'residential',
  'Simplified master-planned community with Phase → Parcel hierarchy only. No planning areas.'
)
RETURNING template_id;

DO $$
DECLARE
  v_template_id BIGINT;
BEGIN
  SELECT template_id INTO v_template_id
  FROM landscape.tbl_property_use_template
  WHERE template_name = 'Simple MPC - 2 Level Hierarchy';

  -- Hierarchy Columns (only 2 levels)
  INSERT INTO landscape.tbl_template_column_config (
    template_id, column_name, column_label, column_type, container_level, display_order, is_required
  ) VALUES
  (v_template_id, 'phase', 'Phase', 'hierarchy', 1, 1, true),
  (v_template_id, 'parcel', 'Parcel', 'hierarchy', 2, 2, true);

  -- Data Columns (same as Standard MPC)
  INSERT INTO landscape.tbl_template_column_config (
    template_id, column_name, column_label, column_type, data_type, display_order, is_required,
    data_source_table, data_source_value_col, data_source_label_col, parent_column_name, junction_table
  ) VALUES
  (v_template_id, 'family_id', 'Family', 'data', 'enum', 10, true,
   'lu_family', 'family_id', 'name', NULL, NULL),
  (v_template_id, 'type_id', 'Type', 'data', 'enum', 11, true,
   'lu_type', 'type_id', 'name', 'family_id', NULL),
  (v_template_id, 'product_id', 'Lot Product', 'data', 'enum', 12, true,
   'res_lot_product', 'product_id', 'code', 'type_id', 'type_lot_product'),
  (v_template_id, 'units_total', 'Units Total', 'data', 'number', 20, false,
   NULL, NULL, NULL, NULL, NULL),
  (v_template_id, 'lot_w_ft', 'Lot Width (ft)', 'data', 'number', 21, false,
   NULL, NULL, NULL, NULL, NULL),
  (v_template_id, 'lot_d_ft', 'Lot Depth (ft)', 'data', 'number', 22, false,
   NULL, NULL, NULL, NULL, NULL),
  (v_template_id, 'lot_area_sf', 'Lot Area (SF)', 'data', 'number', 23, false,
   NULL, NULL, NULL, NULL, NULL),
  (v_template_id, 'acres_gross', 'Acres (Gross)', 'data', 'number', 24, false,
   NULL, NULL, NULL, NULL, NULL),
  (v_template_id, 'acres_net', 'Acres (Net)', 'data', 'number', 25, false,
   NULL, NULL, NULL, NULL, NULL);

END $$;


-- Template 3: Mixed-Use MPC with Commercial
INSERT INTO landscape.tbl_property_use_template (template_name, property_type, template_category, description)
VALUES (
  'Mixed-Use MPC - Residential + Commercial',
  'mpc',
  'mixed-use',
  'Master-planned community with both residential and commercial components. Area → Phase → Parcel hierarchy.'
)
RETURNING template_id;

DO $$
DECLARE
  v_template_id BIGINT;
BEGIN
  SELECT template_id INTO v_template_id
  FROM landscape.tbl_property_use_template
  WHERE template_name = 'Mixed-Use MPC - Residential + Commercial';

  -- Hierarchy Columns
  INSERT INTO landscape.tbl_template_column_config (
    template_id, column_name, column_label, column_type, container_level, display_order, is_required
  ) VALUES
  (v_template_id, 'area', 'Planning Area', 'hierarchy', 1, 1, true),
  (v_template_id, 'phase', 'Phase', 'hierarchy', 2, 2, true),
  (v_template_id, 'parcel', 'Parcel', 'hierarchy', 3, 3, true);

  -- Data Columns
  INSERT INTO landscape.tbl_template_column_config (
    template_id, column_name, column_label, column_type, data_type, display_order, is_required,
    data_source_table, data_source_value_col, data_source_label_col, parent_column_name, junction_table
  ) VALUES
  (v_template_id, 'family_id', 'Family', 'data', 'enum', 10, true,
   'lu_family', 'family_id', 'name', NULL, NULL),
  (v_template_id, 'type_id', 'Type', 'data', 'enum', 11, true,
   'lu_type', 'type_id', 'name', 'family_id', NULL),
  (v_template_id, 'product_id', 'Lot Product', 'data', 'enum', 12, false,
   'res_lot_product', 'product_id', 'code', 'type_id', 'type_lot_product'),
  (v_template_id, 'units_total', 'Units/Spaces', 'data', 'number', 20, false,
   NULL, NULL, NULL, NULL, NULL),
  (v_template_id, 'lot_area_sf', 'Lot/Building Area (SF)', 'data', 'number', 21, false,
   NULL, NULL, NULL, NULL, NULL),
  (v_template_id, 'acres_gross', 'Acres (Gross)', 'data', 'number', 22, false,
   NULL, NULL, NULL, NULL, NULL),
  (v_template_id, 'acres_net', 'Acres (Net)', 'data', 'number', 23, false,
   NULL, NULL, NULL, NULL, NULL),
  (v_template_id, 'use_type', 'Use Type', 'data', 'text', 24, false,
   NULL, NULL, NULL, NULL, NULL);

END $$;

-- Verification
SELECT 'MPC Templates seeded successfully' as status;

SELECT
  t.template_id,
  t.template_name,
  t.property_type,
  t.template_category,
  COUNT(c.template_column_id) as column_count
FROM landscape.tbl_property_use_template t
LEFT JOIN landscape.tbl_template_column_config c ON t.template_id = c.template_id
WHERE t.property_type = 'mpc'
GROUP BY t.template_id, t.template_name, t.property_type, t.template_category
ORDER BY t.template_id;
