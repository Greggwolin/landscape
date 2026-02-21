# Alpha Help API Audit Report

**Date:** 2026-02-18
**Auditor:** Claude Code
**Scope:** Read-only audit of `GET /api/knowledge/platform/alpha-help/` endpoint coverage

---

## 1. Frontend Page Context Format (Confirmed)

**Source:** `src/contexts/HelpLandscaperContext.tsx` → `buildCurrentPage()`

The `page_context` query parameter is built from URL search params:

```
/projects/17?folder=valuation&tab=income  →  "valuation_income"
/projects/17?folder=property&tab=rent-roll →  "property_rent-roll"
/projects/17?folder=operations             →  "operations"
/projects/17                                →  "home"
```

**Format:** `${folder}_${tab}` when both exist, `${folder}` when tab is absent.

**Critical:** Both MF and Land Dev use the **same folder IDs** (no `land_` prefix). A Land Dev project at `?folder=property&tab=land-use` sends `property_land-use`, not `land_property_land-use`.

---

## 2. Django Endpoint Location & Content Source

| Item | Value |
|------|-------|
| **View** | `AlphaHelpView` in `backend/apps/knowledge/views/alpha_views.py` |
| **URL** | `GET /api/knowledge/platform/alpha-help/?page_context=...` |
| **Permissions** | `AllowAny` (no auth required) |
| **Data source** | `tbl_platform_knowledge_chunks` table |
| **Filter** | `category = 'alpha_docs' AND metadata->>'page_name' = {page_context}` |
| **Content types matched** | `content_type = 'alpha_help'` OR `section_title` containing "what you can do"/"coming soon"/"tips" |
| **Response** | `{ what_you_can_do: [], coming_soon: [], tips: [] }` |

---

## 3. Test Results — All 24 Page Contexts

### Coverage Summary

| Metric | Count |
|--------|-------|
| Total contexts tested | **24** |
| With content | **3** (12.5%) |
| Empty | **21** (87.5%) |
| Errors | **0** |

### Detailed Results

| Page Context | Description | WYD | CS | Tips | Status |
|-------------|-------------|-----|-----|------|--------|
| `home` | Home (Project Dashboard) | 0 | 0 | 0 | EMPTY |
| `property_details` | Property > Details (MF) | 0 | 0 | 0 | EMPTY |
| `property_acquisition` | Property > Acquisition | 0 | 0 | 0 | EMPTY |
| `property_market` | Property > Market | 0 | 0 | 0 | EMPTY |
| `property_rent-roll` | Property > Rent Roll (MF) | 0 | 0 | 0 | EMPTY |
| `property_renovation` | Property > Renovation (MF) | 0 | 0 | 0 | EMPTY |
| **`operations`** | **Operations (MF)** | **90** | **0** | **0** | **OK** |
| `valuation_sales-comparison` | Valuation > Sales Comparison | 0 | 0 | 0 | EMPTY |
| `valuation_cost` | Valuation > Cost Approach | 0 | 0 | 0 | EMPTY |
| `valuation_income` | Valuation > Income Approach | 0 | 0 | 0 | EMPTY |
| `capital_equity` | Capital > Equity | 0 | 0 | 0 | EMPTY |
| `capital_debt` | Capital > Debt | 0 | 0 | 0 | EMPTY |
| `reports_summary` | Reports > Summary | 0 | 0 | 0 | EMPTY |
| `reports_export` | Reports > Export | 0 | 0 | 0 | EMPTY |
| `reports_investment_committee` | Reports > Inv. Committee | 0 | 0 | 0 | EMPTY |
| **`documents`** | **Documents** | **166** | **0** | **0** | **OK** |
| **`map`** | **Map** | **78** | **0** | **0** | **OK** |
| `property_land-use` | Property > Land Use (LAND) | 0 | 0 | 0 | EMPTY |
| `property_parcels` | Property > Parcels (LAND) | 0 | 0 | 0 | EMPTY |
| `budget_budget` | Budget > Budget (LAND) | 0 | 0 | 0 | EMPTY |
| `budget_sales` | Budget > Sales (LAND) | 0 | 0 | 0 | EMPTY |
| `feasibility_cashflow` | Feasibility > Cash Flow (LAND) | 0 | 0 | 0 | EMPTY |
| `feasibility_returns` | Feasibility > Returns (LAND) | 0 | 0 | 0 | EMPTY |
| `feasibility_sensitivity` | Feasibility > Sensitivity (LAND) | 0 | 0 | 0 | EMPTY |

---

## 4. Root Cause Analysis

### Problem 1: Page Name Mismatches

The frontend sends page_context strings that **do not match** the `page_name` values stored in the database.

| Frontend sends | DB stores | Chunks | Issue |
|---------------|-----------|--------|-------|
| `home` | `project_home` | 11 | Different name |
| `home` | `home` | 2 | Only `task_guide` content_type (not matched by filter) |
| `property_rent-roll` | `rent_roll` | 5 | Different name + format (hyphen vs underscore) |
| `valuation_sales-comparison` | `valuation_sales_comp` | 3 | Different name (abbreviated) |
| `property_details` | `property_details` | 2 | Name matches but `content_type = 'task_guide'` (not matched by filter) |
| `valuation_cost` | `valuation_cost` | 2 | Name matches but `content_type = 'task_guide'` (not matched) |
| `valuation_income` | `valuation_income` | 6 | Name matches but content_types are `task_guide`, `argus_crosswalk`, `data_flow`, `calculation_explanation` (none matched) |
| `property_market` | (no entry) | 0 | Page has no chunks at all |
| `property_acquisition` | (no entry) | 0 | Page has no chunks at all |
| `property_renovation` | (no entry) | 0 | Page has no chunks at all |

