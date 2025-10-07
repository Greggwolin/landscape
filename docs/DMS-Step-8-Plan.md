# DMS Step 8 - Folder Security & Setup Page (Implementation Plan)

**Date:** 2025-10-07
**Status:** 📋 Planning
**Dependencies:** Step 7 Complete
**Objective:** Add role-based folder access control and central DMS configuration UI

---

## Overview

Step 8 builds on the folder system from Step 7 by adding:
1. **Folder Security** - Role-based access control for folders and documents
2. **DMS Setup Page** - Central configuration for property-type presets and folder templates
3. **Unified Audit Log** - Consolidated audit trail for all DMS operations
4. **Version Timeline** - Visual history of document changes

This creates a complete enterprise-grade DMS with security, governance, and compliance features.

---

## Prerequisites

### Step 7 Completion Checklist
- [x] `core_doc_folder` table created and functional
- [x] `core_doc_folder_link` table with 1:1 relationships
- [x] `core_doc_smartfilter` table for saved queries
- [x] `core_doc_text` table with full-text content
- [x] `apply_folder_inheritance()` function working
- [x] FolderTree component with drag-and-drop
- [x] FolderEditor component with profile editor
- [x] SmartFilterBuilder component
- [x] Text extraction pipeline functional
- [x] Meilisearch index includes folder and fulltext fields

### Verification Steps
```bash
# 1. Check tables exist
psql -c "\d landscape.core_doc_folder"
psql -c "\d landscape.core_doc_folder_link"
psql -c "\d landscape.core_doc_smartfilter"
psql -c "\d landscape.core_doc_text"

# 2. Verify Meilisearch index
curl http://localhost:3000/api/dms/search/stats

# 3. Test folder inheritance
curl -X POST http://localhost:3000/api/dms/docs/1/move \
  -d '{"folder_id": 2, "apply_inheritance": true}'
```

---

## Database Schema Changes

### 1. Folder Access Control List (ACL)

```sql
-- Folder permissions per workspace role
CREATE TABLE landscape.core_folder_acl (
  acl_id SERIAL PRIMARY KEY,
  folder_id INTEGER NOT NULL REFERENCES landscape.core_doc_folder(folder_id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES landscape.core_workspace(workspace_id) ON DELETE CASCADE,
  role_name VARCHAR(50) NOT NULL,  -- 'owner', 'admin', 'editor', 'viewer', 'none'

  -- Permissions
  can_read BOOLEAN DEFAULT true,
  can_write BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_manage_acl BOOLEAN DEFAULT false,

  -- Inheritance
  inherited BOOLEAN DEFAULT false,  -- Inherited from parent folder

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(folder_id, workspace_id, role_name)
);

CREATE INDEX idx_folder_acl_folder ON landscape.core_folder_acl(folder_id);
CREATE INDEX idx_folder_acl_workspace ON landscape.core_folder_acl(workspace_id);

COMMENT ON TABLE landscape.core_folder_acl IS 'Role-based access control for folders';
```

**Design Decisions:**
- **Role-based** (not user-based) for easier management
- **Workspace-scoped** - different workspaces can have different permissions
- **Inherited flag** - track whether permission came from parent folder
- **Four permission levels**: read, write, delete, manage_acl

**Default Roles:**
- `owner` - Full access (read, write, delete, manage_acl)
- `admin` - Full access except manage_acl
- `editor` - Read and write
- `viewer` - Read only
- `none` - No access (explicit deny)

### 2. Workspace Members & Roles

```sql
-- If core_workspace_member doesn't exist, create it
CREATE TABLE IF NOT EXISTS landscape.core_workspace_member (
  member_id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES landscape.core_workspace(workspace_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,  -- References auth system
  role_name VARCHAR(50) NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_member_workspace ON landscape.core_workspace_member(workspace_id);
CREATE INDEX idx_workspace_member_user ON landscape.core_workspace_member(user_id);
```

