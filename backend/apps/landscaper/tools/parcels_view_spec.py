"""Parcels view specification — the shape the parcels artifact renders from.

Written from the settled design: ``_cowork/PARCELS-SPEC-2026-08-25.html`` rev 2,
which supersedes ``PARCELS-AS-ARTIFACT-2026-08-25`` in full.

WHY THIS EXISTS, GIVEN A PARCELS SCREEN ALREADY DOES
----------------------------------------------------
The first attempt hosted the existing screen inside an artifact frame. Gregg saw
it and said what it was: *"this is just the existing modal, poorly formatted,
within an artifact."* The instruction had been *"just as we did with the budget
interface"* — the budget's FORMAT, not a screen in a box. This module is that
format applied to parcels.

The format is one idea, borrowed wholesale from ``schedule_view_spec``: an
artifact is never a bespoke rendering, it is **one topic plus one view
specification**. Get it right once and the next topic inherits it.

WHAT IS DIFFERENT FROM THE BUDGET, AND WHY IT IS NOT SHARED CODE YET
--------------------------------------------------------------------
The budget's renderer sums ``cells.amount``, formats it as money, and divides by
a lot count. A parcel has no amount: its measures are acres, units and a count of
parcels. Rather than teach a merged, edited-daily budget surface about a second
measure on speculation, this ships alongside and the two converge once the
parcels shape has been proven against real use. That is a deliberate deferral,
recorded here so the duplication is not mistaken for an oversight.

THE HIERARCHY HERE IS NOT THE HIERARCHY THE BUDGET READS
---------------------------------------------------------
Budget lines point at ``tbl_division``. Parcels point at ``tbl_area`` and
``tbl_phase``, and 43 of 43 resolve there while only 42 have a twin in
``tbl_division``. So this reads the one the parcels actually point at — the only
one that can account for every parcel. The chips come out identical today
(Village 1..4, Phase 1.1..4.2, verified member for member on project 9), but
"identical today" is not "the same thing", and reconciling the two is separate
work that this module must not pretend to have done.

LEVEL NAMES ARE READ, NEVER ASSUMED
------------------------------------
"Village" and "Phase" are what project 9 happens to call its levels; they come
from ``tbl_project_config``. Hard-coding either is a defect, not a shortcut.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# The four detail rungs, in order. Columns accumulate going down: a rung shows
# everything the rungs above it show, plus its own.
RUNGS = ('summary', 'standard', 'detail', 'all')

# The columns at each rung, stated in full rather than as additions.
#
# WHY NOT CUMULATIVE. The first draft had each rung add to the one above, which
# reads well in a design document and falls apart the moment it runs: `parcels`
# and `% of acres` are group-line facts, and carried onto an individual parcel
# they say "1" and a meaningless share on every row. Summary rows ARE groups;
# every other rung's rows are parcels, and the group facts live on the subtotal
# line. Two different row shapes, so two different column lists.
#
# Settled 2026-08-25: Gregg's call was "go with your gut, it is an easy fix
# later", so this is a decision rather than an open question — but a cheap one to
# revisit, which is why it is one table and nothing in the renderer hard-codes a
# column.
_RUNG_COLUMNS: Dict[str, tuple] = {
    # Rows are groups.
    'summary':  ('group', 'parcels', 'acres', 'units', 'pct_acres'),
    # Rows are parcels.
    'standard': ('level1', 'level2', 'parcel', 'type', 'product',
                 'acres', 'units'),
    'detail':   ('level1', 'level2', 'parcel', 'type', 'product',
                 'acres', 'units', 'dua'),
    'all':      ('level1', 'level2', 'parcel', 'family', 'type', 'product',
                 'acres', 'units', 'dua'),
}

# WHAT IS DELIBERATELY ABSENT, AND WHY (Gregg, 2026-08-25, after running it)
# --------------------------------------------------------------------------
# LOT WIDTH. A parcel's dimensions come from its PRODUCT, not from a figure
# typed onto the parcel. `50x125` already says the lot is fifty feet wide, and
# `res_lot_product` holds that as data. The `tbl_parcel.lot_width` column is a
# second copy of the same fact — on project 9 it is filled on 24 of 43 parcels
# and agrees with the product on every one of them, so it adds no information
# and creates a way for the two to disagree. It is neither shown nor writable
# here.
#
# FRONT FEET. Dropped with lot width. It is derivable (product width × lots)
# rather than stored, and the stored column holds zero on every parcel that has
# it at all — which is what produced the "no parcel carries one" footnote that
# read as a data gap when it was really a modelling one.
#
# SALE PERIOD. Not a parcel fact. It belongs to sales and absorption, which has
# its own surface, and it was on this table by inheritance rather than by
# decision.

# The one rung whose rows are group lines rather than parcels.
GROUPED_RUNG = 'summary'

# Column presentation. Numbers right, words left — the universal tabular
# standard the renderer enforces on top.
_COLUMN_META: Dict[str, Dict[str, Any]] = {
    'group':      {'label': '',            'align': 'left',  'kind': 'text'},
    'parcels':    {'label': 'Parcels',     'align': 'right', 'kind': 'number'},
    'acres':      {'label': 'Acres',       'align': 'right', 'kind': 'number'},
    'units':      {'label': 'Units',       'align': 'right', 'kind': 'number'},
    'pct_acres':  {'label': '% of acres',  'align': 'right', 'kind': 'computed'},
    'level1':     {'label': None,          'align': 'left',  'kind': 'reference'},
    'level2':     {'label': None,          'align': 'left',  'kind': 'reference'},
    'parcel':     {'label': 'Parcel',      'align': 'left',  'kind': 'text'},
    'family':     {'label': 'Family',      'align': 'left',  'kind': 'picklist'},
    'type':       {'label': 'Type',        'align': 'left',  'kind': 'picklist'},
    'product':    {'label': 'Product',     'align': 'left',  'kind': 'picklist'},
    'dua':        {'label': 'Units / acre', 'align': 'right', 'kind': 'computed'},
}

# Columns dropped when the project holds no usable value for them anywhere.
#
# An all-dashes column is noise pretending to be information — on project 9 that
# would be lot depth, lot area, planning efficiency, planning loss, density code,
# sale price, setbacks and site coverage, every one of them empty on all 43
# parcels, and none of them offered here at all.
#
# EMPTY TODAY, ON PURPOSE. The three columns that used to sit here — lot width,
# front feet and sale period — are gone from the table entirely (see the note
# under _RUNG_COLUMNS), so there is nothing left to drop conditionally. The
# machinery stays because the next optional column will want it, and because a
# hiding rule that only exists when something uses it is a rule nobody
# maintains.
#
# `units` is deliberately NOT in this list: zero units on a commercial parcel is
# a fact about the plan, not a gap in it, and it is one of the four figures
# across the top.
_DROPPABLE: tuple = ()


# ── What can be typed into, and where it actually lives ─────────────────────
#
# The artifact's cell key is not always the database's column name, so the
# mapping is stated once here and nowhere else. An unmapped key gets NO ref and
# is therefore read-only — presence of the ref IS the write allowlist, checked
# server-side before any writer runs, so a cell can never become editable by
# accident.
#
# Slice 2a — the plain values. Deliberately NOT here yet:
#   family / type / product — each narrows the next, and a dependent picker is
#     new machinery rather than another column (slice 2b).
#   level1 / level2 — changing these MOVES a parcel between containers. It is a
#     different operation from editing a value and has to read as one.
#   parcel — derived from where the parcel sits whenever it sits somewhere
#     (Gregg, 25 Aug). Typeable only on a project with no level 1 and no level 2,
#     which is not project 9 and not this slice.
#   dua — computed. Never writable anywhere.
#   lot_width / front_feet / sale_period — no longer on this table at all.
_EDITABLE_PARCEL_CELLS = ('acres', 'units')

_PARCEL_CELL_TO_COLUMN = {
    'acres': 'acres_gross',
    'units': 'units_total',
}


def _num(value: Any) -> Optional[float]:
    """A number, or None. Never a silent zero — an empty acre count and a zero
    acre count are different facts and the renderer shows them differently."""
    if value is None or value == '':
        return None
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if n == n else None  # NaN is not a number worth carrying


def fetch_level_labels(project_id: int) -> Dict[int, str]:
    """The project's own names for its levels."""
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute(
            'SELECT tier_1_label, tier_2_label, tier_3_label '
            'FROM landscape.tbl_project_config WHERE project_id = %s',
            [project_id],
        )
        row = cursor.fetchone()
    return {
        1: (row[0] if row and row[0] else 'Area'),
        2: (row[1] if row and row[1] else 'Phase'),
        3: (row[2] if row and row[2] else 'Parcel'),
    }


