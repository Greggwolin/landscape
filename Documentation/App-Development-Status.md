# Landscape App - Comprehensive Development Documentation

*Last Updated: October 3, 2025*
*Purpose: Complete reference document for Claude Project context*

---

## 📋 Table of Contents

1. [Technology Stack](#technology-stack)
2. [Database Architecture](#database-architecture)
3. [API Routes Reference](#api-routes-reference)
4. [Application Pages](#application-pages)
5. [Component Architecture](#component-architecture)
6. [Feature Status](#feature-status)
7. [Known Bugs & Issues](#known-bugs--issues)
8. [Recent Development Activity](#recent-development-activity)
9. [Technical Debt](#technical-debt)

---

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 15.5.0 (with Turbopack dev server)
- **React**: 19.1.0
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS 3.4.17
- **UI Libraries**:
  - Material-UI (MUI) 7.3.1 (DataGrid, Charts, DatePickers)
  - Radix UI (Dialogs, Dropdowns, Tooltips)
  - Handsontable 16.0.0 (Budget Grid)
  - React Data Grid 7.0.0-beta.57
- **State Management**:
  - SWR 2.3.6 (data fetching)
  - React Context (ProjectProvider)
- **Maps**: MapLibre GL 5.7.3 with @turf/turf 7.2.0
- **Forms**: React Hook Form 7.62.0 + Zod 4.1.5
- **Drag & Drop**: React DnD 16.0.1

### Backend
- **Database**: Neon PostgreSQL (Serverless)
  - Connection: `@neondatabase/serverless` 1.0.1
  - Schema: `landscape` (74 tables)
  - Database: `land_v2`
- **API**: Next.js App Router API Routes
- **AI Integration**:
  - Anthropic Claude SDK 0.65.0
  - OpenAI SDK 6.0.0
- **Document Processing**:
  - PDF: pdf-parse, pdf2pic, pdfjs-dist 5.4.149
  - OCR: Tesseract.js 6.0.1
  - DOCX: mammoth
- **File Uploads**: UploadThing 7.7.4
- **Search**: MeiliSearch 0.53.0

### Development
- **Dev Server**: Running on port 3007 (http://localhost:3007)
- **Linting**: ESLint 9 + Next.js config
- **Git Hooks**: Husky 9 + lint-staged
- **Package Manager**: npm

---

## 🗄 Database Architecture

### Overview
- **Database**: `land_v2` (Neon PostgreSQL)
- **Primary Schema**: `landscape`
- **Total Tables**: 74
- **Connection**: Serverless via `@neondatabase/serverless`
- **Query Method**: Tagged template literals via `sql` helper in `/src/lib/db.ts`

### Core Tables

#### Projects & Hierarchy

**`tbl_project`** - Master project table
```sql
Columns:
  project_id (PK, identity)        - Unique project identifier
  project_name (varchar 255)       - Project name (unique constraint)
  acres_gross (float)              - Total project acreage
  location_lat/lon (float)         - Geocoordinates
  start_date (date)                - Project start date
  jurisdiction_city (varchar 100)  - City jurisdiction
  jurisdiction_county (varchar 100)- County jurisdiction
  jurisdiction_state (varchar 10)  - State (AZ, CA, etc.)
  uses_global_taxonomy (boolean)   - Use global land use taxonomy
  taxonomy_customized (boolean)    - Has custom taxonomy
  jurisdiction_integrated (boolean)- Jurisdiction data integrated
  gis_metadata (jsonb)             - GIS setup and boundary data
  project_address (text)           - Physical address
  legal_owner (text)               - Legal entity owner
  county (varchar 100)             - County name (default: Maricopa)
  existing_land_use (text)         - Current land use
  assessed_value (numeric 15,2)    - Tax assessed value
  ai_last_reviewed (timestamptz)   - Last AI document review

References: 32 foreign key constraints from other tables
```

**`tbl_area`** - Level 1 planning containers (Areas)
```sql
Columns:
  area_id (PK, identity)
  project_id (FK → tbl_project)
  area_alias (varchar 255) - Display name
  area_no (integer)        - Numeric identifier

Unique constraint: (project_id, area_no)
Referenced by: tbl_phase, tbl_parcel
```

**`tbl_phase`** - Level 2 planning containers (Phases)
```sql
Columns:
  phase_id (PK, identity)
  area_id (FK → tbl_area)
  phase_name (varchar 255)
  phase_no (integer)
  project_id (integer)
  label (text)
  description (text)

Referenced by: tbl_parcel, tbl_budget, core_doc
```

**`tbl_parcel`** - Level 3 planning units (Parcels)
```sql
Columns:
  parcel_id (PK, identity)
  area_id (FK → tbl_area)
  phase_id (FK → tbl_phase)
  project_id (integer)

  -- Legacy land use fields
  landuse_code (varchar 10, FK → tbl_landuse)
  landuse_type (varchar 50)

  -- New taxonomy fields (current system)
  family_name (text)           - e.g., "Residential", "Commercial"
  density_code (text, FK)      - LDR, MDR, HDR, etc.
  type_code (text)             - Specific type within family
  product_code (text)          - Specific product offering
  subtype_id (bigint)          - FK to lu_subtype

  -- Physical attributes
  acres_gross (float)          - Parcel acreage
  lot_width (float)            - Lot width in feet
  lot_depth (float)            - Lot depth in feet
  lot_area (float)             - Lot area in SF
  lot_product (varchar 50)     - Product code (e.g., "SFD50")

  -- Planning metrics
  units_total (integer)        - Total dwelling units
  lots_frontfeet (float)       - Linear feet of lot frontage
  planning_loss (float)        - % land lost to planning
  plan_efficiency (float)      - Planning efficiency %

  -- Zoning attributes
  site_coverage_pct (numeric)  - % of site covered by buildings
  setback_front_ft (numeric)   - Front setback requirement
  setback_side_ft (numeric)    - Side setback requirement
  setback_rear_ft (numeric)    - Rear setback requirement

  -- Transaction data
  saledate (date)              - Sale date
  saleprice (float)            - Sale price

  -- Identifiers
  parcel_code (varchar 20)     - External parcel code
  lot_type_id (FK → tbl_lot_type)

Indexes:
  idx_tbl_parcel_code (project_id, parcel_code)
```

**`tbl_project_config`** - Project-level configuration
```sql
Columns:
  project_id (PK, FK → tbl_project)
  asset_type (varchar 50)      - "residential", "mixed_use", etc.
  level1_label (varchar 50)    - Custom label for Level 1 (default: "Area")
  level2_label (varchar 50)    - Custom label for Level 2 (default: "Phase")
  level3_label (varchar 50)    - Custom label for Level 3 (default: "Parcel")
  created_at, updated_at (timestamptz)
```

**`tbl_container`** - Flexible hierarchical container system
```sql
Columns:
  container_id (PK, identity)
  project_id (FK → tbl_project)
  parent_container_id (FK → self)  - For hierarchy
  container_level (1, 2, or 3)     - Level in hierarchy
  container_code (varchar 50)      - Unique code within project
  display_name (varchar 200)       - Display name
  sort_order (integer)             - Sorting within level
  attributes (jsonb)               - Flexible metadata
  is_active (boolean)              - Active status
  created_at, updated_at (timestamptz)

Constraints:
  - Level 1 must have NULL parent
  - Levels 2-3 must have parent
  - Unique (project_id, container_code)
```

#### Land Use Taxonomy System

**`lu_family`** - Top-level land use families
```sql
Columns:
  family_id (PK, identity)
  code (text, unique)         - e.g., "RES", "COM", "IND"
  name (text)                 - e.g., "Residential", "Commercial"
  active (boolean, default true)
  notes (text)

Current families (9 total):
  - Residential
  - Commercial
  - Industrial
  - Office
  - Multi-Family
  - Hospitality
  - Institutional
  - Mixed Use
  - Open Space
```

**`lu_type`** - Subtypes within families
```sql
Columns:
  type_id (PK, identity)
  family_id (FK → lu_family)
  code (text, unique)         - e.g., "SFD", "MF_GARDEN"
  name (text)                 - Full name
  ord (integer)               - Display order
  active (boolean)
  notes (text)
```

**`lu_subtype`** - Additional subtype table (appears to be duplicate/legacy)
```sql
Columns:
  subtype_id (PK, sequence)
  family_id (FK → lu_family)
  code (varchar 20)
  name (varchar 100)
  ord (integer, default 0)
  active (boolean, default true)
  notes (text)
  created_at, updated_at (timestamp)

Unique constraint: (family_id, code)
```

**`res_lot_product`** - Residential lot product catalog
```sql
Columns:
  product_id (PK, identity)
  code (text, unique)         - e.g., "SFD40", "SFD50", "SFD60"
  lot_w_ft (integer)          - Lot width in feet
  lot_d_ft (integer)          - Lot depth in feet
  lot_area_sf (integer)       - Computed: lot_w_ft * lot_d_ft (generated)

Examples:
  SFD40: 40' × 110' = 4,400 SF
  SFD50: 50' × 120' = 6,000 SF
  SFD60: 60' × 120' = 7,200 SF
```

**`type_lot_product`** - Junction table linking types to products
```sql
Columns:
  type_id (FK → lu_type)
  product_id (FK → res_lot_product)
  is_default (boolean)
```

**`lu_res_spec`** - Residential specifications
```sql
Columns:
  type_id (FK → lu_type)
  (additional specification fields)
```

**`lu_com_spec`** - Commercial specifications
```sql
Columns:
  type_id (FK → lu_type)
  (additional specification fields)
```

**`density_classification`** - Density classifications
```sql
Columns:
  code (PK)                   - LDR, MDR, HDR, MHDR, etc.
  name (text)
  min_du_acre (numeric)       - Minimum density
  max_du_acre (numeric)       - Maximum density
```

**`tbl_landuse`** - Legacy land use codes (being phased out)
```sql
Columns:
  landuse_code (PK, varchar 10)
  name (varchar 100)
  type_id (FK → lu_type)
  legacy fields...
```

#### Financial System Tables (14 tables)

**`core_fin_category`** - Budget categories (hierarchical)
```sql
Columns:
  category_id (PK)
  parent_category_id (FK → self)
  category_code, category_name
  category_level (1-4)
  is_leaf (boolean)
  attributes (jsonb)
```

**`core_fin_uom`** - Units of measure
```sql
Examples: EA (each), SF (square feet), LF (linear feet), AC (acres)
```

**`core_fin_fact_budget`** - Budget line items
```sql
Columns:
  fact_id (PK)
  project_id (FK)
  container_id (FK → tbl_container)
  category_id (FK → core_fin_category)
  uom_id (FK → core_fin_uom)
  quantity, unit_cost, total_cost
  period_id, version_id
  tags, attributes (jsonb)
```

**`core_fin_fact_actual`** - Actual costs
```sql
Similar structure to fact_budget
```

**`core_fin_fact_tags`** - Tag system for budget items
```sql
Columns:
  tag_id (PK)
  fact_id (FK)
  tag_type, tag_value
```

**`core_fin_growth_rate_sets`** - Growth rate assumptions
```sql
Columns:
  set_id (PK)
  project_id (FK)
  card_type (e.g., "absorption", "pricing")
  set_name, is_active
```

**`core_fin_growth_rate_steps`** - Individual growth rate steps
```sql
Columns:
  step_id (PK)
  set_id (FK → growth_rate_sets)
  step_label (e.g., "Year 1", "2025")
  annual_rate_pct
  step_order
```

**Other financial tables**:
- `core_fin_budget_version` - Budget versioning
- `core_fin_funding_source` - Funding sources
- `core_fin_curve` - Cost curves
- `core_fin_category_uom` - Category-UOM relationships
- `core_fin_pe_applicability` - PE (period/entity) applicability
- `core_fin_crosswalk_ad` - Crosswalk mappings (type AD)
- `core_fin_crosswalk_ae` - Crosswalk mappings (type AE)

#### GIS & Mapping Tables (6 tables)

**`gis_project_boundary`** - Project boundary geometries
```sql
Columns:
  boundary_id (PK)
  project_id (FK)
  geometry (geometry - PostGIS)
  total_acres (numeric)
  source_type ("manual", "shapefile", "geojson")
  metadata (jsonb)
  created_at, updated_at
```

**`gis_plan_parcel`** - Planning parcels with geometry
```sql
Columns:
  plan_parcel_id (PK)
  project_id, parcel_id (FK → tbl_parcel)
  geometry (geometry - PostGIS)
  parcel_acres (numeric)
  attributes (jsonb)
```

**`gis_tax_parcel_ref`** - Tax assessor parcel reference
```sql
Columns:
  tax_parcel_id (PK)
  apn (assessor parcel number)
  geometry (geometry)
  owner_name, address
  assessed_value
  attributes (jsonb) - All assessor fields
```

**`gis_boundary_history`** - Boundary change history
```sql
Tracks changes to project boundaries over time
```

**`gis_document_ingestion`** - AI document ingestion tracking
```sql
Columns:
  ingestion_id (PK)
  project_id (FK)
  document_name, document_type
  extraction_status ("pending", "processing", "completed", "failed")
  extracted_data (jsonb) - Structured data from AI
  confidence_scores (jsonb)
  created_at, processed_at
```

**`gis_mapping_history`** - GIS mapping operations history

#### Document Management System (8 tables)

**`core_doc`** - Document registry
```sql
Columns:
  doc_id (PK)
  project_id, area_id, phase_id, parcel_id (FKs)
  doc_type, doc_category
  file_path, file_name
  upload_date, uploaded_by
  metadata (jsonb)
```

**`dms_templates`** - Document templates
**`dms_attributes`** - Document attribute definitions
**`dms_template_attributes`** - Template-attribute mappings
**`dms_workspaces`** - Document workspaces
**`dms_assertion`** - Document assertions/validations
**`dms_unmapped`** - Unmapped document data
**`dms_extract_queue`** - Document extraction queue
**`dms_profile_audit`** - Document profile audit trail

#### AI & Analysis Tables

**`ai_review_history`** - AI document review history
```sql
Columns:
  review_id (PK)
  project_id (FK)
  document_names (text[])
  review_type ("property_package", "due_diligence", etc.)
  extracted_fields (jsonb)
  confidence_scores (jsonb)
  review_notes (text)
  reviewed_at, reviewed_by
```

**`ai_ingestion_history`** - AI data ingestion tracking
```sql
Similar to ai_review_history, tracks ingestion events
```

#### Market & Assumptions Tables

**`market_assumptions`** - Market assumptions
```sql
Columns:
  assumption_id (PK)
  project_id (FK)
  assumption_type
  value_data (jsonb)
  effective_date, expiry_date
```

**`land_use_pricing`** - Land use pricing data
**`tbl_assumptionrule`** - Assumption rules
**`assumptions` (via API) - Global market assumptions

#### Other Supporting Tables

**`glossary_zoning`** - Zoning terminology glossary
```sql
Columns:
  term_id (PK)
  term, definition
  category, jurisdiction
  source, notes
```

**`tbl_contacts`** - Project contacts
```sql
Columns:
  contact_id (PK)
  project_id (FK)
  contact_type ("developer", "broker", "engineer", etc.)
  company_name, contact_name
  email, phone
  address fields...
```

**`tbl_acquisition`** - Land acquisition tracking
**`tbl_approval`** - Approval/entitlement tracking
**`tbl_budget`** - Legacy budget table
**`tbl_capitalization`** - Capitalization structure
**`tbl_calculation_period`** - Calculation periods for proformas
**`tbl_budget_items`, `tbl_budget_structure`** - Budget system tables
**`tbl_lot_type`** - Lot type definitions (legacy)
**`tbl_measures`** - Custom measures
**`tbl_zoning_control`** - Zoning controls
**`project_boundaries`, `project_parcel_boundaries`** - Legacy boundary tables
**`project_jurisdiction_mapping`** - Jurisdiction mappings

---

## 🔌 API Routes Reference

### Project APIs

**GET `/api/projects`**
- Returns all projects from `tbl_project`
- Fields: project_id, project_name, acres_gross, location, jurisdiction, etc.
- No authentication required

**GET `/api/projects/[projectId]`**
- Get single project details
- Path param: projectId

**GET `/api/projects/[projectId]/config`**
- Get project configuration (level labels, asset type)
- Returns from `tbl_project_config`

**GET `/api/projects/[projectId]/containers`**
- Get hierarchical container structure
- Returns from `tbl_container` with parent-child relationships

**POST `/api/projects/[projectId]/boundaries`**
- Create/update project boundary
- Saves to `gis_project_boundary`

**GET `/api/projects/[projectId]/calculate`**
- Trigger financial calculations

**GET `/api/projects/[projectId]/cash-flow`**
- Get cash flow projections

**GET `/api/projects/[projectId]/periods`**
- Get calculation periods

**POST `/api/projects/[projectId]/choose-structure`**
- Set project structure type (simple vs master plan)

**GET `/api/projects/[projectId]/growth-rates/[cardType]`**
- Get growth rate sets for specific card type
- Card types: "absorption", "pricing", "costs"

### Planning Hierarchy APIs

**GET `/api/parcels?project_id={id}`**
- Get all parcels for a project
- Joins: tbl_parcel → tbl_area → tbl_phase → tbl_landuse
- Returns computed parcel names (e.g., "1.1.01")
- Fields: parcel_id, area_no, phase_no, family_name, type_code, product_code, acres, units

**POST `/api/parcels`**
- Create new parcel
- Required: project_id, area_id, phase_id
- Optional: all taxonomy and metric fields
- Returns: full parcel with computed name

**PATCH `/api/parcels/[id]`**
- Update parcel
- Supports partial updates via request body

**GET `/api/phases?project_id={id}`**
- Get all phases for a project
- Returns: phase_id, area_no, phase_no, phase_name, units_total, gross_acres, status
- Aggregates parcel data (SUM acres, SUM units)

**POST `/api/phases`**
- Create new phase

**PATCH `/api/phases/[id]`**
- Update phase

### Land Use Taxonomy APIs

**GET `/api/landuse/families?active=true`**
- Get land use families from `lu_family`
- Filter: active=true returns only active families
- Returns: family_id, name, code, active
- Fallback: Returns hardcoded 7 families if DB query fails

**GET `/api/landuse/types/[familyId]`**
- Get types for a specific family
- Queries `lu_type` WHERE family_id = [familyId]
- Returns: type_id, code, name, ord, active

**GET `/api/landuse/products/[typeId]`**
- Get products for a specific type
- Joins: type_lot_product → res_lot_product
- Returns: product_id, code, lot_w_ft, lot_d_ft, lot_area_sf, is_default

**GET `/api/landuse/res-lot-products`**
- Get all residential lot products
- Queries `res_lot_product`
- Returns full catalog (SFD40, SFD50, SFD60, etc.)

**GET `/api/landuse/active-types`**
- Get all active types across all families

**GET `/api/landuse/lot-products/[subtypeId]`**
- Get lot products for a subtype

**GET `/api/landuse/choices`**
- Get land use choice hierarchies

**POST `/api/landuse/seed`**
- Seed land use taxonomy tables
- Creates families, types, and products

**GET `/api/landuse/mapping`**
- Get land use mappings

**GET `/api/landuse/specs`**
- Get land use specifications

**POST `/api/landuse/migration`**
- Migrate legacy land use data to new taxonomy

**GET `/api/landuse/programming`**
- Get land use programming data

**GET `/api/landuse/zoning`**
- Get zoning-related land use data

### Density & Classification APIs

**GET `/api/density-classifications`**
- Get density classifications (LDR, MDR, HDR, etc.)
- Returns: code, name, min_du_acre, max_du_acre

### Budget & Financial APIs

**GET `/api/budget?project_id={id}`**
- Get budget summary

**GET `/api/budget/items?project_id={id}`**
- Get budget line items for project
- Queries `core_fin_fact_budget`

**GET `/api/budget/items/[projectId]`**
- Alternate route for budget items

**GET `/api/budget/item/[factId]`**
- Get single budget item

**POST `/api/budget/items`**
- Create budget item

**PATCH `/api/budget/items/[factId]`**
- Update budget item

**GET `/api/budget/items/[factId]/tags`**
- Get tags for budget item

**POST `/api/budget/items/[factId]/tags/[tagId]/toggle`**
- Toggle tag on/off

**GET `/api/budget/test-db`**
- Test database connection for budget system

**GET `/api/budget-structure`**
- Get budget category hierarchy

**POST `/api/fin/seed`**
- Seed financial system (categories, UOMs, etc.)

**GET `/api/fin/budgets`**
- Get budget versions

**GET `/api/fin/categories`**
- Get all categories from `core_fin_category`

**GET `/api/fin/categories/[id]`**
- Get specific category

**GET `/api/fin/lines`**
- Get budget lines

**GET `/api/fin/lines/[id]`**
- Get specific budget line

**PATCH `/api/fin/lines/[id]`**
- Update budget line

**GET `/api/fin/lines/[id]/vendors`**
- Get vendors for budget line

**POST `/api/fin/lines/sources`**
- Create line item source

**GET `/api/fin/uoms`**
- Get units of measure

**GET `/api/fin/vendors`**
- Get vendor list

**GET `/api/fin/confidence`**
- Get confidence levels for estimates

### Market Assumptions APIs

**GET `/api/assumptions`**
- Get all market assumptions

**POST `/api/assumptions`**
- Create/update market assumption

**GET `/api/assumptions/growth-rates`**
- Get growth rate assumptions

**GET `/api/market-pricing`**
- Get market pricing data from `land_use_pricing`

**POST `/api/admin/migrate-pricing`**
- Migrate pricing data

**POST `/api/admin/fix-pricing-constraints`**
- Fix database constraints for pricing table

**POST `/api/admin/create-pricing-table`**
- Create pricing table

### Growth Rates APIs

**GET `/api/growth-rate-sets/[setId]/steps`**
- Get growth rate steps for a set
- Returns from `core_fin_growth_rate_steps`

**POST `/api/growth-rate-sets/[setId]/steps`**
- Create growth rate step

**PATCH `/api/growth-rate-sets/[setId]/steps/[stepId]`**
- Update growth rate step

### GIS & Mapping APIs

**POST `/api/gis/ingest-parcels`**
- Ingest tax parcels from shapefile/GeoJSON
- Creates records in `gis_tax_parcel_ref`

**POST `/api/gis/plan-parcels`**
- Create planning parcels with geometry
- Saves to `gis_plan_parcel`

**GET `/api/gis/project-boundary`**
- Get project boundary geometry

**POST `/api/gis/project-boundary`**
- Set project boundary

**POST `/api/gis/project-mapping`**
- Map project data to GIS features

### AI & Document APIs

**POST `/api/ai/analyze-document`**
- Analyze single document with Claude
- Extracts structured data
- Returns field mappings with confidence scores

**POST `/api/ai/analyze-multiple-documents`**
- Batch analyze multiple documents

**POST `/api/ai/validate-field`**
- Validate extracted field against document

**POST `/api/ai/ingest-property-package`**
- Ingest complete property package
- Creates record in `ai_ingestion_history`

**POST `/api/ai/document-review`**
- AI document review workflow
- Saves to `ai_review_history`

### Document Management APIs

**GET `/api/dms/search`**
- Search documents (MeiliSearch)

**GET `/api/dms/documents/[id]/profile`**
- Get document profile

**GET `/api/dms/attributes`**
- Get document attributes

**GET `/api/dms/templates`**
- Get document templates

**POST `/api/dms/migrate`**
- Migrate DMS data

**POST `/api/dms/extract-unified`**
- Unified document extraction pipeline

### Contacts API

**GET `/api/contacts?project_id={id}`**
- Get contacts for project
- Returns from `tbl_contacts`

**POST `/api/contacts`**
- Create new contact

**PATCH `/api/contacts/[id]`**
- Update contact

### Other APIs

**GET `/api/acquisition`**
- Get acquisition data

**GET `/api/lookups`**
- Get lookup lists

**GET `/api/excel`**
- Export data to Excel

**POST `/api/uploadthing`**
- File upload handler (UploadThing)

**GET `/api/markdown?path={path}`**
- Render markdown documentation

**GET `/api/db-schema`**
- Get database schema information

**GET `/api/glossary/zoning`**
- Get zoning glossary terms

**POST `/api/glossary/zoning/migrate`**
- Migrate zoning glossary

### Admin & Utility APIs

**POST `/api/admin/add-all-missing-codes`**
- Add missing land use codes

**POST `/api/admin/add-industrial-codes`**
- Add industrial codes

**POST `/api/admin/fix-institutional-codes`**
- Fix institutional codes

**POST `/api/admin/add-industrial-subtypes`**
- Add industrial subtypes

**GET `/api/admin/check-subtype-table`**
- Check subtype table integrity

**POST `/api/admin/populate-all-subtypes`**
- Populate all subtypes

**GET `/api/test-subtypes`**
- Test subtype queries

---

## 📱 Application Pages

### Main Navigation Structure

The app uses a single-page architecture with client-side routing via view state. Navigation is managed through the `Navigation` component with collapsible sections.

**Navigation Sections**:
1. **Home** - Dashboard, Dev Status, Documentation
2. **Planning** - Planning wizard, Overview, Documents
3. **Assumptions** - Global, Market Rates & Prices, Project Revenues
4. **Budgets** - Acquisition, Project Costs, Budget Grids, Disposition
5. **Ownership** - Debt, Equity, Muni/District
6. **Settings** - Settings, Zoning Glossary, Legacy Planner

### Page Details

#### 1. Home Dashboard (`/`)
**Component**: `HomeOverview.tsx`
**Status**: 85% Complete

**Features**:
- Project selector (dropdown in header)
- Key metrics cards:
  - Total Areas, Phases, Parcels
  - Total Units
  - Active Phases
  - Planned Acreage
- Land use family breakdown (top 5 by units)
- Quick navigation tiles to other pages
- Real-time data via SWR from `/api/parcels` and `/api/phases`

**Data Flow**:
```
ProjectProvider (context)
  → activeProject state
  → SWR fetches /api/parcels?project_id={id}
  → SWR fetches /api/phases?project_id={id}
  → useMemo computes metrics
  → Renders cards with aggregated data
```

**Known Issues**:
- No error states for failed API calls
- No loading skeleton
- Not mobile responsive

#### 2. Planning Module (`planning-inline`)
**Component**: `PlanningWizard.tsx` → `ProjectCanvas.tsx`
**Status**: 90% Complete

**Architecture**:
The planning module is the core of the application. It uses a hierarchical tile-based interface.

**Components**:
- `PlanningWizard.tsx` - Main container, data fetching, state management
- `ProjectCanvas.tsx` - Renders Area → Phase → Parcel hierarchy
- `ProjectCanvasInline.tsx` - Overview page showing all areas with collapsed phases
- `PhaseCanvas.tsx` - Detailed phase view
- `PhaseCanvasInline.tsx` - Inline phase view
- `ParcelTile.tsx` - Reusable parcel tile component
- `InlineTaxonomySelector.tsx` - Taxonomy dropdown selector (Family/Type/Product)
- `DropZone.tsx` - Drag & drop zone for adding phases/parcels

**Tile Layout** (ProjectCanvas.tsx):
- Grid: `repeat(auto-fit, minmax(220px, 1fr))` with 4px gap
- Each tile: min 220px wide, text-sm font, overflow visible
- Edit mode: Expands to show form fields
- View mode: Shows Family, Type, Product, Acres, Units

**Edit Mode Fields**:
- InlineTaxonomySelector (133px width each):
  - Family dropdown
  - Type dropdown (cascades from Family)
  - Product dropdown (cascades from Type)
- Input fields (70px width each):
  - Acres (number input, step 0.1)
  - Units (number input, hidden for Commercial)

**Data Flow**:
```
PlanningWizard.tsx:
  1. Fetches /api/projects/{id}/containers (hierarchy)
  2. Fetches /api/parcels?project_id={id}
  3. Fetches /api/phases?project_id={id}
  4. Builds nested structure: Project → Areas → Phases → Parcels
  5. Passes to ProjectCanvas

ProjectCanvas.tsx:
  1. Maps over areas
  2. For each area, maps over phases
  3. For each phase, renders parcel tiles in grid
  4. Click tile → enters edit mode
  5. Edit saves via PATCH /api/parcels/{id}
  6. Refresh via onRefresh callback
```

**Recent Fixes** (this session):
- Fixed text truncation ("Residen" → "Residential")
- Changed font size from text-xs to text-sm
- Added text wrapping with `break-words` and `overflowWrap: 'anywhere'`
- Fixed edit mode field alignment
- Set consistent widths: Family/Type/Product 133px, Acres/Units 70px
- Fixed tile minWidth to 220px to accommodate wider fields
- Changed grid from Tailwind classes to inline styles for better control

**Known Issues**:
- Overview page (ProjectCanvasInline.tsx) Plan Area tiles were too wide (480px), reverted to original responsive version
- No bulk edit functionality
- No undo/redo
- Parcel deletion requires confirmation modal

#### 3. Planning Overview (`planning-overview`)
**Component**: `PlanningContent.tsx`
**Status**: 70% Complete

**Features**:
- Tabular view of all parcels
- Grid-based layout using react-data-grid
- Sortable columns
- Inline editing (legacy)

**Known Issues**:
- Not fully migrated to new taxonomy system
- Table not responsive on mobile

#### 4. Budget Grid Pages

**4a. Budget Grid Light** (`budget-grid-light`)
**Component**: `BudgetGridLight.tsx` (MUI DataGrid)
**Status**: 80% Complete

**Features**:
- Light theme MUI DataGrid
- CRUD operations for budget items
- Column configuration
- Inline editing
- Tag system

**4b. Budget Grid Dark** (`budget-grid-dark`)
**Component**: `BudgetGridDark.tsx` + `BudgetGridDarkWrapper.tsx`
**Status**: 80% Complete

**Features**:
- Dark theme variant using Handsontable
- Spreadsheet-like interface
- Formula support
- Copy/paste from Excel

**Data Structure**:
```typescript
BudgetItem {
  fact_id: number
  project_id: number
  container_id: number
  category_id: number
  category_path: string[]        // ["Site Work", "Earthwork", "Mass Grading"]
  uom_id: number
  uom_code: string               // "CY", "SF", "EA"
  quantity: number
  unit_cost: number
  total_cost: number             // computed
  period_id: number
  version_id: number
  tags: { type: string, value: string }[]
  attributes: jsonb
}
```

**Known Issues**:
- Performance issues with 1000+ rows
- No keyboard shortcuts
- No undo history
- Dark theme has contrast issues

#### 5. GIS Setup Workflow (`gis-test`)
**Component**: `GISSetupWorkflow.tsx`
**Status**: 75% Complete (NEW)

**Workflow Steps**:
1. **Upload Documents** (`ProjectDocumentUploads.tsx`)
   - Upload property package PDFs
   - AI extracts data using Claude
   - Maps fields: project_address, legal_owner, total_acres, etc.
   - Confidence scoring for each field
   - User confirms or corrects extractions

2. **Choose Structure** (`ProjectStructureChoice.tsx`)
   - Select "Simple" or "Master Plan" structure
   - Sets `asset_type` in `tbl_project_config`

3. **Set Boundary** (`ProjectBoundarySetup.tsx`)
   - Upload shapefile or draw boundary
   - Select tax parcels from assessor data
   - Calculate total acres
   - Save to `gis_project_boundary`

4. **Plan Navigation** (`PlanNavigation.tsx`)
   - Define Area/Phase/Parcel structure
   - Create initial containers

**AI Integration**:
- Uses `@anthropic-ai/sdk` with Claude 3.5 Sonnet
- Vision API for PDF page analysis
- Text extraction with pdfjs-dist
- Structured extraction with Zod schemas
- Confidence scoring for each extracted field

**Data Flow**:
```
1. User uploads PDFs
2. PDFs converted to images (pdf2pic)
3. Each page analyzed by Claude Vision API
4. Extracted data structured as JSON
5. Field mappings presented to user
6. User confirms → saved to tbl_project
7. GIS metadata saved to gis_metadata JSONB column
```

**Known Issues**:
- AI extraction sometimes misses fields
- No retry mechanism for failed extractions
- Large PDFs (>50 pages) timeout
- Coordinate extraction inconsistent

#### 6. Market Assumptions Global (`market`)
**Component**: `MarketAssumptionsNative.tsx`
**Status**: 95% Complete

**Features**:
- Tabbed interface (Material-UI Tabs)
- Sections:
  - Absorption Rates
  - Pricing Assumptions
  - Cost Escalation
  - Market Cycles
- Growth rate sets with steps
- Charts using MUI X-Charts

**Data Structure**:
```typescript
GrowthRateSet {
  set_id: number
  project_id: number
  card_type: "absorption" | "pricing" | "costs"
  set_name: string
  is_active: boolean
  steps: GrowthRateStep[]
}

GrowthRateStep {
  step_id: number
  set_id: number
  step_label: string              // "Year 1", "2025", "Q1 2025"
  annual_rate_pct: number         // 3.5 = 3.5%
  step_order: number
}
```

**Known Issues**:
- No chart tooltips
- Cannot delete steps
- No validation for overlapping periods

#### 7. Land Use Management (`land-use`)
**Component**: `LandUseSchema.tsx`
**Status**: 95% Complete

**Features**:
- Family-based organization
- Type management within families
- Product catalog management
- CRUD operations
- Active/inactive toggle
- Sort order management

**Component Tree**:
```
LandUseSchema.tsx
  → LandUseCanvas.tsx
    → Family cards (lu_family)
      → Type cards (lu_type)
        → Product cards (res_lot_product via type_lot_product)
```

**Known Issues**:
- No drag-and-drop reordering
- No bulk operations
- Search not implemented

#### 8. Documentation Page (`documentation`)
**Component**: `MarkdownViewer.tsx`
**Status**: 100% Complete

**Features**:
- Renders markdown files from `/Documentation` directory
- Syntax highlighting for code blocks
- Table of contents generation
- File selector dropdown

**Files Available**:
- App-Development-Status.md (this file)
- Technical architecture docs
- API documentation
- Developer guides

#### 9. Development Status (`dev-status`)
**Component**: `DevStatus.tsx`
**Status**: 100% Complete

**Features**:
- Reads and renders App-Development-Status.md
- Syntax highlighting
- Session activity log
- Progress tracking

#### 10. Test/Debug Pages

**`db-schema`** - Database schema viewer
**`gis-simple-test`** - Simple GIS map test
**`map-debug`** - MapLibre debugging
**`parcel-test`** - Parcel CRUD testing
**`ai-document-review`** - AI document review testing

---

## 🏗 Component Architecture

### Global State Management

**ProjectProvider** (`src/app/components/ProjectProvider.tsx`)
- React Context provider for active project
- Manages: activeProject, projects list, refreshProjects()
- Used throughout app via `useProjectContext()`
- Fetches from `/api/projects` on mount

**Custom Hooks**:
- `useProjectConfig()` - Fetches project config (level labels)
- `useSWR()` - Data fetching with caching (from SWR library)

### Key Reusable Components

**Navigation** (`Navigation.tsx`)
- Collapsible sections
- Dynamic labels based on project config
- Active view highlighting

**Header** (`Header.tsx`)
- Project selector dropdown
- User avatar
- Global actions

**FilterableSelect** (`FilterableSelect.tsx`)
- Searchable dropdown
- Used for long lists (products, categories)

**TaxonomySelector** family:
- `SimpleTaxonomySelector.tsx` - Basic selector
- `InlineTaxonomySelector.tsx` - Compact inline version (used in tiles)
- `TaxonomySelector.tsx` - Full-featured selector

### Form Components

Forms use `react-hook-form` + `zod` for validation:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  family_name: z.string().min(1),
  acres: z.number().positive()
})

const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema)
})
```

### Drag & Drop System

Uses `react-dnd` + `react-dnd-html5-backend`:

**Draggable**: `DraggableTile.tsx`
**Drop Zone**: `DropZone.tsx`

```typescript
// DraggableTile
const [{ isDragging }, drag] = useDrag({
  type: 'phase',
  item: { type: 'phase', id: phase.id }
})

// DropZone
const [{ isOver }, drop] = useDrop({
  accept: ['phase'],
  drop: (item) => onDrop(item)
})
```

### Map Components

**GISMap** (`MapLibre/GISMap.tsx`)
- MapLibre GL JS wrapper
- Supports GeoJSON layers
- Drawing tools (polygon, point)
- Feature selection
- Popups

**Layers**:
- Project boundary layer
- Tax parcel layer
- Planning parcel layer
- Heatmaps
- Choropleth

### Budget Grid Architecture

**Handsontable Implementation** (`BudgetGridDark.tsx`):
```typescript
import Handsontable from 'handsontable'
import { HotTable } from '@handsontable/react-wrapper'

<HotTable
  data={budgetData}
  columns={[
    { data: 'category_path', type: 'text' },
    { data: 'quantity', type: 'numeric' },
    { data: 'unit_cost', type: 'numeric', numericFormat: { pattern: '$0,0.00' } },
    { data: 'total_cost', type: 'numeric', readOnly: true }
  ]}
  afterChange={(changes) => handleCellChange(changes)}
  contextMenu={['row_above', 'row_below', 'remove_row']}
  columnSorting={true}
  filters={true}
/>
```

**MUI DataGrid Implementation** (`BudgetGridLight.tsx`):
```typescript
import { DataGrid } from '@mui/x-data-grid'

<DataGrid
  rows={budgetData}
  columns={columns}
  editMode="row"
  processRowUpdate={handleRowUpdate}
  onProcessRowUpdateError={handleError}
/>
```

### Style System

**Tailwind CSS** configuration in `tailwind.config.ts`:
- Custom colors
- Dark mode support
- Typography plugin
- Forms plugin

**Global styles** in `src/app/globals.css`:
- CSS reset
- Dark theme variables
- Custom utility classes

**Theme switching**:
- `ThemeSwitcher.tsx` component
- Persists to localStorage
- CSS custom properties

---

## ✅ Feature Status

### Complete Features ✅

1. **Project Management**
   - [x] Multi-project support
   - [x] Project CRUD operations
   - [x] Project configuration (level labels)
   - [x] Jurisdiction data

2. **Land Use Taxonomy**
   - [x] 9 land use families (Residential, Commercial, Industrial, Office, Multi-Family, Hospitality, Institutional, Mixed Use, Open Space)
   - [x] Type hierarchy (cascading from family)
   - [x] Product catalog (residential lot products)
   - [x] Database-driven (lu_family, lu_type, res_lot_product)
   - [x] Density classifications (LDR, MDR, HDR, MHDR)
   - [x] Seed system for initial data

3. **Planning Module**
   - [x] Area/Phase/Parcel hierarchy
   - [x] Inline tile editing
   - [x] Taxonomy selector in tiles
   - [x] Acres and units tracking
   - [x] Auto-generated parcel names (e.g., "1.1.01")
   - [x] Real-time updates via SWR
   - [x] Responsive tile grid layout

4. **Container System**
   - [x] Flexible 3-level hierarchy
   - [x] Parent-child relationships
   - [x] JSONB attributes
   - [x] Sort ordering

5. **Database Integration**
   - [x] Neon PostgreSQL connection
   - [x] 74 tables in landscape schema
   - [x] Foreign key constraints
   - [x] Seed scripts

6. **Document Management**
   - [x] File upload (UploadThing)
   - [x] Document registry (core_doc)
   - [x] Template system
   - [x] Search (MeiliSearch)

7. **Market Assumptions**
   - [x] Growth rate sets and steps
   - [x] Multiple card types (absorption, pricing, costs)
   - [x] Chart visualization
   - [x] Active set management

### In Progress Features 🟡

1. **GIS Setup Workflow** (75%)
   - [x] Document upload
   - [x] AI extraction
   - [x] Field mapping UI
   - [ ] Boundary editing tools
   - [ ] Parcel selection refinement
   - [ ] Coordinate validation

2. **Budget Grid** (80%)
   - [x] Light theme (MUI DataGrid)
   - [x] Dark theme (Handsontable)
   - [x] CRUD operations
   - [x] Tag system
   - [ ] Formula support
   - [ ] Undo/redo
   - [ ] Keyboard shortcuts
   - [ ] Performance optimization (1000+ rows)

3. **Mobile Responsiveness** (30%)
   - [ ] Planning tiles on mobile
   - [ ] Budget grid on mobile
   - [ ] Navigation on mobile
   - [ ] Touch gestures

### Planned Features 📋

1. **Financial Modeling**
   - [ ] Cash flow projections
   - [ ] IRR calculations
   - [ ] Sensitivity analysis
   - [ ] Scenario comparison

2. **Advanced GIS**
   - [ ] Drawing tools
   - [ ] Layer management
   - [ ] Style editor
   - [ ] 3D visualization

3. **Reporting**
   - [ ] PDF export
   - [ ] Excel export
   - [ ] Custom templates
   - [ ] Scheduled reports

4. **Collaboration**
   - [ ] User roles and permissions
   - [ ] Comments and notes
   - [ ] Change history
   - [ ] Approval workflows

5. **Integrations**
   - [ ] External GIS APIs
   - [ ] Accounting systems
   - [ ] CRM integration

---

## 🐛 Known Bugs & Issues

### Critical Issues 🔴

*None currently identified*

### Major Issues 🟠

1. **Planning Module - Overview Page Responsiveness** (Session: Oct 3, 2025)
   - **File**: `ProjectCanvasInline.tsx`
   - **Issue**: Plan Area tiles were set to minWidth 480px, causing non-responsive layout
   - **Fix**: Reverted to original Tailwind responsive classes `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
   - **Status**: Fixed (reverted via git checkout)

2. **Budget Grid - Performance**
   - **File**: `BudgetGridDark.tsx`, `BudgetGridLight.tsx`
   - **Issue**: Slow rendering with 1000+ budget line items
   - **Impact**: 2-3 second lag on scroll, cell updates
   - **Workaround**: Use pagination or windowing
   - **Status**: Open

### Minor Issues 🟡

1. **Planning Module - Parcel Tile Text Wrapping** (Session: Oct 3, 2025)
   - **File**: `ProjectCanvas.tsx`
   - **Issue**: Text was truncating (e.g., "Residen" instead of "Residential")
   - **Fix**:
     - Removed `overflow-hidden` class
     - Added `overflow: 'visible'` inline style
     - Changed font from `text-xs` to `text-sm`
     - Added `break-words` and `overflowWrap: 'anywhere'` to value cells
   - **Status**: Fixed

2. **Planning Module - Edit Mode Field Alignment** (Session: Oct 3, 2025)
   - **File**: `ProjectCanvas.tsx`, `InlineTaxonomySelector.tsx`
   - **Issue**: Form fields not aligned, inconsistent widths
   - **Fix**:
     - Set Family/Type/Product fields to 133px width
     - Set Acres/Units fields to 70px width
     - Added `whitespace-nowrap` to labels
     - Increased tile minWidth from 200px to 220px
   - **Status**: Fixed

3. **Planning Module - Tile Grid Layout** (Session: Oct 3, 2025)
   - **File**: `ProjectCanvas.tsx`
   - **Issue**: Fixed breakpoint grid wasn't responsive
   - **Fix**: Changed from `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` to `repeat(auto-fit, minmax(220px, 1fr))`
   - **Status**: Fixed

4. **AI Document Extraction - Confidence Scores**
   - **File**: `PropertyPackageUpload.tsx`
   - **Issue**: Confidence scores inconsistent, sometimes null
   - **Impact**: User unsure which fields need review
   - **Status**: Open

5. **GIS Map - Feature Selection**
   - **File**: `GISMap.tsx`
   - **Issue**: Clicking small parcels difficult, requires precise aim
   - **Workaround**: Increase click tolerance
   - **Status**: Open

6. **Navigation - Collapsed State Not Persisted**
   - **File**: `Navigation.tsx`
   - **Issue**: Collapsed sections reset on page refresh
   - **Impact**: Minor UX annoyance
   - **Status**: Open

7. **Console Warnings - React Keys**
   - **Files**: Multiple components
   - **Issue**: Some list renders missing stable keys
   - **Impact**: Console noise, potential render issues
   - **Status**: Open

### Styling Issues 🎨

1. **Focus Indicators Inconsistent**
   - **Impact**: Accessibility and keyboard navigation
   - **Status**: Open

2. **Dark Theme Contrast**
   - **File**: `BudgetGridDark.tsx`
   - **Issue**: Some text hard to read against dark background
   - **Status**: Open

3. **Mobile Layout Breaks**
   - **Files**: Multiple pages
   - **Issue**: Various layout issues on screens < 768px
   - **Status**: Open

---

## 📝 Recent Development Activity

### Session: October 3, 2025 - Parcel Tile Layout Fixes

**Problem**: Text truncation and layout issues in parcel tiles on Planning page

**Root Cause Discovery**:
- Initially edited wrong files (PhaseCanvasInline.tsx, ParcelTile.tsx)
- Used console.log debugging to identify correct file: ProjectCanvas.tsx
- Console output: "ProjectCanvas.tsx:106 🚀 startEditingParcel"

**Changes Made**:

1. **ProjectCanvas.tsx** (lines 357-495):
   - Grid: Changed from Tailwind classes to inline styles
     ```tsx
     // Before
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">

     // After
     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '4px' }}>
     ```
   - Tile styling:
     - Removed `overflow-hidden` class
     - Added `overflow: 'visible'` inline style
     - Changed font from `text-xs` to `text-sm`
     - Set `minWidth: '220px'`
   - Text fields:
     - Labels: Added `whitespace-nowrap`
     - Values: Added `break-words` and `overflowWrap: 'anywhere'`

2. **InlineTaxonomySelector.tsx** (lines 178-249):
   - Removed `w-full` from table
   - Set fixed widths: 133px for Family/Type/Product dropdowns
   - Changed padding: `pr-1` → `pr-2`
   - Added `whitespace-nowrap` to labels

3. **ProjectCanvasInline.tsx**:
   - Attempted fix for Overview page Plan Area tiles
   - Changed from 480px minWidth to 200px
   - User reported "no change"
   - Reverted file via `git checkout` to original responsive version
   - Original uses: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`

**Iterations**:
- Multiple width adjustments based on user feedback
- First: 140px → 121px/66px → 133px → Final: 133px/70px
- User feedback quotes:
  - "product, acres and units fields should be smaller (width)"
  - "acres and units should be left aligned with family, type and product"
  - "now the acres and units are too wide again"

**Files Modified**:
```
M src/app/components/LandUse/InlineTaxonomySelector.tsx
M src/app/components/PlanningWizard/ProjectCanvas.tsx
```

**Status**: Fixed for parcel tiles, Overview page reverted to working version

### Commit: 7576734 - Unified Document Extractor & Budget System

**Date**: Recent (within last week)

**Changes**:
- Integrated unified document extraction pipeline
- Consolidated budget system
- Created `/src/lib/ai/unified-extractor.ts`
- Updated `/src/app/api/dms/extract-unified/route.ts`

### Commit: 88cf90a - Document-First AI Workflow for GIS

**Date**: Recent

**Changes**:
- Implemented GIS setup workflow
- Added `ProjectDocumentUploads.tsx`
- AI-powered field extraction from property packages
- Confidence scoring for extracted fields
- User confirmation workflow

### Commit: 1d70152 - Land Use Migration Tools

**Changes**:
- Created land use migration utilities
- Added backup file ignore patterns
- Migration script for legacy land use codes

### Commit: 76bc1a2 - Neon Database Integration Complete

**Date**: September 23, 2025

**Summary**:
- Connected all planning APIs to Neon database
- Fixed "wrong land use families list" issue
- Now queries `landscape.lu_family` instead of hardcoded data
- 9 real families vs previous 4 hardcoded
- All parcel CRUD operations confirmed working

**APIs Updated**:
- `/api/landuse/families` - Now queries database with fallback
- `/api/landuse/types/[familyId]` - Cascading from families
- `/api/landuse/products/[typeId]` - Product catalog
- `/api/parcels` - Full taxonomy support

### Commit: e743276 - Land Use Taxonomy System

**Date**: Prior to Sept 23, 2025

**Changes**:
- Implemented comprehensive taxonomy system
- Created database tables: lu_family, lu_type, lu_subtype
- Working dropdowns with cascading selection
- Seed system for initial data

### Git History Summary

```
7576734 - feat: integrate unified document extractor and consolidate budget system
88cf90a - feat: implement document-first AI workflow for GIS project setup
1d70152 - Add land use migration tools and ignore backup files
1996f02 - docs: add comprehensive technical due diligence documentation
3715006 - feat: complete AI document review protocol with PDF analysis
1ae62bb - feat: implement GIS AI-first system with parcel selection
062e656 - feat: complete Market Assumptions Global page integration
76bc1a2 - feat: complete Neon database integration for planning system
e743276 - feat: implement comprehensive land use taxonomy system
7d988fa - feat: enhance planning module tile system with responsive layout
c43ff95 - Add comprehensive growth rates feature with theme system
```

### Current Uncommitted Changes

```
Modified:
  package-lock.json
  package.json
  src/app/components/DevStatus/DevStatus.tsx
  src/app/components/GIS/GISSetupWorkflow.tsx
  src/app/components/GIS/PropertyPackageUpload.tsx
  src/app/components/GrowthRates.tsx
  src/app/components/GrowthRatesManager/index.tsx
  src/app/components/LandUse/InlineTaxonomySelector.tsx
  src/app/components/MarketAssumptionsNative.tsx
  src/app/components/Navigation.tsx
  src/app/components/Planning/PlanningContent.tsx
  src/app/components/PlanningWizard/PhaseCanvas.tsx
  src/app/components/PlanningWizard/PhaseCanvasInline.tsx
  src/app/components/PlanningWizard/ProjectCanvas.tsx
  src/app/components/PlanningWizard/README.md
  src/app/page.tsx
  src/components/dms/upload/Dropzone.tsx

New Files:
  docs/budget_grid_api_spec.md
  docs/budget_grid_ui_spec.xml
  project-docs/Schema-Coverage-Analysis.md
  src/app/api/budget/item/
  src/app/api/budget/items/
  src/app/api/contacts/
  src/app/api/dms/extract-unified/
  src/app/budget-grid-v2/
  src/app/budget-grid/
  src/app/components/Budget/BudgetGrid.tsx
  src/app/components/Budget/BudgetGridDark.tsx
  src/app/components/Budget/BudgetGridLight.tsx
  src/app/components/Documentation/
  src/app/components/GIS/ProjectDocumentUploads.tsx
  src/app/documentation/
  src/lib/ai/
  src/lib/pdf/
  src/styles/parcel-tiles.css
```

---

## 🔧 Technical Debt

### Database

**High Priority**:
- [ ] Add indexes for frequently queried fields
  - `tbl_parcel (project_id, family_name)`
  - `tbl_phase (project_id)`
  - `core_fin_fact_budget (project_id, category_id)`
- [ ] Normalize jurisdiction data (currently strings in tbl_project)
- [ ] Add foreign key constraints:
  - `tbl_parcel.family_name` → `lu_family.name`
  - `tbl_parcel.type_code` → `lu_type.code`
  - `tbl_parcel.product_code` → `res_lot_product.code`

**Medium Priority**:
- [ ] Migrate remaining legacy land use codes to new taxonomy
- [ ] Clean up duplicate subtype tables (lu_subtype vs lu_type)
- [ ] Add database triggers for audit trails
- [ ] Implement soft deletes for parcels/phases

**Low Priority**:
- [ ] Partition large tables (core_fin_fact_budget, core_doc)
- [ ] Archive old budget versions

### Code Quality

**High Priority**:
- [ ] Replace `any` types with proper TypeScript interfaces
  - `ProjectProvider.tsx` - Project type
  - `PlanningWizard.tsx` - Parcel, Phase, Area types
- [ ] Add error boundaries to prevent full app crashes
- [ ] Implement loading states for all data fetching
- [ ] Add form validation to all forms

**Medium Priority**:
- [ ] Extract magic numbers to constants
- [ ] Reduce component re-renders (React.memo, useMemo, useCallback)
- [ ] Move inline styles to CSS modules
- [ ] Add PropTypes or Zod validation for component props

**Low Priority**:
- [ ] Refactor large components (>500 lines)
- [ ] Extract duplicate code to shared utilities
- [ ] Add JSDoc comments for complex functions

### Testing

**Current Coverage**: ~20% (estimated)

**Priorities**:
- [ ] Unit tests for critical paths:
  - API routes (parcels, phases, projects)
  - Taxonomy selector logic
  - Budget calculations
- [ ] Integration tests:
  - Planning workflow (create area → phase → parcel)
  - Budget CRUD operations
  - AI document extraction
- [ ] E2E tests:
  - Critical user journeys
  - Data persistence

**Target Coverage**: 80%

### Performance

**High Priority**:
- [ ] Optimize Budget Grid rendering (virtualization)
- [ ] Implement pagination for parcel lists (>100 parcels)
- [ ] Add API response caching (SWR already used, but needs configuration)
- [ ] Lazy load map tiles

**Medium Priority**:
- [ ] Code splitting for route-based chunks
- [ ] Image optimization (next/image)
- [ ] Bundle size analysis and reduction

### Security

**High Priority**:
- [ ] Add authentication (currently none)
- [ ] Add authorization (role-based access)
- [ ] Add rate limiting to API routes
- [ ] Sanitize user inputs (XSS prevention)
- [ ] Add CSRF protection

**Medium Priority**:
- [ ] Add security headers (CSP, HSTS, etc.)
- [ ] Implement API request logging
- [ ] Add input validation on all API routes
- [ ] Encrypt sensitive data in database

### Accessibility

**High Priority**:
- [ ] Add ARIA labels to interactive elements
- [ ] Ensure keyboard navigation works throughout app
- [ ] Add focus indicators (visible and consistent)
- [ ] Test with screen readers

**Target**: WCAG 2.1 AA compliance

### Infrastructure

**High Priority**:
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add error tracking (Sentry or similar)
- [ ] Implement automated database backups

**Medium Priority**:
- [ ] Add monitoring/observability (logging, metrics)
- [ ] Set up staging environment
- [ ] Add health check endpoints

---

## 📚 Appendix

### Useful File Paths

**Core Database**:
- `/src/lib/db.ts` - Database connection and SQL helper

**Main App**:
- `/src/app/page.tsx` - App entry point, view routing
- `/src/app/components/Navigation.tsx` - Main navigation
- `/src/app/components/Header.tsx` - App header with project selector
- `/src/app/components/ProjectProvider.tsx` - Global project state

**Planning Module**:
- `/src/app/components/PlanningWizard/PlanningWizard.tsx` - Main container
- `/src/app/components/PlanningWizard/ProjectCanvas.tsx` - Tile grid view
- `/src/app/components/PlanningWizard/ProjectCanvasInline.tsx` - Overview page
- `/src/app/components/LandUse/InlineTaxonomySelector.tsx` - Taxonomy selector

**Budget System**:
- `/src/app/components/Budget/BudgetGridLight.tsx` - MUI DataGrid version
- `/src/app/components/Budget/BudgetGridDark.tsx` - Handsontable version

**GIS System**:
- `/src/app/components/GIS/GISSetupWorkflow.tsx` - Setup wizard
- `/src/app/components/GIS/ProjectDocumentUploads.tsx` - AI document upload
- `/src/app/components/MapLibre/GISMap.tsx` - Map component

**AI Integration**:
- `/src/lib/ai/unified-extractor.ts` - Unified document extraction
- `/src/lib/ai/vision-extractor.ts` - Claude Vision API wrapper
- `/src/lib/pdf/extractor.ts` - PDF text extraction

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...   # Neon PostgreSQL connection string

# AI Services
ANTHROPIC_API_KEY=sk-...       # Claude API key
OPENAI_API_KEY=sk-...          # OpenAI API key (if used)

# File Uploads
UPLOADTHING_SECRET=...         # UploadThing secret
UPLOADTHING_APP_ID=...         # UploadThing app ID

# Search
MEILISEARCH_URL=...            # MeiliSearch instance URL
MEILISEARCH_KEY=...            # MeiliSearch API key

# Optional
NODE_ENV=development           # Environment
NEXT_PUBLIC_API_URL=...        # Public API URL (if different from app URL)
```

### Database Connection Info

```
Host: ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech
User: neondb_owner
Database: land_v2
Schema: landscape
Port: 5432 (default PostgreSQL port)
```

### Dev Server

```bash
# Current dev server
npm run dev
# Runs on: http://localhost:3007
# (Port 3007 due to port 3000 being in use)

# Build
npm run build

# Production
npm run start
```

### Naming Conventions

**Components**: PascalCase (e.g., `ProjectCanvas.tsx`)
**Files**: kebab-case for utilities (e.g., `unified-extractor.ts`)
**API Routes**: kebab-case folders (e.g., `/api/budget-items/route.ts`)
**Database Tables**: snake_case with prefix
- `tbl_` for core tables (e.g., `tbl_project`)
- `core_fin_` for financial (e.g., `core_fin_category`)
- `lu_` for land use (e.g., `lu_family`)
- `gis_` for GIS (e.g., `gis_project_boundary`)
- `dms_` for documents (e.g., `dms_templates`)

**Columns**: snake_case (e.g., `project_id`, `family_name`)

---

## 🎯 Development Priorities

### Next Sprint (Immediate)

1. ✅ Fix parcel tile text wrapping issues
2. ✅ Fix parcel tile field alignment
3. ✅ Fix Overview page responsiveness
4. [ ] Add error handling to all API calls
5. [ ] Implement loading states throughout app
6. [ ] Mobile responsiveness - Planning module

### Following Sprint

1. [ ] Budget Grid performance optimization
2. [ ] GIS workflow completion (boundary tools)
3. [ ] Authentication and authorization
4. [ ] Unit tests for critical paths

### Future Releases

1. [ ] Financial modeling and calculations
2. [ ] Advanced reporting
3. [ ] Third-party integrations
4. [ ] Multi-tenant support

---

*This document is maintained as a comprehensive reference for Claude Project context. It is updated periodically as development progresses.*

*Last comprehensive update: October 3, 2025*
