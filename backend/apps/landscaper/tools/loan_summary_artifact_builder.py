"""Server-side loan summary artifact builder (HQ162).

Gregg, 2026-10-02: "we need to be able to create an artifact that looks like"
the Senior Loan Summary sheet of the Star Valley Lotbank model — max and average
outstanding across the top; terms, other terms and release on the left; the loan
budget (total / borrower / lender), the summary of proceeds (the loan-in-process
lines) and the equity on the right.

Mirrors the other server-rendered builders: the model announces the artifact in
one sentence and NEVER composes the tables. Every figure is read from the
record or from the app's own engines:

  * the loan budget, summary of proceeds and equity —
    ``LoanSizingService.build_budget_summary`` (the same source as the classic
    loan-budget modal and the loan-budget PDF);
  * max and average outstanding — the loan's own schedule, the same run the
    Debt screen's Draws & balance shows;
  * terms — the loan record. A term not on the record shows an em dash; nothing
    is filled in.

Money is emitted raw (the renderer formats it); rates and percents are emitted
as pre-formatted strings.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DASH = '—'


def _num(value: Any) -> Optional[float]:
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _pct(value: Any, digits: int = 2) -> str:
    v = _num(value)
    return DASH if v is None else f'{v:.{digits}f}%'


def _money_or_dash(value: Any) -> Any:
    v = _num(value)
    return DASH if v is None else round(v)


def _z(value: Any) -> Any:
    """A zero shows as an em dash. The renderer reads a row whose figures are
    all blank as a heading and indents what follows, so a zero must not be blank."""
    v = _num(value)
    return DASH if v is None or abs(v) < 0.5 else v


def _kv_table(block_id: str, title: str, rows: List[tuple]) -> Dict[str, Any]:
    """A two-column label / value table (the left-hand panels of the sheet)."""
    return {
        'id': block_id,
        'type': 'table',
        'title': title,
        'columns': [
            {'key': 'label', 'label': '', 'align': 'left', 'editable': False},
            {'key': 'value', 'label': 'Amount', 'align': 'right', 'editable': False},
        ],
        'rows': [
            {'id': f'{block_id}_{i}', 'cells': {'label': label, 'value': value}}
            for i, (label, value) in enumerate(rows)
        ],
    }


def outstanding_stats(schedule: Dict[str, Any], commitment: float) -> Dict[str, Optional[float]]:
    """Max and average outstanding from the loan's schedule. The average is
    over the months the loan is outstanding (balance above zero), as the Star
    Valley sheet averages over the loan's life."""
    balances = [
        _num(p.get('ending_balance')) or 0.0
        for p in (schedule.get('periods') or [])
    ]
    live = [b for b in balances if b > 0.5]
    if not live:
        return {'max': None, 'max_pct': None, 'avg': None, 'avg_pct': None}
    mx = max(live)
    avg = sum(live) / len(live)
    return {
        'max': mx,
        'max_pct': (mx / commitment * 100) if commitment else None,
        'avg': avg,
        'avg_pct': (avg / commitment * 100) if commitment else None,
    }


