-- GIS Foundation Migration (v2.0 - AI-First Workflow)
-- Based on landscape_neon_091525.json: tbl_project.project_id (integer PK)
-- Simplified for pure creation workflow - no reconciliation complexity

BEGIN;

-- CRITICAL: Add missing parcel_code field to existing business table
ALTER TABLE landscape.tbl_parcel 
ADD COLUMN IF NOT EXISTS parcel_code VARCHAR(20);

-- Add index for efficient lookups by parcel code
CREATE INDEX IF NOT EXISTS idx_tbl_parcel_code 
ON landscape.tbl_parcel(project_id, parcel_code);

-- 1) Tax parcel reference (assessor context for boundary selection)
CREATE TABLE IF NOT EXISTS landscape.gis_tax_parcel_ref (
  tax_parcel_id     text PRIMARY KEY,
  geom              geometry(MultiPolygon, 3857) NOT NULL,
  assessor_attrs    jsonb,
  source_updated_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gtpr_geom ON landscape.gis_tax_parcel_ref USING GIST (geom);

-- 2) Project boundary (dissolved tax parcels - user selection context)
CREATE TABLE IF NOT EXISTS landscape.gis_project_boundary (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  integer NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,
  geom        geometry(MultiPolygon, 3857) NOT NULL,
  source      text NOT NULL DEFAULT 'user_selection',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);
CREATE INDEX IF NOT EXISTS idx_gpb_geom ON landscape.gis_project_boundary USING GIST (geom);

-- 3) Plan parcel geometry (canonical from AI document ingestion)
CREATE TABLE IF NOT EXISTS landscape.gis_plan_parcel (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      integer NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,
  parcel_id       integer NOT NULL REFERENCES tbl_parcel(parcel_id) ON DELETE CASCADE,
  geom            geometry(Polygon, 3857) NOT NULL,
  source_doc      text NOT NULL, -- property package filename
  version         integer NOT NULL DEFAULT 1,
  confidence      numeric(3,2) DEFAULT 0.95, -- AI extraction confidence
  valid_from      timestamptz NOT NULL DEFAULT now(),
  valid_to        timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Enforce one active geometry per (project, parcel)
CREATE UNIQUE INDEX IF NOT EXISTS ux_gpp_active
ON landscape.gis_plan_parcel(project_id, parcel_id)
WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_gpp_geom ON landscape.gis_plan_parcel USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_gpp_confidence ON landscape.gis_plan_parcel(confidence DESC);

-- 4) AI document ingestion log (track multi-document property packages)
CREATE TABLE IF NOT EXISTS landscape.gis_document_ingestion (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      integer NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,
  package_name    text NOT NULL, -- "Red Valley Ranch Phase 1"
  document_type   text NOT NULL, -- "site_plan", "pricing_sheet", "regulation_summary"
  filename        text NOT NULL,
  ai_analysis     jsonb, -- full AI extraction results
  parcels_created integer DEFAULT 0,
  geometry_added  integer DEFAULT 0,
  status          text DEFAULT 'processing', -- processing, completed, failed
  error_details   text,
  processed_at    timestamptz DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gdi_project_package 
ON landscape.gis_document_ingestion(project_id, package_name);

-- 5) Map-ready views (join business data + geometry)

-- Plan parcels with parsed area/phase/parcel numbers
DROP VIEW IF EXISTS landscape.vw_map_plan_parcels;
CREATE VIEW landscape.vw_map_plan_parcels AS
SELECT
  gpp.project_id,
  p.parcel_id,
  p.parcel_code,
  p.landuse_code,
  p.landuse_type,
  p.acres_gross,
  p.units_total,
  -- Parse parcel_code format: A.PPP (e.g., 1.101 → Area=1, Phase=1, Parcel=1)
  CASE 
    WHEN p.parcel_code ~ '^\d+\.\d{3}$' THEN
      substring(p.parcel_code from '^(\d+)\.')::int
    ELSE NULL
  END AS area_no,
  CASE 
    WHEN p.parcel_code ~ '^\d+\.\d{3}$' THEN
      substring(p.parcel_code from '\.(\d)\d{2}$')::int
    ELSE NULL
  END AS phase_no,
  CASE 
    WHEN p.parcel_code ~ '^\d+\.\d{3}$' THEN
      substring(p.parcel_code from '\.\d(\d{2})$')::int
    ELSE NULL
  END AS parcel_no,
  gpp.geom,
  gpp.source_doc,
  gpp.confidence,
  gpp.version
