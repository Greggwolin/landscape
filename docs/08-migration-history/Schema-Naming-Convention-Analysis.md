# Schema Naming Convention Analysis

**Date:** October 14, 2025
**Purpose:** Determine best practice for naming conventions after budget consolidation

## Database Schema Overview

**Active Schema:** `landscape` (143 tables, 19 views)
**Legacy Schema:** `land_v2` (2 tables - zoning glossary only, unused)

## Current State: Prefix Usage

### Distribution by Prefix (landscape schema)

| Prefix | Count | Purpose | Examples |
|--------|-------|---------|----------|
| `tbl_` | 26 | **Domain tables** (core business entities) | tbl_project, tbl_parcel, tbl_phase, tbl_multifamily_unit, tbl_multifamily_lease |
| `core_` | 18 | **Foundation/framework tables** (shared infrastructure) | core_fin_*, core_doc, core_lookup_* |
| `dms_` | 8 | **Document Management System** (subsystem) | dms_extract_queue, dms_assertion, dms_unmapped |
| `gis_` | 6 | **GIS subsystem** (geographic data) | gis_project_boundary, gis_plan_parcel, gis_tax_parcel_ref |
| `lu_` | 5 | **Lookup/Domain Value Lists** (reference data) | lu_family, lu_type, lu_subtype, lu_com_spec, lu_res_spec |
| `res_` | 1 | **Residential domain** (specific to res products) | res_lot_product |
| `other` | 79 | No prefix (migration tables, views, legacy) | planning_doc, spatial_ref_sys, vw_multifamily_* |

---

## Semantic Analysis

### `tbl_` Prefix - Core Business Entities
**Philosophy:** Main domain objects that are central to business operations

**Characteristics:**
- Primary business entities (project, parcel, phase, landuse)
- Direct user interaction (CRUD operations)
- Core to application functionality
- High data volume (operational data)
- Strong FK relationships to each other

**Examples:**
```
tbl_project              - Master project entity
tbl_parcel               - Individual land parcels
tbl_phase                - Development phases
tbl_landuse              - Land use definitions
tbl_zoning_control       - Zoning regulations
tbl_contacts             - People/companies
tbl_acquisition          - Acquisition tracking
tbl_approval             - Approval processes
tbl_multifamily_unit     - Multifamily unit inventory (NEW - Migration 008)
tbl_multifamily_lease    - Multifamily lease management (NEW - Migration 008)
tbl_multifamily_turn     - Unit turn tracking (NEW - Migration 008)
tbl_multifamily_unit_type - Unit type master data (NEW - Migration 008)
```

**Pattern:** These are **nouns** representing real-world entities that business users understand.

---

### `core_` Prefix - Foundation/Framework
**Philosophy:** Shared infrastructure that supports multiple subsystems

**Characteristics:**
- Reusable across multiple domains
- Framework/platform services
- Often dimension tables in star schemas
- Supports advanced features (versioning, lookup, financial modeling)
- May be more technical/abstract

**Examples:**
```
core_doc               - Generic document metadata
core_lookup_list       - Lookup list framework
core_fin_category      - Financial chart of accounts
core_fin_fact_budget   - Financial fact table (star schema)
core_fin_uom           - Units of measure
```

**Pattern:** These provide **services** or **frameworks** used by domain tables.

---

### Subsystem Prefixes (`dms_`, `gis_`)
**Philosophy:** Clearly scoped subsystems with isolated concerns

**Characteristics:**
- Focused on specific functionality
- Often can be deployed/understood independently
- May have their own API/service layer
- Clear boundaries

**Examples:**
```
dms_*  - Document management, extraction, assertions
gis_*  - Geographic/spatial data and boundaries
```

---

## Best Practice: Which Prefix for Finance?

### Option 1: Keep `core_fin_*` ⭐ **RECOMMENDED**

