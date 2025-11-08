# Landscape API Reference (2025-11-04)

**Repository Commit:** `cafa56b`
**Generated:** 2025-11-04
**Supersedes:** landscape_APIs_2025-09-03.rtf

---

## Document Scope

This document provides a complete, authoritative reference for all HTTP endpoints in the Landscape real estate development platform, based on live repository analysis at commit `cafa56b`. It supersedes all previous API documentation dated before November 4, 2025.

**What's Covered:**
- Django REST Framework backend APIs (`/api/*`)
- Next.js API routes (`/api/*`)
- Complete request/response schemas
- Authentication & authorization
- Frontend integration patterns
- Breaking changes since September 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Diff vs 2025-09-03](#diff-vs-2025-09-03)
3. [Authentication](#authentication)
4. [Endpoint Index](#endpoint-index)
5. [Django Backend APIs](#django-backend-apis)
6. [Next.js API Routes](#nextjs-api-routes)
7. [Domain-Specific Guides](#domain-specific-guides)
8. [Data Contracts](#data-contracts)
9. [Frontend Integration](#frontend-integration)
10. [Breaking Changes](#breaking-changes)
11. [Verification](#verification)

---

## Overview

### Stack Architecture

**Backend:**
- Django 5.0.1 + Django REST Framework 3.14.0
- PostgreSQL 15.x (Neon serverless)
- Python 3.12 financial calculation engine
- JWT authentication (djangorestframework-simplejwt)
- OpenAPI/Swagger docs at `/api/docs/`

**Frontend:**
- Next.js 14.x (App Router)
- Edge API routes
- React Query for data fetching
- TypeScript strict mode

**Database:**
- Schema: `landscape` (primary)
- 117 tables, 26 views
- Search path automatically set via custom PostgreSQL backend

### Base URLs

| Environment | Django Backend | Next.js Frontend |
|-------------|---------------|------------------|
| Development | `http://localhost:8000` | `http://localhost:3000` |
| Production | `https://api.landscape.app` | `https://landscape.app` |

⚠️ **Note:** Production URLs are masked for security. Refer to environment variables for actual deployment endpoints.

### API Versioning

- Current version: **v1** (implicit, no version prefix)
- Breaking changes will introduce `/api/v2/` prefix when needed
- Legacy endpoints maintained with deprecation notices

---

## Diff vs 2025-09-03

| Change | Impact | Migration Guide |
|--------|--------|-----------------|
| **`property_type_code` → `project_type_code`** | 🔴 Breaking | All frontend/backend references updated. Use standardized codes: LAND, MF, OFF, RET, IND, HTL, MXU |
| **Scenario Management System** | ✅ New Feature | `/api/scenarios/` CRUD with `activate`, `clone`, `lock` actions. ScenarioContext in React. |
| **Universal Container System** | ✅ Production Ready | Replaces legacy `pe_level` enum. All budget/actual queries now use `container_id`. |
| **`pe_level` Deprecation** | 🔴 Breaking | Completely removed. Migration 011 dropped column/enum. Use `container_id` or `project_id`. |
| **Unit Costs & Templates (Migration 014/015)** | ✅ New Feature | `/api/unit-costs/*` endpoints for benchmarking and planning standards |
| **Django Backend Apps** | ✅ New | 12 Django apps with ViewSets: projects, containers, financial, landuse, benchmarks, calculations, multifamily, commercial, gis, documents, market_intel, reports |
| **Python Financial Engine** | ✅ New | `/api/calculations/*` endpoints using numpy-financial (5-10x performance) |
| **Document AI Extraction** | ✅ New | `/api/dms/extract-unified`, `/api/extractions/*` with OCR + Claude 3.5 Sonnet |
| **Tab Routing Fix for LAND Projects** | 🐛 Fix | LAND projects now correctly show land-specific tabs instead of income property tabs |

**Removed Endpoints:**
- `GET /api/budget/items?pe_level=phase` ❌ (use `container_id` instead)
- `POST /api/budget/items` with `pe_level` field ❌ (use `container_id`)

**New Endpoints (20+ added):**
- `/api/scenarios/*` (Scenario management)
- `/api/unit-costs/categories/`, `/api/unit-costs/templates/` (Unit cost system)
- `/api/planning-standards/` (Global planning defaults)
- `/api/budget/variance/{project_id}/` (Variance analysis)
- `/api/containers/by_project/{project_id}/` (Hierarchical tree)
- `/api/calculations/irr/`, `/api/calculations/npv/` (Python engine)
- `/api/dms/extract-unified` (AI extraction)
- `/api/benchmarks/absorption-velocity/` (Absorption benchmarks)

---

## Authentication

### JWT Token Authentication

**Django Backend** uses JWT (JSON Web Tokens) for stateless authentication.

#### Obtain Token Pair

```bash
POST /api/token/
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Token Lifetimes:**
- Access token: 60 minutes
- Refresh token: 7 days

#### Refresh Access Token

```bash
POST /api/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Using Authenticated Requests

Include access token in `Authorization` header:

```bash
GET /api/projects/
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Next.js API Routes

Next.js routes currently use **session-based authentication** (middleware validation). JWT support is planned for Q1 2026.

### CORS Configuration

**Allowed Origins (Development):**
- `http://localhost:3000`
- `http://localhost:8000`

**Allowed Methods:**
- GET, POST, PUT, PATCH, DELETE, OPTIONS

**Allowed Headers:**
- Authorization, Content-Type, X-Requested-With

---

## Endpoint Index

### Quick Navigation

| Domain | Django Backend | Next.js Routes |
|--------|---------------|----------------|
| **Projects** | [Django Projects](#projects-django) | [Next.js Projects](#projects-nextjs) |
| **Containers** | [Django Containers](#containers-django) | [Next.js Containers](#containers-nextjs) |
| **Financial** | [Django Financial](#financial-django) | [Next.js Budget](#budget-nextjs) |
| **Scenarios** | [Django Scenarios](#scenarios-django) | N/A |
| **Land Use** | [Django Land Use](#land-use-django) | [Next.js Land Use](#land-use-nextjs) |
| **Multifamily** | [Django Multifamily](#multifamily-django) | [Next.js Multifamily](#multifamily-nextjs) |
| **Commercial** | [Django Commercial](#commercial-django) | [Next.js CRE](#cre-nextjs) |
| **Calculations** | [Django Calculations](#calculations-django) | N/A |
| **Documents** | [Django DMS](#dms-django) | [Next.js DMS](#dms-nextjs) |
| **Benchmarks** | [Django Benchmarks](#benchmarks-django) | [Next.js Benchmarks](#benchmarks-nextjs) |

---

## Django Backend APIs

Base Path: `/api/`
All endpoints return JSON unless otherwise noted.

### Authentication Endpoints

#### Obtain JWT Token
```
POST /api/token/
```

**Request Body:**
```typescript
{
  username: string;
  password: string;
}
```

**Response 200:**
```typescript
{
  access: string;  // JWT access token (60min)
  refresh: string; // JWT refresh token (7 days)
}
```

**Response 401:**
```typescript
{
  detail: "No active account found with the given credentials"
}
```

---

#### Refresh JWT Token
```
POST /api/token/refresh/
```

**Request Body:**
```typescript
{
  refresh: string;
}
```

**Response 200:**
```typescript
{
  access: string;
}
```

---

### Projects (Django)

Base Path: `/api/projects/`

#### List Projects
```
GET /api/projects/
```

**Auth:** Required
**Query Parameters:**
- `project_type_code` (optional): Filter by type (LAND, MF, OFF, RET, IND, HTL, MXU)
- `is_active` (optional): Filter by active status (true/false)
- `ordering` (optional): Sort field (e.g., `-created_at`, `project_name`)
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (default: 20, max: 100)

**Response 200:**
```typescript
{
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    project_id: number;
    project_name: string;
    project_code: string;
    project_type_code: "LAND" | "MF" | "OFF" | "RET" | "IND" | "HTL" | "MXU";
    analysis_type: "Land Development" | "Income Property";
    property_subtype: string;
    property_class?: "Class A" | "Class B" | "Class C" | "Class D" | null;
    total_area_sf: number | null;
    total_units: number | null;
    address_line1?: string | null;
    city?: string | null;
    state_province?: string | null;
    postal_code?: string | null;
    country: string;
    is_active: boolean;
    created_at: string; // ISO 8601
    updated_at: string;
  }>;
}
```

**Database Tables:**
- `landscape.tbl_project`

**Frontend Usage:**
- `src/hooks/useProjects.ts`
- `src/components/projects/ProjectList.tsx`

**Example:**
```bash
curl -H "Authorization: Bearer ${TOKEN}" \
  "http://localhost:8000/api/projects/?project_type_code=LAND&page_size=10"
```

---

#### Create Project
```
POST /api/projects/
```

**Auth:** Required
**Request Body:**
```typescript
{
  project_name: string;          // Required
  project_code: string;          // Required, unique
  project_type_code: "LAND" | "MF" | "OFF" | "RET" | "IND" | "HTL" | "MXU"; // Required
  analysis_type: "Land Development" | "Income Property"; // Required
  property_subtype: string;      // Required
  property_class?: "Class A" | "Class B" | "Class C" | "Class D" | null;
  total_area_sf?: number | null;
  total_units?: number | null;
  address_line1?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string;              // Default: "USA"
  is_active?: boolean;           // Default: true
}
```

**Response 201:**
```typescript
{
  project_id: number;
  project_name: string;
  project_code: string;
  project_type_code: string;
  analysis_type: string;
  property_subtype: string;
  property_class: string | null;
  total_area_sf: number | null;
  total_units: number | null;
  address_line1: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Response 400:**
```typescript
{
  project_code?: ["This field must be unique."];
  project_type_code?: ["Invalid project type code. Must be one of: LAND, MF, OFF, RET, IND, HTL, MXU"];
}
```

**Database Impact:**
- INSERT into `landscape.tbl_project`
- Auto-creates `landscape.tbl_project_config` with default labels
- Auto-creates `landscape.tbl_project_settings` with defaults

**Validation:**
- `project_code` must be unique
- `project_type_code` must be one of 7 canonical codes
- `property_subtype` must match `analysis_type` (validated via type taxonomy)

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "Red Valley Ranch",
    "project_code": "RVR-2025",
    "project_type_code": "LAND",
    "analysis_type": "Land Development",
    "property_subtype": "Master Planned Community",
    "total_area_sf": 21780000,
    "city": "Phoenix",
    "state_province": "AZ",
    "country": "USA"
  }' \
  http://localhost:8000/api/projects/
```

---

#### Get Project Detail
```
GET /api/projects/{id}/
```

**Auth:** Required
**Path Parameters:**
- `id` (integer): Project ID

**Response 200:** (Same schema as Create response)

**Response 404:**
```typescript
{
  detail: "Not found."
}
```

**Database Tables:**
- `landscape.tbl_project`

**Example:**
```bash
curl -H "Authorization: Bearer ${TOKEN}" \
  http://localhost:8000/api/projects/7/
```

---

#### Update Project
```
PUT /api/projects/{id}/
PATCH /api/projects/{id}/
```

**Auth:** Required
**Path Parameters:**
- `id` (integer): Project ID

**Request Body (PUT):** All fields required
**Request Body (PATCH):** Only fields to update

**Response 200:** Updated project object
**Response 400:** Validation errors
**Response 404:** Project not found

**Database Impact:**
- UPDATE `landscape.tbl_project` SET updated_at = NOW()

---

#### Delete Project
```
DELETE /api/projects/{id}/
```

**Auth:** Required
**Path Parameters:**
- `id` (integer): Project ID

**Response 204:** No content (success)
**Response 404:** Project not found

**Database Impact:**
- Sets `is_active = false` (soft delete)
- Does NOT cascade delete related data

⚠️ **Warning:** This is a soft delete. Use Django Admin for hard deletes.

---

#### Get Project Rent Comparables
```
GET /api/projects/{project_pk}/comparables/
```

**Auth:** Required
**Path Parameters:**
- `project_pk` (integer): Project ID

**Query Parameters:**
- `property_type` (optional): Filter by property type
- `distance_miles` (optional): Max distance from project (default: 5.0)

**Response 200:**
```typescript
{
  count: number;
  results: Array<{
    comparable_id: number;
    project: number;
    property_name: string;
    property_type: string;
    address: string;
    distance_miles: number;
    unit_count: number;
    avg_rent_psf: number;
    occupancy_pct: number;
    year_built: number | null;
    sale_date: string | null;
    sale_price: number | null;
    created_at: string;
  }>;
}
```

**Database Tables:**
- `landscape.tbl_rent_comparable`

**Frontend Usage:**
- `src/hooks/useRentComparables.ts`

---

#### Calculate Market Rates
```
POST /api/projects/{project_pk}/market-rates/calculate/
```

**Auth:** Required
**Path Parameters:**
- `project_pk` (integer): Project ID

**Request Body:**
```typescript
{
  comparable_ids: number[];      // IDs of comparables to use
  adjustment_method: "median" | "weighted" | "regression"; // Default: "median"
  distance_weight?: number;      // 0.0-1.0, default 0.3
  age_weight?: number;          // 0.0-1.0, default 0.2
}
```

**Response 200:**
```typescript
{
  market_rate_id: number;
  project: number;
  calculated_rent_psf: number;
  confidence_level: "high" | "medium" | "low";
  comparable_count: number;
  calculation_method: string;
  adjustments_applied: {
    distance: number;
    age: number;
    quality: number;
  };
  calculated_at: string;
}
```

**Database Impact:**
- INSERT into `landscape.tbl_market_rate_analysis`

---

### Containers (Django)

Base Path: `/api/containers/`

#### List Containers
```
GET /api/containers/
```

**Auth:** Required
**Query Parameters:**
- `project_id` (optional): Filter by project
- `container_level` (optional): Filter by level (1, 2, or 3)
- `is_active` (optional): Filter by active status

**Response 200:**
```typescript
{
  count: number;
  results: Array<{
    container_id: number;
    project_id: number;
    parent_container_id: number | null;
    container_level: 1 | 2 | 3;
    container_code: string;
    display_name: string;
    sort_order: number | null;
    attributes: Record<string, any> | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
}
```

**Database Tables:**
- `landscape.tbl_container`

---

#### Get Hierarchical Container Tree
```
GET /api/containers/by_project/{project_id}/
```

**Auth:** Required
**Path Parameters:**
- `project_id` (integer): Project ID

**Response 200:**
```typescript
Array<{
  container_id: number;
  project_id: number;
  parent_container_id: null;      // Always null for level 1
  container_level: 1;
  container_code: string;
  display_name: string;
  sort_order: number;
  attributes: Record<string, any> | null;
  is_active: boolean;
  children: Array<{               // Level 2 containers
    container_id: number;
    parent_container_id: number;
    container_level: 2;
    container_code: string;
    display_name: string;
    sort_order: number;
    children: Array<{             // Level 3 containers
      container_id: number;
      parent_container_id: number;
      container_level: 3;
      container_code: string;
      display_name: string;
      sort_order: number;
      children: [];               // Always empty for level 3
    }>;
  }>;
}>;
```

**Database Tables:**
- `landscape.tbl_container` (recursive CTE query)

**Performance:**
- Single query using PostgreSQL recursive CTE
- Indexed on `project_id`, `parent_container_id`, `container_level`
- Typical response time: <50ms for 200 containers

**Frontend Usage:**
- `src/hooks/useProjectConfig.ts`
- `src/components/PlanningWizard.tsx`
- `src/lib/containerHelpers.ts` (flattening utilities)

**Example:**
```bash
curl -H "Authorization: Bearer ${TOKEN}" \
  http://localhost:8000/api/containers/by_project/7/
```

**TypeScript Example:**
```typescript
import { ContainerNode } from '@/types/containers';

const response = await fetch(`/api/containers/by_project/${projectId}/`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const tree: ContainerNode[] = await response.json();

// Flatten for easy lookup
const flatContainers = flattenContainers(tree);
const level2Containers = getContainersByLevel(flatContainers, 2);
```

---

### Financial (Django)

Base Path: `/api/`

#### List Budget Items
```
GET /api/budget-items/
```

**Auth:** Required
**Query Parameters:**
- `project_id` (optional): Filter by project
- `container_id` (optional): Filter by container
- `category_id` (optional): Filter by category
- `is_committed` (optional): Filter by commitment status

**Response 200:**
```typescript
{
  count: number;
  results: Array<{
    fact_id: number;
    budget_id: number;
    project_id: number;           // New in Migration 013
    container_id: number | null;
    category_id: number;
    category_name: string;        // Joined from core_fin_category
    amount: number;
    confidence_level: "HIGH" | "MEDIUM" | "LOW" | "CONCEPTUAL";
    vendor_contact_id: number | null;
    escalation_rate: number | null;
    contingency_pct: number | null;
    timing_method: string | null;
    contract_number: string | null;
    purchase_order: string | null;
    is_committed: boolean;
    created_at: string;
    updated_at: string;
  }>;
}
```

**Database Tables:**
- `landscape.core_fin_fact_budget`
- `landscape.core_fin_category` (JOIN)
- `landscape.tbl_container` (JOIN when `container_id` present)

**Breaking Change:** `pe_level` field removed. Use `container_id` or `project_id`.

---

#### Get Budget Items by Project
```
GET /api/budget-items/by_project/{project_id}/
```

**Auth:** Required
**Path Parameters:**
- `project_id` (integer): Project ID

**Query Parameters:**
- `scenario_id` (optional): Filter by scenario (default: active scenario)

**Response 200:**
```typescript
{
  project_id: number;
  scenario_id: number;
  total_budget: number;
  total_committed: number;
  total_uncommitted: number;
  items: Array<{
    fact_id: number;
    category_id: number;
    category_name: string;
    container_id: number | null;
    container_name: string | null;
    amount: number;
    confidence_level: string;
    is_committed: boolean;
  }>;
}
```

**Database Tables:**
- `landscape.core_fin_fact_budget`
- `landscape.vw_budget_grid_items` (view)

**Frontend Usage:**
- `src/hooks/useBudgetData.ts`
- `src/components/budget/BudgetDataGrid.tsx`

---

#### Get Budget Rollup
```
GET /api/budget-items/rollup/{project_id}/
```

**Auth:** Required
**Path Parameters:**
- `project_id` (integer): Project ID

**Query Parameters:**
- `group_by` (optional): Grouping level (category, container_level, container) - default: category
- `scenario_id` (optional): Filter by scenario

**Response 200 (group_by=category):**
```typescript
{
  project_id: number;
  scenario_id: number;
  total: number;
  groups: Array<{
    category_id: number;
    category_name: string;
    category_path: string;       // e.g., "Site Work > Grading > Mass Grading"
    total_amount: number;
    item_count: number;
    committed_amount: number;
    uncommitted_amount: number;
  }>;
}
```

**Response 200 (group_by=container_level):**
```typescript
{
  project_id: number;
  scenario_id: number;
  total: number;
  groups: Array<{
    container_level: 0 | 1 | 2 | 3;  // 0 = project-level
    level_label: string;              // e.g., "Phase", "Parcel"
    total_amount: number;
    item_count: number;
    containers: Array<{
      container_id: number;
      container_name: string;
      amount: number;
    }>;
  }>;
}
```

**Database Impact:**
- Complex aggregation query with GROUP BY
- Uses `landscape.vw_budget_rollup` materialized view (refreshed hourly)

**Performance:**
- Indexed on `project_id`, `scenario_id`, `category_id`, `container_id`
- Typical response: <100ms for 1000 items

---

#### Get Variance Report
```
GET /api/budget/variance/{project_id}/
```

**Auth:** Required
**Path Parameters:**
- `project_id` (integer): Project ID

**Query Parameters:**
- `scenario_id` (optional): Scenario to compare
- `threshold_pct` (optional): Minimum variance % to include (default: 5.0)

**Response 200:**
```typescript
{
  project_id: number;
  scenario_id: number;
  total_budget: number;
  total_actual: number;
  total_variance: number;
  variance_pct: number;
  categories: Array<{
    category_id: number;
    category_name: string;
    budget_amount: number;
    actual_amount: number;
    variance_amount: number;
    variance_pct: number;
    variance_status: "over" | "under" | "on_budget";
    containers: Array<{
      container_id: number;
      container_name: string;
      budget_amount: number;
      actual_amount: number;
      variance_amount: number;
      variance_pct: number;
    }>;
  }>;
}
```

**Database Tables:**
- `landscape.vw_budget_variance` (view)
- Joins `core_fin_fact_budget` and `core_fin_fact_actual`

**Frontend Usage:**
- `src/hooks/useBudgetVariance.ts`
- `src/components/budget/VarianceAlertModal.tsx`

---

### Scenarios (Django)

Base Path: `/api/scenarios/`

Scenario management system enables side-by-side financial modeling with instant switching (competitive advantage vs ARGUS).

#### List Scenarios
```
GET /api/scenarios/
```

**Auth:** Required
**Query Parameters:**
- `project` (required): Project ID
- `is_active` (optional): Filter by active status

**Response 200:**
```typescript
{
  count: number;
  results: Array<{
    scenario_id: number;
    project: number;
    scenario_name: string;
    scenario_type: "base" | "optimistic" | "conservative" | "stress" | "custom";
    scenario_code: string;
    is_active: boolean;
    is_locked: boolean;
    display_order: number;
    description: string | null;
    color_hex: string;
    color_class: string;
    variance_method: "percentage" | "absolute" | "mixed";
    revenue_variance_pct: number | null;
    cost_variance_pct: number | null;
    absorption_variance_pct: number | null;
    start_date_offset_months: number;
    created_by: number | null;
    created_at: string;
    updated_at: string;
    cloned_from: number | null;
    clone_count: number;
    can_delete: boolean;
  }>;
}
```

**Database Tables:**
- `landscape.tbl_scenario`

**Frontend Usage:**
- `src/contexts/ScenarioContext.tsx`
- `src/components/scenarios/ScenarioChipManager.tsx`

---

#### Create Scenario
```
POST /api/scenarios/
```

**Auth:** Required
**Request Body:**
```typescript
{
  project: number;               // Required
  scenario_name: string;         // Required
  scenario_type?: "base" | "optimistic" | "conservative" | "stress" | "custom"; // Default: "custom"
  description?: string | null;
  variance_method?: "percentage" | "absolute" | "mixed"; // Default: "percentage"
  revenue_variance_pct?: number | null;
  cost_variance_pct?: number | null;
  absorption_variance_pct?: number | null;
}
```

**Response 201:** Scenario object

**Database Impact:**
- INSERT into `landscape.tbl_scenario`
- Auto-assigns `display_order` as MAX + 1
- Auto-generates `scenario_code` (format: `SC-{project_id}-{sequence}`)
- Sets `color_hex` and `color_class` based on `scenario_type`

**Validation:**
- Max 10 scenarios per project
- `scenario_name` must be unique within project

---

#### Activate Scenario
```
POST /api/scenarios/{id}/activate/
```

**Auth:** Required
**Path Parameters:**
- `id` (integer): Scenario ID

**Request Body:** None

**Response 200:**
```typescript
{
  scenario_id: number;
  is_active: true;
  activated_at: string;
  message: "Scenario activated successfully. Previous active scenario deactivated."
}
```

**Database Impact:**
- UPDATE `landscape.tbl_scenario` SET `is_active = false` WHERE `project = X AND scenario_id != Y`
- UPDATE `landscape.tbl_scenario` SET `is_active = true` WHERE `scenario_id = Y`

**Atomic Operation:** Both updates execute in single transaction.

---

#### Clone Scenario
```
POST /api/scenarios/{id}/clone/
```

**Auth:** Required
**Path Parameters:**
- `id` (integer): Scenario ID

**Request Body:**
```typescript
{
  scenario_name: string;         // Required
  scenario_type?: "base" | "optimistic" | "conservative" | "stress" | "custom";
}
```

**Response 201:**
```typescript
{
  scenario_id: number;
  scenario_name: string;
  cloned_from: number;
  message: "Scenario cloned successfully. All assumptions copied."
}
```

**Database Impact:**
- INSERT new scenario in `landscape.tbl_scenario`
- Deep copy ALL related data:
  - `core_fin_fact_budget` (budget items)
  - `tbl_revenue_item` (revenue assumptions)
  - `tbl_finance_structure` (financing structures)
  - `tbl_absorption_schedule` (absorption schedules)
- INCREMENT `clone_count` on source scenario

**Performance:** Typical clone time <500ms for 1000 budget items.

---

#### Lock/Unlock Scenario
```
POST /api/scenarios/{id}/lock/
POST /api/scenarios/{id}/unlock/
```

**Auth:** Required (admin or scenario creator only)
**Path Parameters:**
- `id` (integer): Scenario ID

**Request Body:** None

**Response 200:**
```typescript
{
  scenario_id: number;
  is_locked: boolean;
  locked_at: string | null;
  message: "Scenario locked. No edits allowed." | "Scenario unlocked."
}
```

**Database Impact:**
- UPDATE `landscape.tbl_scenario` SET `is_locked = {true|false}`

**Frontend Behavior:** Locked scenarios show read-only UI, disabled edit buttons.

---

### Land Use (Django)

Base Path: `/api/landuse/`

#### List Land Use Families
```
GET /api/landuse/families/
```

**Auth:** Required

**Response 200:**
```typescript
{
  count: number;
  results: Array<{
    family_id: number;
    family_code: string;
    family_name: string;
    description: string | null;
    sort_order: number;
    is_active: boolean;
  }>;
}
```

**Database Tables:**
- `landscape.lu_family`

---

#### List Land Use Types
```
GET /api/landuse/types/
```

**Auth:** Required
**Query Parameters:**
- `family_id` (optional): Filter by family

**Response 200:**
```typescript
{
  count: number;
  results: Array<{
    type_id: number;
    family_id: number;
    family_name: string;
    type_code: string;
    type_name: string;
    description: string | null;
    sort_order: number;
    is_active: boolean;
  }>;
}
```

**Database Tables:**
- `landscape.lu_type`
- `landscape.lu_family` (JOIN)

---

#### List Lot Products
```
GET /api/landuse/products/
```

**Auth:** Required
**Query Parameters:**
- `type_id` (optional): Filter by type
- `project_id` (optional): Filter by project

**Response 200:**
```typescript
{
  count: number;
  results: Array<{
    product_id: number;
    type_id: number;
    type_name: string;
    product_code: string;
    product_name: string;
    lot_size_sf: number | null;
    lot_width_ft: number | null;
    lot_depth_ft: number | null;
    base_price: number | null;
    is_active: boolean;
  }>;
}
```

**Database Tables:**
- `landscape.res_lot_product`
- `landscape.lu_type` (JOIN)

---

#### Get Inventory by Container
```
GET /api/landuse/inventory/by_container/{container_id}/
```

**Auth:** Required
**Path Parameters:**
- `container_id` (integer): Container ID

**Response 200:**
```typescript
{
  container_id: number;
  container_name: string;
  total_units: number;
  total_sf: number;
  items: Array<{
    inventory_id: number;
    container_id: number;
    product_id: number;
    product_name: string;
    unit_count: number;
    total_sf: number;
    avg_price_per_unit: number;
    total_revenue: number;
  }>;
}
```

**Database Tables:**
- `landscape.tbl_landuse_inventory`
- `landscape.res_lot_product` (JOIN)
- `landscape.tbl_container` (JOIN)

---

### Calculations (Django)

Base Path: `/api/calculations/`

Python-based financial calculation engine using numpy-financial (5-10x faster than JavaScript).

#### Calculate IRR
```
POST /api/calculations/irr/
```

**Auth:** Required
**Request Body:**
```typescript
{
  cash_flows: number[];          // Array of cash flows (period 0 = initial investment as negative)
  guess?: number;                // Initial guess for IRR (default: 0.1)
}
```

**Example:**
```json
{
  "cash_flows": [-1000000, 100000, 150000, 200000, 250000, 1200000],
  "guess": 0.1
}
```

**Response 200:**
```typescript
{
  irr: number;                   // Internal Rate of Return (decimal, e.g., 0.1542 = 15.42%)
  irr_pct: number;               // IRR as percentage (e.g., 15.42)
  periods: number;               // Number of periods
  initial_investment: number;    // Absolute value of period 0 cash flow
}
```

**Response 400:**
```typescript
{
  error: "Could not calculate IRR. Check cash flows."
}
```

**Calculation Engine:**
- Uses `numpy_financial.irr()` from Python
- Handles edge cases (all positive/negative flows, no solution)
- Precision: 4 decimal places

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "cash_flows": [-1000000, 100000, 150000, 200000, 250000, 1200000]
  }' \
  http://localhost:8000/api/calculations/irr/
```

**TypeScript Example:**
```typescript
const response = await fetch('/api/calculations/irr/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    cash_flows: [-1_000_000, 100_000, 150_000, 200_000, 250_000, 1_200_000]
  })
});

const { irr, irr_pct } = await response.json();
// irr = 0.1542, irr_pct = 15.42
```

---

#### Calculate NPV
```
POST /api/calculations/npv/
```

**Auth:** Required
**Request Body:**
```typescript
{
  rate: number;                  // Discount rate (decimal, e.g., 0.1 = 10%)
  cash_flows: number[];          // Array of cash flows (period 0 = initial investment as negative)
}
```

**Response 200:**
```typescript
{
  npv: number;                   // Net Present Value
  discount_rate: number;         // Echo of input rate
  periods: number;
}
```

**Calculation Engine:**
- Uses `numpy_financial.npv()` from Python
- Formula: NPV = Σ(CF_t / (1 + r)^t)

---

#### Calculate DSCR
```
POST /api/calculations/dscr/
```

**Auth:** Required
**Request Body:**
```typescript
{
  noi: number;                   // Net Operating Income
  debt_service: number;          // Annual debt service (principal + interest)
}
```

**Response 200:**
```typescript
{
  dscr: number;                  // Debt Service Coverage Ratio
  dscr_status: "acceptable" | "marginal" | "unacceptable"; // >= 1.25 / 1.0-1.25 / < 1.0
  noi: number;
  debt_service: number;
}
```

**Calculation:**
- DSCR = NOI / Debt Service
- Typical lender requirement: DSCR >= 1.25

---

#### Calculate All Metrics
```
POST /api/calculations/metrics/
```

**Auth:** Required
**Request Body:**
```typescript
{
  cash_flows: number[];          // Required
  discount_rate: number;         // Required (decimal)
  noi?: number;                  // Optional (for DSCR)
  debt_service?: number;         // Optional (for DSCR)
}
```

**Response 200:**
```typescript
{
  irr: number;
  irr_pct: number;
  npv: number;
  dscr: number | null;
  equity_multiple: number;       // Total cash returned / initial investment
  average_annual_return: number;
  payback_period_years: number | null;
  calculated_at: string;
}
```

**Frontend Usage:**
- `src/hooks/useProjectMetrics.ts`
- `src/components/projects/MetricsDashboard.tsx`

---

### Multifamily (Django)

Base Path: `/api/multifamily/`

#### List Units
```
GET /api/multifamily/units/
```

**Auth:** Required
**Query Parameters:**
- `project_id` (required): Project ID
- `unit_type_id` (optional): Filter by unit type
- `status` (optional): Filter by status (vacant, occupied, notice, maintenance)

**Response 200:**
```typescript
{
  count: number;
  results: Array<{
    unit_id: number;
    project_id: number;
    unit_number: string;
    unit_type_id: number;
    unit_type_name: string;
    building_name: string | null;
    floor_number: number | null;
    square_feet: number;
    bedrooms: number;
    bathrooms: number;
    market_rent: number;
    status: "vacant" | "occupied" | "notice" | "maintenance";
    lease_id: number | null;
    tenant_name: string | null;
    lease_start_date: string | null;
    lease_end_date: string | null;
    current_rent: number | null;
  }>;
}
```

**Database Tables:**
- `landscape.tbl_multifamily_unit`
- `landscape.tbl_multifamily_unit_type` (JOIN)
- `landscape.tbl_multifamily_lease` (LEFT JOIN)

---

#### Get Units by Project (with Occupancy Stats)
```
GET /api/multifamily/units/by_project/{project_id}/
```

**Auth:** Required
**Path Parameters:**
- `project_id` (integer): Project ID

**Response 200:**
```typescript
{
  project_id: number;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  notice_units: number;
  maintenance_units: number;
  occupancy_rate: number;        // Decimal (e.g., 0.85 = 85%)
  avg_rent_psf: number;
  total_monthly_rent: number;
  units: Array<{...}>;           // Same as List Units response
}
```

**Database Tables:**
- `landscape.vw_multifamily_occupancy` (view)

---

#### List Leases
```
GET /api/multifamily/leases/
```

**Auth:** Required
**Query Parameters:**
- `project_id` (required): Project ID
- `status` (optional): Filter by status (active, expired, pending)

**Response 200:**
```typescript
{
  count: number;
  results: Array<{
    lease_id: number;
    unit_id: number;
    unit_number: string;
    tenant_name: string;
    lease_start_date: string;    // ISO 8601 date
    lease_end_date: string;
    monthly_rent: number;
    security_deposit: number;
    lease_type: "standard" | "month_to_month" | "corporate" | "concession";
    status: "active" | "expired" | "pending";
    is_renewal: boolean;
    previous_lease_id: number | null;
  }>;
}
```

**Database Tables:**
- `landscape.tbl_multifamily_lease`
- `landscape.tbl_multifamily_unit` (JOIN)

---

#### Get Expiring Leases
```
GET /api/multifamily/leases/expirations/{project_id}/
```

**Auth:** Required
**Path Parameters:**
- `project_id` (integer): Project ID

**Query Parameters:**
- `months` (optional): Months ahead to look (default: 3)

**Response 200:**
```typescript
{
  project_id: number;
  expiration_window_months: number;
  expiring_count: number;
  expiring_leases: Array<{
    lease_id: number;
    unit_number: string;
    tenant_name: string;
    lease_end_date: string;
    days_until_expiration: number;
    monthly_rent: number;
    renewal_probability: "high" | "medium" | "low";
  }>;
}
```

**Database Tables:**
- `landscape.vw_multifamily_lease_expirations` (view)

**Frontend Usage:**
- `src/hooks/useLeaseExpirations.ts`
- `src/components/multifamily/ExpirationsDashboard.tsx`

---

### Benchmarks (Django)

Base Path: `/api/benchmarks/`

#### List Absorption Velocity Benchmarks
```
GET /api/benchmarks/absorption-velocity/
```

**Auth:** Required
**Query Parameters:**
- `product_type` (optional): Filter by product type (e.g., "SFD", "Townhome")
- `market` (optional): Filter by market name
- `price_range_min` (optional): Min price filter
- `price_range_max` (optional): Max price filter

**Response 200:**
```typescript
{
  count: number;
  results: Array<{
    velocity_id: number;
    product_type: string;
    market_name: string;
    avg_monthly_absorption: number;
    median_monthly_absorption: number;
    price_range_low: number;
    price_range_high: number;
    sample_size: number;
    data_source: string;
    observation_period_start: string;
    observation_period_end: string;
    created_at: string;
  }>;
}
```

**Database Tables:**
- `landscape.tbl_absorption_velocity`

**Frontend Usage:**
- `src/hooks/useBenchmarks.ts`
- `src/app/benchmarks/absorption/page.tsx`

---

### Documents (DMS - Django)

Base Path: `/api/dms/`

Document Management System with AI-powered extraction.

#### Upload Document for Extraction
```
POST /api/dms/upload/
```

**Auth:** Required
**Request:** Multipart form data

**Form Fields:**
```typescript
{
  file: File;                    // PDF, PNG, JPG, JPEG (max 50MB)
  project_id: string;            // Required
  document_type: string;         // "offering_memo" | "rent_roll" | "appraisal" | "market_report"
  extract_sections?: string;     // Comma-separated: "financials,rent_roll,market_analysis"
}
```

**Response 201:**
```typescript
{
  document_id: number;
  file_name: string;
  file_size_bytes: number;
  document_type: string;
  upload_status: "processing";
  extraction_job_id: string;     // UUID for polling
  estimated_completion_seconds: number;
}
```

**Database Impact:**
- INSERT into `landscape.tbl_dms_document`
- Creates extraction job in `landscape.tbl_dms_extraction_review`
- Triggers async OCR + Claude AI extraction

**Async Processing:**
1. OCR extraction (Tesseract)
2. Section detection (Claude 3.5 Sonnet)
3. Field extraction (Claude with JSON schema)
4. Confidence scoring
5. Staging for review

**Polling for Status:**
```
GET /api/dms/staging/{doc_id}/
```

---

#### Get Staging Data for Review
```
GET /api/dms/staging/{doc_id}/
```

**Auth:** Required
**Path Parameters:**
- `doc_id` (integer): Document ID

**Response 200:**
```typescript
{
  document_id: number;
  extraction_status: "processing" | "ready_for_review" | "completed" | "failed";
  progress_pct: number;
  sections_extracted: Array<{
    section_id: number;
    section_type: string;
    confidence: number;           // 0.0 - 1.0
    fields: Array<{
      field_name: string;
      field_value: any;
      confidence: number;
      source_method: "ocr" | "claude_extract" | "inferred";
      needs_review: boolean;
    }>;
  }>;
  error_message: string | null;
}
```

**Database Tables:**
- `landscape.tbl_dms_extraction_review`
- `landscape.tbl_dms_document_section`

**Frontend Usage:**
- `src/components/documents/ExtractionReview.tsx`

---

#### Commit Reviewed Data
```
POST /api/dms/staging/{doc_id}/commit/
```

**Auth:** Required
**Path Parameters:**
- `doc_id` (integer): Document ID

**Request Body:**
```typescript
{
  approved_fields: Array<{
    field_name: string;
    field_value: any;
    corrected_value?: any;       // If user made correction
  }>;
  rejected_fields: string[];     // Field names to ignore
  user_corrections: Array<{
    field_name: string;
    original_value: any;
    corrected_value: any;
    correction_reason?: string;
  }>;
}
```

**Response 200:**
```typescript
{
  committed: boolean;
  records_created: number;
  records_updated: number;
  corrections_logged: number;
  message: "Data committed successfully to database."
}
```

**Database Impact:**
- INSERT/UPDATE into target tables (e.g., `tbl_cre_space`, `tbl_multifamily_unit`)
- INSERT user corrections into `landscape.tbl_dms_user_correction`
- UPDATE `landscape.tbl_dms_extraction_review` SET `status = 'completed'`

**Active Learning:**
- User corrections feed back into model fine-tuning pipeline
- Corrections stored with confidence delta for training

---

## Next.js API Routes

Base Path: `/api/`

### Projects (Next.js)

#### List Projects (Minimal)
```
GET /api/projects/minimal
```

**Auth:** Session-based
**Response 200:**
```typescript
Array<{
  project_id: number;
  project_name: string;
  project_code: string;
  project_type_code: string;
}>
```

**Usage:** Project selector dropdown

---

#### Get Project Containers
```
GET /api/projects/[projectId]/containers
```

**Auth:** Session-based
**Path Parameters:**
- `projectId` (integer): Project ID

**Response 200:** Same as Django `/api/containers/by_project/{id}/`

---

#### Get Project Configuration
```
GET /api/projects/[projectId]/config
```

**Auth:** Session-based
**Path Parameters:**
- `projectId` (integer): Project ID

**Response 200:**
```typescript
{
  project_id: number;
  asset_type: string;
  level1_label: string;
  level2_label: string;
  level3_label: string;
  level1_label_plural: string;
  level2_label_plural: string;
  level3_label_plural: string;
  land_use_level1_label?: string;
  land_use_level1_label_plural?: string;
  land_use_level2_label?: string;
  land_use_level2_label_plural?: string;
  land_use_level3_label?: string;
  land_use_level3_label_plural?: string;
}
```

**Database Tables:**
- `landscape.tbl_project_config`

**Frontend Usage:**
- `src/hooks/useProjectConfig.ts` (primary consumer)
- Provides dynamic labels to all UI components

**Example:**
```typescript
const { data: config } = useProjectConfig(projectId);

// For LAND projects:
config.level1_label === "Plan Area"
config.level2_label === "Phase"
config.level3_label === "Parcel"

// For MF projects:
config.level1_label === "Property"
config.level2_label === "Building"
config.level3_label === "Unit"
```

---

### Budget (Next.js)

#### Get Budget Items by Project
```
GET /api/budget/items/[projectId]
```

**Auth:** Session-based
**Path Parameters:**
- `projectId` (integer): Project ID

**Query Parameters:**
- `container_id` (optional): Filter by container
- `category_id` (optional): Filter by category

**Response 200:** Proxies to Django `/api/budget-items/by_project/{id}/`

---

### Land Use (Next.js)

#### Get Land Use Families
```
GET /api/land-use/families
```

**Auth:** Session-based
**Response 200:**
```typescript
Array<{
  family_id: number;
  family_code: string;
  family_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}>
```

**Database:** Direct query to `landscape.lu_family`

---

#### Get Land Use Types by Family
```
GET /api/landuse/types/[familyId]
```

**Auth:** Session-based
**Path Parameters:**
- `familyId` (integer): Family ID

**Response 200:**
```typescript
Array<{
  type_id: number;
  family_id: number;
  type_code: string;
  type_name: string;
  description: string | null;
}>
```

---

### DMS (Next.js)

#### Search Documents
```
GET /api/dms/search
```

**Auth:** Session-based
**Query Parameters:**
- `q` (optional): Search query
- `project_id` (optional): Filter by project
- `document_type` (optional): Filter by type
- `tags` (optional): Comma-separated tag IDs

**Response 200:**
```typescript
{
  total: number;
  results: Array<{
    document_id: number;
    file_name: string;
    document_type: string;
    project_id: number;
    project_name: string;
    folder_path: string;
    tags: string[];
    file_size_bytes: number;
    created_at: string;
    updated_at: string;
  }>;
}
```

**Database Tables:**
- `landscape.tbl_dms_document`
- Full-text search on `file_name` and `tags`

---

## Domain-Specific Guides

### Container Hierarchy Management

**Use Case:** Navigate project structure (Area → Phase → Parcel or Property → Building → Unit)

**Primary Endpoint:**
```
GET /api/containers/by_project/{project_id}/
```

**Response Structure:**
```typescript
// Level 1 containers (always parent_container_id = null)
[
  {
    container_id: 100,
    container_level: 1,
    display_name: "North Area",
    children: [
      // Level 2 containers
      {
        container_id: 200,
        container_level: 2,
        display_name: "Phase 1",
        parent_container_id: 100,
        children: [
          // Level 3 containers
          {
            container_id: 300,
            container_level: 3,
            display_name: "Parcel 1A",
            parent_container_id: 200,
            children: []
          }
        ]
      }
    ]
  }
]
```

**Helper Functions:**
```typescript
import { flattenContainers, getContainersByLevel } from '@/lib/containerHelpers';

const tree = await fetch(`/api/containers/by_project/${projectId}`).then(r => r.json());

// Flatten for easy lookup
const flat = flattenContainers(tree);
// [{ container_id: 100, ... }, { container_id: 200, ... }, { container_id: 300, ... }]

// Get all level 2 containers
const phases = getContainersByLevel(flat, 2);
```

**Dynamic Labels:**
```typescript
const config = await fetch(`/api/projects/${projectId}/config`).then(r => r.json());

// Display button: "Add {level2_label}"
<button>Add {config.level2_label}</button>
// → "Add Phase" for LAND
// → "Add Building" for MF
```

---

### Scenario Workflow

**Use Case:** Create optimistic scenario, clone from base, activate, compare

**Step 1: List Scenarios**
```typescript
const scenarios = await fetch(`/api/scenarios/?project=${projectId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

**Step 2: Clone Base Scenario**
```typescript
const baseScenario = scenarios.results.find(s => s.scenario_type === 'base');

const clonedScenario = await fetch(`/api/scenarios/${baseScenario.scenario_id}/clone/`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    scenario_name: 'Optimistic Case',
    scenario_type: 'optimistic'
  })
}).then(r => r.json());
```

**Step 3: Activate New Scenario**
```typescript
await fetch(`/api/scenarios/${clonedScenario.scenario_id}/activate/`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Step 4: Budget Queries Automatically Filter**
```typescript
// After activation, all budget queries automatically use active scenario
const budgetItems = await fetch(`/api/budget-items/by_project/${projectId}/`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
// Returns items for newly activated "Optimistic Case" scenario
```

**Frontend Integration:**
```typescript
// ScenarioContext automatically refetches on activation
import { useScenario } from '@/contexts/ScenarioContext';

function BudgetTab() {
  const { activeScenario, activateScenario } = useScenario(projectId);

  const handleScenarioSwitch = async (scenarioId: number) => {
    await activateScenario(scenarioId);
    // Budget grid auto-refreshes via SWR revalidation
  };
}
```

---

### Budget Variance Analysis

**Use Case:** Compare budget vs actual, flag categories >5% over budget

**Primary Endpoint:**
```
GET /api/budget/variance/{project_id}/
```

**Filter by Threshold:**
```typescript
const variance = await fetch(
  `/api/budget/variance/${projectId}/?threshold_pct=5.0`,
  { headers: { 'Authorization': `Bearer ${token}` }}
).then(r => r.json());

// Returns only categories with variance >= 5%
variance.categories.forEach(category => {
  if (category.variance_status === 'over') {
    console.warn(`${category.category_name} is ${category.variance_pct}% over budget`);
  }
});
```

**Reconciliation:**
```typescript
// User approves variance as justified
await fetch(`/api/budget/reconcile/${projectId}/category/${categoryId}/`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reconciliation_note: 'Approved: Market rate increase for excavation',
    approved_by: userId
  })
});
```

---

## Data Contracts

### Canonical Project Type Codes

**Migration 013 Standardization**

| Code | Name | Analysis Type | Description |
|------|------|---------------|-------------|
| `LAND` | Land Development | Land Development | Raw land, subdivisions, master planned communities |
| `MF` | Multifamily | Income Property | Apartments, condos, student/senior housing |
| `OFF` | Office | Income Property | Office buildings, medical office, flex/R&D |
| `RET` | Retail | Income Property | Shopping centers, malls, strip centers |
| `IND` | Industrial | Income Property | Warehouse, distribution, manufacturing, self-storage |
| `HTL` | Hotel | Income Property | Hotels, resorts, hospitality |
| `MXU` | Mixed-Use | Income Property or Land Development | Mixed-use developments |

**Database Constraint:**
```sql
ALTER TABLE landscape.tbl_project
  ADD CONSTRAINT chk_project_type_code
  CHECK (project_type_code IN ('LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'));
```

**TypeScript Type:**
```typescript
export type ProjectTypeCode = 'LAND' | 'MF' | 'OFF' | 'RET' | 'IND' | 'HTL' | 'MXU';
```

---

### Container Interface

```typescript
export interface Container {
  container_id: number;
  project_id: number;
  parent_container_id: number | null;
  container_level: 1 | 2 | 3;
  container_code: string;
  display_name: string;
  sort_order: number | null;
  attributes?: Record<string, unknown> | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ContainerNode extends Container {
  children: ContainerNode[];
}
```

**Source:** `src/types/containers.ts:1-19`

---

### Scenario Interface

```typescript
export type ScenarioType = 'base' | 'optimistic' | 'conservative' | 'stress' | 'custom';

export interface Scenario {
  scenario_id: number;
  project: number;
  scenario_name: string;
  scenario_type: ScenarioType;
  scenario_code: string;
  is_active: boolean;
  is_locked: boolean;
  display_order: number;
  description?: string;
  color_hex: string;
  color_class: string;
  variance_method?: 'percentage' | 'absolute' | 'mixed';
  revenue_variance_pct?: number;
  cost_variance_pct?: number;
  absorption_variance_pct?: number;
  start_date_offset_months: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  cloned_from?: number;
  clone_count: number;
  can_delete: boolean;
}
```

**Source:** `src/types/scenario.ts:9-44`

---

### Budget Item Interface

```typescript
export interface EnhancedBudgetFact {
  fact_id: number;
  budget_id?: number;
  container_id: number | null;
  category_id?: number;
  amount: number;
  confidence_level?: 'high' | 'medium' | 'low' | 'guess' | null;
  vendor_contact_id?: number | null;
  escalation_rate?: number | null;
  contingency_pct?: number | null;
  timing_method?: string | null;
  contract_number?: string | null;
  purchase_order?: string | null;
  is_committed: boolean;
  tags?: BudgetTag[];
}
```

**Source:** `src/types/containers.ts:74-89`

---

## Frontend Integration

### Custom Hooks

#### useProjectConfig
```typescript
// src/hooks/useProjectConfig.ts
import useSWR from 'swr';

export function useProjectConfig(projectId: number) {
  const { data, error, isLoading } = useSWR(
    projectId ? `/api/projects/${projectId}/config` : null,
    fetcher
  );

  return {
    config: data,
    labels: data ? {
      level1Label: data.level1_label,
      level2Label: data.level2_label,
      level3Label: data.level3_label,
      level1LabelPlural: data.level1_label_plural,
      level2LabelPlural: data.level2_label_plural,
      level3LabelPlural: data.level3_label_plural,
    } : null,
    isLoading,
    error
  };
}
```

**Usage:**
```typescript
const { labels } = useProjectConfig(projectId);

return (
  <button>
    Add {labels?.level2Label ?? 'Container'}
  </button>
);
```

---

#### useBudgetVariance
```typescript
// src/hooks/useBudgetVariance.ts
import useSWR from 'swr';

export function useBudgetVariance(projectId: number, thresholdPct = 5.0) {
  const { data, error, isLoading } = useSWR(
    projectId ? `/api/budget/variance/${projectId}/?threshold_pct=${thresholdPct}` : null,
    fetcher
  );

  const overBudgetCategories = data?.categories?.filter(
    c => c.variance_status === 'over'
  ) ?? [];

  const totalVariance = data?.total_variance ?? 0;
  const variancePct = data?.variance_pct ?? 0;

  return {
    variance: data,
    overBudgetCategories,
    totalVariance,
    variancePct,
    isLoading,
    error
  };
}
```

**Source:** `src/hooks/useBudgetVariance.ts`

---

### Context Providers

#### ScenarioContext
```typescript
// src/contexts/ScenarioContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';

interface ScenarioContextValue {
  scenarios: Scenario[];
  activeScenario: Scenario | null;
  activateScenario: (scenarioId: number) => Promise<void>;
  cloneScenario: (scenarioId: number, name: string) => Promise<Scenario>;
  isLoading: boolean;
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export function ScenarioProvider({ projectId, children }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    fetchScenarios(projectId).then(data => {
      setScenarios(data.results);
      setActiveScenario(data.results.find(s => s.is_active) || null);
    });
  }, [projectId]);

  const activateScenario = async (scenarioId: number) => {
    await fetch(`/api/scenarios/${scenarioId}/activate/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Refetch scenarios
    const data = await fetchScenarios(projectId);
    setScenarios(data.results);
    setActiveScenario(data.results.find(s => s.is_active) || null);
  };

  return (
    <ScenarioContext.Provider value={{ scenarios, activeScenario, activateScenario, cloneScenario, isLoading }}>
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenario(projectId: number) {
  const context = useContext(ScenarioContext);
  if (!context) throw new Error('useScenario must be used within ScenarioProvider');
  return context;
}
```

**Usage:**
```typescript
// In project layout
<ScenarioProvider projectId={projectId}>
  <ProjectTabs />
</ScenarioProvider>

// In child components
function BudgetTab() {
  const { activeScenario, activateScenario } = useScenario(projectId);

  return (
    <div>
      Active: {activeScenario?.scenario_name}
      <button onClick={() => activateScenario(nextScenarioId)}>
        Switch Scenario
      </button>
    </div>
  );
}
```

---

## Breaking Changes

### Migration 013: property_type_code → project_type_code

**Date:** 2025-11-02
**Impact:** 🔴 Breaking

**What Changed:**
- Database column renamed: `tbl_project.property_type_code` → `tbl_project.project_type_code`
- 7 canonical codes enforced: LAND, MF, OFF, RET, IND, HTL, MXU
- All frontend/backend references updated

**Migration Path:**
```sql
-- Migration 013
ALTER TABLE landscape.tbl_project
  RENAME COLUMN property_type_code TO project_type_code;

ALTER TABLE landscape.tbl_project
  ADD CONSTRAINT chk_project_type_code
  CHECK (project_type_code IN ('LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'));
```

**Frontend Changes:**
- 21 files updated to use `project_type_code`
- TypeScript type: `ProjectTypeCode` (no longer `PropertyTypeCode`)

**Action Required:**
1. Update all API clients to use `project_type_code` field
2. Replace legacy codes (e.g., `RESIDENTIAL` → `LAND`, `APARTMENT` → `MF`)
3. Update TypeScript imports: `import { ProjectTypeCode } from '@/types/project-taxonomy'`

**Verification:**
```bash
# Check if any legacy references remain
grep -r "property_type_code" src/
# Should return 0 results
```

---

### Migration 011: pe_level Removal

**Date:** 2025-10-15
**Impact:** 🔴 Breaking

**What Changed:**
- Enum type `landscape.pe_level` dropped
- Columns `pe_level`, `pe_id` removed from `core_fin_fact_budget` and `core_fin_fact_actual`
- All queries now use `container_id` or `project_id`

**Before (INVALID):**
```typescript
// ❌ This no longer works
const response = await fetch('/api/budget/items?pe_level=phase&pe_id=5');
```

**After (CORRECT):**
```typescript
// ✅ Use container_id
const response = await fetch('/api/budget/items?container_id=200');

// ✅ Or project-level query
const response = await fetch('/api/budget/items/by_project/7/');
```

**Database Schema Change:**
```sql
-- BEFORE
CREATE TYPE landscape.pe_level AS ENUM ('project', 'area', 'phase', 'parcel', 'lot');

CREATE TABLE landscape.core_fin_fact_budget (
  fact_id BIGSERIAL PRIMARY KEY,
  pe_level landscape.pe_level,
  pe_id TEXT,
  ...
);

-- AFTER
CREATE TABLE landscape.core_fin_fact_budget (
  fact_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES landscape.tbl_project,
  container_id BIGINT REFERENCES landscape.tbl_container,
  ...
);
```

**Action Required:**
1. Replace all `pe_level` query parameters with `container_id`
2. Update TypeScript interfaces to remove `pe_level` field
3. Use container hierarchy for budget queries

---

### Scenario Management Introduction

**Date:** 2025-10-24
**Impact:** ✅ New Feature (Non-Breaking)

**What's New:**
- `/api/scenarios/` CRUD endpoints
- Custom actions: `activate`, `clone`, `lock`, `unlock`
- Automatic scenario filtering via `ScenarioFilterMixin` in Django ViewSets
- ScenarioContext in React for chip-based switching

**Adoption:**
```typescript
// All budget queries automatically respect active scenario
const budgetItems = await fetch(`/api/budget-items/by_project/${projectId}/`);
// Returns items for currently active scenario

// Override to query specific scenario
const budgetItems = await fetch(`/api/budget-items/by_project/${projectId}/?scenario_id=5`);
```

**No Breaking Changes:** Existing endpoints continue to work, defaulting to active scenario.

---

## Verification

### Curl Test Suite

Copy and paste these commands to verify API functionality locally.

#### Setup
```bash
# Set environment variables
export API_BASE="http://localhost:8000"
export USERNAME="admin"
export PASSWORD="admin123"

# Obtain JWT token
export TOKEN=$(curl -s -X POST "${API_BASE}/api/token/" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}" \
  | jq -r '.access')

echo "Token: ${TOKEN}"
```

---

#### Test 1: List Projects
```bash
curl -s -H "Authorization: Bearer ${TOKEN}" \
  "${API_BASE}/api/projects/" | jq '.'
```

**Expected:** JSON array of projects with `project_type_code` field (not `property_type_code`)

---

#### Test 2: Create Project
```bash
curl -s -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "Test Project",
    "project_code": "TEST-001",
    "project_type_code": "LAND",
    "analysis_type": "Land Development",
    "property_subtype": "Subdivision"
  }' \
  "${API_BASE}/api/projects/" | jq '.'
```

**Expected:** 201 response with created project object

---

#### Test 3: Get Container Tree
```bash
# Replace PROJECT_ID with actual project ID
export PROJECT_ID=7

curl -s -H "Authorization: Bearer ${TOKEN}" \
  "${API_BASE}/api/containers/by_project/${PROJECT_ID}/" | jq '.'
```

**Expected:** Hierarchical tree with nested `children` arrays

---

#### Test 4: List Scenarios
```bash
curl -s -H "Authorization: Bearer ${TOKEN}" \
  "${API_BASE}/api/scenarios/?project=${PROJECT_ID}" | jq '.'
```

**Expected:** Array of scenarios with one marked `is_active: true`

---

#### Test 5: Calculate IRR
```bash
curl -s -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "cash_flows": [-1000000, 100000, 150000, 200000, 250000, 1200000]
  }' \
  "${API_BASE}/api/calculations/irr/" | jq '.'
```

**Expected:** `{ "irr": 0.1542, "irr_pct": 15.42, ... }`

---

#### Test 6: Get Budget Variance
```bash
curl -s -H "Authorization: Bearer ${TOKEN}" \
  "${API_BASE}/api/budget/variance/${PROJECT_ID}/" | jq '.'
```

**Expected:** Variance report with categories array

---

### Validation Checklist

Use this checklist to verify a local development environment:

- [ ] **Authentication**
  - [ ] Obtain JWT token successfully
  - [ ] Access protected endpoint with token
  - [ ] Receive 401 when using invalid token

- [ ] **Projects**
  - [ ] List projects returns results
  - [ ] Create project with valid `project_type_code`
  - [ ] Get project detail
  - [ ] Update project (PATCH)
  - [ ] Verify `project_type_code` field (NOT `property_type_code`)

- [ ] **Containers**
  - [ ] Get hierarchical tree for a project
  - [ ] Verify 3 levels of nesting
  - [ ] Create new container

- [ ] **Budget**
  - [ ] List budget items for project
  - [ ] Verify `container_id` field present
  - [ ] Verify NO `pe_level` field
  - [ ] Get budget rollup
  - [ ] Get variance report

- [ ] **Scenarios**
  - [ ] List scenarios for project
  - [ ] Activate scenario
  - [ ] Clone scenario
  - [ ] Verify budget queries filter by active scenario

- [ ] **Calculations**
  - [ ] Calculate IRR from cash flows
  - [ ] Calculate NPV
  - [ ] Get all metrics

- [ ] **Frontend Integration**
  - [ ] useProjectConfig hook returns labels
  - [ ] ScenarioContext provides activeScenario
  - [ ] Budget grid displays data

---

## Changelog Footnotes

### Notable Migrations

| Migration | Date | Description | Impact |
|-----------|------|-------------|--------|
| 015 | 2025-11-08 | Unit Cost APIs & Planning Defaults | ✅ New endpoints for benchmarking |
| 014 | 2025-11-07 | Unit Cost Templates & Product Library | ✅ New tables for unit costs |
| 013 | 2025-11-02 | Project Type Code Standardization | 🔴 Breaking: Renamed column |
| 012 | 2025-10-24 | Scenario Management System | ✅ New feature: Scenario CRUD |
| 011 | 2025-10-15 | Drop pe_level Column/Enum | 🔴 Breaking: Removed legacy fields |
| 010 | 2025-10-15 | Container Index Migration | ✅ Performance: New indexes |
| 009 | 2025-10-15 | Container Queries + project_id | ✅ Added project_id to fact tables |

---

### Recent Commits Affecting API

```
cafa56b - fix: add budget components to resolve build error
c62a3c2 - docs: update Architecture documentation with Migration 013 details
cf9e7e5 - fix: cascading dropdown type mismatch in Parcel Detail flyout
e65401f - fix: complete Parcel Detail flyout field layout fixes
50f7c0b - fix: create missing /api/landuse/subtypes endpoint
```

---

## Appendix

### Environment Variables

**Django Backend (`backend/.env`):**
```bash
SECRET_KEY=<django-secret-key>
DEBUG=True
DATABASE_URL=postgresql://user:password@host:5432/dbname
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000

# JWT Settings
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7

# Python Calculation Engine
FINANCIAL_ENGINE_PATH=../services/financial_engine_py
```

**Next.js Frontend (`.env.local`):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
DJANGO_API_URL=http://localhost:8000
DATABASE_URL=postgresql://user:password@host:5432/dbname
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

### Error Response Shapes

**400 Bad Request:**
```typescript
{
  field_name?: string[];          // Field-specific errors
  non_field_errors?: string[];    // General errors
  detail?: string;                // Single error message
}
```

**401 Unauthorized:**
```typescript
{
  detail: "Authentication credentials were not provided." |
          "Token is invalid or expired"
}
```

**403 Forbidden:**
```typescript
{
  detail: "You do not have permission to perform this action."
}
```

**404 Not Found:**
```typescript
{
  detail: "Not found."
}
```

**500 Internal Server Error:**
```typescript
{
  detail: "Internal server error.",
  error_code?: string;
  trace_id?: string;              // For support debugging
}
```

---

### SQL Reference: Container Hierarchy Query

```sql
-- Get hierarchical container tree for project
WITH RECURSIVE container_tree AS (
  -- Level 1 (root containers)
  SELECT
    c.container_id,
    c.project_id,
    c.parent_container_id,
    c.container_level,
    c.container_code,
    c.display_name,
    c.sort_order,
    c.attributes,
    c.is_active,
    ARRAY[c.container_id] AS path,
    1 AS depth
  FROM landscape.tbl_container c
  WHERE c.project_id = $1
    AND c.parent_container_id IS NULL
    AND c.is_active = true

  UNION ALL

  -- Recursive: Get children
  SELECT
    c.container_id,
    c.project_id,
    c.parent_container_id,
    c.container_level,
    c.container_code,
    c.display_name,
    c.sort_order,
    c.attributes,
    c.is_active,
    ct.path || c.container_id,
    ct.depth + 1
  FROM landscape.tbl_container c
  INNER JOIN container_tree ct ON c.parent_container_id = ct.container_id
  WHERE c.is_active = true
    AND ct.depth < 3  -- Max 3 levels
)
SELECT * FROM container_tree
ORDER BY path, sort_order;
```

**Performance:** O(n) where n = total containers. Indexed on `project_id`, `parent_container_id`.

---

### Rate Limiting

**Django Backend:**
- Default: 100 requests/minute per user
- Burst: 200 requests/minute
- Calculation endpoints: 20 requests/minute (compute-intensive)

**Next.js API Routes:**
- No rate limiting in development
- Production: 1000 requests/hour per IP (Vercel default)

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800
```

---

## Document Status

**Generated:** 2025-11-04
**Commit:** `cafa56b`
**Author:** Claude Code (AI Agent)
**Review Status:** ⚠ Pending human verification
**Next Update:** Upon next major migration or breaking change

**Verification Steps:**
1. [ ] Run curl test suite against local Django backend
2. [ ] Verify all TypeScript interfaces match serializer schemas
3. [ ] Test frontend hooks against live endpoints
4. [ ] Validate container hierarchy queries return correct structure
5. [ ] Confirm scenario activation triggers budget query refetch

---

**End of Document**
