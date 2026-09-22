"""Server-side derivation of a PROJECTED operating statement.

Why this exists
---------------
A projected statement is arithmetic on the statement you already have. It is
not a document to be looked up, and it is not something a language model
should compose.

The first attempt at this (``proforma_tools.py``, ``get_proforma``) shipped
2026-04-30 and was reverted 2026-05-01 because it was written as a parallel
statement builder and collided with the ``statement_discriminator`` scenario
taxonomy the schema already encodes. What replaced it was an
``artifact_subtype`` enum value, ``f12_proforma``, with no implementation
behind it anywhere -- so selecting it meant the model composed the figures.
On Chadron Terrace that produced, on the record: expense granularity
collapsed (Electricity/Gas/Water/Trash merged into one "Utilities", and
Legal/Marketing/Office dropped entirely), a phantom "Pest Control 1,380"
line present in no source, unit-mix counts re-aggregated wrong, and a blank
commercial value.

This module is built so that none of those five is expressible.

The design that makes that true
-------------------------------
**This module does not build an artifact.** It takes the operations payload,
returns a new payload of the identical shape with the numbers moved, and
hands it to the SAME ``build_os_artifact_schema`` that renders the historical
statement. Structure is preserved because nothing here can alter structure:
no row is added, none is removed, none is renamed, none is re-aggregated.
Gregg's instruction from 2026-04-30, unchanged -- "format should be exactly
the same, only the numbers should change."

Arithmetic
----------
* Year 1 is today's run rate -- no growth. "Year N" carries N-1 years of
  growth (Gregg, 2026-09-22, D-2026-09-22-YEAR1).
* Gross potential rent, other income: grown at the income rate.
* Vacancy / credit loss / concessions: these are percentages of gross
  potential rent, so they are RECOMPUTED from the grown rent rather than
  grown themselves. The percentage holds; the dollars move. A deduction with
  no rate on file is grown at the income rate instead, because it scales with
  the rent it is deducted from.
* Operating expenses: grown at the expense rate, category by category, each
  one independently.
* Effective gross income, total operating expenses and net operating income
  are RECOMPUTED from the grown components, never grown directly, so the
  statement reconciles down the page rather than approximately.

Growth rates are read from ``core_fin_growth_rate_sets`` and
``core_fin_growth_rate_steps`` and compounded period by period, honouring
``from_period`` / ``thru_period`` / ``periods``. A single open-ended step --
the common case -- compounds to the familiar ``(1 + rate) ** years``.

**A project with no growth assumptions on file raises.** It does not fall
back to a default. The reverted implementation defaulted to 0.03/0.03, which
is exactly the invented figure the project's standing rules forbid: missing
data is a question, never a silent default.
"""

from __future__ import annotations

import re

import copy
import logging
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Growth-rate sets carry a card_type; these are the two that drive a P&L.
_INCOME_CARD_TYPE = 'revenue'
_EXPENSE_CARD_TYPE = 'cost'

MAX_HORIZON_YEARS = 10
"""Matches ``income_approach_service.DEFAULTS['hold_period_years']``. A
projection beyond the hold period is a question about the hold period, not a
longer projection."""


class MissingGrowthAssumptions(Exception):
    """Raised when a project has no growth assumptions on file.

    Deliberately not a fallback. The caller surfaces this to the user as a
    question -- which rate should be used -- rather than inventing one.
    """

    def __init__(self, project_id: int, missing: List[str]) -> None:
        self.project_id = project_id
        self.missing = missing
        super().__init__(
            f'project {project_id} has no growth assumptions on file for: '
            f'{", ".join(missing)}'
        )


class HorizonOutOfRange(Exception):
    """Raised for a horizon this tool does not support.

    Carries the supported range so the assistant can state what it CAN do
    rather than offering to improvise -- the failure Gregg reported on
    2026-09-16.
    """

    def __init__(self, years: Any) -> None:
        self.requested = years
        self.min_years = 1
        self.max_years = MAX_HORIZON_YEARS
        super().__init__(
            f'horizon {years!r} is out of range; supported: '
            f'{self.min_years}-{self.max_years} years'
        )


