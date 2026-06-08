"""Single source of truth for routing a project to its cash-flow engine
and reducing the resulting envelope to leveraged cash flow.

Both engines expose ``.calculate()`` returning the same envelope shape::

    { projectId, periodType, startDate, endDate, totalPeriods,
      periods[], sections[], summary{}, generatedAt, ...,
      # income only: exitAnalysis{}, reversion{} }

This module replaces three previously-duplicated routing sites:
  - ``apps.landscaper.tool_executor._fetch_cashflow_schedule``
  - ``apps.calculations.services._fetch_landdev_cashflows_from_django_service``
  - ``apps.calculations.services._fetch_income_property_cashflows_from_django_service``

Consume ``.calculate()`` only; never modify engine calculation logic here.
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Any, Dict, List, Optional

from django.db import connection

logger = logging.getLogger(__name__)

# Income-property project_type_codes. LAND is handled explicitly; everything
# else (including unknown/missing) degrades to an empty envelope.
INCOME_PROPERTY_TYPE_CODES = ('MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU')


def get_project_type_code(project_id: int) -> str:
    """Return the upper-cased project_type_code, or '' if missing/unknown."""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT project_type_code FROM landscape.tbl_project WHERE project_id = %s",
            [project_id],
        )
        row = cursor.fetchone()
    return ((row[0] if row else '') or '').upper()


def empty_cashflow_envelope(project_id: int) -> Dict[str, Any]:
    """Empty schedule envelope used for graceful degradation."""
    return {
        'projectId': project_id,
        'periodType': 'month',
        'startDate': None,
        'endDate': None,
        'totalPeriods': 0,
        'periods': [],
        'sections': [],
        'summary': {},
        'generatedAt': date.today().isoformat(),
    }


def fetch_cashflow_schedule(
    project_id: int,
    include_financing: bool = True,
    container_ids: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """Route by ``project_type_code`` and return the engine's ``.calculate()``
    envelope.

    LAND -> ``LandDevCashFlowService``; income types ->
    ``IncomePropertyCashFlowService``. Unknown / missing type logs a warning
    and returns an empty envelope (graceful degradation; never raises for a
    misconfigured project).

    ``container_ids`` filters to specific divisions (phases/villages). The
    income engine accepts but ignores it (no phase decomposition yet).

    Both engines are called with keyword arguments because their positional
    parameter order differs.

    Raises:
        RuntimeError: if the resolved engine errors or returns nothing.
    """
    project_type_code = get_project_type_code(project_id)

    if project_type_code == 'LAND':
        from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService
        service_cls = LandDevCashFlowService
    elif project_type_code in INCOME_PROPERTY_TYPE_CODES:
        from apps.financial.services.income_property_cashflow_service import IncomePropertyCashFlowService
        service_cls = IncomePropertyCashFlowService
    else:
        logger.warning(
            "[fetch_cashflow_schedule] Unrecognized project_type_code=%r for "
            "project_id=%s; returning empty schedule",
            project_type_code, project_id,
        )
        return empty_cashflow_envelope(project_id)

    try:
        service = service_cls(project_id)
        data = service.calculate(
            include_financing=include_financing,
            container_ids=container_ids,
        )
    except ValueError as err:
        raise RuntimeError(f"Cash flow calculation error: {err}")
    except Exception as err:
        raise RuntimeError(f"Cash flow calculation failed: {err}")

    if not data:
        raise RuntimeError('Cash flow service did not return schedule data')

    return data


# ---------------------------------------------------------------------------
# Envelope reduction: leveraged cash flow
# ---------------------------------------------------------------------------

# Section ids that are ADDITIVE to leveraged cash flow. revenue-net is the net
# operating line in BOTH engines (land "NET REVENUE", income "NET OPERATING
# INCOME"); cost-* / financing / lotbank-* are real cash in/out. The component
# sections that roll UP into revenue-net are excluded to avoid double counting.
_EXCLUDED_SECTION_IDS = frozenset({
    'revenue-gross', 'revenue-deductions', 'income-opex',
})


def _is_additive(section_id: str) -> bool:
    if not section_id or section_id in _EXCLUDED_SECTION_IDS:
        return False
    return (
        section_id == 'revenue-net'
        or section_id.startswith('cost-')
        or section_id == 'financing'
        or section_id.startswith('lotbank-')
    )


def _subtotals_by_period(section: Dict[str, Any]) -> Dict[int, float]:
    out: Dict[int, float] = {}
    for sub in section.get('subtotals', []) or []:
        seq = sub.get('periodSequence')
        if seq is None:
            continue
        out[seq] = out.get(seq, 0.0) + float(sub.get('amount') or 0)
    return out


def leveraged_cashflow_summary(envelope: Dict[str, Any]) -> Dict[str, Any]:
    """Reduce an engine envelope to per-period leveraged cash flow.

    Netting rule mirrors ``LeveragedCashFlow.tsx`` and the waterfall consumers:
    ``net = revenue-net + cost-* + financing + lotbank-*`` per period, with the
    income reversion (``exitAnalysis.netReversion``, gross of loan payoff; the
    payoff itself already lives in the financing section's final period) added
    to the final period. ``revenue-gross``/``revenue-deductions``/``income-opex``
    are excluded because they are already rolled into ``revenue-net``.

    Returns::

        {
          'rows': [{'seq', 'label', 'netRevenue', 'costs', 'financing',
                    'lotbank', 'reversion', 'net', 'cumulative'}],
          'totalNet', 'totalNetRevenue', 'totalCosts', 'totalFinancing',
          'totalLotbank', 'reversion', 'periodType', 'totalPeriods',
        }

    Returns empty rows for an empty envelope (no fabrication).
    """
    periods = envelope.get('periods') or []
    sections = envelope.get('sections') or []

    # Per-period component buckets keyed by periodSequence.
    net_rev: Dict[int, float] = {}
    costs: Dict[int, float] = {}
    fin: Dict[int, float] = {}
    lot: Dict[int, float] = {}

    for section in sections:
        sid = section.get('sectionId', '')
        if not _is_additive(sid):
            continue
        by_period = _subtotals_by_period(section)
        if sid == 'revenue-net':
            bucket = net_rev
        elif sid == 'financing':
            bucket = fin
        elif sid.startswith('lotbank-'):
            bucket = lot
        else:  # cost-*
            bucket = costs
        for seq, amt in by_period.items():
            bucket[seq] = bucket.get(seq, 0.0) + amt

    exit_analysis = envelope.get('exitAnalysis') or {}
    reversion = float(exit_analysis.get('netReversion') or 0)

    # Ordered period sequences (fall back to union of buckets if periods empty).
    seqs = [p.get('periodSequence') for p in periods if p.get('periodSequence') is not None]
    if not seqs:
        seqs = sorted(set().union(net_rev, costs, fin, lot))
    labels = {p.get('periodSequence'): p.get('label', '') for p in periods}

    last_seq = seqs[-1] if seqs else None

    rows: List[Dict[str, Any]] = []
    cumulative = 0.0
    total_net = total_nr = total_c = total_f = total_l = 0.0
    for seq in seqs:
        nr = net_rev.get(seq, 0.0)
        c = costs.get(seq, 0.0)
        f = fin.get(seq, 0.0)
        l = lot.get(seq, 0.0)
        rev = reversion if seq == last_seq else 0.0
        net = nr + c + f + l + rev
        cumulative += net
        rows.append({
            'seq': seq,
            'label': labels.get(seq, f'Period {seq}'),
            'netRevenue': nr,
            'costs': c,
            'financing': f,
            'lotbank': l,
            'reversion': rev,
            'net': net,
            'cumulative': cumulative,
        })
        total_net += net
        total_nr += nr
        total_c += c
        total_f += f
        total_l += l

    return {
        'rows': rows,
        'totalNet': total_net,
        'totalNetRevenue': total_nr,
        'totalCosts': total_c,
        'totalFinancing': total_f,
        'totalLotbank': total_l,
        'reversion': reversion,
        'periodType': envelope.get('periodType', 'month'),
        'totalPeriods': envelope.get('totalPeriods', len(rows)),
    }
