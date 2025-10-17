# Home Page Redesign - Phase 1 Implementation Guide

**Date:** October 16, 2025  
**Status:** Ready for Implementation  
**Chat ID:** HR

---

## Overview

Phase 1 implements the foundation of the Home page redesign:
- Header cleanup (remove Reports, Export, User buttons)
- Enhanced Active Project tile (location, type, edit/save functionality)
- New metric tiles (Documents count + Assumptions progress placeholder)
- Database migration for template system
- Soft delete capability

**What's NOT in Phase 1:**
- DMS "Add Document" button functionality (Phase 2)
- Real assumptions progress calculation (Phase 2)
- Template management UI (Phase 2)
- Hard delete with cascade handling (Phase 2)
- AI document analysis (Phase 2)

---

## File Changes Required

### 1. Database Migration

**File:** `db/migrations/002_add_template_id_to_project.up.sql`

```sql
-- Add template_id column
ALTER TABLE landscape.tbl_project
  ADD COLUMN IF NOT EXISTS template_id BIGINT 
  REFERENCES landscape.tbl_property_use_template(template_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_project_template
  ON landscape.tbl_project(template_id);

-- Add comment
COMMENT ON COLUMN landscape.tbl_project.template_id IS
  'References template used during project creation';
```

**Run this migration:** Connect to Neon database and execute.

---

### 2. Backend API Routes

#### 2.1 PATCH /api/projects/[id]

**New File:** `src/app/api/projects/[id]/route.ts`

Add PATCH handler to existing route file:

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    const updates = await request.json();

    const allowedFields = [
      'project_name', 'description', 'location_description',
      'jurisdiction_city', 'jurisdiction_county', 'jurisdiction_state',
      'developer_owner', 'acres_gross', 'start_date',
      'property_type_code', 'project_type', 'template_id'
    ];

    const updateFields: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(projectId);

    const query = `
      UPDATE landscape.tbl_project
      SET ${updateFields.join(', ')}
      WHERE project_id = $${valueIndex}
      RETURNING *
    `;

    const result = await sql.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}
```

#### 2.2 GET /api/documents/count

**New File:** `src/app/api/documents/count/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id parameter required' },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT 
        COUNT(*) as document_count,
        COALESCE(SUM(file_size_bytes), 0) as total_size_bytes
      FROM landscape.dms_document
      WHERE project_id = ${projectId}
        AND status != 'deleted'
    `;

    return NextResponse.json({
      project_id: parseInt(projectId),
      document_count: parseInt(result.rows[0].document_count),
      total_size_bytes: parseInt(result.rows[0].total_size_bytes),
      total_size_mb: (parseInt(result.rows[0].total_size_bytes) / (1024 * 1024)).toFixed(2)
    });

  } catch (error) {
    console.error('Error fetching document count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document count' },
      { status: 500 }
    );
  }
}
```

---

### 3. Frontend Components

#### 3.1 Header Component - Remove Buttons

**File:** `src/app/components/Header.tsx`

**Changes:**
1. Remove lines 104-115 (Reports dropdown)
2. Remove lines 150-152 (Export button)
3. Remove lines 153-155 (User "U" avatar)
4. Keep Logo, Project Selector, and conditional Edit/Save/Cancel controls

**Key sections to update:**

```tsx
export default function Header({ 
  isEditing = false, 
  onEdit, 
  onSave, 
  onCancel,
  isSaving = false 
}: HeaderProps) {
  const { projects, activeProject, selectProject } = useProject();

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold text-white">Landscape</div>
        </div>

        {/* Project Selector */}
        <div className="flex-1 max-w-md mx-8">
          <select
            value={activeProject?.project_id || ''}
            onChange={(e) => selectProject(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            disabled={isEditing}
          >
            {/* Options */}
          </select>
        </div>

        {/* Conditional Edit Controls */}
        {/* Only shown when props provided */}
      </div>
    </header>
  );
}
```

#### 3.2 HomeOverview Component - Major Rewrite

**File:** `src/app/components/Home/HomeOverview.tsx`

**Complete replacement** with enhanced version. Key sections:

**A. Active Project Tile (lines 169-201 → Expanded)**

```tsx
{/* Enhanced Active Project Tile */}
<div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
  {/* Header with Edit/Save/Cancel chips */}
  <div className="flex items-start justify-between mb-4">
    <div className="flex-1">
      {/* Project Name - editable */}
      {/* Property Type & Template badges */}
      {/* Location fields (City, County, State) - editable grid */}
      {/* Description - editable */}
    </div>
    
    {/* Action Chips */}
    <div className="flex gap-2">
      {!isEditing ? (
        <button onClick={handleEdit}>Edit</button>
      ) : (
        <>
          <button onClick={handleCancel}>Cancel</button>
          <button onClick={handleSave}>Save</button>
        </>
      )}
    </div>
  </div>
</div>
```

**B. Metric Tiles (lines 203-208 → Replaced)**

Remove 4 hierarchy cards, replace with 2 new tiles:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Document Summary Tile */}
  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
    <h3>Documents</h3>
    <div className="text-4xl font-bold text-blue-300">
      {documentCount?.document_count || 0}
    </div>
    <button disabled>Add Document</button>
    {/* Disabled for Phase 1 */}
  </div>

  {/* Assumptions Progress Tile - Placeholder */}
  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
    <h3>Analysis Progress</h3>
    {/* Triple indicator mockup */}
    <div>Completion: 60%</div>
    <div>Confidence: Medium</div>
    <div>Available Analyses: 3 ready, 2 locked</div>
    {/* Hardcoded placeholder data */}
  </div>