def _f(value: Any) -> float:
    """Payload figures arrive as float, str or Decimal depending on the
    source column. None and unparseable both mean zero here."""
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _rate_of(entry: Dict[str, Any]) -> Optional[float]:
    """A deduction's rate as a fraction, or None when it carries none.

    The payload is inconsistent about this by source: some rows express 9.7%
    as 0.097 and others as 9.7. The builder that renders the label already
    disambiguates on ``< 1``; this mirrors that exactly rather than inventing
    a second convention, because the two must agree or the printed percentage
    stops describing the arithmetic.
    """
    raw = entry.get('rate')
    if raw in (None, ''):
        return None
    try:
        val = float(raw)
    except (TypeError, ValueError):
        return None
    return val if val < 1 else val / 100.0


def compound_factor(steps: List[Dict[str, Any]], years: int) -> float:
    """Compound a set of growth steps over ``years`` periods.

    Each step covers periods ``from_period`` through ``thru_period``
    inclusive; ``periods`` is an alternative span expressed as a length.
    A step with neither runs to the end. Periods no step covers grow at
    zero -- silence is not 3%.
    """
    factor = 1.0
    for period in range(1, years + 1):
        factor *= 1.0 + _rate_for_period(steps, period)
    return factor


def _rate_for_period(steps: List[Dict[str, Any]], period: int) -> float:
    for step in steps:
        start = int(step.get('from_period') or 1)
        if period < start:
            continue
        thru = step.get('thru_period')
        if thru in (None, ''):
            span = step.get('periods')
            thru = start + int(span) - 1 if span not in (None, '') else None
        if thru is not None and period > int(thru):
            continue
        return _f(step.get('rate'))
    return 0.0


def load_growth_steps(project_id: int) -> Dict[str, List[Dict[str, Any]]]:
    """Growth steps for a project, by card type.

    Raises ``MissingGrowthAssumptions`` when either side is absent. Only the
    project's own default sets are used: a global fallback would reintroduce
    the invented-rate problem one level up.
    """
    from django.db import connection

    sql = """
        SELECT s.card_type, st.from_period, st.thru_period, st.periods, st.rate
        FROM landscape.core_fin_growth_rate_sets s
        JOIN landscape.core_fin_growth_rate_steps st ON st.set_id = s.set_id
        WHERE s.project_id = %s AND s.is_default IS TRUE
        ORDER BY s.card_type, st.step_number
    """
    out: Dict[str, List[Dict[str, Any]]] = {
        _INCOME_CARD_TYPE: [], _EXPENSE_CARD_TYPE: []
    }
    with connection.cursor() as cursor:
        # `project_id` is a bigint. An earlier version cast the parameter to
        # text, which Postgres rejects outright -- "operator does not exist:
        # bigint = text" -- and the tool crashed before printing a figure. No
        # unit test caught it because none of them open a connection, and a
        # quoted literal in a hand-written query DOES work (an unknown-typed
        # literal coerces), which is what made the wrong version look verified.
        cursor.execute(sql, [int(project_id)])
        for card_type, from_period, thru_period, periods, rate in cursor.fetchall():
            if card_type not in out:
                continue
            out[card_type].append({
                'from_period': from_period,
                'thru_period': thru_period,
                'periods': periods,
                'rate': rate,
            })

    missing = [k for k, v in out.items() if not v]
    if missing:
        label = {_INCOME_CARD_TYPE: 'income', _EXPENSE_CARD_TYPE: 'expenses'}
        raise MissingGrowthAssumptions(
            int(project_id), [label[m] for m in missing]
        )
    return out