**Rationale:**
1. **Already Established:** 15 `core_fin_*` tables already exist
2. **Cross-Cutting Concern:** Finance is used by projects, parcels, phases (multi-entity)
3. **Framework Nature:** Star schema, fact tables, dimension tables - more "platform" than "domain"
4. **Reusability:** Financial system can support multiple domains (dev pro forma, budgets, actuals)
5. **Consistency:** Keep existing naming, less disruption

**Structure:**
```
core_fin_category          - Chart of accounts (dimension)
core_fin_fact_budget       - Budget facts (fact table)
core_fin_fact_actual       - Actual transactions (fact table)
core_fin_funding_source    - Funding sources (dimension)
core_fin_curve             - Cash flow timing (dimension)
core_fin_uom               - Units of measure (dimension)
```

**Why NOT `tbl_fin_*`:**
- Finance is more of a framework/platform service than a primary domain entity
- Star schema pattern fits better under `core_` philosophy
- Would require renaming 15 existing tables (breaking change)

---

### Option 2: Migrate to `tbl_fin_*`

**Rationale:**
1. **Consistency with Domain:** Finance is core to real estate development operations
2. **User-Facing:** Budget management is a primary user activity
3. **Domain-Driven Design:** Budget/actuals are first-class business entities

**Arguments Against:**
- Requires renaming 15 existing `core_fin_*` tables
- Finance tables use star schema (unusual for `tbl_` prefix)
- `core_` prefix signals the reusability/framework nature better

---

### Option 3: Hybrid Approach

Keep both but clarify purpose:
```
core_fin_*           - Framework tables (categories, UOM, curves, funding)
tbl_budget           - User-facing budget entity (renamed from tbl_budget_items)
tbl_budget_version   - Budget snapshots
```

**Arguments Against:**
- Still creates confusion
- Splits related functionality
- Requires careful documentation of boundaries

---

## Recommendation: Naming Convention Going Forward

### ✅ Use `core_fin_*` for Finance Consolidation

**Migration Plan:**
```sql
-- Keep existing core_fin_* tables
-- Deprecate these legacy tables:
DROP TABLE tbl_budget_items;
DROP TABLE tbl_budget_structure;
DROP TABLE tbl_budget_timing;

-- Optionally rename for clarity:
-- (only if tbl_budget has different purpose)
-- Keep tbl_budget if it's a wrapper/summary table
```

**Why This Works:**
1. **Minimal Disruption:** No need to rename 15 existing tables
2. **Clear Semantics:** `core_fin_*` signals it's a framework supporting multiple entities
3. **Star Schema Fit:** Fact tables naturally live in `core_` space
4. **Precedent:** Similar to `core_doc` (document framework), `core_lookup_*` (lookup framework)

---

## Updated Naming Convention Guidelines

### When to Use Each Prefix

#### `tbl_` - Use for:
- ✅ Primary business entities (project, parcel, phase, landuse, contact)
- ✅ Direct user-facing CRUD entities
- ✅ Operational data stores
- ✅ Domain nouns that users understand
- ❌ NOT for: Framework tables, star schemas, lookup lists

#### `core_` - Use for:
- ✅ Shared frameworks/services (documents, finance, lookups)
- ✅ Star schema fact/dimension tables
- ✅ Cross-cutting concerns used by multiple domains
- ✅ Platform-level abstractions
- ❌ NOT for: Primary business entities

#### `dms_`, `gis_`, etc. - Use for:
- ✅ Well-scoped subsystems
- ✅ Isolated functional areas
- ✅ Can be understood/deployed independently
- ❌ NOT for: Core business entities or shared frameworks

#### `lu_` - Use for:
- ✅ Lookup lists (domain value lists)
- ✅ Reference data
- ✅ Taxonomies
- ❌ NOT for: Transactional data

---

## Migration Impact Assessment

### If Consolidating to `core_fin_*`

**Tables to Drop:**
```sql
-- Legacy budget system (after data migration)
tbl_budget_items       → migrate to core_fin_fact_budget
tbl_budget_structure   → migrate to core_fin_category
tbl_budget_timing      → migrate to core_fin_curve or fact_budget.start_date/end_date
```

