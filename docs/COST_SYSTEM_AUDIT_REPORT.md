# Cost/Expense System Discovery Audit Report

**Generated:** 2026-01-26
**Auditor:** Claude Code
**Database:** land_v2 (Neon PostgreSQL)
**Schema:** landscape

---

## Executive Summary

This audit analyzed 49 cost/expense-related tables in the Landscape database to map all cost systems and determine implementation status. Key findings:

1. **Active Systems:** 3 primary cost systems are actively used
2. **Kitchen Sink Fields:** Mostly NOT implemented as columns; implemented via row-based tables
3. **Lifecycle Coverage:** 5/6 stages covered (missing explicit "Financing" in lifecycle_stages)
4. **Recommendation:** Unify on `core_unit_cost_category` + row-based facts

---

## 1. Table Inventory

### Core Cost/Expense Tables (35 tables found)

| Table Name | Columns | Rows | Purpose | Status |
|------------|---------|------|---------|--------|
| `core_unit_cost_category` | 12 | 95 | Global category taxonomy with lifecycle stages | **Active** |
| `core_unit_cost_item` | 19 | 293 | Unit cost templates/benchmarks | **Active** |
| `core_category_lifecycle_stages` | 5 | 94 | Category-to-lifecycle mapping | **Active** |
| `core_category_tag_library` | 9 | 16 | Tag definitions for categories | **Active** |
| `core_fin_fact_budget` | 81 | 86 | Star schema budget facts | **Active** |
| `core_fin_fact_actual` | 12 | 0 | Star schema actual costs | Empty |
| `core_fin_budget_version` | 6 | 5 | Budget version tracking | **Active** |
| `core_fin_funding_source` | 7 | 0 | Funding sources | Empty |
| `core_fin_uom` | 5 | 17 | Units of measure | **Active** |
| `core_fin_curve` | 4 | 0 | Distribution curves | Empty |
| `core_fin_growth_rate_sets` | 10 | 20 | Growth rate definitions | **Active** |
| `core_fin_growth_rate_steps` | 8 | 9 | Growth rate steps | **Active** |
| `tbl_operating_expenses` | 22 | 93 | MF operations P&L (plural form) | **Active** |
| `tbl_operating_expense` | 16 | 116 | Alternate OpEx table (singular) | **Active** |
| `tbl_expense_detail` | 13 | 0 | OpEx line item detail | Empty |
| `tbl_expense_recovery` | 11 | 1 | Lease expense recovery | Sparse |
| `opex_benchmark` | 19 | 29 | OpEx benchmarks by region | **Active** |
| `tbl_opex_accounts_deprecated` | 10 | 40 | Legacy account hierarchy | **Deprecated** |
| `opex_label_mapping` | 8 | 2 | User-learned expense mappings | **Active** |
| `opex_account_migration_map` | 5 | 40 | Migration from old to new accounts | Migration |
| `tbl_budget` | 12 | 2 | Legacy budget table | Legacy |
| `tbl_budget_items` | 20 | 20 | Budget line items (old) | **Active** |
| `tbl_budget_structure` | 14 | 31 | Budget category hierarchy | **Active** |
| `tbl_budget_fact` | 17 | 0 | Budget facts (AI extraction target) | Empty |
| `tbl_capex_reserve` | 20 | 0 | CapEx reserves (MF) | Empty |
| `tbl_capital_reserves` | 14 | 0 | Capital reserves (commercial) | Empty |
| `tbl_capital_call` | 10 | 0 | Capital calls | Empty |
| `tbl_acquisition` | 15 | 5 | Acquisition events | **Active** |
| `tbl_property_acquisition` | 24 | 4 | Property acquisition details | **Active** |
| `tbl_cost_approach` | 25 | 0 | Appraisal cost approach | Empty |
| `tbl_cost_allocation` | 11 | 3 | Cost pool allocations | Sparse |
| `tbl_finance_structure` | 18 | 2 | Finance structure definitions | Sparse |
| `developer_fees` | 14 | 1 | Developer fee calculations | Sparse |
| `tbl_benchmark_unit_cost` | 11 | 0 | Unit cost benchmarks | Empty |
| `tbl_benchmark_transaction_cost` | 10 | 5 | Transaction cost benchmarks | Sparse |

### Status Legend
- **Active:** Regularly used with data
- **Sparse:** Has data but minimal usage
- **Empty:** Table exists but no data
- **Deprecated:** Marked for removal
- **Legacy:** Old system, being replaced
- **Migration:** Helper table for data migration

---

## 2. Data Flow Diagrams

