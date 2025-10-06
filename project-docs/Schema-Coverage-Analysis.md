# Schema Coverage Analysis - What Was & Wasn't Migrated

**Date:** October 2, 2025
**Purpose:** Clarify which tables were migrated and which remain untouched

---

## Summary

You're correct! The migration **only touched the budget system**. Here's what was and wasn't included:

### ✅ Migrated (Budget System Only)
- `tbl_budget_structure` → `core_fin_category`
- `tbl_budget_items` → `core_fin_fact_budget`

### ⚠️ NOT Migrated (Untouched)
- **Parcel tables** - No changes
- **Land use tables** - No changes
- **Inflation/growth tables** - No changes

---

## Detailed Analysis

### 1. Parcel Tables - NO OVERLAP ✅

**Tables:**
- `tbl_parcel` (56 records) - **Active, untouched**
- `gis_plan_parcel` - GIS-specific parcel data
- `gis_tax_parcel_ref` - Tax parcel references
- `project_parcel_boundaries` - Boundary geometries

**Status:** ✅ **No migration needed**

**Why:**
- No equivalent in `core_fin_*` schema
- `tbl_parcel` is the **primary domain entity** for land parcels
- Used throughout the application
- No overlap or redundancy

**Schema:**
```sql
tbl_parcel:
  - parcel_id (PK)
  - project_id, phase_id, area_id
  - landuse_code → References tbl_landuse
  - lot_product, lot_width, lot_depth
  - units_total, acres_gross
  - site_coverage_pct, setbacks
  - product_code, family_name, density_code
```

**Relationships:**
- Used by `core_doc` (FK: parcel_id)
- Used by `gis_plan_parcel` (FK: parcel_id)
- References `tbl_landuse` (FK: landuse_code)
- References `tbl_phase`, `tbl_area`

**Conclusion:** This is a **core domain table** with no redundancy. Keep as-is.

---

### 2. Land Use Tables - NO OVERLAP ✅

**Tables:**
- `tbl_landuse` (36 records) - **Active, untouched**
- `tbl_landuse_program` - Land use programs
- `lu_type`, `lu_subtype`, `lu_family` - Lookup hierarchies
- `lu_com_spec`, `lu_res_spec` - Commercial/residential specs
- `land_use_pricing` - Pricing data

**Status:** ✅ **No migration needed**

**Why:**
- No equivalent in `core_fin_*` schema
- `tbl_landuse` is a **domain taxonomy** for land use classifications
- Not financial data - it's zoning/planning data
- No overlap with budget categories

**Schema:**
```sql
tbl_landuse:
  - landuse_id (PK)
  - landuse_code (UNIQUE) - e.g., "SFD", "MF-3", "RET-1"
  - landuse_type - e.g., "Single Family Detached"
  - type_id → References lu_type
  - subtype_id
  - name, description
```

**Relationships:**
- Referenced by `tbl_parcel` (FK: landuse_code)
- Hierarchical: lu_family → lu_type → lu_subtype → tbl_landuse

**Example Data:**
```
SFD      Single Family Detached
MF-2     Multi-Family 2-3 Units
MF-4     Multi-Family 4+ Units
RET-1    Retail - Neighborhood
OFF-1    Office - Class A
```

**Conclusion:** This is **zoning/planning taxonomy**, completely separate from financial categories. Keep as-is.

---

### 3. Inflation/Growth Tables - NO OVERLAP ✅

**Tables:**
- `core_fin_growth_rate_sets` (12 sets) - **Active, untouched**
- `core_fin_growth_rate_steps` - Individual rate steps

**Status:** ✅ **No migration needed**

**Why:**
- Already in `core_fin_*` schema (part of finance framework)
- No legacy equivalent
- Used for inflation/escalation modeling
- No overlap or redundancy

**Schema:**
```sql
core_fin_growth_rate_sets:
  - set_id (PK)
  - project_id
  - card_type - "revenue", "cost", "price"
  - set_name - "Custom 1", "Market Default", etc.
  - is_default

core_fin_growth_rate_steps:
  - step_id (PK)
  - set_id → References core_fin_growth_rate_sets
  - year_offset - 0, 1, 2, 3...
  - rate_pct - Annual growth rate percentage
```

**Usage:**
- Referenced by `core_fin_fact_budget.growth_rate_set_id`
- Allows per-line-item escalation rates
- Supports multiple sets per project (scenarios)

**Example:**
```
Set: "2024 Phoenix Metro"
  Year 0: 3.5%
  Year 1: 3.2%
  Year 2: 3.0%
  Year 3: 2.8%
```

**Conclusion:** Already part of the modern `core_fin_*` framework. No migration needed.

---

## What Actually Happened in the Migration

### Budget System Only

**Before Migration:**
```
tbl_budget_structure (27 templates)
  └─ tbl_budget_items (4 project items)

core_fin_* (existing finance framework)
  ├─ core_fin_category (5 categories)
  └─ core_fin_fact_budget (7 items)
```

