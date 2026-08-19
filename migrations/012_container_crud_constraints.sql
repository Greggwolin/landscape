-- =====================================================
-- Migration 012: Container CRUD Constraints & Validation
-- =====================================================
-- Description: Add validation functions and constraints for container CRUD operations
-- Date: October 15, 2025
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Enhanced parent validation trigger
-- =====================================================
-- This trigger validates container parent-child relationships

CREATE OR REPLACE FUNCTION landscape.validate_container_parent()
RETURNS TRIGGER AS $$
DECLARE
  parent_project_id BIGINT;
  parent_level INT;
BEGIN
  -- Level 1: ensure no parent
  IF NEW.container_level = 1 THEN
    IF NEW.parent_container_id IS NOT NULL THEN
      RAISE EXCEPTION 'Level 1 containers cannot have a parent';
    END IF;
    RETURN NEW;
  END IF;

  -- Level 2/3: ensure parent exists and is correct level
  IF NEW.container_level IN (2, 3) THEN
    IF NEW.parent_container_id IS NULL THEN
      RAISE EXCEPTION 'Level % containers must have a parent', NEW.container_level;
    END IF;

    -- Check parent exists, belongs to same project, and is correct level
    SELECT project_id, container_level
    INTO parent_project_id, parent_level
    FROM landscape.tbl_container
    WHERE container_id = NEW.parent_container_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent container % does not exist', NEW.parent_container_id;
    END IF;

    IF parent_project_id != NEW.project_id THEN
      RAISE EXCEPTION 'Parent container must belong to same project (parent project: %, child project: %)',
        parent_project_id, NEW.project_id;
    END IF;

    IF parent_level != NEW.container_level - 1 THEN
      RAISE EXCEPTION 'Parent must be exactly 1 level above (parent level: %, child level: %)',
        parent_level, NEW.container_level;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_validate_container_parent ON landscape.tbl_container;

CREATE TRIGGER trigger_validate_container_parent
BEFORE INSERT OR UPDATE ON landscape.tbl_container
FOR EACH ROW EXECUTE FUNCTION landscape.validate_container_parent();

COMMENT ON FUNCTION landscape.validate_container_parent() IS
'Validates container parent-child relationships: Level 1 has no parent, Levels 2/3 must have parent exactly 1 level above';

-- =====================================================
-- 2. Function to check if container can be safely deleted
-- =====================================================

CREATE OR REPLACE FUNCTION landscape.can_delete_container(p_container_id BIGINT)
RETURNS TABLE (
  can_delete BOOLEAN,
  reason TEXT,
  child_count INT,
  budget_count INT,
  actual_count INT
) AS $$
DECLARE
  v_child_count INT;
  v_budget_count INT;
  v_actual_count INT;
BEGIN
  -- Check for child containers
  SELECT COUNT(*) INTO v_child_count
  FROM landscape.tbl_container
  WHERE parent_container_id = p_container_id
    AND is_active = true;

  -- Check for budget items
  SELECT COUNT(*) INTO v_budget_count
  FROM landscape.core_fin_fact_budget
  WHERE container_id = p_container_id;

  -- Check for actual costs
  SELECT COUNT(*) INTO v_actual_count
  FROM landscape.core_fin_fact_actual
  WHERE container_id = p_container_id;

  -- Determine if safe to delete
  IF v_child_count > 0 THEN
    RETURN QUERY SELECT false, 'Has child containers'::TEXT, v_child_count, v_budget_count, v_actual_count;
  ELSIF v_budget_count > 0 THEN
    RETURN QUERY SELECT false, 'Has budget items'::TEXT, v_child_count, v_budget_count, v_actual_count;
  ELSIF v_actual_count > 0 THEN
    RETURN QUERY SELECT false, 'Has actual cost records'::TEXT, v_child_count, v_budget_count, v_actual_count;
  ELSE
    RETURN QUERY SELECT true, 'Safe to delete'::TEXT, v_child_count, v_budget_count, v_actual_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.can_delete_container(BIGINT) IS
'Checks if a container can be safely deleted by verifying it has no children, budget items, or actual costs';

-- =====================================================
-- 3. Function to auto-generate next container code
-- =====================================================

