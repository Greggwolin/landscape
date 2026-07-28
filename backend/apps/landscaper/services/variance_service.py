"""Variance service — the knowledge engine checking a number against what the
firm already knows (Commit · Impact · Variance reference, §3).

Slice 1 covers BUDGET LINE RATES, the case the reference names verbatim:

    "This sewer $/FF is 40% above your other Maricopa projects."

Two reference points are specified in the design. Only ONE of them is usable
against real data today, and this module is explicit about that rather than
fabricating the other:

  1. CROSS-PROJECT PEERS — REAL. ``core_fin_fact_budget`` carries ``rate`` +
     ``uom_code`` + ``category_id`` per line and ``tbl_project`` carries the
     geography. Verified on live data: Maricopa / ``$/FF`` / category 31 spans
     11 projects, $250–$500. This is the comparison implemented here.

  2. FIRM BENCHMARK LIBRARY — NOT USABLE for budget rates yet. The cost library
     (``core_unit_cost_item``) keys on a DIFFERENT category space than the budget
     facts (library 2/3/5/6/7/20/22 vs budget 31/37/43/44) and its
     ``typical_low/mid/high_value`` columns are NULL across the board. Rather
     than invent a benchmark, every finding carries an explicit
     ``library_reference`` of ``None`` with a reason. Wiring the library leg is a
     separate slice that starts with reconciling those two category spaces.

Design notes:
  * READ-ONLY. This service never writes. It reports; the user decides. Per the
    reference, a variance alert "is a question, not a block by default."
  * MEDIAN, not mean — one $500 outlier in the peer set must not drag the
    reference point toward the outlier it is supposed to catch.
  * PEER SCOPE LADDER — county, then market, then state. The scope actually used
    is returned with every finding, because "your other Maricopa deals" and "your
    other Arizona deals" are different claims and the user must be able to tell
    them apart.
  * COUNTY NORMALIZATION is required: live data holds both "Maricopa" and
    "Maricopa County" for the same county.
  * THRESHOLDS are module constants. The firm-admin aggressiveness control
    (reference §4: off / threshold / always, plus the blocker limit) is a later
    slice; these defaults stand in for it and are overridable per call so the
    control can be wired without touching this logic.
"""

from __future__ import annotations

import logging
import re
from statistics import median
from typing import Any, Dict, List, Optional, Tuple

from django.db import connection

logger = logging.getLogger(__name__)

# Firm-admin stand-ins (reference §4). Surfaced in the response so the artifact
# can state the thresholds it applied rather than implying a universal rule.
DEFAULT_REVIEW_PCT = 25.0    # flag for review beyond this divergence
DEFAULT_BLOCKER_PCT = 50.0   # "needs a decision" — the docket-blocker candidate
MIN_PEER_PROJECTS = 2        # below this there is no peer set worth quoting

_COUNTY_SUFFIX_RE = re.compile(r'\s+county\s*$', re.I)


def normalize_county(value: Optional[str]) -> Optional[str]:
    """"Maricopa County" and " maricopa " both resolve to "maricopa".

    Live data carries both forms for the same county; without this the peer set
    silently splits in two and the comparison quietly loses half its evidence.
    """
    if not value:
        return None
    cleaned = _COUNTY_SUFFIX_RE.sub('', str(value)).strip().lower()
    return cleaned or None


def _pct_diff(value: float, reference: float) -> Optional[float]:
    if reference in (None, 0):
        return None
    return (value - reference) / reference * 100.0


def _severity(pct: Optional[float], review_pct: float, blocker_pct: float) -> Optional[str]:
    """'blocker' | 'review' | None (within tolerance)."""
    if pct is None:
        return None
    magnitude = abs(pct)
    if magnitude >= blocker_pct:
        return 'blocker'
    if magnitude >= review_pct:
        return 'review'
    return None


def _fetch_subject_lines(project_id: int) -> List[Dict[str, Any]]:
    """The project's own budget lines that carry a comparable unit rate."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT f.fact_id, f.category_id, c.category_name, f.uom_code,
                   f.rate, f.amount, f.notes
            FROM landscape.core_fin_fact_budget f
            LEFT JOIN landscape.core_unit_cost_category c
                ON f.category_id = c.category_id
            WHERE f.project_id = %s
              AND f.rate IS NOT NULL AND f.rate > 0
              AND f.uom_code IS NOT NULL
              AND f.category_id IS NOT NULL
            ORDER BY c.account_level, c.sort_order, f.fact_id
            """,
            [project_id],
        )
        cols = [c[0] for c in cursor.description]
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()]
    for r in rows:
        for k in ('rate', 'amount'):
            if r.get(k) is not None:
                r[k] = float(r[k])
    return rows


