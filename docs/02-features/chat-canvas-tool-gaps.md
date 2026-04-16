# Chat Canvas — Landscaper Tool Gaps in Unassigned Threads

**Status:** Read-only audit. No tool code has been modified. The backend allows
unassigned threads (`project_id IS NULL`) to send messages to Landscaper, but
most tools assume a project context. This document lists which tools are safe
from an unassigned thread, which will fail, and what each category should do
when called without a project.

**Audit date:** 2026-04-16
**Scope:** tool_registry.py groups (UNIVERSAL_TOOLS + property-type groups
+ INGESTION_TOOLS + WHATIF_TOOLS + ADMIN_TOOLS)

## How `project_id` flows today

1. `ThreadMessageViewSet.create()` in `backend/apps/landscaper/views.py`
   resolves `project = Project.objects.get(project_id=thread.project_id)` when
   the thread is project-scoped. For unassigned threads the project lookup is
   now skipped and `project_context['project_id']` is `None`.
2. The bound `tool_executor_fn(tool_name, tool_input, project_id=None)` passes
   the bound project_id (or `None`) to `execute_tool(tool_name, tool_input,
   project_id, ...)` in `tool_executor.py`.
3. Almost every tool handler signature is
   `def handler(tool_input, project_id: int, ...)` and uses `project_id`
   either directly in a SQL `WHERE project_id = %s` or to look up Django
   models keyed on project.

With `project_id=None`, most handlers will either raise (`Project.DoesNotExist`,
`ValueError` from an int cast) or return zero rows / empty results. None of
them degrade gracefully today.

## Safe without a project (work in unassigned threads)

These either take their own id (not project_id) or operate on global/platform
state:

- **Excel model audit** — `classify_excel_file`, `run_structural_scan`,
  `run_formula_integrity`, `extract_assumptions`. All take `doc_id` only
  (see `backend/apps/landscaper/tools/excel_audit_tools.py:96..`).
- **UI affordance** — `open_input_modal` (takes `modal_name` + `context`, no
  project lookup) — `backend/apps/landscaper/tools/modal_tools.py:20`.
- **Platform knowledge / reference data** — `query_platform_knowledge`,
  `search_irem_benchmarks`, `get_knowledge_entities`,
  `get_knowledge_facts`, `get_knowledge_insights`. These read from
  platform-global tables. `project_id` in their signature is used only for
  scoping and can be safely ignored when `None`.
- **Project creation** — `create_project`, `create_analysis_draft`,
  `update_analysis_draft`, `run_draft_calculations`,
  `convert_draft_to_project`. These *produce* a project and are the natural
  promotion path out of an unassigned thread.
- **Alpha feedback** — `log_alpha_feedback` — project-agnostic.
- **Ingestion tools** — `get_ingestion_staging`, `update_staging_field`,
  `approve_staging_field`, `reject_staging_field`, `explain_extraction`.
  These operate on `ai_extraction_staging` rows keyed by `doc_id` + session,
  not by project. Safe as long as the doc is linked to the thread (via
  `core_doc.thread_id`).

## Require a project (will fail in unassigned threads)

Everything project-scoped. These should return a clear "this action requires
a project" error rather than 500 when `project_id is None`. Grouped by tool
family:

**Project core and property**

- `update_project_field`, `bulk_update_fields`, `get_project_fields`,
  `get_field_schema`
- `get_property_attributes`, `update_property_attributes`,
  `update_site_attribute`, `update_improvement_attribute`,
  `calculate_remaining_economic_life`, `get_zoning_info`,
  `get_attribute_definitions`

**Documents (project-scoped reads)**

- `get_project_documents`, `get_document_content`, `get_document_page`,
  `get_document_assertions`, `ingest_document`, `get_document_media_summary`,
  `get_extraction_results`, `update_extraction_result`,
  `get_extraction_corrections`, `log_extraction_correction`

  _Note:_ `ingest_document` with `project_id=None` but a valid `doc_id` (linked
  to the thread via `core_doc.thread_id`) could in principle stage extractions
  against the thread instead of the project. That requires tool-code changes
  out of scope for this audit.

**Contacts (cabinet)**