### Operating Expenses Card (MF Operations Tab)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [OperationsTab.tsx]                                                     │
│ src/app/projects/[projectId]/components/tabs/OperationsTab.tsx          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ [useOperationsData Hook]                                                │
│ src/hooks/useOperationsData.ts                                          │
│ Fetches: GET /api/projects/{projectId}/operations                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ [Next.js API Route]                                                     │
│ src/app/api/projects/[projectId]/operations/route.ts                    │
│                                                                         │
│ DUAL DATA SOURCE:                                                       │
│ 1. Primary: tbl_operating_expenses (with parent_category grouping)      │
│ 2. Fallback: core_unit_cost_category (CoA hierarchy where 5xxx)         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│ tbl_operating_expenses          │ │ core_unit_cost_category         │
│ (93 rows)                       │ │ (95 rows, joined via lifecycle) │
│ - expense_category (label)      │ │ - category_name                 │
│ - expense_type (TAXES,etc)      │ │ - account_number (5xxx = OpEx)  │
│ - annual_amount                 │ │ - parent_id (hierarchy)         │
│ - category_id (FK to core)      │ │ - is_calculated                 │
│ - parent_category (UI group)    │ │ - tags (JSONB)                  │
│ - statement_discriminator       │ │ - property_types (array)        │
└─────────────────────────────────┘ └─────────────────────────────────┘
```

### Landscaper AI Extraction Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Landscaper AI Chat]                                                    │
│ Document uploaded → extraction triggered                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ [ExtractionWriter Service]                                              │
│ backend/apps/knowledge/services/extraction_writer.py                    │
│                                                                         │
│ Methods:                                                                │
│ - _write_opex() → routes to opex_utils.upsert_opex_entry()             │
│ - _write_budget() → routes to tbl_budget_fact                           │
│ - _write_unit_upsert() → routes to tbl_multifamily_unit                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ [opex_utils.py]                                                         │
│ backend/apps/knowledge/services/opex_utils.py                           │
│                                                                         │
│ Key Functions:                                                          │
│ - resolve_opex_category() → Maps label to category_id                   │
│ - upsert_opex_entry() → INSERT/UPDATE tbl_operating_expenses            │
│ - persist_parsed_scenarios() → Bulk write from T12/T3                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ [tbl_operating_expenses]                                                │
│ Target table for ALL extracted operating expenses                       │
│                                                                         │
│ Matching strategy:                                                      │
│ 1. Check opex_label_mapping (user-learned)                              │
│ 2. Check OPEX_ACCOUNT_MAPPING (hardcoded aliases)                       │
│ 3. Fuzzy match to core_unit_cost_category                              │
│ 4. Write to tbl_operating_expenses with category_id FK                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Kitchen Sink Implementation Status

### Multifamily OpEx Fields (52 documented, BASKET 3)

| Field Category | Documented | DB Column? | Implementation |
|----------------|------------|------------|----------------|
| Real Estate Taxes | `real_estate_taxes` | ✗ | Row in tbl_operating_expenses |
| Property Insurance | `property_insurance` | ✗ | Row in tbl_operating_expenses |
| Utilities Total | `utilities_total` | ✗ | Calculated from children |
| Water/Sewer | `water_sewer` | ✗ | Row: category_id=67 (5210) |
| Trash Removal | `trash_removal` | ✗ | Row: category_id=68 (5220) |
| Electricity | `electricity` | ✗ | Row: category_id=69 (5230) |
| Gas | `gas` | ✗ | Row: category_id=70 (5240) |
| Repairs & Maint | `repairs_maintenance` | ✗ | Row: category_id=55 (5300) |
| Landscaping | `landscaping` | ✗ | Row: category_id=101 (5331) |
| Pest Control | `pest_control` | ✗ | Row: category_id=82 (5323) |
| Management Fee | `management_fee` | ✗ | Row: category_id=73 (5410) |
| Payroll | `payroll` | ✗ | Row: category_id=89 (5550) |
| Administrative | `administrative` | ✗ | Row: category_id=56 (5400) |

**Summary:** Kitchen sink OpEx fields are NOT implemented as columns. They are stored as rows in `tbl_operating_expenses` with `category_id` foreign key to `core_unit_cost_category`.

### Multifamily CapEx Fields (8 documented)

| Field | Documented | DB Column? | Implementation |
|-------|------------|------------|----------------|
| capex_per_unit_annual | `capex_per_unit_annual` | ✓ | tbl_capex_reserve (empty) |
| immediate_capex | `immediate_capex` | ✓ | tbl_capex_reserve (empty) |
| roof_reserve_per_unit | `roof_reserve_per_unit` | ✓ | tbl_capex_reserve (empty) |
| hvac_reserve_per_unit | `hvac_reserve_per_unit` | ✓ | tbl_capex_reserve (empty) |

**Summary:** CapEx columns exist but table is empty. No data being written.

### Land Development Budget Fields (55 documented)

| Field Category | Documented | DB Column? | Implementation |
|----------------|------------|------------|----------------|
| Land Cost | `acq_land_cost` | ✗ | Via core_fin_fact_budget rows |
| Closing Costs | `acq_closing_costs` | ✗ | Via core_fin_fact_budget rows |
| Entitlement | `soft_entitlement` | ✗ | Via core_fin_fact_budget rows |
| Engineering | `soft_engineering` | ✗ | Via core_fin_fact_budget rows |
| Grading | `hd_grading` | ✗ | Via core_fin_fact_budget rows |
| Water | `hd_water` | ✗ | Via core_fin_fact_budget rows |
| Sewer | `hd_sewer` | ✗ | Via core_fin_fact_budget rows |
| Contingency | `contingency_hard_pct` | ✗ | Via core_fin_fact_budget rows |

**Summary:** Land dev budget fields are NOT columns. They are rows in `core_fin_fact_budget` linked to `core_unit_cost_category` via `category_id`.

---

## 4. Lifecycle Stage Coverage

| Lifecycle Stage | Category Count | Top-Level Categories | Gaps |
|-----------------|----------------|---------------------|------|
| **Acquisition** | 3 | Closing, Legal Fees, Title Insurance | Missing: Due Diligence, Earnest Money |
| **Planning & Engineering** | 7 | Civil Engineering, Environmental Studies, Land Planning | Mostly complete |
| **Improvements** | 28 | Grading, Paving, Utilities, Landscape, etc. | Mostly complete |
| **Operations** | 54 | Taxes & Insurance, Utilities, R&M, Admin, Marketing | Robust coverage |
| **Disposition** | 1 | Closing only | Missing: Broker Fees, Marketing, Legal |
| **Financing** | 0 | NOT IN LIFECYCLE_STAGES | Missing entirely! |

### Financing Gap Detail

The `core_category_lifecycle_stages` table has a constraint allowing these values:
```sql
('Acquisition', 'Planning & Engineering', 'Improvements', 'Operations', 'Disposition', 'Financing')
```

However, **NO categories are mapped to 'Financing'** despite the constraint allowing it.

**Missing Financing Categories:**
- Interest Expense
- Loan Origination Fees
- Points & Closing Costs
- Debt Service
- Loan Draws
- Interest Reserve

---

## 5. Conflict Analysis

### Duplicate/Overlapping Tables

| Issue | Tables Involved | Resolution |
|-------|-----------------|------------|
| Two OpEx tables | `tbl_operating_expenses` (93 rows) vs `tbl_operating_expense` (116 rows) | Use `tbl_operating_expenses` (plural) - has category_id FK, parent_category for UI |
| Deprecated accounts | `tbl_opex_accounts_deprecated` (40 rows) | Migrate to `core_unit_cost_category` - FK still references deprecated table! |
| Budget structure conflict | `tbl_budget_structure` vs `core_unit_cost_category` | Different hierarchies - budget uses scope/category/detail, core uses parent_id tree |

### FK Constraint Issue

`tbl_operating_expenses` has an FK to the DEPRECATED table:
```sql
FOREIGN KEY (account_id) REFERENCES tbl_opex_accounts_deprecated(account_id)
```

This should be migrated to use `category_id` (which also exists on the table).

### Data Consistency

Both `tbl_operating_expense` (singular, 116 rows) and `tbl_operating_expenses` (plural, 93 rows) have data. The API route in `operations/route.ts` uses the **plural** form.

---

## 6. ARGUS Alignment Check

### Expected ARGUS Categories for Operations

| ARGUS Category | core_unit_cost_category Status | Account # |
|----------------|-------------------------------|-----------|
| Taxes & Insurance | ✓ Present | 5100 |
| Utilities | ✓ Present | 5200 |
| Repairs & Maintenance | ✓ Present | 5300 |
| Administrative | ✓ Present (as child of 5600) | 5400 |
| Payroll & Personnel | ✓ Present (as child of 5600) | 5550 |
| Marketing | ✓ Present | 5500 |
| Reserves | ✓ Present | 5990 |
| Management | ✓ Present (as Property Management under 5400) | 5410 |

**Assessment:** ARGUS alignment is GOOD. All major categories exist with proper account numbers.

### Account Number Structure (COA)

```
5100 - Taxes & Insurance
  5110 - Property Taxes
    5111 - Real Estate Taxes
    5112 - Direct Assessment Taxes
  5120 - Insurance

