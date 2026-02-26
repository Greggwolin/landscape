# Landscaper Tool Inventory — Phase 1 Audit

> Generated: 2026-02-26
> Branch: feature/landscaper-full-context-agent
> Source: `backend/apps/landscaper/ai_handler.py`, `tool_registry.py`

---

## Tool Inventory

Total tools defined in `LANDSCAPER_TOOLS`: **169**

| # | Tool Name | Description | R/W | Domain |
|---|-----------|-------------|-----|--------|
| 1 | update_project_field | Update a project field | W | Project |
| 2 | bulk_update_fields | Update multiple fields across tables | W | Project |
| 3 | get_cashflow_results | Read cashflow/DCF assumptions and results | R | Cashflow |
| 4 | compute_cashflow_expression | Evaluate math expression against cashflow | R | Cashflow |
| 5 | update_cashflow_assumption | Update a cashflow/DCF assumption | W | Cashflow |
| 6 | get_project_fields | Retrieve current values of project fields | R | Project |
| 7 | get_field_schema | Get metadata about available fields | R | Project |
| 8 | get_project_documents | List documents uploaded to this project | R | Documents |
| 9 | get_document_content | Get full text content from a document | R | Documents |
| 10 | get_document_page | Get content from a specific document page | R | Documents |
| 11 | get_document_assertions | Get structured assertions from documents | R | Documents |
| 12 | ingest_document | Auto-populate project fields from a document | W | Documents |
| 13 | get_document_media_summary | Get summary of images/visual assets in a document | R | Documents |
| 14 | analyze_rent_roll_columns | Analyze rent roll file and discover columns | R | Extraction |
| 15 | confirm_column_mapping | Execute confirmed column mapping and start extraction | W | Extraction |
| 16 | compute_rent_roll_delta | Compare uploaded rent roll against existing data | R | Extraction |
| 17 | update_operating_expenses | Add or update operating expenses | W | Operations |
| 18 | update_rental_comps | Add or update rental comparables | W | Comparables |
| 19 | update_project_contacts | Update project contact assignments | W | Contacts |
| 20 | get_acquisition | Get acquisition assumptions | R | Acquisition |
| 21 | update_acquisition | Update acquisition assumptions | W | Acquisition |
| 22 | get_revenue_rent | Get rent revenue assumptions | R | Revenue |
| 23 | update_revenue_rent | Update rent revenue assumptions | W | Revenue |
| 24 | get_revenue_other | Get other (non-rent) revenue | R | Revenue |
| 25 | update_revenue_other | Update other revenue assumptions | W | Revenue |
| 26 | get_vacancy_assumptions | Get vacancy and loss assumptions | R | Revenue |
| 27 | update_vacancy_assumptions | Update vacancy and loss assumptions | W | Revenue |
| 28 | get_unit_types | Get unit type mix for multifamily | R | Units |
| 29 | update_unit_types | Add or update unit types | W | Units |
| 30 | get_units | Get individual unit details | R | Units |
| 31 | update_units | Add or update individual units | W | Units |
| 32 | delete_units | Delete specified units | W | Units |
| 33 | get_leases | Get lease records | R | Leases |
| 34 | update_leases | Add or update leases | W | Leases |
| 35 | get_sales_comparables | Get sales comparables | R | Comparables |
| 36 | update_sales_comparable | Add or update a sales comparable | W | Comparables |
| 37 | delete_sales_comparable | Delete a sales comparable | W | Comparables |
| 38 | get_sales_comp_adjustments | Get adjustments for a sales comparable | R | Comparables |
| 39 | update_sales_comp_adjustment | Add or update a sales comp adjustment | W | Comparables |
| 40 | get_rental_comparables | Get rental comparables | R | Comparables |
| 41 | update_rental_comparable | Add or update a rental comparable | W | Comparables |
| 42 | delete_rental_comparable | Delete a rental comparable | W | Comparables |
| 43 | get_loans | Retrieve loans for a project | R | Capital |
| 44 | update_loan | Create or update a loan | W | Capital |
| 45 | delete_loan | Delete a loan | W | Capital |
| 46 | get_equity_structure | Retrieve equity structure | R | Capital |
| 47 | update_equity_structure | Create or update equity structure | W | Capital |
| 48 | get_waterfall_tiers | Retrieve waterfall tiers | R | Capital |
| 49 | update_waterfall_tiers | Create or update waterfall tiers | W | Capital |
| 50 | get_budget_categories | Retrieve budget cost categories | R | Budget |
| 51 | update_budget_category | Create or update a budget category | W | Budget |
| 52 | get_budget_items | Retrieve budget line items | R | Budget |
| 53 | update_budget_item | Create or update a budget item | W | Budget |
| 54 | delete_budget_item | Delete a budget item | W | Budget |
| 55 | get_areas | Retrieve planning areas | R | Planning |
| 56 | update_area | Create or update a planning area | W | Planning |
| 57 | delete_area | Delete a planning area (cascade) | W | Planning |
| 58 | get_phases | Retrieve development phases | R | Planning |
| 59 | update_phase | Create or update a phase | W | Planning |
| 60 | delete_phase | Delete a phase (cascade) | W | Planning |
| 61 | get_parcels | Retrieve parcels/lots | R | Planning |
| 62 | update_parcel | Create or update a parcel | W | Planning |
| 63 | delete_parcel | Delete a parcel | W | Planning |
| 64 | get_milestones | Retrieve milestones | R | Planning |
| 65 | update_milestone | Create or update a milestone | W | Planning |
| 66 | delete_milestone | Delete a milestone | W | Planning |
| 67 | get_land_use_families | Retrieve land use families (L1) | R | Land Use |
| 68 | update_land_use_family | Create or update a land use family | W | Land Use |
| 69 | get_land_use_types | Retrieve land use types (L2) | R | Land Use |
| 70 | update_land_use_type | Create or update a land use type | W | Land Use |
| 71 | get_residential_products | Retrieve residential products (L3) | R | Land Use |
| 72 | update_residential_product | Create or update a residential product | W | Land Use |
| 73 | get_measures | Retrieve measurement units | R | Admin |
| 74 | update_measure | Create or update a measurement unit | W | Admin |
| 75 | get_picklist_values | Retrieve system picklist values | R | Admin |
| 76 | update_picklist_value | Create or update a picklist value | W | Admin |
| 77 | delete_picklist_value | Delete a picklist value | W | Admin |
| 78 | get_benchmarks | Retrieve global benchmark values | R | Admin |
| 79 | update_benchmark | Create or update a benchmark | W | Admin |
| 80 | delete_benchmark | Delete a benchmark | W | Admin |
| 81 | get_cost_library_items | Retrieve cost library items | R | Admin |
| 82 | update_cost_library_item | Create or update a cost library item | W | Admin |
| 83 | delete_cost_library_item | Delete a cost library item | W | Admin |
| 84 | get_report_templates | Retrieve report templates | R | Admin |
| 85 | get_dms_templates | Retrieve DMS templates | R | Admin |
| 86 | update_template | Create or update a template | W | Admin |
| 87 | get_cre_tenants | Retrieve commercial tenants | R | CRE |
| 88 | update_cre_tenant | Create or update a commercial tenant | W | CRE |
| 89 | delete_cre_tenant | Delete a commercial tenant | W | CRE |
| 90 | get_cre_spaces | Retrieve commercial spaces/suites | R | CRE |
| 91 | update_cre_space | Create or update a commercial space | W | CRE |
| 92 | delete_cre_space | Delete a commercial space | W | CRE |
| 93 | get_cre_leases | Retrieve commercial leases | R | CRE |
| 94 | update_cre_lease | Create or update a commercial lease | W | CRE |
| 95 | delete_cre_lease | Delete a commercial lease | W | CRE |
| 96 | get_cre_properties | Retrieve commercial properties | R | CRE |
| 97 | update_cre_property | Create or update a commercial property | W | CRE |
| 98 | get_cre_rent_roll | Get full commercial rent roll | R | CRE |
| 99 | get_competitive_projects | Retrieve competitive market projects | R | Market |
| 100 | update_competitive_project | Create or update a competitive project | W | Market |
| 101 | delete_competitive_project | Delete a competitive project | W | Market |
| 102 | get_absorption_benchmarks | Retrieve absorption velocity benchmarks | R | Market |
| 103 | get_market_assumptions | Get market assumptions | R | Market |
| 104 | update_market_assumptions | Update market assumptions | W | Market |
| 105 | get_absorption_schedule | Get absorption schedule | R | Market |
| 106 | update_absorption_schedule | Create or update absorption entry | W | Market |
| 107 | delete_absorption_schedule | Delete an absorption entry | W | Market |
| 108 | get_parcel_sale_events | Get lot sale contracts/events | R | Sales |
| 109 | update_parcel_sale_event | Create or update a lot sale event | W | Sales |
| 110 | delete_parcel_sale_event | Delete a parcel sale event | W | Sales |
| 111 | get_extraction_results | Get AI extraction results | R | Extraction |
| 112 | update_extraction_result | Update extraction result status | W | Extraction |
| 113 | get_extraction_corrections | Get AI extraction corrections | R | Extraction |
| 114 | log_extraction_correction | Log user correction to AI extraction | W | Extraction |
| 115 | get_knowledge_entities | Get knowledge graph entities | R | Knowledge |
| 116 | get_knowledge_facts | Get knowledge graph facts | R | Knowledge |
| 117 | get_knowledge_insights | Get AI-discovered insights | R | Knowledge |
| 118 | acknowledge_insight | Acknowledge an AI insight | W | Knowledge |
| 119 | analyze_loss_to_lease | Calculate Loss to Lease | R | Analysis |
| 120 | calculate_year1_buyer_noi | Calculate Year 1 Buyer NOI | R | Analysis |
| 121 | check_income_analysis_availability | Check if income analyses available | R | Analysis |
| 122 | whatif_compute | Run what-if computation (no DB change) | R | What-If |
| 123 | whatif_compound | Add override to current what-if session | R | What-If |
| 124 | whatif_reset | Reset what-if session | W | What-If |
| 125 | whatif_attribute | Decompose what-if impact per assumption | R | What-If |
| 126 | whatif_status | Check what-if session state | R | What-If |
| 127 | scenario_save | Save what-if as named scenario | W | Scenarios |
| 128 | scenario_load | Load saved scenario into session | R/W | Scenarios |
| 129 | scenario_log_query | List saved scenarios | R | Scenarios |
| 130 | whatif_commit | Commit all what-if overrides to DB | W | Scenarios |
| 131 | whatif_commit_selective | Commit specific overrides to DB | W | Scenarios |
| 132 | whatif_undo | Undo a committed scenario | W | Scenarios |
| 133 | scenario_replay | Replay scenario against current DB | R | Scenarios |
| 134 | scenario_compare | Compare two scenarios side-by-side | R | Scenarios |
| 135 | scenario_diff | Diff scenario against current DB | R | Scenarios |
| 136 | scenario_branch | Create scenario branch from existing | W | Scenarios |
| 137 | scenario_apply_cross_project | Apply overrides to another project | W | Scenarios |
| 138 | get_kpi_definitions | Get KPI definitions for project type | R | KPI |
| 139 | update_kpi_definitions | Add or remove KPI from saved results | W | KPI |
| 140 | ic_start_session | Start IC devil's advocate session | R/W | IC |
| 141 | ic_challenge_next | Get next IC challenge question | R | IC |
| 142 | ic_respond_challenge | Record user response to IC challenge | W | IC |
| 143 | sensitivity_grid | Generate sensitivity analysis matrix | R | IC |
| 144 | search_cabinet_contacts | Search contact cabinet across projects | R | Contacts |
| 145 | get_project_contacts_v2 | Get contacts assigned to project with roles | R | Contacts |
| 146 | get_contact_roles | Get available contact role definitions | R | Contacts |
| 147 | create_cabinet_contact | Create new contact in cabinet | W | Contacts |
| 148 | assign_contact_to_project | Assign contact to project with role | W | Contacts |
| 149 | remove_contact_from_project | Remove contact from project | W | Contacts |
| 150 | extract_and_save_contacts | Extract contacts from document, save to cabinet | W | Contacts |
| 151 | get_hbu_scenarios | Get H&BU analysis scenarios | R | HBU |
| 152 | create_hbu_scenario | Create new H&BU scenario | W | HBU |
| 153 | update_hbu_scenario | Update existing H&BU scenario | W | HBU |
| 154 | compare_hbu_scenarios | Compare H&BU scenarios | R | HBU |
| 155 | generate_hbu_narrative | Generate H&BU appraisal narrative | R | HBU |
| 156 | get_hbu_conclusion | Get H&BU conclusion | R | HBU |
| 157 | add_hbu_comparable_use | Add comparable use to H&BU scenario | W | HBU |
| 158 | get_property_attributes | Get all property attributes (site + improvements) | R | Property |
| 159 | update_property_attributes | Bulk update property attributes | W | Property |
| 160 | get_attribute_definitions | Get available attribute definitions | R | Property |
| 161 | update_site_attribute | Update a single site attribute | W | Property |
| 162 | update_improvement_attribute | Update a single improvement attribute | W | Property |
| 163 | calculate_remaining_economic_life | Calculate remaining economic life | R | Property |
| 164 | get_zoning_info | Get zoning information for the property | R | Property |
| 165 | log_alpha_feedback | Log user alpha feedback | W | Feedback |
| 166 | create_analysis_draft | Create new analysis draft | W | Drafts |
| 167 | update_analysis_draft | Update existing analysis draft | W | Drafts |
| 168 | run_draft_calculations | Run calculations on a draft | R | Drafts |
| 169 | convert_draft_to_project | Convert draft into full project | W | Drafts |

