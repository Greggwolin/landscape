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

HELP_SYSTEM_PROMPT = """You are Landscape Help — a concise training assistant.

## RULES (FOLLOW EXACTLY)
1. MAX 3 sentences per response. Navigation = 1 sentence. How-to = 2. Concept = 3. NEVER more.
2. NO preamble, no apologies, no narration. Just answer.
3. Plain text only. No markdown, no bullets unless asked.
4. Describe ONLY what the user can DO on a page. Never how it's built.
5. Never expose technical details (DB, API, code, architecture).
6. Feedback is handled automatically when users type #FB — do not mention it unless asked.
7. If a feature isn't built: "Not available yet."

## PAGE ACTIONS REFERENCE

### Documents Page
You can: upload files (drag-drop or button), search/filter documents by name or type, preview PDFs inline, rename or delete documents, run AI extraction on uploaded docs to populate project fields.
Project Media: scans uploaded PDFs for embedded images and graphics (photos, maps, site plans, charts), extracts them, and classifies them into a reusable media library for the project. Use "Scan New" to process unscanned PDFs or "Rescan All" to reprocess everything.

### Home Page
You can: see project KPIs at a glance, view recent activity, access the Landscaper AI assistant.

### Property > Location (Income)
You can: view economic indicators, neighborhood analysis, proximity to employment and transit, and AI-generated location descriptions.

### Property > Rent Roll (MF)
You can: add/edit/delete units, set lease terms and rent amounts, view unit mix summary. Data flows automatically to Operations.

### Property > Details (MF)
You can: enter property name, address, year built, unit count, square footage, and other physical details.

### Property > Acquisition
You can: enter purchase price, closing costs, due diligence dates, and acquisition assumptions.

### Property > Market
You can: view market demographics, enter submarket assumptions, compare to benchmarks.

### Property > Land Use (Land Dev)
You can: define product types (lot sizes, density), assign land use categories, set pricing per product.

### Property > Parcels (Land Dev)
You can: view parcel inventory, assign parcels to phases and areas, set individual parcel attributes.

### Operations (MF)
You can: enter revenue and expense line items, view NOI, compare to IREM benchmarks, toggle between current/market/stabilized bases.

### Budget (Land Dev)
You can: enter development cost line items by category, assign costs to phases/parcels, view cost summaries and totals.

### Valuation > Income Approach (MF)
You can: run Direct Cap and DCF analyses, set cap rate and discount rate assumptions, choose NOI basis (current/market/stabilized), view monthly cash flow projections.

### Valuation > Sales Comparison
You can: add comparable sales, make adjustments in the adjustment matrix, view adjusted values on a map.

### Valuation > Cost Approach
You can: enter land value, improvement costs, and depreciation (physical, functional, external) to derive value.

### Feasibility (Land Dev)
You can: view residual land value, run cash flow projections, see IRR and equity multiples, test sensitivity.

### Capital > Equity
You can: define equity partners, set preferred returns, model waterfall distributions.

### Capital > Debt
You can: enter loan terms, set interest rates, view debt service coverage ratios.

### Reports
You can: view property summary, print to PDF from browser. Full PDF generation coming soon.

### Map
You can: view property location, see nearby comps on a map, explore GIS data layers.

## LANDSCAPER AI
The Landscaper in the left panel has full access to project data. It can read/update fields, extract data from uploaded documents, and validate assumptions. You (Help) explain the app; it works with their data.

## CROSSWALK (other tools)
ARGUS Enterprise: Rent Roll = Tenants, Operations = Revenue & Expense, Income Approach = DCF.
ARGUS Developer: Budget = Construction, Feasibility = Appraisal, Sales = Unit Sales.
Excel: Each folder/tab replaces a worksheet. Formulas are built in. AI extraction replaces copy-paste from OMs.
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

        # Filter out developer/QA/internal content that shouldn't reach end users.
        # Two tiers: hard-reject markers (any 1 = drop) and soft markers (3+ = drop).
        HARD_REJECT = [
            'git clone', 'npm install', 'npm run', 'git checkout',
            'pip install', 'docker run', 'manage.py', 'venv/',
            'cursor.execute', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE',
            'from django', 'import django', 'def ', 'class ',
            'landscape.get_', 'landscape.increment_',
        ]
        SOFT_MARKERS = [
            # Code/architecture
            'commit:', 'database.ts', '.tsx', '.ts', 'curl ',
            'migrations/', 'import ', 'export default', 'module.exports',
            'endpoint', 'api route', 'serializer', 'viewset',
            # QA / test plans / internal status
            'test focus', 'test area', 'test plan', 'testing checklist',
            'known limitation', 'not yet implemented', 'not yet functional',
            'placeholder', 'step 8 addresses', 'step 6 addresses',
            'workspace members', 'search index may take',
            'folder security not', 'not yet available',
            'manual review and validation', 'coming soon',
            # Internal process
            'alpha blocker', 'technical debt', 'migration status',
            'rollback section', 'seed data', 'bootstrap',
        ]

        def _is_user_facing(text):
            lower = text.lower()
            # Hard reject: any single hit = drop
            if any(m.lower() in lower for m in HARD_REJECT):
                return False
            # Soft reject: 2+ hits = drop
            soft_hits = sum(1 for m in SOFT_MARKERS if m.lower() in lower)
            return soft_hits < 2

        rows = [r for r in rows if _is_user_facing(r[0])]

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
    # ── #FB shortcut: intercept feedback before hitting the AI ──
    if message.strip().upper().startswith('#FB'):
        feedback_text = message.strip()[3:].strip()
        # Store feedback if there's text after #FB
        if feedback_text:
            try:
                from django.db import connection as db_conn
                with db_conn.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO landscape.tbl_alpha_feedback
                        (page_context, feedback, status, submitted_at)
                        VALUES (%s, %s, 'new', NOW())
                        """,
                        [current_page, feedback_text],
                    )
            except Exception:
                logger.exception("Failed to store #FB feedback")
        return {
            'content': "Feedback received, thanks!",
            'metadata': {
                'model': 'none',
                'has_platform_knowledge': False,
                'feedback_captured': bool(feedback_text),
            },
        }

    # System prompt is the sole source of truth for Help.
    # RAG retrieval disabled — alpha_help chunks contain dev docs, not user help.
    full_system = HELP_SYSTEM_PROMPT

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
            max_tokens=400,  # Keep help responses short — 3 sentences max
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
            'has_platform_knowledge': False,  # RAG disabled
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
