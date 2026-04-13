# API Discovery Report: Platform Intelligence Test Setup

**Date:** 2026-04-12
**Branch:** alpha19
**Purpose:** Document all endpoints and data models needed to seed 200 test apartment properties for two users (Gregg and Noel)

---

## Part 1: Test User Creation — COMPLETED

### User: Noel Wolin

| Field | Value |
|-------|-------|
| **User ID** | 20 |
| **Username** | noel |
| **Email** | noel@crescentbayholdings.com |
| **Full Name** | Noel Wolin |
| **Company** | Crescent Bay Holdings |
| **Role** | alpha_tester |
| **Password** | 12345 (bypassed Django validators via shell) |

### Records Created

1. **auth_user** row (id=20) — core Django user
2. **user_profile** row — UserProfile (bio, avatar, timezone)
3. **tbl_user_landscaper_profile** row — LandscaperProfile (onboarding, instructions)

### JWT Authentication Verified

```bash
curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "noel", "password": "12345"}'
```

Returns `access` and `refresh` JWT tokens. Use `Authorization: Bearer <access_token>` for all subsequent API calls.

### Data Isolation Model

**There is NO org/tenant model.** Data isolation works through:

| Scope | Mechanism |
|-------|-----------|
| **Projects** | `tbl_project.created_by_id` FK to auth_user. The `get_queryset()` in `ProjectViewSet` filters: admins see all, alpha_testers see only their own. |
| **Knowledge entities** | `knowledge_entities.created_by_id` FK — currently all NULL (129 entities, all system-created). |
| **Knowledge facts** | `knowledge_facts.created_by_id` FK. |
| **User assumption history** | `tbl_assumption_history.user_id` FK + `organization_id` (nullable). |
| **User document chunks** | `tbl_user_document_chunks.user_id` FK. |
| **Landscaper chat** | `landscaper_chat_thread.project_id` → project → created_by scoping. |

**Gregg (id=4) and Noel (id=20) are in separate user accounts.** Since projects are scoped by `created_by_id`, each user's projects and their associated data are isolated. Platform knowledge (tbl_platform_knowledge) is shared/global — not user-scoped.

### User Records

```
id=1  username=admin  email=greggwolin@gmail.com    role=admin
id=4  username=gregg  email=greggwolin@mac.com      role=admin
id=20 username=noel   email=noel@crescentbayholdings.com  role=alpha_tester
```

---

## Part 2a: Project Creation

### Endpoint

```
POST /api/projects/
```

### Auth

- Currently `AllowAny` (TODO in code says "Change to IsAuthenticated in production")
- But `perform_create()` sets `created_by` from authenticated user if present
- **Must send JWT token** to correctly scope project ownership

### Required Fields

Only `project_name` is truly required (non-nullable `CharField`). Everything else is nullable/optional.

### Recommended Fields for Test Properties

```json
{
  "project_name": "The Meridian at Scottsdale",
  "project_type_code": "MF",
  "project_type": "Multifamily",
  "analysis_perspective": "INVESTMENT",
  "analysis_purpose": "VALUATION",
  "property_subtype": "Garden",
  "property_class": "B",
  "total_units": 240,
  "year_built": 1998,
  "gross_sf": 192000,
  "stories": 3,
  "street_address": "7200 E Camelback Rd",
  "city": "Scottsdale",
  "state": "AZ",
  "jurisdiction_city": "Scottsdale",
  "jurisdiction_county": "Maricopa",
  "jurisdiction_state": "AZ",
  "location_lat": 33.5092,
  "location_lon": -111.9280,
  "asking_price": 52000000,
  "price_per_unit": 216667,
  "current_noi": 2860000,
  "cap_rate_current": 0.0550,
  "analysis_mode": "napkin"
}
```

### Request Example

```bash
TOKEN="<jwt_access_token>"
curl -s -X POST http://localhost:8000/api/projects/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"project_name": "The Meridian at Scottsdale", "project_type_code": "MF", ...}'
```

### Side Effects on Create

