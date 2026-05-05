"""
Property-type-gated tool registry for Landscaper.

DESIGN INTENT: Two-layer filtering
Layer 1: Property-type hard gates — never send tools irrelevant to this project type
Layer 2: Cross-page availability — all write tools available regardless of current tab
Page context is retained as a soft hint in the system prompt only.

History:
- Original: Page-only filtering (~15-25 tools per page, too restrictive)
- 2026-02-26: Page filtering disabled — sent all 217 tools unconditionally (~27K tokens)
- 2026-03-08: Re-enabled with property-type gates only. ~106-133 tools per type.
"""

from typing import List, Optional, Set


# =============================================================================
# PROPERTY-TYPE TOOL GROUPS
# =============================================================================

# Universal tools — available for ALL property types, ALL pages.
# Includes project core, documents, knowledge, contacts, property attributes,
# HBU, valuation shared (cashflow, sales comp, cost, income, reconciliation),
# cap structure, drafts, location, portfolio, and misc.
UNIVERSAL_TOOLS = [
    # Project core
    "update_project_field", "bulk_update_fields", "get_project_fields", "get_field_schema",
    # Documents
    "get_project_documents", "get_document_content", "get_document_page",
    "get_document_assertions", "ingest_document", "get_document_media_summary",
    "get_extraction_results", "update_extraction_result",
    "get_extraction_corrections", "log_extraction_correction",
    # Knowledge / RAG
    "get_knowledge_entities", "get_knowledge_facts", "get_knowledge_insights",
    "acknowledge_insight", "query_platform_knowledge", "search_irem_benchmarks",
    # Appraisal knowledge (store + query from extracted appraisals)
    "store_appraisal_valuation", "store_market_intelligence",
    "store_construction_benchmarks", "get_appraisal_knowledge",
    # Contacts
    "search_cabinet_contacts", "get_project_contacts_v2", "get_contact_roles",
    "create_cabinet_contact", "assign_contact_to_project", "remove_contact_from_project",
    "extract_and_save_contacts", "update_project_contacts",
    # Property attributes / site
    "get_property_attributes", "update_property_attributes", "get_attribute_definitions",
    "update_site_attribute", "update_improvement_attribute",
    "calculate_remaining_economic_life", "get_zoning_info",
    # HBU
    "get_hbu_scenarios", "create_hbu_scenario", "update_hbu_scenario",
    "compare_hbu_scenarios", "generate_hbu_narrative", "get_hbu_conclusion",
    "add_hbu_comparable_use",
    # Valuation shared (sales comp, cost approach, income approach, reconciliation, cashflow)
    "get_cashflow_results", "compute_cashflow_expression", "update_cashflow_assumption",
    "get_sales_comparables", "update_sales_comparable", "delete_sales_comparable",
    "get_sales_comp_adjustments", "update_sales_comp_adjustment",
    "get_market_assumptions", "update_market_assumptions",
    "get_cost_approach", "update_cost_approach",
    "get_valuation_reconciliation", "update_valuation_reconciliation",
    "get_income_approach", "update_income_approach",
    "get_income_property", "update_income_property",
    # Cap structure
    "get_loans", "update_loan", "delete_loan",
    "get_equity_structure", "update_equity_structure",
    "get_waterfall_tiers", "update_waterfall_tiers",
    # Draft analysis + project creation
    "create_project",
    "create_analysis_draft", "update_analysis_draft",
    "run_draft_calculations", "convert_draft_to_project",
    # Location
    "get_location_analysis", "update_location_analysis",
    # Portfolio
    "get_portfolio_summary", "get_portfolio_assumptions", "get_project_assumptions_detail",
    # Misc
    "log_alpha_feedback",
    # UI navigation
    "open_input_modal",
    # Excel model audit (cross-cutting — any project type)
    "classify_excel_file",
    "run_structural_scan",
    "run_formula_integrity",
    "extract_assumptions",
    "classify_waterfall",
    "run_sources_uses",
    "compute_trust_score",
    # Map artifacts
    "generate_map_artifact",
    # Location Brief artifact (universal, works pre-project)
    "generate_location_brief",
    # P1 Analysis tools (Apr 2026)
    "list_projects_summary",
    "get_deal_summary",
    "get_project_profile",  # Read-only profile artifact (chat PV, May 2026)
    "update_project_msa",   # FK-aware MSA update (chat PV, May 2026)
    "get_data_completeness",
    "calculate_project_metrics",
    "calculate_cash_flow",
    "generate_report_preview",
    "export_report",
    "list_available_reports",
    # P2 Analysis tools (Apr 2026)
    "get_demographics",
    "calculate_waterfall",
    "calculate_mf_cashflow",
    # Generative Artifacts (Finding #4, Phase 1)
    "create_artifact",
    "update_artifact",
    "get_artifact_history",
    "restore_artifact_state",
    "find_dependent_artifacts",
    # User vocabulary learning (chat DA — universal pattern across domains)
    "save_user_vocab",
    # Cross-project document library search (chat qm — Platform Knowledge page)
    "find_documents",
    "summarize_document_library",
]

