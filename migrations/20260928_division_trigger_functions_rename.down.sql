-- Rollback for 20260928_division_trigger_functions_rename.
--
-- Restores the three trigger/helper functions exactly as they stood before the
-- fix. NOTE: the restored bodies reference tbl_container / container_level /
-- parent_container_id, which migration 025 renamed on 2025-11-19, so restoring
-- them re-breaks every INSERT into landscape.tbl_division. Roll back only to
-- reproduce the pre-fix state.

CREATE OR REPLACE FUNCTION landscape.validate_container_parent()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION landscape.auto_populate_sort_order()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only auto-populate on INSERT and if sort_order is NULL
  IF TG_OP = 'INSERT' AND NEW.sort_order IS NULL THEN
    NEW.sort_order := landscape.get_next_sort_order(NEW.project_id, NEW.parent_container_id);
  END IF;

  RETURN NEW;
END;
$function$


CREATE OR REPLACE FUNCTION landscape.get_next_sort_order(p_project_id bigint, p_parent_container_id bigint DEFAULT NULL::bigint)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
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
$function$

