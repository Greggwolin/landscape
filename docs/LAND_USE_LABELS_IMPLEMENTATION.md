# Land Use Taxonomy Label Configuration System

**Status**: ✅ Implemented
**Date**: October 30, 2025
**Scope**: Simplified (Project-level configuration only)

---

## Overview

This feature allows users to customize the terminology used for land use classifications in land development projects. Instead of hardcoded "Family → Type → Product" labels, users can now set custom labels like "Category → Use → Series" or "Classification → Subtype → Model" on a per-project basis.

---

## Implementation Summary

### What Was Built (Option A - Simplified)

We implemented a **project-level configuration system** without user preferences:

1. **Database Migration** - Added land use label columns to `tbl_project_config`
2. **API Endpoints** - Enhanced config endpoints to read/write labels
3. **TypeScript Types** - Created `LandUseLabels` interface
4. **React Hook** - Built `useLandUseLabels` hook for easy access
5. **Settings Component** - Created `ProjectLandUseLabels` UI component
6. **Default Behavior** - All projects default to "Family / Type / Product"

### What Was NOT Built (Deferred Until Auth Exists)

- ❌ User preferences table (`tbl_user_preferences`)
- ❌ User-specific default labels
- ❌ Global user settings page
- ❌ Three-tier fallback logic (Project → User → System)

---

## Database Schema

### Migration File

Location: `/Users/5150east/landscape/backend/db/migrations/017_land_use_label_configuration.sql`

### New Columns in `tbl_project_config`

```sql
land_use_level1_label VARCHAR(50) DEFAULT 'Family'
land_use_level1_label_plural VARCHAR(50) DEFAULT 'Families'
land_use_level2_label VARCHAR(50) DEFAULT 'Type'
land_use_level2_label_plural VARCHAR(50) DEFAULT 'Types'
land_use_level3_label VARCHAR(50) DEFAULT 'Product'
land_use_level3_label_plural VARCHAR(50) DEFAULT 'Products'
```

### Schema Verification

```bash
psql "$DATABASE_URL" -c "\d landscape.tbl_project_config"
```

---

## API Endpoints

### GET /api/projects/:projectId/config

Returns project configuration including land use labels.

**Response Example:**
```json
{
  "config": {
    "project_id": 17,
    "asset_type": "MPC",
    "level1_label": "Area",
    "level2_label": "Phase",
    "level3_label": "Parcel",
    "land_use_level1_label": "Family",
    "land_use_level1_label_plural": "Families",
    "land_use_level2_label": "Type",
    "land_use_level2_label_plural": "Types",
    "land_use_level3_label": "Product",
    "land_use_level3_label_plural": "Products"
  }
}
```

### PATCH /api/projects/:projectId/config

Updates land use labels for a specific project.

**Request Body:**
```json
{
  "land_use_level1_label": "Category",
  "land_use_level1_label_plural": "Categories",
  "land_use_level2_label": "Use",
  "land_use_level2_label_plural": "Uses",
  "land_use_level3_label": "Series",
  "land_use_level3_label_plural": "Series"
}
```

---

## TypeScript Types

### Location

`/Users/5150east/landscape/src/types/containers.ts`

### Interfaces

```typescript
export interface ProjectConfig {
  project_id: number
  asset_type: string
  level1_label: string
  level2_label: string
  level3_label: string
  land_use_level1_label?: string
  land_use_level1_label_plural?: string
  land_use_level2_label?: string
  land_use_level2_label_plural?: string
  land_use_level3_label?: string
  land_use_level3_label_plural?: string
  created_at?: string
  updated_at?: string
}

export interface LandUseLabels {
  level1Label: string
  level1LabelPlural: string
  level2Label: string
  level2LabelPlural: string
  level3Label: string
  level3LabelPlural: string
}
```

---

## React Hook

### Location

`/Users/5150east/landscape/src/hooks/useLandUseLabels.ts`

### Usage

```typescript
import { useLandUseLabels } from '@/hooks/useLandUseLabels'

function MyComponent({ projectId }: { projectId: number }) {
  const { labels, isLoading, error, refetch } = useLandUseLabels(projectId)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Select a {labels.level1Label}</h2>
      <p>Choose from available {labels.level1LabelPlural}</p>
    </div>
  )
}
```

### Default Values

If labels are not set or fetch fails, defaults to:
- Level 1: "Family" / "Families"
- Level 2: "Type" / "Types"
- Level 3: "Product" / "Products"

---

## UI Components

### Settings Component

**Location:** `/Users/5150east/landscape/src/components/project/ProjectLandUseLabels.tsx`

**Features:**
- Edit all 6 label fields (singular + plural for 3 levels)
- Real-time preview of label hierarchy
- Common configuration examples
- Save/Reset functionality
- Success/error notifications

### Settings Page

**Location:** `/Users/5150east/landscape/src/app/projects/[projectId]/settings/page.tsx`

**Access:** Navigate to `/projects/:projectId/settings`

---

## Integration Points

### Existing Components

The following components already use dynamic labels from the database and will automatically respect custom land use labels:

