import logging
import re
from typing import Dict, List, Any, Optional

from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


class AlphaHelpView(APIView):
    """
    GET /api/knowledge/platform/alpha-help/?page_context=mf_valuation

    Returns aggregated help bullets for the requested page.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        page_context = request.query_params.get("page_context", "home")
        property_type = request.query_params.get("property_type")

        chunks = self._get_help_chunks(page_context, property_type)
        help_content = self._parse_chunks_to_help(chunks)
        return Response(help_content)

    def _get_help_chunks(
        self,
        page_context: str,
        property_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = """
            SELECT
                content,
                metadata->>'section_title' AS section_title,
                metadata->>'content_type' AS content_type
            FROM landscape.tbl_platform_knowledge_chunks
            WHERE category = 'alpha_docs'
              AND metadata->>'page_name' = %s
              AND (
                  metadata->>'content_type' = 'alpha_help'
                  OR metadata->>'section_title' ILIKE '%%what you can do%%'
                  OR metadata->>'section_title' ILIKE '%%coming soon%%'
                  OR metadata->>'section_title' ILIKE '%%tips%%'
              )
        """
        params = [page_context]

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

    def _parse_chunks_to_help(self, chunks: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        result = {
            "what_you_can_do": [],
            "coming_soon": [],
            "tips": [],
        }

        for chunk in chunks:
            content = chunk.get("content") or ""
            section_title = (chunk.get("section_title") or "").lower()
            content_type = (chunk.get("content_type") or "").lower()

            items = self._extract_list_items(content)

            if self._is_what_you_can_do(section_title, content_type, content):
                result["what_you_can_do"].extend(items)
            elif self._is_coming_soon(section_title, content_type, content):
                result["coming_soon"].extend(items)
            elif self._is_tip(section_title, content_type, content):
                result["tips"].extend(items)

        result["what_you_can_do"] = list(dict.fromkeys(result["what_you_can_do"]))
        result["coming_soon"] = list(dict.fromkeys(result["coming_soon"]))
        result["tips"] = list(dict.fromkeys(result["tips"]))

        return result

    def _is_what_you_can_do(self, section_title: str, content_type: str, content: str) -> bool:
        if "what you can do" in section_title or content_type == "alpha_help" or "can do" in content_type:
            return True
        return "what you can do" in content.lower()

    def _is_coming_soon(self, section_title: str, content_type: str, content: str) -> bool:
        if "coming soon" in section_title or "coming soon" in content_type:
            return True
        return "coming soon" in content.lower()

    def _is_tip(self, section_title: str, content_type: str, content: str) -> bool:
        if "tip" in section_title or "tip" in content_type:
            return True
        return "tip" in content.lower()

    def _extract_list_items(self, content: str) -> List[str]:
        items: List[str] = []
        pattern = re.compile(r"^\s*[-*•]\s*(.+)$|^\s*\d+\.\s*(.+)$")

        for line in content.splitlines():
            match = pattern.match(line)
            if match:
                item = (match.group(1) or match.group(2) or "").strip()
                if item and len(item) > 3:
                    item = re.sub(r"\*\*(.+?)\*\*", r"\1", item)
                    item = re.sub(r"\*(.+?)\*", r"\1", item)
                    items.append(item)
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
