-- 20260928_division_trigger_functions_rename
--
-- Migration 025 (2025-11-19) renamed tbl_container -> tbl_division and its
-- columns (container_id -> division_id, parent_container_id ->
-- parent_division_id, container_level -> tier) but left the three PL/pgSQL
-- functions behind the table's triggers untouched. Since that date every
-- INSERT into landscape.tbl_division has failed with
--   record "new" has no field "container_level"
-- (confirmed on production 2026-09-28: newest division row is 2025-11-19;
-- the /containers route and project_cloner both insert into this table).
-- This rewrites the functions against the renamed columns. Idempotent.

CREATE OR REPLACE FUNCTION landscape.validate_container_parent()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  parent_project_id BIGINT;
  parent_level INT;
BEGIN
  IF NEW.tier = 1 THEN
    IF NEW.parent_division_id IS NOT NULL THEN
      RAISE EXCEPTION 'Tier 1 divisions cannot have a parent';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.tier BETWEEN 2 AND 5 THEN
    IF NEW.parent_division_id IS NULL THEN
      RAISE EXCEPTION 'Tier % divisions must have a parent', NEW.tier;
    END IF;

    SELECT project_id, tier
    INTO parent_project_id, parent_level
    FROM landscape.tbl_division
    WHERE division_id = NEW.parent_division_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent division % does not exist', NEW.parent_division_id;
    END IF;

    IF parent_project_id != NEW.project_id THEN
      RAISE EXCEPTION 'Parent division must belong to same project (parent project: %, child project: %)',
        parent_project_id, NEW.project_id;
    END IF;

    IF parent_level != NEW.tier - 1 THEN
      RAISE EXCEPTION 'Parent must be exactly 1 tier above (parent tier: %, child tier: %)',
        parent_level, NEW.tier;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION landscape.get_next_sort_order(p_project_id bigint, p_parent_container_id bigint DEFAULT NULL::bigint)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_max_order INT;
BEGIN
  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_max_order
  FROM landscape.tbl_division
  WHERE project_id = p_project_id
    AND (
      (p_parent_container_id IS NULL AND parent_division_id IS NULL) OR
      (parent_division_id = p_parent_container_id)
    );

  RETURN v_max_order;
END;
$function$;

CREATE OR REPLACE FUNCTION landscape.auto_populate_sort_order()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.sort_order IS NULL THEN
    NEW.sort_order := landscape.get_next_sort_order(NEW.project_id, NEW.parent_division_id);
  END IF;

  RETURN NEW;
END;
$function$;