- `search_cabinet_contacts`, `get_project_contacts_v2`, `get_contact_roles`,
  `create_cabinet_contact`, `assign_contact_to_project`,
  `remove_contact_from_project`, `extract_and_save_contacts`,
  `update_project_contacts`

**HBU**

- `get_hbu_scenarios`, `create_hbu_scenario`, `update_hbu_scenario`,
  `compare_hbu_scenarios`, `generate_hbu_narrative`, `get_hbu_conclusion`,
  `add_hbu_comparable_use`

**Valuation (sales comp / cost / income / reconciliation / cashflow)**

- `get_cashflow_results`, `compute_cashflow_expression`,
  `update_cashflow_assumption`
- `get_sales_comparables`, `update_sales_comparable`,
  `delete_sales_comparable`, `get_sales_comp_adjustments`,
  `update_sales_comp_adjustment`
- `get_market_assumptions`, `update_market_assumptions`
- `get_cost_approach`, `update_cost_approach`
- `get_valuation_reconciliation`, `update_valuation_reconciliation`
- `get_income_approach`, `update_income_approach`,
  `get_income_property`, `update_income_property`

**Cap structure**

- `get_loans`, `update_loan`, `delete_loan`
- `get_equity_structure`, `update_equity_structure`
- `get_waterfall_tiers`, `update_waterfall_tiers`

**Location intelligence**

- `get_location_analysis`, `update_location_analysis`

**Portfolio**

- `get_portfolio_summary`, `get_portfolio_assumptions`,
  `get_project_assumptions_detail`

**Land-dev-only** (entire `LAND_ONLY_TOOLS` group — every handler is
project-scoped)

- Areas / phases / parcels / lots / milestones / land-use families and types /
  residential products / land comps / parcel sale assumptions + events /
  sale phases / competitive projects / absorption schedule / budget grid /
  hierarchy config / parcel import staging

**MF-only** (entire `MF_ONLY_TOOLS` group)

- Units / unit types / leases / turns / rental comps / MF property + ext /
  lease + value-add assumptions / rent roll extraction helpers

**CRE-only** (entire `CRE_ONLY_TOOLS` group)

- Tenants / spaces / leases / properties / rent roll

**Income property** (entire `INCOME_PROPERTY_TOOLS` group)

- OpEx / acquisition / revenue (rent + other) / vacancy assumptions /
  loss-to-lease / year1 buyer NOI / income analysis availability

**What-If / scenarios / IC** (entire `WHATIF_TOOLS` group)

- What-If compute/commit/undo, scenario save/load/replay/compare/diff/branch,
  KPI definitions, IC session tools, sensitivity grid — all project-keyed

**Admin/config** (`ADMIN_TOOLS`)

- Measures, picklists, benchmarks, cost library, templates — platform-global
  but gated behind `is_admin=True`, not project; these actually *do* work
  without a project if the user is admin. Flag for retest.

## Recommendation per category

Not implemented in this change — this audit is read-only. For the follow-up
task, a thin guard at the top of `execute_tool` or in each `handler` should:

1. If `project_id is None` and the tool is in the "require project" list
   above, return early with:

   ```python
   return {
       'success': False,
       'error': 'project_required',
       'message': 'This action needs a project. Create one from this chat, or switch to a project-scoped conversation.',
       'suggested_next': ['create_project', 'convert_draft_to_project'],
   }
   ```

2. The tool executor already exposes `source_message_id`; include it so the
   frontend can surface a "Create project from this chat" CTA in the failing
   assistant turn.

3. For `ingest_document` specifically, consider teaching it to accept
   `thread_id` as an alternative scope (writes staging rows against the
   thread rather than the project). Out of scope for Phase 1.

## References

- Tool registry and property-type gating: `backend/apps/landscaper/tool_registry.py`
- Tool executor entry point: `backend/apps/landscaper/tool_executor.py:14292`
- Auto-execute list: `backend/apps/landscaper/tool_executor.py:14276`
- Message-handling flow: `backend/apps/landscaper/views.py:1633` (`ThreadMessageViewSet.create`)
- Excel audit tools: `backend/apps/landscaper/tools/excel_audit_tools.py`
- Modal tools: `backend/apps/landscaper/tools/modal_tools.py`