def fetch_parcel_records(project_id: int) -> List[Dict[str, Any]]:
    """Every parcel, with the container it sits in.

    LEFT JOINs on purpose. A parcel with no village still exists, still owns its
    acres, and still has to appear — dropping it would make the totals disagree
    with the project for a reason nobody could see.
    """
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT p.parcel_id, p.parcel_code, p.family_name, p.type_code,
                   p.product_code, p.acres_gross, p.units_total,
                   a.area_id, a.area_no, ph.phase_id, ph.phase_no
              FROM landscape.tbl_parcel p
              LEFT JOIN landscape.tbl_area  a  ON a.area_id  = p.area_id
              LEFT JOIN landscape.tbl_phase ph ON ph.phase_id = p.phase_id
             WHERE p.project_id = %s
             ORDER BY a.area_no NULLS LAST, ph.phase_no NULLS LAST, p.parcel_code
            """,
            [project_id],
        )
        columns = [c[0] for c in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def fetch_levels(project_id: int, labels: Dict[int, str]) -> List[Dict[str, Any]]:
    """The chip rows: villages, and the phases under them.

    Read live from the container tables on every build, NOT cached into the
    artifact record. Gregg's requirement, 2026-08-25: adding a village or phase
    from inside the table must make its chip appear at once. A snapshot taken
    when the artifact was first opened is exactly the version where a phase you
    just added stays invisible until a reload.
    """
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute(
            'SELECT area_id, area_no FROM landscape.tbl_area '
            'WHERE project_id = %s ORDER BY area_no',
            [project_id],
        )
        areas = cursor.fetchall()
        cursor.execute(
            'SELECT phase_id, area_id, phase_no FROM landscape.tbl_phase '
            'WHERE project_id = %s ORDER BY area_id, phase_no',
            [project_id],
        )
        phases = cursor.fetchall()

    area_no_by_id = {a[0]: a[1] for a in areas}
    return [
        {
            'level': 1,
            'label': labels[1],
            'members': [{'id': a[0], 'label': str(a[1]), 'parent_id': None}
                        for a in areas],
        },
        {
            'level': 2,
            'label': labels[2],
            # "1.1" rather than "1" — the phase number alone repeats across
            # villages, so on its own it cannot say which phase it is. This is
            # the composed label the old screen shows and the one Gregg reads.
            'members': [{'id': p[0],
                         'label': f'{area_no_by_id.get(p[1], "?")}.{p[2]}',
                         'parent_id': p[1]}
                        for p in phases],
        },
    ]


def build_parcels_view_config(
    *,
    project_id: int,
    project_name: Optional[str],
    records: List[Dict[str, Any]],
    levels: List[Dict[str, Any]],
    labels: Dict[int, str],
) -> Dict[str, Any]:
    """The parcels artifact's view specification.

    Emits the full row set plus the knob metadata; the renderer applies the
    knobs, because every one of them is arithmetic over the visible rows —
    counting, summing, and dividing one by another. Nothing here is an engine
    calculation, so nothing here is re-implemented from one.

    Numbers leave raw. Formatting — separators, dashes for nothing — belongs to
    the renderer, so a number can never arrive pre-formatted and unfilterable.
    """
    rows: List[Dict[str, Any]] = []
    for idx, record in enumerate(records, start=1):
        acres = _num(record.get('acres_gross'))
        units = _num(record.get('units_total'))
        scope: Dict[str, int] = {}
        if record.get('area_id') is not None:
            scope['1'] = record['area_id']
        if record.get('phase_id') is not None:
            scope['2'] = record['phase_id']

        area_no = record.get('area_no')
        phase_no = record.get('phase_no')
        rows.append({
            'id': f'p{idx}',
            'parcel_id': record.get('parcel_id'),
            'scope': scope,
            'cells': {
                'level1': str(area_no) if area_no is not None else None,
                'level2': (f'{area_no}.{phase_no}'
                           if area_no is not None and phase_no is not None
                           else None),
                # A parcel with no number renders with a dash and is still
                # counted. There is one on project 9. A parcel that exists and
                # cannot be named is something to see, not to quietly drop.
                'parcel': record.get('parcel_code'),
                'family': record.get('family_name'),
                'type': record.get('type_code'),
                'product': record.get('product_code'),
                'acres': acres,
                'units': units,
                # Density is derived, never stored, and never typed over.
                'dua': (round(units / acres, 2)
                        if units is not None and acres else None),
            },
        })

    # Drop a column the project has no usable value for anywhere. Zero is not a
    # value here — see the note on _DROPPABLE.
    dropped: List[Dict[str, Any]] = []
    present = set(_COLUMN_META)
    for key in _DROPPABLE:
        if not any(_num(row['cells'].get(key)) for row in rows):
            present.discard(key)
            dropped.append({'key': key,
                            'label': _COLUMN_META[key]['label'],
                            'available': False,
                            'reason': 'no parcel in this project carries one'})

    rung_columns: Dict[str, List[str]] = {
        rung: [key for key in _RUNG_COLUMNS[rung] if key in present]
        for rung in RUNGS
    }
    # Every column any rung can show, defined once so the renderer never has to
    # look one up that was not sent.
    used: List[str] = []
    for rung in RUNGS:
        for key in rung_columns[rung]:
            if key not in used:
                used.append(key)

    columns = []
    for key in used:
        meta = _COLUMN_META[key]
        label = meta['label']
        if key == 'level1':
            label = labels[1]
        elif key == 'level2':
            label = labels[2]
        elif key == 'parcel':
            label = labels[3]
        columns.append({'key': key, 'label': label,
                        'align': meta['align'], 'kind': meta['kind']})

    total_acres = sum(r['cells']['acres'] or 0 for r in rows)
    total_units = sum(r['cells']['units'] or 0 for r in rows)

    return {
        'topic': 'parcels',
        'kicker': f'{project_name} · Planning' if project_name else 'Planning',
        'title': _plural(labels[3]),
        'source_label': 'the project’s parcels',
        # No dollars basis exists on a parcel table, so the budget's basis badge
        # is absent rather than present and inert.
        'binding': {'state': 'live', 'label': 'LIVE'},
        'levels': levels,
        'columns': columns,
        'rung_columns': rung_columns,
        'grouped_rung': GROUPED_RUNG,
        'default_rung': 'summary',
        'default_grouping': 'use',
        'group_options': [
            {'value': 'use', 'label': 'use'},
            {'value': 'level1', 'label': labels[1].lower()},
            {'value': 'level2', 'label': labels[2].lower()},
            {'value': 'none', 'label': 'none'},
        ],
        'optional_columns': dropped,
        'rows': rows,
        # What the four figures across the top show. They follow the filter, as
        # the budget's do.
        'measures': ['acres', 'parcels', 'units', 'dua'],
        'totals': {'acres': total_acres, 'units': total_units,
                   'parcels': len(rows)},
        'row_count': len(rows),
        'truncate_at': 12,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'project_id': project_id,
    }


def _plural(noun: str) -> str:
    return noun if noun.endswith('s') else f'{noun}s'


def build_parcels_artifact_schema(
    config: Dict[str, Any],
    records: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """The stored block document — the half that makes cells writable.

    WHY THERE ARE TWO REPRESENTATIONS OF THE SAME ROWS
    --------------------------------------------------
    The view specification (``params_json``) is what the renderer draws from.
    This block document (the artifact's stored state) is what a WRITE is resolved
    against: the server takes the clicked cell's path, walks it in the stored
    schema, and reads the ``cell_source_ref`` sitting there. It never trusts the
    client for the table, the row or the column.

    That is the whole security model of inline editing, and it is why this exists
    rather than the renderer simply posting a parcel id. It also means a cell with
    no ref is read-only no matter what any flag says, which is how a computed
    value can never be made writable by an oversight.

    ``captured_value`` is the value the cell was DISPLAYING when drawn. The write
    path compares it against what is stored immediately before writing, and
    refuses when they differ — otherwise an edit aimed at a table that has since
    been rebuilt lands on whatever row took that position.
    """
    captured_at = datetime.now(timezone.utc).isoformat()
    by_index = {i: rec for i, rec in enumerate(records)}

    rows: List[Dict[str, Any]] = []
    for idx, row in enumerate(config['rows']):
        record = by_index.get(idx, {})
        parcel_id = record.get('parcel_id')
        refs: Dict[str, Any] = {}
        if parcel_id is not None:
            for cell_key in _EDITABLE_PARCEL_CELLS:
                column = _PARCEL_CELL_TO_COLUMN[cell_key]
                refs[cell_key] = {
                    'table': 'tbl_parcel',
                    'row_id': parcel_id,
                    'column': column,
                    'captured_at': captured_at,
                    'captured_value': _num(record.get(column)),
                }
        rows.append({
            'id': row['id'],
            **({'editable': True, 'cell_source_refs': refs} if refs else {}),
            # Every column carrying a ref must also be DECLARED on the block —
            # the schema validator rejects a ref pointing at a column the table
            # does not show, which is what stops a ref drifting away from the
            # thing it claims to address.
            'cells': {key: row['cells'].get(key) for key in _EDITABLE_PARCEL_CELLS},
        })

    return {
        'blocks': [
            {
                'type': 'table',
                'id': 'parcels',
                'columns': [
                    {'key': key, 'label': _COLUMN_META[key]['label']}
                    for key in _EDITABLE_PARCEL_CELLS
                ],
                'rows': rows,
            }
        ]
    }
