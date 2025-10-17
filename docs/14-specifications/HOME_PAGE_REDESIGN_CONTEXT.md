# Home Page Redesign - Technical Context

**Date:** 2025-10-16
**Purpose:** Provide comprehensive technical context for Claude to generate detailed implementation plan
**Target Component:** Home Page (Dashboard/Overview)

---

## Current Implementation Analysis

### File Structure

**Main Files:**
- `/src/app/page.tsx` - Main app container, routes to HomeOverview for 'home'/'dashboard' view
- `/src/app/components/Home/HomeOverview.tsx` - Home page component (273 lines)
- `/src/app/components/Header.tsx` - Top header with project selector, Reports, Export, User (162 lines)
- `/src/app/components/ProjectProvider.tsx` - React context managing active project state

### Current Home Page Layout (HomeOverview.tsx)

**Section 1: Active Project Tile** (Lines 169-201)
```tsx
<div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
  - Title: "Active Project"
  - Project Name: activeProject?.project_name
  - Description paragraph
  - Buttons:
    - "Refresh Projects" (lines 181-187)
    - "Go to Planning Overview" (lines 188-193)
  - Project count footer
</div>
```

**Section 2: Four Metric Cards** (Lines 203-208)
Grid of 4 cards showing:
- Areas count (level 1 containers)
- Phases count (level 2 containers)
- Parcels count (level 3 containers)
- Planned Units (total units)

**Section 3: Two-Column Layout** (Lines 210-241)
- Left (2/3): "Phase Snapshot" tile with 3 stats
- Right (1/3): "Top Use Families" tile with breakdown

### Header Component (Header.tsx)

**Current Header Elements:**
- Logo (left)
- Project Selector dropdown (line 57-102)
- **Reports dropdown** (lines 104-115) - DISABLED, to be removed
- **Export button** (lines 150-152) - To be removed
- **User avatar "U"** (lines 153-155) - To be removed

### Data Available from Context

**ProjectProvider Context:**
```typescript
{
  projects: Project[]
  activeProject: Project | null
  selectProject: (id: number) => void
  refreshProjects: () => Promise<void>
  isLoading: boolean
  error: Error | null
}
```

**Project Type (from tbl_project):**
```typescript
type Project = {
  project_id: number
  project_name: string
  property_type_code: string | null  // 'MPC', 'MULTIFAMILY', 'COMMERCIAL', etc.
  project_type: string | null        // Free text description
  description: string | null
  location_description: string | null
  jurisdiction_city: string | null
  jurisdiction_county: string | null
  jurisdiction_state: string | null
  developer_owner: string | null
  acres_gross: number | null
  start_date: string | null
  is_active: boolean
}
```

### New Project Wizard Data (NewProjectModal.tsx)

**Wizard captures (lines 10-44):**
```typescript
type BasicInfoData = {
  project_name: string
  description: string
  location_description: string
  jurisdiction_city: string
  jurisdiction_county: string
  jurisdiction_state: string
  developer_owner: string
}
propertyType: string  // Selected from PropertyTypeStep
templateId: number    // Selected from TemplateStep
```

**Template System:**
- Table: `tbl_property_use_template`
- Fields: `template_id`, `template_name`, `property_type`, `template_category`, `description`
- Template represents "complexity" level (e.g., "Standard MPC - 3 Level", "Simple MPC - 2 Level")

### DMS Integration

**DMS Component:** `/src/app/components/Documents/DocumentManagement.tsx`
**DMS Tables:**
- `landscape.dms_document` - Document storage
- `landscape.dms_extract_queue` - Processing queue
- `landscape.dms_unmapped` - Unprocessed data
- `landscape.dms_assertion` - Extracted assertions

**DMS API:**
- GET `/api/documents?project_id={id}` - List documents
- POST `/api/documents` - Upload new document
- POST `/api/ai/analyze-document` - Process document

### Current Container System Metrics

**Container Metrics (lines 72-95):**
```typescript
{
  areas: number           // Level 1 containers
  phases: number          // Level 2 containers
  parcels: number         // Level 3 containers
  totalUnits: number      // Sum of units across level 3
  activePhases: number    // Phases with status='active'
  plannedAcreage: number  // Sum of gross acres from level 2
}
```

---

## Requested Changes

### 1. Remove Header Elements

**Remove from Header.tsx:**
- Reports dropdown (lines 104-115)
- Export button (lines 150-152)
- User avatar "U" button (lines 153-155)

**Keep:**
- Logo
- Project Selector dropdown
- Edit/Save/Cancel controls (if props provided)

### 2. Enhance Active Project Tile

**Add to Active Project Tile:**
1. **Location Information:**
   - `jurisdiction_city`
   - `jurisdiction_county`
   - `jurisdiction_state`
   - `location_description` (if provided)