# Land development only — areas, phases, parcels, lots, milestones, land use,
# land comps, sale events, absorption, budget, land planning tools.
LAND_ONLY_TOOLS = [
    # Hierarchy
    "get_areas", "update_area", "delete_area",
    "get_phases", "update_phase", "delete_phase",
    "get_parcels", "update_parcel", "delete_parcel",
    # Lots
    "get_lots", "create_lot", "update_lot",
    "get_lot_types", "update_lot_type",
    # Milestones
    "get_milestones", "update_milestone", "delete_milestone",
    # Land use taxonomy
    "get_land_use_families", "update_land_use_family",
    "get_land_use_types", "update_land_use_type",
    "get_residential_products", "update_residential_product",
    # Land comps & sale assumptions
    "get_land_comp_detail", "update_land_comp_detail",
    "get_parcel_sale_assumptions", "update_parcel_sale_assumptions",
    "bulk_update_parcel_sale_assumptions",
    "update_land_use_pricing",
    "get_parcel_sale_events", "update_parcel_sale_event", "delete_parcel_sale_event",
    # Sale phases
    "get_sale_phases", "update_sale_phase",
    # Absorption & competitive
    "get_competitive_projects", "update_competitive_project", "delete_competitive_project",
    "get_absorption_benchmarks",
    "get_absorption_schedule", "update_absorption_schedule", "delete_absorption_schedule",
    # Budget (land dev uses budget grid; income property uses opex)
    "get_budget_categories", "update_budget_category",
    "get_budget_items", "update_budget_item", "delete_budget_item",
    # Land planning
    "configure_project_hierarchy", "create_land_dev_containers",
    "update_lot_mix", "update_land_use_budget",
    "land_planning_run", "land_planning_save",
    # Parcel import from spreadsheet
    "parse_spreadsheet_lots", "get_hierarchy_config", "bulk_create_parcels",
    "stage_parcel_lots",
]

# Multifamily only — units, leases, rent roll, rental comps, MF property, MF extensions.
MF_ONLY_TOOLS = [
    # Units & rent roll
    "get_unit_types", "update_unit_types",
    "get_units", "update_units", "delete_units",
    "get_leases", "update_leases",
    "get_unit_turns", "create_unit_turn",
    # Rental comps
    "get_rental_comparables", "update_rental_comparable", "delete_rental_comparable",
    "update_rental_comps",
    # MF property specifics
    "get_multifamily_property", "update_multifamily_property",
    "get_income_property_mf_ext", "update_income_property_mf_ext",
    # Lease & value-add assumptions
    "get_lease_assumptions", "update_lease_assumptions",
    "get_value_add_assumptions", "update_value_add_assumptions",
    # Rent roll extraction
    "analyze_rent_roll_columns", "confirm_column_mapping", "compute_rent_roll_delta",
]

