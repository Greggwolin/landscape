# Budget Category Hierarchy - Implementation Status

**Created**: 2025-11-02
**Status**: Phase 1 & 2 Complete, Phase 3 In Progress

## Overview

Implementation of user-defined 4-level budget category hierarchy system that mirrors the geographic container hierarchy (Project → Area → Phase → Parcel) and follows the multifamily operating expense pattern.

## Requirements

### Complexity Tiers
- **Basic**: Geography only (no categories)
- **Standard**: Geography + 1 category level
- **Detail**: Geography + 4 category levels

### Key Features
1. Template-based initialization per project type
2. Bidirectional creation (Admin Settings ↔ Budget Page)
3. Cascading dropdowns with parent-child validation
4. Auto-rollup parent totals from children
5. Future: Landscaper AI suggestions based on project context

## Implementation Phases

### ✅ Phase 1: Database Schema (COMPLETE)

**Files Created**:
- `/Users/5150east/landscape/db/migrations/014_budget_category_system.up.sql`
- `/Users/5150east/landscape/db/migrations/014_budget_category_system.down.sql`

**Database Objects**:
1. **Table**: `landscape.core_budget_category`
   - Hierarchical taxonomy with 4 levels max
   - Supports both templates (`is_template = true`) and project-specific categories
   - Parent-child relationships via `parent_id` foreign key
   - Validation via triggers to enforce hierarchy consistency

2. **Columns added to** `landscape.core_fin_fact_budget`:
   - `category_l1_id` → Level 1 category FK
   - `category_l2_id` → Level 2 category FK
   - `category_l3_id` → Level 3 category FK
   - `category_l4_id` → Level 4 category FK

3. **View**: `landscape.vw_budget_category_hierarchy`
   - Recursive CTE to build full breadcrumb paths
   - Columns: `category_id`, `path`, `code_path`, `level`, etc.

4. **Triggers**:
   - `trg_validate_budget_category_hierarchy` - Enforces parent-child level consistency
   - `trg_update_budget_category_timestamp` - Auto-updates `updated_at`

**Seed Data**:
- **Land Development Template**: 4-level hierarchy (Acquisition → Due Diligence → Environmental → Phase I ESA)
- **Multifamily Template**: 3-level hierarchy (Revenue → Rental Income → Base Rent)

### ✅ Phase 2: Django Models (COMPLETE)

**Files Created/Modified**:
- `/Users/5150east/landscape/backend/apps/financial/models_budget_categories.py` (NEW)
- `/Users/5150east/landscape/backend/apps/financial/models.py` (MODIFIED)
- `/Users/5150east/landscape/src/types/budget-categories.ts` (NEW)

**Django Model**: `BudgetCategory`
- Maps to `landscape.core_budget_category` table
- Full validation in `clean()` method
- Helper methods:
  - `get_path()` - Breadcrumb string
  - `get_code_path()` - Dot-separated code path
  - `get_descendants()` - All children recursively
  - `get_ancestors()` - All parents up to root
  - `get_siblings()` - Same level, same parent
  - `has_budget_items()` - Check if in use
  - `get_tree_for_project()` - Full tree for project
  - `copy_template_to_project()` - Clone template to project

**BudgetItem Model Updates**:
- Added 4 category foreign keys (`category_l1` through `category_l4`)
- Helper methods:
  - `get_category_path()` - Full breadcrumb
  - `get_category_code_path()` - Code path

**TypeScript Types**:
- `BudgetCategory` - Main interface
- `BudgetCategoryTreeNode` - Enhanced with tree properties
- `BudgetCategoryTemplate` - Template metadata
- `CategoryHierarchyConfig` - Complexity mode configuration
- `BudgetItemWithCategories` - Extended budget item
- `CategorySelectionState` - Cascading dropdown state
- Helper functions:
  - `getVisibleCategoryLevels()` - Filter by mode
  - `buildCategoryPath()` - Construct breadcrumb
  - `validateCategoryHierarchy()` - Validate selection
  - `flattenCategoryTree()` - Tree → flat array
  - `buildCategoryTree()` - Flat array → tree

### ✅ Phase 3: API Endpoints (COMPLETE)

**Files Created**:
- `/Users/5150east/landscape/src/app/api/budget/categories/route.ts`
- `/Users/5150east/landscape/src/app/api/budget/categories/[id]/route.ts`
- `/Users/5150east/landscape/src/app/api/budget/categories/tree/route.ts`
- `/Users/5150east/landscape/src/app/api/budget/category-templates/route.ts`

**Implemented Endpoints**:

1. **GET /api/budget/categories** - List all categories with filters
   - Query params: `project_id`, `template_name`, `project_type_code`, `level`, `parent_id`, `is_template`, `include_inactive`
   - Returns flat array of categories matching filters
   - When `project_id` provided, returns both project-specific + matching templates

2. **POST /api/budget/categories** - Create new category
   - Validates hierarchy rules (level, parent_id constraints)
   - Validates template vs project requirements
   - Checks for unique code per project/level
   - Returns created category

3. **GET /api/budget/categories/[id]** - Get single category
   - Returns full category object by ID

4. **PUT /api/budget/categories/[id]** - Update category
   - Validates parent-child consistency
   - Prevents level changes (immutable)
   - Prevents circular references
   - Checks usage before dangerous updates

5. **DELETE /api/budget/categories/[id]** - Delete category
   - Prevents deletion if category is used by budget items
   - Prevents deletion if category has active children
   - CASCADE deletes inactive children automatically

6. **GET /api/budget/categories/tree** - Hierarchical tree structure
   - Query params: `project_id`, `template_name`, `project_type_code`
   - Returns nested tree with `BudgetCategoryTreeNode` objects
   - Includes level counts and metadata
   - Sorted by sort_order and name

7. **GET /api/budget/category-templates** - List available templates
   - Query params: `project_type_code`
   - Returns template summaries with category counts per level
   - Includes descriptions for each template

8. **POST /api/budget/category-templates** - Apply template to project
   - Request body: `{project_id, template_name, project_type_code, overwrite_existing}`
   - Copies all template categories to project
   - Maintains parent-child relationships
   - Optional overwrite of existing categories
   - Returns count of categories created

