-- Migration: Subtype Classifier → Tag Bridge
-- Date: 2026-02-18
-- Description: Creates ai_document_subtypes table, seeds subtypes,
--              adds subtype_code column to dms_doc_tags, and seeds
--              subtype-linked tags for the bridge between classification
--              and the user-facing tag system.

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

BEGIN;

-- Step 1: Create ai_document_subtypes table
-- Stores property/document subtypes used by the DocumentSubtypeClassifier
-- to inject specialized extraction strategies (priority_fields, special_instructions).
CREATE TABLE IF NOT EXISTS landscape.ai_document_subtypes (
  subtype_id SERIAL PRIMARY KEY,
  subtype_code VARCHAR(50) NOT NULL UNIQUE,
  subtype_name VARCHAR(100) NOT NULL,
  property_type VARCHAR(20) NOT NULL DEFAULT 'multifamily',
  description TEXT,
  detection_patterns JSONB NOT NULL DEFAULT '[]',
  priority_fields JSONB NOT NULL DEFAULT '[]',
  skip_fields JSONB NOT NULL DEFAULT '[]',
  special_instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_doc_subtypes_property_type
  ON landscape.ai_document_subtypes (property_type)
  WHERE is_active = TRUE;

-- Step 2: Seed subtypes
INSERT INTO landscape.ai_document_subtypes
  (subtype_code, subtype_name, property_type, description, detection_patterns, priority_fields, special_instructions)
VALUES
  ('garden_mf', 'Garden-Style Multifamily', 'multifamily',
   'Low-rise (1-3 story) garden-style apartment communities with surface parking',
   '["garden", "garden-style", "garden style", "surface parking", "low-rise", "low rise", "1-story", "2-story", "3-story", "walk-up"]',
   '["unit_count", "avg_rent", "parking_ratio", "lot_size", "density"]',
   'Focus on outdoor amenity areas, landscaping costs, parking lot maintenance. Garden-style properties typically have higher land-to-building ratios.'),

  ('midrise_mf', 'Mid-Rise Multifamily', 'multifamily',
   'Mid-rise (4-7 story) apartment buildings with structured parking',
   '["mid-rise", "mid rise", "midrise", "4-story", "5-story", "6-story", "7-story", "structured parking", "parking garage", "elevator"]',
   '["unit_count", "avg_rent", "parking_ratio", "construction_type", "elevator_count"]',
   'Mid-rise properties have higher construction costs per unit. Pay attention to elevator maintenance, structured parking costs, and fire safety systems.'),

  ('highrise_mf', 'High-Rise Multifamily', 'multifamily',
   'High-rise (8+ story) luxury or urban apartment towers',
   '["high-rise", "high rise", "highrise", "tower", "luxury", "8-story", "10-story", "12-story", "15-story", "20-story", "concierge", "doorman"]',
   '["unit_count", "avg_rent", "concierge", "amenity_package", "parking_type"]',
   'High-rise properties command premium rents but have significantly higher operating costs. Focus on concierge/doorman costs, elevator maintenance, common area utilities, and insurance.'),

  ('student', 'Student Housing', 'multifamily',
   'Purpose-built student housing near universities, often rented by the bed',
   '["student", "university", "college", "campus", "by the bed", "per bed", "bed count", "academic", "semester", "dorm"]',
   '["bed_count", "beds_per_unit", "university_name", "distance_to_campus", "academic_year_occupancy"]',
   'Student housing is typically priced per bed, not per unit. Lease terms follow academic calendars. Focus on bed count, turn costs, and summer vacancy patterns.'),

  ('affordable', 'Affordable/LIHTC', 'multifamily',
   'Affordable housing with income restrictions (LIHTC, Section 8, HUD)',
   '["affordable", "lihtc", "low-income", "low income", "section 8", "sec 8", "hud", "tax credit", "income restricted", "ami", "area median income", "compliance"]',
   '["ami_levels", "tax_credit_type", "compliance_period", "rent_limits", "income_limits"]',
   'Affordable properties have rent ceilings tied to AMI. Focus on compliance requirements, LIHTC credit delivery, rent limit calculations, and regulatory agreements.'),

  ('senior', 'Senior Living', 'multifamily',
   'Age-restricted (55+) independent living or assisted living communities',
   '["senior", "55+", "55 and over", "age-restricted", "age restricted", "independent living", "assisted living", "memory care", "active adult"]',
   '["care_level", "unit_types", "staffing_ratio", "meal_service", "age_restriction"]',
   'Senior living has additional operational complexity: staffing, meal services, health services. Distinguish between independent living (lower OpEx) and assisted living (higher OpEx with care staff).'),

  ('mixed_use', 'Mixed-Use Development', 'multifamily',
   'Mixed-use properties combining residential with retail/office/hospitality',
   '["mixed-use", "mixed use", "retail component", "ground floor retail", "live-work", "live work", "residential over retail"]',
   '["residential_units", "commercial_sf", "retail_sf", "residential_pct", "commercial_pct"]',
   'Mixed-use properties require separate analysis for residential and commercial components. Pay attention to common area allocation, shared parking, and separate utility metering.'),

  ('master_planned', 'Master Planned Community', 'land',
   'Large-scale master planned communities with multiple phases and product types',
   '["master planned", "master-planned", "mpc", "phases", "amenity center", "community", "development plan", "plat", "entitlement"]',
   '["total_acres", "total_lots", "phase_count", "product_mix", "amenity_budget"]',
   'Master planned communities are complex multi-phase developments. Focus on phasing strategy, infrastructure costs, HOA structure, amenity timing, and absorption rates per product type.'),

  ('infill', 'Infill Development', 'land',
   'Urban or suburban infill development on previously developed or underutilized land',
   '["infill", "urban infill", "redevelopment", "brownfield", "greyfield", "teardown", "demolition", "remediation"]',
   '["demolition_cost", "remediation_cost", "entitlement_risk", "density_bonus", "existing_structures"]',
   'Infill sites often have demolition, remediation, or entitlement challenges. Focus on site preparation costs, environmental conditions, and density allowances.'),

  ('build_to_rent', 'Build-to-Rent', 'land',
   'Purpose-built single-family or townhome rental communities',
   '["build-to-rent", "build to rent", "btr", "bfr", "single-family rental", "sfr community", "townhome rental", "horizontal multifamily"]',
   '["home_count", "avg_home_size", "avg_rent", "lot_size", "hoa_fee"]',
   'Build-to-rent communities are managed like multifamily but built like single-family. Focus on per-home construction costs, HOA structure, property management model, and maintenance reserves.'),

  ('office_suburban', 'Suburban Office', 'office',
   'Suburban office buildings or campus-style office parks',
   '["suburban office", "office park", "campus", "flex space", "class b", "class c"]',
   '["rentable_sf", "occupancy_rate", "parking_ratio", "tenant_count", "walt"]',
   'Suburban office faces remote work headwinds. Focus on tenant retention, TI allowances, parking adequacy, and flex space conversion potential.'),

  ('office_cbd', 'CBD/Urban Office', 'office',
   'Central business district or urban core Class A office buildings',
   '["class a", "cbd", "downtown", "central business district", "trophy", "urban core"]',
   '["rentable_sf", "occupancy_rate", "tenant_improvements", "base_year_stops", "walt"]',
   'CBD office commands premium rents but has higher operating costs. Focus on base year stops, operating expense escalations, tenant improvement allowances, and competitive set analysis.'),

  ('retail_strip', 'Strip/Neighborhood Retail', 'retail',
   'Strip malls, neighborhood shopping centers, and convenience retail',
   '["strip mall", "strip center", "neighborhood retail", "convenience retail", "shopping center", "anchor tenant"]',
   '["gla", "anchor_tenant", "occupancy_rate", "cam_recovery", "rent_per_sf"]',
   'Strip retail relies heavily on anchor tenants. Focus on anchor tenant credit, CAM recovery rates, inline tenant mix, and co-tenancy clauses.')
ON CONFLICT (subtype_code) DO NOTHING;

-- Step 3: Add subtype_code column to dms_doc_tags
ALTER TABLE landscape.dms_doc_tags
  ADD COLUMN IF NOT EXISTS subtype_code VARCHAR(50) DEFAULT NULL;

-- Step 4: Seed tags from active subtypes
INSERT INTO landscape.dms_doc_tags (tag_name, workspace_id, usage_count, created_at)
SELECT
  subtype_name,
  1,  -- default workspace
  0,
  NOW()
FROM landscape.ai_document_subtypes
WHERE is_active = TRUE
ON CONFLICT (tag_name, workspace_id) DO NOTHING;

-- Step 5: Link seeded tags back to their subtypes
UPDATE landscape.dms_doc_tags t
SET subtype_code = s.subtype_code
FROM landscape.ai_document_subtypes s
WHERE t.tag_name = s.subtype_name
  AND s.is_active = TRUE
  AND t.workspace_id = 1;

COMMIT;

-- ============================================================================
-- DOWN MIGRATION (rollback)
-- ============================================================================
-- ALTER TABLE landscape.dms_doc_tags DROP COLUMN IF EXISTS subtype_code;
-- DELETE FROM landscape.dms_doc_tags WHERE tag_name IN (
--   SELECT subtype_name FROM landscape.ai_document_subtypes
-- );
-- DROP TABLE IF EXISTS landscape.ai_document_subtypes;