# Income property tools — OpEx, revenue, vacancy, income analysis.
# Shared by MF + Office + Retail + Industrial (not land dev).
INCOME_PROPERTY_TOOLS = [
    "update_operating_expenses",
    "get_operating_statement",
    "get_acquisition", "update_acquisition",
    "get_revenue_rent", "update_revenue_rent",
    "get_revenue_other", "update_revenue_other",
    "get_vacancy_assumptions", "update_vacancy_assumptions",
    "analyze_loss_to_lease", "calculate_year1_buyer_noi",
    "check_income_analysis_availability",
]

# CRE-specific tools — tenants, spaces, leases for Office + Retail + Industrial.
CRE_ONLY_TOOLS = [
    "get_cre_tenants", "update_cre_tenant", "delete_cre_tenant",
    "get_cre_spaces", "update_cre_space", "delete_cre_space",
    "get_cre_leases", "update_cre_lease", "delete_cre_lease",
    "get_cre_properties", "update_cre_property",
    "get_cre_rent_roll",
]

# Ingestion workbench tools — always included (small set, needed for any doc intake).
INGESTION_TOOLS = [
    "get_ingestion_staging", "update_staging_field",
    "approve_staging_field", "reject_staging_field", "explain_extraction",
]

# What-If / scenario / IC tools — added when include_whatif=True.
WHATIF_TOOLS = [
    "whatif_compute", "whatif_compound", "whatif_reset", "whatif_attribute", "whatif_status",
    "scenario_save", "scenario_load", "scenario_log_query",
    "whatif_commit", "whatif_commit_selective", "whatif_undo",
    "scenario_replay", "scenario_compare", "scenario_diff",
    "scenario_branch", "scenario_apply_cross_project",
    "get_kpi_definitions", "update_kpi_definitions",
    "ic_start_session", "ic_challenge_next", "ic_respond_challenge", "sensitivity_grid",
]

# Admin/config tools — added when is_admin=True.
ADMIN_TOOLS = [
    "get_measures", "update_measure",
    "get_picklist_values", "update_picklist_value", "delete_picklist_value",
    "get_benchmarks", "update_benchmark", "delete_benchmark",
    "get_cost_library_items", "update_cost_library_item", "delete_cost_library_item",
    "get_report_templates", "get_dms_templates", "update_template",
]


# Tools safe to use without a project context (unassigned/general threads).
# These either operate on doc_id (not project_id), read platform-global data,
# or create new projects (the path out of unassigned mode).
UNASSIGNED_SAFE_TOOLS = [
    # Excel model audit (operate on doc_id only)
    "classify_excel_file", "run_structural_scan",
    "run_formula_integrity", "extract_assumptions",
    "classify_waterfall", "run_sources_uses", "compute_trust_score",
    # UI affordance
    "open_input_modal",
    # Platform knowledge / reference data
    "query_platform_knowledge", "search_irem_benchmarks",
    "get_knowledge_entities", "get_knowledge_facts", "get_knowledge_insights",
    "acknowledge_insight",
    # Project creation (the way out of unassigned mode)
    "create_project", "create_analysis_draft", "update_analysis_draft",
    "run_draft_calculations", "convert_draft_to_project",
    # Alpha feedback
    "log_alpha_feedback",
    # Ingestion tools (operate on doc_id + session, not project)
    "get_ingestion_staging", "update_staging_field",
    "approve_staging_field", "reject_staging_field", "explain_extraction",
    # Analysis tools that work without project context
    "list_projects_summary", "list_available_reports",
    # Universal location intelligence (FRED + Census, no project required)
    "generate_location_brief",
    # User vocabulary learning — pre-project vocab works the same as project-scoped
    "save_user_vocab",
    # Generative Artifacts (Finding #4, Phase 1) — pre-project artifacts
    # are saved with project_id NULL; same lifecycle tools apply.
    "create_artifact",
    "update_artifact",
    "get_artifact_history",
    "restore_artifact_state",
    "find_dependent_artifacts",
    # Cross-project document library search (chat qm — Platform Knowledge page)
    "find_documents",
    "summarize_document_library",
]


