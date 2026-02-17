"""
Help Landscaper AI Handler

Dedicated handler for the global Help Landscaper — a platform training assistant
that explains features, navigation, and calculations. Has NO access to project data
or tools. Uses platform knowledge retrieval for every message.
"""

import logging
import os
from typing import Dict, List, Any, Optional

import anthropic

from .ai_handler import _get_anthropic_client

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-20250514"

HELP_SYSTEM_PROMPT = """You are Landscape Help — a training assistant for the Landscape real estate analytics platform.

## YOUR ROLE
You help users learn how to use the Landscape application. You are like a patient, knowledgeable colleague who has used every feature and can explain exactly where things are and how they work.

## WHAT YOU KNOW
- Every page, tab, and feature in the application
- How to navigate between sections (folder tabs: Home, Property, Operations/Budget, Valuation/Feasibility, Capital, Reports, Documents, Map)
- How calculations work (DCF, Direct Cap, residual land value, waterfall distributions, NOI, cap rates, IRR, equity multiples)
- How data flows between pages (rent roll to operations to income approach, etc.)
- What each input field does and what values are typical
- How Landscape compares to ARGUS Enterprise, ARGUS Developer, and Excel-based workflows
- What features are available now vs coming soon

## NAVIGATION REFERENCE

### Multifamily / Income Property Projects
| Folder | Tabs | What It Does |
|--------|------|-------------|
| Home | Project | Dashboard with KPIs, activity feed |
| Property | Details, Acquisition, Market, Rent Roll, Renovation | Physical property info, unit-level data |
| Operations | Operations (unified P&L) | Revenue and expense management, benchmarking |
| Valuation | Sales Comparison, Cost Approach, Income Approach | Three approaches to value |
| Capital | Equity, Debt | Capital structure, waterfall, loan terms |
| Reports | Summary, Export | Generated outputs |
| Documents | All, Extractions | Document management, AI extraction |
| Map | Unified spatial hub | GIS and mapping |

### Land Development Projects
| Folder | Tabs | What It Does |
|--------|------|-------------|
| Home | Project | Dashboard with KPIs |
| Property | Acquisition, Market, Land Use, Parcels | Physical property, product types |
| Budget | Budget, Schedule, Sales, Draws | Development costs, absorption, timing |
| Feasibility | Feasibility, Cash Flow, Returns, Sensitivity | Residual land value, projections |
| Capital | Equity, Debt | Capital structure, waterfall |
| Reports | Summary, Export | Generated outputs |
| Documents | All, Extractions | Document management |
| Map | Unified spatial hub | GIS and mapping |

## CROSSWALK REFERENCES

When users mention other tools, translate to Landscape equivalents:

### For ARGUS Enterprise Users
- "Rent Roll" in Landscape = "Tenants" module in ARGUS Enterprise
- "Operations" tab = "Revenue & Expense" in ARGUS
- "Income Approach" = DCF analysis similar to ARGUS cash flow
- Landscape auto-flows rent roll data to operations — ARGUS requires manual linking
- Landscape has two project modes: Napkin (quick analysis with ~23 essential fields) and Standard (full professional analysis). You can switch between them without losing data. ARGUS has no equivalent — it is always full complexity from the start.

### For ARGUS Developer Users
- "Budget" tab = "Construction" module in ARGUS Developer
- "Feasibility" = "Appraisal" in ARGUS Developer
- "Sales" tab = "Revenue > Unit Sales" in Developer
- Land Use categories = "Area" definitions in Developer
- Landscape uses drag-and-drop hierarchy; Developer uses fixed tree structure

### For Excel Users
- Landscape replaces the typical "tabs across the bottom" Excel model
- Each Landscape folder/tab corresponds to what would be a worksheet in Excel
- Formulas are built in — no need to maintain cell references
- Project modes (Napkin/Standard) let you start simple (like a quick Excel sketch) and add detail later
- Document upload + AI extraction replaces manual copy-paste from OMs into Excel

## HOW DATA FLOWS
- Rent Roll -> Operations (rental income auto-populates)
- Operations -> Income Approach (NOI feeds DCF and Direct Cap)
- Market data -> Assumption validation (benchmarks flag outliers)
- Documents -> Any tab (AI extraction populates fields across the project)
- Budget line items -> Feasibility (costs feed residual land value)
- Sales absorption -> Cash flow projections

## THE LANDSCAPER AI ASSISTANT (Project Landscaper)
Users may ask about the AI assistant they see in project workspaces. Explain:
- Project Landscaper lives in the right panel of any project workspace
- It has access to all project data and can read/update fields
- It can extract data from uploaded documents (OMs, rent rolls, T-12s, appraisals)
- It validates assumptions against market benchmarks
- It is different from YOU (Help) — you explain the app, it works with their data

## BEHAVIOR RULES
1. Be concise and direct — users want answers, not lectures
2. When explaining where something is, give the exact path: "Go to Valuation > Income Approach. The cap rate field is in the Assumptions panel on the right side."
3. If a feature is not built yet, say so honestly: "That feature is not available yet — it is on the roadmap"
4. Do not apologize excessively — just answer
5. If the user mentions their current page context, tailor your answer to what they can see right now
6. For calculation questions, explain the formula AND where the inputs come from in the app
7. Never reference project-specific data — you do not have access to it. Direct them to the Project Landscaper for data questions.
8. Keep responses to 2-5 sentences for simple navigation questions
9. For "how do I..." questions: give the navigation path, then briefly explain what they will see

## KNOWN LIMITATIONS (be honest about these)
- Schedule tab: placeholder, not yet functional
- Draws tab: placeholder, not yet functional
- Documents > Extractions sub-tab: not yet functional
- GIS/parcel import: not yet available
- Excel import: not yet available
- Automated comp sourcing: not yet available
- Sensitivity analysis: not yet implemented
- Report export: limited to browser print currently
"""


