# Landscaper Tool Gap Analysis — From Data Clerk to Analyst

**Date:** April 17, 2026
**Context:** 233 tools registered. Moving to conversational-first UI (`/w/` routes). Current tools are CRUD-heavy — they let Landscaper read and write data. What's missing is the layer that lets Landscaper **compute, compare, synthesize, and deliver**.

**Methodology:** Audited all 233 registered tools against backend endpoints, then mapped against what a CRE professional would actually say in a conversational interface.

---

## Gap 1: Calculation Invocation

**The problem:** Backend has 7 computation-triggering endpoints (IRR, NPV, DSCR, metrics bundle, waterfall, cash flow, MF cash flow). Landscaper has `get_cashflow_results` and `compute_cashflow_expression` but **cannot invoke the financial engine directly**. If a user asks "what's my IRR?", Landscaper can only read a pre-computed result — it can't trigger the calculation.

**Backend endpoints that exist but have no tool:**

| Endpoint | What it computes |
|----------|-----------------|
| `POST /api/calculations/irr/` | Internal rate of return |
| `POST /api/calculations/npv/` | Net present value |
| `POST /api/calculations/dscr/` | Debt service coverage ratio |
| `POST /api/calculations/metrics/` | All metrics in one call (CoC, IRR, NPV, DSCR, EM) |
| `POST /api/calculations/waterfall/calculate/` | Waterfall distribution across tiers |
| `POST /api/projects/{id}/calculate_cashflow/` | Period-by-period cash flow |
| `POST /api/projects/{id}/calculate_mf_cashflow/` | MF-specific: levered/unlevered IRR, debt service schedule |

**Proposed tools:**

### `calculate_project_metrics`
Triggers the metrics bundle endpoint. Returns IRR, NPV, DSCR, cash-on-cash, equity multiple in one call. This is the "is this a good deal?" tool.

```
Input: { project_id (required), hold_period_years (optional), discount_rate (optional) }
Output: { irr, npv, dscr, cash_on_cash, equity_multiple, cap_rate_going_in, cap_rate_terminal }
```

### `calculate_cash_flow`
Triggers period-by-period cash flow generation. Returns the full schedule or a summary depending on detail level requested.

```
Input: { project_id (required), detail_level: "summary" | "annual" | "monthly" (default: "annual") }
Output: { periods[], noi_by_period[], debt_service_by_period[], cash_flow_after_debt[], totals }
```

### `calculate_waterfall`
Triggers waterfall distribution calculation. Returns per-tier distributions.

```
Input: { project_id (required) }
Output: { tiers[]: { name, pref_return, promote_split, distributions, irr } }
```

### `calculate_mf_cashflow`
MF-specific — returns the full levered/unlevered analysis with debt service schedule.

```
Input: { project_id (required), hold_period_years (optional) }
Output: { levered_irr, unlevered_irr, npv, equity_multiple, dscr, debt_service_schedule[], cash_flow_series[] }
```

**Backend work required:** Minimal — endpoints exist. Tools just need to call them via `requests` or Django internal routing and format the response.

**Priority:** HIGH — this is the most visible gap. "What's my IRR?" is the first thing every user will ask.

---

## Gap 2: Report Generation from Chat

**The problem:** 20 report generators exist with real SQL. PDF and Excel export work via `reportlab` and `openpyxl`. Preview endpoint returns JSON. But Landscaper has no tool to trigger any of this. A user saying "generate the rent roll report" or "give me a PDF of the cash flow analysis" has no tool path.

**Backend endpoints that exist but have no tool:**

| Endpoint | What it does |
|----------|-------------|
| `GET /api/reports/definitions/` | Lists available reports |
| `GET /api/reports/definitions/by-type/{type}/` | Reports for property type |
| `GET /api/reports/{code}/preview/{project_id}/` | Generates report as JSON |
| `POST /api/reports/{code}/export/{project_id}/?format=pdf` | Generates PDF |
| `POST /api/reports/{code}/export/{project_id}/?format=excel` | Generates Excel |

**Proposed tools:**

### `list_available_reports`
Returns the report catalog filtered by project's property type. Lets Landscaper know what it can generate.

```
Input: { project_id (optional — filters by property type if provided) }
Output: { reports[]: { code, name, description, category, data_readiness } }
```