1. `perform_create()` sets `created_by = request.user`
2. `sync_primary_measure_on_legacy_update()` fires if `total_units` or `acres_gross` provided — syncs `primary_count`/`primary_area` fields
3. **No auto-created child records** (no project_config, project_settings, containers auto-created)

### Bulk Creation

No bulk endpoint exists. Must create projects one-at-a-time via `POST /api/projects/`.

### Gotchas

- `tbl_project` is `managed = False` — Django does not manage schema
- `created_at` and `updated_at` are nullable and not auto-set by the model (no `auto_now_add`). The DB may have defaults.
- `project_id` is `AutoField` (int4 serial) — auto-incremented

---

## Part 2b: Document Upload

### Upload Flow (Two Paths)

#### Path 1: Next.js UploadThing (Primary — used by frontend)

```
POST /api/dms/upload  (Next.js route — NOT Django)
```

**Entry point:** `src/app/api/dms/upload/route.ts`

**Flow:**
1. Client POSTs multipart form: `file`, `project_id`, `doc_type`, `workspace_id`, `run_full_extraction`
2. File uploaded to **UploadThing** (external storage service) → returns `storage_uri`
3. `core_doc` record created in DB via direct SQL insert
4. If `run_full_extraction=true`, calls Django: `POST /api/knowledge/documents/{doc_id}/extract-batched/`

**Form fields:**
- `file` (required) — the actual file
- `project_id` (required) — integer
- `doc_type` (default: 'Misc')
- `workspace_id` (default: 1)
- `run_full_extraction` — 'true' to auto-trigger extraction

#### Path 2: Django Direct Upload (Alternative)

```
POST /api/dms/upload/  (Django route)
```

**Entry point:** `backend/apps/documents/views.py :: upload_document()`

**Flow:**
1. Multipart form: `file`, `project_id`, `doc_type`
2. File saved to Django's default storage (`uploads/{project_id}/{uuid}.{ext}`)
3. `core_doc` record created via ORM
4. Collision detection (filename + hash deduplication)
5. Does NOT auto-trigger extraction

### Extraction Trigger (Separate Call)

```
POST /api/knowledge/documents/{doc_id}/extract-batched/
```

Or the older single-extraction endpoint:

```
POST /api/knowledge/documents/{doc_id}/extract/
```

Or project-level extraction:

```
POST /api/knowledge/projects/{project_id}/extract/
Body: {"extraction_type": "unit_mix" | "rent_roll" | "opex" | "market_comps" | "acquisition"}
```

### Document Model (`core_doc`)

Key fields:
- `doc_id` (bigserial PK)
- `project_id` (FK to tbl_project — nullable)
- `doc_name` (varchar 500)
- `doc_type` (varchar 100, default 'general')
- `mime_type` (varchar 100)
- `file_size_bytes` (bigint)
- `sha256_hash` (varchar 64)
- `storage_uri` (text — UploadThing URL or local path)
- `status` (draft → processing → indexed → failed → archived)

### End-to-End Document Pipeline

```
File Drop → IntakeChoiceModal (client-side classification)
  → UploadThing upload → core_doc INSERT
  → Ingestion Workbench opens
  → extract-batched/ call → ai_extraction_staging rows
  → User reviews fields in Workbench
  → Commit → DMS record finalized, fields written to project tables
```

### Recommendation for Test

For User B (Noel), upload 118 Excel files via the **Django upload endpoint** (`POST /api/dms/upload/`), then trigger extraction on each with `POST /api/knowledge/documents/{doc_id}/extract-batched/`. This avoids needing UploadThing credentials in the script.

**Alternative:** Upload to UploadThing via Next.js API if the dev server is running on port 3000.

---

## Part 2c: Platform Knowledge Direct Write

### What is Platform Knowledge?

Platform knowledge is **global, shared content** (industry reports, benchmark data) — NOT user-scoped. It lives in:

- `tbl_platform_knowledge` — document metadata
- `tbl_platform_knowledge_chunks` — chunked text with embeddings