# Map frontend current_page values (folder_tab) to section_path page names.
# Frontend sends URL-based IDs; section_paths use underscored names.
PAGE_CONTEXT_MAP = {
    # Direct matches (folder only, no tab)
    'home': 'home',
    'operations': 'operations',
    'documents': 'documents',
    'capital': 'capital',
    'reports': 'reports',
    'map': 'map',

    # folder_tab combinations
    'property_details': 'property_details',
    'property_rent-roll': 'rent_roll',
    'property_acquisition': 'property',
    'property_market': 'property',
    'property_renovation': 'property',
    'property_land-use': 'land_use',
    'property_parcels': 'land_use',

    'valuation_income': 'valuation_income',
    'valuation_sales-comparison': 'valuation_sales_comp',
    'valuation_cost': 'valuation_cost',

    'budget_budget': 'budget',
    'budget_sales': 'budget',
    'budget_schedule': 'budget',
    'budget_draws': 'budget',

    'feasibility_feasibility': 'feasibility',
    'feasibility_cash-flow': 'feasibility',
    'feasibility_returns': 'feasibility',
    'feasibility_sensitivity': 'feasibility',

    'capital_equity': 'capital',
    'capital_debt': 'capital',

    'reports_summary': 'reports',
    'reports_export': 'reports',
}


def _normalize_page_context(current_page: Optional[str]) -> Optional[str]:
    """Normalize frontend current_page to section_path page name."""
    if not current_page:
        return None
    return PAGE_CONTEXT_MAP.get(current_page, current_page)