**Features**:
- Full CRUD operations with validation
- Hierarchy consistency enforcement
- Usage prevention (can't delete categories in use)
- Template management and application
- Efficient tree building with recursive queries
- Proper error handling and status codes

**Status**: Complete and ready for testing

### ⏳ Phase 4: Admin Settings UI (PENDING)

**Planned Components**:
- New route: `/settings/budget-categories`
- Tree view with drag-drop reordering
- CRUD operations for categories
- Template import/export
- Template application to projects

**Status**: Not yet implemented

### ⏳ Phase 5: Budget Grid Integration (PENDING)

**Planned Changes**:
- `BudgetItemModal`: Add cascading category dropdowns (L1 → L2 → L3 → L4)
- `BudgetDataGrid`: Add category breadcrumb column
- `ColumnDefinitions`: Add category columns with grouping
- `useBudgetData`: Fetch categories on mount
- `ModeSelector`: Add category level selector

**Status**: Not yet implemented

### ⏳ Phase 6: Landscaper AI Integration (FUTURE)

**Planned**:
- Endpoint: `POST /api/landscaper/suggest-budget-hierarchy`
- Prompt engineering: Analyze project type + line items → suggest categories
- UI: "Suggest Categories" button
- Review/approve workflow

**Status**: Future enhancement

## Template Examples

### Land Development Template
```
Acquisition (L1)
├── Due Diligence (L2)
│   ├── Environmental (L3)
│   │   ├── Phase I ESA (L4)
│   │   └── Phase II ESA (L4)
│   └── Geotechnical (L3)
├── Purchase (L2)
Horizontal Development (L1)
├── Engineering (L2)
└── Grading & Utilities (L2)
```

### Multifamily Template
```
Revenue (L1)
├── Rental Income (L2)
│   └── Base Rent (L3)
└── Other Income (L2)
Operating Expenses (L1)
├── Occupancy Costs (L2)
│   ├── Property Taxes (L3)
│   └── Insurance (L3)
├── Utilities (L2)
│   ├── Water & Sewer (L3)
│   └── Gas & Electric (L3)
└── Repairs & Maintenance (L2)
```

## Complexity Mode Behavior

| Mode     | Visible Levels | Allow Creation | Show Breadcrumbs |
|----------|----------------|----------------|------------------|
| Basic    | None (geo only)| No             | No               |
| Standard | L1             | Yes            | No               |
| Detail   | L1, L2, L3, L4 | Yes            | Yes              |

## Database Schema Details

### `core_budget_category` Table Structure
```sql
CREATE TABLE landscape.core_budget_category (
    category_id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT REFERENCES core_budget_category(category_id),
    level INT NOT NULL CHECK (level BETWEEN 1 AND 4),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_id BIGINT REFERENCES tbl_project(project_id),
    is_template BOOLEAN DEFAULT false,
    template_name VARCHAR(100),
    project_type_code VARCHAR(20),
    sort_order INT DEFAULT 0,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),

    UNIQUE (code, project_id, level),
    CHECK (
        (is_template = true AND project_id IS NULL AND template_name IS NOT NULL) OR
        (is_template = false AND project_id IS NOT NULL)
    )
);
```

### Hierarchy Validation Rules
1. Level 1 categories have no parent (`parent_id IS NULL`)
2. Level 2-4 categories must have a parent
3. Parent level = child level - 1 (exactly one level above)
4. Templates: `is_template = true`, `project_id IS NULL`, `template_name IS NOT NULL`
5. Project categories: `is_template = false`, `project_id IS NOT NULL`

## Migration Strategy

### Backward Compatibility
- Existing `category` and `subcategory` string fields remain in `core_fin_fact_budget`
- New `category_l1_id` through `category_l4_id` columns are nullable
- Budget items without categories continue to work
- Migration script can map:
  - `category` string → `category_l1_id` (match by name)
  - `subcategory` string → `category_l2_id` (match by name)

### Gradual Adoption
1. Projects can opt-in to new category system
2. Templates auto-apply on project creation (optional)
3. Existing projects keep old string categories until migrated
4. Admin can trigger bulk migration per project

## Next Steps

1. **Immediate**: Build API endpoints (Phase 3)
2. **Next**: Create Admin Settings UI (Phase 4)
3. **Then**: Integrate into Budget Grid (Phase 5)
4. **Future**: Add Landscaper AI suggestions (Phase 6)

## Testing Checklist

### Database
- [x] Migration runs successfully (up and down)
- [x] Seed data creates template categories
- [x] Triggers enforce hierarchy validation
- [x] View returns correct breadcrumb paths
- [ ] Foreign keys prevent orphaned categories
- [ ] Cascade deletes work correctly

### Django Models
- [x] BudgetCategory model validates correctly
- [x] Parent-child relationships work
- [ ] Helper methods return correct data
- [ ] Template → Project copy works
- [ ] Circular reference prevention

### API (Not Yet Implemented)
- [ ] GET /api/budget/categories returns tree
- [ ] POST creates valid categories
- [ ] PUT updates categories
- [ ] DELETE prevents deletion of categories in use
- [ ] Apply template endpoint works
- [ ] Filters work (project_id, template_name, level)

### UI (Not Yet Implemented)
- [ ] Cascading dropdowns filter correctly
- [ ] Complexity mode shows/hides levels
- [ ] Breadcrumb display works
- [ ] Tree view renders correctly
- [ ] Drag-drop reordering updates sort_order
- [ ] Template selection applies to project

## Files Modified/Created

### Database
- ✅ `db/migrations/014_budget_category_system.up.sql`
- ✅ `db/migrations/014_budget_category_system.down.sql`

### Backend (Django)
- ✅ `backend/apps/financial/models_budget_categories.py` (NEW)
- ✅ `backend/apps/financial/models.py` (MODIFIED - added category FKs)
- ⏳ `backend/apps/financial/serializers.py` (TODO - add serializers)
- ⏳ `backend/apps/financial/views.py` (TODO - add CRUD views)
- ⏳ `backend/apps/financial/urls.py` (TODO - add routes)

### Frontend (Types)
- ✅ `src/types/budget-categories.ts` (NEW)

### Frontend (API Routes)
- ⏳ `src/app/api/budget/categories/route.ts` (TODO)
- ⏳ `src/app/api/budget/categories/[id]/route.ts` (TODO)
- ⏳ `src/app/api/budget/categories/tree/route.ts` (TODO)
- ⏳ `src/app/api/budget/category-templates/route.ts` (TODO)

### Frontend (Components)
- ⏳ `src/app/settings/budget-categories/page.tsx` (TODO)
- ⏳ `src/components/budget/CategoryTreeManager.tsx` (TODO)
- ⏳ `src/components/budget/CategoryCascadingDropdown.tsx` (TODO)
- ⏳ `src/components/budget/BudgetItemModal.tsx` (TODO - add category fields)
- ⏳ `src/components/budget/ColumnDefinitions.tsx` (TODO - add category columns)
- ⏳ `src/hooks/useBudgetCategories.ts` (TODO)

### Documentation
- ✅ `BUDGET_CATEGORY_HIERARCHY_IMPLEMENTATION_STATUS.md` (THIS FILE)

## Notes

- All costs tied to geographic units (container_id) ✅
- User-defined categories at any level ✅
- Template-based initialization ✅
- Hierarchical validation enforced at database level ✅
- Follows multifamily OpEx pattern ✅
- Ready for Landscaper AI integration (future) ✅

---

**Last Updated**: 2025-11-02 - Completed Phases 1 & 2 (Database + Models)