### This is NOT the right target for User A's clean data.

For User A (Gregg), we need to write to **project-scoped knowledge** and **project data tables**, not platform knowledge. The relevant systems are:

### Option A: Knowledge Entity/Fact System (Extracted Knowledge)

Tables:
- `knowledge_entities` — canonical "things" (properties, markets, etc.)
- `knowledge_facts` — subject-predicate-object triples with confidence

These have `created_by` FK but NO project FK — they're cross-project. Not ideal for project-scoped data.

### Option B: Direct Table Population (Recommended for User A)

Write directly to the project data tables that Landscaper queries:

| Data Type | Table | Key Fields |
|-----------|-------|------------|
| Property attributes | `tbl_project` | All the project-level fields (total_units, year_built, noi, etc.) |
| Unit mix | `tbl_multifamily_unit_type` | project_id, unit_type_code, bedrooms, bathrooms, avg_square_feet, total_units, current_market_rent |
| Rent roll | `tbl_multifamily_unit` | project_id, unit_number, unit_type, bedrooms, bathrooms, square_feet, current_rent, market_rent, occupancy_status |
| Leases | `tbl_multifamily_lease` (if exists) or lease data in unit records |
| T-12 financials | `tbl_project` financial columns (current_gpr, current_noi, etc.) + `tbl_operating_expenses` |
| Sale comps | `tbl_sales_comparables` | project_id, comp fields |
| Debt | `tbl_loan` | project_id, loan fields |
| Assumptions | `tbl_project_assumption` | project_id, assumption_key, assumption_value |

### Option C: Knowledge Embeddings (For RAG Retrieval)

For Landscaper to answer questions via RAG, data needs to be in:
- `knowledge_embeddings` — content_text + embedding vector (1536-dim, ada-002)
- Embedding generation: `backend/apps/knowledge/services/embedding_service.py :: generate_embedding()`

### Embedding Format

- **Model:** OpenAI text-embedding-ada-002
- **Dimensions:** 1536
- **Storage:** pgvector `vector(1536)` column
- **Tables with embeddings:**
  - `knowledge_embeddings.embedding` (vector)
  - `tbl_platform_knowledge_chunks.embedding` (vector)

### Recommendation for User A

**Two-phase write:**
1. **Phase 1:** Populate project data tables directly (tbl_project + multifamily tables + financials). This gives Landscaper structured data access via its DB-first query tools.
2. **Phase 2 (optional):** Generate embeddings for key data points and write to `knowledge_embeddings` for RAG. This enables semantic search. May not be needed if Landscaper tools already query the structured tables.

---

## Part 2d: Multifamily-Specific Tables

### API Endpoints (All Django, All REST)

```
GET/POST    /api/multifamily/units/           — list/create units
GET/PUT/DEL /api/multifamily/units/{id}/      — CRUD single unit
GET/POST    /api/multifamily/unit-types/       — list/create unit types
GET/PUT/DEL /api/multifamily/unit-types/{id}/ — CRUD single unit type
GET/POST    /api/multifamily/leases/           — list/create leases
GET/PUT/DEL /api/multifamily/leases/{id}/     — CRUD single lease
GET/POST    /api/multifamily/turns/            — list/create turns
```

All use `AllowAny` permissions (like project endpoints).

### Relationship Chain

```
tbl_project (project_id PK)
  └─ tbl_multifamily_unit_type (project_id FK → ON DELETE NO ACTION)
  │    └─ unit_type_code unique per project
  └─ tbl_multifamily_unit (project_id FK → ON DELETE NO ACTION)
  │    └─ unit_number, unit_type, bedrooms, bathrooms, sq_ft, rent, occupancy
  └─ tbl_multifamily_lease (if exists)
  └─ tbl_operating_expenses (project_id FK → ON DELETE CASCADE)
  └─ tbl_sales_comparables (project_id FK → ON DELETE CASCADE)
  └─ tbl_loan (project_id FK → ON DELETE CASCADE)
  └─ tbl_project_assumption (project_id FK → ON DELETE CASCADE)
```

