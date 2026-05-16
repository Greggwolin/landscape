import logging
from typing import Dict, List

from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


# ── Curated page-guide content ──────────────────────────────────────
# Static, hand-written content per page.  Replaces the old approach of
# querying tbl_platform_knowledge_chunks (which contained developer docs
# that leaked through even aggressive regex filtering).
#
# Format:  page_context_key → { what_you_can_do, coming_soon, tips }
# Frontend sends page_context as "${folder}_${tab}" from URL params.

_PAGE_GUIDE: Dict[str, Dict[str, List[str]]] = {
    # ── Home ────────────────────────────────────────────────────────
    "home": {
        "what_you_can_do": [
            "View project summary KPIs and financial overview",
            "Switch between projects from the sidebar",
            "Open Landscaper AI to ask questions about your project",
        ],
        "coming_soon": [],
        "tips": [
            "Click any KPI card to jump to the relevant detail tab",
        ],
    },

    # ── Documents ───────────────────────────────────────────────────
    "documents": {
        "what_you_can_do": [
            "Upload documents via drag-and-drop (PDF, Excel, Word, images)",
            "Search across all document text using the search bar",
            "Filter documents by type (Offering Memo, Rent Roll, T-12, etc.)",
            "Click a document row to view or edit its profile details",
            "Select multiple documents with checkboxes for bulk delete",
            "Tag documents with freeform tags for easy retrieval",
            "Project Media: scan PDFs to extract embedded images, photos, maps, and charts into a reusable media library",
        ],
        "coming_soon": [
            "AI-powered data extraction to auto-populate project fields",
            "OCR for scanned documents",
            "Document version history",
        ],
        "tips": [
            "Use descriptive tags — Landscaper suggests popular tags as you type",
            "Upload documents before entering data manually — AI extraction can save time",
            "Use 'Scan New' to process only unscanned PDFs, or 'Rescan All' to reprocess everything",
        ],
    },

    # ── Property (Income) ────────────────────────────────────────
    "property_location": {
        "what_you_can_do": [
            "View economic indicators and location analysis for the property",
            "See AI-generated neighborhood and market area descriptions",
            "Review proximity to employment centers, transit, and amenities",
        ],
        "coming_soon": [
            "Full demographics panel with Census data",
        ],
        "tips": [],
    },
    "property_market-supply": {
        "what_you_can_do": [
            "View market supply and demand data for the property type",
            "See submarket rent trends and vacancy rates",
            "Review new construction pipeline",
        ],
        "coming_soon": [],
        "tips": [],
    },
    "property_property-details": {
        "what_you_can_do": [
            "Edit property details: name, address, year built, unit count",
            "View and update the unit mix summary",
        ],
        "coming_soon": [],
        "tips": [],
    },
    "property_rent-roll": {
        "what_you_can_do": [
            "View the full rent roll grid with unit-level detail",
            "Edit rents, lease dates, tenant info, and unit status inline",
            "Sort and filter by any column",
            "See summary statistics (avg rent, occupancy, loss-to-lease)",
        ],
        "coming_soon": [],
        "tips": [
            "Double-click a cell to edit it directly in the grid",
        ],
    },
    "property_renovation": {
        "what_you_can_do": [
            "Track renovation scope and cost per unit",
            "Compare pre- and post-renovation rents",
        ],
        "coming_soon": [],
        "tips": [],
    },
    "property_acquisition": {
        "what_you_can_do": [
            "Enter acquisition price, closing date, and deal terms",
        ],
        "coming_soon": [],
        "tips": [],
    },

    # ── Property (Land Dev) ────────────────────────────────────────
    "property_market": {
        "what_you_can_do": [
            "View market rent comps and submarket data",
            "See demographic and economic indicators for the area",
        ],
        "coming_soon": [
            "Full demographics panel with Census data",
        ],
        "tips": [],
    },
    "property_land-use": {
        "what_you_can_do": [
            "Define the land use plan: product types, lot counts, densities",
            "Assign land use families (Residential, Commercial, etc.)",
        ],
        "coming_soon": [],
        "tips": [],
    },
    "property_parcels": {
        "what_you_can_do": [
            "View all parcels in a sortable grid",
            "Edit parcel details: acreage, lot count, product type",
            "See parcels organized by area and phase",
        ],
        "coming_soon": [],
        "tips": [],
    },

    # ── Operations ─────────────────────────────────────────────────
    "operations": {
        "what_you_can_do": [
            "Enter revenue and expense line items for the trailing 12 months",
            "View per-unit and per-SF operating metrics",
            "Compare actual vs. market operating assumptions",
        ],
        "coming_soon": [],
        "tips": [
            "Operations data feeds directly into Income Approach valuations",
        ],
    },

    # ── Budget (Land Dev) ──────────────────────────────────────────
    "budget": {
        "what_you_can_do": [
            "Build a development budget by category (site work, infrastructure, soft costs)",
            "Assign budget items to specific phases or parcels",
            "View rollup totals by category, phase, and project",
        ],
        "coming_soon": [],
        "tips": [
            "Budget items support both flat amounts and per-unit/per-acre calculations",
        ],
    },
    "budget_schedule": {
        "what_you_can_do": [
            "View and edit the development schedule timeline",
        ],
        "coming_soon": [],
        "tips": [],
    },
    "budget_sales": {
        "what_you_can_do": [
            "Define lot sales pricing and absorption schedules",
            "See projected revenue by phase and product type",
        ],
        "coming_soon": [],
        "tips": [],
    },

    # ── Valuation (Income) ───────────────────────────────────────
    "valuation_sales-comparison": {
        "what_you_can_do": [
            "Add comparable sales and adjust for differences",
            "View comps on a map with distance to subject",
            "Build an adjustment grid with per-unit and per-SF metrics",
            "See the indicated value from adjusted comps",
        ],
        "coming_soon": [],
        "tips": [
            "Landscaper can help you find and enter comps — just ask",
        ],
    },
    "valuation_cost": {
        "what_you_can_do": [
            "Estimate replacement cost using Marshall & Swift factors",
            "Apply physical, functional, and external depreciation",
            "Add land value to get the cost approach indication",
        ],
        "coming_soon": [],
        "tips": [],
    },
    "valuation_income": {
        "what_you_can_do": [
            "Run Direct Capitalization with selectable NOI base (Current, Market, Stabilized)",
            "Build a DCF with monthly cash flows",
            "Set cap rates, discount rates, and growth assumptions",
            "Compare indicated values across NOI bases",
        ],
        "coming_soon": [],
        "tips": [
            "The F-12 toggle switches between Current, Market, and Stabilized NOI",
        ],
    },
    "valuation_cash-flow": {
        "what_you_can_do": [
            "View projected cash flows for investment analysis",
            "Set holding period and disposition assumptions",
        ],
        "coming_soon": [],
        "tips": [],
    },
    "valuation_comparable-sales": {
        "what_you_can_do": [
            "Review comparable sale transactions",
            "Compare pricing metrics across comps",
        ],
        "coming_soon": [],
        "tips": [],
    },
    "valuation_market-comps": {
        "what_you_can_do": [
            "View market rent comparables",
            "Compare unit types, sizes, and amenities",
        ],
        "coming_soon": [],
        "tips": [],
    },
    "valuation_reconciliation": {
        "what_you_can_do": [
            "Weight indicated values from each approach",
            "Add reconciliation narrative and rationale",
            "See the final opinion of value",
        ],
        "coming_soon": [],
        "tips": [],
    },

    # ── Feasibility (Land Dev) ────────────────────────────────────
    "feasibility_cashflow": {
        "what_you_can_do": [
            "View projected cash flows by phase and period",
            "See revenue, costs, and net cash flow over time",
        ],
        "coming_soon": [],
        "tips": [],
    },
    "feasibility_returns": {
        "what_you_can_do": [
            "View IRR, equity multiple, and profit margin",
            "Compare returns across scenarios",
        ],
        "coming_soon": [],
        "tips": [],
    },
    "feasibility_sensitivity": {
        "what_you_can_do": [
            "Run sensitivity analysis on key assumptions",
            "See how changes in costs, pricing, or pace affect returns",
        ],
        "coming_soon": [],
        "tips": [],
    },

    # ── Capital ────────────────────────────────────────────────────
    "capital": {
        "what_you_can_do": [
            "Define the capital structure: equity and debt tranches",
            "Enter loan terms, rates, and amortization schedules",
            "View leverage metrics (LTV, DSCR, debt yield)",
        ],
        "coming_soon": [
            "Waterfall distribution calculations",
        ],
        "tips": [],
    },
    "capital_equity": {
        "what_you_can_do": [
            "Define equity partners and ownership percentages",
            "Set preferred return and promote structure",
        ],
        "coming_soon": [
            "Waterfall distribution calculations",
        ],
        "tips": [],
    },
    "capital_debt": {
        "what_you_can_do": [
            "Enter loan terms, interest rates, and amortization",
            "View leverage metrics (LTV, DSCR, debt yield)",
            "Model multiple debt tranches",
        ],
        "coming_soon": [],
        "tips": [],
    },

    # ── Reports ────────────────────────────────────────────────────
    "reports": {
        "what_you_can_do": [
            "View a project summary report",
            "See key metrics across all valuation approaches",
        ],
        "coming_soon": [
            "PDF report export",
            "Custom report templates",
        ],
        "tips": [],
    },

    # ── Map ─────────────────────────────────────────────────────────
    "map": {
        "what_you_can_do": [
            "View property and comp locations on an interactive map",
            "Toggle map layers (parcels, comps, demographics)",
            "Click pins for quick property details",
        ],
        "coming_soon": [
            "GIS data persistence across sessions",
        ],
        "tips": [],
    },
}