### Tool Breakdown

| Category | Read | Write | Total |
|----------|------|-------|-------|
| Project | 2 | 2 | 4 |
| Cashflow | 2 | 1 | 3 |
| Documents | 5 | 1 | 6 |
| Extraction | 4 | 3 | 7 |
| Operations | 0 | 1 | 1 |
| Revenue | 4 | 4 | 8 |
| Units | 3 | 2 | 5 |
| Leases | 1 | 1 | 2 |
| Comparables | 4 | 5 | 9 |
| Capital | 3 | 3 | 6 |
| Budget | 2 | 3 | 5 |
| Planning | 6 | 6 | 12 |
| Land Use | 3 | 3 | 6 |
| Admin | 8 | 6 | 14 |
| CRE | 5 | 7 | 12 |
| Market | 4 | 4 | 8 |
| Sales | 1 | 2 | 3 |
| Knowledge | 3 | 1 | 4 |
| Analysis | 3 | 0 | 3 |
| What-If | 4 | 1 | 5 |
| Scenarios | 4 | 5 | 9 |
| KPI | 1 | 1 | 2 |
| IC | 2 | 1 | 3 |
| Contacts | 4 | 3 | 7 |
| HBU | 4 | 3 | 7 |
| Property | 4 | 3 | 7 |
| Feedback | 0 | 1 | 1 |
| Drafts | 1 | 3 | 4 |
| Acquisition | 1 | 1 | 2 |
| **Total** | **~76** | **~93** | **169** |