FROM landscape.gis_plan_parcel gpp
JOIN tbl_parcel p ON p.parcel_id = gpp.parcel_id
WHERE gpp.is_active;

-- Tax parcels for boundary selection
DROP VIEW IF EXISTS landscape.vw_map_tax_parcels;
CREATE VIEW landscape.vw_map_tax_parcels AS
SELECT
  t.tax_parcel_id,
  t.assessor_attrs->>'OWNER_NAME' as owner_name,
  t.assessor_attrs->>'SITUS_ADDRESS' as situs_address,
  ST_Area(t.geom) / 4046.8564224 as acres,
  t.geom
FROM landscape.gis_tax_parcel_ref t;

COMMIT;

-- Helper functions for AI-first workflow

-- Function: Ingest selected tax parcels and create project boundary (unchanged)
CREATE OR REPLACE FUNCTION landscape.ingest_tax_parcel_selection(
  p_project_id integer,
  p_source text DEFAULT 'user_selection',
  p_features jsonb  -- [{"apn":"123", "geom": {...GeoJSON...}}, ...]
) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  feature jsonb;
  apn text;
  geom geometry;
BEGIN
  -- Insert/update tax parcels
  FOR feature IN SELECT * FROM jsonb_array_elements(p_features)
  LOOP
    apn := COALESCE(feature->>'apn', feature->>'APN');
    IF apn IS NULL THEN
      RAISE EXCEPTION 'Missing APN in feature';
    END IF;

    geom := ST_GeomFromGeoJSON(feature->'geom');
    IF ST_SRID(geom) = 4326 THEN
      geom := ST_Transform(geom, 3857);
    ELSIF ST_SRID(geom) IS NULL THEN
      geom := ST_SetSRID(geom, 4326);
      geom := ST_Transform(geom, 3857);
    END IF;

    INSERT INTO landscape.gis_tax_parcel_ref (tax_parcel_id, geom, source_updated_at)
    VALUES (apn, ST_Multi(ST_CollectionExtract(geom, 3)), now())
    ON CONFLICT (tax_parcel_id) DO UPDATE
      SET geom = EXCLUDED.geom, source_updated_at = now();
  END LOOP;

  -- Create dissolved project boundary
  WITH selected_apns AS (
    SELECT COALESCE(
      (jsonb_array_elements(p_features)->>'apn')::text,
      (jsonb_array_elements(p_features)->>'APN')::text
    ) AS apn
  ),
  boundary_geom AS (
    SELECT ST_Multi(ST_Union(t.geom)) as dissolved_geom
    FROM selected_apns s
    JOIN landscape.gis_tax_parcel_ref t ON t.tax_parcel_id = s.apn
  )
  INSERT INTO landscape.gis_project_boundary (project_id, geom, source)
  SELECT p_project_id, dissolved_geom, p_source
  FROM boundary_geom
  ON CONFLICT (project_id) DO UPDATE
    SET geom = EXCLUDED.geom, source = EXCLUDED.source;
END $$;