def _budget_tables(summary: Dict[str, Any]):
    """The loan budget, summary of proceeds and equity tables — shared by the
    loan summary and the loan budget artifacts."""
    # ---- Right: loan budget, proceeds, equity --------------------------------
    lb = summary.get('loan_budget') or {}
    budget = {
        'id': 'ls_budget',
        'type': 'table',
        'title': 'Loan budget',
        'columns': [
            {'key': 'label', 'label': '', 'align': 'left', 'editable': False},
            {'key': 'total', 'label': 'Total', 'align': 'right', 'editable': False},
            {'key': 'borrower', 'label': 'Borrower', 'align': 'right', 'editable': False},
            {'key': 'lender', 'label': 'Lender', 'align': 'right', 'editable': False},
        ],
        'rows': [
            {'id': f'lb_{i}', 'cells': {
                'label': r['label'], 'total': _z(r['total']),
                'borrower': _z(r['borrower']), 'lender': _z(r['lender'])}}
            for i, r in enumerate(lb.get('rows') or [])
        ] + [{
            'id': 'lb_total', 'is_total': True,
            'cells': {
                'label': 'Total budget',
                'total': (lb.get('totals') or {}).get('total_budget'),
                'borrower': (lb.get('totals') or {}).get('borrower_total'),
                'lender': (lb.get('totals') or {}).get('lender_total'),
            },
        }],
    }

    proceeds = {
        'id': 'ls_proceeds',
        'type': 'table',
        'title': 'Summary of proceeds',
        'columns': [
            {'key': 'label', 'label': '', 'align': 'left', 'editable': False},
            {'key': 'pct', 'label': '% of loan', 'align': 'right', 'editable': False},
            {'key': 'total', 'label': 'Total', 'align': 'right', 'editable': False},
        ],
        'rows': [
            {'id': f'sp_{i}', 'cells': {
                'label': r['label'],
                'pct': _pct(r.get('pct_of_loan'), 0) if r.get('pct_of_loan') is not None else DASH,
                'total': _z(r['total'])},
             **({'is_total': True} if r['label'] == 'Closing Funds Available' else {})}
            for i, r in enumerate(summary.get('summary_of_proceeds') or [])
        ],
    }

    equity = {
        'id': 'ls_equity',
        'type': 'table',
        'title': 'Equity',
        'columns': [
            {'key': 'label', 'label': '', 'align': 'left', 'editable': False},
            {'key': 'total', 'label': 'Total', 'align': 'right', 'editable': False},
        ],
        'rows': [
            {'id': f'eq_{i}', 'cells': {'label': r['label'], 'total': _z(r['total'])},
             **({'is_total': True} if r['label'] in ('Total Equity to Close', 'Equity: Total') else {})}
            for i, r in enumerate(summary.get('equity_to_close') or [])
        ],
    }

    return budget, proceeds, equity


def build_loan_summary_schema(
    loan: Any,
    summary: Dict[str, Any],
    stats: Dict[str, Optional[float]],
) -> Dict[str, Any]:
    commitment = _num(summary.get('commitment_amount')) or 0.0

    # ---- Header: max / average outstanding --------------------------------
    pairs = [
        {'label': 'Commitment', 'value': round(commitment)},
        {'label': 'Max outstanding',
         'value': round(stats['max']) if stats.get('max') is not None else DASH},
        {'label': 'Max % of loan', 'value': _pct(stats.get('max_pct'), 0)},
        {'label': 'Average outstanding',
         'value': round(stats['avg']) if stats.get('avg') is not None else DASH},
        {'label': 'Average % of loan', 'value': _pct(stats.get('avg_pct'), 0)},
    ]

    # ---- Left: terms --------------------------------------------------------
    index_rate = _num(getattr(loan, 'index_rate_pct', None))
    spread_bps = _num(getattr(loan, 'interest_spread_bps', None))
    index_name = getattr(loan, 'interest_index', None) or 'Index'
    rate = _num(getattr(loan, 'interest_rate_pct', None))
    orig_pct = _num(getattr(loan, 'origination_fee_pct', None))
    if orig_pct is not None and orig_pct < 1:
        orig_pct *= 100  # stored as a fraction (0.01) on some loans
    terms = _kv_table('ls_terms', 'Leverage & rate', [
        ('Total leverage (LTC)', _pct(getattr(loan, 'loan_to_cost_pct', None), 0)),
        ('Loan to value', _pct(getattr(loan, 'loan_to_value_pct', None), 0)),
        (f'Rate: {index_name} index', _pct(index_rate)),
        ('Rate: spread', _pct(spread_bps / 100) if spread_bps is not None else DASH),
        ('Loan rate', _pct(rate)),
        ('Origination fee %', _pct(orig_pct)),
        ('Term (months)', getattr(loan, 'loan_term_months', None) or DASH),
        ('Interest only (months)', getattr(loan, 'interest_only_months', None) or DASH),
    ])

    budget_rows = {r['label']: r for r in (summary.get('loan_budget') or {}).get('rows', [])}
    accel = _num(getattr(loan, 'repayment_acceleration', None))
    other_terms = _kv_table('ls_other', 'Other terms', [
        ('Interest reserve', _money_or_dash((budget_rows.get('Interest Reserve') or {}).get('total'))),
        ('Origination fee', _money_or_dash((budget_rows.get('Origination Fee') or {}).get('total'))),
        ('Loan costs: appraisal', _money_or_dash(getattr(loan, 'closing_costs_appraisal', None))),
        ('Loan costs: legal', _money_or_dash(getattr(loan, 'closing_costs_legal', None))),
        ('Loan costs: other', _money_or_dash(getattr(loan, 'closing_costs_other', None))),
        ('Repayment acceleration', _pct(accel * 100, 0) if accel is not None else DASH),
    ])

    basis = (getattr(loan, 'release_basis', None) or '').upper()
    release_rows: List[tuple] = []
    if basis in ('CASH_SWEEP', 'SWEEP') or (basis == '' and _num(getattr(loan, 'release_price_pct', None)) is None):
        release_rows.append(('Release basis', 'Cash sweep (100%)'))
    else:
        release_rows.append(('Release basis', basis.replace('_', ' ').title() or DASH))
        release_rows.append(('Release price (% of loan per lot or acre)',
                             _pct(getattr(loan, 'release_price_pct', None), 0)))
    release_rows.append(('Minimum release (per lot or acre)',
                         _money_or_dash(getattr(loan, 'minimum_release_amount', None))))
    release = _kv_table('ls_release', 'Release', release_rows)

    budget, proceeds, equity = _budget_tables(summary)

    return {
        'blocks': [
            {'id': 'ls_kpis', 'type': 'key_value_grid', 'columns': 5, 'pairs': pairs},
            {
                'id': 'ls_body',
                'type': 'section',
                'title': summary.get('loan_name') or 'Loan',
                # Two columns side by side, as the sheet lays them out.
                'columns': 2,
                # Side by side when there is room (panel widened or popped out);
                # stacked in the narrow panel rather than overflowing.
                'column_template': 'repeat(auto-fit, minmax(440px, 1fr))',
                'children': [
                    {'id': 'ls_left', 'type': 'section', 'title': 'Terms',
                     'children': [terms, other_terms, release]},
                    {'id': 'ls_right', 'type': 'section', 'title': 'Budget & proceeds',
                     'children': [budget, proceeds, equity]},
                ],
            },
        ],
    }