def get_tools_for_unassigned() -> List[str]:
    """Return tool names available in unassigned (pre-project) threads."""
    return list(UNASSIGNED_SAFE_TOOLS)


# =============================================================================
# PROPERTY TYPE → TOOL MAP
# =============================================================================

# Maps normalized project_type_code to the base tool set (UNIVERSAL + type-specific).
# WHATIF and ADMIN are additive flags, not part of the base map.
PROPERTY_TYPE_TOOL_MAP = {
    "land": UNIVERSAL_TOOLS + LAND_ONLY_TOOLS + INGESTION_TOOLS,
    "mf":   UNIVERSAL_TOOLS + MF_ONLY_TOOLS + INCOME_PROPERTY_TOOLS + INGESTION_TOOLS,
    "off":  UNIVERSAL_TOOLS + CRE_ONLY_TOOLS + INCOME_PROPERTY_TOOLS + INGESTION_TOOLS,
    "ret":  UNIVERSAL_TOOLS + CRE_ONLY_TOOLS + INCOME_PROPERTY_TOOLS + INGESTION_TOOLS,
    "ind":  UNIVERSAL_TOOLS + CRE_ONLY_TOOLS + INCOME_PROPERTY_TOOLS + INGESTION_TOOLS,
}

# Normalize various project_type strings to short codes.
_PROJECT_TYPE_ALIASES = {
    "land": "land", "land_dev": "land", "land development": "land",
    "mf": "mf", "multifamily": "mf", "multi_family": "mf", "multi-family": "mf",
    "off": "off", "office": "off",
    "ret": "ret", "retail": "ret",
    "ind": "ind", "industrial": "ind",
    "htl": "mf",   # Hotel uses MF-like tools (units/rooms)
    "mxu": "mf",   # Mixed-use defaults to MF tool set (broadest income-property set)
}


def _normalize_project_type(
    project_type_code: Optional[str] = None,
    project_type: Optional[str] = None,
) -> Optional[str]:
    """Normalize project type to a short code (land/mf/off/ret/ind) or None."""
    raw = project_type_code or project_type or ""
    key = raw.strip().lower()
    return _PROJECT_TYPE_ALIASES.get(key)


# =============================================================================
# PAGE TOOL SETS (retained for logging/analytics — not used for tool gating)
# =============================================================================