### Problem 2: Content Type Filter Too Narrow

The `AlphaHelpView._get_help_chunks()` SQL filter only matches:
- `metadata->>'content_type' = 'alpha_help'`
- `metadata->>'section_title' ILIKE '%what you can do%'`
- `metadata->>'section_title' ILIKE '%coming soon%'`
- `metadata->>'section_title' ILIKE '%tips%'`

But the training content ingested via `ingest_help_training_content.py` uses content_types: `task_guide`, `data_flow`, `argus_crosswalk`, `excel_crosswalk`, `calculation_explanation`, `tester_notes`, `deflection`. **None of these match the filter.**

### Problem 3: Content Quality for Matched Pages

The 3 pages that DO return content (operations=90, documents=166, map=78) are returning **developer-facing status notes** (e.g., "January 27, 2026 - Operating Expense Inline Editing: ✅ ItemNameEditor..."), not user-facing help. The `alpha_help` content_type was used for developer docs ingested via `ingest_platform_docs.py`, not the user-facing training content ingested via `ingest_help_training_content.py`.

---

## 5. DB Inventory — All 19 page_name Values

| DB page_name | Chunks | Content Types | Reachable from Frontend? |
|-------------|--------|---------------|-------------------------|
| `benchmarks` | 6 | alpha_help | No (no frontend page) |
| `budget` | 3 | alpha_help | No (frontend sends `budget_budget`) |
| `capital` | 1 | task_guide | No (frontend sends `capital_equity`/`capital_debt`) |
| `capitalization` | 10 | alpha_help, technical | No (frontend sends `capital_equity`/`capital_debt`) |
| `documents` | 47 | alpha_help, deflection, task_guide, technical, tester_notes | **Yes** (matched) |
| `general` | 5 | argus_crosswalk, excel_crosswalk, task_guide | No (no frontend page) |
| `home` | 2 | task_guide | Partial (name matches but content_type not matched) |
| `landscaper` | 20 | alpha_help, technical | No (no frontend page) |
| `map` | 17 | alpha_help, deflection, technical | **Yes** (matched) |
| `operations` | 20 | alpha_help, argus_crosswalk, data_flow, task_guide, technical | **Yes** (matched) |
| `project_home` | 11 | alpha_help, technical | No (frontend sends `home`) |
| `property` | 36 | alpha_help, deflection, technical, tester_notes | No (frontend sends `property_details`, etc.) |
| `property_details` | 2 | task_guide | Partial (name matches but content_type not matched) |
| `rent_roll` | 5 | argus_crosswalk, data_flow, excel_crosswalk, task_guide | No (frontend sends `property_rent-roll`) |
| `reports` | 3 | alpha_help, task_guide | No (frontend sends `reports_summary`/`reports_export`) |
| `valuation` | 11 | alpha_help, technical | No (frontend sends `valuation_income`, etc.) |
| `valuation_cost` | 2 | task_guide | Partial (name matches but content_type not matched) |
| `valuation_income` | 6 | argus_crosswalk, calculation_explanation, data_flow, task_guide | Partial (name matches but content_type not matched) |
| `valuation_sales_comp` | 3 | argus_crosswalk, task_guide | No (frontend sends `valuation_sales-comparison`) |

---

## 6. Recommendations (Not Implemented — Audit Only)

### Fix 1: Normalize page_context in the Django view

Add a mapping dict in `AlphaHelpView` that translates frontend strings to DB page_names:

```python
PAGE_CONTEXT_NORMALIZE = {
    'home': 'project_home',
    'property_rent-roll': 'rent_roll',
    'valuation_sales-comparison': 'valuation_sales_comp',
    'capital_equity': 'capitalization',
    'capital_debt': 'capitalization',
    'reports_summary': 'reports',
    'reports_export': 'reports',
    'budget_budget': 'budget',
    # etc.
}
```

### Fix 2: Broaden the content_type filter

Include `task_guide`, `data_flow`, and `deflection` content types in the SQL query, with appropriate categorization:

- `task_guide` → `what_you_can_do`
- `deflection` → `coming_soon`
- `tester_notes` → `tips`

### Fix 3: Ingest user-facing structured content

The existing chunks are developer status notes. Need dedicated user-facing content with structured "What You Can Do" / "Coming Soon" / "Tips" sections for each page/tab combination.

---

## 7. Files Referenced

| File | Purpose |
|------|---------|
| `src/contexts/HelpLandscaperContext.tsx` | `buildCurrentPage()` — generates page_context string |
| `src/components/help/HelpLandscaperPanel.tsx` | `PageGuide` component — fetches and displays content |
| `src/lib/utils/folderTabConfig.ts` | Folder/tab ID definitions per property type |
| `backend/apps/knowledge/views/alpha_views.py` | `AlphaHelpView` — the endpoint under test |
| `backend/apps/knowledge/urls.py` (line 94) | URL routing |
| `backend/apps/knowledge/management/commands/ingest_help_training_content.py` | Training content source |
| `backend/apps/knowledge/management/commands/ingest_platform_docs.py` | Developer docs ingestion |
