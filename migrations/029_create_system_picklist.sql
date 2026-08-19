-- 029_create_system_picklist.sql
-- Centralized storage for dropdown/picklist values used across the application

CREATE TABLE IF NOT EXISTS landscape.tbl_system_picklist (
    picklist_id   BIGSERIAL PRIMARY KEY,
    picklist_type VARCHAR(50) NOT NULL,
    code          VARCHAR(50) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    parent_id     BIGINT REFERENCES landscape.tbl_system_picklist(picklist_id),
    sort_order    INTEGER DEFAULT 0,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (picklist_type, code)
);

CREATE INDEX IF NOT EXISTS idx_picklist_type ON landscape.tbl_system_picklist(picklist_type);
CREATE INDEX IF NOT EXISTS idx_picklist_active ON landscape.tbl_system_picklist(is_active);
CREATE INDEX IF NOT EXISTS idx_picklist_parent ON landscape.tbl_system_picklist(parent_id);

-- Keep updated_at in sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_system_picklist_timestamp'
  ) THEN
    CREATE TRIGGER update_system_picklist_timestamp
      BEFORE UPDATE ON landscape.tbl_system_picklist
      FOR EACH ROW
      EXECUTE FUNCTION landscape.update_updated_at_column();
  END IF;
END$$;

COMMENT ON TABLE landscape.tbl_system_picklist IS 'Centralized storage for all simple dropdown/picklist values';
COMMENT ON COLUMN landscape.tbl_system_picklist.picklist_type IS 'Category: PHASE_STATUS, PROPERTY_TYPE, PROPERTY_SUBTYPE, etc.';
COMMENT ON COLUMN landscape.tbl_system_picklist.parent_id IS 'For cascading dropdowns (e.g., subtype references parent type)';

