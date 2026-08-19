-- Fix auto_create_containers_from_inventory to handle level 1 hierarchy columns
-- The original function assumed all hierarchies start at level 2 with an implied level 1 "Property"
-- But MPC projects have hierarchy starting at level 1 (Area)

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
  v_min_level INT;
BEGIN
  -- Get the inventory item
  SELECT * INTO v_item
  FROM landscape.tbl_inventory_item
  WHERE item_id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item % not found', p_item_id;
  END IF;

  -- Find the minimum container level for this project's hierarchy
  SELECT MIN(container_level) INTO v_min_level
  FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p_project_id
    AND column_type = 'hierarchy';

  -- Initialize parent as NULL (will be used for level 1 containers)
  v_parent_container_id := NULL;

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
      -- Check if container already exists at this level
      IF v_hierarchy_cols.container_level = 1 THEN
        -- Level 1: no parent
        SELECT container_id INTO v_current_container_id
        FROM landscape.tbl_container
        WHERE project_id = p_project_id
          AND container_level = 1
          AND parent_container_id IS NULL
          AND display_name = v_container_name
          AND is_active = true
        LIMIT 1;
      ELSE
        -- Levels 2+: must have parent
        SELECT container_id INTO v_current_container_id
        FROM landscape.tbl_container
        WHERE project_id = p_project_id
          AND container_level = v_hierarchy_cols.container_level
          AND parent_container_id = v_parent_container_id
          AND display_name = v_container_name
          AND is_active = true
        LIMIT 1;
      END IF;

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
          CASE
            WHEN v_hierarchy_cols.container_level = 1 THEN NULL
            ELSE v_parent_container_id
          END,
          v_hierarchy_cols.container_level,
          -- Generate unique container_code using level, parent, and name
          'L' || v_hierarchy_cols.container_level || '-' ||
          COALESCE(v_parent_container_id::text || '-', '') ||
          REPLACE(v_container_name, ' ', '-'),
          v_container_name,
          0,
          true
        ) RETURNING container_id INTO v_current_container_id;
      END IF;

      -- Update parent for next level
      v_parent_container_id := v_current_container_id;
    END IF;
  END LOOP;

  -- Update inventory item with the deepest container ID
  UPDATE landscape.tbl_inventory_item
  SET container_id = v_parent_container_id
  WHERE item_id = p_item_id;

  RETURN v_parent_container_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.auto_create_containers_from_inventory IS
'Creates container hierarchy from inventory item hierarchy values.
Handles both level-1-starting hierarchies (MPC: Area→Phase→Parcel) and
level-2-starting hierarchies (Multifamily: Property implied, Building→Floor→Unit).';
