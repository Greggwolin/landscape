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

# What the budget surface OFFERS for editing, as a named contract rather than a
# list buried in a row dict.
#
# It must equal budget_artifact_builder._EDITABLE_BUDGET_COLUMNS -- the builder
# emits a cell_source_ref for exactly those keys, and the renderer refuses to
# offer editing at all unless the stored refs cover everything offered here. The
# frontend carries the same list as BUDGET_EDITABLE_CELLS in
# src/components/wrapper/budgetCellTarget.ts (it cannot read either of these).
# All three change together; the first two are asserted equal in
# test_budget_cell_mapping.py.
#
# `amount` is absent and always will be -- the trigger owns it. Contingency is
# absent because no engine reads it (slice 2b decision).
BUDGET_OFFERED_CELLS = (
    'uom', 'rate', 'start', 'duration', 'notes', 'qty',
    'division', 'stage', 'category', 'description',
    'vendor', 'timing_method', 'start_date', 'end_date',
    'curve_profile', 'curve_steepness',
    'escalation', 'escalation_method',
)

# The four detail rungs. "napkin / standard / detail" from a year ago, brought
# back as a property of the view rather than a mode the whole app sits in.
RUNGS = ('summary', 'standard', 'detail', 'all')

# ── The view specification's own version ────────────────────────────────────
#
# A budget artifact STORES the specification it was built with. That is
# deliberate — it is what makes an artifact a durable snapshot rather than a
# live query — but it has a consequence nobody had accounted for: change how the
# schedule is built and the change is invisible on every artifact that already
# exists, forever, because nothing rebuilds them.
#
# That is not hypothetical. It happened twice in one day on 2026-08-24. Gregg
# reported "I don't see 17 field choices" — his artifact carried the column set
# from before slice 2b-2. Hours later a unit-of-measure label fix could not be
# demonstrated in a browser for exactly the same reason. Re-asking does not help:
# the model sees the artifact is already open and skips the tool, so the one
# gesture a person would reach for is the one that does nothing.
#
# BUMP THIS whenever build_budget_view_config changes shape in a way a person
# would see — a column added or removed, an option list relabelled, a rung
# altered, a knob added. The artifact read path (backend/apps/artifacts/views.py,
# _rebuild_if_view_spec_stale) compares this number against the stored one and
# rebuilds the artifact before serving it, so opening the budget is enough. Do
# not bump it for a change that only affects VALUES — those already refresh.
#
#   1 — slice 1: the view specification itself (2026-07-31)
#   2 — slice 2b-2: nineteen columns, thirteen chips, the `all` rung (2026-08-21)
#   3 — unit-of-measure labels are the bare code, not "LF — Linear Feet"
#       (2026-08-24, Gregg: "just the short name")
#   4 — start and end dates derive from the period integers when they were
#       never typed (2026-08-24, Gregg: "if the start and end periods are
#       entered, then the start and end dates should be autocalculated")
#   5 — "CF start" removed from the schedule (2026-08-24, Gregg chose 4a). The
#       column comment says "Marks cash flow beginning". NOTHING READS IT — not
#       the cash-flow service, not the calculations app, not the financial
#       engine — and it is false on all 366 budget lines. It rendered as a
#       checkbox on every row of the widest view, taking width from columns that
#       carry something. The database column stays; only the schedule stops
#       offering it. Restoring it means re-adding the column, the rung entry,
#       the chip and the cell together, and giving it something that reads it.
BUDGET_VIEW_SPEC_VERSION = 5


def _period_zero(project_id: int):
    """The calendar month that budget period 1 lands in, or None.

    Periods on a budget line are MONTHS counted from the project's analysis
    start — the same anchor the land-development cash flow uses
    (land_dev_cashflow_service._get_project_config).

    RETURNS None WHEN THE PROJECT HAS NO ANALYSIS START DATE, and that is the
    whole point of this function existing separately. The cash-flow service
    defaults a missing anchor to 1 January 2025 so it can still produce a
    schedule. Doing that HERE would print a specific calendar date next to a
    line item, on screen, that nobody chose — a fabricated date is worse than an
    empty cell, and Peoria has an anchor while Lynn Villa does not.
    """
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT analysis_start_date FROM landscape.tbl_project '
                'WHERE project_id = %s', [project_id])
            row = cursor.fetchone()
        return row[0] if row and row[0] else None
    except Exception:  # noqa: BLE001
        logger.exception('budget view: analysis start date unavailable')
        return None