---

## Registry Summary

- **Total tools defined in LANDSCAPER_TOOLS:** 169
- **Tools returned per session (current behavior):** ~15-35 (varies by page)
- **Filtering inputs:** `page_context`, `project_type_code`, `project_type`, `analysis_perspective`, `analysis_purpose`, `subtab_context`, `include_extraction` (keyword-detected), `is_admin`
- **Registry called from:** `ai_handler.py` (line 5537-5541, inside `get_landscaper_response` flow via `_filter_tools_legacy`)
- **Token budget concern:** YES — 169 tools at ~150-300 tokens each ≈ 25K-50K tokens for tool definitions alone. Current page-scoped filtering keeps it manageable (~15-35 tools). Removing page scoping will send all 169 tools, significantly increasing prompt size.

### Registry Architecture

**File:** `backend/apps/landscaper/tool_registry.py`

The registry uses a 4-tier system:

1. **UNIVERSAL_TOOLS** (11 tools) — always available on all pages
2. **EXTRACTION_TOOLS** (13 tools) — only on Documents page or when user mentions documents
3. **WHATIF_TOOLS** (20 tools) — only on valuation/capitalization/reports/IC pages
4. **ADMIN_TOOLS** (14 tools) — only in admin context

**PAGE_TOOLS** dict maps 19 page contexts to their specific tool sets:
- `mf_home`, `mf_property`, `mf_operations`, `mf_valuation`, `mf_capitalization`
- `land_home`, `land_planning`, `land_budget`, `land_schedule`, `land_valuation`, `land_capitalization`
- `documents`, `map`, `reports`
- `alpha_assistant`, `dashboard`
- `dms`, `benchmarks`, `admin`, `settings`
- `investment_committee`

