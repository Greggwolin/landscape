# Cashflow Tab Tools Audit

**Generated:** 2026-01-30
**Branch:** `feature/folder-tabs`

---

## Overview

The Cashflow tab (under Valuation folder for Land Development projects) consists of two main components:
1. **Assumptions Panel** (left sidebar, 280px) - Editable inputs
2. **Cash Flow Analysis** (main content) - Filters, controls, and data display

---

## Input Audit

### 1. Assumptions Panel - Inflation Section
| Input | Type | Database Field | Table | Tool |
|-------|------|----------------|-------|------|
| Price Growth | dropdown | `price_growth_set_id` | `tbl_dcf_analysis` | `update_cashflow_assumption` |
| Cost Inflation | dropdown | `cost_inflation_set_id` | `tbl_dcf_analysis` | `update_cashflow_assumption` |

### 2. Assumptions Panel - DCF Parameters Section
| Input | Type | Database Field | Table | Tool |
|-------|------|----------------|-------|------|
| Bulk Sale at (period type) | dropdown | `bulk_sale_period_type` | `tbl_dcf_analysis` | `update_cashflow_assumption` |
| Bulk Sale at (period value) | number | `bulk_sale_period` | `tbl_dcf_analysis` | `update_cashflow_assumption` |
| Discount Rate | percent input | `discount_rate` | `tbl_dcf_analysis` | `update_cashflow_assumption` |
| Selling Costs | percent input | `selling_costs_pct` | `tbl_dcf_analysis` | `update_cashflow_assumption` |

### 3. Assumptions Panel - Results Section (Read-Only)
| Display | Source | Tool to Read |
|---------|--------|--------------|
| Gross Profit | Cash flow calculation | `get_cashflow_results` |
| IRR | Cash flow calculation | `get_cashflow_results` |
| Peak Equity | Cash flow calculation | `get_cashflow_results` |
| NPV (with discount rate) | Cash flow calculation | `get_cashflow_results` |

### 4. Cash Flow Analysis - Hierarchy Filters
| Filter | Type | Data Source | Tool |
|--------|------|-------------|------|
| Villages (Areas) | multi-select buttons | `tbl_container` (level 1) | `get_areas` |
| Phases | multi-select buttons | `tbl_container` (level 2) | `get_phases` |
| Select All | action button | N/A | N/A (client-side) |

### 5. Cash Flow Analysis - Time/View Controls
| Control | Type | Options | Tool |
|---------|------|---------|------|
| Time Scale | toggle buttons | Monthly, Quarterly, Annual, Overall | N/A (client-side only) |
| Cost Granularity | toggle buttons | Summary, By Stage, By Category, By Phase | N/A (client-side only) |

### 6. Cash Flow Analysis - Export
| Action | Type | Current Implementation |
|--------|------|------------------------|
| Export Report | dropdown button | Uses `ExportButton` component with `tabName="Feasibility-CashFlow"` |

### 7. Cash Flow Analysis - Summary Metrics (Read-Only)
| Metric | Display |
|--------|---------|
| Gross Revenue | Card with value |
| Net Revenue | Card with value |
| Total Costs | Card with value |
| Gross Profit | Card with margin % |
| IRR | Card with "Annualized" label |
| Equity Multiple | Card with Peak value |

---

## Tools Required for Cashflow Tab

### Core DCF Tools (MUST HAVE)
1. `get_cashflow_results` - Read the authoritative cash flow assumptions and results
2. `compute_cashflow_expression` - Evaluate math expressions against cash flow results
3. `update_cashflow_assumption` - Update DCF parameters (discount_rate, selling_costs_pct, bulk_sale_period, etc.)

### Project Context Tools
4. `get_project_fields` - Read project metadata
5. `update_project_field` - Update project fields (if needed)
6. `get_field_schema` - Understand available fields

### Hierarchy Tools (for filtering)
7. `get_areas` - Get areas/villages for filter
8. `get_phases` - Get phases for filter
9. `get_parcels` - Get parcels (if needed for drill-down)

### Growth Rate Tools (for inflation dropdowns)
10. `get_benchmarks` - Read available growth rate benchmarks (used by GrowthRateSelect)

