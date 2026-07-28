"""Server-side variance-review artifact builder.

Commit · Impact · Variance reference §3 — "the knowledge engine doing the
checking." Renders the outliers found by ``variance_service.check_budget_variance``
as a deterministic artifact, in the same server-rendered shape as the five
shipped schedules (budget / sales / cash flow / capitalization / rent roll).
The model announces it; it never composes the table.

Shape:
  - one key_value_grid KPI header: Lines Checked · Compared · Flagged ·
    Needs a Decision
  - one table block: Category · Description · Your Rate · Unit · Peer Median ·
    Peer Range · Deals · Variance % · Status

Honest columns only. The firm cost-library leg has no usable coverage for budget
rates today (the library keys on a different category space and its typical
values are NULL), so no library column is emitted unless at least one finding
actually resolved one — an empty column implying "checked, and fine" would be
worse than no column.

The renderer's universal tabular formatting (thousands separators, parens
negatives, em-dash zero, no ``$``) applies for free — this module emits raw
numbers, never formatted strings.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_STATUS_LABEL = {
    'blocker': 'Needs a decision',
    'review': 'Review',
}


def _range_label(low: Optional[float], high: Optional[float]) -> str:
    if low is None or high is None:
        return '—'
    if low == high:
        return f'{low:,.0f}'
    return f'{low:,.0f}–{high:,.0f}'


def build_variance_artifact_schema(result: Dict[str, Any]) -> Dict[str, Any]:
    """Build the fixed variance-review schema from the service result."""
    findings: List[Dict[str, Any]] = result.get('findings') or []
    thresholds = result.get('thresholds') or {}

    kpi_pairs: List[Dict[str, Any]] = [
        {'label': 'Lines Checked', 'value': result.get('lines_checked', 0)},
        {'label': 'Compared to Peers', 'value': result.get('lines_compared', 0)},
        {'label': 'Flagged', 'value': len(findings)},
        {'label': 'Needs a Decision', 'value': result.get('blocker_count', 0)},
    ]

    columns = [
        {'key': 'category', 'label': 'Category', 'align': 'left'},
        {'key': 'description', 'label': 'Description', 'align': 'left'},
        {'key': 'rate', 'label': 'Your Rate', 'align': 'right'},
        {'key': 'uom', 'label': 'Unit', 'align': 'left'},
        {'key': 'peer_median', 'label': 'Peer Median', 'align': 'right'},
        {'key': 'peer_range', 'label': 'Peer Range', 'align': 'right'},
        {'key': 'peer_projects', 'label': 'Deals', 'align': 'right'},
        {'key': 'scope', 'label': 'Compared With', 'align': 'left'},
        {'key': 'variance', 'label': 'Variance %', 'align': 'right'},
        {'key': 'status', 'label': 'Status', 'align': 'left'},
    ]

    rows: List[Dict[str, Any]] = []
    for idx, f in enumerate(findings, start=1):
        rows.append({
            'id': f'v{idx}',
            'cells': {
                'category': f.get('category_name') or '(uncategorized)',
                'description': f.get('description') or '(no description)',
                'rate': f.get('rate'),
                'uom': f.get('uom_code') or '',
                'peer_median': f.get('peer_median'),
                'peer_range': _range_label(f.get('peer_low'), f.get('peer_high')),
                'peer_projects': f.get('peer_projects'),
                'scope': f.get('peer_scope') or '—',
                'variance': f.get('pct_diff'),
                'status': _STATUS_LABEL.get(f.get('severity'), f.get('severity') or ''),
            },
        })

    blocks: List[Dict[str, Any]] = [
        {
            'id': 'variance_kpis',
            'type': 'key_value_grid',
            'columns': 4,
            'pairs': kpi_pairs,
        },
    ]

    if rows:
        blocks.append({
            'id': 'variance_findings',
            'type': 'table',
            'columns': columns,
            'rows': rows,
        })
        note = (
            f"Flagged beyond {thresholds.get('review_pct')}% from the median of "
            f"your comparable deals; \"needs a decision\" beyond "
            f"{thresholds.get('blocker_pct')}%. A line with fewer than "
            f"{thresholds.get('min_peer_projects')} comparable deals is not "
            f"compared — silence there means nothing to compare against, not "
            f"that the number is right."
        )
    else:
        note = (
            f"Nothing diverges more than {thresholds.get('review_pct')}% from your "
            f"comparable deals. "
            f"{result.get('lines_compared', 0)} of {result.get('lines_checked', 0)} "
            f"lines had enough comparable deals to check."
        )

    blocks.append({
        'id': 'variance_note',
        'type': 'text',
        'text': note,
    })

    return {'blocks': blocks}


def create_variance_artifact(
    *,
    project_id: int,
    project_name: Optional[str],
    result: Dict[str, Any],
    user_id: Any = None,
    thread_id: Any = None,
) -> Dict[str, Any]:
    """Build + register the budget variance-review artifact server-side.

    Dedup: one canonical variance review per project — re-running updates in
    place (mirrors the five shipped schedules). Title carries no
    operating-statement keywords, so the OS guard does not apply.
    """
    try:
        from apps.artifacts.services import create_artifact_record
    except Exception as exc:  # noqa: BLE001
        logger.exception('variance_artifact_builder: artifact service unavailable')
        return {'success': False, 'error': f'artifact service unavailable: {exc}'}

    schema = build_variance_artifact_schema(result)
    title = f'{project_name} — Budget Variance Review' if project_name \
        else 'Budget Variance Review'

    try:
        return create_artifact_record(
            title=title,
            schema=schema,
            edit_target={'modal_name': 'budget'},
            project_id=project_id,
            user_id=user_id,
            thread_id=thread_id,
            tool_name='review_budget_variance',
            params_json={'server_rendered': True},
            dedup_key='variance:budget_review',
            prior_tool_calls=['review_budget_variance'],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('variance_artifact_builder: create_artifact_record failed')
        return {'success': False, 'error': f'artifact creation failed: {exc}'}
