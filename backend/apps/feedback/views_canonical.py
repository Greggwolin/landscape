"""
Canonical feedback API — reads/writes landscape.tbl_feedback directly.

This replaces the retired tester_feedback surface
(apps.feedback.views.TesterFeedbackViewSet + FeedbackSubmitView + ...).
tbl_feedback is the single source of truth shared with the nightly daily brief,
the list_feedback / start_feedback / mark_feedback_addressed / close_feedback CLI
commands, the Help-panel #FB capture, and Cowork. This module is intentionally
raw-SQL (no Django model) to match those existing consumers — see
apps.landscaper.management.commands.* for the write-path semantics replicated here.

LSCMD-FBUNIFY-0613-qz
"""

from django.db import connection
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


# Canonical lifecycle vocabulary — matches tbl_feedback.status and the CLI commands.
CANONICAL_STATUSES = ('open', 'in_progress', 'addressed', 'closed', 'wontfix', 'duplicate')
TERMINAL_STATUSES = ('closed', 'wontfix', 'duplicate')

# Columns surfaced to the admin page. Ordered open/in_progress work first, then
# the rest by recency — the same ordering the dashboard feed uses.
_SELECT_COLS = """
    id, created_at, status, category, source,
    page_context, project_id, project_name, message_text,
    user_name, user_email,
    started_at, addressed_at, closed_at,
    in_progress_branch, in_progress_session_slug,
    resolved_by_commit_sha, resolved_by_commit_url, resolution_notes,
    working_summary, active_chat_slug, duplicate_of_id
"""

# Exclude historical backfill rows (282 seeded demo/historical items) from the
# triage queue — same definition the dashboard feed uses for "real" counts.
_LIST_SQL = f"""
    SELECT {_SELECT_COLS}
      FROM landscape.tbl_feedback
     WHERE source IS DISTINCT FROM 'backfill'
     ORDER BY
        CASE status WHEN 'in_progress' THEN 1
                    WHEN 'open' THEN 2
                    WHEN 'addressed' THEN 3
                    ELSE 4 END,
        created_at DESC
"""

_ONE_SQL = f"SELECT {_SELECT_COLS} FROM landscape.tbl_feedback WHERE id = %s"


def _iso(v):
    return v.isoformat() if hasattr(v, 'isoformat') else v


def _row_to_item(cols, row):
    item = {c: _iso(v) for c, v in zip(cols, row)}
    # Public reference + UI conveniences.
    item['fb_label'] = f"FB-{item['id']}"
    # report_count is surfaced as a constant — only one tester_feedback row ever
    # exceeded 1, and the canonical table doesn't track it. (DECISION 5.)
    item['report_count'] = 1
    return item


def _require_admin(request):
    if not getattr(request.user, 'is_admin', False):
        raise PermissionDenied("Only administrators can access the feedback queue.")


def _fetch_one(pk):
    with connection.cursor() as cursor:
        cursor.execute(_ONE_SQL, [pk])
        row = cursor.fetchone()
        if row is None:
            raise NotFound(f"FB-{pk} does not exist")
        cols = [c[0] for c in cursor.description]
    return _row_to_item(cols, row)


class CanonicalFeedbackListView(APIView):
    """
    GET /api/feedback/

    Admin-only list of canonical feedback rows (excluding backfill), shaped for
    the /admin/feedback queue. Returns a bare array.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request)
        with connection.cursor() as cursor:
            cursor.execute(_LIST_SQL)
            cols = [c[0] for c in cursor.description]
            items = [_row_to_item(cols, row) for row in cursor.fetchall()]
        return Response(items)


class CanonicalFeedbackDetailView(APIView):
    """
    PATCH /api/feedback/<id>/

    Admin-only status edit. Maps the canonical status to the same SQL the CLI
    commands run so addressed_at / closed_at / started_at and the audit trail
    stay consistent with list_feedback + the nightly brief:

      - in_progress              -> start_feedback semantics (started_at)
      - addressed                -> mark_feedback_addressed semantics (addressed_at)
      - closed / wontfix / duplicate -> close_feedback semantics (closed_at, notes)
      - open                     -> reopen (status only; timestamps kept as history)

    Unlike the CLI (which refuses transitions out of terminal states), the admin
    queue is the privileged correction surface and may reopen a terminal row.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        _require_admin(request)

        new_status = request.data.get('status')
        notes = request.data.get('resolution_notes')
        duplicate_of = request.data.get('duplicate_of_id')
        commit_sha = request.data.get('resolved_by_commit_sha')
        commit_url = request.data.get('resolved_by_commit_url')

        if new_status is None:
            raise ValidationError({'status': 'This field is required.'})
        if new_status not in CANONICAL_STATUSES:
            raise ValidationError(
                {'status': f"Invalid status {new_status!r}. Expected one of {list(CANONICAL_STATUSES)}."}
            )
        if notes is not None and ('\n' in str(notes) or '\r' in str(notes)):
            # resolution_notes is a single-line field per the CLI contract.
            notes = ' '.join(str(notes).split())

        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM landscape.tbl_feedback WHERE id = %s", [pk])
            if cursor.fetchone() is None:
                raise NotFound(f"FB-{pk} does not exist")

            if new_status == 'in_progress':
                cursor.execute(
                    """
                    UPDATE landscape.tbl_feedback
                       SET status = 'in_progress',
                           started_at = COALESCE(started_at, NOW())
                     WHERE id = %s
                    """,
                    [pk],
                )
            elif new_status == 'addressed':
                cursor.execute(
                    """
                    UPDATE landscape.tbl_feedback
                       SET status = 'addressed',
                           addressed_at = COALESCE(addressed_at, NOW()),
                           resolved_by_commit_sha = COALESCE(%s, resolved_by_commit_sha),
                           resolved_by_commit_url = COALESCE(%s, resolved_by_commit_url),
                           resolution_notes = COALESCE(%s, resolution_notes)
                     WHERE id = %s
                    """,
                    [commit_sha, commit_url, notes, pk],
                )
            elif new_status in TERMINAL_STATUSES:
                if new_status == 'duplicate' and not duplicate_of:
                    raise ValidationError(
                        {'duplicate_of_id': 'Required when status=duplicate.'}
                    )
                if duplicate_of:
                    cursor.execute(
                        "SELECT 1 FROM landscape.tbl_feedback WHERE id = %s", [duplicate_of]
                    )
                    if cursor.fetchone() is None:
                        raise ValidationError(
                            {'duplicate_of_id': f'FB-{duplicate_of} does not exist.'}
                        )
                cursor.execute(
                    """
                    UPDATE landscape.tbl_feedback
                       SET status = %s,
                           closed_at = NOW(),
                           resolution_notes = COALESCE(%s, resolution_notes),
                           duplicate_of_id = %s
                     WHERE id = %s
                    """,
                    [new_status, notes, duplicate_of, pk],
                )
            else:  # 'open' — reopen
                cursor.execute(
                    "UPDATE landscape.tbl_feedback SET status = 'open' WHERE id = %s",
                    [pk],
                )

        return Response(_fetch_one(pk))
