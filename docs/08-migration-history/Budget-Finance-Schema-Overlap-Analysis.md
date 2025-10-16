# Budget & Finance Schema Overlap Analysis

**Date:** October 2, 2025
**Status:** Schema Audit
**Affected Tables:** Budget and Finance subsystems

## Executive Summary

The Landscape Neon schema has two parallel budget/finance systems that overlap in functionality:

1. **Legacy Budget System** (`tbl_budget_*`)
2. **Core Finance System** (`core_fin_*`)

This creates redundancy, potential data inconsistency, and confusion about which system to use.

---

## Schema Comparison

### Legacy Budget System

#### `tbl_budget_structure`
**Purpose:** Template/taxonomy for budget line items
**Record Count:** 27 records
**Key Fields:**
```sql
structure_id    SERIAL PRIMARY KEY
scope           VARCHAR(100)      -- 'Acquisition', 'Stage 1', 'Stage 2', etc.
category        VARCHAR(100)      -- 'Diligence', 'Purchase', 'Engineering'
detail          VARCHAR(200)      -- 'Land Cost', 'Zoning Application', etc.
cost_method     VARCHAR(20)       -- '$$' (flat), '$/Acre' (per unit)
measure_id      INTEGER FK        -- Link to tbl_measures (units)
is_system       BOOLEAN           -- System-defined vs custom
```

**Sample Data:**
```
scope        | category    | detail                  | cost_method
-------------|-------------|-------------------------|-------------
Acquisition  | Diligence   | Environmental Studies   | $$
Acquisition  | Purchase    | Land Cost               | $/Acre
Stage 1      | Entitlements| Zoning Application      | $$
Stage 2      | Engineering | Civil Engineering       | $$
```

#### `tbl_budget_items`
**Purpose:** Actual project budget line items
**Record Count:** 4 records
**Key Fields:**
```sql
budget_item_id  SERIAL PRIMARY KEY
project_id      INTEGER FK → tbl_project
structure_id    INTEGER FK → tbl_budget_structure
amount          DECIMAL(15,2)
quantity        DECIMAL(10,2)
cost_per_unit   DECIMAL(15,2)
```

**Relationship:**
```
tbl_budget_structure (template)
    ↓ references
tbl_budget_items (project-specific instances)
```

---

### Core Finance System

#### `core_fin_category`
**Purpose:** Hierarchical chart of accounts
**Record Count:** 5 records
**Key Fields:**
```sql
category_id     BIGSERIAL PRIMARY KEY
parent_id       BIGINT FK → self (hierarchy)
code            TEXT UNIQUE          -- 'USE-ACQ-PUR', 'SRC-REV-SAL-PARC'
kind            TEXT                 -- 'Source' (revenue) or 'Use' (expense)
class           TEXT                 -- 'Acquisition', 'Stage 3', 'Project'
scope           TEXT                 -- Additional classification
detail          TEXT                 -- Fine-grained description
```

**Sample Data:**
```
code             | kind   | class       | scope | detail
-----------------|--------|-------------|-------|--------
USE-ACQ-PUR      | Use    | Acquisition |       |
USE-STG3-OFF     | Use    | Stage 3     |       |
USE-PRJ-MGMT     | Use    | Project     |       |
SRC-REV-SAL-PARC | Source | Revenue     |       |
```

**Hierarchical:** Supports parent-child relationships for nested categories

#### `core_fin_fact_budget`
**Purpose:** Budget line items (star schema fact table)
**Record Count:** 7 records
**Key Fields:**
```sql
fact_id            BIGSERIAL PRIMARY KEY
budget_id          BIGINT FK → core_fin_budget_version
pe_level           ENUM                    -- 'project', 'phase', 'parcel', 'product'
pe_id              TEXT                    -- Entity ID (polymorphic)
category_id        BIGINT FK → core_fin_category
funding_id         BIGINT FK → core_fin_funding_source
uom_code           TEXT FK → core_fin_uom
qty                DECIMAL(18,6)
rate               DECIMAL(18,6)
amount             DECIMAL(18,2)
start_date         DATE
end_date           DATE
curve_id           BIGINT FK → core_fin_curve (cash flow timing)
confidence_level   VARCHAR(20)             -- 'high', 'medium', 'low', 'guess'
is_committed       BOOLEAN
```