def project_payload(
    payload: Dict[str, Any],
    *,
    years: int,
    income_steps: List[Dict[str, Any]],
    expense_steps: List[Dict[str, Any]],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Return ``(projected_payload, provenance)``.

    The returned payload has the SAME shape as the one passed in -- same
    rows, same labels, same order, same nesting. Only figures move. It is
    then rendered by the unchanged ``build_os_artifact_schema``, which is
    what makes the recorded composition bugs structurally impossible rather
    than merely discouraged.
    """
    if not isinstance(years, int) or isinstance(years, bool) \
            or years < 1 or years > MAX_HORIZON_YEARS:
        raise HorizonOutOfRange(years)

    # Year 1 IS today's run rate; growth starts in Year 2 (Gregg, 2026-09-22,
    # D-2026-09-22-YEAR1, "5a"). So "Year N" carries N-1 years of growth. This
    # used to compound N years, which put every stored "Year N Proforma" one
    # year ahead of its label — Chadron's "Year 1" was current + one year.
    growth_years = years - 1
    income_factor = compound_factor(income_steps, growth_years)
    expense_factor = compound_factor(expense_steps, growth_years)

    out = copy.deepcopy(payload)
    totals = out.setdefault('totals', {})

    provenance = {
        'years': years,
        'growth_years': growth_years,
        'income_factor': income_factor,
        'expense_factor': expense_factor,
        'income_rate_year_1': _rate_for_period(income_steps, 1),
        'expense_rate_year_1': _rate_for_period(expense_steps, 1),
        'income_steps': income_steps,
        'expense_steps': expense_steps,
        'base_gross_potential_rent': _f(totals.get('gross_potential_rent')),
        'management_fee_basis': 'expense_growth',
    }
    if growth_years == 0:
        # Year 1 is the statement on file, figure for figure. Recomputing the
        # deductions from their (rounded) rates would move them by hundreds of
        # dollars and make "today's run rate" disagree with today's screen.
        return out, provenance

    base_gpr = _f(totals.get('gross_potential_rent'))
    gpr = base_gpr * income_factor
    totals['gross_potential_rent'] = gpr

    deductions_total = 0.0
    for ded in (out.get('vacancy_deductions') or {}).get('rows') or []:
        as_is = ded.setdefault('as_is', {})
        rate = _rate_of(as_is)
        if rate is not None:
            grown = gpr * rate
        else:
            # No rate on file: it scales with the rent it is deducted from.
            grown = abs(_f(as_is.get('total'))) * income_factor
        as_is['total'] = grown
        deductions_total += abs(grown)

    other = _f(totals.get('total_other_income')) * income_factor
    totals['total_other_income'] = other

    egi = gpr + other - deductions_total
    totals['effective_gross_income'] = egi

    opex_total = 0.0
    for exp in (out.get('operating_expenses') or {}).get('rows') or []:
        as_is = exp.setdefault('as_is', {})
        amount = _f(as_is.get('total'))
        if not amount:
            continue  # label-only divider; nothing to grow
        grown = amount * expense_factor
        as_is['total'] = grown
        if int(exp.get('level') or 0) == 0:
            opex_total += abs(grown)

    totals['total_operating_expenses'] = opex_total
    totals['as_is_noi'] = egi - opex_total

    return out, provenance


def projection_title(
    property_name: str,
    base_scenario_label: str,  # noqa: ARG001 -- kept for call compatibility
    provenance: Dict[str, Any],
) -> str:
    """What the statement IS, and nothing else.

    "Chadron Terrace — Year 3 Proforma". The word proforma is what stops it
    being read as actuals; the derivation -- which statement it grew from and
    at what rates -- goes UNDER the schedule as a note, where Gregg put it on
    2026-09-18: "the header should only say ... you can add the other comments
    as a note below the schedule in smaller, plain font."
    """
    return f'{property_name} — Year {provenance["years"]} Proforma'


def projection_note(
    base_scenario_label: str,
    provenance: Dict[str, Any],
) -> str:
    """The derivation, for the note under the schedule.

    Still on the face of the artifact, never in a tooltip: a projected
    statement that reads like a historical one is the expensive failure here,
    because the figures are entirely plausible.
    """
    inc = provenance['income_rate_year_1'] * 100
    exp = provenance['expense_rate_year_1'] * 100
    multi_income = len(provenance.get('income_steps') or []) > 1
    multi_expense = len(provenance.get('expense_steps') or []) > 1
    inc_txt = f'income +{inc:.1f}%' + (' stepped' if multi_income else '')
    exp_txt = f'expenses +{exp:.1f}%' + (' stepped' if multi_expense else '')
    years = int(provenance['years'])
    growth_years = int(provenance.get('growth_years', years - 1))
    # The base label repeats the property name the title already carries.
    base = re.sub(r'^.*\s+—\s+', '', base_scenario_label).strip() or base_scenario_label
    if growth_years <= 0:
        # Year 1 = today's run rate (D-2026-09-22-YEAR1): nothing is grown,
        # and the note says so rather than quoting rates that were not applied.
        return (
            f'Year 1 is the current run rate from the {base}, with no growth '
            f'applied; growth ({inc_txt}, {exp_txt} a year) starts in Year 2.'
        )
    horizon = '1 year' if growth_years == 1 else f'{growth_years} years'
    return (
        f'Year 1 is the current run rate from the {base}; this is {horizon} of '
        f'growth on it, at {inc_txt} and {exp_txt} a year. Not actuals.'
    )