</div>
```

**C. Phase Snapshot & Top Use Families (lines 210-241 → Keep)**

No changes to these sections.

---

## Property Type Label Mapping

Add to HomeOverview component:

```typescript
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  'MPC': 'Master Planned Community',
  'MULTIFAMILY': 'Multifamily',
  'COMMERCIAL': 'Commercial',
  'OFFICE': 'Office',
  'RETAIL': 'Retail',
  'INDUSTRIAL': 'Industrial',
  'HOTEL': 'Hotel',
  'MIXED_USE': 'Mixed Use'
};
```

---

## State Management

New state variables in HomeOverview:

```typescript
const [isEditing, setIsEditing] = useState(false);
const [editedProject, setEditedProject] = useState<any>({});
const [isSaving, setIsSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
const [documentCount, setDocumentCount] = useState<DocumentCount | null>(null);
```

---

## Testing Checklist

### Backend
- [ ] Migration runs successfully on Neon DB
- [ ] PATCH /api/projects/:id updates allowed fields
- [ ] PATCH validates and rejects invalid fields
- [ ] PATCH returns updated project data
- [ ] GET /api/documents/count returns correct count
- [ ] Document count query handles missing project_id

### Frontend
- [ ] Header displays Logo + Project Selector only
- [ ] Reports, Export, User buttons removed
- [ ] Project selector still works
- [ ] Edit button enables field editing
- [ ] Cancel button reverts changes
- [ ] Save button calls PATCH API
- [ ] Inline editing works for all fields
- [ ] Location fields display correctly
- [ ] Property type shows human-readable label
- [ ] Template badge shows "Standard" placeholder
- [ ] Document count loads and displays
- [ ] Document count shows MB correctly
- [ ] "Add Document" button is disabled
- [ ] Progress tile shows placeholder data
- [ ] Error handling works (network failure)
- [ ] Loading states display correctly

### Integration
- [ ] Edit → Save → Refresh updates ProjectProvider
- [ ] Active project updates after save
- [ ] Project selector disabled during edit
- [ ] No console errors
- [ ] No React warnings

---

## Deployment Steps

1. **Backup Database**
   ```bash
   # Connect to Neon and create backup
   pg_dump -h [neon-host] -U [user] -d landscape > backup_pre_phase1.sql
   ```

2. **Run Migration**
   ```bash
   # Execute migration SQL
   psql -h [neon-host] -U [user] -d landscape < migration_002_add_template_id.sql
   ```

3. **Deploy Backend APIs**
   - Merge PATCH handler into `/api/projects/[id]/route.ts`
   - Create `/api/documents/count/route.ts`
   - Test endpoints in development

4. **Deploy Frontend**
   - Update `Header.tsx`
   - Replace `HomeOverview.tsx`
   - Test in local development
   - Verify no breaking changes

5. **Smoke Test Production**
   - Load Home page
   - Test project selector
   - Test edit/save flow
   - Verify document count
   - Check console for errors

---

## Rollback Plan

If issues occur:

1. **Frontend rollback:**
   ```bash
   git revert [commit-hash]
   git push origin main
   ```

2. **Backend rollback:**
   - Revert API route changes
   - Migration rollback:
   ```sql
   ALTER TABLE landscape.tbl_project DROP COLUMN IF EXISTS template_id;
   DROP INDEX IF EXISTS idx_project_template;
   ```

3. **Restore database:**
   ```bash
   psql -h [neon-host] -U [user] -d landscape < backup_pre_phase1.sql
   ```

---

## What's Next: Phase 2 Preview

After Phase 1 is stable:

1. **DMS Integration**
   - Enable "Add Document" button
   - Connect to existing DMS modal
   - Test document upload flow

2. **Real Progress Calculation**
   - Create `/api/projects/:id/progress` endpoint
   - Implement triple indicator calculation
   - Query assumption tables for counts

3. **Template Management**
   - Create `/settings/templates` page
   - Build template CRUD UI
   - Add module system tables

4. **Delete Enhancement**
   - Implement soft delete endpoint
   - Add archive functionality
   - Build AI document advisory

---

## Files Provided

All implementation files are in `/home/claude/`:

1. `migration_001_add_template_id.sql` - Database migration
2. `api_projects_patch.ts` - PATCH endpoint implementation
3. `api_documents_count.ts` - Document count endpoint
4. `HomeOverview_enhanced.tsx` - Complete HomeOverview component
5. `Header_simplified.tsx` - Simplified Header component
6. `HOME_PAGE_PHASE1_IMPLEMENTATION.md` - This document

---

## Success Criteria

Phase 1 is successful when:

✅ Header is clean (Reports, Export, User removed)  
✅ Active Project tile shows location + type  
✅ Edit/Save functionality works  
✅ Document count displays correctly  
✅ Progress tile shows placeholder  
✅ No breaking changes to existing features  
✅ Zero console errors  
✅ All tests pass  

---

## Notes

- **"Add Document" button is intentionally disabled** - functionality comes in Phase 2
- **Progress tile shows hardcoded 60%** - real calculation comes in Phase 2
- **Template badge shows "Standard"** - dynamic lookup comes in Phase 2
- **Delete functionality deferred** - requires broader discussion on cascade behavior
- **No backfill of existing projects** - template_id remains NULL for Projects 7 & 11

This is a **foundation release** - shipping core infrastructure without complex features that need more design work.

**HR04**