PAGE_TOOLS = {
    # -------------------------------------------------------------------------
    # MULTIFAMILY PAGES
    # -------------------------------------------------------------------------
    "mf_home": [
        "get_project_contacts_v2",
        "search_cabinet_contacts",
        "get_knowledge_insights",
        "acknowledge_insight",
        # Knowledge / RAG search
        "query_platform_knowledge",
        "get_knowledge_entities",
        "get_knowledge_facts",
    ],

    "mf_property": [
        # Unit mix & rent roll
        "get_unit_types",
        "update_unit_types",
        "get_units",
        "update_units",
        "delete_units",
        "get_leases",
        "update_leases",
        # Comparables
        "get_rental_comparables",
        "update_rental_comparable",
        "delete_rental_comparable",
        # Property attributes
        "get_property_attributes",
        "update_property_attributes",
        "get_attribute_definitions",
        "update_site_attribute",
        "update_improvement_attribute",
        # Acquisition
        "get_acquisition",
        "update_acquisition",
    ],

    "mf_operations": [
        # Operating expenses
        "update_operating_expenses",
        # Revenue
        "get_revenue_rent",
        "update_revenue_rent",
        "get_revenue_other",
        "update_revenue_other",
        # Vacancy
        "get_vacancy_assumptions",
        "update_vacancy_assumptions",
    ],

    "mf_valuation": [
        # Cash flow & DCF
        "get_cashflow_results",
        "compute_cashflow_expression",
        "update_cashflow_assumption",
        # Sales comps
        "get_sales_comparables",
        "update_sales_comparable",
        "delete_sales_comparable",
        "get_sales_comp_adjustments",
        "update_sales_comp_adjustment",
        # Financial analysis
        "analyze_loss_to_lease",
        "calculate_year1_buyer_noi",
        "check_income_analysis_availability",
        # Market assumptions
        "get_market_assumptions",
        "update_market_assumptions",
        # P2 analysis — waterfall + MF cash flow metrics
        "calculate_waterfall",
        "calculate_mf_cashflow",
        # Knowledge / RAG search — needed for finding comps in uploaded docs
        "query_platform_knowledge",
    ],

    "mf_capitalization": [
        # Debt
        "get_loans",
        "update_loan",
        "delete_loan",
        # Equity
        "get_equity_structure",
        "update_equity_structure",
        # Waterfall
        "get_waterfall_tiers",
        "update_waterfall_tiers",
        "calculate_waterfall",
    ],

    # -------------------------------------------------------------------------
    # LAND DEVELOPMENT PAGES
    # -------------------------------------------------------------------------
    "land_home": [
        "get_project_contacts_v2",
        "search_cabinet_contacts",
        "get_knowledge_insights",
        "acknowledge_insight",
        # Knowledge / RAG search
        "query_platform_knowledge",
        "get_knowledge_entities",
        "get_knowledge_facts",
        # Land dev ingestion
        "configure_project_hierarchy",
        "create_land_dev_containers",
    ],

    "land_planning": [
        # Hierarchy
        "get_areas",
        "update_area",
        "delete_area",
        "get_phases",
        "update_phase",
        "delete_phase",
        "get_parcels",
        "update_parcel",
        "delete_parcel",
        # Land use
        "get_land_use_families",
        "update_land_use_family",
        "get_land_use_types",
        "update_land_use_type",
        "get_residential_products",
        "update_residential_product",
        # Milestones
        "get_milestones",
        "update_milestone",
        "delete_milestone",
        # Land dev ingestion tools (2026-02-26)
        "configure_project_hierarchy",
        "create_land_dev_containers",
        "update_lot_mix",
        "update_land_use_budget",
        # Parcel import from spreadsheet
        "parse_spreadsheet_lots",
        "get_hierarchy_config",
        "bulk_create_parcels",
        "stage_parcel_lots",
    ],

    "land_budget": [
        # Budget
        "get_budget_categories",
        "update_budget_category",
        "get_budget_items",
        "update_budget_item",
        "delete_budget_item",
    ],

    "land_schedule": [
        # Absorption
        "get_absorption_schedule",
        "update_absorption_schedule",
        "delete_absorption_schedule",
        "get_absorption_benchmarks",
        # Sale events
        "get_parcel_sale_events",
        "update_parcel_sale_event",
        "delete_parcel_sale_event",
        # Pricing (land_use_pricing is source of truth)
        "update_land_use_pricing",
        # Market
        "get_competitive_projects",
        "update_competitive_project",
        "delete_competitive_project",
    ],

    "land_valuation": [
        # Cash flow & DCF
        "get_cashflow_results",
        "compute_cashflow_expression",
        "update_cashflow_assumption",
        # Market
        "get_market_assumptions",
        "update_market_assumptions",
        # Hierarchy (for filtering)
        "get_areas",
        "get_phases",
        # Knowledge / RAG search
        "query_platform_knowledge",
    ],

    "land_capitalization": [
        # Debt
        "get_loans",
        "update_loan",
        "delete_loan",
        # Equity
        "get_equity_structure",
        "update_equity_structure",
        # Waterfall
        "get_waterfall_tiers",
        "update_waterfall_tiers",
    ],

    # -------------------------------------------------------------------------
    # SHARED PAGES
    # -------------------------------------------------------------------------
    "documents": [
        # All extraction tools loaded automatically via EXTRACTION_TOOLS
        "get_knowledge_entities",
        "get_knowledge_facts",
    ],

    "map": [
        # Property attributes for location
        "get_property_attributes",
        "update_property_attributes",
        "update_site_attribute",
        # Map artifact generation
        "generate_map_artifact",
    ],

    "reports": [
        # Read-only access to key data for report context
        "get_cashflow_results",
        "get_unit_types",
        "get_budget_items",
    ],

    # -------------------------------------------------------------------------
    # SPECIAL CONTEXTS
    # -------------------------------------------------------------------------
    "alpha_assistant": [
        # Minimal tools for help context - intentionally limited
        "get_project_fields",      # Basic project info only
        "log_alpha_feedback",      # Log bugs/suggestions from chat
    ],

    "dashboard": [
        # Dashboard context - project creation + home tools
        "create_project",
        "create_analysis_draft",
        "update_analysis_draft",
        "run_draft_calculations",
        "convert_draft_to_project",
        "get_project_contacts_v2",
        "search_cabinet_contacts",
        "get_knowledge_insights",
        "acknowledge_insight",
    ],

    # -------------------------------------------------------------------------
    # NON-PROJECT CONTEXTS (Global Landscaper)
    # -------------------------------------------------------------------------
    "dms": [
        # Document management system - RAG and knowledge tools
        "search_irem_benchmarks",
        "query_platform_knowledge",
        "get_knowledge_entities",
        "get_knowledge_facts",
    ],

    "benchmarks": [
        # Benchmarks page - IREM data and knowledge tools
        "search_irem_benchmarks",
        "get_benchmarks",
        "update_benchmark",
        "get_knowledge_insights",
        "query_platform_knowledge",
    ],

    "admin": [
        # Admin configuration pages
        "get_benchmarks",
        "update_benchmark",
        "delete_benchmark",
        "get_measures",
        "update_measure",
        "get_picklist_values",
        "update_picklist_value",
    ],

    "settings": [
        # Settings/preferences pages
        "get_benchmarks",
        "get_measures",
        "get_picklist_values",
        "get_budget_categories",
    ],

    # -------------------------------------------------------------------------
    # INGESTION WORKBENCH (post-upload structured extraction review)
    # -------------------------------------------------------------------------
    "ingestion": [
        # Read/write to ai_extraction_staging for field review
        "get_ingestion_staging",
        "update_staging_field",
        "approve_staging_field",
        "reject_staging_field",
        "explain_extraction",
        # Document content access for source verification
        "get_document_content",
        "get_document_page",
    ],

    # -------------------------------------------------------------------------
    # INVESTMENT COMMITTEE PAGE (Phase 7)
    # -------------------------------------------------------------------------
    "investment_committee": [
        # IC gets valuation tools + scenario tools via WHATIF_TOOLS
        # Plus cash flow and KPI access for results tabs
        "get_cashflow_results",
        "compute_cashflow_expression",
        "get_market_assumptions",
        "update_market_assumptions",
        "get_unit_types",
        "get_budget_items",
    ],
}


