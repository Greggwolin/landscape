"""Schedule view specification — the shape every schedule artifact renders from.

Budget artifact slice 1 (chat EB, 2026-07-31), built from the settled design:
``BUDGET-ARTIFACT-SPEC-2026-07-31.html`` (written) and
``BUDGET-ARTIFACT-MOCKUP-2026-07-31.html`` rev 9 (drawn, authoritative where the
two differ).

THE ONE IDEA
------------
An artifact is never a bespoke rendering. It is always **one topic + one view
specification**. Chat writes the specification; the badge row displays it and
lets the user tune it; both go through the same path. Get the specification
right once and every other topic inherits it — sales, cash flow, rent roll,
capitalization — with no new patterns to invent.

The eight knobs:

===========  ==================================================================
scope        Which branch of the hierarchy, addressed by LEVEL (never by name).
filter       Which rows, by attribute (category, stage, ...).
window       Which slice of time (periods, by overlap).
basis        Which dollars. Today's dollars always win by default.
detail       How many columns — summary / standard / detail / all.
grouping     What rolls up to what.
sort         Row order.
predicate    Row-level tests (non-zero only, above a threshold, ...).
===========  ==================================================================

"AREA" AND "PHASE" ARE NOT REAL WORDS
-------------------------------------
They are what one project happens to call its levels. The hierarchy is three
optional, user-named levels set at project setup. Every label rendered on screen
— column headers, chips, titles — is read from ``tbl_project_config``
(``tier_1_label`` / ``tier_2_label`` / ``tier_3_label``), and a level that is
switched off or has only one member never produces a column. Hard-coding a level
name is a defect, not a shortcut. This is the single most likely place for the
design to fail on the second project, which is why the resolution lives here and
nowhere else. Verified against project 9, whose level-1 label is **"Village"**
even though its members are *named* "Area 1".."Area 4" — precisely the trap.

WHAT THIS MODULE DOES AND DOES NOT DO
-------------------------------------
It emits the full row set plus the knob metadata. The renderer applies the knobs
client-side, because every knob on a schedule is plain arithmetic over the
visible rows (sum, percent, count) — which is the one kind of recalculation the
design permits on screen. Anything the calculation engine owns (cash flow, NPV,
returns) is never re-implemented here or in the renderer; it comes from the
engine or it waits.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# The four detail rungs. "napkin / standard / detail" from a year ago, brought
# back as a property of the view rather than a mode the whole app sits in.
RUNGS = ('summary', 'standard', 'detail', 'all')

_DEFAULT_TIER_LABELS = {1: 'Level 1', 2: 'Level 2', 3: 'Level 3'}


def _num(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None



_LEADING_WORDS = re.compile(r'^[A-Za-z][A-Za-z\s&/\-]*?\s*(?=[\d])')


def _member_number(display_name: Optional[str], code: Optional[str],
                   division_id: int) -> str:
    """The member's identifier, with any baked-in level name removed.

    ``Area 1`` -> ``1`` · ``Parcel 1.101`` -> ``1.101`` · ``1.1`` -> ``1.1``

    A name with no digits at all is a genuine name rather than a numbered
    member (someone called a village "Riverbend"), and is returned untouched.
    """
    raw = (display_name or '').strip()
    if raw:
        stripped = _LEADING_WORDS.sub('', raw).strip()
        return stripped or raw
    return (code or f'#{division_id}').strip()


def fetch_project_levels(project_id: int) -> List[Dict[str, Any]]:
    """Read the project's own level names and members.

    Returns one entry per ENABLED level that actually has members, in tier
    order::

        [{'level': 1, 'label': 'Village',
          'members': [{'id': 624, 'label': 'Area 1', 'parent_id': None}, ...]}]

    A level switched off in project configuration, or with no members, is
    omitted entirely — so it can never produce a chip row or a column.
    """
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT tier_1_label, tier_2_label, tier_3_label,
                   level1_enabled, level2_enabled, level3_enabled
            FROM landscape.tbl_project_config
            WHERE project_id = %s
            """,
            [project_id],
        )
        cfg = cursor.fetchone()

        cursor.execute(
            """
            SELECT division_id, tier, display_name, division_code,
                   parent_division_id, sort_order
            FROM landscape.tbl_division
            WHERE project_id = %s AND COALESCE(is_active, TRUE)
            ORDER BY tier, COALESCE(sort_order, 0), division_id
            """,
            [project_id],
        )
        divisions = [
            {
                'id': row[0],
                'tier': row[1],
                # A member is a NUMBER. Its name is composed at render time from
                # the level's own label plus that number, which is what makes
                # renaming a level in project setup rename every member with it.
                #
                # `display_name` cannot be trusted for this: it holds a string
                # baked when the row was created, so project 9's level-1 members
                # read "Area 1".."Area 4" under a level the user has since named
                # "Village", and its level-3 members read "Parcel 1.101" under a
                # level already called Parcel. Level 2 escaped only because its
                # stored value happens to be the bare number. Strip any leading
                # words and keep the identifier.
                'label': _member_number(row[2], row[3], row[0]),
                'parent_id': row[4],
            }
            for row in cursor.fetchall()
        ]

    labels = dict(_DEFAULT_TIER_LABELS)
    enabled = {1: True, 2: True, 3: True}
    if cfg:
        for idx, tier in enumerate((1, 2, 3)):
            if cfg[idx]:
                labels[tier] = cfg[idx]
            # NULL is treated as enabled — the column is nullable and older
            # projects predate it. Only an explicit False switches a level off.
            enabled[tier] = cfg[3 + idx] is not False

    levels: List[Dict[str, Any]] = []
    for tier in (1, 2, 3):
        if not enabled[tier]:
            continue
        members = [
            {'id': d['id'], 'label': d['label'], 'parent_id': d['parent_id']}
            for d in divisions
            if d['tier'] == tier
        ]
        if not members:
            continue
        levels.append({'level': tier, 'label': labels[tier], 'members': members})
    return levels