### 3. Template Audit Log

```sql
-- Track changes to lu_family presets and folder templates
CREATE TABLE landscape.dms_template_audit (
  audit_id SERIAL PRIMARY KEY,
  template_id INTEGER,  -- References folder template or preset
  template_type VARCHAR(50) NOT NULL,  -- 'folder_template', 'family_preset'
  family_code VARCHAR(10),  -- FK to lu_family if family_preset

  action_type VARCHAR(50) NOT NULL,  -- 'create', 'update', 'delete', 'publish'
  old_config JSONB,
  new_config JSONB,
  diff_summary JSONB,  -- Additive changes only

  user_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_template_audit_type ON landscape.dms_template_audit(template_type);
CREATE INDEX idx_template_audit_family ON landscape.dms_template_audit(family_code);

COMMENT ON TABLE landscape.dms_template_audit IS 'Audit trail for template and preset changes';
```

### 4. Unified DMS Audit Log

```sql
-- Consolidate all DMS operations in one audit table
CREATE TABLE landscape.dms_audit_log (
  log_id SERIAL PRIMARY KEY,
  doc_id INTEGER REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,

  action_type VARCHAR(50) NOT NULL,  -- 'upload', 'profile_edit', 'folder_move',
                                     -- 'ai_extract', 'ai_commit', 'delete', 'restore'

  -- Change tracking
  old_json JSONB,
  new_json JSONB,
  diff_json JSONB,  -- Calculated diff

  -- Context
  folder_id INTEGER REFERENCES landscape.core_doc_folder(folder_id),
  workspace_id INTEGER,
  project_id INTEGER,

  -- Actor
  user_id INTEGER,
  user_email VARCHAR(255),

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_doc ON landscape.dms_audit_log(doc_id);
CREATE INDEX idx_audit_log_action ON landscape.dms_audit_log(action_type);
CREATE INDEX idx_audit_log_created ON landscape.dms_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON landscape.dms_audit_log(user_id);

COMMENT ON TABLE landscape.dms_audit_log IS 'Unified audit trail for all DMS operations';
```

**Migration from ai_review_history:**
```sql
-- Migrate existing folder_inherit records
INSERT INTO landscape.dms_audit_log (
  doc_id, action_type, old_json, new_json, created_at
)
SELECT
  doc_id,
  'folder_move' as action_type,
  old_json,
  new_json,
  created_at
FROM landscape.ai_review_history
WHERE action_type = 'folder_inherit';
```

### 5. lu_family Preset Configuration

```sql
-- Store default profiles per property type (lu_family)
CREATE TABLE landscape.dms_family_preset (
  preset_id SERIAL PRIMARY KEY,
  family_code VARCHAR(10) NOT NULL REFERENCES landscape.lu_family(code),

  preset_name VARCHAR(255) NOT NULL,
  default_profile JSONB DEFAULT '{}'::jsonb,
  default_folders JSONB DEFAULT '[]'::jsonb,  -- Array of folder configs

  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,  -- One default per family

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(family_code, preset_name)
);

CREATE INDEX idx_family_preset_family ON landscape.dms_family_preset(family_code);

COMMENT ON TABLE landscape.dms_family_preset IS 'Default DMS configuration per property type';
```

**Example Preset:**
```json
{
  "family_code": "MF",
  "preset_name": "Multifamily Standard",
  "default_profile": {
    "doc_type": "plan",
    "discipline": "architecture",
    "retention_years": 7
  },
  "default_folders": [
    {"name": "Plans", "default_profile": {"doc_type": "plan"}},
    {"name": "Reports", "default_profile": {"doc_type": "report"}},
    {"name": "Permits", "default_profile": {"doc_type": "permit", "priority": "high"}}
  ]
}
```

---

## Database Functions

### 1. Check Folder Permission