### `generate_report_preview`
Generates report data as structured JSON. Landscaper can then narrate the findings conversationally.

```
Input: { project_id (required), report_code (required) }
Output: { report_name, sections[]: { title, data } }
```

### `export_report`
Generates PDF or Excel and returns a download URL. This is the "send me the proforma" tool.

```
Input: { project_id (required), report_code (required), format: "pdf" | "excel" (default: "pdf") }
Output: { download_url, filename, format, generated_at }
```

**Backend work required:** Moderate — the export endpoint returns a binary file, so the tool needs to save it to a temp location (or UploadThing) and return a URL. Preview endpoint is ready as-is.

**Priority:** HIGH — users will expect to get deliverables out of the chat. "Email me the report" is a natural next step after analysis.

---

## Gap 3: Cross-Project Comparison

**The problem:** Portfolio CRUD endpoints exist (list, create, add members, waterfall tiers, results). But Landscaper has only 3 read-only portfolio tools (`get_portfolio_summary`, `get_portfolio_assumptions`, `get_project_assumptions_detail`). There's no way to compare two projects side-by-side or manage portfolio membership from chat.

**Proposed tools:**

### `compare_projects`
Pulls key metrics for 2+ projects and returns a side-by-side comparison table. Doesn't require a portfolio — just project IDs.

```
Input: { project_ids: [int, int, ...], metrics: ["irr", "npv", "dscr", "cap_rate", "noi", "price_per_unit"] (optional — defaults to all) }
Output: { projects[]: { project_id, project_name, property_type, metrics: { irr, npv, ... } } }
```

### `create_portfolio`
Creates a portfolio and adds member projects. Wraps the portfolio CRUD endpoints.

```
Input: { name (required), project_ids: [int, ...] (required), description (optional) }
Output: { portfolio_id, name, member_count }
```

### `get_portfolio_cashflows`
Returns the stacked/aggregated cash flows across portfolio members. Wraps the portfolio results endpoint.

```
Input: { portfolio_id (required), from_period (optional), to_period (optional) }
Output: { aggregated_cashflow[], per_project_cashflows[], fund_level_metrics }
```

**Backend work required:** `compare_projects` needs a new lightweight endpoint that calls the metrics endpoint for each project and assembles the comparison. Portfolio tools mostly wrap existing endpoints.

**Priority:** MEDIUM-HIGH — comparison is core to investment decision-making. "How does this compare to the Torrance deal?" is a natural question.

---

## Gap 4: Synthesis / Summary Tools

**The problem:** Landscaper can read individual data points from 233 tools, but assembling a deal overview requires 5-10 sequential tool calls. A dedicated summary tool that returns a pre-assembled KPI snapshot would be faster, cheaper on tokens, and more reliable.

**Proposed tools:**

### `get_deal_summary`
Returns a comprehensive snapshot: property basics, key financial metrics, NOI, debt terms, valuation approaches, and data completeness flags. One call replaces 6-8 individual reads.

```
Input: { project_id (required) }
Output: {
  property: { name, type, address, units/sf/acres, year_built },
  financials: { purchase_price, noi, cap_rate, irr, dscr, equity_multiple },
  debt: { loan_amount, ltv, rate, term, amortization },
  valuation: { sales_comp_value, cost_value, income_value, reconciled_value },
  data_completeness: { rent_roll: true, budget: true, comps: false, ... }
}
```

### `get_risk_summary`
Identifies and summarizes key risk factors: high vacancy, below-market rents, deferred maintenance, market softness, loan maturity, concentration risk.

```
Input: { project_id (required) }
Output: { risk_factors[]: { category, severity: "low"|"medium"|"high", description, data_point } }
```

### `get_data_completeness`
Returns what's populated vs. missing for a project. Helps Landscaper guide the user on what to fill in next.

```
Input: { project_id (required) }
Output: { sections: { property: { complete: 8, missing: 3, fields: [...] }, rent_roll: ..., budget: ..., comps: ..., operations: ... } }
```

**Backend work required:** `get_deal_summary` needs a new endpoint that aggregates from multiple tables in a single query. Could be built as a Django view that calls existing serializers internally. `get_risk_summary` needs analysis logic — moderate effort. `get_data_completeness` is mostly metadata queries — lighter.

**Priority:** HIGH — `get_deal_summary` should be one of the first tools built. It's the answer to "tell me about this deal" which will be the most common opening question. `get_data_completeness` is critical for onboarding — Landscaper needs to know what's missing to guide the user.