**`get_tools_for_page()`** assembles the final set:
```
Universal (always) + Page-specific + What-If (if valuation page) + Extraction (if doc keyword) + Admin (if admin)
```

**`normalize_page_context()`** maps raw frontend contexts to canonical registry keys, handling property-type branching (mf_ vs land_).

---

## System Prompt Restriction Language

After thorough audit of `ai_handler.py`, here are all restriction-related instructions found:

### Restrictions That Limit Scope (Phase 2 targets for removal/replacement)

**NONE found.** The system prompts do **not** contain language that:
- Restricts Landscaper from modifying data via chat
- Limits Landscaper to the current tab or page context
- Deflects assumption update requests back to the UI
- Uses language like "redirect to UI" or "avoid modifying"

The opposite is true — the prompts actively encourage direct mutation:
- Line 5587-5590: "ACTION FIRST (CRITICAL): When the user asks you to DO something... your FIRST action must be to call the appropriate tool(s)"
- Line 5927: "ASSUMPTION UPDATES (DIRECT WRITE - NO CONFIRMATION NEEDED)"
- Line 5929: "Call update_cashflow_assumption with confirm=true... The user's request IS the confirmation"

### Behavioral Constraints (should be KEPT — not scope restrictions)

These are operational guardrails, not scope limitations:

| Line | File | Quote | Keep? |
|------|------|-------|-------|
| 1934 | ai_handler.py | "unit_number: REQUIRED — do NOT update this field" | YES — data integrity |
| 5492 | ai_handler.py | "Do NOT call this automatically — the user must opt in." (convert_draft_to_project) | YES — safety |
| 5554-5559 | ai_handler.py | "NEVER say 'Let me check...', NEVER describe what tools you're using" | YES — UX quality |
| 5592-5596 | ai_handler.py | "DO NOT: Present options (A/B/C) when user already told you what to do" | YES — UX quality |
| 5630-5636 | ai_handler.py | "NEVER FABRICATE NUMBERS" | YES — accuracy |
| 5673 | ai_handler.py | "Do NOT run bulk extraction/import when user asks for small changes" | YES — precision |
| 5680 | ai_handler.py | "Never skip the confirmation step" (for delete_units) | YES — safety |
| 5709 | ai_handler.py | "Do NOT tell the user the action is complete" (when result is pending) | YES — accuracy |
| 5725-5729 | ai_handler.py | "TOOL USE FORMAT — NEVER write fake tool results in text" | YES — integrity |
| 5735-5736 | ai_handler.py | "NEVER claim changes are complete without actually calling the mutation tool" | YES — integrity |
| 6041 | ai_handler.py | "No new what-ifs in presentation mode — it is read-only display" | YES — UX |
| 6252 | ai_handler.py | "The user should never need to know terms like 'Analysis Perspective'" | YES — UX |
| 6394-6404 | ai_handler.py | "WHAT LANDSCAPER SHOULD NEVER ASK" (various post-alpha features) | YES — scope limits |
| 6406-6415 | ai_handler.py | "What Landscaper Should Never Ask" (don't re-ask stated info, etc.) | YES — UX quality |

### Platform Knowledge Conditional (Phase 2 target)

| Line | Behavior | Change Needed |
|------|----------|---------------|
| 6627-6636 | Platform knowledge only injected when `_needs_platform_knowledge()` returns True (keyword-based trigger) | Make unconditional |

The `_needs_platform_knowledge()` function (line 345-370) checks:
1. Primary triggers: ~50 valuation/methodology terms
2. Secondary triggers: contextual questions + property context terms
3. Task type: certain task types always trigger

If the user's message doesn't match any trigger, platform knowledge is **not** included — this is the conditional that Phase 2 Step 9 should make unconditional.

---

## useLandscaperRefresh Coverage

| Tab | Watched Tables | Missing Domains |
|-----|---------------|-----------------|
| ProjectTab | `project`, `units`, `operating_expenses` | budget_items, capital |
| PropertyTab | `units`, `leases`, `unit_types`, `project`, `dynamic_columns` | — |
| OperationsTab | `operating_expenses`, `units`, `unit_types`, `leases` | revenue (other income) |
| ValuationTab | `units`, `leases`, `unit_types`, `operating_expenses`, `dcf_analysis`, `cashflow`, `rental_comps`, `sales_comps`, `project` | — |
| RentRollGrid | `units`, `leases`, `unit_types` | — |
| FloorplansGrid | `unit_types`, `units` | — |

### Missing from any tab's watch list:
- `budget_items` / `budget_categories` — no tab watches these
- `loans` / `equity` / `waterfall` — capitalization tab has no useLandscaperRefresh
- `areas` / `phases` / `parcels` / `milestones` — land planning tab has no useLandscaperRefresh
- `revenue_other` — OperationsTab only watches expenses, not other income
- `acquisition` — no tab watches this
- `market_assumptions` — no tab watches this
- `absorption_schedule` / `parcel_sale_events` — no tab watches these
- `competitive_projects` — no tab watches this
- `contacts` — no tab watches this
