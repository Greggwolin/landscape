-- 031_fix_picklist_codes_match_constraints.sql
-- Fixes PROPERTY_TYPE picklist codes to match the CHECK constraint on tbl_project.project_type_code
-- CHECK constraint allows: LAND, MF, OFF, RET, IND, HTL, MXU
-- Current picklist has: LAND, MULTIFAMILY, OFFICE, RETAIL, INDUSTRIAL, HOTEL, MIXED_USE

-- Update PROPERTY_TYPE codes to match CHECK constraint
UPDATE landscape.tbl_system_picklist
SET code = 'MF', name = 'Multifamily', updated_at = NOW()
WHERE picklist_type = 'PROPERTY_TYPE' AND code = 'MULTIFAMILY';

UPDATE landscape.tbl_system_picklist
SET code = 'OFF', updated_at = NOW()
WHERE picklist_type = 'PROPERTY_TYPE' AND code = 'OFFICE';

UPDATE landscape.tbl_system_picklist
SET code = 'RET', updated_at = NOW()
WHERE picklist_type = 'PROPERTY_TYPE' AND code = 'RETAIL';

UPDATE landscape.tbl_system_picklist
SET code = 'IND', updated_at = NOW()
WHERE picklist_type = 'PROPERTY_TYPE' AND code = 'INDUSTRIAL';

UPDATE landscape.tbl_system_picklist
SET code = 'HTL', updated_at = NOW()
WHERE picklist_type = 'PROPERTY_TYPE' AND code = 'HOTEL';

UPDATE landscape.tbl_system_picklist
SET code = 'MXU', updated_at = NOW()
WHERE picklist_type = 'PROPERTY_TYPE' AND code = 'MIXED_USE';

-- Now fix PROPERTY_SUBTYPE parent references
-- The parent_id references should still be valid since we only changed code, not picklist_id

-- Update PROPERTY_SUBTYPE parent lookup to work with new codes
-- First, let's make sure subtypes are linked correctly by updating any that reference old parent codes

-- Add missing subtypes for Land Development
DO $$
DECLARE
  land_parent_id BIGINT;
BEGIN
  SELECT picklist_id INTO land_parent_id
  FROM landscape.tbl_system_picklist
  WHERE picklist_type = 'PROPERTY_TYPE' AND code = 'LAND'
  LIMIT 1;

  IF land_parent_id IS NOT NULL THEN
    -- Insert Land Development subtypes matching project-taxonomy.ts
    INSERT INTO landscape.tbl_system_picklist
      (picklist_type, code, name, parent_id, sort_order, is_active)
    VALUES
      ('PROPERTY_SUBTYPE', 'MPC', 'Master Planned Community', land_parent_id, 1, true),
      ('PROPERTY_SUBTYPE', 'SUBDIV', 'Subdivision', land_parent_id, 2, true),
      ('PROPERTY_SUBTYPE', 'MF_DEV', 'Multifamily Development', land_parent_id, 3, true),
      ('PROPERTY_SUBTYPE', 'COMM_DEV', 'Commercial Development', land_parent_id, 4, true),
      ('PROPERTY_SUBTYPE', 'IND_DEV', 'Industrial Development', land_parent_id, 5, true),
      ('PROPERTY_SUBTYPE', 'MXU_DEV', 'Mixed-Use Development', land_parent_id, 6, true)
    ON CONFLICT (picklist_type, code) DO UPDATE
      SET name = EXCLUDED.name,
          parent_id = EXCLUDED.parent_id,
          sort_order = EXCLUDED.sort_order,
          is_active = true;
  END IF;
END$$;

-- Add Hotel subtypes
DO $$
DECLARE
  hotel_parent_id BIGINT;
BEGIN
  SELECT picklist_id INTO hotel_parent_id
  FROM landscape.tbl_system_picklist
  WHERE picklist_type = 'PROPERTY_TYPE' AND code = 'HTL'
  LIMIT 1;

  IF hotel_parent_id IS NOT NULL THEN
    INSERT INTO landscape.tbl_system_picklist
      (picklist_type, code, name, parent_id, sort_order, is_active)
    VALUES
      ('PROPERTY_SUBTYPE', 'FULL_SVC', 'Full Service', hotel_parent_id, 1, true),
      ('PROPERTY_SUBTYPE', 'SELECT_SVC', 'Select Service', hotel_parent_id, 2, true),
      ('PROPERTY_SUBTYPE', 'EXTENDED', 'Extended Stay', hotel_parent_id, 3, true),
      ('PROPERTY_SUBTYPE', 'RESORT', 'Resort', hotel_parent_id, 4, true)
    ON CONFLICT (picklist_type, code) DO UPDATE
      SET name = EXCLUDED.name,
          parent_id = EXCLUDED.parent_id,
          sort_order = EXCLUDED.sort_order,
          is_active = true;
  END IF;
END$$;

-- Add Mixed-Use subtypes
DO $$
DECLARE
  mxu_parent_id BIGINT;
BEGIN
  SELECT picklist_id INTO mxu_parent_id
  FROM landscape.tbl_system_picklist
  WHERE picklist_type = 'PROPERTY_TYPE' AND code = 'MXU'
  LIMIT 1;

  IF mxu_parent_id IS NOT NULL THEN
    INSERT INTO landscape.tbl_system_picklist
      (picklist_type, code, name, parent_id, sort_order, is_active)
    VALUES
      ('PROPERTY_SUBTYPE', 'OFF_RET', 'Office/Retail', mxu_parent_id, 1, true),
      ('PROPERTY_SUBTYPE', 'OFF_MF', 'Office/Multifamily', mxu_parent_id, 2, true),
      ('PROPERTY_SUBTYPE', 'RET_MF', 'Retail/Multifamily', mxu_parent_id, 3, true)
    ON CONFLICT (picklist_type, code) DO UPDATE
      SET name = EXCLUDED.name,
          parent_id = EXCLUDED.parent_id,
          sort_order = EXCLUDED.sort_order,
          is_active = true;
  END IF;
END$$;

-- Add OWNERSHIP_TYPE entries that are missing
INSERT INTO landscape.tbl_system_picklist
  (picklist_type, code, name, sort_order, is_active)
VALUES
  ('OWNERSHIP_TYPE', 'LEASED_FEE', 'Leased Fee', 2, true)
ON CONFLICT (picklist_type, code) DO UPDATE
  SET name = EXCLUDED.name,
      sort_order = EXCLUDED.sort_order,
      is_active = true;

-- Verify the changes
-- SELECT picklist_type, code, name, sort_order FROM landscape.tbl_system_picklist WHERE picklist_type = 'PROPERTY_TYPE' ORDER BY sort_order;
-- SELECT picklist_type, code, name, parent_id, sort_order FROM landscape.tbl_system_picklist WHERE picklist_type = 'PROPERTY_SUBTYPE' ORDER BY parent_id, sort_order;