2. **Project Type & Complexity:**
   - `property_type_code` - Display human-readable (e.g., "MPC" → "Master Planned Community")
   - Template name (lookup via `template_id` from project creation) - represents "complexity"
   - OR fallback to `project_type` if template not available

3. **CRUD Controls (Action Chips):**
   - **Edit** - Enable inline editing of project fields
   - **Save** - Save changes to project
   - **Delete** - Delete project (with confirmation)

**Remove from Active Project Tile:**
- "Refresh Projects" button
- "Go to Planning Overview" button

**API Requirements:**
- Need to store `template_id` on `tbl_project` (currently not stored)
- GET `/api/projects/{id}` - Fetch full project details including template
- PATCH `/api/projects/{id}` - Update project fields
- DELETE `/api/projects/{id}` - Delete project

### 3. Remove/Redesign Metric Cards

**Current 4 metric cards to be removed:**
- Areas count
- Phases count
- Parcels count
- Planned Units

**Replace with 2 new metric tiles:**

#### Tile A: Document Management Summary
- **Count:** Number of documents in DMS for active project
- **Visual:** Icon or badge showing document count
- **Action:** "Add Document" button → Opens DMS intake/upload modal
- **Data Source:** `SELECT COUNT(*) FROM landscape.dms_document WHERE project_id = ?`

#### Tile B: Assumptions Progress Indicator
- **Concept:** Show % of assumptions entered based on project complexity
- **Visual Options:**
  1. Progress bar/ring chart showing completion %
  2. Fraction display: "12 / 45 assumptions entered"
  3. Multi-level indicator showing % complete for different analysis levels

- **Complexity Mapping:**
  - Use `template_id` to determine required assumptions
  - Simple template (2-level) = fewer required assumptions
  - Standard template (3-level) = standard assumptions
  - Complex template (custom) = more assumptions

- **Analysis Levels (potential indicators):**
  - Basic Analysis: Location, type, size entered
  - Market Analysis: Market assumptions, growth rates entered
  - Financial Analysis: Budget, costs, timeline entered
  - Full Model: All assumptions complete

- **Data Sources to Check:**
  - Market assumptions: `tbl_market_assumption`, `tbl_absorption_assumption`
  - Growth rates: `tbl_growth_rate_assumption`
  - Budget items: `tbl_budget` count for project
  - Container attributes: Check if key attributes populated
  - Revenue timing: `tbl_revenue_timing`
  - Operating expenses: `tbl_operating_expense`

### 4. Update Phase Snapshot Section

**Keep:**
- Phase Snapshot tile (left 2/3 width)
- Top Use Families tile (right 1/3 width)

**Consider:**
- Making these more actionable with navigation to detail views

---

## Database Schema References