---

## Gap 5: Export / Delivery

**The problem:** Users will say "send me the proforma" or "export the rent roll to Excel." The backend can generate PDF and Excel files, but Landscaper has no tool to trigger export and return a link. (Report export covers formal reports — this gap is about ad-hoc data exports.)

**Proposed tools:**

### `export_data_to_excel`
Exports a specific data set (rent roll, budget, comps, operating statement) to Excel and returns a download link.

```
Input: { project_id (required), data_type: "rent_roll" | "budget" | "comps" | "operating_statement" | "absorption_schedule" (required) }
Output: { download_url, filename, row_count }
```

### `export_data_to_csv`
Lighter-weight export for quick data pulls.

```
Input: { project_id (required), data_type (required) }
Output: { download_url, filename, row_count }
```

**Backend work required:** Moderate — needs new export views that query data and generate files via `openpyxl`. Could reuse report generator patterns. File hosting via UploadThing or temp URL.

**Priority:** MEDIUM — important for alpha testers who want to take data out of the platform, but not blocking core analysis workflow.

---

## Gap 6: Debt / Financing Analysis

**The problem:** Loan CRUD exists (get/update/delete loans, equity structure, waterfall tiers). Construction loan service exists as a backend class. But there's no analytical tool — Landscaper can read loan terms but can't answer "what happens if I refi at 5.5%?" or "show me the draw schedule."

**Proposed tools:**

### `analyze_debt_scenarios`
Compares current debt structure against an alternative scenario. Returns side-by-side debt service, DSCR, and cash flow impact.

```
Input: { project_id (required), scenario: { rate, term, amortization, ltv, io_period } }
Output: { current: { payment, dscr, total_interest }, proposed: { payment, dscr, total_interest }, delta: { monthly_savings, dscr_change, total_interest_savings } }
```

### `get_construction_draw_schedule`
Returns the construction loan draw schedule with period-by-period draws, interest accrual, and balance.

```
Input: { project_id (required) }
Output: { schedule[]: { period, draw_amount, accrued_interest, ending_balance }, summary: { commitment, peak_balance, total_interest } }
```

### `calculate_debt_capacity`
Given a target DSCR, calculates maximum loan amount the project can support.

```
Input: { project_id (required), target_dscr (default: 1.25), rate (optional), term (optional), amortization (optional) }
Output: { max_loan_amount, implied_ltv, annual_debt_service, noi_used }
```

**Backend work required:** `get_construction_draw_schedule` wraps the existing service. `analyze_debt_scenarios` and `calculate_debt_capacity` need new calculation logic — moderate effort, but the financial engine has the building blocks.

**Priority:** MEDIUM-HIGH — debt analysis is core to every deal. "Can this deal support more debt?" is a standard question.

---

## Gap 7: Timeline / Scheduling

**The problem:** No backend timeline or Gantt endpoints exist. Development phasing, construction schedules, and absorption timing are implicit in the data (phase start dates, absorption periods, construction loan draw schedules) but there's no consolidated timeline view.

**Proposed tools:**

### `get_project_timeline`
Assembles a consolidated timeline from existing data: phase milestones, absorption periods, construction draws, loan maturity, hold period.

```
Input: { project_id (required) }
Output: { events[]: { name, start_date, end_date, category: "construction"|"absorption"|"financing"|"milestone", status } }
```

### `get_absorption_forecast`
Returns the absorption timeline with units/lots sold per period and cumulative progress.

```
Input: { project_id (required) }
Output: { periods[]: { date, units_sold, cumulative, revenue, pct_complete }, summary: { total_units, absorption_rate_monthly, sellout_date } }
```

**Backend work required:** `get_project_timeline` needs a new endpoint that aggregates dates from multiple tables (milestones, phases, loans, absorption). No new calculation — just assembly. `get_absorption_forecast` mostly wraps existing absorption schedule data with calculated totals.

**Priority:** MEDIUM — useful for land dev projects especially. Less critical for income property valuations.

---

## Gap 8: Market Context Beyond Comps

**The problem:** Demographics endpoint exists (`GET /api/v1/location-intelligence/demographics/`) but Landscaper can't access it. There are comp CRUD tools and `search_irem_benchmarks`, but no tool that returns the market-level context (population, income, growth trends) that frames every valuation.