def _fetch_project_geography(project_id: int) -> Dict[str, Optional[str]]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT project_name, county, market, state
            FROM landscape.tbl_project WHERE project_id = %s
            """,
            [project_id],
        )
        row = cursor.fetchone()
    if not row:
        return {'project_name': None, 'county': None, 'market': None, 'state': None}
    return {
        'project_name': row[0], 'county': row[1], 'market': row[2], 'state': row[3],
    }


def _fetch_peer_rates(project_id: int, geo: Dict[str, Optional[str]]) -> List[Dict[str, Any]]:
    """Every OTHER project's rated budget lines, with geography attached.

    THREE exclusions, all of them load-bearing — verified against live data
    2026-07-27, where skipping them produced a false comparison:

      * ``is_active`` / ``deleted_at`` — archived and soft-deleted projects are
        not deals the user would compare against.
      * SAME PROJECT NAME — a saved copy of the deal is not an independent
        comparable. Live data holds ten "Peoria Meadows" rows (ids 152-159, 161,
        1014) alongside the real one; without this guard the review quotes the
        deal against clones of itself and reports a fabricated peer spread.

    One query; the scope ladder is applied in Python so a single pass can answer
    county / market / state without three round trips.
    """
    subject_name = (geo.get('project_name') or '').strip().lower()
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT f.project_id, p.project_name, p.county, p.market, p.state,
                   f.category_id, f.uom_code, f.rate
            FROM landscape.core_fin_fact_budget f
            JOIN landscape.tbl_project p ON p.project_id = f.project_id
            WHERE f.project_id <> %s
              AND p.is_active IS TRUE
              AND p.deleted_at IS NULL
              AND LOWER(TRIM(COALESCE(p.project_name, ''))) <> %s
              AND f.rate IS NOT NULL AND f.rate > 0
              AND f.uom_code IS NOT NULL
              AND f.category_id IS NOT NULL
            """,
            [project_id, subject_name],
        )
        cols = [c[0] for c in cursor.description]
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()]
    for r in rows:
        r['rate'] = float(r['rate'])
        r['_county_key'] = normalize_county(r.get('county'))
    return rows


def _peer_set(
    peers: List[Dict[str, Any]],
    *,
    category_id: Any,
    uom_code: str,
    geo: Dict[str, Optional[str]],
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """Peers matching category + unit of measure, at the tightest geography that
    clears MIN_PEER_PROJECTS. Returns (peers, scope_label)."""
    same_line = [
        p for p in peers
        if p.get('category_id') == category_id and p.get('uom_code') == uom_code
    ]
    if not same_line:
        return [], None

    county_key = normalize_county(geo.get('county'))
    market = (geo.get('market') or '').strip().lower() or None
    state = (geo.get('state') or '').strip().upper() or None

    ladder: List[Tuple[str, List[Dict[str, Any]]]] = []
    if county_key:
        ladder.append((
            f"{(geo.get('county') or '').strip()} County".replace(' County County', ' County'),
            [p for p in same_line if p.get('_county_key') == county_key],
        ))
    if market:
        ladder.append((
            (geo.get('market') or '').strip(),
            [p for p in same_line if (p.get('market') or '').strip().lower() == market],
        ))
    if state:
        ladder.append((
            state,
            [p for p in same_line if (p.get('state') or '').strip().upper() == state],
        ))

    for label, candidates in ladder:
        if len({p['project_id'] for p in candidates}) >= MIN_PEER_PROJECTS:
            return candidates, label
    return [], None


def _library_reference(category_id: Any, uom_code: str) -> Dict[str, Any]:
    """Firm cost-library reference for this (category, unit) pair.

    Returns ``{'available': False, 'reason': ...}`` when the library has nothing
    usable — which is the case across the board today. NEVER returns a
    substituted or inferred value: a missing benchmark is a fact to report, not
    a gap to fill (§15.6 / no autonomous value inference).
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT item_name, typical_low_value, typical_mid_value, typical_high_value
                FROM landscape.core_unit_cost_item
                WHERE category_id = %s AND default_uom_code = %s
                  AND is_active AND typical_mid_value IS NOT NULL
                ORDER BY usage_count DESC NULLS LAST
                LIMIT 1
                """,
                [category_id, uom_code],
            )
            row = cursor.fetchone()
    except Exception:  # noqa: BLE001 — a library miss must never fail the review
        logger.exception('variance_service: cost-library lookup failed')
        return {'available': False, 'reason': 'cost library unavailable'}

    if not row:
        return {
            'available': False,
            'reason': 'no firm cost-library entry for this category and unit',
        }
    return {
        'available': True,
        'item_name': row[0],
        'low': float(row[1]) if row[1] is not None else None,
        'mid': float(row[2]),
        'high': float(row[3]) if row[3] is not None else None,
    }


