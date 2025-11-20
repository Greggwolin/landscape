# Categorization Systems Reference

**Purpose:** Comprehensive reference for all categorization mechanisms in the Landscape application. Designed for AI assistants (Claude, ChatGPT) and developers to quickly understand the taxonomy systems, database schema, UI locations, and API endpoints.

**Last Updated:** 2025-11-17

---

## Table of Contents

1. [Quick Reference Table](#quick-reference-table)
2. [Unit Cost Categories](#1-unit-cost-categories)
3. [Budget Categories](#2-budget-categories)
4. [Land Use Taxonomy](#3-land-use-taxonomy)
5. [Project Taxonomy](#4-project-taxonomy)
6. [Benchmark Categories](#5-benchmark-categories)
7. [Property Type Templates](#6-property-type-templates)
8. [Density Classification](#7-density-classification)
9. [Financial Engine Categories](#8-financial-engine-categories)
10. [Lookup Tables](#9-lookup-tables)
11. [Common Patterns](#common-patterns)
12. [Cross-System Integration](#cross-system-integration)

---

## Quick Reference Table

| System | Primary Tables | UI Location | API Endpoints | Pattern |
|--------|---------------|-------------|---------------|---------|
| **Unit Cost Categories** | `core_unit_cost_category`<br>`core_category_tag_library`<br>`core_category_lifecycle_stages`<br>`core_unit_cost_item` | `/admin/preferences` | `/api/unit-costs/categories`<br>`/api/unit-costs/tags` | Hierarchical + Tag-based + Many-to-many lifecycle stages |
| **Budget Categories** | `core_budget_category`<br>`core_category_completion_status` | `/settings/budget-categories` | `/api/budget/categories`<br>`/api/budget/category-templates` | 4-level strict hierarchy with templates |
| **Land Use Taxonomy** | `lu_family`<br>`lu_type`<br>`res_lot_product`<br>`type_lot_product` | `/settings/taxonomy` | `/api/land-use/families`<br>`/api/land-use/types`<br>`/api/landuse/products` | 3-tier cascading with junction table |
| **Project Taxonomy** | `tbl_project` (columns:<br>`analysis_type`<br>`property_subtype`<br>`property_class`<br>`project_type_code`) | Project setup wizard<br>`/projects/new` | `/api/config/property-taxonomy` | 2-3 level cascading dropdown |
| **Benchmark Categories** | `tbl_global_benchmark_registry`<br>`tbl_benchmark_unit_cost`<br>`tbl_benchmark_transaction_cost`<br>`tbl_benchmark_contingency`<br>`core_fin_growth_rate_sets` | `/admin/benchmarks` | `/api/benchmarks`<br>`/api/benchmarks/growth-rates`<br>`/api/benchmarks/absorption-velocity` | Registry + Category-specific detail tables |
| **Property Type Templates** | N/A (TypeScript only) | N/A (code-based) | N/A | TypeScript constants |
| **Density Classification** | `density_classification` | Land use planning | N/A | Lookup table |
| **Financial Engine** | `core_fin_category`<br>`core_fin_category_uom`<br>`core_fin_fact_budget` | Budget grid | Django ViewSets | Star schema with 4-level category FKs |
| **Lookup Tables** | `core_lookup_list`<br>`core_lookup_item`<br>`lu_*` tables | Various | `/api/lookups` | System-wide enumerations |

---

## 1. Unit Cost Categories

**Purpose:** Universal lifecycle-based taxonomy for categorizing construction/development costs across all property types.

### Database Schema

**Primary Table:** `landscape.core_unit_cost_category`

```sql
CREATE TABLE landscape.core_unit_cost_category (
    category_id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES core_unit_cost_category(category_id),
    category_name VARCHAR(255) NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);
```

**Supporting Tables:**

```sql
-- Tag library (13 default tags + user-defined)
CREATE TABLE landscape.core_category_tag_library (
    tag_id SERIAL PRIMARY KEY,
    tag_name VARCHAR(100) NOT NULL UNIQUE,
    tag_type VARCHAR(20) DEFAULT 'user_defined', -- 'system' or 'user_defined'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many pivot: categories × lifecycle stages
CREATE TABLE landscape.core_category_lifecycle_stages (
    category_id INTEGER REFERENCES core_unit_cost_category(category_id),
    lifecycle_stage VARCHAR(50) NOT NULL,
    PRIMARY KEY (category_id, lifecycle_stage)
);

-- Cost line items within categories
CREATE TABLE landscape.core_unit_cost_item (
    item_id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES core_unit_cost_category(category_id),
    item_name VARCHAR(200) NOT NULL,
    default_uom_code VARCHAR(10),
    quantity NUMERIC(12,2),
    typical_mid_value NUMERIC(12,2),
    market_geography VARCHAR(100),
    source VARCHAR(200),
    as_of_date DATE,
    project_type_code VARCHAR(50), -- LAND, MF, OFF, RET, IND, HTL, MXU
    usage_count INTEGER DEFAULT 0,
    last_used_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_from_project_id BIGINT,
    created_from_ai BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Links items to global benchmarks
CREATE TABLE landscape.core_item_benchmark_link (
    item_id INTEGER REFERENCES core_unit_cost_item(item_id),
    benchmark_id BIGINT REFERENCES tbl_global_benchmark_registry(benchmark_id),
    PRIMARY KEY (item_id, benchmark_id)
);
```

### Lifecycle Stages (6 Universal Stages)

1. **Acquisition** - Land purchase, due diligence, closing costs
2. **Planning & Engineering** - Studies, planning, design, permits, engineering
3. **Development** - Construction, site work, infrastructure
4. **Operations** - Property management, maintenance, utilities
5. **Disposition** - Sale prep, marketing, transaction costs
6. **Financing** - Loan costs, interest, fees

### Default System Tags (13)

- **Cost Nature:** Hard, Soft
- **Accounting:** OpEx, CapEx
- **Financial:** Revenue, Deposits
- **Capital Stack:** Debt, Equity
- **Timing:** One-Time, Recurring
- **Planning:** Contingency, Reserves

### Django Models

**File:** `/Users/5150east/landscape/backend/apps/financial/models_benchmarks.py`

```python
class UnitCostCategory(models.Model):
    category_id = models.AutoField(primary_key=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    category_name = models.CharField(max_length=255)
    tags = models.JSONField(default=list)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.TextField(null=True, blank=True)
    updated_by = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'core_unit_cost_category'
        managed = False

class CategoryTagLibrary(models.Model):
    tag_id = models.AutoField(primary_key=True)
    tag_name = models.CharField(max_length=100, unique=True)
    tag_type = models.CharField(max_length=20, default='user_defined')
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_category_tag_library'
        managed = False

class CategoryLifecycleStage(models.Model):
    category = models.ForeignKey(UnitCostCategory, on_delete=models.CASCADE)
    lifecycle_stage = models.CharField(max_length=50)

    class Meta:
        db_table = 'core_category_lifecycle_stages'
        managed = False
        unique_together = ('category', 'lifecycle_stage')

class UnitCostItem(models.Model):
    item_id = models.AutoField(primary_key=True)
    category = models.ForeignKey(UnitCostCategory, on_delete=models.CASCADE)
    item_name = models.CharField(max_length=200)
    default_uom_code = models.CharField(max_length=10, null=True)
    # ... (additional fields as per schema)

    class Meta:
        db_table = 'core_unit_cost_item'
        managed = False
```

### TypeScript Types

**File:** `/Users/5150east/landscape/src/types/benchmarks.ts`

```typescript
export type LifecycleStage =
  | 'Acquisition'
  | 'Development'
  | 'Operations'
  | 'Disposition'
  | 'Financing';

export interface UnitCostCategory {
  category_id: number;
  parent_id?: number;
  category_name: string;
  tags: string[];
  lifecycle_stages: LifecycleStage[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryTag {
  tag_id: number;
  tag_name: string;
  tag_type: 'system' | 'user_defined';
  description?: string;
  is_active: boolean;
}
```

### UI Components

**Location:** `/Users/5150east/landscape/src/app/admin/preferences/components/`

**Main Components:**
- `UnitCostCategoryManager.tsx` - Main orchestrator with 3-column layout
- `LifecycleStageFilter.tsx` - Multi-select checkboxes for 5 lifecycle stages
- `CategoryTree.tsx` - Hierarchical category list
- `CategoryTreeItem.tsx` - Recursive tree node component
- `CategoryDetailPanel.tsx` - View/Edit mode with tag management
- `AddCategoryModal.tsx` - Create new category modal
- `CreateTagModal.tsx` - Create custom tags
- `DeleteConfirmationModal.tsx` - Soft delete with impact analysis

**Page:** `/Users/5150east/landscape/src/app/admin/preferences/page.tsx`

**Layout:** 3-column responsive design
1. **Left Column:** Lifecycle stage filter + category tree
2. **Middle Column:** Category details panel (view/edit mode)
3. **Right Column:** Tag management + lifecycle stage assignment

### API Endpoints

**Categories:**
- `GET /api/unit-costs/categories` - List categories
  - Query params: `?lifecycle_stage=Development&tag=Hard&parent_id=5`
- `POST /api/unit-costs/categories` - Create category
- `GET /api/unit-costs/categories/[id]` - Get single category
- `PUT /api/unit-costs/categories/[id]` - Update category
- `DELETE /api/unit-costs/categories/[id]` - Soft delete category
- `GET /api/unit-costs/categories/[id]?action=deletion-impact` - Impact analysis

**Tags:**
- `GET /api/unit-costs/tags` - List all tags
- `POST /api/unit-costs/tags` - Create new tag
- `POST /api/unit-costs/categories/[id]/add-tag` - Add tag to category
- `POST /api/unit-costs/categories/[id]/remove-tag` - Remove tag from category

**Django ViewSet:** `backend/apps/financial/views_unit_costs.py`
- `UnitCostCategoryViewSet` - Full CRUD with custom actions

### Key Features

- **Flexible Hierarchy:** Parent-child relationships with unlimited depth
- **Tag-Based Categorization:** Flexible multi-tag assignment per category
- **Many-to-Many Lifecycle Stages:** Categories can belong to multiple lifecycle stages
- **Soft Delete:** `is_active` flag preserves referential integrity
- **Impact Analysis:** Check dependencies before deletion
- **Universal Taxonomy:** Works across all property types (LAND, MF, OFF, RET, IND, HTL, MXU)

### Related Documentation

- [docs/CATEGORY_TAXONOMY_UI_IMPLEMENTATION.md](CATEGORY_TAXONOMY_UI_IMPLEMENTATION.md)
- [docs/CATEGORY_LIFECYCLE_MIGRATION_GUIDE.md](CATEGORY_LIFECYCLE_MIGRATION_GUIDE.md)

---

## 2. Budget Categories

**Purpose:** 4-level hierarchical taxonomy for organizing project budgets with template support.

### Database Schema

**Primary Table:** `landscape.core_budget_category`

```sql
CREATE TABLE landscape.core_budget_category (
    category_id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES core_budget_category(category_id),
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Scope
    is_template BOOLEAN DEFAULT false,
    template_name VARCHAR(100),
    project_type_code VARCHAR(50), -- LAND, MF, OFF, RET, IND, HTL, MXU
    project_id BIGINT,

    -- Display
    sort_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    color VARCHAR(50),

    -- Completion tracking
    is_incomplete BOOLEAN DEFAULT false,
    created_from VARCHAR(20), -- 'quick_add', 'full_form', 'import'
    reminder_dismissed_at TIMESTAMP,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,

    UNIQUE(project_id, code)
);

CREATE INDEX idx_budget_category_parent ON core_budget_category(parent_id);
CREATE INDEX idx_budget_category_level ON core_budget_category(level);
CREATE INDEX idx_budget_category_project ON core_budget_category(project_id);
```

**Supporting Table:** `landscape.core_category_completion_status`

```sql
CREATE TABLE landscape.core_category_completion_status (
    category_id INTEGER PRIMARY KEY REFERENCES core_budget_category(category_id),
    missing_fields JSONB, -- ["description", "icon", "color"]
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Hierarchy Levels

**Level 1 (Top):** Major budget divisions
- Revenue
- Operating Expenses
- Acquisition Costs
- Development Costs
- Financing Costs

**Level 2:** Departments/Categories
- Engineering
- Legal & Professional
- Marketing & Sales

**Level 3:** Sub-categories
- Civil Engineering
- Structural Engineering
- Geotechnical

**Level 4 (Most Granular):** Line items
- Grading Plans
- Utility Plans
- Storm Drainage Plans

### Django Models

**File:** `/Users/5150east/landscape/backend/apps/financial/models_budget_categories.py`

```python
class BudgetCategory(models.Model):
    category_id = models.AutoField(primary_key=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE)
    level = models.IntegerField()
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)

    is_template = models.BooleanField(default=False)
    template_name = models.CharField(max_length=100, null=True, blank=True)
    project_type_code = models.CharField(max_length=50, null=True, blank=True)
    project_id = models.BigIntegerField(null=True, blank=True)

    sort_order = models.IntegerField(default=0)
    icon = models.CharField(max_length=50, null=True, blank=True)
    color = models.CharField(max_length=50, null=True, blank=True)

    is_incomplete = models.BooleanField(default=False)
    created_from = models.CharField(max_length=20, null=True, blank=True)
    reminder_dismissed_at = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_budget_category'
        managed = False
        unique_together = ('project_id', 'code')

class CategoryCompletionStatus(models.Model):
    category = models.OneToOneField(BudgetCategory, primary_key=True, on_delete=models.CASCADE)
    missing_fields = models.JSONField(null=True)
    usage_count = models.IntegerField(default=0)
    last_used_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_category_completion_status'
        managed = False
```

### TypeScript Types

**File:** `/Users/5150east/landscape/src/types/budget-categories.ts`

```typescript
export type CategoryLevel = 1 | 2 | 3 | 4;

export interface BudgetCategory {
  category_id: number;
  parent_id?: number;
  level: CategoryLevel;
  code: string;
  name: string;
  description?: string;

  is_template: boolean;
  template_name?: string;
  project_type_code?: string;
  project_id?: number;

  sort_order: number;
  icon?: string;
  color?: string;

  is_incomplete: boolean;
  created_from?: 'quick_add' | 'full_form' | 'import';
  reminder_dismissed_at?: string;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategoryTreeNode extends BudgetCategory {
  children: BudgetCategoryTreeNode[];
}

export interface QuickAddCategoryRequest {
  name: string;
  parent_id: number;
  project_id: number;
}

export interface IncompleteCategoryStatus {
  category_id: number;
  category_name: string;
  missing_fields: string[];
  usage_count: number;
  last_used_at?: string;
}
```

### UI Components

**Page:** `/Users/5150east/landscape/src/app/settings/budget-categories/page.tsx`

**Features:**
- Template browser (by project type)
- Hierarchical tree view (4 levels)
- Quick-add workflow
- Incomplete category reminders
- Copy template to project
- Custom category creation

### API Endpoints

**Categories:**
- `GET /api/budget/categories` - List categories
  - Query params: `?project_id=1&level=2&is_template=true&template_name=Land Development`
- `POST /api/budget/categories` - Create category
- `GET /api/budget/categories/[id]` - Get single category
- `PUT /api/budget/categories/[id]` - Update category
- `DELETE /api/budget/categories/[id]` - Soft delete category
- `GET /api/budget/categories/tree` - Get hierarchical tree structure

**Templates:**
- `GET /api/budget/category-templates` - List all templates
  - Query params: `?project_type_code=LAND`
- `POST /api/budget/category-templates` - Create template
- `POST /api/budget/category-templates/copy` - Copy template to project

**Completion Tracking:**
- `GET /api/budget/categories/incomplete` - List incomplete categories with usage stats
- `POST /api/budget/categories/[id]/dismiss-reminder` - Dismiss completion reminder
- `POST /api/budget/categories/[id]/mark-complete` - Complete missing fields

**Django ViewSet:** `backend/apps/financial/views_budget_categories.py`
- `BudgetCategoryViewSet` - Full CRUD with custom actions

### Key Features

- **Strict 4-Level Hierarchy:** Enforced parent-child relationships
- **Template System:** Pre-defined category trees by project type
- **Quick-Add Workflow:** Create categories with minimal fields, complete later
- **Completion Tracking:** Landscaper reminders for incomplete categories with usage stats
- **Project vs Global:** Support for both global templates and project-specific categories
- **Soft Delete:** Preserves referential integrity

### Related Documentation

- [docs/BUDGET_QUICK_ADD_CATEGORY_IMPLEMENTATION.md](BUDGET_QUICK_ADD_CATEGORY_IMPLEMENTATION.md)

---

## 3. Land Use Taxonomy

**Purpose:** 3-tier classification system for residential land use: Family → Type → Product (lot sizes/configurations).

### Database Schema

**Tier 1: Families** - `landscape.lu_family`

```sql
CREATE TABLE landscape.lu_family (
    family_id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Examples:**
- RES (Residential)
- COM (Commercial)
- IND (Industrial)

**Tier 2: Types** - `landscape.lu_type`

```sql
CREATE TABLE landscape.lu_type (
    type_id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES lu_family(family_id),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    ord INTEGER DEFAULT 0, -- Sort order
    active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lu_type_family ON lu_type(family_id);
```

**Examples:**
- SFD (Single Family Detached) - under RES
- MDR (Medium Density Residential) - under RES
- OFF (Office) - under COM
- RET (Retail) - under COM

**Tier 3: Products** - `landscape.res_lot_product`

```sql
CREATE TABLE landscape.res_lot_product (
    product_id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    lot_w_ft NUMERIC(8,2), -- Lot width in feet
    lot_d_ft NUMERIC(8,2), -- Lot depth in feet
    lot_area_sf NUMERIC(10,2) GENERATED ALWAYS AS (lot_w_ft * lot_d_ft) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Examples:**
- 50x120 (6,000 SF lot)
- 60x130 (7,800 SF lot)
- 70x140 (9,800 SF lot)

**Junction Table:** `landscape.type_lot_product` (Many-to-Many)

```sql
CREATE TABLE landscape.type_lot_product (
    type_id INTEGER NOT NULL REFERENCES lu_type(type_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES res_lot_product(product_id) ON DELETE CASCADE,
    PRIMARY KEY (type_id, product_id)
);

CREATE INDEX idx_type_lot_product_type ON type_lot_product(type_id);
CREATE INDEX idx_type_lot_product_product ON type_lot_product(product_id);
```

### Django Models

**File:** `/Users/5150east/landscape/backend/apps/landuse/models.py`

```python
class Family(models.Model):
    family_id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    active = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lu_family'
        managed = False

class Type(models.Model):
    type_id = models.AutoField(primary_key=True)
    family = models.ForeignKey(Family, on_delete=models.CASCADE)
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    ord = models.IntegerField(default=0)
    active = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lu_type'
        managed = False

class LotProduct(models.Model):
    product_id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=50, unique=True)
    lot_w_ft = models.DecimalField(max_digits=8, decimal_places=2, null=True)
    lot_d_ft = models.DecimalField(max_digits=8, decimal_places=2, null=True)
    lot_area_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    types = models.ManyToManyField(Type, through='TypeLotProduct')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'res_lot_product'
        managed = False

class TypeLotProduct(models.Model):
    type = models.ForeignKey(Type, on_delete=models.CASCADE)
    product = models.ForeignKey(LotProduct, on_delete=models.CASCADE)

    class Meta:
        db_table = 'type_lot_product'
        managed = False
        unique_together = ('type', 'product')
```

### UI Components

**Location:** `/Users/5150east/landscape/src/components/taxonomy/`

**Components:**
- `FamilyTree.tsx` - Family list (left column)
- `FamilyDetails.tsx` - Type list for selected family (middle column)
- `ProductsList.tsx` - Product list for selected type (right column)

**Page:** `/Users/5150east/landscape/src/app/settings/taxonomy/page.tsx`

**Layout:** 3-column taxonomy manager
1. **Left:** Family tree with add/edit/delete
2. **Middle:** Types under selected family
3. **Right:** Products linked to selected type

### API Endpoints

**Families:**
- `GET /api/land-use/families` - List all families
- `POST /api/land-use/families` - Create family
  ```json
  {
    "code": "RES",
    "name": "Residential",
    "notes": "Single family and multifamily residential"
  }
  ```
- `GET /api/land-use/families/[id]` - Get single family
- `PUT /api/land-use/families/[id]` - Update family
- `DELETE /api/land-use/families/[id]` - Soft delete family

**Types:**
- `GET /api/land-use/types` - List types (optional `?family_id=1`)
- `POST /api/land-use/types` - Create type
  ```json
  {
    "family_id": 1,
    "code": "SFD",
    "name": "Single Family Detached",
    "ord": 1
  }
  ```
- `GET /api/land-use/types/[id]` - Get single type
- `PUT /api/land-use/types/[id]` - Update type
- `DELETE /api/land-use/types/[id]` - Soft delete type
- `GET /api/land-use/types/[id]/products` - Get products linked to type
- `POST /api/land-use/types/[id]/products` - Link product to type
  ```json
  {
    "product_id": 5
  }
  ```
- `DELETE /api/land-use/types/[id]/products/[productId]` - Unlink product from type

**Products:**
- `GET /api/landuse/products` - List products (optional `?type_id=1`)
- `POST /api/landuse/products` - Create product
  ```json
  {
    "code": "50x120",
    "lot_w_ft": 50,
    "lot_d_ft": 120
  }
  ```
- `GET /api/landuse/products/[id]` - Get single product
- `PUT /api/landuse/products/[id]` - Update product
- `DELETE /api/landuse/products/[id]` - Hard delete product (validates no references)

### Key Features

- **3-Tier Cascading:** Family → Type → Product selection
- **Auto-Calculated Area:** `lot_area_sf = lot_w_ft × lot_d_ft` (database trigger)
- **Soft Delete:** Families and Types use `active` flag
- **Hard Delete:** Products (validates no inventory references)
- **Many-to-Many:** Types can have multiple products, products can belong to multiple types
- **Code Auto-Uppercase:** All code fields automatically uppercased on save

### Related Documentation

- [docs/TAXONOMY_CRUD_API_REFERENCE.md](TAXONOMY_CRUD_API_REFERENCE.md)
- [docs/02-features/land-use/land-use-taxonomy-implementation.md](02-features/land-use/land-use-taxonomy-implementation.md)

---

## 4. Project Taxonomy

**Purpose:** 2-3 level cascading classification for projects: Analysis Type → Property Subtype → Property Class (optional).

### Database Schema

**Table:** `landscape.tbl_project`

**Taxonomy Columns:**
```sql
ALTER TABLE landscape.tbl_project ADD COLUMN analysis_type VARCHAR(50);
ALTER TABLE landscape.tbl_project ADD COLUMN property_subtype VARCHAR(100);
ALTER TABLE landscape.tbl_project ADD COLUMN property_class VARCHAR(50);
ALTER TABLE landscape.tbl_project ADD COLUMN project_type_code VARCHAR(50);

-- Deprecated fields (preserved for backwards compatibility)
ALTER TABLE landscape.tbl_project ADD COLUMN development_type_deprecated VARCHAR(50);
ALTER TABLE landscape.tbl_project ADD COLUMN property_type_code_deprecated VARCHAR(50);
```

**Migration:** `backend/apps/projects/migrations/0013_project_taxonomy_restructure.py`

### Taxonomy Structure

**Level 1: Analysis Type** (Top level)
- `Land Development` - Developer perspective (land entitlement, infrastructure, lot sales)
- `Income Property` - Enterprise perspective (income-producing assets)

**Level 2: Property Subtype** (Cascades from Analysis Type)

**Land Development Subtypes (6):**
1. Master Planned Community
2. Subdivision
3. Multifamily Development
4. Commercial Development
5. Industrial Development
6. Mixed-Use Development

**Income Property Subtypes (24, grouped by category):**

**Multifamily (6):**
1. Garden-Style Apartment
2. Mid-Rise Apartment
3. High-Rise Apartment
4. Student Housing
5. Senior Housing
6. Affordable Housing

**Office (6):**
7. Class A Office
8. Class B Office
9. Class C Office
10. Medical Office
11. Flex/R&D
12. Coworking

**Retail (6):**
13. Neighborhood Shopping Center
14. Community Shopping Center
15. Power Center
16. Lifestyle Center
17. Strip Center
18. Regional Mall

**Industrial (5):**
19. Warehouse/Distribution
20. Manufacturing
21. Flex Space
22. Cold Storage
23. Self-Storage

**Other (4):**
24. Hotel
25. Mixed-Use (Office + Retail)
26. Mixed-Use (Office + Multifamily)
27. Mixed-Use (Retail + Multifamily)

**Level 3: Property Class** (Income Property only, optional)
- Class A - Premium quality, newest, highest rents
- Class B - Good quality, well-maintained, moderate rents
- Class C - Older, functional, below-average rents
- Class D - Significant deferred maintenance, lowest rents

### Project Type Codes (Standardized)

Used across the application for filtering and categorization:

- `LAND` - Land Development
- `MF` - Multifamily
- `OFF` - Office
- `RET` - Retail
- `IND` - Industrial
- `HTL` - Hotel
- `MXU` - Mixed-Use

### TypeScript Types

**File:** `/Users/5150east/landscape/src/types/project-taxonomy.ts` (305 lines)

```typescript
export type AnalysisType = 'Land Development' | 'Income Property';

export type LandDevelopmentSubtype =
  | 'Master Planned Community'
  | 'Subdivision'
  | 'Multifamily Development'
  | 'Commercial Development'
  | 'Industrial Development'
  | 'Mixed-Use Development';

export type IncomePropertySubtype =
  // Multifamily
  | 'Garden-Style Apartment'
  | 'Mid-Rise Apartment'
  | 'High-Rise Apartment'
  | 'Student Housing'
  | 'Senior Housing'
  | 'Affordable Housing'
  // Office
  | 'Class A Office'
  | 'Class B Office'
  | 'Class C Office'
  | 'Medical Office'
  | 'Flex/R&D'
  | 'Coworking'
  // Retail
  | 'Neighborhood Shopping Center'
  | 'Community Shopping Center'
  | 'Power Center'
  | 'Lifestyle Center'
  | 'Strip Center'
  | 'Regional Mall'
  // Industrial
  | 'Warehouse/Distribution'
  | 'Manufacturing'
  | 'Flex Space'
  | 'Cold Storage'
  | 'Self-Storage'
  // Other
  | 'Hotel'
  | 'Mixed-Use (Office + Retail)'
  | 'Mixed-Use (Office + Multifamily)'
  | 'Mixed-Use (Retail + Multifamily)';

export type PropertySubtype = LandDevelopmentSubtype | IncomePropertySubtype;

export type PropertyClass = 'Class A' | 'Class B' | 'Class C' | 'Class D';

export type ProjectTypeCode = 'LAND' | 'MF' | 'OFF' | 'RET' | 'IND' | 'HTL' | 'MXU';

// Grouped for UI display
export const INCOME_PROPERTY_SUBTYPES_GROUPED = {
  Multifamily: [
    'Garden-Style Apartment',
    'Mid-Rise Apartment',
    'High-Rise Apartment',
    'Student Housing',
    'Senior Housing',
    'Affordable Housing',
  ],
  Office: [
    'Class A Office',
    'Class B Office',
    'Class C Office',
    'Medical Office',
    'Flex/R&D',
    'Coworking',
  ],
  Retail: [
    'Neighborhood Shopping Center',
    'Community Shopping Center',
    'Power Center',
    'Lifestyle Center',
    'Strip Center',
    'Regional Mall',
  ],
  Industrial: [
    'Warehouse/Distribution',
    'Manufacturing',
    'Flex Space',
    'Cold Storage',
    'Self-Storage',
  ],
  Other: [
    'Hotel',
    'Mixed-Use (Office + Retail)',
    'Mixed-Use (Office + Multifamily)',
    'Mixed-Use (Retail + Multifamily)',
  ],
} as const;

// Helper functions
export function getSubtypesForAnalysisType(analysisType: AnalysisType): PropertySubtype[] {
  if (analysisType === 'Land Development') {
    return LAND_DEVELOPMENT_SUBTYPES;
  } else {
    return Object.values(INCOME_PROPERTY_SUBTYPES_GROUPED).flat();
  }
}

export function showsPropertyClass(analysisType: AnalysisType): boolean {
  return analysisType === 'Income Property';
}

export function isValidSubtypeForAnalysisType(
  subtype: PropertySubtype,
  analysisType: AnalysisType
): boolean {
  const validSubtypes = getSubtypesForAnalysisType(analysisType);
  return validSubtypes.includes(subtype);
}
```

### UI Components

**New Project Wizard:**
- `/Users/5150east/landscape/src/app/components/new-project/AssetTypeSection.tsx`
- `/Users/5150east/landscape/src/app/components/new-project/ConfigureSection.tsx`

**Cascading Dropdown Flow:**
1. User selects **Analysis Type** (Land Development or Income Property)
2. **Property Subtype** dropdown populates with relevant options
3. If Income Property, **Property Class** field appears (optional)

### API Endpoints

- `GET /api/config/property-taxonomy` - Full taxonomy structure
  ```json
  {
    "Land Development": [
      "Master Planned Community",
      "Subdivision",
      "Multifamily Development",
      "Commercial Development",
      "Industrial Development",
      "Mixed-Use Development"
    ],
    "Income Property": {
      "Multifamily": ["Garden-Style Apartment", "..."],
      "Office": ["Class A Office", "..."],
      "Retail": ["..."],
      "Industrial": ["..."],
      "Other": ["Hotel", "..."]
    },
    "propertyClasses": ["Class A", "Class B", "Class C", "Class D"]
  }
  ```
- `GET /api/config/property-taxonomy?analysis_type=Land Development` - Filtered subtypes

### Key Features

- **2-3 Level Cascading:** Analysis Type → Property Subtype → Property Class (conditional)
- **Grouped Subtypes:** Income Property subtypes organized by category for better UI
- **ARGUS Alignment:** Matches Developer (land) vs Enterprise (income) product separation
- **Type-Safe Validation:** TypeScript ensures valid combinations
- **Backwards Compatible:** Deprecated fields preserved with `_deprecated` suffix
- **Extensible:** Easy to add new subtypes without changing structure

### Related Documentation

- [docs/PROJECT_TAXONOMY_RESTRUCTURE_IMPLEMENTATION.md](PROJECT_TAXONOMY_RESTRUCTURE_IMPLEMENTATION.md)
- [docs/data_validation_lists_reference.md](data_validation_lists_reference.md)

---

## 5. Benchmark Categories

**Purpose:** Global library of reusable benchmarks across 12 category types with AI-assisted extraction.

### Database Schema

**Master Registry:** `landscape.tbl_global_benchmark_registry`

```sql
CREATE TABLE landscape.tbl_global_benchmark_registry (
    benchmark_id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- growth_rate, transaction_cost, unit_cost, etc.
    subcategory VARCHAR(100),
    benchmark_name VARCHAR(200) NOT NULL,
    description TEXT,
    market_geography VARCHAR(100),
    property_type VARCHAR(50), -- LAND, MF, OFF, RET, IND, HTL, MXU
    source_type VARCHAR(50), -- user_input, document_extraction, project_data, system_default
    source_document_id TEXT,
    source_project_id BIGINT,
    confidence_level VARCHAR(20), -- high, medium, low
    usage_count INTEGER DEFAULT 0,
    as_of_date DATE,
    cpi_index_value NUMERIC(10,4),
    context_metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

CREATE INDEX idx_benchmark_registry_category ON tbl_global_benchmark_registry(category);
CREATE INDEX idx_benchmark_registry_user ON tbl_global_benchmark_registry(user_id);
CREATE INDEX idx_benchmark_registry_geography ON tbl_global_benchmark_registry(market_geography);
```

### Benchmark Categories (12)

1. **growth_rate** - Multi-step inflation/escalation rates
2. **transaction_cost** - Closing, title, legal, due diligence
3. **unit_cost** - Construction/development costs per UOM
4. **absorption** - Sales velocity benchmarks
5. **contingency** - Reserve percentage standards
6. **market_timing** - Process duration benchmarks
7. **land_use_pricing** - Lot pricing by product type
8. **commission** - Sales commission structures
9. **op_cost** - Operating expense benchmarks
10. **income** - Revenue/income benchmarks
11. **capital_stack** - Equity/debt mix standards
12. **debt_standard** - Loan terms and rates

### Category-Specific Detail Tables

**Unit Cost Benchmarks:** `landscape.tbl_benchmark_unit_cost`

```sql
CREATE TABLE landscape.tbl_benchmark_unit_cost (
    unit_cost_id BIGSERIAL PRIMARY KEY,
    benchmark_id BIGINT REFERENCES tbl_global_benchmark_registry(benchmark_id) ON DELETE CASCADE,
    value NUMERIC(12,2) NOT NULL,
    uom_code VARCHAR(20) NOT NULL, -- $/SF, $/FF, $/LOT, $/ACRE, $/CY
    uom_alt_code VARCHAR(20),
    low_value NUMERIC(12,2),
    high_value NUMERIC(12,2),
    cost_phase VARCHAR(50), -- planning, site_work, utilities, paving, landscaping
    work_type VARCHAR(100), -- grading, underground_utilities, asphalt_paving
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Transaction Cost Benchmarks:** `landscape.tbl_benchmark_transaction_cost`

```sql
CREATE TABLE landscape.tbl_benchmark_transaction_cost (
    transaction_cost_id BIGSERIAL PRIMARY KEY,
    benchmark_id BIGINT REFERENCES tbl_global_benchmark_registry(benchmark_id) ON DELETE CASCADE,
    cost_type VARCHAR(50) NOT NULL, -- closing_costs, title_insurance, legal, due_diligence, broker_fee
    value NUMERIC(8,4) NOT NULL, -- Percentage or flat amount
    value_type VARCHAR(20) NOT NULL, -- percentage, flat_fee, per_unit
    basis VARCHAR(50), -- purchase_price, sale_price, loan_amount
    deal_size_min NUMERIC(12,2),
    deal_size_max NUMERIC(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Contingency Benchmarks:** `landscape.tbl_benchmark_contingency`

```sql
CREATE TABLE landscape.tbl_benchmark_contingency (
    benchmark_id INTEGER PRIMARY KEY REFERENCES tbl_global_benchmark_registry(benchmark_id) ON DELETE CASCADE,
    percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Growth Rate Benchmarks:** `landscape.core_fin_growth_rate_sets` & `landscape.core_fin_growth_rate_steps`

```sql
CREATE TABLE landscape.core_fin_growth_rate_sets (
    set_id SERIAL PRIMARY KEY,
    project_id BIGINT,
    card_type VARCHAR(50), -- cost, revenue, absorption
    set_name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_global BOOLEAN DEFAULT false,
    market_geography VARCHAR(100),
    benchmark_id BIGINT REFERENCES tbl_global_benchmark_registry(benchmark_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE landscape.core_fin_growth_rate_steps (
    step_id SERIAL PRIMARY KEY,
    set_id INTEGER REFERENCES core_fin_growth_rate_sets(set_id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    from_period INTEGER NOT NULL,
    periods INTEGER, -- NULL means "E" (end)
    rate NUMERIC(5,2) NOT NULL,
    thru_period INTEGER, -- Calculated field
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Absorption Velocity Benchmarks:** `landscape.tbl_benchmark_absorption_velocity`

```sql
CREATE TABLE landscape.tbl_benchmark_absorption_velocity (
    benchmark_velocity_id SERIAL PRIMARY KEY,
    classification_code VARCHAR(50) NOT NULL UNIQUE,
    classification_display_name VARCHAR(100) NOT NULL,
    units_per_month NUMERIC(6,2) NOT NULL,
    builder_inventory_target_min_months INTEGER,
    builder_inventory_target_max_months INTEGER,
    market_geography VARCHAR(100),
    data_source VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Market Timing Benchmarks:** `landscape.tbl_benchmark_market_timing`

```sql
CREATE TABLE landscape.tbl_benchmark_market_timing (
    benchmark_timing_id SERIAL PRIMARY KEY,
    process_name VARCHAR(100) NOT NULL UNIQUE,
    process_display_name VARCHAR(100) NOT NULL,
    duration_months INTEGER NOT NULL,
    dependency_trigger VARCHAR(100),
    dependency_display_name VARCHAR(100),
    offset_months INTEGER DEFAULT 0,
    market_geography VARCHAR(100),
    data_source VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**AI Suggestion Queue:** `landscape.tbl_benchmark_ai_suggestions`

```sql
CREATE TABLE landscape.tbl_benchmark_ai_suggestions (
    suggestion_id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    project_id BIGINT,
    extraction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(100),
    suggested_name VARCHAR(200) NOT NULL,
    suggested_value NUMERIC(12,4),
    suggested_uom VARCHAR(20),
    market_geography VARCHAR(100),
    property_type VARCHAR(50),
    confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
    extraction_context JSONB, -- {page_num, line_item, quantities, related_items}
    existing_benchmark_id BIGINT REFERENCES tbl_global_benchmark_registry(benchmark_id),
    variance_percentage NUMERIC(6,2),
    inflation_adjusted_comparison JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, modified
    user_response JSONB, -- {action, notes, adjusted_value}
    reviewed_at TIMESTAMP,
    reviewed_by TEXT,
    created_benchmark_id BIGINT REFERENCES tbl_global_benchmark_registry(benchmark_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_suggestions_user ON tbl_benchmark_ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_status ON tbl_benchmark_ai_suggestions(status);
CREATE INDEX idx_ai_suggestions_document ON tbl_benchmark_ai_suggestions(document_id);
```

### Django Models

**File:** `/Users/5150east/landscape/backend/apps/financial/models_benchmarks.py`

```python
class GlobalBenchmarkRegistry(models.Model):
    benchmark_id = models.BigAutoField(primary_key=True)
    user_id = models.TextField()
    category = models.CharField(max_length=50)
    subcategory = models.CharField(max_length=100, null=True)
    benchmark_name = models.CharField(max_length=200)
    description = models.TextField(null=True)
    market_geography = models.CharField(max_length=100, null=True)
    property_type = models.CharField(max_length=50, null=True)
    source_type = models.CharField(max_length=50, null=True)
    confidence_level = models.CharField(max_length=20, null=True)
    usage_count = models.IntegerField(default=0)
    as_of_date = models.DateField(null=True)
    context_metadata = models.JSONField(null=True)
    is_active = models.BooleanField(default=True)
    is_global = models.BooleanField(default=False)
    # ... timestamps

    class Meta:
        db_table = 'tbl_global_benchmark_registry'
        managed = False

class BenchmarkUnitCost(models.Model):
    unit_cost_id = models.BigAutoField(primary_key=True)
    benchmark = models.ForeignKey(GlobalBenchmarkRegistry, on_delete=models.CASCADE)
    value = models.DecimalField(max_digits=12, decimal_places=2)
    uom_code = models.CharField(max_length=20)
    # ... additional fields

    class Meta:
        db_table = 'tbl_benchmark_unit_cost'
        managed = False

class BenchmarkTransactionCost(models.Model):
    transaction_cost_id = models.BigAutoField(primary_key=True)
    benchmark = models.ForeignKey(GlobalBenchmarkRegistry, on_delete=models.CASCADE)
    cost_type = models.CharField(max_length=50)
    value = models.DecimalField(max_digits=8, decimal_places=4)
    value_type = models.CharField(max_length=20)
    # ... additional fields

    class Meta:
        db_table = 'tbl_benchmark_transaction_cost'
        managed = False

class BenchmarkAISuggestion(models.Model):
    suggestion_id = models.BigAutoField(primary_key=True)
    user_id = models.TextField()
    document_id = models.TextField()
    category = models.CharField(max_length=50)
    suggested_name = models.CharField(max_length=200)
    suggested_value = models.DecimalField(max_digits=12, decimal_places=4, null=True)
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2, null=True)
    status = models.CharField(max_length=20, default='pending')
    # ... additional fields

    class Meta:
        db_table = 'tbl_benchmark_ai_suggestions'
        managed = False
```

### UI Components

**Page:** `/Users/5150east/landscape/src/app/admin/benchmarks/page.tsx`

**Sections:**
- Growth Rates - Multi-step rate sets
- Unit Costs - Construction costs by UOM
- Transaction Costs - Closing/legal/title costs
- Absorption Velocity - Sales pace benchmarks
- Market Timing - Process duration standards
- AI Suggestions - Review queue for extracted benchmarks

**Component:** `/Users/5150east/landscape/src/components/benchmarks/BenchmarksFlyout.tsx`
- Right-side panel for benchmark selection
- Filtering by category, geography, property type
- Apply to project workflow

### API Endpoints

**Main Benchmarks:**
- `GET /api/benchmarks` - List all benchmarks
  - Query params: `?category=unit_cost&market_geography=Phoenix&property_type=LAND&is_active=true`
  - Returns joined data from registry + category-specific tables
- `POST /api/benchmarks` - Create new benchmark
  - Creates registry entry + category-specific detail record
- `GET /api/benchmarks/[id]` - Get single benchmark
- `PUT /api/benchmarks/[id]` - Update benchmark
- `DELETE /api/benchmarks/[id]` - Soft delete benchmark

**Growth Rates:**
- `GET /api/benchmarks/growth-rates` - List growth rate sets
  - Query params: `?market_geography=Phoenix&is_global=true`
- `POST /api/benchmarks/growth-rates` - Create growth rate set with steps
  ```json
  {
    "set_name": "Conservative 2025",
    "market_geography": "Phoenix",
    "is_global": true,
    "steps": [
      {"step_number": 1, "from_period": 1, "periods": 12, "rate": 2.0},
      {"step_number": 2, "from_period": 13, "periods": 12, "rate": 2.5},
      {"step_number": 3, "from_period": 25, "periods": null, "rate": 3.0}
    ]
  }
  ```

**Absorption Velocity:**
- `GET /api/benchmarks/absorption-velocity` - List absorption benchmarks
- `POST /api/benchmarks/absorption-velocity` - Create absorption benchmark
- `PATCH /api/benchmarks/absorption-velocity/[id]` - Update benchmark
- `POST /api/benchmarks/absorption-velocity/bulk-import` - Import multiple

**AI Suggestions:**
- `GET /api/benchmarks/ai-suggestions` - List pending suggestions
  - Query params: `?status=pending&user_id=user123&document_id=doc456`
- `POST /api/benchmarks/ai-suggestions/[suggestionId]/review` - Approve/reject
  ```json
  {
    "action": "approve", // or "reject", "modify"
    "notes": "Looks good, matches market conditions",
    "adjusted_value": 2.75 // if action = "modify"
  }
  ```

### Key Features

- **Registry Pattern:** All benchmarks start in master registry, then link to category-specific tables
- **12 Category Types:** Comprehensive coverage of benchmark needs
- **AI Integration:** AI-extracted benchmarks from documents with approval workflow
- **Variance Detection:** Compares AI suggestions to existing benchmarks
- **Geographic Scoping:** Market geography filtering
- **Property Type Filtering:** Apply to relevant property types
- **Confidence Levels:** Track data quality (high/medium/low)
- **Usage Tracking:** Monitor application frequency
- **CPI Integration:** Inflation adjustment tracking
- **Age Detection:** `as_of_date` enables "stale data" warnings (>730 days)
- **Flexible Metadata:** JSONB `context_metadata` for category-specific attributes

---

## 6. Property Type Templates

**Purpose:** TypeScript-only templates defining default fields and metrics for each property type.

### TypeScript Types

**File:** `/Users/5150east/landscape/src/types/propertyTypes.ts`

```typescript
export type PropertyType =
  | 'multifamily'
  | 'office'
  | 'retail'
  | 'industrial'
  | 'hotel'
  | 'mixed-use'
  | 'land';

export interface PropertyTypeTemplate {
  type: PropertyType;
  label: string;
  icon: string;
  defaultFields: {
    units?: number;
    avgUnitSize?: number;
    totalSqFt?: number;
    occupancy?: number;
    avgRentPerUnit?: number;
    avgRentPerSF?: number;
    capRate?: number;
    noi?: number;
    // ... property-specific fields
  };
  metrics: string[];
  sections: string[];
}

export const MULTIFAMILY_TEMPLATE: PropertyTypeTemplate = {
  type: 'multifamily',
  label: 'Multifamily',
  icon: 'building',
  defaultFields: {
    units: 0,
    avgUnitSize: 950,
    occupancy: 95,
    avgRentPerUnit: 1500,
    capRate: 5.5,
  },
  metrics: ['NOI', 'Cap Rate', 'Rent/Unit', 'Occupancy'],
  sections: ['Units', 'Revenue', 'Expenses', 'Financing'],
};

export const OFFICE_TEMPLATE: PropertyTypeTemplate = {
  type: 'office',
  label: 'Office',
  icon: 'briefcase',
  defaultFields: {
    totalSqFt: 0,
    avgRentPerSF: 30,
    occupancy: 90,
    capRate: 6.5,
  },
  metrics: ['NOI', 'Cap Rate', 'Rent/SF', 'Occupancy'],
  sections: ['Space', 'Leases', 'Expenses', 'Financing'],
};

export const RETAIL_TEMPLATE: PropertyTypeTemplate = {
  type: 'retail',
  label: 'Retail',
  icon: 'shopping-cart',
  defaultFields: {
    totalSqFt: 0,
    avgRentPerSF: 25,
    occupancy: 92,
    capRate: 7.0,
  },
  metrics: ['NOI', 'Cap Rate', 'Rent/SF', 'Occupancy', 'Sales/SF'],
  sections: ['Tenants', 'Revenue', 'Expenses', 'Financing'],
};

export const INDUSTRIAL_TEMPLATE: PropertyTypeTemplate = {
  type: 'industrial',
  label: 'Industrial',
  icon: 'warehouse',
  defaultFields: {
    totalSqFt: 0,
    avgRentPerSF: 8,
    occupancy: 95,
    capRate: 6.0,
  },
  metrics: ['NOI', 'Cap Rate', 'Rent/SF', 'Occupancy'],
  sections: ['Facilities', 'Leases', 'Expenses', 'Financing'],
};

export const HOTEL_TEMPLATE: PropertyTypeTemplate = {
  type: 'hotel',
  label: 'Hotel',
  icon: 'bed',
  defaultFields: {
    rooms: 0,
    avgRoomSize: 350,
    occupancy: 70,
    adr: 150, // Average Daily Rate
    revPAR: 105, // Revenue Per Available Room
    capRate: 8.0,
  },
  metrics: ['RevPAR', 'ADR', 'Occupancy', 'NOI', 'Cap Rate'],
  sections: ['Rooms', 'Revenue', 'Expenses', 'Financing'],
};

export const MIXED_USE_TEMPLATE: PropertyTypeTemplate = {
  type: 'mixed-use',
  label: 'Mixed-Use',
  icon: 'layers',
  defaultFields: {
    totalSqFt: 0,
    units: 0,
    occupancy: 90,
    capRate: 6.0,
  },
  metrics: ['NOI', 'Cap Rate', 'Blended Occupancy'],
  sections: ['Components', 'Revenue', 'Expenses', 'Financing'],
};

export const LAND_TEMPLATE: PropertyTypeTemplate = {
  type: 'land',
  label: 'Land Development',
  icon: 'map',
  defaultFields: {
    acres: 0,
    totalLots: 0,
    avgLotSize: 7000,
    avgLotPrice: 150000,
  },
  metrics: ['Total Lots', 'Absorption', 'Price/Lot', 'Margin'],
  sections: ['Land', 'Development', 'Sales', 'Financing'],
};

export const PROPERTY_TYPE_TEMPLATES: Record<PropertyType, PropertyTypeTemplate> = {
  multifamily: MULTIFAMILY_TEMPLATE,
  office: OFFICE_TEMPLATE,
  retail: RETAIL_TEMPLATE,
  industrial: INDUSTRIAL_TEMPLATE,
  hotel: HOTEL_TEMPLATE,
  'mixed-use': MIXED_USE_TEMPLATE,
  land: LAND_TEMPLATE,
};
```

### Usage

Used in project setup wizard to:
1. Pre-populate default field values based on property type
2. Show/hide relevant metrics
3. Configure appropriate sections and tabs
4. Set initial assumptions

**No database tables** - purely TypeScript constants for UI configuration.

---

## 7. Density Classification

**Purpose:** Residential density standards defining lot size ranges and dwelling units per acre.

### Database Schema

**Table:** `landscape.density_classification`

```sql
CREATE TABLE landscape.density_classification (
    classification_code VARCHAR(50) PRIMARY KEY,
    classification_name VARCHAR(100) NOT NULL,
    min_lot_sf INTEGER,
    max_lot_sf INTEGER,
    min_du_per_acre NUMERIC(6,2),
    max_du_per_acre NUMERIC(6,2),
    typical_lot_width_ft INTEGER,
    typical_lot_depth_ft INTEGER,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Standard Classifications

**VLDR (Very Low Density Residential)**
- Lot Size: 20,000+ SF (0.46+ acres)
- Density: 0 - 2.0 DU/acre
- Typical Lot: 100' × 200' or larger
- Description: Estate lots, rural residential

**LDR (Low Density Residential)**
- Lot Size: 7,500 - 19,999 SF
- Density: 2.0 - 6.0 DU/acre
- Typical Lot: 75' × 120' or 80' × 140'
- Description: Standard single-family detached

**MDR (Medium Density Residential)**
- Lot Size: 4,000 - 7,499 SF
- Density: 6.0 - 12.0 DU/acre
- Typical Lot: 50' × 100' or 55' × 110'
- Description: Smaller single-family, patio homes

**HDR (High Density Residential)**
- Lot Size: 0 - 3,999 SF
- Density: 12.0+ DU/acre
- Typical Lot: 40' × 80' or townhome/condo
- Description: Attached product, multifamily

### Usage

- Applied to residential land use families
- Used in zoning analysis
- Determines allowable lot sizes
- Calculates maximum unit counts
- Influences infrastructure planning

### Key Features

- **Range-Based:** Min/max values for lot sizes and densities
- **DU/Acre Calculations:** Dwelling units per acre metrics
- **Typical Dimensions:** Standard lot configurations
- **Zoning Compliance:** Aligns with municipal regulations

---

## 8. Financial Engine Categories

**Purpose:** Universal financial categorization for budget facts in star schema data warehouse.

### Database Schema

**Category Table:** `landscape.core_fin_category`

```sql
CREATE TABLE landscape.core_fin_category (
    category_id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES core_fin_category(category_id),
    level INTEGER CHECK (level BETWEEN 1 AND 4),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_type VARCHAR(50), -- revenue, opex, capex, acquisition, financing
    is_template BOOLEAN DEFAULT false,
    project_type_code VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Category UOM Table:** `landscape.core_fin_category_uom`

```sql
CREATE TABLE landscape.core_fin_category_uom (
    category_id INTEGER REFERENCES core_fin_category(category_id),
    uom_code VARCHAR(20) REFERENCES core_fin_uom(uom_code),
    is_default BOOLEAN DEFAULT false,
    PRIMARY KEY (category_id, uom_code)
);
```

**Budget Facts (Star Schema):** `landscape.core_fin_fact_budget`

```sql
CREATE TABLE landscape.core_fin_fact_budget (
    fact_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    category_l1_id INTEGER REFERENCES core_fin_category(category_id),
    category_l2_id INTEGER REFERENCES core_fin_category(category_id),
    category_l3_id INTEGER REFERENCES core_fin_category(category_id),
    category_l4_id INTEGER REFERENCES core_fin_category(category_id),
    period_id INTEGER NOT NULL,
    uom_code VARCHAR(20),
    quantity NUMERIC(15,4),
    unit_cost NUMERIC(15,4),
    total_amount NUMERIC(18,2),
    growth_rate_set_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fact_budget_project ON core_fin_fact_budget(project_id);
CREATE INDEX idx_fact_budget_l1 ON core_fin_fact_budget(category_l1_id);
CREATE INDEX idx_fact_budget_l2 ON core_fin_fact_budget(category_l2_id);
CREATE INDEX idx_fact_budget_l3 ON core_fin_fact_budget(category_l3_id);
CREATE INDEX idx_fact_budget_l4 ON core_fin_fact_budget(category_l4_id);
CREATE INDEX idx_fact_budget_period ON core_fin_fact_budget(period_id);
```

**Supporting Tables:**
- `landscape.core_fin_uom` - Units of measure library
- `landscape.core_fin_curve` - S-curve distribution templates
- `landscape.core_fin_growth_rate_sets` - Growth rate sets
- `landscape.core_fin_growth_rate_steps` - Growth rate steps

### Key Features

- **Star Schema:** Fact table with 4-level category dimension
- **Flexible Hierarchy:** Categories can exist at any level (1-4)
- **Multi-UOM Support:** Categories can have multiple valid units of measure
- **Time-Series:** Period-based fact storage for temporal analysis
- **Growth Rates:** Linkage to escalation rate sets
- **S-Curves:** Distribution curves for phased spending

### Usage

- Backend for budget grid
- Financial reporting
- Cost rollups and aggregations
- Period-based analysis
- Growth rate application

---

## 9. Lookup Tables

**Purpose:** System-wide enumerations and reference data.

### Core Lookup System

**List Definitions:** `landscape.core_lookup_list`

```sql
CREATE TABLE landscape.core_lookup_list (
    list_id SERIAL PRIMARY KEY,
    list_code VARCHAR(50) NOT NULL UNIQUE,
    list_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**List Items:** `landscape.core_lookup_item`

```sql
CREATE TABLE landscape.core_lookup_item (
    item_id SERIAL PRIMARY KEY,
    list_id INTEGER REFERENCES core_lookup_list(list_id),
    item_code VARCHAR(50) NOT NULL,
    item_value VARCHAR(200) NOT NULL,
    item_order INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(list_id, item_code)
);
```

### Specific Lookup Tables

**Lease Status:** `landscape.lu_lease_status`
- Active
- Expired
- Pending
- Terminated
- Month-to-Month

**Lease Type:** `landscape.lu_lease_type`
- Gross
- Net
- Modified Gross
- Triple Net (NNN)
- Percentage

**Recovery Structure:** `landscape.lu_recovery_structure`
- Base Year
- Expense Stop
- Pro Rata Share
- Direct Pass-Through

### Usage

- Populate dropdown lists
- Validate enum values
- Standardize data entry
- Support multi-tenancy (user-specific lists)

### Key Features

- **System vs User:** `is_system` flag for protected lookups
- **Flexible Metadata:** JSONB for list-specific attributes
- **Default Values:** `is_default` flag for initial selections
- **Ordering:** `item_order` for consistent display
- **Soft Delete:** `is_active` flag preserves referential integrity

---

## Common Patterns

### 1. Hierarchical Structures

**Parent-Child Relationships:**
```sql
CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES category(category_id),
    name VARCHAR(200),
    level INTEGER -- Optional, for strict hierarchies
);
```

**Used in:**
- Unit Cost Categories (flexible depth)
- Budget Categories (strict 4-level)
- Financial Engine Categories (strict 4-level)

**Traversal:**
- Recursive CTEs for tree queries
- Level-based filtering
- Breadcrumb generation

### 2. Soft Delete

**Pattern:**
```sql
ALTER TABLE entity ADD COLUMN is_active BOOLEAN DEFAULT true;
```

**Benefits:**
- Preserves referential integrity
- Maintains historical data
- Supports "undelete" functionality
- Enables audit trails

**Used in:**
- All category systems
- Lookup tables
- Benchmark registry

### 3. Code + Name

**Pattern:**
```sql
CREATE TABLE entity (
    code VARCHAR(50) NOT NULL UNIQUE, -- Machine-readable
    name VARCHAR(200) NOT NULL        -- Human-readable
);
```

**Benefits:**
- Stable identifiers for code
- Descriptive names for UI
- Easier migrations

**Used in:**
- All taxonomy systems
- Lookup lists
- Property types

### 4. Templates vs Instances

**Pattern:**
```sql
CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    is_template BOOLEAN DEFAULT false,
    template_name VARCHAR(100),
    project_id BIGINT -- NULL for templates
);
```

**Benefits:**
- Reusable category structures
- Project-specific customization
- Faster project setup

**Used in:**
- Budget Categories
- Financial Engine Categories

### 5. Tag-Based Categorization

**Pattern:**
```sql
CREATE TABLE entity (
    tags JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE tag_library (
    tag_name VARCHAR(100) UNIQUE,
    tag_type VARCHAR(20) -- 'system' or 'user_defined'
);
```

**Benefits:**
- Flexible multi-dimensional categorization
- No schema changes for new tags
- User-defined extensions

**Used in:**
- Unit Cost Categories

### 6. Many-to-Many Relationships

**Pattern:**
```sql
CREATE TABLE entity_a (entity_a_id SERIAL PRIMARY KEY);
CREATE TABLE entity_b (entity_b_id SERIAL PRIMARY KEY);
CREATE TABLE entity_a_b (
    entity_a_id INTEGER REFERENCES entity_a(entity_a_id),
    entity_b_id INTEGER REFERENCES entity_b(entity_b_id),
    PRIMARY KEY (entity_a_id, entity_b_id)
);
```

**Used in:**
- Unit Cost Categories × Lifecycle Stages
- Land Use Types × Products

### 7. Audit Fields

**Standard Pattern:**
```sql
CREATE TABLE entity (
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);
```

**Used in:**
- All major tables
- Enables change tracking
- Supports compliance requirements

### 8. Sort Order

**Pattern:**
```sql
ALTER TABLE entity ADD COLUMN sort_order INTEGER DEFAULT 0;
```

**Benefits:**
- User-controlled ordering
- Consistent UI display
- Independent of alphabetical sorting

**Used in:**
- All category systems
- Lookup items

### 9. Geographic Scoping

**Pattern:**
```sql
ALTER TABLE entity ADD COLUMN market_geography VARCHAR(100);
```

**Benefits:**
- Location-specific data
- Regional filtering
- Multi-market support

**Used in:**
- Benchmarks
- Growth Rates
- Absorption Velocity

### 10. Temporal Tracking

**Pattern:**
```sql
ALTER TABLE entity ADD COLUMN as_of_date DATE;
```

**Benefits:**
- Time-based filtering
- Age-based warnings
- Historical comparison

**Used in:**
- Benchmarks
- Growth Rates
- Unit Cost Items

---

## Cross-System Integration

### How Systems Interact

**1. Project Taxonomy → Budget Categories**
- Project's `project_type_code` determines available budget category templates
- Example: LAND projects load "Land Development" budget template

**2. Project Taxonomy → Unit Cost Categories**
- Unit Cost Items filtered by `project_type_code`
- Example: Multifamily projects see MF-specific cost items

**3. Unit Cost Categories → Budget Categories**
- Budget line items reference unit cost categories for cost estimation
- Tags from Unit Cost Categories influence budget categorization

**4. Unit Cost Categories → Benchmarks**
- Unit Cost Items link to benchmarks via `core_item_benchmark_link`
- Benchmarks populate default values for cost items

**5. Land Use Taxonomy → Project Setup**
- Selected land use types influence project configuration
- Product selection determines planning assumptions

**6. Benchmarks → Growth Rates**
- Growth rate sets linked to benchmark registry
- Applied to budget facts for escalation

**7. Benchmarks → Financial Engine**
- Benchmarks provide default values for budget facts
- Unit costs, transaction costs, contingency percentages

**8. Property Type Templates → Project Taxonomy**
- Templates map to `project_type_code` values
- Pre-populate fields based on property subtype

**9. Density Classification → Land Use**
- Applied to residential land use families
- Determines allowable lot sizes and unit counts

**10. Budget Categories → Financial Engine**
- Budget categories map to `core_fin_category` hierarchy
- Budget line items stored as facts with 4-level category FKs

### Data Flow Example: Creating a Land Development Project

1. **User selects Project Taxonomy:**
   - Analysis Type: "Land Development"
   - Property Subtype: "Subdivision"
   - → Sets `project_type_code = 'LAND'`

2. **Budget Categories loaded:**
   - Query: `SELECT * FROM core_budget_category WHERE is_template = true AND project_type_code = 'LAND'`
   - Copies template to project-specific categories

3. **Unit Cost Categories available:**
   - Filter: `lifecycle_stage = 'Development'` AND `tags @> '["Hard"]'`
   - Shows relevant cost categories for land development

4. **Land Use Taxonomy selected:**
   - Family: RES (Residential)
   - Type: SFD (Single Family Detached)
   - Products: 50x120, 60x130, 70x140

5. **Benchmarks applied:**
   - Growth Rates: "Phoenix Metro 2025" (2.5% stepped)
   - Unit Costs: "Grading - Standard: $2.50/SF"
   - Absorption: "Luxury 60x130: 8.5 units/month"

6. **Financial Engine populates:**
   - Budget facts created with 4-level category FKs
   - Growth rate set applied for escalation
   - S-curves assigned for phased spending

---

## API Conventions

### Standard CRUD Patterns

**List Resources:**
```
GET /api/{resource}?filter1=value1&filter2=value2
```
- Returns array of objects
- Supports filtering via query parameters
- Pagination via `?offset=0&limit=100`

**Create Resource:**
```
POST /api/{resource}
Body: { field1: value1, field2: value2 }
```
- Returns created object with ID
- 201 status on success

**Get Single Resource:**
```
GET /api/{resource}/[id]
```
- Returns single object
- 404 if not found

**Update Resource:**
```
PUT /api/{resource}/[id]
Body: { field1: new_value1 }
```
- Returns updated object
- 200 status on success

**Delete Resource:**
```
DELETE /api/{resource}/[id]
```
- Soft delete (sets `is_active = false`)
- Returns 204 No Content

### Common Query Parameters

- `?is_active=true` - Filter active records
- `?is_template=true` - Filter templates
- `?project_id=123` - Filter by project
- `?project_type_code=LAND` - Filter by property type
- `?market_geography=Phoenix` - Filter by geography
- `?parent_id=5` - Filter by parent (hierarchies)
- `?level=2` - Filter by hierarchy level
- `?tag=Hard` - Filter by tag
- `?lifecycle_stage=Development` - Filter by lifecycle stage

### Nested Resource Patterns

**Many-to-Many Linking:**
```
POST /api/{parent-resource}/[id]/{child-resource}
Body: { child_id: 123 }

DELETE /api/{parent-resource}/[id]/{child-resource}/[childId]
```

**Example:**
```
POST /api/land-use/types/5/products
Body: { product_id: 10 }

DELETE /api/land-use/types/5/products/10
```

### Custom Actions

**Deletion Impact Analysis:**
```
GET /api/{resource}/[id]?action=deletion-impact
```
- Returns count of dependent records
- Used before soft delete confirmation

**Completion Status:**
```
GET /api/budget/categories/incomplete
```
- Returns categories with missing fields
- Includes usage statistics

**Review Workflows:**
```
POST /api/benchmarks/ai-suggestions/[id]/review
Body: { action: "approve", notes: "..." }
```
- Custom state transitions
- Workflow-specific operations

---

## Migration Reference

### Key Migration Files

**Unit Cost Categories:**
- `backend/apps/financial/migrations/0016_category_lifecycle_taxonomy.sql`

**Budget Categories:**
- `backend/migrations/018_category_completion_tracking.sql`

**Land Use Taxonomy:**
- `db/migrations/001_create_land_use_tables.up.sql`

**Project Taxonomy:**
- `backend/apps/projects/migrations/0013_project_taxonomy_restructure.py`

**Benchmarks:**
- `backend/apps/financial/migrations/0014_global_benchmarks_phase1.sql`
- `backend/migrations/016_absorption_velocity_benchmarks.sql`

**Growth Rates:**
- `db/migrations/006_create_growth_rate_tables.up.sql`

**Financial Engine:**
- `db/migrations/010_financial_engine_core_tables.up.sql`

---

## Summary

This reference covers **9 major categorization systems** in the Landscape application:

1. **Unit Cost Categories** - Lifecycle-based, tag-driven, hierarchical cost taxonomy
2. **Budget Categories** - 4-level strict hierarchy with templates
3. **Land Use Taxonomy** - 3-tier cascading (Family → Type → Product)
4. **Project Taxonomy** - 2-3 level cascading (Analysis Type → Property Subtype → Class)
5. **Benchmark Categories** - 12 category types with AI-assisted extraction
6. **Property Type Templates** - TypeScript-only field/metric templates
7. **Density Classification** - Residential density standards
8. **Financial Engine Categories** - Star schema category dimension
9. **Lookup Tables** - System-wide enumerations

Each system is documented with:
- ✅ Database schema and tables
- ✅ Django models and TypeScript types
- ✅ UI components and page locations
- ✅ API endpoints and conventions
- ✅ Key features and usage patterns
- ✅ Cross-system integration points

This document serves as a **single source of truth** for understanding categorization mechanisms across the entire Landscape application.