def _add_months(anchor, months: int):
    """Anchor plus N whole months, clamped to the end of a short month."""
    import calendar
    total = anchor.month - 1 + months
    year = anchor.year + total // 12
    month = total % 12 + 1
    day = min(anchor.day, calendar.monthrange(year, month)[1])
    return anchor.replace(year=year, month=month, day=day)


def _derived_dates(record: Dict[str, Any], period_zero):
    """(start_date, end_date, which of them were derived).

    Gregg, 2026-08-24: "if the start and end periods are entered, then the start
    and end dates should be autocalculated." 324 of 366 live budget lines carry
    a start period and a duration; only 36 carry dates. The date columns were
    therefore empty on nearly every row while the information to fill them sat
    two columns to the left.

    THREE RULES, IN ORDER.

    1. A TYPED DATE ALWAYS WINS. If someone entered a date it is the answer, and
       nothing here recomputes it. Derivation fills a hole; it does not overrule
       a person.
    2. NO ANCHOR, NO DATE. Without the project's analysis start date there is no
       way to know what month period 1 is, so the cell stays empty. It is not
       filled with a guess and it is not filled with today.
    3. THE DERIVED VALUE IS MARKED. The row carries which cells were computed,
       so the renderer can show them as derived rather than typed — the same
       treatment a followed escalation rate already gets. A computed value
       presented as an entered one is the silent-inference failure this codebase
       has a standing rule against.

    Period 1 is the anchor month itself, so period N starts N-1 months later.
    The end date is the last day of the final period's month: a line running
    periods 3 to 5 finishes at the end of period 5, not at its start.
    """
    import calendar
    typed_start = _date_str(record.get('start_date'))
    typed_end = _date_str(record.get('end_date'))
    derived: List[str] = []
    if period_zero is None:
        return typed_start, typed_end, derived

    start_period = record.get('start_period')
    end_period = record.get('end_period')
    if end_period is None and start_period is not None:
        duration = record.get('periods_to_complete')
        if duration is not None:
            try:
                end_period = int(start_period) + int(duration) - 1
            except (TypeError, ValueError):
                end_period = None

    start_out, end_out = typed_start, typed_end
    if not typed_start and start_period is not None:
        try:
            start_out = _add_months(
                period_zero, int(start_period) - 1).isoformat()
            derived.append('start_date')
        except (TypeError, ValueError):
            pass
    if not typed_end and end_period is not None:
        try:
            last = _add_months(period_zero, int(end_period) - 1)
            end_out = last.replace(
                day=calendar.monthrange(last.year, last.month)[1]).isoformat()
            derived.append('end_date')
        except (TypeError, ValueError):
            pass
    return start_out, end_out, derived

_DEFAULT_TIER_LABELS = {1: 'Level 1', 2: 'Level 2', 3: 'Level 3'}