```sql
CREATE OR REPLACE FUNCTION landscape.check_folder_permission(
  p_folder_id INTEGER,
  p_user_id INTEGER,
  p_permission VARCHAR(20)  -- 'read', 'write', 'delete', 'manage_acl'
) RETURNS BOOLEAN AS $$
DECLARE
  v_workspace_id INTEGER;
  v_role_name VARCHAR(50);
  v_has_permission BOOLEAN;
  v_current_folder_id INTEGER;
BEGIN
  -- Get user's workspace and role
  SELECT wm.workspace_id, wm.role_name INTO v_workspace_id, v_role_name
  FROM landscape.core_workspace_member wm
  WHERE wm.user_id = p_user_id AND wm.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;  -- User not in any workspace
  END IF;

  -- Check folder ACL (walk up hierarchy until permission found)
  v_current_folder_id := p_folder_id;

  WHILE v_current_folder_id IS NOT NULL LOOP
    SELECT
      CASE p_permission
        WHEN 'read' THEN acl.can_read
        WHEN 'write' THEN acl.can_write
        WHEN 'delete' THEN acl.can_delete
        WHEN 'manage_acl' THEN acl.can_manage_acl
        ELSE false
      END INTO v_has_permission
    FROM landscape.core_folder_acl acl
    WHERE acl.folder_id = v_current_folder_id
      AND acl.workspace_id = v_workspace_id
      AND acl.role_name = v_role_name;

    IF FOUND THEN
      RETURN v_has_permission;
    END IF;

    -- Walk up to parent folder
    SELECT parent_id INTO v_current_folder_id
    FROM landscape.core_doc_folder
    WHERE folder_id = v_current_folder_id;
  END LOOP;

  -- No ACL found, check default workspace permissions
  RETURN (v_role_name IN ('owner', 'admin'));  -- Default: owner/admin can access
END;
$$ LANGUAGE plpgsql;
```

### 2. Apply Folder ACL Inheritance