def build_ancestor_index(levels: List[Dict[str, Any]]) -> Dict[int, Dict[int, int]]:
    """division_id → {level: ancestor division_id at that level}.

    A budget line hangs off ONE division, which may sit at any tier. Scope is
    addressed by level, so each row needs to know which member of every level it
    belongs to — including the levels above the one it hangs from.
    """
    parent_of: Dict[int, Optional[int]] = {}
    tier_of: Dict[int, int] = {}
    for level in levels:
        for member in level['members']:
            parent_of[member['id']] = member['parent_id']
            tier_of[member['id']] = level['level']

    index: Dict[int, Dict[int, int]] = {}
    for division_id in tier_of:
        chain: Dict[int, int] = {}
        cursor_id: Optional[int] = division_id
        seen = set()
        while cursor_id is not None and cursor_id not in seen:
            seen.add(cursor_id)
            tier = tier_of.get(cursor_id)
            if tier is None:
                break
            chain[tier] = cursor_id
            cursor_id = parent_of.get(cursor_id)
        index[division_id] = chain
    return index


def build_budget_view_config(
    *,
    project_id: int,
    project_name: Optional[str],
    records: List[Dict[str, Any]],
    total_budget: float,
    lot_count: Optional[int],
    levels: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Build the budget artifact's view specification.

    Emits the full row set plus the knob metadata; the renderer applies the
    knobs. Numbers are raw — formatting (thousands separators, parentheses for
    negatives, em-dash for zero) belongs to the renderer, so a number can never
    arrive pre-formatted and become unfilterable.
    """
    ancestors = build_ancestor_index(levels)
    level_numbers = [lvl['level'] for lvl in levels]

    rows: List[Dict[str, Any]] = []
    for idx, record in enumerate(records, start=1):
        division_id = record.get('division_id')
        chain = ancestors.get(division_id, {}) if division_id else {}
        qty = _num(record.get('qty'))
        rate = _num(record.get('rate'))
        amount = _num(record.get('amount'))
        uom = record.get('uom_code') or ''
        rows.append({
            # Same id the block schema uses, so the editing spine can map a
            # rendered cell back to its source row when slice 2 lands.
            'id': f'b{idx}',
            'scope': {str(level): chain[level] for level in level_numbers
                      if level in chain},
            'cells': {
                'category': record.get('category_name'),
                'stage': record.get('activity'),
                'description': record.get('notes'),
                'uom': uom,
                'rate': rate,
                'amount': amount,
                'start': record.get('start_period'),
                'duration': record.get('periods_to_complete'),
                # The Notes field (decision 4a). Description names the line;
                # Notes records WHY. Stored in the long-existing but never
                # populated internal-memo column — see the builder's note.
                'notes': record.get('internal_memo'),
            },
            # Double-clicking an amount opens this instead of merely refusing.
            # The quantity columns were removed from the table entirely in
            # rev 4; the quantity lives here, where it is actually wanted.
            'derivation': {
                'quantity': qty,
                'uom': uom,
                'rate': rate,
                'total': amount,
                # No evidence is recorded on any budget line in the database
                # today (the value-source column is empty across every row), so
                # this is null rather than a plausible-looking tag.
                'basis': None,
            },
            # The cells this surface OFFERS for editing. Slice 1 carried
            # ['rate', 'uom'] because that was all the block schema had refs
            # for; leaving it there through slice 2 made it a lie.
            #
            # It is now a CONTRACT, not a hint: the renderer compares this list
            # against the per-cell refs on the stored block schema, and if the
            # stored artifact cannot back every one of them it declines to offer
            # editing at all rather than rendering half a table as writable.
            # `qty` is offered in the derivation popover rather than as a
            # column, but it is offered, so it belongs here.
            'editable': ['uom', 'rate', 'start', 'duration', 'notes', 'qty'],
        })

    # Columns. Fourteen do not fit a side panel, so which appear is decided by
    # the detail rung plus the disclosure rule the renderer applies (a column
    # earns its place when it VARIES across the visible rows; anything constant
    # becomes part of the title instead).
    columns = [
        {'key': 'category', 'label': 'Category', 'align': 'left', 'kind': 'picklist'},
        {'key': 'stage', 'label': 'Stage', 'align': 'left', 'kind': 'picklist'},
        {'key': 'description', 'label': 'Description', 'align': 'left', 'kind': 'text'},
        {'key': 'uom', 'label': 'UOM', 'align': 'center', 'kind': 'picklist'},
        {'key': 'rate', 'label': 'Rate', 'align': 'right', 'kind': 'number'},
        {'key': 'amount', 'label': 'Amount', 'align': 'right', 'kind': 'computed'},
        {'key': 'start', 'label': 'Start', 'align': 'center', 'kind': 'number'},
        {'key': 'duration', 'label': 'Dur', 'align': 'center', 'kind': 'number'},
        {'key': 'notes', 'label': 'Notes', 'align': 'left', 'kind': 'text'},
    ]

    # The detail ladder. Same four rungs on every topic; only the column lists
    # differ.
    rung_columns = {
        'summary': ['group', 'amount', 'pct'],
        'standard': ['category', 'description', 'uom', 'rate', 'amount'],
        'detail': ['description', 'uom', 'rate', 'amount', 'start', 'duration'],
        'all': ['category', 'stage', 'description', 'uom', 'rate', 'amount',
                'start', 'duration', 'notes'],
    }

    # Optional columns ride behind removable chips above the table — the answer
    # to "column picker". A chip whose column has no data anywhere is offered
    # but disabled, with the reason on it: better than silently omitting the
    # mechanism, and it cannot invent a value.
    has_stage = any(r['cells']['stage'] for r in rows)
    has_notes = any(r['cells']['notes'] for r in rows)
    optional_columns = [
        {'key': 'stage', 'label': 'Stage', 'available': has_stage,
         'reason': None if has_stage
                   else 'No stage recorded on these lines'},
        {'key': 'notes', 'label': 'Notes', 'available': True,
         'reason': None if has_notes
                   else 'No notes recorded yet — the column is empty until one is written'},
        {'key': 'escalated', 'label': 'Escalated', 'available': False,
         'reason': 'Line-item budgets are shown in today’s dollars. '
                   'The inflated view comes from the cash flow, not from here.'},
        {'key': 'evidence', 'label': 'Evidence', 'available': False,
         'reason': 'No evidence source is recorded on any budget line yet'},
    ]

    return {
        'topic': 'budget',
        'kicker': f'{project_name} · Costs' if project_name else 'Costs',
        'title': 'Development budget',
        'source_label': 'development budget',
        # Exactly one binding chip, always visible: this is how you know at a
        # glance whether you are looking at the model or at a sandbox.
        'binding': {'state': 'live', 'label': 'live'},
        # Today's dollars always win by default (decision 2, 31 July).
        'basis': {'value': 'nominal', 'label': "today's dollars"},
        'levels': levels,
        'columns': columns,
        'rung_columns': rung_columns,
        'default_rung': 'summary',          # "show me the budget" opens at Summary
        'default_grouping': 'category',
        'group_options': [
            {'value': 'category', 'label': 'category'},
            {'value': 'stage', 'label': 'stage', 'available': has_stage},
            {'value': 'none', 'label': 'none'},
        ],
        'optional_columns': optional_columns,
        'rows': rows,
        # Denominators the renderer may divide by. Lot count is the project's
        # total; it is deliberately NOT offered per level, because parcels are
        # not linked to divisions in the data — a scoped cost-per-lot would need
        # a denominator we do not have, and a plausible one is worse than none.
        'denominators': {'lots': lot_count, 'lots_scope': 'project'},
        'totals': {'amount': round(total_budget)},
        'row_count': len(rows),
        # Panel width truncates; expand shows everything.
        'truncate_at': 12,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'project_id': project_id,
    }
