"""
MSA (Metropolitan Statistical Area) update tool.

Resolves a user's free-text MSA reference ("Los Angeles", "Phoenix, AZ",
"NYC metro", etc.) to a canonical msa_id from `landscape.tbl_msa`, then
queues a mutation proposal to update `tbl_project.msa_id`.

Why this exists separately from `update_project_field`:

The legacy generic field-update path treats MSA as a free-text column
(`tbl_project.market`). When a user says "update the market (MSA) to
Los Angeles", the model would write the literal string "Los Angeles"
to the `market` fallback column. The artifact's MSA display reads from
`tbl_msa.msa_name` JOINed via `msa_id` and ignores the `market` fallback
when `msa_id` is set, so the user's edit appeared to succeed but didn't
visibly change the canonical MSA.

This tool routes MSA updates correctly:
  1. Look up matching MSA(s) in `tbl_msa` by name / primary city / state
  2. If 0 matches, return an error so the model can ask for clarification
  3. If 1 match, queue a mutation proposal: msa_id = <int> on tbl_project
  4. If multiple matches, return the candidate list so the model can
     ask which the user meant before re-calling with a more specific query

The mutation proposal flows through the standard confirm/reject UX so
the user sees the change before it persists. Confirmation writes the
integer msa_id, which the JOIN-based artifact display picks up.
"""

import logging
from typing import Any, Dict, List, Optional

from django.db import connection

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


def _normalize_query(q: str) -> str:
    """Lowercase + strip whitespace + collapse internal whitespace."""
    return ' '.join(q.lower().strip().split())


def _search_msa_candidates(query: str, limit: int = 6) -> List[Dict[str, Any]]:
    """Return MSAs matching the query against name, primary_city, or state.

    Uses ILIKE for case-insensitive substring matches. Returns at most
    `limit` candidates; caller decides how to handle 0 / 1 / many.
    """
    q_norm = _normalize_query(query)
    if not q_norm:
        return []

    # Allow "City, ST" form by splitting on comma.
    parts = [p.strip() for p in q_norm.split(',') if p.strip()]
    state_filter: Optional[str] = None
    name_filter: str
    if len(parts) >= 2 and len(parts[-1]) == 2:
        # Last part is a state abbreviation
        state_filter = parts[-1].upper()
        name_filter = ', '.join(parts[:-1])
    else:
        name_filter = q_norm

    pattern = f'%{name_filter}%'
    sql = """
        SELECT msa_id, msa_name, msa_code, state_abbreviation, primary_city
        FROM landscape.tbl_msa
        WHERE is_active = TRUE
          AND (
              msa_name ILIKE %s
              OR primary_city ILIKE %s
          )
    """
    params: List[Any] = [pattern, pattern]
    if state_filter:
        sql += '\n          AND state_abbreviation = %s'
        params.append(state_filter)
    sql += '\n        ORDER BY display_order NULLS LAST, msa_name\n        LIMIT %s'
    params.append(limit)

    with connection.cursor() as cur:
        cur.execute(sql, params)
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def _read_current_msa(project_id: int) -> Dict[str, Any]:
    """Return the project's current msa_id and the joined msa_name (for display)."""
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT p.msa_id, m.msa_name, m.state_abbreviation
            FROM landscape.tbl_project p
            LEFT JOIN landscape.tbl_msa m ON p.msa_id = m.msa_id
            WHERE p.project_id = %s
            """,
            [project_id],
        )
        row = cur.fetchone()
        if not row:
            return {}
        return {
            'msa_id': row[0],
            'msa_name': row[1],
            'state_abbreviation': row[2],
        }


@register_tool('update_project_msa')
def update_project_msa_tool(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,
    user_id: Any = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Update a project's MSA association by resolving the user's text to msa_id.

    Use this tool — NOT `update_project_field` — when the user wants to
    change the project's MSA / market designation. The generic field
    update tool can't resolve a free-text city/state reference to the
    integer foreign key the artifact display reads from.

    Args:
        tool_input: {
            query: "City, ST" or partial name (e.g., "Los Angeles",
                   "Phoenix, AZ", "Phoenix-Mesa") — required
        }
        project_id: required — the project to update.
        user_id: optional — captured on the mutation proposal.

    Returns:
        On 1 match (the happy path):
            { success: True, action: 'mutation_proposed',
              mutation_id, current_value, proposed_value, ... }
        On 0 matches:
            { success: False, error: 'no MSA matched ...' }
        On multiple matches:
            { success: False, error: 'ambiguous',
              candidates: [...], suggested_user_question: '...' }
    """
    from ..services.mutation_service import MutationService

    tool_input = tool_input or kwargs.get('tool_input', {})
    query = (tool_input.get('query') or '').strip()

    if not project_id:
        return {
            'success': False,
            'error': 'project_id is required (this tool only works on a project route)',
        }
    if not query:
        return {
            'success': False,
            'error': "query is required (e.g., 'Los Angeles' or 'Phoenix, AZ')",
        }

    try:
        pid = int(project_id)
    except (TypeError, ValueError):
        return {'success': False, 'error': f'project_id must be an integer; got {project_id!r}'}

    try:
        candidates = _search_msa_candidates(query, limit=6)
    except Exception as exc:
        logger.exception(f'update_project_msa MSA lookup failed: {exc}')
        return {'success': False, 'error': f'MSA lookup failed: {exc}'}

    if not candidates:
        return {
            'success': False,
            'error': f'No active MSA matched {query!r}.',
            'suggested_user_question': (
                f"I couldn't find an MSA matching {query!r}. "
                'Could you provide more detail (e.g., "Los Angeles, CA" '
                'or the full MSA name)?'
            ),
        }

    if len(candidates) > 1:
        # Surface candidates so the model can ask the user to pick.
        labels = [
            f"{c['msa_name']} ({c['state_abbreviation']})" for c in candidates
        ]
        return {
            'success': False,
            'error': 'ambiguous',
            'candidates': candidates,
            'suggested_user_question': (
                f"Multiple MSAs matched {query!r}. Which did you mean? "
                + '; '.join(labels)
            ),
        }

    # Single match — queue the mutation proposal.
    target = candidates[0]
    target_msa_id = target['msa_id']
    target_label = f"{target['msa_name']} ({target['state_abbreviation']})"

    current = _read_current_msa(pid)
    current_label = (
        f"{current.get('msa_name')} ({current.get('state_abbreviation')})"
        if current.get('msa_name') else '(none)'
    )

    if current.get('msa_id') == target_msa_id:
        return {
            'success': True,
            'action': 'no_change_needed',
            'message': f"Project's MSA is already set to {target_label}.",
            'msa_id': target_msa_id,
        }

    try:
        result = MutationService.create_proposal(
            project_id=pid,
            mutation_type='field_update',
            table_name='tbl_project',
            field_name='msa_id',
            current_value=current.get('msa_id'),
            proposed_value=target_msa_id,
            reason=(
                f"User requested MSA change to {target_label}. Resolved "
                f"{query!r} to msa_id={target_msa_id}. Current MSA: "
                f"{current_label}."
            ),
            source_type='user_manual',
        )
    except Exception as exc:
        logger.exception(f'update_project_msa create_proposal failed: {exc}')
        return {'success': False, 'error': f'Failed to queue proposal: {exc}'}

    if not result.get('success'):
        return result

    # Decorate the response with human-readable labels so the chat
    # narration and the proposal card can show city/state names instead
    # of opaque integer ids.
    return {
        **result,
        'human_readable': {
            'current': current_label,
            'proposed': target_label,
        },
    }
