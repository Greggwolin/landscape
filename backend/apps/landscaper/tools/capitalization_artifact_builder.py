"""Server-side capitalization (capital stack + distribution waterfall) artifact
builder.

Capitalization base-artifact slice 1 (CAP1 — LSCMD-CAP-CAPSCHED-0724). Mirrors
``cashflow_artifact_builder`` / ``sales_artifact_builder`` / ``budget_artifact_builder``:
the model announces the artifact in one sentence; it NEVER composes the tables.

Capitalization is the bottom of the cluster — it consumes the cash flow the deal
throws off and divides it through the waterfall. It's a coupled pair rendered as
ONE artifact:

  1. Capital stack (the sources) — LP / GP equity, amount, share of stack.
  2. Distribution waterfall (the tiers) — per-tier hurdle, LP/GP split, and the
     computed LP/GP distributions, ending in the partner returns.

Ground-truth basis: this module NEVER computes waterfall math. It consumes the
serialized result of ``apps.calculations.services.CalculationService
.calculate_project_waterfall`` (the same engine the ``calculate_waterfall`` tool
and the Capitalization UI run), so the artifact can never drift from the returns.
Missing tiers / cash flows → no artifact, never fabricated numbers.

The value/split boundary the Cash Flow spec drew is enforced here by construction:
this artifact carries the pref, hurdles, splits, and promote — and NEVER a
discount rate. The discount rate lives on Cash Flow; the split lives here.

Editable-vs-calculated: the deal TERMS (hurdle, LP/GP split) are the dual-input
cells; every DISTRIBUTION and every partner return (LP/GP IRR, equity multiple,
promote) is calculated and read-only. Landscaper edits a term, never a
distribution.

Money cells are emitted as raw numbers (the renderer formats: parens negatives,
thousands separators, em-dash zero, no ``$``); rate/multiple values are emitted
as pre-formatted strings so a raw fraction never renders as 0.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def _num(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _pct_label(value: Any) -> str:
    """Decimal fraction (0.08) or already-percent (8.0) → percent string; em dash
    when absent. Tolerates either storage convention without inventing a number."""
    v = _num(value)
    if v is None:
        return '—'
    pct = v * 100 if abs(v) <= 1.5 else v
    return f'{pct:.1f}%'


def _multiple_label(value: Any) -> str:
    v = _num(value)
    if v is None:
        return '—'
    return f'{v:.2f}x'


def _hurdle_label(tier: Dict[str, Any]) -> str:
    """Prefer an IRR hurdle; fall back to an equity-multiple hurdle; else em dash."""
    if tier.get('irr_hurdle') is not None:
        return _pct_label(tier.get('irr_hurdle'))
    if tier.get('emx_hurdle') is not None:
        return _multiple_label(tier.get('emx_hurdle'))
    return '—'


def build_capitalization_artifact_schema(
    lp_summary: Dict[str, Any],
    gp_summary: Dict[str, Any],
    project_summary: Dict[str, Any],
    tier_config: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Build the fixed capitalization-artifact schema (KPI header + capital-stack
    grid + waterfall-tier grid).

    All inputs are the serialized ``calculate_project_waterfall`` result. Present
    keys only — no fabricated rows. Column presence follows the Driver-1 floor:
    the promote column shows only when any tier carries a promote.
    """
    # ---- KPI header — engine outputs only, present keys only ------------------
    kpi_pairs: List[Dict[str, Any]] = []
    if lp_summary.get('irr') is not None:
        kpi_pairs.append({'label': 'LP IRR', 'value': _pct_label(lp_summary['irr'])})
    if lp_summary.get('equity_multiple') is not None:
        kpi_pairs.append({'label': 'LP Multiple', 'value': _multiple_label(lp_summary['equity_multiple'])})
    if gp_summary.get('promote') is not None:
        kpi_pairs.append({'label': 'GP Promote', 'value': round(_num(gp_summary['promote']) or 0)})
    if project_summary.get('project_irr') is not None:
        kpi_pairs.append({'label': 'Project IRR', 'value': _pct_label(project_summary['project_irr'])})
    if project_summary.get('total_equity') is not None:
        kpi_pairs.append({'label': 'Total Equity', 'value': round(_num(project_summary['total_equity']) or 0)})

    # ---- Capital stack grid — the sources -------------------------------------
    total_equity = _num(project_summary.get('total_equity')) or 0.0

    def _share(amount: Optional[float]) -> Optional[float]:
        if amount is None or not total_equity:
            return None
        return round(amount / total_equity * 100, 1)

    stack_columns = [
        {'key': 'source', 'label': 'Source', 'align': 'left', 'editable': False},
        # Contributed equity is an input (what the partner put in); share is calc.
        {'key': 'amount', 'label': 'Amount', 'align': 'right', 'editable': True},
        {'key': 'share', 'label': 'Share', 'align': 'right', 'editable': False},
        {'key': 'evidence', 'label': 'Evidence', 'align': 'left', 'editable': False},
    ]
    stack_rows: List[Dict[str, Any]] = []
    lp_eq = _num(project_summary.get('lp_equity'))
    gp_eq = _num(project_summary.get('gp_equity'))
    if lp_eq is not None:
        stack_rows.append({'id': 'cs_lp', 'cells': {
            'source': 'LP Equity', 'amount': lp_eq,
            'share': (f'{_share(lp_eq):.1f}%' if _share(lp_eq) is not None else '—'),
            'evidence': 'Deal terms'}})
    if gp_eq is not None:
        stack_rows.append({'id': 'cs_gp', 'cells': {
            'source': 'GP Equity', 'amount': gp_eq,
            'share': (f'{_share(gp_eq):.1f}%' if _share(gp_eq) is not None else '—'),
            'evidence': 'Deal terms'}})

    # ---- Waterfall tier grid — terms (input) + distributions (calc) -----------
    show_promote = any(_num(t.get('promote_percent')) for t in tier_config)

    tier_columns: List[Dict[str, Any]] = [
        {'key': 'tier', 'label': 'Tier', 'align': 'left', 'editable': False},
        {'key': 'hurdle', 'label': 'Hurdle', 'align': 'right', 'editable': True},
        {'key': 'lp_split', 'label': 'LP Split', 'align': 'right', 'editable': True},
        {'key': 'gp_split', 'label': 'GP Split', 'align': 'right', 'editable': True},
    ]
    if show_promote:
        tier_columns.append({'key': 'promote', 'label': 'Promote', 'align': 'right', 'editable': True})
    tier_columns.extend([
        # Distributions are CALCULATED; Landscaper edits the terms above, not these.
        {'key': 'lp_dist', 'label': 'LP Distribution', 'align': 'right', 'editable': False},
        {'key': 'gp_dist', 'label': 'GP Distribution', 'align': 'right', 'editable': False},
    ])

    tier_rows: List[Dict[str, Any]] = []
    for idx, t in enumerate(tier_config, start=1):
        tier_num = t.get('tier_number') or idx
        dist_key = f'tier{tier_num}'
        cells: Dict[str, Any] = {
            'tier': t.get('tier_name') or f'Tier {tier_num}',
            'hurdle': _hurdle_label(t),
            'lp_split': _pct_label(t.get('lp_split_pct')),
            'gp_split': _pct_label(t.get('gp_split_pct')),
            'lp_dist': _num(lp_summary.get(dist_key)),
            'gp_dist': _num(gp_summary.get(dist_key)),
        }
        if show_promote:
            cells['promote'] = _pct_label(t.get('promote_percent'))
        tier_rows.append({'id': f't{idx}', 'cells': cells})

    return {
        'blocks': [
            {
                'id': 'cap_kpis',
                'type': 'key_value_grid',
                'columns': 5,
                'pairs': kpi_pairs,
            },
            {
                'id': 'cap_stack',
                'type': 'table',
                'title': 'Capital Stack',
                'columns': stack_columns,
                'rows': stack_rows,
            },
            {
                'id': 'cap_waterfall',
                'type': 'table',
                'title': 'Distribution Waterfall',
                'columns': tier_columns,
                'rows': tier_rows,
            },
        ],
    }