### Market/Absorption Context (informational)
11. `get_absorption_schedule` - Understand sales timing
12. `get_market_assumptions` - Read market context

---

## Tools NOT Needed on Cashflow Tab

These tools are for other contexts and should be excluded:

- All `*_cre_*` tools (CRE tenants, spaces, leases) - Land Dev doesn't use these
- All `*_unit*` tools (unit types, units) - Multifamily specific
- All `*_rental_comp*` tools - CRE specific
- All `*_hbu_*` tools - Highest & Best Use analysis
- All `*_extraction*` tools - Document processing
- All `*_knowledge*` tools - RAG/knowledge graph
- All `*_budget_*` tools - Budget tab specific
- All `*_debt_*`, `*_equity_*`, `*_waterfall_*` tools - Capitalization tab specific
- All `*_document*` tools - Documents tab specific
- All `*_contact*` tools - Contact management

---

## Recommended Tool Set: `cashflow`

```python
CASHFLOW_TOOLS = [
    # Core DCF
    'get_cashflow_results',
    'compute_cashflow_expression',
    'update_cashflow_assumption',

    # Project context
    'get_project_fields',
    'update_project_field',
    'get_field_schema',

    # Hierarchy (for filters)
    'get_areas',
    'get_phases',
    'get_parcels',

    # Benchmarks (for growth rate dropdowns)
    'get_benchmarks',

    # Market context
    'get_absorption_schedule',
    'get_market_assumptions',
]
```

**Total: 12 tools** (vs 135 in default set)

---

## Missing Functionality

### Export Tools
The Export button on the Cashflow tab uses `ExportButton` component which likely calls existing report generation APIs. Need to verify if Landscaper needs tools for this.

**Investigation needed:**
- Check if `export_cashflow_excel` or `export_cashflow_pdf` tools exist
- If not, consider whether Landscaper should be able to trigger exports

---

## Implementation Notes

### Context Detection
The Landscaper component should detect when it's on the Cashflow tab by:
1. Checking the `page_context` parameter in the thread/messages API
2. Or by checking the current URL route (`/results` for land dev)

### Existing Code Pattern
The `ai_handler.py` already has `LANDSCAPER_TOOLS` as a list. We need to:
1. Define `TOOL_SETS` dictionary with context -> tool list mapping
2. Filter `LANDSCAPER_TOOLS` based on context before passing to Claude
3. Pass context from frontend when creating messages

---

## Implementation Status

### Completed (2026-01-30)

1. [x] **Define `TOOL_SETS` in `ai_handler.py`**
   - Added `CASHFLOW_TOOL_NAMES` set with 12 tools
   - Added `TOOL_SET_NAMES` dictionary mapping contexts to tool sets
   - Added `get_tools_for_context()` function for filtering

2. [x] **Add `page_context` parameter to Landscaper message API**
   - Updated `get_landscaper_response()` in `ai_handler.py` with `page_context` parameter
   - Updated `ChatMessageViewSet.create()` in `views.py` to extract and pass `page_context`
   - Updated knowledge module's `get_landscaper_response()` to also accept `page_context`
   - Updated `chat_views.py` to pass `page_context` through

3. [x] **Update frontend to pass context**
   - Updated `useLandscaperThreads.ts` to pass `page_context` in message body
   - Updated Next.js API route to forward `page_context` to Django

### Files Modified

**Backend:**
- `backend/apps/landscaper/ai_handler.py` - Added TOOL_SETS and get_tools_for_context()
- `backend/apps/landscaper/views.py` - Pass page_context to AI handler
- `backend/apps/knowledge/services/landscaper_ai.py` - Use context-filtered tools
- `backend/apps/knowledge/views/chat_views.py` - Extract and pass page_context

**Frontend:**
- `src/hooks/useLandscaperThreads.ts` - Pass page_context in sendMessage
- `src/app/api/projects/[projectId]/landscaper/chat/route.ts` - Forward page_context

### Pending

4. [ ] Test with long conversations to verify tool use reliability
5. [ ] Consider adding export tools if needed
