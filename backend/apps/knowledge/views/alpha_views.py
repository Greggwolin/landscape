import logging
import re
from typing import Dict, List, Any, Optional

from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


# ── Page-context normalisation ──────────────────────────────────────
# The frontend builds page_context as "${folder}_${tab}" from URL query
# params (e.g. "property_rent-roll", "valuation_income").  The DB stores
# page_name values that were created during content ingestion and may
# differ.  This dict translates frontend strings → DB page_name values.
#
# When a frontend context has NO dedicated DB key, we fall back to the
# parent page (e.g. "property_market" → "property").  This ensures the
# user always sees *some* relevant content even before page-specific
# chunks are authored.

PAGE_CONTEXT_MAP: Dict[str, List[str]] = {
    # ── Home ───────────────────────────────────────────────────────
    "home":                         ["project_home", "home"],

    # ── Property tabs (MF) ─────────────────────────────────────────
    "property_details":             ["property_details", "property"],
    "property_acquisition":         ["property"],
    "property_market":              ["property"],
    "property_rent-roll":           ["rent_roll", "property"],
    "property_renovation":          ["property"],

    # ── Property tabs (LAND) ───────────────────────────────────────
    "property_land-use":            ["property"],
    "property_parcels":             ["property"],

    # ── Operations (MF — no sub-tabs) ──────────────────────────────
    "operations":                   ["operations"],

    # ── Valuation tabs (MF) ────────────────────────────────────────
    "valuation_sales-comparison":   ["valuation_sales_comp", "valuation"],
    "valuation_cost":               ["valuation_cost", "valuation"],
    "valuation_income":             ["valuation_income", "valuation"],

    # ── Budget tabs (LAND) ─────────────────────────────────────────
    "budget_budget":                ["budget"],
    "budget_sales":                 ["budget"],

    # ── Feasibility tabs (LAND) ────────────────────────────────────
    "feasibility_cashflow":         ["valuation"],
    "feasibility_returns":          ["valuation"],
    "feasibility_sensitivity":      ["valuation"],

    # ── Capital tabs ───────────────────────────────────────────────
    "capital_equity":               ["capitalization", "capital"],
    "capital_debt":                 ["capitalization", "capital"],

    # ── Reports tabs ───────────────────────────────────────────────
    "reports_summary":              ["reports"],
    "reports_export":               ["reports"],
    "reports_investment_committee": ["reports"],

    # ── Documents (no sub-tabs in nav config) ──────────────────────
    "documents":                    ["documents"],
    "documents_all":                ["documents"],
    "documents_intelligence":       ["documents"],

    # ── Map (no sub-tabs) ──────────────────────────────────────────
    "map":                          ["map"],
}

# ── User-facing content types ──────────────────────────────────────
# Included in help responses.  'technical' is excluded because it
# contains developer implementation details / changelogs.
USER_FACING_CONTENT_TYPES = [
    "alpha_help",
    "task_guide",
    "data_flow",
    "argus_crosswalk",
    "excel_crosswalk",
    "calculation_explanation",
    "deflection",
    "tester_notes",
]