def create_capitalization_artifact(
    *,
    project_id: int,
    project_name: Optional[str],
    lp_summary: Dict[str, Any],
    gp_summary: Dict[str, Any],
    project_summary: Dict[str, Any],
    tier_config: List[Dict[str, Any]],
    user_id: Any = None,
    thread_id: Any = None,
) -> Dict[str, Any]:
    """Build + register the capitalization schedule artifact server-side.

    Returns the artifact service envelope on success, or
    ``{'success': False, 'error': ...}``. Dedup: one canonical capitalization
    artifact per project — re-running updates in place (mirrors budget / sales /
    cash flow / OS). No ``artifact_subtype`` — not an operating statement, so the
    OS guard does not apply.
    """
    if not tier_config:
        return {'success': False, 'error': 'no waterfall tiers to render'}

    try:
        from apps.artifacts.services import create_artifact_record
    except Exception as exc:  # noqa: BLE001
        logger.exception('capitalization_artifact_builder: artifact service unavailable')
        return {'success': False, 'error': f'artifact service unavailable: {exc}'}

    schema = build_capitalization_artifact_schema(
        lp_summary, gp_summary, project_summary, tier_config,
    )
    title = f'{project_name} — Capitalization' if project_name else 'Capitalization'

    try:
        return create_artifact_record(
            title=title,
            schema=schema,
            project_id=project_id,
            user_id=user_id,
            thread_id=thread_id,
            tool_name='get_capitalization_schedule',
            params_json={'server_rendered': True},
            dedup_key='capitalization:schedule_detail',
            prior_tool_calls=['get_capitalization_schedule'],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('capitalization_artifact_builder: create_artifact_record failed')
        return {'success': False, 'error': f'artifact creation failed: {exc}'}