-- Function: AI property package ingestion (NEW - replaces complex reconciliation)
CREATE OR REPLACE FUNCTION landscape.ingest_ai_property_package(
  p_project_id integer,
  p_package_name text,
  p_documents jsonb, -- [{"filename": "site_plan.pdf", "type": "site_plan", "ai_analysis": {...}}]
  p_user_choice text DEFAULT 'simple' -- 'simple' or 'master_plan'
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  doc jsonb;
  doc_record uuid;
  parcel jsonb;
  area_id integer;
  phase_id integer;
  new_parcel_id integer;
  geom geometry;
  results jsonb := jsonb_build_object(
    'parcels_created', 0,
    'geometry_added', 0, 
    'areas_created', 0,
    'phases_created', 0,
    'errors', jsonb_build_array()
  );
BEGIN
  -- Process each document in the property package
  FOR doc IN SELECT * FROM jsonb_array_elements(p_documents)
  LOOP
    -- Log document ingestion
    INSERT INTO landscape.gis_document_ingestion (
      project_id, package_name, document_type, filename, ai_analysis
    ) VALUES (
      p_project_id, p_package_name, doc->>'type', doc->>'filename', doc->'ai_analysis'
    ) RETURNING id INTO doc_record;

    -- Extract parcels from AI analysis
    FOR parcel IN SELECT * FROM jsonb_array_elements(doc->'ai_analysis'->'parcels')
    LOOP
      BEGIN
        -- Handle user choice: simple vs master plan hierarchy
        IF p_user_choice = 'master_plan' THEN
          -- Parse area/phase from parcel code (1.101 → Area=1, Phase=1)
          DECLARE
            parcel_match text[];
            area_no integer;
            phase_no integer;
          BEGIN
            SELECT regexp_matches(parcel->>'parcel_code', '^(\d+)\.(\d)(\d{2})$') INTO parcel_match;
            
            IF parcel_match IS NOT NULL THEN
              area_no := parcel_match[1]::integer;
              phase_no := parcel_match[2]::integer;
              
              -- Get or create area
              SELECT a.area_id INTO area_id
              FROM landscape.tbl_area a 
              WHERE a.project_id = p_project_id AND a.area_no = area_no;
              
              IF area_id IS NULL THEN
                INSERT INTO landscape.tbl_area (project_id, area_no, area_alias)
                VALUES (p_project_id, area_no, 'Area ' || area_no)
                RETURNING area_id INTO area_id;
                
                results := jsonb_set(results, '{areas_created}', 
                  ((results->>'areas_created')::int + 1)::text::jsonb);
              END IF;
              
              -- Get or create phase
              SELECT ph.phase_id INTO phase_id
              FROM landscape.tbl_phase ph
              WHERE ph.project_id = p_project_id 
                AND ph.area_id = area_id 
                AND ph.phase_no = phase_no;
              
              IF phase_id IS NULL THEN
                INSERT INTO landscape.tbl_phase (project_id, area_id, phase_no, phase_name)
                VALUES (p_project_id, area_id, phase_no, 
                       'Phase ' || area_no || '.' || phase_no)
                RETURNING phase_id INTO phase_id;
                
                results := jsonb_set(results, '{phases_created}', 
                  ((results->>'phases_created')::int + 1)::text::jsonb);
              END IF;
            END IF;
          END;
        ELSE
          -- Simple project structure - direct to project
          area_id := NULL;
          phase_id := NULL;
        END IF;

        -- Create parcel business record
        INSERT INTO landscape.tbl_parcel (
          project_id, area_id, phase_id, parcel_code,
          landuse_code, acres_gross, units_total
        ) VALUES (
          p_project_id, area_id, phase_id, parcel->>'parcel_code',
          parcel->>'land_use', 
          (parcel->>'acres')::numeric, 
          (parcel->>'units')::integer
        ) RETURNING parcel_id INTO new_parcel_id;

        results := jsonb_set(results, '{parcels_created}', 
          ((results->>'parcels_created')::int + 1)::text::jsonb);

        -- Add geometry if available
        IF parcel ? 'geom' THEN
          geom := ST_GeomFromGeoJSON(parcel->'geom');
          IF ST_SRID(geom) = 4326 THEN
            geom := ST_Transform(geom, 3857);
          ELSIF ST_SRID(geom) IS NULL THEN
            geom := ST_SetSRID(geom, 4326);
            geom := ST_Transform(geom, 3857);
          END IF;

          INSERT INTO landscape.gis_plan_parcel (
            project_id, parcel_id, geom, source_doc, confidence
          ) VALUES (
            p_project_id, new_parcel_id, geom, 
            doc->>'filename',
            COALESCE((parcel->>'confidence')::numeric, 0.95)
          );

          results := jsonb_set(results, '{geometry_added}', 
            ((results->>'geometry_added')::int + 1)::text::jsonb);
        END IF;

      EXCEPTION WHEN OTHERS THEN
        results := jsonb_set(results, '{errors}', 
          results->'errors' || jsonb_build_array(
            'Parcel ' || (parcel->>'parcel_code') || ': ' || SQLERRM
          )
        );
      END;
    END LOOP;

    -- Update document status
    UPDATE landscape.gis_document_ingestion 
    SET status = 'completed', 
        parcels_created = (results->>'parcels_created')::integer,
        geometry_added = (results->>'geometry_added')::integer
    WHERE id = doc_record;
  END LOOP;

  RETURN results;
END $$;