**After Migration:**
```
tbl_budget_structure (27 - DEPRECATED)
tbl_budget_items (4 - DEPRECATED)

core_fin_* (consolidated)
  ├─ core_fin_category (5 + 27 = 32 categories)
  └─ core_fin_fact_budget (7 + 4 = 11 items)
```

**Everything else remained untouched.**

---

## Schema Relationship Map

```
PROJECT DOMAIN (untouched)
├─ tbl_project
├─ tbl_phase
├─ tbl_area
└─ tbl_parcel ─┐
               │
LAND USE DOMAIN (untouched)
├─ lu_family   │
├─ lu_type     │
├─ lu_subtype  │
└─ tbl_landuse ◄┘
   └─ tbl_landuse_program

FINANCE DOMAIN (migrated)
├─ core_fin_budget_version
├─ core_fin_category ◄── ADDED 27 from tbl_budget_structure
├─ core_fin_fact_budget ◄── ADDED 4 from tbl_budget_items
├─ core_fin_uom
├─ core_fin_growth_rate_sets (untouched)
└─ core_fin_growth_rate_steps (untouched)

GIS DOMAIN (untouched)
├─ gis_project_boundary
├─ gis_plan_parcel
└─ gis_tax_parcel_ref
```

---

## Why These Tables Don't Need Migration

### Parcel Tables
- **Purpose:** Physical land subdivision (planning/development)
- **Data Type:** Spatial, physical attributes, development specs
- **Not Financial:** These describe *what* is being developed, not budgets

### Land Use Tables
- **Purpose:** Zoning/planning taxonomy (regulatory)
- **Data Type:** Codes, classifications, regulations
- **Not Financial:** These describe *how* land can be used (zoning)

### Growth Rate Tables
- **Purpose:** Inflation/escalation modeling
- **Data Type:** Time-series percentage rates
- **Already Modern:** Already in `core_fin_*` framework (no legacy version)

---

## Potential Future Consolidations (If Needed)

### None Identified Currently

After reviewing all three areas, **no overlaps or redundancies exist**.

The only migration needed was **budget system consolidation**, which is now complete.

---

## Data Inventory Summary

| Domain | Tables | Records | Status | Migration Needed |
|--------|--------|---------|--------|------------------|
| **Parcels** | 4 tables | 56 parcels | ✅ Active | ❌ No |
| **Land Use** | 6 tables | 36 land uses | ✅ Active | ❌ No |
| **Budget (Legacy)** | 4 tables | 27+4 items | ⚠️ Deprecated | ✅ **Done** |
| **Budget (Core)** | 4+ tables | 32+11 items | ✅ Active | ✅ **Done** |
| **Growth Rates** | 2 tables | 12 sets | ✅ Active | ❌ No |
| **GIS** | 6 tables | Various | ✅ Active | ❌ No |

---

## Validation Queries

### Check for Potential Overlaps

```sql
-- Are there any parcel-related tables in core_fin_*?
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'landscape'
  AND table_name LIKE 'core_fin_%parcel%';
-- Expected: 0 rows

-- Are there any landuse-related tables in core_fin_*?
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'landscape'
  AND table_name LIKE 'core_fin_%landuse%'
  OR table_name LIKE 'core_fin_%land_use%';
-- Expected: 0 rows

-- Are there any tbl_growth or tbl_inflation tables?
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'landscape'
  AND table_name LIKE 'tbl_%growth%'
  OR table_name LIKE 'tbl_%inflation%'
  OR table_name LIKE 'tbl_%escalat%';
-- Expected: 0 rows (all growth is in core_fin_*)
```

---

## Conclusion

✅ **Your intuition was correct!**

The migration **only addressed the budget system**. All other domains (parcels, land use, growth rates) are:

1. **Already in their proper schema** (no legacy versions)
2. **Serve different purposes** (not financial/budget data)
3. **Have no overlap or redundancy**
4. **Actively used by the application**

**No further migrations are needed.**

---

## Reference: What Each Table Does

### Parcel Tables
```
tbl_parcel          - Land subdivision units (lots/parcels)
gis_plan_parcel     - GIS geometry for plan parcels
gis_tax_parcel_ref  - References to tax assessor parcels
```

### Land Use Tables
```
tbl_landuse         - Zoning classifications (SFD, MF-3, RET-1)
lu_family           - High-level family (Residential, Commercial)
lu_type             - Type within family (Single Family, Multi Family)
lu_subtype          - Detailed subtype (Detached, Attached, Townhome)
```

### Growth Rate Tables
```
core_fin_growth_rate_sets  - Named escalation scenarios
core_fin_growth_rate_steps - Year-by-year growth rates
```

### Budget Tables (Migrated)
```
tbl_budget_structure (DEPRECATED) → core_fin_category
tbl_budget_items (DEPRECATED)     → core_fin_fact_budget
```

**Only the budget tables needed consolidation. Everything else is clean.**