```sql
CREATE OR REPLACE FUNCTION landscape.apply_folder_acl_inheritance(
  p_folder_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_parent_id INTEGER;
  v_count INTEGER := 0;
BEGIN
  -- Get parent folder
  SELECT parent_id INTO v_parent_id
  FROM landscape.core_doc_folder
  WHERE folder_id = p_folder_id;

  IF v_parent_id IS NULL THEN
    RETURN 0;  -- No parent, no inheritance
  END IF;

  -- Copy parent ACLs to child (mark as inherited)
  INSERT INTO landscape.core_folder_acl (
    folder_id, workspace_id, role_name,
    can_read, can_write, can_delete, can_manage_acl,
    inherited
  )
  SELECT
    p_folder_id,
    workspace_id,
    role_name,
    can_read,
    can_write,
    can_delete,
    can_manage_acl,
    true  -- Mark as inherited
  FROM landscape.core_folder_acl
  WHERE folder_id = v_parent_id
  ON CONFLICT (folder_id, workspace_id, role_name) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

### 3. Log DMS Audit Entry

```sql
CREATE OR REPLACE FUNCTION landscape.log_dms_audit(
  p_doc_id INTEGER,
  p_action_type VARCHAR(50),
  p_old_json JSONB,
  p_new_json JSONB,
  p_user_id INTEGER DEFAULT NULL,
  p_folder_id INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_log_id INTEGER;
  v_diff_json JSONB;
BEGIN
  -- Calculate diff (keys that changed)
  v_diff_json := jsonb_object_agg(key, value)
  FROM jsonb_each(p_new_json)
  WHERE p_old_json IS NULL OR p_old_json -> key IS DISTINCT FROM value;

  INSERT INTO landscape.dms_audit_log (
    doc_id, action_type, old_json, new_json, diff_json,
    folder_id, user_id, created_at
  ) VALUES (
    p_doc_id, p_action_type, p_old_json, p_new_json, v_diff_json,
    p_folder_id, p_user_id, NOW()
  )
  RETURNING log_id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;
```

---

## API Endpoints

### Folder Security APIs

#### `POST /api/dms/folders/:id/acl`
Set folder permissions for a role.

**Request:**
```json
{
  "workspace_id": 1,
  "role_name": "editor",
  "can_read": true,
  "can_write": true,
  "can_delete": false,
  "can_manage_acl": false
}
```

**Response:**
```json
{
  "success": true,
  "acl": {
    "acl_id": 123,
    "folder_id": 5,
    "workspace_id": 1,
    "role_name": "editor",
    "can_read": true,
    "can_write": true,
    "can_delete": false,
    "can_manage_acl": false,
    "inherited": false
  }
}
```

#### `GET /api/dms/folders/:id/acl`
List all ACL entries for a folder.

**Response:**
```json
{
  "success": true,
  "acls": [
    {
      "acl_id": 123,
      "role_name": "owner",
      "can_read": true,
      "can_write": true,
      "can_delete": true,
      "can_manage_acl": true,
      "inherited": false
    },
    {
      "acl_id": 124,
      "role_name": "viewer",
      "can_read": true,
      "can_write": false,
      "can_delete": false,
      "can_manage_acl": false,
      "inherited": true
    }
  ]
}
```

#### `GET /api/dms/folders/:id/permissions`
Check current user's permissions for a folder.

**Response:**
```json
{
  "success": true,
  "folder_id": 5,
  "user_role": "editor",
  "permissions": {
    "can_read": true,
    "can_write": true,
    "can_delete": false,
    "can_manage_acl": false
  },
  "inherited": false
}
```

### DMS Setup APIs

#### `GET /api/dms/setup/families`
List all lu_family codes with current preset counts.

**Response:**
```json
{
  "success": true,
  "families": [
    {
      "code": "MF",
      "name": "Multifamily",
      "preset_count": 3,
      "default_preset_id": 10
    },
    {
      "code": "RET",
      "name": "Retail",
      "preset_count": 2,
      "default_preset_id": 15
    }
  ]
}
```

#### `POST /api/dms/setup/presets`
Create new family preset (additive only).

**Request:**
```json
{
  "family_code": "MF",
  "preset_name": "Luxury Multifamily",
  "default_profile": {
    "doc_type": "plan",
    "quality_tier": "luxury"
  },
  "default_folders": [
    {"name": "Plans", "default_profile": {"doc_type": "plan"}},
    {"name": "Marketing", "default_profile": {"doc_type": "marketing"}}
  ]
}
```

**Validation:**
- Check no existing docs have fields that would be removed
- Ensure all new fields are additive (no renames/deletes)
- Audit the change in `dms_template_audit`

**Response:**
```json
{
  "success": true,
  "preset": {
    "preset_id": 20,
    "family_code": "MF",
    "preset_name": "Luxury Multifamily",
    "default_profile": { ... },
    "default_folders": [ ... ],
    "is_active": true,
    "is_default": false
  },
  "validation": {
    "is_additive": true,
    "affected_docs": 0,
    "warnings": []
  }
}
```

#### `POST /api/dms/setup/presets/:id/publish`
Publish preset as default for family (with impact preview).

**Response:**
```json
{
  "success": true,
  "preset_id": 20,
  "impact": {
    "existing_docs_count": 145,
    "folders_created": 3,
    "profiles_updated": 145,
    "additive_fields": ["quality_tier"]
  }
}
```

### Audit Log APIs

#### `GET /api/dms/audit/:docId`
Get full audit history for a document.

**Response:**
```json
{
  "success": true,
  "doc_id": 123,
  "audit_log": [
    {
      "log_id": 500,
      "action_type": "upload",
      "user_email": "user@example.com",
      "created_at": "2025-10-01T10:00:00Z",
      "diff_json": {}
    },
    {
      "log_id": 501,
      "action_type": "folder_move",
      "folder_id": 5,
      "diff_json": {"doc_type": "plan", "priority": "high"},
      "created_at": "2025-10-02T14:30:00Z"
    },
    {
      "log_id": 502,
      "action_type": "profile_edit",
      "diff_json": {"custom_field": "updated_value"},
      "created_at": "2025-10-03T09:15:00Z"
    }
  ],
  "total_entries": 3
}
```

---

## UI Components

### 1. DMS Setup Page

**Location:** `/src/app/(admin)/dms/setup/page.tsx`

**Features:**
- List all `lu_family` codes from Neon
- Show preset count and default preset per family
- Create/Edit/Delete presets
- Preview impact before publishing
- Additive validation warnings

**Layout:**
```tsx
<div className="grid grid-cols-3 gap-6">
  {/* Left: Family List */}
  <div className="col-span-1">
    <FamilyList
      families={families}
      selectedFamily={selectedFamily}
      onSelect={setSelectedFamily}
    />
  </div>

  {/* Center: Presets for Selected Family */}
  <div className="col-span-1">
    <PresetList
      familyCode={selectedFamily?.code}
      onSelectPreset={setSelectedPreset}
      onCreatePreset={() => setShowPresetEditor(true)}
    />
  </div>

  {/* Right: Preset Editor */}
  <div className="col-span-1">
    {showPresetEditor && (
      <PresetEditor
        familyCode={selectedFamily?.code}
        preset={selectedPreset}
        onSave={handleSavePreset}
        onCancel={() => setShowPresetEditor(false)}
      />
    )}
  </div>
</div>
```

**Validation:**
```tsx
// Check if preset changes are additive
async function validatePresetChanges(preset: Preset): Promise<ValidationResult> {
  // 1. Check if any existing docs would lose fields
  const affectedDocs = await fetch('/api/dms/setup/presets/validate', {
    method: 'POST',
    body: JSON.stringify(preset)
  });

  // 2. Show warnings for non-additive changes
  if (!affectedDocs.is_additive) {
    return {
      isValid: false,
      errors: ['Preset contains non-additive changes that would remove existing fields'],
      warnings: affectedDocs.warnings
    };
  }

  return { isValid: true, errors: [], warnings: [] };
}
```

### 2. Folder ACL Manager

**Location:** `/src/components/dms/folders/FolderACLManager.tsx`

**Features:**
- Display current ACLs for folder
- Add/Edit/Delete role permissions
- Show inherited permissions (grayed out, read-only)
- Permission matrix view

**UI:**
```tsx
<table>
  <thead>
    <tr>
      <th>Role</th>
      <th>Read</th>
      <th>Write</th>
      <th>Delete</th>
      <th>Manage ACL</th>
      <th>Inherited</th>
    </tr>
  </thead>
  <tbody>
    {acls.map(acl => (
      <tr key={acl.acl_id}>
        <td>{acl.role_name}</td>
        <td><Checkbox checked={acl.can_read} disabled={acl.inherited} /></td>
        <td><Checkbox checked={acl.can_write} disabled={acl.inherited} /></td>
        <td><Checkbox checked={acl.can_delete} disabled={acl.inherited} /></td>
        <td><Checkbox checked={acl.can_manage_acl} disabled={acl.inherited} /></td>
        <td>{acl.inherited ? 'Yes' : 'No'}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### 3. Version Timeline

**Location:** `/src/components/dms/audit/VersionTimeline.tsx`

**Features:**
- Vertical timeline of document changes
- Diff viewer for each change
- Restore previous version option
- Filter by action type

**UI:**
```tsx
<div className="timeline">
  {auditLog.map(entry => (
    <div key={entry.log_id} className="timeline-entry">
      <div className="timeline-icon">
        {getActionIcon(entry.action_type)}
      </div>
      <div className="timeline-content">
        <h4>{entry.action_type}</h4>
        <p className="text-sm text-gray-500">
          {entry.user_email} • {formatDate(entry.created_at)}
        </p>
        {entry.diff_json && (
          <DiffViewer
            before={entry.old_json}
            after={entry.new_json}
            diff={entry.diff_json}
          />
        )}
      </div>
    </div>
  ))}
</div>
```

### 4. PresetEditor Component

**Location:** `/src/components/dms/setup/PresetEditor.tsx`

**Features:**
- JSON editor for `default_profile`
- Folder list builder for `default_folders`
- Additive validation
- Impact preview
- Publish/Save draft

---

## Permission Enforcement

### API Middleware

```typescript
// /src/middleware/dms-permissions.ts
export async function checkFolderPermission(
  req: NextRequest,
  folderId: number,
  permission: 'read' | 'write' | 'delete' | 'manage_acl'
): Promise<boolean> {
  const userId = await getUserIdFromSession(req);

  const result = await sql`
    SELECT landscape.check_folder_permission(
      ${folderId}::INTEGER,
      ${userId}::INTEGER,
      ${permission}::VARCHAR
    ) as has_permission
  `;

  return result.rows[0]?.has_permission || false;
}

// Usage in route
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const folderId = parseInt(params.id);

  if (!await checkFolderPermission(req, folderId, 'write')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  // Continue with folder update...
}
```

### Search Filtering

```typescript
// Filter search results by folder permissions
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromSession(req);
  const searchQuery = req.nextUrl.searchParams.get('q');

  // Get folders user can read
  const accessibleFolders = await sql`
    SELECT DISTINCT f.folder_id
    FROM landscape.core_doc_folder f
    LEFT JOIN landscape.core_folder_acl acl ON f.folder_id = acl.folder_id
    LEFT JOIN landscape.core_workspace_member wm ON acl.workspace_id = wm.workspace_id
    WHERE wm.user_id = ${userId}
      AND wm.is_active = true
      AND acl.can_read = true
  `;

  const folderIds = accessibleFolders.rows.map(r => r.folder_id);

  // Filter Meilisearch results
  const filters = [`folder_id IN [${folderIds.join(',')}]`];

  const results = await searchDocuments({
    query: searchQuery,
    filter: filters
  });

  return NextResponse.json({ success: true, results });
}
```

---

## Testing Plan

### 1. Folder ACL Tests

```bash
# Create folder with ACLs
curl -X POST http://localhost:3000/api/dms/folders/5/acl \
  -d '{"workspace_id": 1, "role_name": "viewer", "can_read": true, "can_write": false}'

# Test permission check (should return true)
curl http://localhost:3000/api/dms/folders/5/permissions

# Test write operation as viewer (should fail 403)
curl -X PATCH http://localhost:3000/api/dms/folders/5 \
  -d '{"name": "Updated Name"}'

# Test ACL inheritance
curl -X POST http://localhost:3000/api/dms/folders \
  -d '{"name": "Child Folder", "parent_id": 5}'

curl http://localhost:3000/api/dms/folders/{new_id}/acl
# Should show inherited permissions from folder 5
```

### 2. Preset Validation Tests

```bash
# Create preset
curl -X POST http://localhost:3000/api/dms/setup/presets \
  -d '{
    "family_code": "MF",
    "preset_name": "Test Preset",
    "default_profile": {"doc_type": "plan", "new_field": "value"}
  }'

# Validate additive changes
curl -X POST http://localhost:3000/api/dms/setup/presets/validate \
  -d '{
    "family_code": "MF",
    "default_profile": {"doc_type": "report"}  # Changing existing field
  }'
# Should return is_additive: false, warnings: ["Field 'doc_type' value change affects 50 docs"]
```

### 3. Audit Log Tests

```bash
# Upload document
curl -X POST http://localhost:3000/api/dms/docs \
  -d '{"doc_name": "test.pdf", ...}'

# Move to folder (should log audit entry)
curl -X POST http://localhost:3000/api/dms/docs/123/move \
  -d '{"folder_id": 5, "apply_inheritance": true}'

# Check audit log
curl http://localhost:3000/api/dms/audit/123

# Should show: upload, folder_move entries
```

### 4. Permission Enforcement Tests

```bash
# As viewer role:
# 1. Should be able to search documents in permitted folders
curl "http://localhost:3000/api/dms/search?q=test"

# 2. Should NOT be able to move documents
curl -X POST http://localhost:3000/api/dms/docs/123/move \
  -d '{"folder_id": 5}'
# Expect 403

# 3. Should NOT see folders without read permission
curl http://localhost:3000/api/dms/folders
# Only shows permitted folders
```

---

## Migration Path

### Phase 1: Database (Week 1)
1. Create new tables (ACL, audit, presets)
2. Create functions (check_permission, apply_acl_inheritance, log_audit)
3. Migrate existing ai_review_history to dms_audit_log
4. Seed default ACLs for existing folders

### Phase 2: APIs (Week 2)
1. Implement ACL endpoints
2. Add permission middleware to existing routes
3. Implement Setup page APIs
4. Implement audit log endpoints

### Phase 3: UI (Week 3)
1. Build DMS Setup Page
2. Add FolderACLManager to FolderEditor
3. Create VersionTimeline component
4. Update search results filtering

### Phase 4: Testing & QA (Week 4)
1. Unit tests for permission functions
2. Integration tests for ACL enforcement
3. E2E tests for Setup page workflow
4. Performance testing (ACL checks on search)

---

## Success Criteria

- [ ] Folder ACLs created and inherited correctly
- [ ] Permission checks prevent unauthorized access (positive and negative tests)
- [ ] Search results filtered by folder permissions
- [ ] DMS Setup page allows preset creation with additive validation
- [ ] Presets can be published with impact preview
- [ ] Audit log captures all DMS operations
- [ ] Version timeline displays document history
- [ ] No performance regression on search (ACL checks < 50ms)
- [ ] Documentation complete (API specs, user guide, admin guide)

---

## Next Steps (Step 9)

After Step 8 completion, consider:

### Option A: Semantic Search + Embeddings
- Generate document embeddings (OpenAI, Cohere)
- Vector similarity search
- "More like this" recommendations
- Hybrid search (keyword + semantic)

### Option B: Document Versioning
- Track full version history
- Side-by-side diff viewer
- Restore previous versions
- Branch/merge workflows

### Option C: Workflow & Approvals
- Document review workflows
- Multi-stage approvals
- Status transitions (draft → review → approved)
- Notification system

---

## File Structure

```
/src/app/(admin)/dms/setup/
  page.tsx                    # Main setup page
  components/
    FamilyList.tsx
    PresetList.tsx
    PresetEditor.tsx
    ImpactPreview.tsx

/src/app/api/dms/
  folders/[id]/acl/route.ts
  folders/[id]/permissions/route.ts
  setup/
    families/route.ts
    presets/route.ts
    presets/[id]/publish/route.ts
    presets/validate/route.ts
  audit/
    [docId]/route.ts

/src/components/dms/
  folders/FolderACLManager.tsx
  audit/VersionTimeline.tsx
  audit/DiffViewer.tsx
  setup/
    PresetEditor.tsx
    FolderTemplateBuilder.tsx

/src/middleware/
  dms-permissions.ts

/docs/
  DMS-Step-8-Complete.md      # Post-implementation
  DMS-Admin-Guide.md          # Admin documentation
  DMS-User-Guide.md           # End-user documentation
```

---

## Summary

Step 8 transforms the DMS from a functional system into an **enterprise-grade platform** with:
- ✅ Role-based access control
- ✅ Centralized configuration management
- ✅ Comprehensive audit trail
- ✅ Version history and timeline
- ✅ Additive-only template updates

**Implementation Effort:** ~4 weeks
**Database Changes:** 4 new tables, 3 new functions
**API Endpoints:** 10+ new routes
**UI Components:** 6 new components
**Testing:** 20+ test scenarios

Upon completion, the DMS will support secure multi-tenant workflows with full governance and compliance capabilities.