def check_budget_variance(
    project_id: int,
    *,
    review_pct: float = DEFAULT_REVIEW_PCT,
    blocker_pct: float = DEFAULT_BLOCKER_PCT,
) -> Dict[str, Any]:
    """Compare every rated budget line against the firm's other deals.

    Returns::

        {
          'project_name': str|None,
          'lines_checked': int,
          'lines_compared': int,        # had a usable peer set
          'findings': [ {...} ],        # only lines beyond review_pct
          'blocker_count': int,
          'review_count': int,
          'library_coverage': int,      # findings with a real library reference
          'thresholds': {'review_pct':…, 'blocker_pct':…, 'min_peer_projects':…},
        }

    A line with no peer set is NOT a finding — silence there means "nothing to
    compare against," never "this is fine."
    """
    geo = _fetch_project_geography(project_id)
    subject = _fetch_subject_lines(project_id)
    if not subject:
        return {
            'project_name': geo.get('project_name'),
            'lines_checked': 0, 'lines_compared': 0, 'findings': [],
            'blocker_count': 0, 'review_count': 0, 'library_coverage': 0,
            'thresholds': {
                'review_pct': review_pct, 'blocker_pct': blocker_pct,
                'min_peer_projects': MIN_PEER_PROJECTS,
            },
        }

    peers = _fetch_peer_rates(project_id, geo)

    findings: List[Dict[str, Any]] = []
    compared = 0

    for line in subject:
        peer_rows, scope = _peer_set(
            peers,
            category_id=line.get('category_id'),
            uom_code=line.get('uom_code'),
            geo=geo,
        )
        if not peer_rows:
            continue
        compared += 1

        rates = [p['rate'] for p in peer_rows]
        peer_median = median(rates)
        pct = _pct_diff(line['rate'], peer_median)
        severity = _severity(pct, review_pct, blocker_pct)
        if severity is None:
            continue

        findings.append({
            'fact_id': line.get('fact_id'),
            'category_id': line.get('category_id'),
            'category_name': line.get('category_name') or '(uncategorized)',
            'description': line.get('notes') or '(no description)',
            'uom_code': line.get('uom_code'),
            'rate': line['rate'],
            'amount': line.get('amount'),
            'peer_median': peer_median,
            'peer_low': min(rates),
            'peer_high': max(rates),
            'peer_projects': len({p['project_id'] for p in peer_rows}),
            'peer_scope': scope,
            'pct_diff': round(pct, 1) if pct is not None else None,
            'direction': 'above' if (pct or 0) > 0 else 'below',
            'severity': severity,
            'library_reference': _library_reference(
                line.get('category_id'), line.get('uom_code'),
            ),
        })

    findings.sort(key=lambda f: abs(f.get('pct_diff') or 0), reverse=True)

    return {
        'project_name': geo.get('project_name'),
        'lines_checked': len(subject),
        'lines_compared': compared,
        'findings': findings,
        'blocker_count': sum(1 for f in findings if f['severity'] == 'blocker'),
        'review_count': sum(1 for f in findings if f['severity'] == 'review'),
        'library_coverage': sum(
            1 for f in findings if (f.get('library_reference') or {}).get('available')
        ),
        'thresholds': {
            'review_pct': review_pct, 'blocker_pct': blocker_pct,
            'min_peer_projects': MIN_PEER_PROJECTS,
        },
    }


def headline_finding(result: Dict[str, Any]) -> Optional[str]:
    """The single plain sentence for chat — the biggest divergence, or None.

    Deterministic text built from the numbers; the model announces it, it does
    not compose it.
    """
    findings = result.get('findings') or []
    if not findings:
        return None
    top = findings[0]
    return (
        f"{top['category_name']} at {top['rate']:,.0f} {top['uom_code']} is "
        f"{abs(top['pct_diff']):.0f}% {top['direction']} the median of your "
        f"{top['peer_projects']} other {top['peer_scope']} deals "
        f"({top['peer_low']:,.0f}–{top['peer_high']:,.0f})."
    )
