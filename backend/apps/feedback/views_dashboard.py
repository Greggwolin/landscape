"""
Read-only feedback dashboard data feed.

Replaces the morning-refresh skill's direct psycopg2 connection. The skill
now fetches this JSON via curl + stdlib python (no third-party packages in
the scheduled-task sandbox).
"""

from datetime import datetime

from django.db import connection
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.response import Response

from .permissions import HasFeedbackDashboardToken


def _iso(v):
    if hasattr(v, 'isoformat'):
        return v.isoformat()
    return v


@api_view(['GET'])
@authentication_classes([])  # JWT not used — token check happens in the permission class
@permission_classes([HasFeedbackDashboardToken])
def feedback_dashboard_data(request):
    """
    GET /api/feedback/dashboard-data/

    Returns the same shape the legacy psycopg2-based morning-refresh skill
    computed inline: { generated_at, counts_all, counts, items[] }.

    Auth: X-Feedback-Token header (see permissions.HasFeedbackDashboardToken).
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT status, COUNT(*) FROM landscape.tbl_feedback
            WHERE source != 'backfill' OR source IS NULL
            GROUP BY status
        """)
        counts_real = {r[0]: r[1] for r in cursor.fetchall()}

        cursor.execute("""
            SELECT status, COUNT(*) FROM landscape.tbl_feedback GROUP BY status
        """)
        counts_all = {r[0]: r[1] for r in cursor.fetchall()}

        cursor.execute("""
            SELECT id, status, source, page_context, project_id, project_name,
                   message_text, created_at, started_at, addressed_at, closed_at,
                   resolved_by_commit_sha, resolved_by_commit_url, resolution_notes,
                   in_progress_branch, in_progress_session_slug,
                   working_summary, active_chat_slug
            FROM landscape.tbl_feedback
            WHERE status IN ('open', 'in_progress', 'addressed')
               OR (status IN ('closed', 'wontfix', 'duplicate')
                   AND source != 'backfill'
                   AND closed_at > NOW() - INTERVAL '30 days')
            ORDER BY
                CASE status WHEN 'in_progress' THEN 1
                            WHEN 'open' THEN 2
                            WHEN 'addressed' THEN 3
                            ELSE 4 END,
                created_at DESC
        """)
        cols = [c[0] for c in cursor.description]
        items = [
            {c: _iso(v) for c, v in zip(cols, row)}
            for row in cursor.fetchall()
        ]

    return Response({
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'counts_all': counts_all,
        'counts': counts_real,
        'items': items,
    })