**Advanced Features:**
- **Polymorphic entity references** via `pe_level` + `pe_id`
- **Multi-dimensional:** Budget version, category, funding source, timing curve
- **Time-based:** start_date, end_date, curve_id for cash flow modeling
- **Confidence tracking:** Supports budget uncertainty modeling

---

## Key Differences

| Feature | Legacy (`tbl_budget_*`) | Core Finance (`core_fin_*`) |
|---------|-------------------------|------------------------------|
| **Data Model** | Simple 2-table structure | Star schema (fact + dimensions) |
| **Hierarchy** | Flat categories | Nested parent-child categories |
| **Entity Scope** | Project-level only | Multi-level (project/phase/parcel/product) |
| **Time Dimension** | None | Start/end dates + cash flow curves |
| **Versioning** | None | Budget versions via `budget_id` FK |
| **Funding Tracking** | None | Funding source FK |
| **Confidence** | None | High/medium/low/guess |
| **Code Standards** | Free-text categories | Structured codes (USE-ACQ-PUR) |
| **UOM Support** | Via FK to tbl_measures | Via FK to core_fin_uom + core_fin_category_uom |
| **Actuals** | None | Separate `core_fin_fact_actual` table |
| **Commitment** | None | `is_committed` flag |

---

## Overlap Analysis

### ✅ Similar Functionality

Both systems track:
- **Budget line items** (tbl_budget_items ≈ core_fin_fact_budget)
- **Categories/taxonomy** (tbl_budget_structure ≈ core_fin_category)
- **Amounts and quantities**
- **Project association**

### ❌ Redundancy Issues

1. **Duplicate Category Definitions**
   - `tbl_budget_structure.scope + category` overlaps with `core_fin_category.class`
   - Example: "Acquisition → Diligence" exists in both

2. **Competing Line Item Storage**
   - `tbl_budget_items` vs `core_fin_fact_budget`
   - Both store project budget amounts
   - No clear migration path or synchronization

3. **No Cross-References**
   - No FK between legacy and core finance tables
   - Systems are completely isolated
   - Data can diverge

---

## Usage Patterns (Current State)

### Legacy System (`tbl_budget_*`)
- **Active:** 27 structure templates, 4 project budget items
- **Usage:** Simple project budgeting
- **Limitations:**
  - No versioning
  - No time dimension
  - Project-level only
  - No actuals tracking

### Core Finance System (`core_fin_*`)
- **Active:** 5 categories, 7 budget facts
- **Usage:** Advanced financial modeling
- **Capabilities:**
  - Budget versions
  - Multi-entity (project/phase/parcel)
  - Time-based cash flows
  - Actuals vs budget comparison
  - Funding source tracking
  - Confidence levels

---

## Recommendations

### Option 1: Consolidate to Core Finance ⭐ **RECOMMENDED**

**Rationale:**
- More mature, feature-rich system
- Supports versioning, timing, funding sources
- Multi-entity support (phase/parcel-level budgets)
- Already integrated with actuals tracking
- Star schema supports analytics

**Migration Path:**
1. Map `tbl_budget_structure` categories to `core_fin_category` codes
2. Create migration script:
   ```sql
   INSERT INTO core_fin_fact_budget (
     budget_id, pe_level, pe_id, category_id,
     uom_code, qty, rate, amount
   )
   SELECT
     default_budget_version_id,
     'project',
     bi.project_id::text,
     map_structure_to_category(bi.structure_id),
     'EA',
     bi.quantity,
     bi.cost_per_unit,
     bi.amount
   FROM tbl_budget_items bi;
   ```
