"""
Navigation tools — route the user's interface to a different surface.

These tools do NOT modify data. They return metadata that the frontend
interprets to drive a `router.push(...)` on the client. Same side-channel
pattern as `open_input_modal` in `modal_tools.py`.

Tools:
    navigate_to_project   — open a project's chat-forward workspace
    navigate_to_dashboard — return to the user's home dashboard

Used by Landscaper when the user explicitly asks to be taken somewhere
("take me to Chadron", "open the Peoria deal", "go home"). Distinct from
data questions ("show me Chadron's rent roll"), which should still be
answered in place via cross-project tool reads. See BASE_INSTRUCTIONS
NAVIGATION INTENT section for the firing rules.

LF-USERDASH-0514 Phase 3.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from django.db import connection

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


def _normalize_name(s: Optional[str]) -> str:
    return (s or '').strip().lower()


def _fuzzy_find_project(name: str) -> Optional[Dict[str, Any]]:
    """
    Resolve a free-text project name to a real-estate project row.

    Strategy:
      1. Case-insensitive exact match on project_name
      2. ILIKE prefix match
      3. ILIKE substring match
    Returns the highest-priority unique hit, or None if zero / ambiguous.
    Excludes home (user_home) projects — navigation only targets real
    estate work.
    """
    norm = _normalize_name(name)
    if not norm:
        return None

    with connection.cursor() as cur:
        # Exact (case-insensitive) match takes priority.
        cur.execute(
            """
            SELECT project_id, project_name, project_type_code, project_kind
              FROM landscape.tbl_project
             WHERE LOWER(project_name) = %s
               AND COALESCE(project_kind, 'real_estate') = 'real_estate'
               AND COALESCE(is_active, true)
             LIMIT 5
            """,
            [norm],
        )
        rows = cur.fetchall()
        if len(rows) == 1:
            r = rows[0]
            return {
                'project_id': r[0],
                'project_name': r[1],
                'project_type_code': r[2],
            }
        if len(rows) > 1:
            return None  # ambiguous exact match — caller surfaces choices

        # Prefix match (faster than full substring, fewer false positives).
        cur.execute(
            """
            SELECT project_id, project_name, project_type_code
              FROM landscape.tbl_project
             WHERE project_name ILIKE %s
               AND COALESCE(project_kind, 'real_estate') = 'real_estate'
               AND COALESCE(is_active, true)
             LIMIT 5
            """,
            [f'{name}%'],
        )
        rows = cur.fetchall()
        if len(rows) == 1:
            r = rows[0]
            return {
                'project_id': r[0],
                'project_name': r[1],
                'project_type_code': r[2],
            }
        if len(rows) > 1:
            return None

        # Substring fallback.
        cur.execute(
            """
            SELECT project_id, project_name, project_type_code
              FROM landscape.tbl_project
             WHERE project_name ILIKE %s
               AND COALESCE(project_kind, 'real_estate') = 'real_estate'
               AND COALESCE(is_active, true)
             LIMIT 5
            """,
            [f'%{name}%'],
        )
        rows = cur.fetchall()
        if len(rows) == 1:
            r = rows[0]
            return {
                'project_id': r[0],
                'project_name': r[1],
                'project_type_code': r[2],
            }

    return None


def _candidate_projects(name: str, limit: int = 5) -> list[Dict[str, Any]]:
    """Return up to `limit` real-estate project candidates that match the name."""
    if not _normalize_name(name):
        return []
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT project_id, project_name, project_type_code
              FROM landscape.tbl_project
             WHERE project_name ILIKE %s
               AND COALESCE(project_kind, 'real_estate') = 'real_estate'
               AND COALESCE(is_active, true)
             ORDER BY project_name
             LIMIT %s
            """,
            [f'%{name}%', limit],
        )
        return [
            {'project_id': r[0], 'project_name': r[1], 'project_type_code': r[2]}
            for r in cur.fetchall()
        ]


@register_tool('navigate_to_project')
def navigate_to_project_tool(
    tool_input: Dict[str, Any] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Route the user's browser to a real-estate project's workspace.

    Fires only on explicit navigation intent ("take me to X", "open the X
    deal", "switch to X"). For data questions ("show me X's rent roll"),
    answer in place via cross-project tool reads instead.

    Args:
        tool_input: {
            project_id: int (optional)        — direct id if known
            project_name: str (optional)      — free-text name; fuzzy resolved
        }
        (one of project_id or project_name is required)

    Returns:
        On hit:
            {
                'success': True,
                'action': 'navigate',
                'target_url': '/w/projects/<id>',
                'project_id': <id>,
                'project_name': <name>,
                'message': 'Opening <name>.'
            }
        On miss:
            { 'success': False, 'error': <reason>, 'candidates': [...] }
    """
    tool_input = tool_input or kwargs.get('tool_input', {})
    raw_id = tool_input.get('project_id')
    raw_name = tool_input.get('project_name')

    # --- Resolve project ----------------------------------------------------
    project: Optional[Dict[str, Any]] = None

    if raw_id is not None:
        try:
            pid = int(raw_id)
        except (TypeError, ValueError):
            return {
                'success': False,
                'error': f'project_id must be an integer; got {raw_id!r}.',
            }
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT project_id, project_name, project_type_code
                  FROM landscape.tbl_project
                 WHERE project_id = %s
                   AND COALESCE(project_kind, 'real_estate') = 'real_estate'
                   AND COALESCE(is_active, true)
                """,
                [pid],
            )
            row = cur.fetchone()
        if row is None:
            return {
                'success': False,
                'error': f'No active real-estate project with id {pid}.',
            }
        project = {'project_id': row[0], 'project_name': row[1], 'project_type_code': row[2]}

    elif raw_name:
        project = _fuzzy_find_project(raw_name)
        if project is None:
            candidates = _candidate_projects(raw_name)
            if not candidates:
                return {
                    'success': False,
                    'error': f'No real-estate project matches "{raw_name}".',
                    'candidates': [],
                }
            return {
                'success': False,
                'error': (
                    f'Multiple projects match "{raw_name}". Ask the user which one '
                    'they meant.'
                ),
                'candidates': candidates,
            }
    else:
        return {
            'success': False,
            'error': 'Either project_id or project_name is required.',
        }

    # --- Build navigation envelope -----------------------------------------
    target_url = f"/w/projects/{project['project_id']}"
    return {
        'success': True,
        'action': 'navigate',
        'target_url': target_url,
        'project_id': project['project_id'],
        'project_name': project['project_name'],
        'project_type_code': project.get('project_type_code'),
        'message': f"Opening {project['project_name']}.",
    }


@register_tool('navigate_to_dashboard')
def navigate_to_dashboard_tool(
    tool_input: Dict[str, Any] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Route the user back to their home dashboard.

    Fires on "go home", "back to dashboard", "take me home", etc.
    """
    return {
        'success': True,
        'action': 'navigate',
        'target_url': '/w/dashboard',
        'message': 'Returning to your dashboard.',
    }