**Proposed tools:**

### `get_demographics`
Returns Census ACS demographics for the project location at 1/3/5-mile rings.

```
Input: { project_id (required), radius_miles: [1, 3, 5] (optional — defaults to all three) }
Output: { rings[]: { radius, population, median_household_income, median_home_value, pct_owner_occupied, pct_renter, median_age, growth_rate } }
```

### `get_market_summary`
Assembles market context from multiple sources: demographics, comparable activity, IREM benchmarks, and any stored market intelligence from appraisals.

```
Input: { project_id (required) }
Output: { demographics: {...}, comp_activity: { avg_cap_rate, avg_price_per_unit, sample_size }, benchmarks: { expense_ratio, management_pct }, market_intel: { vacancy_trend, rent_trend, supply_pipeline } }
```

**Backend work required:** `get_demographics` wraps the existing location-intelligence endpoint — minimal work. `get_market_summary` needs an aggregation endpoint — moderate.

**Priority:** MEDIUM-HIGH — market context is required for every appraisal narrative and investment memo. "What's the market like around this property?" is a day-one question.

---

## Implementation Priority Matrix

| Priority | Tool | Backend Effort | User Impact |
|----------|------|---------------|-------------|
| **P1** | `calculate_project_metrics` | Low (endpoint exists) | Answers "is this a good deal?" |
| **P1** | `get_deal_summary` | Medium (aggregation endpoint) | Answers "tell me about this deal" |
| **P1** | `get_data_completeness` | Low (metadata queries) | Guides onboarding — "what's missing?" |
| **P1** | `calculate_cash_flow` | Low (endpoint exists) | Core analysis output |
| **P1** | `generate_report_preview` | Low (endpoint exists) | Narrates report findings |
| **P1** | `export_report` | Medium (file hosting) | Delivers PDF/Excel from chat |
| **P2** | `get_demographics` | Low (endpoint exists) | Market framing for every deal |
| **P2** | `compare_projects` | Medium (new endpoint) | Side-by-side deal comparison |
| **P2** | `calculate_waterfall` | Low (endpoint exists) | Investor distribution analysis |
| **P2** | `calculate_mf_cashflow` | Low (endpoint exists) | MF-specific full analysis |
| **P2** | `list_available_reports` | Low (endpoint exists) | Lets Landscaper know what it can generate |
| **P2** | `analyze_debt_scenarios` | Medium (new calc logic) | "What if I refi?" |
| **P2** | `get_market_summary` | Medium (aggregation) | Market context for narratives |
| **P2** | `get_risk_summary` | Medium (analysis logic) | Risk identification |
| **P3** | `calculate_debt_capacity` | Medium (new calc) | "How much can I borrow?" |
| **P3** | `get_construction_draw_schedule` | Low (service exists) | Construction loan visibility |
| **P3** | `get_project_timeline` | Medium (date aggregation) | Consolidated schedule view |
| **P3** | `get_absorption_forecast` | Low (wraps existing data) | Land dev sellout forecast |
| **P3** | `create_portfolio` | Low (endpoint exists) | Portfolio management from chat |
| **P3** | `get_portfolio_cashflows` | Low (endpoint exists) | Fund-level analysis |
| **P3** | `export_data_to_excel` | Medium (new export views) | Ad-hoc data exports |
| **P3** | `export_data_to_csv` | Low (lighter export) | Quick data pulls |

**Totals: 22 new tools across 8 categories.**
- P1 (alpha-critical): 6 tools — these answer the questions every user will ask on day one
- P2 (alpha-important): 8 tools — these enable real analysis workflows
- P3 (post-alpha): 8 tools — nice to have, deepen the platform

---

## What This Changes

**Before (233 tools):** Landscaper is a sophisticated data entry and retrieval system. It can read anything, write anything the user confirms, extract from documents, and manage what-if scenarios. But it can't compute, can't generate deliverables, and can't synthesize.

**After (255 tools):** Landscaper becomes an analyst. "What's the IRR on this deal?" gets a computed answer. "Compare this to the Torrance property" gets a side-by-side table. "Give me a PDF of the cash flow" delivers a file. "What's missing?" guides the user through data entry. The conversational UI actually works as the primary interface, not just a sidebar to the panels.

---

*End of Gap Analysis*