CREATE OR REPLACE FUNCTION landscape.generate_container_code(
  p_project_id BIGINT,
  p_container_level INT,
  p_parent_container_id BIGINT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_max_num INT;
  v_next_num INT;
BEGIN
  -- Determine prefix based on level
  CASE p_container_level
    WHEN 1 THEN v_prefix := 'AREA-';
    WHEN 2 THEN v_prefix := 'PHASE-';
    WHEN 3 THEN v_prefix := 'UNIT-';
    ELSE v_prefix := 'CONT-';
  END CASE;

  -- Find max number for this prefix in project
  SELECT COALESCE(
    MAX(
      CASE
        WHEN container_code ~ ('^' || v_prefix || '[0-9]+$')
        THEN NULLIF(regexp_replace(container_code, '[^0-9]', '', 'g'), '')::INT
        ELSE NULL
      END
    ), 0
  ) INTO v_max_num
  FROM landscape.tbl_container
  WHERE project_id = p_project_id
    AND container_level = p_container_level;

  v_next_num := v_max_num + 1;

  RETURN v_prefix || v_next_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.generate_container_code(BIGINT, INT, BIGINT) IS
'Auto-generates next sequential container code for a project/level (e.g., AREA-1, AREA-2, PHASE-1, etc.)';

-- =====================================================
-- 4. Function to get next sort_order for siblings
-- =====================================================

CREATE OR REPLACE FUNCTION landscape.get_next_sort_order(
  p_project_id BIGINT,
  p_parent_container_id BIGINT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
  v_max_order INT;
BEGIN
  -- Find max sort_order among siblings (same parent)
  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_max_order
  FROM landscape.tbl_container
  WHERE project_id = p_project_id
    AND (
      (p_parent_container_id IS NULL AND parent_container_id IS NULL) OR
      (parent_container_id = p_parent_container_id)
    );

  RETURN v_max_order;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.get_next_sort_order(BIGINT, BIGINT) IS
'Returns next available sort_order value for siblings (containers with same parent)';

-- =====================================================
-- 5. Trigger to auto-populate sort_order if not provided
-- =====================================================

CREATE OR REPLACE FUNCTION landscape.auto_populate_sort_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-populate on INSERT and if sort_order is NULL
  IF TG_OP = 'INSERT' AND NEW.sort_order IS NULL THEN
    NEW.sort_order := landscape.get_next_sort_order(NEW.project_id, NEW.parent_container_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_populate_sort_order ON landscape.tbl_container;

CREATE TRIGGER trigger_auto_populate_sort_order
BEFORE INSERT ON landscape.tbl_container
FOR EACH ROW EXECUTE FUNCTION landscape.auto_populate_sort_order();

COMMENT ON FUNCTION landscape.auto_populate_sort_order() IS
'Automatically populates sort_order with next sequential value if not provided on INSERT';

-- =====================================================
-- 6. Updated timestamp trigger (if not exists)
-- =====================================================

CREATE OR REPLACE FUNCTION landscape.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_container_timestamp ON landscape.tbl_container;

CREATE TRIGGER trigger_update_container_timestamp
BEFORE UPDATE ON landscape.tbl_container
FOR EACH ROW EXECUTE FUNCTION landscape.update_updated_at_column();

COMMENT ON FUNCTION landscape.update_updated_at_column() IS
'Automatically updates updated_at timestamp on UPDATE';

COMMIT;

-- =====================================================
-- Validation Queries
-- =====================================================

-- Test parent validation function
DO $$
BEGIN
  RAISE NOTICE 'Testing can_delete_container function...';

  -- Should work for any container
  PERFORM * FROM landscape.can_delete_container(1);

  RAISE NOTICE 'can_delete_container function works!';
END $$;

-- Test code generation function
DO $$
DECLARE
  v_test_code TEXT;
BEGIN
  RAISE NOTICE 'Testing generate_container_code function...';

  v_test_code := landscape.generate_container_code(7, 1);
  RAISE NOTICE 'Generated code for project 7, level 1: %', v_test_code;

  RAISE NOTICE 'generate_container_code function works!';
END $$;

-- Test sort_order function
DO $$
DECLARE
  v_test_order INT;
BEGIN
  RAISE NOTICE 'Testing get_next_sort_order function...';

  v_test_order := landscape.get_next_sort_order(7, NULL);
  RAISE NOTICE 'Next sort_order for project 7, root level: %', v_test_order;

  RAISE NOTICE 'get_next_sort_order function works!';
END $$;