# ── Developer-content exclusion patterns ───────────────────────────
# Bullet items matching any of these patterns are filtered out.  This
# catches developer changelog entries that slipped into alpha_help
# content_type during bulk ingestion.
_DEV_CONTENT_RE = re.compile(
    # Status emojis used in changelogs / dev notes
    r"[\u2705\u274c\u2b55\U0001f4c1\U0001f6a7\U0001f527\U0001f9ea\U0001f7e1\U0001f7e2\U0001f4ca]"
    # Framework / library names
    r"|CoreUI|Handsontable|TanStack|CFormSelect|SWR|TypeScript|scipy"
    # Numbered plan headings
    r"|^Phase \d+:|^Milestone \d+:|^Step \d+:"
    # Lettered plan headings (A. Auth Middleware*, C. Route Protection*)
    r"|^[A-E]\.\s+\w"
    # File extensions & paths
    r"|\.tsx\b|\.ts\b|\.py\b|\.css\b|\.md\b"
    r"|src/|backend/|nohup|venv/|migrations/"
    r"|^File:\*?\s"
    # CLI commands & arguments
    r"|npm run|python manage"
    r"|^-[a-z][\w-]+ "             # CLI flags like "-property-id 1"
    # Code fences & code snippets
    r"|^```"                        # Code fence start/end
    r"|import \{.*\} from "         # JS/TS imports
    r"|const \w+ = await "          # JS/TS await pattern
    r"|console\.log\("              # JS console.log
    # Dev checklist items ([ ] or [x] markdown)
    r"|\[ ?\]|\[x\]"
    # Date patterns (release notes, changelogs)
    r"|(?:January|February|March|April|May|June|July|August|September|October|November|December) \d+, 20\d{2}"
    r"|^\d{4}-\d{2}-\d{2}"
    # API / endpoint references
    r"|PATCH Endpoint|GET /api|POST /api|DELETE /api"
    r"|REST API|API Layer|Swagger"
    # React hooks (internal component names)
    r"|useOpex|useLease|useRent"
    r"|Migration\b.*\u2705"
    # Column spec / layout detail lines (e.g. "Unit Type (DVL dropdown, 120px)")
    r"|\d+px\)|pinned left|pinned right"
    r"|auto-fills?\b|dropdown,|date picker,"
    # Team / ops references
    r"|Slack:\s*#|GitHub Issues:|On-call:|PagerDuty"
    # Dev roadmap / milestone language
    r"|test coverage|test suite|benchmarking under load"
    r"|staging environment|production rollout|deprecation"
    r"|Monte Carlo|tornado charts"
    # Dev planning metadata (Priority:*, Estimated:*, Status:*)
    r"|^Priority:\*|^Estimated:\*|^Status:\*"
    # Meta-analysis / audit language
    r"|No evidence of coverage|beyond the above files"
    # Dev metrics lines (Core Features: 85% complete, Total Code: ~17,000 lines)
    r"|^Core Features:|^Total Code:|^Total Tables:|^Total Tests:|^Total Docs:"
    # Test result lines
    r"|Test Results"
    # Release note / feature headings — titles ending in * (bold markdown)
    # These are section headers from dev docs, not user-facing help bullets.
    r"|\w+\*\s*$"
)