### tbl_project (Current)
```sql
CREATE TABLE landscape.tbl_project (
  project_id BIGSERIAL PRIMARY KEY,
  project_name VARCHAR(255) NOT NULL,
  property_type_code VARCHAR(50),
  project_type VARCHAR(100),
  description TEXT,
  location_description TEXT,
  jurisdiction_city VARCHAR(100),
  jurisdiction_county VARCHAR(100),
  jurisdiction_state VARCHAR(50),
  developer_owner VARCHAR(255),
  acres_gross NUMERIC(10,2),
  start_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

**Missing Field (needs migration):**
- `template_id BIGINT REFERENCES landscape.tbl_property_use_template(template_id)`

### tbl_property_use_template
```sql
CREATE TABLE landscape.tbl_property_use_template (
  template_id BIGSERIAL PRIMARY KEY,
  template_name VARCHAR(100) NOT NULL,
  property_type VARCHAR(50) NOT NULL,
  template_category VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

**Sample Templates:**
- ID 1: "Standard MPC - 3 Level" (Area → Phase → Parcel)
- ID 2: "Simple MPC - 2 Level" (Phase → Parcel)
- ID 3: "Mixed-Use MPC"

### dms_document
```sql
CREATE TABLE landscape.dms_document (
  document_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES landscape.tbl_project(project_id),
  filename VARCHAR(500),
  file_path TEXT,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  document_type VARCHAR(100),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending'
)
```

---

## Component Architecture

### Proposed New Component Structure

```
HomeOverview.tsx (refactored)
├── ActiveProjectTile
│   ├── ProjectHeader (name, type, complexity)
│   ├── LocationInfo (city, county, state)
│   └── ActionChips (Edit, Save, Delete)
├── MetricTilesGrid
│   ├── DocumentsSummaryTile
│   │   ├── DocumentCount
│   │   └── AddDocumentButton → DMS Modal
│   └── AssumptionsProgressTile
│       ├── ProgressIndicator (chart/bar)
│       └── CompletionBreakdown
├── PhaseSnapshot (existing, minor updates)
└── TopUseFamilies (existing, keep as-is)
```

### New Components Needed

1. **EditableProjectTile** - Active project with CRUD controls
2. **DocumentsSummaryTile** - Shows document count + add button
3. **AssumptionsProgressTile** - Progress indicator for assumptions
4. **ProjectEditModal** OR **InlineEditForm** - Form for editing project details
5. **DocumentUploadModal** - DMS document intake (may already exist)

### State Management

**New State Required:**
```typescript
// In HomeOverview or new hook
const [isEditingProject, setIsEditingProject] = useState(false)
const [editedProject, setEditedProject] = useState<Partial<Project>>({})
const [documentCount, setDocumentCount] = useState(0)
const [assumptionsProgress, setAssumptionsProgress] = useState<{
  total: number
  completed: number
  byCategory: Record<string, { total: number, completed: number }>
}>()
```

### API Endpoints Needed

**Project CRUD:**
- ✅ GET `/api/projects` - List projects (exists)
- ✅ GET `/api/projects/{id}` - Get single project (exists)
- 🆕 PATCH `/api/projects/{id}` - Update project (NEW - needs implementation)
- 🆕 DELETE `/api/projects/{id}` - Delete project (NEW - needs implementation)

**Template Lookup:**
- 🆕 GET `/api/templates/{id}` - Get template details (NEW)

**Document Count:**
- 🆕 GET `/api/documents/count?project_id={id}` - Get document count (NEW)
- OR modify existing `/api/documents?project_id={id}` to include count in response

**Assumptions Progress:**
- 🆕 GET `/api/projects/{id}/assumptions-progress` - Calculate completion % (NEW)
  - Returns: `{ total, completed, percentage, byCategory }`

---

## Design Considerations

### 1. Project Type Display Mapping

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
}
```

### 2. Assumptions Calculation Logic

**Complexity Levels by Template:**
- **Simple (2-level):** ~20 required assumptions
  - Location (3): City, County, State
  - Project basics (5): Name, Type, Description, Acres, Start Date
  - Market basics (6): Market assumptions for property type
  - Budget basics (6): High-level budget categories

- **Standard (3-level):** ~45 required assumptions
  - All Simple assumptions +
  - Growth rates (8): Rent, appreciation, expense growth
  - Phase-level details (10): Phase timing, absorption
  - Financial assumptions (12): Debt, equity, returns

- **Complex (custom):** ~75+ required assumptions
  - All Standard assumptions +
  - Detailed revenue timing
  - Operating expenses by category
  - Capital reserves
  - Custom attributes per container level

### 3. Assumptions Progress Data Query

```sql
-- Pseudocode for assumptions progress calculation
WITH project_assumptions AS (
  -- Count market assumptions
  SELECT COUNT(*) as count FROM tbl_market_assumption WHERE project_id = ?
  UNION ALL
  -- Count growth rates
  SELECT COUNT(*) FROM tbl_growth_rate_assumption WHERE project_id = ?
  UNION ALL
  -- Count budget items
  SELECT COUNT(*) FROM tbl_budget WHERE project_id = ?
  UNION ALL
  -- Count absorption assumptions
  SELECT COUNT(*) FROM tbl_absorption_assumption WHERE project_id = ?
  UNION ALL
  -- Count revenue timing
  SELECT COUNT(*) FROM tbl_revenue_timing WHERE project_id = ?
  UNION ALL
  -- Count operating expenses
  SELECT COUNT(*) FROM tbl_operating_expense WHERE project_id = ?
)
SELECT
  SUM(count) as completed,
  ? as total_required, -- Based on template complexity
  (SUM(count)::float / ?) * 100 as percentage
FROM project_assumptions
```

### 4. Delete Project Confirmation

**Considerations:**
- Check for dependent data before delete
- Confirm deletion with modal: "Are you sure? This will delete all containers, budgets, and documents."
- Cascade delete or soft delete?
- What happens if deleting active project? → Switch to another project or show empty state

### 5. Edit Project UX Options

**Option A: Inline Editing**
- Click "Edit" → Fields become editable in place
- "Save" commits changes
- "Cancel" reverts changes

**Option B: Modal Dialog**
- Click "Edit" → Opens modal with form
- Form mirrors New Project wizard but for editing
- Better for complex multi-field edits

**Recommendation:** Start with inline for simplicity, can enhance to modal later

---

## Migration Required

### Add template_id to tbl_project

```sql
-- Migration: Add template_id to tbl_project
ALTER TABLE landscape.tbl_project
  ADD COLUMN IF NOT EXISTS template_id BIGINT
  REFERENCES landscape.tbl_property_use_template(template_id);