### Creating Unit Types (Example)

```bash
curl -X POST http://localhost:8000/api/multifamily/unit-types/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "project": 123,
    "unit_type_code": "1BR/1BA",
    "unit_type_name": "One Bedroom",
    "bedrooms": 1,
    "bathrooms": 1,
    "avg_square_feet": 750,
    "current_market_rent": 1450,
    "total_units": 80
  }'
```

### Creating Individual Units (Example)

```bash
curl -X POST http://localhost:8000/api/multifamily/units/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "project": 123,
    "unit_number": "101",
    "unit_type": "1BR/1BA",
    "bedrooms": 1,
    "bathrooms": 1,
    "square_feet": 750,
    "current_rent": 1425,
    "market_rent": 1450,
    "occupancy_status": "Occupied",
    "tenant_name": "John Smith"
  }'
```

### Direct DB Write (Alternative — Faster for Bulk)

For 200 properties × N units each, API calls will be slow. Direct SQL inserts will be significantly faster:

```sql
INSERT INTO landscape.tbl_multifamily_unit_type
  (project_id, unit_type_code, unit_type_name, bedrooms, bathrooms,
   avg_square_feet, current_market_rent, total_units)
VALUES
  (123, '1BR/1BA', 'One Bedroom', 1, 1, 750, 1450, 80),
  (123, '2BR/2BA', 'Two Bedroom', 2, 2, 1050, 1850, 100),
  ...
```

### Gotchas

- `tbl_multifamily_unit` and `tbl_multifamily_unit_type` have `ON DELETE NO ACTION` — deleting the parent project will FAIL unless these child rows are deleted first
- `tbl_multifamily_unit_type` has a unique constraint on `(project_id, unit_type_code)`
- Units require `square_feet` (non-nullable IntegerField)

---

## Part 2e: Test Data Tagging and Cleanup

### tbl_project_assumption Structure

```
assumption_id       integer        PK, NOT NULL
project_id          bigint         NOT NULL (FK → tbl_project, ON DELETE CASCADE)
assumption_key      varchar        NOT NULL
assumption_value    text           nullable
assumption_type     varchar        nullable
scope               varchar        nullable
scope_id            bigint         nullable
notes               text           nullable
source_doc_id       bigint         nullable
confidence_score    numeric        nullable
created_at          timestamp      nullable
updated_at          timestamp      nullable
created_by          text           nullable
value_source        varchar        nullable
```

### Tagging Approach — VALIDATED

Tag each test project:

```sql
INSERT INTO landscape.tbl_project_assumption
  (project_id, assumption_key, assumption_value, assumption_type, created_by, created_at)
VALUES
  (123, 'test_data_batch', 'QM_BATCH_001', 'system', 'test_script', NOW());
```

### Cleanup Query — VALIDATED (with caveats)

```sql
-- Step 1: Get tagged project IDs
SELECT project_id FROM landscape.tbl_project_assumption
WHERE assumption_key = 'test_data_batch' AND assumption_value = 'QM_BATCH_001';

-- Step 2: Delete child tables with ON DELETE NO ACTION first
DELETE FROM landscape.tbl_multifamily_unit
WHERE project_id IN (SELECT project_id FROM landscape.tbl_project_assumption
  WHERE assumption_key = 'test_data_batch' AND assumption_value = 'QM_BATCH_001');

DELETE FROM landscape.tbl_multifamily_unit_type
WHERE project_id IN (SELECT project_id FROM landscape.tbl_project_assumption
  WHERE assumption_key = 'test_data_batch' AND assumption_value = 'QM_BATCH_001');

-- (repeat for other NO ACTION tables: core_doc, tbl_rent_roll_unit, etc.)

-- Step 3: Delete projects (CASCADE handles the rest)
DELETE FROM landscape.tbl_project
WHERE project_id IN (SELECT project_id FROM landscape.tbl_project_assumption
  WHERE assumption_key = 'test_data_batch' AND assumption_value = 'QM_BATCH_001');
```