# =============================================================================
# CONTEXT NORMALIZATION
# =============================================================================

def _is_land_project(project_type_code: Optional[str], project_type: Optional[str]) -> bool:
    """
    Detect whether the project is a land development use case.
    """
    if project_type_code:
        return "land" in project_type_code.lower()
    if project_type:
        return "land" in project_type.lower()
    return False


def _resolve_land_budget_context(subtab_context: Optional[str]) -> str:
    if subtab_context:
        subtab = subtab_context.strip().lower()
        if subtab in ("schedule", "sales"):
            return "land_schedule"
    return "land_budget"


def normalize_page_context(
    page_context: Optional[str],
    project_type_code: Optional[str] = None,
    project_type: Optional[str] = None,
    analysis_perspective: Optional[str] = None,
    analysis_purpose: Optional[str] = None,
    subtab_context: Optional[str] = None,
) -> str:
    """
    Normalize legacy folder contexts to registry keys (mf_/land_ prefixes).

    analysis_perspective and analysis_purpose are accepted for forward-compatibility
    but are not currently used for tool gating.
    """
    is_land = _is_land_project(project_type_code, project_type)
    default_home = "land_home" if is_land else "mf_home"

    if not page_context:
        return default_home

    ctx = page_context.strip().lower()

    if ctx in PAGE_TOOLS:
        return ctx

    if ctx in ("home", "project"):
        return default_home
    if ctx == "property":
        return "land_planning" if is_land else "mf_property"
    if ctx == "operations":
        return "mf_operations"
    if ctx in ("valuation", "feasibility", "cashflow"):
        return "land_valuation" if ctx == "feasibility" or is_land else "mf_valuation"
    if ctx in ("capitalization", "capital"):
        return "land_capitalization" if is_land else "mf_capitalization"
    if ctx == "budget":
        return _resolve_land_budget_context(subtab_context) if is_land else "mf_operations"
    if ctx in ("schedule", "sales"):
        return "land_schedule"
    if ctx in ("reports", "document", "documents", "map", "alpha_assistant"):
        return ctx if ctx in PAGE_TOOLS else ("documents" if ctx == "document" else ctx)
    if ctx in ("investment_committee", "ic", "ic_review"):
        return "investment_committee"
    if ctx in ("ingestion", "workbench", "intake"):
        return "ingestion"

    return default_home


