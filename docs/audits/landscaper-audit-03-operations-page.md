# Landscaper Audit: Operations Page
**Date:** February 10, 2026
**Auditor:** Codex
**Page:** Operations (Income Property — mf_operations context)
**Audit #:** 3

---

## Cross-References
- **Auth:** Fixed per CC security prompt (Audit #1 Issues #1, #2). `ThreadMessageViewSet` and `ChatThreadViewSet` still use `permission_classes = [AllowAny]` but upstream auth has been deployed.
- **Knowledge graph scoping:** Fixed (Audit #1 Issue #6).
- **Global DMS gap:** See Audit #1 Issue #3 — not yet fixed.
- **Subtab context not passed:** See Audit #1 Issue #4 — still active. Operations has no subtabs so impact is low on this page.
- **Page-specific system prompts:** See Audit #1 Issue #5 — still active. System prompt is property-type-specific, not page-specific.

---

## 1. Frontend

**FRONTEND REPORT — Operations Page**

### Component Chain
1. `ProjectLayoutClient` (`src/app/projects/[projectId]/ProjectLayoutClient.tsx:311`) mounts `LandscaperPanel` with `activeTab={currentFolder}`.
2. `LandscaperPanel` (`src/components/landscaper/LandscaperPanel.tsx:929`) mounts `LandscaperChatThreaded` with `pageContext={pageContext || activeTab}`. Since `pageContext` prop is not passed from `ProjectLayoutClient`, this resolves to `activeTab` = `"operations"`.
3. `LandscaperChatThreaded` (`src/components/landscaper/LandscaperChatThreaded.tsx:22`) receives `pageContext: string` and passes it to `useLandscaperThreads`.
4. `useLandscaperThreads` (`src/hooks/useLandscaperThreads.ts:407`) sends `page_context: pageContext` (= `"operations"`) in the POST body when sending messages.

### page_context Value Sent
**`"operations"`** (folder-only, no subtab suffix).

The Operations tab has no subtabs — it is a single unified P&L page (`ProjectContentRouter.tsx:8` documents: "Operations (Income): Single unified P&L page (no subtabs) → OperationsTab"). This means the Audit #1 Issue #4 (subtab not passed) has **zero impact** on this specific page.

### Operations Tab Visibility by Project Type
The OperationsTab component (`src/app/projects/[projectId]/components/tabs/OperationsTab.tsx:287-331`) explicitly gates rendering by project type:

- **Multifamily (`isMultifamily === true`):** Full rendering of the operating statement P&L.
- **All other project types (Office, Retail, Industrial, Land Dev, Hospitality, Mixed-Use):** Shows a "Coming Soon" placeholder card with the message "The Operations tab is currently designed for multifamily projects only."
- **Land Development projects:** Specifically listed in the placeholder labels (`LAND: 'Land Development'`) and directed to use Budget tab, Financial Analysis, and Assumptions & Factors as alternatives.

**Conclusion:** Land Development projects can navigate to Operations but see only a placeholder. The Landscaper chat is still active on this page but would receive `mf_operations` tools, which is incorrect for a land project (see Issue 3.3).

### API Endpoints Called
Same as Audit #1:
1. Thread list/create: `${DJANGO_API_URL}/api/landscaper/threads/`
2. Thread messages: `${DJANGO_API_URL}/api/landscaper/threads/{thread_id}/messages/`
3. New thread: `${DJANGO_API_URL}/api/landscaper/threads/new/`

### OperationsTab Component
The tab component (`src/app/projects/[projectId]/components/tabs/OperationsTab.tsx`) renders:
- `OperationsHeader` — mode selector and summary
- `SummaryBar` — KPI totals
- `OperatingStatement` — full P&L with rental income, vacancy deductions, other income, and operating expenses
- `OpExHierarchy` — chart-of-accounts based expense tree
- Value-add toggle and assumptions via `useValueAddAssumptions`

Data is sourced via `useOperationsData` hook, which calls a separate Next.js API route (not Landscaper).

---

## 2. Backend Routing

**BACKEND ROUTING REPORT — Operations Page**

### Context Normalization
1. Backend receives `page_context = "operations"` from the frontend.
2. `normalize_page_context("operations")` in `tool_registry.py:354` maps directly: `if ctx == "operations": return "mf_operations"`.
3. This mapping is **unconditional** — it always returns `"mf_operations"` regardless of project type. A Land Development project on the Operations tab still gets `mf_operations` tools.

### System Prompt
1. `get_system_prompt(project_type)` (`ai_handler.py:4753`) selects prompt by project type (e.g., `"multifamily"` for MF projects).
2. The multifamily prompt mentions "Operating expense benchmarking" and "NOI projections" as expertise areas.
3. **No page-specific behavioral overlay exists** for the Operations page (same finding as Audit #1 Issue #5).

### Rich Project Context
1. `get_project_context(project_id)` (`ai_handler.py:4942-4948`) is called and includes an "Operating Expenses" section from `ProjectContextService.get_operating_expenses()` (`project_context.py:426`).
2. This section queries `tbl_operating_expenses` and provides category-level summaries (e.g., "Property Taxes: $45,000") to the system prompt.
3. The AI has read access to current operating expense data via the system prompt context, even though there is no `get_operating_expenses` tool (see Issue 3.1).

### Platform Knowledge Injection
1. `_needs_platform_knowledge()` (`ai_handler.py:182`) triggers on keywords including: `operating expense`, `expense ratio`, `oer`, `vacancy`, `collection loss`, `credit loss`, `noi`, `cap rate`, `market rent`, `loss to lease`, `rent roll`, `stabilized`, `proforma`.
2. Many Operations-page conversations will naturally trigger platform knowledge injection via these terms.
3. Platform knowledge retrieval uses RAG from `tbl_platform_knowledge_chunks` with embeddings.
4. **This works correctly on the Operations page** — the trigger is keyword-based on the user message, not page-context-gated.

---

## 3. Tool Availability

**TOOL AVAILABILITY REPORT — Operations Page (mf_operations context)**

### Tools Available (11 total)

| # | Tool Name | Type | Implementation |
|---|-----------|------|----------------|
| 1 | `update_project_field` | Universal | `tool_executor.py` ✓ |
| 2 | `bulk_update_fields` | Universal | `tool_executor.py` ✓ |
| 3 | `get_project_fields` | Universal | `tool_executor.py` ✓ |
| 4 | `get_field_schema` | Universal | `tool_executor.py` ✓ |
| 5 | `update_operating_expenses` | Page-specific (mutation) | `tool_executor.py:1426` ✓ |
| 6 | `get_revenue_rent` | Page-specific (read) | `tool_executor.py:2477` ✓ |
| 7 | `update_revenue_rent` | Page-specific (mutation) | `tool_executor.py:2492` ✓ |
| 8 | `get_revenue_other` | Page-specific (read) | `tool_executor.py:2530` ✓ |
| 9 | `update_revenue_other` | Page-specific (mutation) | `tool_executor.py:2545` ✓ |
| 10 | `get_vacancy_assumptions` | Page-specific (read) | `tool_executor.py:2583` ✓ |
| 11 | `update_vacancy_assumptions` | Page-specific (mutation) | `tool_executor.py:2598` ✓ |

Plus up to 9 extraction tools conditionally added when user message mentions documents/upload/rent roll/T-12 etc. (via `should_include_extraction_tools()`).

### Gap Analysis

#### Missing: `get_operating_expenses` (read tool)
- **There is no `get_operating_expenses` read tool** in the registry or tool_executor.
- `update_operating_expenses` exists for writing, but the AI cannot query existing operating expense data via a tool.
- **Partial mitigation:** Operating expense data IS included in the system prompt via `ProjectContextService.get_operating_expenses()` — the AI sees current expense summaries (category + total amount) but cannot query details like escalation rates, recovery status, or per-unit/per-SF breakdowns.
- **Impact:** The AI can write expenses but cannot read detailed expense records. It sees summary data in prompt context but lacks granular access (see Issue 3.1).

#### Missing: `search_irem_benchmarks` on Operations Page
- **`search_irem_benchmarks` is NOT in the `mf_operations` tool set.**
- It is only available in `dms` and `benchmarks` contexts (`tool_registry.py:271`, `tool_registry.py:279`).
- The tool implementation exists (`tool_executor.py:6927`) and is fully functional — it queries `opex_benchmark` via `BenchmarkService`.
- **Impact:** Users on the Operations page asking "how do my expenses compare to IREM?" will get an AI response based only on platform knowledge (RAG text) rather than structured benchmark comparison. The AI cannot call the tool to get specific per-unit/pct-of-EGI numbers from the `opex_benchmark` table. This is the **highest-value gap** for this page (see Issue 3.2).

#### Missing: Income Analysis Tools on Operations Page
- **`analyze_loss_to_lease`**, **`calculate_year1_buyer_noi`**, and **`check_income_analysis_availability`** are assigned to `mf_valuation` context only (`tool_registry.py:118-120`), NOT to `mf_operations`.
- These tools exist and work (`tool_executor.py:9936`, `tool_executor.py:10044`, `tool_executor.py:10114`).
- **Impact:** A user on the Operations page asking about Loss to Lease or Year 1 Buyer NOI will not trigger tool use. The AI may attempt to answer from general knowledge or platform knowledge but cannot run the actual calculation. Users must navigate to Valuation tab for these tools (see Issue 3.4).

#### Missing: `query_platform_knowledge` on Operations Page
- This tool is assigned to `dms` and `benchmarks` contexts only.
- **Partial mitigation:** Platform knowledge IS injected into the system prompt via `_needs_platform_knowledge()` when keyword triggers match. But the AI cannot proactively query for additional knowledge chunks mid-conversation.

#### Present but Write-Only: Operating Expenses
- `update_operating_expenses` exists but there is no corresponding `get_operating_expenses` read tool.
- This creates an asymmetric CRUD pattern: the AI can write but cannot explicitly read.

### Full Tool Existence Check

| Tool | In Registry? | In mf_operations? | Implemented? |
|------|--------------|--------------------|--------------|
| `update_operating_expenses` | ✓ | ✓ | ✓ (`tool_executor.py:1426`) |
| `get_operating_expenses` | ✗ | ✗ | ✗ (not implemented) |
| `get_revenue_rent` | ✓ | ✓ | ✓ (`tool_executor.py:2477`) |
| `update_revenue_rent` | ✓ | ✓ | ✓ (`tool_executor.py:2492`) |
| `get_revenue_other` | ✓ | ✓ | ✓ (`tool_executor.py:2530`) |
| `update_revenue_other` | ✓ | ✓ | ✓ (`tool_executor.py:2545`) |
| `get_vacancy_assumptions` | ✓ | ✓ | ✓ (`tool_executor.py:2583`) |
| `update_vacancy_assumptions` | ✓ | ✓ | ✓ (`tool_executor.py:2598`) |
| `search_irem_benchmarks` | ✓ | ✗ | ✓ (`tool_executor.py:6927`) |
| `query_platform_knowledge` | ✓ | ✗ | ✓ (`tool_executor.py:7018`) |
| `analyze_loss_to_lease` | ✓ | ✗ | ✓ (`tool_executor.py:9936`) |
| `calculate_year1_buyer_noi` | ✓ | ✗ | ✓ (`tool_executor.py:10044`) |
| `check_income_analysis_availability` | ✓ | ✗ | ✓ (`tool_executor.py:10114`) |

---

## 4. Data Access & Knowledge Scope

**DATA ACCESS REPORT — Operations Page**

### Project Context Data
`ProjectContextService` (`project_context.py`) provides the following Operations-relevant data to the system prompt:

| Section | Method | Data Provided |
|---------|--------|---------------|
| Unit Mix & Rents | `get_unit_data()` | Unit type codes, counts, rents, SF |
| Operating Expenses | `get_operating_expenses()` | Category-level totals (top 15 categories by amount) |
| Financial Assumptions | `get_financial_assumptions()` | Discount rate, analysis dates |
| Document Inventory | `get_document_inventory()` | Uploaded document list |

The AI sees expense summaries in the system prompt but cannot query detailed fields (escalation_rate, is_recoverable, per_unit, per_sf) without a `get_operating_expenses` tool.

### Platform Knowledge (IREM Benchmarks)
1. **Keyword trigger:** Works correctly. Terms like "operating expense", "expense ratio", "vacancy" in user messages trigger `_needs_platform_knowledge()` → `_get_platform_knowledge_context()`.
2. **RAG retrieval:** Queries `tbl_platform_knowledge_chunks` with embedding similarity. Returns methodology text chunks about expense analysis, benchmark comparison, etc.
3. **Structured benchmark data:** NOT accessible from Operations page. The `opex_benchmark` table contains per-unit, per-SF, and pct-of-EGI data from IREM reports, but the only tool that queries it (`search_irem_benchmarks`) is not in the `mf_operations` tool set.
4. **Benchmark Service** (`benchmark_service.py`): Fully implemented with `get_benchmark()`, `compare_to_benchmark()`, `search_benchmarks()`, and `get_expense_summary()` methods. Works via Django ORM against `OpexBenchmark` model. This service powers `search_irem_benchmarks` tool — which is just not wired to Operations.

### T-12 / Extraction Pipeline
1. Extraction tools are conditionally included via `should_include_extraction_tools()` when user message mentions "T-12", "rent roll", "extract", "upload", etc.
2. Keywords that trigger extraction tools on Operations page: `document`, `upload`, `extract`, `rent roll`, `t-12`, `t12`, `offering memo`, `appraisal`, `pdf`, `file`, `import`, `om `.
3. **This works correctly** — a user saying "extract the T-12 data" on Operations page will get extraction tools loaded dynamically.
4. The `update_operating_expenses` tool has a `source_document` field for tracking extraction provenance.
5. **No direct link** from extraction staging data to Operations tools — the AI must use extraction tools to read, then call `update_operating_expenses` to write.

### Alpha Help Context
1. `_needs_alpha_help()` triggers when user asks "how do I..." style questions.
2. `PAGE_NAME_MAP` (`ai_handler.py:154`) maps `'operations'` → `'operations'` for section_path filtering.
3. Alpha help chunks filtered by section_path `%/operations/%` will be retrieved.
4. **This works correctly** for the Operations page.

---

## 5. Response Formatting

**Brief — Same as Audit #1.**

Response formatting uses `sanitizeLandscaperResponse()` in `src/utils/formatLandscaperResponse.ts`. This is a global formatter that:
- Strips markdown headers, bold, italic, code blocks
- Converts bullets to plain text
- Normalizes whitespace

No Operations-specific formatting logic exists. The formatter is context-agnostic.

**Note:** Operating expense data (tables with per-unit columns, IREM comparisons) would benefit from tabular formatting, but the current formatter strips markdown tables. This is a systemic issue, not Operations-specific.

---

## 6. Thread Management

**Brief — Thread behavior on Operations tab navigation.**

1. `useLandscaperThreads` (`src/hooks/useLandscaperThreads.ts:454-459`) reinitializes threads whenever `pageContext` changes:
   ```
   useEffect(() => {
     setMessages([]);
     setActiveThread(null);
     initializeThread();
   }, [projectId, pageContext, initializeThread]);
   ```
2. Navigating **to** the Operations tab triggers a new thread initialization with `page_context = "operations"`.
3. Navigating **away** from Operations triggers a new initialization for the new folder.
4. Thread loading filters by `page_context` — only `"operations"` threads are shown when on Operations.
5. Thread creation sends `page_context: "operations"` and optional `subtab_context: null`.

**Behavior is correct** — thread isolation by page context works as designed.

---

## 7. Issues Found

| # | Severity | Issue | Impact | Suggested Fix |
|---|----------|-------|--------|---------------|
| 3.1 | **Medium** | No `get_operating_expenses` read tool exists. The AI can write expenses via `update_operating_expenses` but cannot query detailed expense records (escalation rates, recovery status, per-unit/per-SF). Summary data is available via system prompt context only. | AI cannot answer questions like "what's the escalation rate on insurance?" or "which expenses are recoverable?" without guessing from prompt context. | Implement `get_operating_expenses` tool in `tool_executor.py` querying `tbl_operating_expenses` with columns like `expense_category`, `annual_amount`, `amount_per_sf`, `escalation_rate`, `is_recoverable`, `recovery_rate`. Add to `mf_operations` in `tool_registry.py`. |
| 3.2 | **High** | `search_irem_benchmarks` tool is not available on Operations page. It exists and works but is only assigned to `dms` and `benchmarks` contexts. | Users asking "how do my expenses compare to IREM?" on the Operations page get no structured benchmark comparison. The AI relies on RAG text chunks instead of querying specific per-unit/pct-of-EGI values from `opex_benchmark` table. This is the most natural place for benchmark questions. | Add `"search_irem_benchmarks"` to `PAGE_TOOLS["mf_operations"]` in `tool_registry.py`. |
| 3.3 | **Low** | Land Development projects navigating to Operations tab receive `mf_operations` tools despite the tab showing "Coming Soon" placeholder. The `normalize_page_context("operations")` mapping is unconditional — it always returns `"mf_operations"` regardless of project type. | Minimal current impact since Land Dev users see a placeholder UI. But if a user types in the Landscaper chat while on the Operations placeholder, they'll get MF-specific tools (revenue rent, vacancy assumptions) that don't apply to land projects. | Add project type check: `if ctx == "operations": return "mf_operations" if not is_land else default_home`. |
| 3.4 | **Medium** | Income analysis tools (`analyze_loss_to_lease`, `calculate_year1_buyer_noi`, `check_income_analysis_availability`) are assigned to `mf_valuation` only, not `mf_operations`. | Users analyzing their operating statement and asking "what's my loss to lease?" or "calculate year 1 buyer NOI" on the Operations page won't get tool-backed answers. These are natural follow-up questions from the P&L view. | Add `"analyze_loss_to_lease"`, `"calculate_year1_buyer_noi"`, and `"check_income_analysis_availability"` to `PAGE_TOOLS["mf_operations"]` in `tool_registry.py`. |
| 3.5 | **Low** | No Operations-specific system prompt overlay. The multifamily prompt mentions "Operating expense benchmarking" and "NOI projections" as expertise but doesn't guide the AI on Operations-page-specific workflows (e.g., "when on Operations, prioritize reading the operating statement before suggesting changes"). | AI doesn't adapt its behavior to the Operations context beyond tool availability. It uses the same generic MF prompt whether on Property, Operations, or Valuation. | Consider adding a page-context behavioral hint to the system prompt when `page_context == "operations"` (e.g., "User is viewing the operating statement P&L. Focus on expense analysis, revenue optimization, and benchmark comparisons."). Low priority — existing behavior is adequate. |

---

## 8. Recommendations

### Priority 1 (High Impact, Low Effort)
1. **Add `search_irem_benchmarks` to `mf_operations` tool set** (Issue 3.2). Single line change in `tool_registry.py`. This is the highest-value fix — users naturally ask benchmark questions while viewing their operating statement.

2. **Add income analysis tools to `mf_operations`** (Issue 3.4). Add 3 tool names to the `mf_operations` list. Loss to Lease and Year 1 Buyer NOI are natural questions from the P&L view.

### Priority 2 (Medium Impact, Medium Effort)
3. **Implement `get_operating_expenses` read tool** (Issue 3.1). Pattern already exists for other assumption tables (`get_revenue_rent`, `get_vacancy_assumptions`). Implement similar read query against `tbl_operating_expenses` returning detailed records with escalation rates, recovery status, per-unit/per-SF amounts.

### Priority 3 (Low Impact)
4. **Add project-type guard to operations context normalization** (Issue 3.3). Low urgency since Land Dev users see placeholder UI, but prevents incorrect tool loading if they chat.

5. **Consider Operations-page behavioral hint in system prompt** (Issue 3.5). Low priority quality improvement.

### Operations-Specific Workflow Gaps
- **T-12 → Operations pipeline:** The full workflow (upload T-12 → extract expenses → populate Operations tab) works end-to-end via conditional extraction tool loading + `update_operating_expenses`. No gap here.
- **Benchmark comparison workflow:** Partially broken. Platform knowledge gives qualitative context, but the structured `search_irem_benchmarks` tool (which can compare actual vs. benchmark values) is not available. Fix via Recommendation #1.
- **Revenue + Vacancy round-trip:** Full CRUD is available (read + write for both revenue rent, revenue other, and vacancy assumptions). No gap.

---

## Appendix: Tool Count by Context

| Context | Page-Specific Tools | + Universal (4) | + Extraction (conditional, 9) | Max Total |
|---------|--------------------:|----------------:|-----------------------------:|----------:|
| `mf_operations` | 7 | 11 | 20 | 20 |
| `mf_property` | 17 | 21 | 30 | 30 |
| `mf_valuation` | 14 | 18 | 27 | 27 |
| `mf_capitalization` | 7 | 11 | 20 | 20 |

Operations has one of the lowest tool counts (11 base), which is good for Claude reliability. Adding the 4 recommended tools would bring it to 15 — still well within the target range of 15-25.