-- Seed helper to upsert without failing on re-run
CREATE OR REPLACE FUNCTION landscape._insert_picklist(
  p_type VARCHAR,
  p_code VARCHAR,
  p_name VARCHAR,
  p_description TEXT,
  p_parent_id BIGINT,
  p_sort INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO landscape.tbl_system_picklist (picklist_type, code, name, description, parent_id, sort_order)
  VALUES (p_type, p_code, p_name, p_description, p_parent_id, COALESCE(p_sort, 0))
  ON CONFLICT (picklist_type, code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order,
        is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Phase Status
SELECT landscape._insert_picklist('PHASE_STATUS', 'PLANNING', 'Planning', NULL, NULL, 1);
SELECT landscape._insert_picklist('PHASE_STATUS', 'APPROVED', 'Approved', NULL, NULL, 2);
SELECT landscape._insert_picklist('PHASE_STATUS', 'UNDER_CONSTRUCTION', 'Under Construction', NULL, NULL, 3);
SELECT landscape._insert_picklist('PHASE_STATUS', 'ACTIVE', 'Active', NULL, NULL, 4);
SELECT landscape._insert_picklist('PHASE_STATUS', 'COMPLETE', 'Complete', NULL, NULL, 5);
SELECT landscape._insert_picklist('PHASE_STATUS', 'ON_HOLD', 'On Hold', NULL, NULL, 6);
SELECT landscape._insert_picklist('PHASE_STATUS', 'CANCELLED', 'Cancelled', NULL, NULL, 7);

-- Ownership Type
SELECT landscape._insert_picklist('OWNERSHIP_TYPE', 'FEE_SIMPLE', 'Fee Simple', NULL, NULL, 1);
SELECT landscape._insert_picklist('OWNERSHIP_TYPE', 'LEASEHOLD', 'Leasehold', NULL, NULL, 2);
SELECT landscape._insert_picklist('OWNERSHIP_TYPE', 'GROUND_LEASE', 'Ground Lease', NULL, NULL, 3);
SELECT landscape._insert_picklist('OWNERSHIP_TYPE', 'CONDO', 'Condominium', NULL, NULL, 4);
SELECT landscape._insert_picklist('OWNERSHIP_TYPE', 'JV', 'Joint Venture', NULL, NULL, 5);
SELECT landscape._insert_picklist('OWNERSHIP_TYPE', 'PARTNERSHIP', 'Partnership', NULL, NULL, 6);

-- Property Type
SELECT landscape._insert_picklist('PROPERTY_TYPE', 'LAND', 'Land / MPC', NULL, NULL, 1);
SELECT landscape._insert_picklist('PROPERTY_TYPE', 'MULTIFAMILY', 'Multifamily', NULL, NULL, 2);
SELECT landscape._insert_picklist('PROPERTY_TYPE', 'OFFICE', 'Office', NULL, NULL, 3);
SELECT landscape._insert_picklist('PROPERTY_TYPE', 'RETAIL', 'Retail', NULL, NULL, 4);
SELECT landscape._insert_picklist('PROPERTY_TYPE', 'INDUSTRIAL', 'Industrial', NULL, NULL, 5);
SELECT landscape._insert_picklist('PROPERTY_TYPE', 'HOTEL', 'Hotel', NULL, NULL, 6);
SELECT landscape._insert_picklist('PROPERTY_TYPE', 'MIXED_USE', 'Mixed-Use', NULL, NULL, 7);

-- Property Class
SELECT landscape._insert_picklist('PROPERTY_CLASS', 'A', 'Class A', NULL, NULL, 1);
SELECT landscape._insert_picklist('PROPERTY_CLASS', 'B', 'Class B', NULL, NULL, 2);
SELECT landscape._insert_picklist('PROPERTY_CLASS', 'C', 'Class C', NULL, NULL, 3);
SELECT landscape._insert_picklist('PROPERTY_CLASS', 'D', 'Class D', NULL, NULL, 4);

-- Lease Status
SELECT landscape._insert_picklist('LEASE_STATUS', 'DRAFT', 'Draft', NULL, NULL, 1);
SELECT landscape._insert_picklist('LEASE_STATUS', 'PROPOSED', 'Proposed', NULL, NULL, 2);
SELECT landscape._insert_picklist('LEASE_STATUS', 'EXECUTED', 'Executed', NULL, NULL, 3);
SELECT landscape._insert_picklist('LEASE_STATUS', 'ACTIVE', 'Active', NULL, NULL, 4);
SELECT landscape._insert_picklist('LEASE_STATUS', 'EXPIRED', 'Expired', NULL, NULL, 5);
SELECT landscape._insert_picklist('LEASE_STATUS', 'TERMINATED', 'Terminated', NULL, NULL, 6);

-- Lease Type
SELECT landscape._insert_picklist('LEASE_TYPE', 'STANDARD', 'Standard', NULL, NULL, 1);
SELECT landscape._insert_picklist('LEASE_TYPE', 'AFFORDABLE', 'Affordable', NULL, NULL, 2);
SELECT landscape._insert_picklist('LEASE_TYPE', 'SECTION_8', 'Section 8', NULL, NULL, 3);
SELECT landscape._insert_picklist('LEASE_TYPE', 'CORPORATE', 'Corporate', NULL, NULL, 4);
SELECT landscape._insert_picklist('LEASE_TYPE', 'SHORT_TERM', 'Short-Term', NULL, NULL, 5);
SELECT landscape._insert_picklist('LEASE_TYPE', 'STUDENT', 'Student', NULL, NULL, 6);

-- Inflation Type
SELECT landscape._insert_picklist('INFLATION_TYPE', 'NONE', 'None', NULL, NULL, 1);
SELECT landscape._insert_picklist('INFLATION_TYPE', 'GLOBAL', 'Global (Use Benchmark)', NULL, NULL, 2);
SELECT landscape._insert_picklist('INFLATION_TYPE', 'CUSTOM', 'Custom Rate', NULL, NULL, 3);

-- Analysis Type
SELECT landscape._insert_picklist('ANALYSIS_TYPE', 'LAND_DEV', 'Land Development', NULL, NULL, 1);
SELECT landscape._insert_picklist('ANALYSIS_TYPE', 'INCOME', 'Income Property', NULL, NULL, 2);

-- Property Subtype (requires parent property types)
DO $$
DECLARE
  parent_code VARCHAR;
  subtype_code VARCHAR;
  subtype_name VARCHAR;
  sort_no INTEGER;
  parent_id BIGINT;
BEGIN
  FOR parent_code, subtype_code, subtype_name, sort_no IN
    SELECT * FROM (VALUES
      ('MULTIFAMILY', 'GARDEN', 'Garden', 1),
      ('MULTIFAMILY', 'MID_RISE', 'Mid-Rise', 2),
      ('MULTIFAMILY', 'HIGH_RISE', 'High-Rise', 3),
      ('MULTIFAMILY', 'STUDENT', 'Student Housing', 4),
      ('MULTIFAMILY', 'SENIOR', 'Senior Housing', 5),
      ('MULTIFAMILY', 'AFFORDABLE', 'Affordable', 6),
      ('LAND', 'FOR_SALE', 'For Sale Residential', 1),
      ('LAND', 'FOR_RENT', 'For Rent Residential', 2),
      ('LAND', 'COMMERCIAL', 'Commercial', 3),
      ('OFFICE', 'CLASS_A', 'Class A Office', 1),
      ('OFFICE', 'CLASS_B', 'Class B Office', 2),
      ('OFFICE', 'MEDICAL', 'Medical Office', 3),
      ('OFFICE', 'FLEX', 'Flex/R&D', 4),
      ('RETAIL', 'NEIGHBORHOOD', 'Neighborhood Center', 1),
      ('RETAIL', 'COMMUNITY', 'Community Center', 2),
      ('RETAIL', 'POWER', 'Power Center', 3),
      ('RETAIL', 'LIFESTYLE', 'Lifestyle Center', 4),
      ('RETAIL', 'STRIP', 'Strip Center', 5),
      ('INDUSTRIAL', 'WAREHOUSE', 'Warehouse/Distribution', 1),
      ('INDUSTRIAL', 'MANUFACTURING', 'Manufacturing', 2),
      ('INDUSTRIAL', 'FLEX_SPACE', 'Flex Space', 3),
      ('INDUSTRIAL', 'COLD_STORAGE', 'Cold Storage', 4),
      ('INDUSTRIAL', 'SELF_STORAGE', 'Self-Storage', 5)
    ) AS t(parent_code, subtype_code, subtype_name, sort_no)
  LOOP
    SELECT picklist_id INTO parent_id
    FROM landscape.tbl_system_picklist
    WHERE picklist_type = 'PROPERTY_TYPE' AND code = parent_code
    LIMIT 1;

    IF parent_id IS NOT NULL THEN
      PERFORM landscape._insert_picklist('PROPERTY_SUBTYPE', subtype_code, subtype_name, NULL, parent_id, sort_no);
    END IF;
  END LOOP;
END$$;

-- Cleanup helper
DROP FUNCTION IF EXISTS landscape._insert_picklist(
  VARCHAR, VARCHAR, VARCHAR, TEXT, BIGINT, INTEGER
);