# =============================================================================
# TOOL FILTERING FUNCTIONS
# =============================================================================

def _has_active_extraction_workflow(project_id: Optional[int]) -> bool:
    """
    Check if the project has an active extraction workflow awaiting delta review.

    Uses a lightweight DB query (.exists()) to avoid performance impact on
    every Landscaper turn. Only called when keyword matching didn't already
    trigger extraction tool inclusion.
    """
    if not project_id:
        return False
    try:
        from apps.knowledge.models import ExtractionJob
        return ExtractionJob.objects.filter(
            project_id=project_id,
            result_summary__awaiting_delta_review=True,
        ).exists()
    except Exception:
        return False


def get_tools_for_page(
    page_context: str,
    include_extraction: bool = False,
    is_admin: bool = False,
    project_id: Optional[int] = None,
    project_type_code: Optional[str] = None,
    project_type: Optional[str] = None,
    include_whatif: bool = True,
) -> List[str]:
    """
    Return tool names filtered by property type, with cross-page availability.

    Layer 1: Property-type hard gates — never send tools irrelevant to this
             project type (e.g. no MF unit tools on a land dev project).
    Layer 2: Cross-page availability — all tools for the project type are
             available regardless of current tab, so users can update any
             field from any page.

    Additional flags:
    - include_whatif: Add what-if/scenario/IC tools (default True).
    - is_admin: Add admin/config tools.
    - include_extraction: Accepted for API compatibility (extraction tools
      are now included in base set for all property types).

    Falls back to ALL 217 tools if project_type is unknown or missing.
    """
    pt = _normalize_project_type(project_type_code, project_type)

    if pt and pt in PROPERTY_TYPE_TOOL_MAP:
        tools: List[str] = list(PROPERTY_TYPE_TOOL_MAP[pt])
    else:
        # Unknown project type — safe fallback to all tools
        from .tool_schemas import LANDSCAPER_TOOLS
        tools = [t["name"] for t in LANDSCAPER_TOOLS]
        return tools  # All tools already included, no need for additive flags

    if include_whatif:
        tools.extend(WHATIF_TOOLS)

    if is_admin:
        tools.extend(ADMIN_TOOLS)

    # Deduplicate while preserving order
    seen: Set[str] = set()
    unique: List[str] = []
    for name in tools:
        if name not in seen:
            seen.add(name)
            unique.append(name)
    return unique


def should_include_extraction_tools(user_message: str) -> bool:
    """
    Detect if the user message references documents or extraction.
    """
    extraction_keywords = [
        "document", "upload", "extract", "rent roll", "t-12", "t12",
        "offering memo", "appraisal", "pdf", "file", "import", "om "
    ]
    message_lower = user_message.lower()
    return any(keyword in message_lower for keyword in extraction_keywords)


def get_tool_count_for_page(
    page_context: str,
    project_type_code: Optional[str] = None,
    project_type: Optional[str] = None,
) -> int:
    """Get expected tool count for a page (for logging/debugging)."""
    tools = get_tools_for_page(
        page_context,
        project_type_code=project_type_code,
        project_type=project_type,
    )
    return len(tools)