def build_loan_budget_schema(summary: Dict[str, Any]) -> Dict[str, Any]:
    """The loan budget artifact (Gregg, 2026-10-02): only the budget and
    proceeds sections of the loan summary — loan budget, summary of proceeds,
    equity. No headline figures, no terms."""
    budget, proceeds, equity = _budget_tables(summary)
    return {
        'blocks': [
            {
                'id': 'lb_body',
                'type': 'section',
                'title': summary.get('loan_name') or 'Loan',
                'children': [budget, proceeds, equity],
            },
        ],
    }


def create_loan_summary_artifact(
    *,
    project_id: int,
    project_name: Optional[str],
    loan: Any,
    summary: Dict[str, Any],
    schedule: Dict[str, Any],
    user_id: Any = None,
    thread_id: Any = None,
    kind: str = 'summary',
) -> Dict[str, Any]:
    """Build + register the loan summary artifact, or with kind='budget' the
    loan budget artifact (budget and proceeds only). One of each per loan —
    re-running updates it in place."""
    try:
        from apps.artifacts.services import create_artifact_record
    except Exception as exc:  # noqa: BLE001
        logger.exception('loan_summary_artifact_builder: artifact service unavailable')
        return {'success': False, 'error': f'artifact service unavailable: {exc}'}

    loan_name = summary.get('loan_name') or getattr(loan, 'loan_name', 'Loan')
    if kind == 'budget':
        schema = build_loan_budget_schema(summary)
        label, tool, dkind = 'Loan Budget', 'get_loan_budget', 'loan_budget'
    else:
        commitment = _num(summary.get('commitment_amount')) or 0.0
        stats = outstanding_stats(schedule or {}, commitment)
        schema = build_loan_summary_schema(loan, summary, stats)
        label, tool, dkind = 'Loan Summary', 'get_loan_summary', 'loan_summary'
    title = f'{project_name} — {label}: {loan_name}' if project_name else f'{label}: {loan_name}'
    try:
        return create_artifact_record(
            title=title,
            schema=schema,
            project_id=project_id,
            user_id=user_id,
            thread_id=thread_id,
            tool_name=tool,
            params_json={'server_rendered': True, 'kind': dkind,
                         'loan_id': getattr(loan, 'loan_id', None)},
            dedup_key=f'{dkind}:{getattr(loan, "loan_id", "")}',
            prior_tool_calls=[tool],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('loan_summary_artifact_builder: create_artifact_record failed')
        return {'success': False, 'error': f'artifact creation failed: {exc}'}