class AlphaHelpView(APIView):
    """
    GET /api/knowledge/platform/alpha-help/?page_context=valuation_income

    Returns aggregated, user-facing help bullets for the requested page.

    Fixes applied (2026-02-18):
      1. PAGE_CONTEXT_MAP normalises frontend strings → DB page_name keys
      2. Content-type filter broadened to include task_guide, data_flow, etc.
      3. Developer changelog items filtered out via regex
    """
    permission_classes = [AllowAny]

    def get(self, request):
        page_context = request.query_params.get("page_context", "home")
        property_type = request.query_params.get("property_type")

        # Resolve DB page_name(s) for this frontend context
        db_page_names = PAGE_CONTEXT_MAP.get(page_context)
        if db_page_names is None:
            # Not in the map — try the raw value as-is, then fall back to
            # the folder portion (e.g. "property_market" → "property").
            db_page_names = [page_context]
            folder = page_context.split("_")[0] if "_" in page_context else None
            if folder and folder != page_context:
                db_page_names.append(folder)

        chunks = self._get_help_chunks(db_page_names, property_type)
        help_content = self._parse_chunks_to_help(chunks)

        logger.debug(
            "[AlphaHelp] page_context=%r → db_keys=%r  chunks=%d  "
            "wyd=%d cs=%d tips=%d",
            page_context, db_page_names, len(chunks),
            len(help_content["what_you_can_do"]),
            len(help_content["coming_soon"]),
            len(help_content["tips"]),
        )

        return Response(help_content)

    # ── DB query ───────────────────────────────────────────────────

    def _get_help_chunks(
        self,
        page_names: List[str],
        property_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch chunks matching any of *page_names* with user-facing types."""
        placeholders = ", ".join(["%s"] * len(page_names))
        type_placeholders = ", ".join(["%s"] * len(USER_FACING_CONTENT_TYPES))

        query = f"""
            SELECT
                content,
                metadata->>'section_title' AS section_title,
                metadata->>'content_type' AS content_type
            FROM landscape.tbl_platform_knowledge_chunks
            WHERE category = 'alpha_docs'
              AND metadata->>'page_name' IN ({placeholders})
              AND (
                  metadata->>'content_type' IN ({type_placeholders})
                  OR metadata->>'section_title' ILIKE '%%what you can do%%'
                  OR metadata->>'section_title' ILIKE '%%coming soon%%'
                  OR metadata->>'section_title' ILIKE '%%tips%%'
              )
        """
        params: list = list(page_names) + list(USER_FACING_CONTENT_TYPES)

        if property_type:
            query += """
              AND (
                  metadata->>'property_type' = %s
                  OR metadata->>'property_type' = 'BOTH'
                  OR metadata->>'property_type' IS NULL
              )
            """
            params.append(property_type)

        query += " ORDER BY id"

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    # ── Classification ─────────────────────────────────────────────

    def _parse_chunks_to_help(self, chunks: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        result: Dict[str, List[str]] = {
            "what_you_can_do": [],
            "coming_soon": [],
            "tips": [],
        }

        total_items_before = 0
        total_items_after = 0

        for chunk in chunks:
            content = chunk.get("content") or ""
            section_title = (chunk.get("section_title") or "").lower()
            content_type = (chunk.get("content_type") or "").lower()

            items = self._extract_list_items(content)
            total_items_before += len(items)

            # Remove developer-facing items (changelog, status notes, code refs)
            filtered = [i for i in items if not _DEV_CONTENT_RE.search(i)]
            total_items_after += len(filtered)

            if not filtered:
                continue

            if self._is_what_you_can_do(section_title, content_type, content):
                result["what_you_can_do"].extend(filtered)
            elif self._is_coming_soon(section_title, content_type, content):
                result["coming_soon"].extend(filtered)
            elif self._is_tip(section_title, content_type, content):
                result["tips"].extend(filtered)

        # Log filtering stats for false-positive monitoring during alpha
        excluded = total_items_before - total_items_after
        if excluded > 0:
            logger.info(
                "[AlphaHelp] Dev-content filter: %d items extracted, %d excluded "
                "(%d remaining) from %d chunks",
                total_items_before, excluded, total_items_after, len(chunks),
            )

        # De-duplicate while preserving order
        result["what_you_can_do"] = list(dict.fromkeys(result["what_you_can_do"]))
        result["coming_soon"] = list(dict.fromkeys(result["coming_soon"]))
        result["tips"] = list(dict.fromkeys(result["tips"]))

        return result

    def _is_what_you_can_do(self, section_title: str, content_type: str, content: str) -> bool:
        # Content types that map to "what you can do"
        if content_type in ("alpha_help", "task_guide", "data_flow",
                            "argus_crosswalk", "excel_crosswalk",
                            "calculation_explanation"):
            return True
        if "what you can do" in section_title or "can do" in content_type:
            return True
        return "what you can do" in content.lower()

    def _is_coming_soon(self, section_title: str, content_type: str, content: str) -> bool:
        if content_type == "deflection":
            return True
        if "coming soon" in section_title or "coming soon" in content_type:
            return True
        return "coming soon" in content.lower()

    def _is_tip(self, section_title: str, content_type: str, content: str) -> bool:
        if content_type == "tester_notes":
            return True
        if "tip" in section_title or "tip" in content_type:
            return True
        return "tip" in content.lower()

    # ── Bullet extraction ──────────────────────────────────────────

    def _extract_list_items(self, content: str) -> List[str]:
        """Extract markdown list items and plain-text sentences from chunk content."""
        items: List[str] = []
        bullet_re = re.compile(r"^\s*[-*•]\s*(.+)$|^\s*\d+\.\s*(.+)$")

        for line in content.splitlines():
            match = bullet_re.match(line)
            if match:
                item = (match.group(1) or match.group(2) or "").strip()
                if item and len(item) > 3:
                    # Strip markdown bold/italic
                    item = re.sub(r"\*\*(.+?)\*\*", r"\1", item)
                    item = re.sub(r"\*(.+?)\*", r"\1", item)
                    items.append(item)

        # If no bullets were found, fall back to splitting the content
        # into non-trivial sentences so prose-style chunks still contribute.
        if not items and content.strip():
            for sentence in re.split(r"(?<=[.!?])\s+", content.strip()):
                sentence = sentence.strip()
                if len(sentence) > 20 and not sentence.startswith("#"):
                    # Strip markdown
                    sentence = re.sub(r"\*\*(.+?)\*\*", r"\1", sentence)
                    sentence = re.sub(r"\*(.+?)\*", r"\1", sentence)
                    items.append(sentence)

        return items


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
