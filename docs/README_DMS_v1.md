# Landscape DMS (Document Management System) - v1.0

**Last Updated:** October 7, 2025
**Status:** ✅ Phase 1 Complete
**Model:** Hybrid (Registry tables + JSONB profiles + Materialized View)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [UI Components](#ui-components)
7. [User Guide](#user-guide)
8. [Developer Guide](#developer-guide)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Landscape DMS provides enterprise-grade document management with:

- **Custom Attributes**: Define project-specific metadata fields
- **Templates**: Enforce required fields per document type
- **Search & Faceting**: Full-text search with database fallback
- **Profile Auditing**: Complete change history for compliance
- **Workspace Support**: Multi-tenant data isolation (W1 Phased model)
- **OCR Ready**: Queue-based extraction pipeline (stub in v1)

### Key Features

✅ Upload documents via drag-and-drop (UploadThing)
✅ Custom attribute builder (10 types: text, number, date, enum, etc.)
✅ Template designer for required/optional fields
✅ Full-text search with faceted filtering
✅ Audit trail for all profile changes
✅ Materialized view for fast search
✅ React components for upload, browse, admin

---

## Architecture

### Tech Stack

- **Backend**: Next.js 15 App Router + TypeScript
- **Database**: Neon PostgreSQL (schema: `landscape`)
- **Upload**: UploadThing (S3-compatible storage)
- **Search**: Meilisearch (optional) + PostgreSQL fallback
- **Forms**: React Hook Form + Zod validation
- **Tables**: TanStack Table v8

### Data Model (Hybrid)

```
┌─────────────────────┐
│ dms_workspaces      │ ← Tenant/client isolation
├─────────────────────┤
│ workspace_id (PK)   │
│ workspace_code      │
│ is_default          │
└─────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐
│ core_doc            │ ← Master document table
├─────────────────────┤
│ doc_id (PK)         │
│ project_id (FK)     │
│ workspace_id (FK)   │
│ doc_name            │
│ doc_type            │
│ profile_json (JSONB)│ ← Custom attributes stored here
│ doc_date (generated)│
│ contract_value (...) │
└─────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐
│ dms_profile_audit   │ ← Change history
├─────────────────────┤
│ audit_id (PK)       │
│ doc_id (FK)         │
│ old_profile_json    │
│ new_profile_json    │
│ changed_fields      │
└─────────────────────┘

┌─────────────────────┐
│ dms_attributes      │ ← Attribute registry
├─────────────────────┤
│ attr_id (PK)        │
│ attr_key (unique)   │
│ attr_type           │
│ enum_values (JSONB) │
└─────────────────────┘
          │
          │ N:M
          ▼
┌─────────────────────┐
│ dms_templates       │ ← Template definitions
└─────────────────────┘
          │
          │ N:M
          ▼
┌──────────────────────────┐
│ dms_template_attributes  │ ← Attribute bindings
└──────────────────────────┘

┌─────────────────────┐
│ mv_doc_search       │ ← Materialized view (search index)
├─────────────────────┤
│ doc_id              │
│ searchable_text     │
│ facets (JSONB)      │
└─────────────────────┘
```

---

## Setup & Installation

### Prerequisites

- Node.js 18+ / npm
- PostgreSQL (Neon)
- UploadThing account (token in `.env.local`)

### 1. Install Dependencies

Already installed in the main project. Key packages:

```bash
npm install react-hook-form zod @tanstack/react-table uploadthing @uploadthing/react meilisearch
```

### 2. Database Migration

Run the DMS migrations to create schema:

```bash
# Option A: Via API endpoint
curl -X POST http://localhost:3007/api/dms/migrate

# Option B: Direct SQL
psql $DATABASE_URL -f src/lib/dms/migrations/001_create_dms_tables.sql
psql $DATABASE_URL -f src/lib/dms/migrations/002_schema_fixes.sql
```

**Expected Output:**
```
✅ Created dms_workspaces (1 row: W1)
✅ Created dms_attributes (10 rows)
✅ Created core_doc
✅ Created mv_doc_search (materialized view)
✅ Created 27 documents indexed
```

### 3. Environment Variables

Already configured in `.env.local`:

```bash
DATABASE_URL="postgresql://..."
UPLOADTHING_TOKEN="..."

# Optional: Meilisearch (skip for database fallback)
# NEXT_PUBLIC_MEILI_HOST=http://localhost:7700
# NEXT_PUBLIC_MEILI_API_KEY=masterKey
```

### 4. Start Development Server

```bash
npm run dev
```

Navigate to:
- Upload: http://localhost:3007/dms/upload
- Browse: http://localhost:3007/dms/documents
- Attributes: http://localhost:3007/admin/dms/attributes
- Templates: http://localhost:3007/admin/dms/templates

---

## Database Schema

### Core Tables

#### `core_doc` - Master Document Table

| Column | Type | Description |
|--------|------|-------------|
| `doc_id` | BIGSERIAL PK | Unique document ID |
| `project_id` | BIGINT FK | Link to project |
| `workspace_id` | BIGINT FK | Workspace isolation |
| `phase_id` | BIGINT FK | Optional phase link |
| `parcel_id` | BIGINT FK | Optional parcel link |
| `doc_name` | VARCHAR(500) | File name |
| `doc_type` | VARCHAR(100) | Document category (general, contract, permit) |
| `discipline` | VARCHAR(100) | Engineering, legal, financial, etc. |
| `mime_type` | VARCHAR(100) | File MIME type |
| `file_size_bytes` | BIGINT | File size |
| `sha256_hash` | VARCHAR(64) | Content hash for dedupe |
| `storage_uri` | TEXT | UploadThing URL |
| `profile_json` | JSONB | **Custom attributes stored here** |
| `doc_date` | DATE | Generated from `profile_json->>'doc_date'` |
| `contract_value` | NUMERIC | Generated column |
| `priority` | VARCHAR(20) | Generated column |
| `status` | VARCHAR(50) | draft \| processing \| indexed \| failed \| archived |
| `created_at` | TIMESTAMPTZ | Upload timestamp |

**Indexes:**
- `idx_core_doc_profile_json` (GIN) for fast JSONB queries
- `idx_core_doc_project_id`, `idx_core_doc_workspace_id`
- `idx_core_doc_doc_type`, `idx_core_doc_status`

#### `dms_attributes` - Attribute Registry

| Column | Type | Description |
|--------|------|-------------|
| `attr_id` | BIGSERIAL PK | Unique attribute ID |
| `attr_key` | VARCHAR(100) UNIQUE | Lowercase key (e.g., `contract_value`) |
| `attr_name` | VARCHAR(255) | Display name (e.g., "Contract Value") |
| `attr_type` | VARCHAR(50) | text \| number \| date \| boolean \| currency \| enum \| lookup \| tags \| json |
| `enum_values` | JSONB | For enum type: `["Option1", "Option2"]` |
| `is_required` | BOOLEAN | Enforce at template level |
| `is_searchable` | BOOLEAN | Index for search |
| `display_order` | INTEGER | Sort order in forms |

**Seeded Attributes (10):**
1. `doc_date` (date) - Document Date
2. `description` (text) - Description
3. `contract_value` (currency) - Contract Value
4. `priority` (enum) - Priority [Low, Medium, High, Critical]
5. `status_internal` (enum) - Internal Status
6. `tags` (tags) - Tags for categorization
7. `reviewed_by` (text) - Reviewer name
8. `review_date` (date) - Review date
9. `compliance_required` (boolean) - Compliance flag
10. `external_id` (text) - External system ID

#### `mv_doc_search` - Search Materialized View

Pre-joined view for fast search with facets:

```sql
SELECT doc_id, project_id, workspace_id, doc_name, doc_type,
       searchable_text, profile_json, project_name, workspace_name
FROM landscape.mv_doc_search
WHERE searchable_text @@ to_tsquery('contract')
  AND doc_type = 'legal'
LIMIT 50;
```

**Refresh:**
```sql
-- Manual refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY landscape.mv_doc_search;

-- Or via helper
SELECT landscape.refresh_doc_search_mv();
```

---

## API Reference

### POST /api/dms/docs

Create a new document record.

**Request Body:**
```json
{
  "project_id": 1,
  "workspace_id": 1,
  "phase_id": 5,
  "doc_name": "Contract_ABC_Corp.pdf",
  "doc_type": "contract",
  "discipline": "legal",
  "mime_type": "application/pdf",
  "file_size_bytes": 2048576,
  "sha256_hash": "abc123...",
  "storage_uri": "https://uploadthing.com/f/abc123.pdf",
  "profile_json": {
    "description": "Master service agreement",
    "contract_value": 500000,
    "doc_date": "2025-01-15",
    "tags": ["contract", "legal", "MSA"]
  },
  "created_by": 42
}
```

**Response (201):**
```json
{
  "success": true,
  "doc": {
    "doc_id": 123,
    "doc_name": "Contract_ABC_Corp.pdf",
    "status": "draft",
    "created_at": "2025-10-07T10:30:00Z"
  },
  "template": {
    "template_id": 1,
    "template_name": "Default Document Template"
  }
}
```

**Validation:**
- Checks required attributes from template
- Returns 400 if missing required fields

### GET /api/dms/docs

List documents with filters.

**Query Params:**
- `project_id` (required)
- `workspace_id` (optional)
- `doc_type` (optional)
- `status` (optional)
- `limit` (default: 50)
- `offset` (default: 0)

**Example:**
```bash
GET /api/dms/docs?project_id=1&doc_type=contract&limit=20
```

### PATCH /api/dms/documents/[id]/profile

Update document profile (custom attributes).

**Request Body:**
```json
{
  "profile": {
    "description": "Updated description",
    "reviewed_by": "John Doe",
    "review_date": "2025-10-07"
  },
  "userId": 42,
  "reason": "Added reviewer info"
}
```

**Response (200):**
```json
{
  "success": true,
  "doc": {
    "doc_id": 123,
    "profile_json": { ... },
    "updated_at": "2025-10-07T11:00:00Z"
  }
}
```

**Side Effects:**
- Creates audit entry in `dms_profile_audit`
- Triggers MV refresh (async)

### GET /api/dms/search

Full-text search with facets.

**Query Params:**
- `q` - Search query (optional)
- `project_id` (required)
- `workspace_id` (optional)
- `doc_type` (optional - for faceting)
- `discipline` (optional)
- `status` (optional)
- `priority` (optional)
- `tags` (optional - comma-separated)
- `date_from` / `date_to` (optional)
- `limit` / `offset`

**Example:**
```bash
GET /api/dms/search?project_id=1&q=contract&doc_type=legal&limit=20
```

**Response:**
```json
{
  "success": true,
  "source": "database_fallback",
  "results": [
    {
      "doc_id": 123,
      "doc_name": "Contract_ABC.pdf",
      "doc_type": "contract",
      "profile_json": { ... }
    }
  ],
  "totalHits": 15,
  "facets": {
    "doc_type": { "contract": 10, "permit": 5 },
    "status": { "draft": 8, "indexed": 7 }
  }
}
```

### POST /api/dms/attributes

Create or update attributes.

**Request Body:**
```json
{
  "workspaceId": 1,
  "attributes": [
    {
      "attr_key": "property_address",
      "attr_name": "Property Address",
      "attr_type": "text",
      "is_required": true,
      "is_searchable": true
    }
  ]
}
```

### POST /api/dms/templates

Create document template.

**Request Body:**
```json
{
  "template": {
    "template_name": "Legal Contracts",
    "workspace_id": 1,
    "project_id": 1,
    "doc_type": "contract",
    "is_default": false
  },
  "attributeConfigs": [
    { "attr_id": 2, "is_required": true, "display_order": 10 },
    { "attr_id": 3, "is_required": false, "display_order": 20 }
  ]
}
```

---

## UI Components

All components are in `src/components/dms/`:

### Upload Components

#### `<Dropzone />`
```tsx
<Dropzone
  projectId={currentProject.project_id}
  workspaceId={1}
  docType="general"
  onUploadComplete={(results) => console.log(results)}
  onUploadError={(error) => console.error(error)}
/>
```

**Features:**
- Drag-and-drop support
- File type validation (PDF, Office, images)
- Progress indicators
- UploadThing integration

#### `<Queue />`
```tsx
<Queue
  files={uploadedFiles}
  onFileSelect={(file) => setSelectedFile(file)}
/>
```

### Search Components

#### `<SearchBox />`
```tsx
<SearchBox
  onSearch={(query) => setSearchQuery(query)}
  placeholder="Search documents..."
  debounceMs={300}
/>
```

#### `<Facets />`
```tsx
<Facets
  facets={facets}
  selectedFilters={selectedFilters}
  onFilterChange={(facetKey, values) => handleFilter(facetKey, values)}
/>
```

#### `<ResultsTable />`
```tsx
<ResultsTable
  documents={documents}
  onDocumentSelect={(doc) => setSelectedDoc(doc)}
  selectedDocId={selectedDoc?.doc_id}
/>
```

### Profile Components

#### `<DocCard />`
```tsx
<DocCard doc={selectedDocument} />
```

#### `<ProfileForm />`
```tsx
<ProfileForm
  docId={doc.doc_id}
  projectId={projectId}
  workspaceId={workspaceId}
  docType="contract"
  initialProfile={doc.profile_json}
  onSave={(profile) => handleSave(profile)}
  onCancel={() => setEditMode(false)}
/>
```

### Admin Components

#### `<AttrBuilder />`
```tsx
<AttrBuilder
  workspaceId={1}
  attributes={attributes}
  onSave={async (attrs) => await saveAttributes(attrs)}
/>
```

**Features:**
- Create/edit/delete attributes
- Type picker with validation
- Enum value management
- Drag to reorder

#### `<TemplateDesigner />`
```tsx
<TemplateDesigner
  workspaceId={1}
  projectId={projectId}
  initialTemplate={template}
  onSave={(template, configs) => saveTemplate(template, configs)}
/>
```

---

## User Guide

### Uploading Documents

1. Navigate to **Documents (DMS) → Upload Documents**
2. Select a project from the project dropdown
3. Drag files into the upload zone or click "Select Files"
4. Wait for upload to complete
5. Click on an uploaded file in the queue
6. Fill required profile fields in the right panel
7. Click "Save Profile"

**Supported File Types:**
- PDF (up to 32MB)
- Word: .doc, .docx (up to 16MB)
- Excel: .xls, .xlsx (up to 16MB)
- Images: .jpg, .png, .gif (up to 8MB)
- Text: .txt, .csv (up to 4MB)

### Browsing & Searching

1. Navigate to **Documents (DMS) → Browse Documents**
2. Use the search box for full-text queries
3. Apply filters in the left sidebar:
   - Document Type
   - Status
   - Priority
   - Tags
4. Click a document row to view details in the right panel
5. Click "Refresh" to update results

### Managing Attributes

1. Navigate to **Documents (DMS) → Manage Attributes**
2. View existing attributes in the summary
3. Fill the "Add New Attribute" form:
   - **Display Name**: Human-readable name
   - **Key**: Lowercase with underscores (auto-generated)
   - **Type**: Select from 9 types
   - **Description**: Help text for users
   - **Options**: For enum types, add dropdown values
   - **Required**: Check if mandatory
   - **Searchable**: Check to index for search
4. Click "Add Attribute"
5. Repeat for all attributes
6. Click "Save Attributes" when done

### Creating Templates

1. Navigate to **Documents (DMS) → Document Templates**
2. Click "New Template" or edit existing
3. Enter template details:
   - **Name**: e.g., "Legal Contracts"
   - **Doc Type**: Optional filter (leave blank for all)
   - **Default**: Check to make default for workspace/project
4. Drag attributes from Available → Required or Optional
5. Set display order with up/down arrows
6. Click "Save Template"

---

## Developer Guide

### Adding New Attribute Types

1. Update schema constraint in migration:
```sql
ALTER TABLE dms_attributes DROP CONSTRAINT dms_attributes_attr_type_check;
ALTER TABLE dms_attributes ADD CONSTRAINT dms_attributes_attr_type_check
  CHECK (attr_type IN ('text','number','date','boolean','currency','enum','lookup','tags','json','your_new_type'));
```

2. Add type to TypeScript:
```ts
// src/lib/dms/db.ts
export type AttrType = 'text' | 'number' | ... | 'your_new_type';
```

3. Add form control in `ProfileForm.tsx`:
```tsx
case 'your_new_type':
  return <YourCustomInput {...field} />;
```

### Custom Search Filters

Modify `buildSearchFilters` in `src/lib/dms/indexing.ts`:

```ts
export function buildSearchFilters(params: SearchParams): string[] {
  const filters: string[] = [];

  if (params.projectId) {
    filters.push(`project_id = ${params.projectId}`);
  }

  // Add your custom filter
  if (params.customField) {
    filters.push(`profile_json->>'customField' = '${params.customField}'`);
  }

  return filters;
}
```

### Extending the Audit Log

Add custom audit types in `src/lib/dms/audit.ts`:

```ts
await logProfileChange(
  docId,
  oldProfile,
  newProfile,
  userId,
  reason,
  'your_custom_audit_type'  // e.g., 'ai_extraction', 'bulk_update'
);
```

### OCR Integration (Future)

Replace stub in `src/lib/dms/ocr-queue.ts`:

```ts
export async function processQueueStub(): Promise<void> {
  const job = await getNextQueueJob();
  if (!job) return;

  await markJobProcessing(job.queue_id);

  try {
    // Fetch document from storage_uri
    const doc = await fetchDocument(job.doc_id);

    // Extract text (Tesseract.js or Anthropic Vision API)
    const text = await extractText(doc.storage_uri);

    // Update document
    await sql`
      UPDATE core_doc
      SET profile_json = profile_json || ${JSON.stringify({ extracted_text: text })}
      WHERE doc_id = ${job.doc_id}
    `;

    await markJobCompleted(job.queue_id, { extracted_text: text });
  } catch (error) {
    await markJobFailed(job.queue_id, error.message);
  }
}
```

---

## Testing

### Manual Acceptance Test

Run this flow to verify Phase 1 completion:

**Test Script:**

```bash
# 1. Upload a document
curl -X POST http://localhost:3007/api/dms/docs \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 1,
    "workspace_id": 1,
    "doc_name": "test_contract.pdf",
    "doc_type": "contract",
    "mime_type": "application/pdf",
    "file_size_bytes": 1024,
    "sha256_hash": "test123...",
    "storage_uri": "https://example.com/test.pdf",
    "profile_json": {
      "description": "Test document"
    }
  }'

# Expected: 201 Created, doc_id returned

# 2. Update profile
curl -X PATCH http://localhost:3007/api/dms/documents/[doc_id]/profile \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "description": "Updated via API",
      "reviewed_by": "Test User"
    }
  }'

# Expected: 200 OK, audit entry created

# 3. Search
curl "http://localhost:3007/api/dms/search?project_id=1&q=contract"

# Expected: Results array with doc, facets object

# 4. Verify audit
psql $DATABASE_URL -c "SELECT * FROM landscape.dms_profile_audit ORDER BY created_at DESC LIMIT 1;"

# Expected: 1 row with changed_fields = ['reviewed_by']
```

### UI Test Checklist

- [ ] Upload PDF via drag-and-drop → See in queue
- [ ] Select uploaded file → Profile form appears
- [ ] Edit profile → Save successfully
- [ ] Navigate to Browse → See uploaded doc
- [ ] Search by filename → Find document
- [ ] Filter by doc_type → Results update
- [ ] Click document → Details panel appears
- [ ] Navigate to Attributes → See 10 default attributes
- [ ] Create new attribute → Appears in list
- [ ] Navigate to Templates → See default template
- [ ] Create new template → Binds attributes

---

## Troubleshooting

### Migration Errors

**Problem:** `relation "mv_doc_search" does not exist`

**Solution:**
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY landscape.mv_doc_search;
```

---

**Problem:** `column "tags" does not exist`

**Solution:** We intentionally skipped the `tags` generated column due to PostgreSQL limitations. Query tags directly from `profile_json`:

```sql
SELECT doc_id, profile_json->'tags' AS tags
FROM core_doc;
```

---

### Upload Failures

**Problem:** UploadThing 401 Unauthorized

**Solution:** Check `.env.local` for valid `UPLOADTHING_TOKEN`:
```bash
echo $UPLOADTHING_TOKEN
# Should return eyJ...
```

---

**Problem:** "Required attribute missing" error

**Solution:** Check template bindings:
```sql
SELECT t.template_name, a.attr_key, ta.is_required
FROM dms_templates t
JOIN dms_template_attributes ta ON t.template_id = ta.template_id
JOIN dms_attributes a ON ta.attr_id = a.attr_id
WHERE t.is_default = true;
```

---

### Search Returns No Results

**Problem:** MV not refreshed after upload

**Solution:** Manually refresh:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY landscape.mv_doc_search;
```

Or set up a cron job:
```sql
SELECT cron.schedule('refresh_mv_doc_search', '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY landscape.mv_doc_search$$);
```

---

### Performance Issues

**Problem:** Slow search queries

**Solutions:**
1. Check indexes:
```sql
\d landscape.mv_doc_search
-- Should have idx_mv_doc_search_text (GIN)
```

2. Analyze query plan:
```sql
EXPLAIN ANALYZE
SELECT * FROM landscape.mv_doc_search
WHERE searchable_text @@ to_tsquery('contract');
```

3. Consider Meilisearch for instant search (optional)

---

## Appendix A: Configuration Options

### Workspace Mode

- **W1 (Phased)**: Projects belong to default workspace, ACL optional
- **W2 (Strict)**: Require workspace for all projects, enforce RLS

Current: **W1** (production-ready)

### Search Engine

- **Database Fallback**: PostgreSQL full-text search (default, always works)
- **Meilisearch**: Optional instant search with typo tolerance

Current: **Database Fallback** (no external dependencies)

### OCR Pipeline

- **Stub**: Queue exists, no processing (v1)
- **Tesseract.js**: Client-side OCR (future)
- **Anthropic Vision**: AI extraction via Claude (future)

Current: **Stub** (queue records created, no processing)

---

## Appendix B: Future Enhancements (v2)

### Planned Features

1. **Real-time OCR**: Anthropic Vision API for text extraction
2. **Semantic Search**: Embeddings + vector search
3. **PDF Preview**: In-browser viewer with annotations
4. **Version Control**: Track document revisions with diff
5. **Bulk Operations**: Upload/edit/tag multiple documents
6. **Advanced ACL**: Field-level permissions, row-level security
7. **Workflow**: Approval chains, status transitions
8. **Integrations**: Sync with Dropbox, OneDrive, SharePoint
9. **AI Suggestions**: Auto-fill profile from document content
10. **Export**: Bulk export to ZIP with metadata CSV

---

## Appendix C: Support

### Getting Help

- **Documentation**: This file + inline JSDoc in code
- **Codebase**: `/src/lib/dms/`, `/src/app/api/dms/`, `/src/components/dms/`
- **Database**: View schema with `\d landscape.core_doc`

### Reporting Issues

When reporting bugs, include:
1. Browser console errors
2. Server logs (`npm run dev` output)
3. SQL queries that failed
4. Steps to reproduce

---

**End of DMS v1.0 Documentation**

✅ Phase 1 Complete
📅 October 7, 2025
👥 Built with Claude Code

---