### CASCADE vs NO ACTION Summary

**Tables with CASCADE** (auto-deleted when project deleted):
- core_fin_fact_budget, core_fin_fact_actual
- tbl_project_assumption, tbl_project_config, tbl_project_settings
- tbl_operating_expenses, tbl_income_approach, tbl_sales_comparables
- tbl_loan, tbl_equity, tbl_waterfall, tbl_cashflow
- landscaper_chat_thread, landscaper_activity
- tbl_rent_roll, tbl_lease, tbl_absorption_schedule
- ~40 more tables

**Tables with NO ACTION** (must delete BEFORE project):
- `tbl_multifamily_unit`
- `tbl_multifamily_unit_type`
- `core_doc` (+ core_doc_media)
- `ai_extraction_staging`
- `tbl_rent_roll_unit`
- `tbl_acquisition`
- `dms_assertion`, `dms_templates`, `dms_unmapped`
- `tbl_land_comparables`
- ~15 more tables

### Current Test Data State

```sql
SELECT count(*) FROM landscape.tbl_project_assumption
WHERE assumption_key = 'test_data_batch';
-- Result: 0 (confirmed clean)
```

---

## Seeding Script Recommendations

### For User A (Gregg — Clean JSON → DB Direct)

1. **Create 200 projects** via `POST /api/projects/` with Gregg's JWT token
2. **Tag each** with `tbl_project_assumption` batch marker
3. **Populate unit types** via direct SQL bulk insert (faster than 200 × N API calls)
4. **Populate units** via direct SQL bulk insert
5. **Populate financials** via project-level fields (T-12 → tbl_project financial columns + tbl_operating_expenses)
6. **Populate sale comps** via `tbl_sales_comparables` direct insert
7. **Populate debt** via `tbl_loan` direct insert

**Estimated: ~200 project API calls + ~5 bulk SQL statements**

### For User B (Noel — Excel Upload → Extraction)

1. **Create projects** (possibly fewer — documents may map to multiple properties)
2. **Upload 118 Excel files** via `POST /api/dms/upload/` (Django endpoint)
3. **Trigger extraction** on each via `POST /api/knowledge/documents/{doc_id}/extract-batched/`
4. **Auto-commit** extraction results (or manually commit via workbench endpoints)

**Estimated: ~118 upload calls + ~118 extraction calls. Extraction is async/slow (LLM-based).**

### Auth Tokens

```bash
# Gregg's token
GREGG_TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "gregg", "password": "<gregg_password>"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['tokens']['access'])")

# Noel's token
NOEL_TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "noel", "password": "12345"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['tokens']['access'])")
```

---

## Key File References

| Purpose | File |
|---------|------|
| Auth views | `backend/apps/projects/views_auth.py` |
| Auth serializers | `backend/apps/projects/serializers_auth.py` |
| User model | `backend/apps/projects/models_user.py` |
| Landscaper profile | `backend/apps/users/models.py` |
| Project model | `backend/apps/projects/models.py` |
| Project serializer | `backend/apps/projects/serializers.py` |
| Project views | `backend/apps/projects/views.py` |
| Document model | `backend/apps/documents/models.py` |
| Document upload (Django) | `backend/apps/documents/views.py :: upload_document()` |
| Document upload (Next.js) | `src/app/api/dms/upload/route.ts` |
| Extraction trigger | `backend/apps/knowledge/views/extraction_views.py` |
| Knowledge models | `backend/apps/knowledge/models.py` |
| Platform knowledge views | `backend/apps/knowledge/views/platform_knowledge_views.py` |
| Embedding service | `backend/apps/knowledge/services/embedding_service.py` |
| Multifamily models | `backend/apps/multifamily/models.py` |
| Multifamily URLs | `backend/apps/multifamily/urls.py` |
| Knowledge URLs | `backend/apps/knowledge/urls.py` |
| Document URLs | `backend/apps/documents/urls.py` |
