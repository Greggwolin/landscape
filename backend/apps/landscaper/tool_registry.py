"""
Page-scoped tool registry for Landscaper.

Reduces tool count from 135 to ~15-25 per page to prevent
Claude tool-use degradation in long conversations.
"""

from typing import List, Optional, Set


# =============================================================================
# TIER DEFINITIONS
# =============================================================================

# Tier 1: Universal tools - available on ALL pages
UNIVERSAL_TOOLS = [
    "update_project_field",
    "bulk_update_fields",
    "get_project_fields",
    "get_field_schema",
]

# Tier 2: Extraction tools - only on Documents page or when document mentioned
EXTRACTION_TOOLS = [
    "get_project_documents",
    "get_document_content",
    "get_document_assertions",
    "ingest_document",
    "get_extraction_results",
    "update_extraction_result",
    "get_extraction_corrections",
    "log_extraction_correction",
    "extract_and_save_contacts",
]

# Tier 3: Admin/Config tools - only in admin context
ADMIN_TOOLS = [
    "get_measures",
    "update_measure",
    "get_picklist_values",
    "update_picklist_value",
    "delete_picklist_value",
    "get_benchmarks",
    "update_benchmark",
    "delete_benchmark",
    "get_cost_library_items",
    "update_cost_library_item",
    "delete_cost_library_item",
    "get_report_templates",
    "get_dms_templates",
    "update_template",
]


# =============================================================================
# PAGE TOOL SETS
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
    ],

    "mf_property": [
        # Unit mix & rent roll
        "get_unit_types",
        "update_unit_types",
        "get_units",
        "update_units",
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
    ],

    "mf_capitalization": [
        # Debt
        "get_debt_facilities",
        "update_debt_facility",
        "delete_debt_facility",
        # Equity
        "get_equity_structure",
        "update_equity_structure",
        # Waterfall
        "get_waterfall_tiers",
        "update_waterfall_tiers",
    ],

    # -------------------------------------------------------------------------
    # LAND DEVELOPMENT PAGES
    # -------------------------------------------------------------------------
    "land_home": [
        "get_project_contacts_v2",
        "search_cabinet_contacts",
        "get_knowledge_insights",
        "acknowledge_insight",
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
    ],

    "land_capitalization": [
        # Debt
        "get_debt_facilities",
        "update_debt_facility",
        "delete_debt_facility",
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
        # Note: GIS-specific tools would go here when implemented
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
        # Dashboard context - same tools as home, explicitly defined
        # so it doesn't fall back silently to mf_home
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
    subtab_context: Optional[str] = None,
) -> str:
    """
    Normalize legacy folder contexts to registry keys (mf_/land_ prefixes).
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

    return default_home


# =============================================================================
# TOOL FILTERING FUNCTIONS
# =============================================================================

def get_tools_for_page(
    page_context: str,
    include_extraction: bool = False,
    is_admin: bool = False
) -> List[str]:
    """
    Get the list of tool names available for a given page context.

    Args:
        page_context: The current normalized page identifier (e.g., "mf_valuation")
        include_extraction: Include extraction tools (user mentioned document)
        is_admin: Include admin/config tools

    Returns:
        List of tool names to include in Claude's tool set
    """
    tools: Set[str] = set()

    # Always include universal tools
    tools.update(UNIVERSAL_TOOLS)

    # Add page-specific tools
    if page_context in PAGE_TOOLS:
        tools.update(PAGE_TOOLS[page_context])

    # Add extraction tools if on Documents page or document mentioned
    if include_extraction or page_context == "documents":
        tools.update(EXTRACTION_TOOLS)

    # Add admin tools if admin context
    if is_admin:
        tools.update(ADMIN_TOOLS)

    return list(tools)


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


def get_tool_count_for_page(page_context: str) -> int:
    """Get expected tool count for a page (for logging/debugging)."""
    tools = get_tools_for_page(page_context)
    return len(tools)