def _num(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None



_LEADING_WORDS = re.compile(r'^[A-Za-z][A-Za-z\s&/\-]*?\s*(?=[\d])')


def _date_str(value: Any) -> Optional[str]:
    """A date as an ISO day string, or None. Never a datetime repr."""
    if value is None:
        return None
    return value.isoformat()[:10] if hasattr(value, 'isoformat') else str(value)[:10]


def _escalation_ref(record: Dict[str, Any],
                    sets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Which half of a line's escalation is authoritative.

    EXACTLY ONE of the two, never both. A line either FOLLOWS a named rate set
    -- ``growth_rate_set_id`` populated, ``escalation_rate`` a derived cache of
    that set's current rate, kept only because the cash-flow engine reads a
    scalar -- or it CARRIES ITS OWN rate, in which case the reference is
    cleared. Clearing is what stops the two drifting into disagreeing: the label
    can never go on naming a set whose rate the line no longer uses.

    ``mode`` is 'followed' | 'override' | 'none'.
    """
    set_id = record.get('growth_rate_set_id')
    rate = _num(record.get('escalation_rate'))
    if set_id is not None:
        match = next((x for x in sets if x['value'] == set_id), None)
        return {
            'mode': 'followed',
            'set_id': set_id,
            'set_name': (match or {}).get('label') or f'Rate set {set_id}',
            # Shown as DERIVED, not as something the user typed.
            'rate': rate if rate is not None else (match or {}).get('rate'),
            'usable': bool((match or {}).get('usable', True)),
        }
    if rate is not None:
        return {'mode': 'override', 'set_id': None, 'set_name': None,
                'rate': rate, 'usable': True}
    return {'mode': 'none', 'set_id': None, 'set_name': None,
            'rate': None, 'usable': True}


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

    # Every constrained cell's allowed values, read once. A cell whose list is
    # missing renders read-only rather than as free text into a foreign key.
    picklists = fetch_budget_picklists(project_id)
    escalation_sets = picklists.get('escalation_sets') or []
    # The month period 1 lands in. None when the project has no analysis start
    # date, which leaves every derived date empty rather than invented.
    period_zero = _period_zero(project_id)
    # "Division" is not a real word either -- the deepest configured level's
    # own label is. Falls back only when the project has no levels configured.
    division_label = (levels[-1]['label'] if levels else 'Division')

    rows: List[Dict[str, Any]] = []
    for idx, record in enumerate(records, start=1):
        division_id = record.get('division_id')
        chain = ancestors.get(division_id, {}) if division_id else {}
        qty = _num(record.get('qty'))
        rate = _num(record.get('rate'))
        amount = _num(record.get('amount'))
        uom = record.get('uom_code') or ''
        escalation_ref = _escalation_ref(record, escalation_sets)
        start_date_cell, end_date_cell, dates_derived = _derived_dates(
            record, period_zero)
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
                # ── Budget slice 2b ──
                'division': record.get('division_id'),
                'vendor': record.get('vendor_name'),
                'timing_method': record.get('timing_method'),
                # Dates derive from the period integers when they were never
                # typed — see _derived_dates. A typed date always wins.
                'start_date': start_date_cell,
                'end_date': end_date_cell,
                'curve_profile': record.get('curve_profile'),
                'curve_steepness': _num(record.get('curve_steepness')),
                # Escalation displays what the line POINTS AT when it follows a
                # set, and the typed number only when it does not. Exactly one
                # of the two is authoritative — see `escalation_ref` below.
                'escalation': (
                    escalation_ref['set_name'] if escalation_ref['mode'] == 'followed'
                    else escalation_ref['rate']
                ),
                'escalation_method': record.get('escalation_method'),
            },
            # Which of the two halves is authoritative on THIS line, so the
            # renderer can show a followed rate as derived rather than typed.
            'escalation_ref': escalation_ref,
            # Which date cells on this row were computed rather than typed, so
            # the renderer can mark them and the writer can tell them apart.
            'derived_cells': dates_derived,
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
            'editable': list(BUDGET_OFFERED_CELLS),
        })

    # Columns. Fourteen do not fit a side panel, so which appear is decided by
    # the detail rung plus the disclosure rule the renderer applies (a column
    # earns its place when it VARIES across the visible rows; anything constant
    # becomes part of the title instead).
    columns = [
        {'key': 'category', 'label': 'Category', 'align': 'left',
         'kind': 'picklist', 'options': picklists.get('category') or []},
        # Stage options are VALID_ACTIVITIES -- the writer's allowlist -- plus
        # any value the visible rows actually hold. 153 of 366 live lines carry
        # 'Development', which the writer would reject; appending it as a
        # legacy choice means opening such a line shows its real stage instead
        # of a blank dropdown that silently rewrites it on the next save.
        {'key': 'stage', 'label': 'Stage', 'align': 'left',
         'kind': 'picklist', 'options': _stage_options(picklists, records)},
        {'key': 'description', 'label': 'Description', 'align': 'left', 'kind': 'text'},
        {'key': 'uom', 'label': 'UOM', 'align': 'center',
         'kind': 'picklist', 'options': picklists.get('uom') or []},
        {'key': 'rate', 'label': 'Rate', 'align': 'right', 'kind': 'number'},
        {'key': 'amount', 'label': 'Amount', 'align': 'right', 'kind': 'computed'},
        {'key': 'start', 'label': 'Start', 'align': 'center', 'kind': 'number'},
        {'key': 'duration', 'label': 'Dur', 'align': 'center', 'kind': 'number'},
        {'key': 'notes', 'label': 'Notes', 'align': 'left', 'kind': 'text'},
        # ── Budget slice 2b ──
        {'key': 'division', 'label': division_label, 'align': 'left',
         'kind': 'picklist', 'options': picklists.get('division') or []},
        {'key': 'vendor', 'label': 'Vendor', 'align': 'left', 'kind': 'text'},
        {'key': 'timing_method', 'label': 'Timing', 'align': 'left',
         'kind': 'picklist', 'options': picklists.get('timing_method') or []},
        {'key': 'start_date', 'label': 'Start date', 'align': 'center', 'kind': 'date'},
        {'key': 'end_date', 'label': 'End date', 'align': 'center', 'kind': 'date'},
        {'key': 'curve_profile', 'label': 'Curve', 'align': 'left',
         'kind': 'picklist', 'options': picklists.get('curve_profile') or []},
        {'key': 'curve_steepness', 'label': 'Steep', 'align': 'right', 'kind': 'number'},
        {'key': 'escalation', 'label': 'Escalation', 'align': 'left',
         'kind': 'reference', 'options': picklists.get('escalation_sets') or []},
        {'key': 'escalation_method', 'label': 'Esc. when', 'align': 'left',
         'kind': 'picklist', 'options': picklists.get('escalation_method') or []},
    ]

    # The detail ladder. Same four rungs on every topic; only the column lists
    # differ.
    rung_columns = {
        'summary': ['group', 'amount', 'pct'],
        'standard': ['category', 'description', 'uom', 'rate', 'amount'],
        'detail': ['description', 'uom', 'rate', 'amount', 'start', 'duration'],
        # Slice 2b-2. `all` is the rung you use to BUILD a budget rather than
        # read one, so it carries the fields a line needs to exist -- division,
        # stage, category, description, uom, rate -- plus the timing and
        # scheduling refinements. Escalation stays out: the per-line control is
        # being replaced by a single budget-level rate, and putting it on screen
        # now would teach a gesture that is about to be withdrawn.
        'all': ['division', 'category', 'stage', 'description', 'uom', 'rate',
                'amount', 'start', 'duration', 'start_date', 'end_date',
                'timing_method', 'curve_profile', 'curve_steepness',
                'vendor', 'notes'],
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
        {'key': 'category', 'label': 'Category', 'available': True,
         'reason': None},
        {'key': 'notes', 'label': 'Notes', 'available': True,
         'reason': None if has_notes
                   else 'No notes recorded yet — the column is empty until one is written'},
        {'key': 'escalated', 'label': 'Escalated', 'available': False,
         'reason': 'Line-item budgets are shown in today’s dollars. '
                   'The inflated view comes from the cash flow, not from here.'},
        {'key': 'evidence', 'label': 'Evidence', 'available': False,
         'reason': 'No evidence source is recorded on any budget line yet'},
        # Slice 2b-2 -- reachable from any rung without moving to `all`.
        {'key': 'division', 'label': division_label, 'available': True,
         'reason': None},
        {'key': 'vendor', 'label': 'Vendor', 'available': True, 'reason': None},
        {'key': 'timing_method', 'label': 'Timing', 'available': True,
         'reason': None},
        {'key': 'start_date', 'label': 'Start date', 'available': True,
         'reason': None},
        {'key': 'end_date', 'label': 'End date', 'available': True,
         'reason': None},
        {'key': 'curve_profile', 'label': 'Curve', 'available': True,
         'reason': None},
        {'key': 'curve_steepness', 'label': 'Steep', 'available': True,
         'reason': None},
    ]

    return {
        'spec_version': BUDGET_VIEW_SPEC_VERSION,
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


# ─── Picklist sources (budget slice 2b) ──────────────────────────────────────
#
# Every constrained cell is fed from the table that constrains it. Free text
# into a foreign key earns a database rejection and nothing else, so the
# artifact carries the allowed values and the renderer offers them.
#
# These are READ here and ride on the view specification's columns, so the
# renderer needs no second round-trip and cannot drift from what the writer
# will accept.

# core_fin_fact_budget CHECK constraints, read from the live schema
# (core_fin_fact_budget_curve_profile_check / _escalation_method_check).
# Hard-coding them here is safe only because they are CHECKs: the database
# refuses anything else, so an out-of-date list fails loudly rather than
# silently writing a bad value.
_CURVE_PROFILES = ['standard', 'front_loaded', 'back_loaded']
_ESCALATION_METHODS = ['to_start', 'through_duration']

# timing_method has NO check constraint; these are the values actually in use
# (distributed 21 / curve 17 / end_loaded 9, measured 2026-08-19).
_TIMING_METHODS = ['distributed', 'curve', 'end_loaded']


def _opt(value, label=None):
    return {'value': value, 'label': label if label is not None else value}


def fetch_budget_picklists(project_id: int) -> Dict[str, Any]:
    """Every constrained cell's allowed values, for one project.

    Returns ``{column_key: [{value, label}, ...]}`` plus ``escalation_sets``,
    which carries more than a label because an escalation choice is a
    REFERENCE and the renderer has to show what it points at.

    Degrades per-list: one unreadable lookup costs that column its dropdown,
    not the artifact its render.
    """
    from django.db import connection

    out: Dict[str, Any] = {}

    # Stage. Only the values the application AND the database both accept --
    # they disagree on two of six (see WRITABLE_ACTIVITIES). A row whose stored
    # stage is outside that intersection gets its own value appended as a
    # legacy option by the caller, so opening a line shows what it really says
    # instead of a blank dropdown that rewrites it on the next save.
    try:
        from apps.artifacts.views import WRITABLE_ACTIVITIES
        out['stage'] = [_opt(a) for a in sorted(WRITABLE_ACTIVITIES)]
    except Exception:  # noqa: BLE001
        logger.exception('budget picklists: activities unavailable')

    out['timing_method'] = [_opt(v, v.replace('_', ' ').title()) for v in _TIMING_METHODS]
    out['curve_profile'] = [_opt(v, v.replace('_', ' ').title()) for v in _CURVE_PROFILES]
    out['escalation_method'] = [
        _opt('to_start', 'To start'),
        _opt('through_duration', 'Through duration'),
    ]

    with connection.cursor() as cursor:
        # Division — the project's OWN hierarchy. Labels come from the project
        # config, never from a hard-coded "Area / Phase / Parcel".
        try:
            cursor.execute(
                """
                SELECT d.division_id, d.display_name, d.division_code, d.tier
                FROM landscape.tbl_division d
                WHERE d.project_id = %s
                ORDER BY d.tier, d.division_code, d.division_id
                """, [project_id])
            out['division'] = [
                _opt(r[0], (r[1] or r[2] or f'Division {r[0]}'))
                for r in cursor.fetchall()
            ]
        except Exception:  # noqa: BLE001
            logger.exception('budget picklists: divisions unavailable')

        # Category. The modal narrows these by stage via the lifecycle junction;
        # the artifact carries the whole list plus each category's stages so the
        # renderer can narrow without another round-trip.
        try:
            cursor.execute(
                """
                SELECT c.category_id, c.category_name, c.parent_id,
                       COALESCE(array_agg(s.activity) FILTER (
                           WHERE s.activity IS NOT NULL), '{}')
                FROM landscape.core_unit_cost_category c
                LEFT JOIN landscape.core_category_lifecycle_stages s
                       ON s.category_id = c.category_id
                WHERE COALESCE(c.is_active, true)
                GROUP BY c.category_id, c.category_name, c.parent_id
                ORDER BY c.parent_id NULLS FIRST, c.category_name
                """)
            out['category'] = [
                {'value': r[0], 'label': r[1], 'parent_id': r[2],
                 'stages': list(r[3] or [])}
                for r in cursor.fetchall()
            ]
        except Exception:  # noqa: BLE001
            logger.exception('budget picklists: categories unavailable')

        # UOM — FK-constrained, active codes only.
        #
        # THE LABEL IS THE CODE, NOTHING ELSE. It used to read `LF — Linear
        # Feet`, and the renderer shows an option's label in the CELL as well as
        # in the dropdown (ScheduleArtifact: one label serves both), so every
        # row carried a sentence where a two-letter code belongs. Gregg,
        # 2026-08-24: "the UOM col doesnt need text descriptions of the UOMs.
        # just the short name."
        #
        # The description is not lost so much as unnecessary: these codes are
        # his own vocabulary — $/FF, $/Acre, LS, EA — and the only two that read
        # cryptically ($$$, "% of") are price expressions the UOM taxonomy
        # decision of 2026-08-21 retires anyway. Spending a display-label/
        # option-label split on codes that are being removed would be waste.
        try:
            cursor.execute(
                "SELECT uom_code FROM landscape.core_fin_uom "
                "WHERE is_active ORDER BY uom_code")
            out['uom'] = [_opt(r[0], r[0]) for r in cursor.fetchall()]
        except Exception:  # noqa: BLE001
            logger.exception('budget picklists: uom unavailable')

        # Escalation — the project's named rate sets. A set with more than one
        # STEP is a graduated schedule and cannot collapse to the single scalar
        # the cash-flow engine reads, so it is offered but marked unusable and
        # refused on write, with a reason, rather than silently flattened.
        try:
            cursor.execute(
                """
                SELECT s.set_id, s.set_name, s.card_type, s.is_default,
                       count(st.*) AS steps,
                       min(st.rate) FILTER (WHERE st.rate IS NOT NULL) AS rate
                FROM landscape.core_fin_growth_rate_sets s
                LEFT JOIN landscape.core_fin_growth_rate_steps st
                       ON st.set_id = s.set_id
                WHERE s.project_id = %s AND s.card_type = 'cost'
                GROUP BY s.set_id, s.set_name, s.card_type, s.is_default
                ORDER BY s.is_default DESC, s.set_name
                """, [project_id])
            out['escalation_sets'] = [
                {'value': r[0], 'label': r[1], 'card_type': r[2],
                 'is_default': bool(r[3]), 'steps': int(r[4] or 0),
                 'rate': _num(r[5]),
                 'usable': int(r[4] or 0) == 1}
                for r in cursor.fetchall()
            ]
        except Exception:  # noqa: BLE001
            logger.exception('budget picklists: escalation sets unavailable')

    return out


def _stage_options(picklists: Dict[str, Any],
                   records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """The writer's allowlist, plus whatever the rows actually hold.

    Three lists disagree about this vocabulary today (measured 2026-08-19):
    the backend's VALID_ACTIVITIES has six values including 'Planning &
    Engineering'; the frontend's LIFECYCLE_STAGES has five and omits it; and
    the live data uses only 'Development' (153 rows, absent from
    VALID_ACTIVITIES) and 'Planning & Engineering' (153 rows). Offering the
    allowlist alone would show 153 lines a dropdown that cannot represent their
    own stored value.

    So a stored value that is not on the allowlist is appended and labelled as
    legacy. It is not silently promoted to valid — the writer still refuses it —
    but the user can SEE what the line says.
    """
    allowed = list(picklists.get('stage') or [])
    known = {o['value'] for o in allowed}
    extra = sorted({
        r.get('activity') for r in records
        if r.get('activity') and r.get('activity') not in known
    })
    return allowed + [_opt(v, f'{v} (legacy)') for v in extra]