def _get_alpha_help_context_for_help(
    query: str,
    page_context: Optional[str] = None,
    property_type_context: Optional[str] = None,
    max_chunks: int = 5,
) -> str:
    """
    Retrieve platform knowledge chunks for Help Landscaper context.

    Always queries platform knowledge for every help message.
    Uses the same tbl_platform_knowledge_chunks table as the project Landscaper.
    """
    try:
        from django.db import connection
        from apps.knowledge.services.embedding_service import generate_embedding

        # Normalize page context to match section_path conventions
        page_context = _normalize_page_context(page_context)

        # Build enriched query for better retrieval
        retrieval_query = query
        if page_context:
            retrieval_query += f" {page_context} page"

        query_embedding = generate_embedding(retrieval_query)
        if not query_embedding:
            logger.warning("Failed to generate embedding for help query")
            return ""

        embedding_str = '[' + ','.join(str(x) for x in query_embedding) + ']'

        # Build filter conditions
        where_conditions = [
            "pk.is_active = TRUE",
            "c.embedding IS NOT NULL",
        ]
        filter_params = []

        # Filter by alpha_docs category (platform knowledge)
        where_conditions.append("pk.knowledge_domain = 'alpha_help'")

        # Property type filter in section_path
        if property_type_context:
            prop_type_map = {
                'mf': 'MF',
                'multifamily': 'MF',
                'land': 'LAND_DEV',
                'land_dev': 'LAND_DEV',
            }
            alpha_prop_type = prop_type_map.get(property_type_context.lower(), None)
            if alpha_prop_type:
                where_conditions.append(
                    "(c.section_path LIKE %s OR c.section_path LIKE 'BOTH/%%')"
                )
                filter_params.append(f"{alpha_prop_type}/%")

        # Page context filter in section_path
        if page_context:
            where_conditions.append("c.section_path LIKE %s")
            filter_params.append(f"%/{page_context}/%")

        where_clause = " AND ".join(where_conditions)

        sql = f"""
            SELECT
                c.content,
                c.content_type,
                c.section_path,
                (c.embedding <=> %s::vector) as distance
            FROM landscape.tbl_platform_knowledge_chunks c
            JOIN landscape.tbl_platform_knowledge pk ON c.document_id = pk.id
            WHERE {where_clause}
              AND (c.embedding <=> %s::vector) < 0.55
            ORDER BY distance ASC
            LIMIT %s
        """

        params = [embedding_str] + filter_params + [embedding_str, max_chunks]

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        if not rows:
            # Broaden search: drop page_context filter, use higher threshold
            broader_conditions = [
                "pk.is_active = TRUE",
                "c.embedding IS NOT NULL",
                "pk.knowledge_domain = 'alpha_help'",
            ]
            broader_params = []

            broader_clause = " AND ".join(broader_conditions)
            broader_sql = f"""
                SELECT
                    c.content,
                    c.content_type,
                    c.section_path,
                    (c.embedding <=> %s::vector) as distance
                FROM landscape.tbl_platform_knowledge_chunks c
                JOIN landscape.tbl_platform_knowledge pk ON c.document_id = pk.id
                WHERE {broader_clause}
                  AND (c.embedding <=> %s::vector) < 0.65
                ORDER BY distance ASC
                LIMIT %s
            """
            broader_params = [embedding_str] + broader_params + [embedding_str, max_chunks]

            with connection.cursor() as cursor:
                cursor.execute(broader_sql, broader_params)
                rows = cursor.fetchall()

        if not rows:
            return ""

        # Format chunks for system prompt injection
        chunks = []
        for content, content_type, section_path, distance in rows:
            similarity = 1 - distance
            chunks.append(
                f"[Platform Knowledge | {section_path or 'general'} | "
                f"sim={similarity:.2f}]\n{content}"
            )

        context = "\n\n---\n\n".join(chunks)
        return f"\n\n<platform_knowledge_context>\n{context}\n</platform_knowledge_context>"

    except Exception as e:
        logger.warning(f"Failed to retrieve help context: {e}")
        return ""


def get_help_response(
    message: str,
    current_page: Optional[str] = None,
    property_type_context: Optional[str] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Generate a Help Landscaper response.

    This is a simplified version of get_landscaper_response that:
    - Uses a dedicated help system prompt
    - Always retrieves platform knowledge
    - Passes NO tools to Claude
    - Has no project context

    Args:
        message: User's question
        current_page: Current UI page (optional, for page-specific guidance)
        property_type_context: Property type if inside a project (optional)
        conversation_history: Previous messages [{role, content}, ...]

    Returns:
        Dict with content, metadata
    """
    # Build system prompt with platform knowledge
    full_system = HELP_SYSTEM_PROMPT

    # Retrieve platform knowledge for this query
    knowledge_context = _get_alpha_help_context_for_help(
        query=message,
        page_context=current_page,
        property_type_context=property_type_context,
        max_chunks=5,
    )
    if knowledge_context:
        full_system += knowledge_context
        logger.info("Platform knowledge context added to help system prompt")

    # Add page context hint — format as human-readable label
    if current_page:
        page_label = current_page.replace('_', ' > ').replace('-', ' ').title()
        full_system += f"\n\n[USER IS CURRENTLY ON: {page_label} page]"

    # Build message history
    messages = list(conversation_history or [])
    messages.append({"role": "user", "content": message})

    try:
        client = _get_anthropic_client()
        if not client:
            logger.error("Failed to create Anthropic client for Help Landscaper")
            return {
                'content': "I'm having trouble connecting right now. Please try again in a moment.",
                'metadata': {'error': 'ANTHROPIC_API_KEY not configured'},
            }

        response = client.messages.create(
            model=CLAUDE_MODEL,
            system=full_system,
            messages=messages,
            max_tokens=2048,  # NO TOOLS — Help Landscaper is read-only
        )

        # Extract text content
        content = ""
        for block in response.content:
            if hasattr(block, 'text'):
                content += block.text

        metadata = {
            'model': CLAUDE_MODEL,
            'input_tokens': response.usage.input_tokens,
            'output_tokens': response.usage.output_tokens,
            'stop_reason': response.stop_reason,
            'has_platform_knowledge': bool(knowledge_context),
            'current_page': current_page,
            'property_type_context': property_type_context,
        }

        return {
            'content': content,
            'metadata': metadata,
        }

    except Exception as e:
        logger.exception(f"Help Landscaper API error: {e}")
        return {
            'content': "I'm having trouble connecting right now. Please try again in a moment.",
            'metadata': {'error': str(e)},
        }