3. Deprecate `tbl_budget_items` (mark as legacy, don't drop immediately)
4. Update application layer to use `core_fin_fact_budget`

### Option 2: Keep Both, Clarify Usage

**Rationale:**
- Legacy system simpler for basic use cases
- Core finance for advanced scenarios
- Avoid breaking existing functionality

**Requirements:**
1. Document clear boundaries:
   - **Legacy:** Simple project budgets (quick estimates)
   - **Core Finance:** Formal budgets with versions, actuals tracking
2. Create sync mechanism if needed
3. Add schema comments explaining purpose of each

### Option 3: Sunset Legacy, Start Fresh

**Rationale:**
- Only 4 records in `tbl_budget_items` (minimal data loss)
- Clean slate for future development

**Steps:**
1. Archive existing legacy data to backup tables
2. Drop `tbl_budget_items` and `tbl_budget_structure`
3. Standardize on `core_fin_*` exclusively
4. Update UI/application code

---

## Related Tables Inventory

### Legacy Budget System
```
tbl_budget_structure       (27 records) - Budget taxonomy
tbl_budget_items          (4 records)  - Project budget line items
tbl_budget_timing         (0 records)  - Timing allocations for budget items
tbl_budget                (?)          - Unknown usage (need to check)
```

### Core Finance System
```
core_fin_category         (5 records)  - Chart of accounts
core_fin_fact_budget      (7 records)  - Budget line items (fact table)
core_fin_fact_actual      (?)          - Actual transactions
core_fin_budget_version   (?)          - Budget versions (for comparison)
core_fin_funding_source   (?)          - Funding sources
core_fin_curve            (?)          - Cash flow timing curves
core_fin_uom              (?)          - Units of measure
core_fin_category_uom     (?)          - Category-UOM mappings
core_fin_pe_applicability (?)          - Category applicability by entity type
core_fin_crosswalk_ad     (?)          - Crosswalk to external systems
core_fin_crosswalk_ae     (?)          - Another crosswalk table
core_fin_growth_rate_*    (?)          - Escalation/growth modeling
```

---

## Decision Matrix

| Criterion | Keep Both | Migrate to Core | Sunset Legacy |
|-----------|-----------|-----------------|---------------|
| **Data Loss Risk** | Low | Low (4 records) | Low |
| **Development Effort** | Low | Medium | High |
| **Future Flexibility** | Medium | High | High |
| **Maintenance Burden** | High | Low | Low |
| **Analytics Capability** | Low | High | High |
| **Learning Curve** | Low | Medium | Medium |

---

## Next Steps

1. **Verify Usage:** Check application code to see which system is actively used
   ```bash
   grep -r "tbl_budget_items" src/
   grep -r "core_fin_fact_budget" src/
   ```

2. **Check Dependencies:** Identify UI components relying on legacy tables

3. **Data Audit:** Query to find overlap:
   ```sql
   SELECT
     bs.scope,
     bs.category,
     fc.class,
     fc.code
   FROM tbl_budget_structure bs
   LEFT JOIN core_fin_category fc
     ON bs.scope = fc.class
   ORDER BY bs.scope, bs.category;
   ```

4. **Stakeholder Decision:** Choose consolidation strategy based on:
   - Active development priorities
   - Risk tolerance
   - Resource availability

---

## Impact on Document Extraction

### Current State
- Document extractor may extract budget data from PDFs
- Unclear which table to populate (legacy vs core)

### Recommendation
- If keeping both: Default to `core_fin_fact_budget` for new extractions
- Add configuration flag: `use_legacy_budget: boolean`
- Document assertion structure already flexible enough to handle both

---

## Appendix: Sample Queries

### Compare Category Structures
```sql
-- Legacy categories
SELECT DISTINCT scope, category
FROM tbl_budget_structure
ORDER BY scope, category;

-- Core finance categories
SELECT code, kind, class
FROM core_fin_category
ORDER BY kind, class;
```

### Find Orphaned Budget Items
```sql
-- Items with no structure reference
SELECT *
FROM tbl_budget_items
WHERE structure_id NOT IN (
  SELECT structure_id FROM tbl_budget_structure
);
```

### Check Core Finance Usage
```sql
SELECT
  b.budget_id,
  fc.code,
  fb.amount,
  fb.confidence_level
FROM core_fin_fact_budget fb
JOIN core_fin_category fc ON fb.category_id = fc.category_id
JOIN core_fin_budget_version b ON fb.budget_id = b.budget_id;
```

---

**Conclusion:** The schema overlap creates ambiguity and maintenance burden. Consolidating to `core_fin_*` is recommended for long-term system health, given the minimal data in legacy tables and superior capabilities of the core finance system.