1. **UniversalInventoryTable** - Reads column labels from `tbl_project_inventory_columns`
2. **Planning Tab** - Uses inventory configuration
3. **Budget Grid** - Uses container hierarchy labels

### Future Integration

When adding new UI components that reference land use classifications:

```typescript
import { useLandUseLabels } from '@/hooks/useLandUseLabels'

function NewComponent({ projectId }: Props) {
  const { labels } = useLandUseLabels(projectId)

  return (
    <div>
      <h3>Select {labels.level1Label}</h3>
      <Select label={`Choose ${labels.level2Label}`}>
        {/* options */}
      </Select>
    </div>
  )
}
```

---

## Common Configuration Examples

### Default
- Level 1: Family → Families
- Level 2: Type → Types
- Level 3: Product → Products

### Alternative 1 (Planning-Focused)
- Level 1: Category → Categories
- Level 2: Use → Uses
- Level 3: Series → Series

### Alternative 2 (Asset Management)
- Level 1: Classification → Classifications
- Level 2: Subtype → Subtypes
- Level 3: Model → Models

### Commercial Focus
- Level 1: Asset Class → Asset Classes
- Level 2: Property Type → Property Types
- Level 3: Submarket → Submarkets

---

## Testing

### Manual Testing Checklist

- [x] Database migration runs successfully
- [x] New columns exist in `tbl_project_config`
- [x] GET endpoint returns land use labels
- [x] PATCH endpoint updates labels
- [x] Settings page loads without errors
- [x] Can save and reset label changes
- [ ] Labels persist across page refreshes
- [ ] Multiple projects have independent settings
- [ ] Inventory table respects custom labels

### Test Queries

**Check current labels for a project:**
```sql
SELECT
  project_id,
  land_use_level1_label,
  land_use_level2_label,
  land_use_level3_label
FROM landscape.tbl_project_config
WHERE project_id = 17;
```

**Update labels manually:**
```sql
UPDATE landscape.tbl_project_config
SET
  land_use_level1_label = 'Category',
  land_use_level2_label = 'Use',
  land_use_level3_label = 'Series'
WHERE project_id = 17;
```

---

## Future Enhancements

### Phase 2: User Preferences (When Auth Exists)

Once authentication is implemented:

1. Create `tbl_user_preferences` table
2. Add user-level default labels
3. Implement three-tier fallback: Project → User → System
4. Build user settings page (account-level)
5. Auto-apply user defaults to new projects

### Phase 3: Organization-Level Defaults

For multi-tenant deployments:

1. Add `org_id` to preferences
2. Implement four-tier fallback: Project → User → Org → System
3. Admin interface for org-wide defaults

---

## Troubleshooting

### Labels Not Showing Up

**Problem:** Custom labels don't appear in UI
**Solution:** Check if `useLandUseLabels` hook is used in the component

### Labels Reset to Default

**Problem:** Saved labels revert to "Family/Type/Product"
**Solution:** Verify PATCH request is successful. Check browser network tab.

### Migration Failed

**Problem:** Migration script errors
**Solution:** Check if columns already exist. Drop and re-run migration:
```sql
ALTER TABLE landscape.tbl_project_config
DROP COLUMN IF EXISTS land_use_level1_label;
-- (repeat for all 6 columns)
```

---

## File Manifest

### Database
- ✅ `/backend/db/migrations/017_land_use_label_configuration.sql`

### Backend (API)
- ✅ `/src/app/api/projects/route.ts` (modified POST)
- ✅ `/src/app/api/projects/[projectId]/config/route.ts` (modified GET, added PATCH)

### Types
- ✅ `/src/types/containers.ts` (modified ProjectConfig, added LandUseLabels)

### Hooks
- ✅ `/src/hooks/useLandUseLabels.ts`

### Components
- ✅ `/src/components/project/ProjectLandUseLabels.tsx`

### Pages
- ✅ `/src/app/projects/[projectId]/settings/page.tsx`

### Documentation
- ✅ `/docs/LAND_USE_LABELS_IMPLEMENTATION.md` (this file)

---

## Success Criteria

Implementation is complete when:

- ✅ User can customize labels per project
- ✅ Labels persist in database
- ✅ Labels appear in settings UI
- ✅ API endpoints work correctly
- ✅ Hook provides labels to components
- ✅ Default values work when not set
- ⏳ Inventory table shows custom labels (depends on column config)
- ⏳ Planning interfaces use custom labels (depends on implementation)

---

## Session Information

**Session ID:** KM06
**Implementation Date:** October 30, 2025
**Implemented By:** Claude (Sonnet 4.5)
**Architecture Decision:** Option A (Simplified, no auth required)

---

## Next Steps

1. **Test the implementation:**
   - Navigate to `/projects/17/settings`
   - Change labels and save
   - Verify persistence

2. **Integrate with inventory:**
   - Update inventory column configuration
   - Test with actual land development project

3. **Add to navigation:**
   - Add "Settings" link to project tabs
   - Consider adding to project dropdown menu

4. **Plan for Phase 2:**
   - Wait for authentication implementation
   - Then add user preferences layer

---

**END OF DOCUMENTATION**