class AlphaHelpView(APIView):
    """
    GET /api/knowledge/platform/alpha-help/?page_context=valuation_income

    Returns curated, user-facing help content for the requested page.

    2026-03-10: Replaced DB-backed chunk retrieval with static _PAGE_GUIDE.
    The knowledge chunks table contains developer docs that leaked through
    even aggressive regex filtering.  Static content is authoritative.
    """

    def get(self, request):
        page_context = request.query_params.get("page_context", "home")

        # Exact match first
        content = _PAGE_GUIDE.get(page_context)

        # Fallback: try parent folder (e.g. "documents_all" → "documents")
        if content is None and "_" in page_context:
            folder = page_context.split("_")[0]
            content = _PAGE_GUIDE.get(folder)

        if content is None:
            content = {"what_you_can_do": [], "coming_soon": [], "tips": []}

        logger.debug(
            "[AlphaHelp] page_context=%r  wyd=%d cs=%d tips=%d",
            page_context,
            len(content["what_you_can_do"]),
            len(content["coming_soon"]),
            len(content["tips"]),
        )

        return Response(content)


class AlphaFeedbackView(APIView):
    """
    POST /api/alpha/feedback/

    Persist alpha tester feedback.
    """

    def post(self, request):
        page_context = request.data.get("page_context")
        project_id = request.data.get("project_id")
        feedback = (request.data.get("feedback") or "").strip()

        if not feedback:
            return Response({"error": "Feedback text is required"}, status=status.HTTP_400_BAD_REQUEST)

        user_id = None
        if hasattr(request, "user") and request.user and request.user.is_authenticated:
            user_id = request.user.id

        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO landscape.tbl_alpha_feedback
                    (page_context, project_id, user_id, feedback, status, submitted_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    RETURNING id
                    """,
                    [page_context, project_id, user_id, feedback, "new"]
                )
                feedback_id = cursor.fetchone()[0]

            return Response(
                {"success": True, "feedback_id": feedback_id, "message": "Thank you for your feedback!"},
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            logger.exception("Failed to store alpha feedback")
            return Response(
                {"error": f"Failed to save feedback: {str(exc)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def get(self, request):
        status_filter = request.query_params.get("status", "new")
        limit_value_str = request.query_params.get("limit", "50")
        try:
            limit_value = int(limit_value_str)
        except (TypeError, ValueError):
            limit_value = 50
        limit = min(limit_value, 200)

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, page_context, project_id, user_id, feedback, status, notes, submitted_at
                FROM landscape.tbl_alpha_feedback
                WHERE status = %s OR %s = 'all'
                ORDER BY submitted_at DESC
                LIMIT %s
                """,
                [status_filter, status_filter, limit],
            )
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return Response({"feedback": rows, "count": len(rows)})