**Tables to Keep:**
```sql
-- Potentially keep if serves different purpose:
tbl_budget             → Check if this is a summary/wrapper table
                          If yes, keep as convenience view
                          If no, drop after migration
```

**Application Code Changes:**
- Replace `tbl_budget_items` references → `core_fin_fact_budget`
- Replace `tbl_budget_structure` references → `core_fin_category`
- Update queries to use star schema joins

---

## Code Example: Before vs After

### Before (Legacy)
```sql
SELECT
  bs.scope,
  bs.category,
  bs.detail,
  bi.amount,
  bi.quantity
FROM tbl_budget_items bi
JOIN tbl_budget_structure bs ON bi.structure_id = bs.structure_id
WHERE bi.project_id = 123;
```

### After (Consolidated)
```sql
SELECT
  fc.class,          -- Was: bs.scope
  fc.code,           -- Was: bs.category
  fc.detail,
  fb.amount,
  fb.qty              -- Was: bi.quantity
FROM core_fin_fact_budget fb
JOIN core_fin_category fc ON fb.category_id = fc.category_id
WHERE fb.pe_level = 'project'
  AND fb.pe_id = '123';
```

---

## Decision Matrix

| Criterion | `core_fin_*` | `tbl_fin_*` | Hybrid |
|-----------|--------------|-------------|--------|
| **Disruption** | Low (no renames) | High (15 renames) | Medium |
| **Semantic Clarity** | High (framework) | Medium (domain) | Low (split) |
| **Precedent** | ✅ Matches core_doc | ✅ Matches tbl_project | ❌ Inconsistent |
| **Star Schema Fit** | ✅ Natural fit | ⚠️ Unusual for tbl_ | ⚠️ Split model |
| **User Understanding** | Medium | High | Low |
| **Developer Clarity** | High | Medium | Low |

---

## Final Recommendation

### ✅ Consolidate to `core_fin_*` (Keep Existing Prefix)

**Action Items:**
1. ✅ Keep all `core_fin_*` tables as-is
2. ✅ Migrate data from `tbl_budget_*` to `core_fin_*`
3. ✅ Drop legacy tables after successful migration
4. ✅ Update application code to use `core_fin_fact_budget`
5. ✅ Document in schema comments that finance is a framework supporting multiple entities

**Schema Comment Example:**
```sql
COMMENT ON TABLE core_fin_fact_budget IS
'Financial fact table (star schema). Supports budgets and actuals for projects, phases, parcels, and products. Part of the core financial framework.';

COMMENT ON TABLE core_fin_category IS
'Financial chart of accounts. Hierarchical categories supporting both revenue (Source) and expenses (Use). Framework table supporting all financial transactions.';
```

---

## Long-Term: Evolution of Naming Conventions

### Potential Future Prefixes

As the system grows, consider these additional prefixes:

```
wf_*    - Workflow/approval processes
rpt_*   - Reporting tables/materialized views
stg_*   - Staging tables for ETL
arch_*  - Archived data
tmp_*   - Temporary tables (already have tmp_search_results)
int_*   - Integration tables (external system sync)
```

### Deprecation Strategy

When deprecating tables:
1. Add schema comment: `DEPRECATED: Use core_fin_fact_budget instead`
2. Create view with old name pointing to new structure
3. Add trigger to log warnings when old table accessed
4. Set sunset date (e.g., 6 months)
5. Drop after sunset + confirmation no usage

---

**Status:** ✅ Convention Established
**Last Updated:** October 14, 2025
**Total Tables:** 143 tables in `landscape` schema (26 with `tbl_` prefix, including 4 new multifamily tables from Migration 008)

**Conclusion:** The `core_fin_*` prefix should be retained for the consolidated finance system. This maintains consistency with the existing 15 finance tables, clearly signals it's a framework supporting multiple entities, and minimizes disruption. The `tbl_` prefix should remain reserved for primary business domain entities like projects, parcels, phases, and multifamily units.