5200 - Utilities
  5210 - Water/Sewer
  5220 - Trash
  5230 - Electricity
  5240 - Gas

5300 - Repairs & Maintenance
  5310 - Repairs & Labor
  5320 - Maintenance Contracts
    5321-5324 - Janitorial, Gardening, Pest, Elevator
  5330 - Misc R&M
  5331 - Landscaping & Grounds
  5332 - Pool & Amenity Service

5400 - Administrative (under 5600 Other)
  5410 - Property Management
  5420 - Professional Services
    5421-5425 - Manager Credit, Phone, Security, License, Internet

5500 - Marketing
  5510 - Advertising

5550 - Payroll & Personnel (under 5600 Other)
  5551-5556 - Manager Salary, Credits, Leasing, Maint, Taxes, Benefits

5600 - Other Operating Expenses (parent for Admin & Payroll)
5700 - HOA & Amenity Operations (Land Dev specific)
5800 - Common Area Maintenance (Land Dev specific)
5900 - Marketing (Land Dev specific)
5990 - Reserves
  5991 - Replacement Reserves
  5992 - Capital Expenditure Reserve
```

---

## 7. Recommendation

### Option A: Unify on Unit Cost Categories (RECOMMENDED)

**Rationale:**
1. `core_unit_cost_category` already has 95 categories with proper ARGUS-aligned account numbers
2. Lifecycle stage mapping exists (94 mappings)
3. `core_fin_fact_budget` (81 columns) is a robust star schema for facts
4. `tbl_operating_expenses` already has `category_id` FK to this table

**Migration Steps:**

1. **Drop deprecated FK:**
   ```sql
   ALTER TABLE tbl_operating_expenses DROP CONSTRAINT tbl_operating_expenses_account_id_fkey;
   ALTER TABLE tbl_operating_expenses DROP COLUMN account_id;
   ```

2. **Add Financing lifecycle categories:**
   ```sql
   INSERT INTO core_unit_cost_category (category_name, account_number, parent_id)
   VALUES
     ('Financing Costs', '6100', NULL),
     ('Interest Expense', '6110', (SELECT category_id FROM core_unit_cost_category WHERE account_number = '6100')),
     ('Loan Fees', '6120', (SELECT category_id FROM core_unit_cost_category WHERE account_number = '6100'));

   INSERT INTO core_category_lifecycle_stages (category_id, activity)
   SELECT category_id, 'Financing' FROM core_unit_cost_category WHERE account_number LIKE '61%';
   ```

3. **Consolidate OpEx tables:**
   - Migrate data from `tbl_operating_expense` (singular) to `tbl_operating_expenses` (plural)
   - Drop singular table after migration
   - The plural table has `category_id` + `parent_category` for both system mapping and UI grouping

4. **Kitchen Sink fields remain row-based:**
   - Do NOT add columns for each expense type
   - Use `tbl_operating_expenses` rows with `expense_category` label and `category_id` FK
   - UI groups by `parent_category` for drag-and-drop categorization

**Benefits:**
- Single source of truth for cost taxonomy
- ARGUS-aligned account numbers
- Supports all 6 lifecycle stages
- Works across property types (MF, Office, Retail, Land Dev)
- Existing AI extraction pipeline already targets this structure

### Option B: Separate Systems by Context (NOT RECOMMENDED)

This would require:
- Keeping multiple table hierarchies
- Custom UI for each property type
- Difficult to maintain consistency

### Option C: Column-Based Kitchen Sink (NOT RECOMMENDED)

This would require:
- Adding 50+ columns to project/property tables
- Breaking the flexible category system
- Making it impossible to add new expense types without schema changes

---

## 8. Immediate Action Items

1. **HIGH:** Add Financing lifecycle categories (0 categories exist)
2. **HIGH:** Migrate `tbl_opex_accounts_deprecated` FK to `category_id`
3. **MEDIUM:** Consolidate `tbl_operating_expense` (singular) into `tbl_operating_expenses` (plural)
4. **MEDIUM:** Add missing Disposition categories (Broker Fees, Marketing, Legal)
5. **LOW:** Populate empty CapEx tables or decide to deprecate them
6. **LOW:** Clean up orphaned tables (tbl_budget, tbl_budget_fact with 0 rows)

---

## Appendix: SQL Queries Used

### Find All Cost/Expense Tables
```sql
SELECT table_name, column_count
FROM information_schema.tables t
WHERE table_schema = 'landscape'
AND (table_name ILIKE '%expense%' OR table_name ILIKE '%cost%'
     OR table_name ILIKE '%budget%' OR table_name ILIKE '%fin_%');
```

### Count Records Per Table
```sql
SELECT 'core_unit_cost_category', COUNT(*) FROM landscape.core_unit_cost_category
UNION ALL SELECT 'tbl_operating_expenses', COUNT(*) FROM landscape.tbl_operating_expenses
-- etc.
```

### Check Lifecycle Coverage
```sql
SELECT DISTINCT activity, COUNT(*)
FROM landscape.core_category_lifecycle_stages
GROUP BY activity;
```

---

**Report Complete.** Save this file for reference when implementing the recommended migration.