CREATE INDEX IF NOT EXISTS idx_project_template
  ON landscape.tbl_project(template_id);

COMMENT ON COLUMN landscape.tbl_project.template_id IS
  'References the template used during project creation, represents complexity level';
```

**Also Update:**
- Project creation API to save `template_id`
- NewProjectModal to ensure template is saved with project

---

## Styling Consistency

**Current Dark Theme Palette (from HomeOverview):**
- Background cards: `bg-gray-800 border border-gray-700`
- Inner cards: `bg-gray-900/60 border border-gray-700/60`
- Text primary: `text-white`
- Text secondary: `text-gray-400`, `text-gray-300`
- Accent colors: `text-blue-300`, `text-emerald-300`, `text-sky-300`, `text-amber-300`

**Action Chips Styling:**
- Edit: `bg-blue-600 hover:bg-blue-700 text-white`
- Save: `bg-green-600 hover:bg-green-700 text-white`
- Delete: `bg-red-600 hover:bg-red-700 text-white` with confirmation

**Icons:**
- Using RemixIcon: `<i className="ri-edit-line" />`
- Document: `ri-file-text-line`, `ri-folder-line`
- Progress: `ri-bar-chart-box-line`, `ri-pie-chart-line`

---

## Testing Considerations

**Test Cases:**
1. Project with no template_id (legacy) - Should show fallback
2. Project with no location info - Should show placeholder/empty state
3. Project with 0 documents - Should encourage adding first document
4. Project with 0 assumptions - Should show 0% progress
5. Editing project fields - Should validate required fields
6. Deleting project with data - Should warn about cascade
7. Deleting active project - Should handle active project change

---

## Implementation Priority

### Phase 1 (MVP):
1. ✅ Remove Reports, Export, User from Header
2. ✅ Add location fields to Active Project tile
3. ✅ Add property type display to Active Project tile
4. ✅ Add Edit/Save/Delete action chips
5. ✅ Implement PATCH `/api/projects/{id}` endpoint
6. ✅ Implement inline edit functionality

### Phase 2:
1. ✅ Replace metric cards with Document Summary tile
2. ✅ Implement document count API
3. ✅ Add "Add Document" button → DMS modal integration
4. ✅ Add template_id migration
5. ✅ Store template_id during project creation

### Phase 3:
1. ✅ Implement Assumptions Progress tile
2. ✅ Create assumptions progress calculation API
3. ✅ Design and implement progress visualization
4. ✅ Add category breakdown (if complex)

### Phase 4 (Enhancements):
1. ✅ Implement DELETE `/api/projects/{id}` with cascade handling
2. ✅ Add comprehensive delete confirmation
3. ✅ Improve edit UX (modal vs inline)
4. ✅ Add template name display (complexity level)

---

## Open Questions for Claude

1. **Assumptions Progress Calculation:**
   - Should we calculate based on required fields per template?
   - Or track manually in a completion checklist table?
   - Should different analysis levels unlock progressively?

2. **Visual Design for Progress:**
   - Simple progress bar with percentage?
   - Radial/circular progress indicator?
   - Multi-level breakdown by category?
   - Color-coded (red < 30%, yellow 30-70%, green > 70%)?

3. **Document Tile Actions:**
   - Just "Add Document" button?
   - Also show "View All" → navigates to Documents page?
   - Show recent documents in tile?

4. **Delete Behavior:**
   - Hard delete with CASCADE?
   - Soft delete (set is_active = false)?
   - Archive project instead of delete?

5. **Template Display:**
   - Show full template name ("Standard MPC - 3 Level")?
   - Show short label ("3-Level" or "Standard")?
   - Make template clickable to see what it includes?

6. **Edit Scope:**
   - Which fields should be editable?
   - Should template be changeable after creation?
   - Should property_type be changeable?

---

## Summary for Claude

This is a comprehensive redesign of the Home page to:
1. **Simplify the header** by removing unused Reports, Export, User buttons
2. **Enhance the Active Project tile** to show location, type, complexity with CRUD controls
3. **Replace generic metric cards** with actionable tiles for Documents and Assumptions Progress
4. **Maintain** the existing Phase Snapshot and Use Families breakdown

The goal is to make the Home page a true dashboard that:
- Shows project context at a glance (location, type, complexity)
- Enables quick project editing without navigating away
- Surfaces key actionable metrics (documents to add, assumptions to complete)
- Guides users toward next steps based on project completion status

Please generate a detailed implementation plan with:
- Step-by-step file modifications
- New API endpoints with request/response schemas
- New component structure with props interfaces
- Database migration script
- Assumptions progress calculation algorithm
- Visual design recommendations for progress indicators
- Edge case handling (no template, no data, etc.)
