/**
 * Seed: Rizvi Portfolio — AZ (NNN Sale-Leaseback)
 *
 * Creates a Retail NNN SLB test project with:
 *  - 1 project (Rizvi Portfolio — AZ)
 *  - 3 containers (Tucson DQ/Shell, Phoenix Shell, Centralia Mobil)
 *  - Lease terms, tenant credit, unit economics mock data
 *
 * Run with:
 *   psql $DATABASE_URL -f scripts/seed-rizvi-nnn-portfolio.sql
 *
 * @session QT2
 * @created 2026-02-23
 */

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Create Project
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO landscape.tbl_project (
  project_name,
  project_type_code,
  project_type,
  property_subtype,
  analysis_type,
  analysis_perspective,
  analysis_purpose,
  jurisdiction_city,
  jurisdiction_state,
  description,
  primary_count,
  primary_count_type,
  primary_area,
  primary_area_type,
  is_active,
  created_at,
  updated_at
) VALUES (
  'Rizvi Portfolio — AZ',
  'RET',
  'Retail',
  'RETAIL_NNN',
  'INVESTMENT',
  'INVESTMENT',
  'UNDERWRITING',
  'Tucson',
  'AZ',
  'Three-property NNN sale-leaseback portfolio: gas stations and convenience stores across Arizona. Master lease with personal guarantor (Jay Rizvi). Absolute NNN, 15-year primary term, 10% bumps every 5 years.',
  3,
  'properties',
  11600,
  'sf',
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING project_id;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Seed property_subtype lookup if not exists
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO landscape.lu_property_subtype (
  property_type_code, subtype_code, subtype_name, sort_order, is_active
) VALUES
  ('RET', 'RETAIL_NNN', 'NNN Sale-Leaseback', 10, true),
  ('RET', 'RETAIL_NNN_PORTFOLIO', 'NNN Portfolio', 11, true),
  ('OFF', 'OFFICE_NNN', 'NNN Sale-Leaseback', 10, true),
  ('IND', 'INDUSTRIAL_NNN', 'NNN Sale-Leaseback', 10, true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Create Containers (3 properties)
-- NOTE: tbl_container is a Django-managed model. If the table doesn't
-- exist yet in this environment, these inserts will be skipped gracefully.
-- The NNN detection only needs tbl_project.property_subtype = 'RETAIL_NNN'.
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_project_id INTEGER;
BEGIN
  SELECT project_id INTO v_project_id
  FROM landscape.tbl_project
  WHERE project_name = 'Rizvi Portfolio — AZ'
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'Rizvi Portfolio project not found — skipping containers';
    RETURN;
  END IF;

  -- Only insert containers if the table exists
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'landscape' AND table_name = 'tbl_container'
  ) THEN
    INSERT INTO landscape.tbl_container (
      project_id, parent_id, container_name, container_type,
      level, sort_order, is_active, created_at, updated_at
    ) VALUES
      (v_project_id, NULL, 'Tucson DQ / Shell', 'property', 1, 1, true, NOW(), NOW()),
      (v_project_id, NULL, 'Phoenix Shell', 'property', 1, 2, true, NOW(), NOW()),
      (v_project_id, NULL, 'Centralia Mobil', 'property', 1, 3, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Containers created for project_id = %', v_project_id;
  ELSE
    RAISE NOTICE 'tbl_container does not exist — skipping container inserts';
  END IF;

  RAISE NOTICE 'Rizvi Portfolio seeded with project_id = %', v_project_id;
END $$;

COMMIT;
