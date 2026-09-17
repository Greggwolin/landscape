"""The second output. One surface definition, rendered as a report.

D-2026-09-14-SURFACE-ARCH, option 2a: the view specification is the single
definition of a surface and the report generators become a second RENDERER of
it. This is that renderer. It holds no queries, no joins and no arithmetic —
if a number is wrong here it was wrong on the screen too, which is the whole
point of the decision. The IRR defect of 2026-09-14 (45.7% on the screen, 0.5%
on the PDF) is not reachable through this path, because there is only one place
the figure is produced.

WHAT IT CONSUMES
----------------
Two shapes, because seven surfaces have a view specification and two have only
an artifact schema:

  view specification   {'title', 'kicker', 'kpis'?, 'note'?, 'columns'?, 'rows'?,
                        'rung_columns'?, 'default_rung'?, plus any number of
                        nested {'title','columns','rows'} tables}
  artifact schema      {'blocks': [{'id','type','columns','rows'}, ...]}

Both are walked generically. Nothing below is keyed to a particular surface, so
a new table added to a specification appears in the report without this module
being touched — which is the only version of "one definition" that survives
contact with the next change.

THE ONE JUDGEMENT THIS MODULE MAKES, AND WHY IT IS NARROW
---------------------------------------------------------
A view specification says a column is right-aligned; it does not say the column
is money. The PDF and Excel renderers need ``currency`` / ``number`` /
``percentage`` to print $39,709,125 rather than 39709125.0. So a format is
inferred, under two conditions that keep the inference from inventing anything:

  1. the column does not already declare a format — a declared one always wins;
  2. the column's values are actually numeric. Where a specification has already
     formatted a cell into a string ("45.7%", "2.67×"), it is passed through
     untouched and no format is applied to it.

The keyword lists are stated below rather than being spread through the code, so
a wrong guess is one line to fix and visible without reading the logic. **The
real fix is for view specifications to declare ``format`` on their columns** —
``pricing_register_view_spec`` already does, and it is the pattern the other six
should follow. Until they do, this is the bridge and it says so.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .preview_base import PreviewBaseGenerator

# A right-aligned numeric column whose key or label contains one of these is
# money. Checked before the percentage list is checked.
_CURRENCY_HINTS = (
    'price', 'cost', 'gross', 'net', 'amount', 'revenue', 'proceeds', 'budget',
    'commission', 'value', 'npv', 'capital', 'equity', 'debt', 'rent', 'income',
    'expense', 'total', 'spend', 'distribution', 'contribution', 'basis', '$',
    # The acronyms this domain writes instead of the words above.
    'noi', 'egi', 'gpr', 'opex', 'ncf',
)

# ...unless it looks like a rate. Checked second because "growth rate" and
# "cost of sale %" both contain a currency hint and are neither of them money.
#
# 'cap rate' is spelled out rather than 'cap', which would have caught "Peak
# capital" and printed $106,026,927 as 106,026,927.0%.
_PERCENT_HINTS = (
    'pct', 'percent', '%', 'rate', 'irr', 'yield', 'growth', 'escalation',
    'margin', 'occupancy', 'cap rate', 'cap_rate',
)

# Keys that are counts or quantities, never money.
_NUMBER_HINTS = ('count', 'units', 'acres', 'qty', 'quantity', 'lots', 'periods')

# Money columns that must never be totalled. A price, a rate or an average is
# money PER something; adding a column of them produces a figure that looks like
# a total and is not one. The rate card summed to $216,030 before this list
# existed — twenty-one prices per lot, per unit and per acre added together.
_NOT_TOTALLED = ('price', 'rate', 'avg', 'average', 'per ', '/unit', '/ unit',
                 '$/', 'psf', 'per unit', 'per lot', 'per acre')


def _is_number(value: Any) -> bool:
    if isinstance(value, bool) or value is None or isinstance(value, str):
        return False
    try:
        float(value)
    except (TypeError, ValueError):
        return False
    return True


def _infer_format(column: Dict[str, Any], values: List[Any]) -> Optional[str]:
    """See the module docstring. Returns None where nothing should be applied."""
    declared = column.get('format')
    if declared:
        return str(declared)

    present = [v for v in values if v not in (None, '')]
    if not present or not all(_is_number(v) for v in present):
        # Either empty, or already a string the specification formatted. Leave it.
        return None

    haystack = f"{column.get('key', '')} {column.get('label', '')}".lower()
    if any(h in haystack for h in _PERCENT_HINTS):
        return 'percentage'
    if any(h in haystack for h in _NUMBER_HINTS):
        return 'number'
    if any(h in haystack for h in _CURRENCY_HINTS):
        return 'currency'
    return 'number'


def _kpi_card(pair: Dict[str, Any]) -> Dict[str, Any]:
    """One header figure, printable.

    A specification may hand over a display string it has already made ("45.7%",
    "2.67×", "2028–2034") or a raw number it has not. Strings pass straight
    through untouched — a specification that has formatted something has already
    decided how it reads. Only raw numbers are formatted here, by the same narrow
    keyword rule the columns use.
    """
    label = str(pair.get('label') or '')
    value = pair.get('value')
    if not _is_number(value):
        return {'label': label, 'value': value}

    haystack = label.lower()
    number = float(value)
    if any(h in haystack for h in _PERCENT_HINTS):
        return {'label': label, 'value': f'{number:,.1f}%'}
    if any(h in haystack for h in _NUMBER_HINTS):
        return {'label': label, 'value': f'{number:,.0f}'}
    if any(h in haystack for h in _CURRENCY_HINTS):
        return {'label': label, 'value': f'${number:,.0f}'}
    return {'label': label, 'value': f'{number:,.0f}'}


def _table_section(
    heading: str,
    columns: List[Dict[str, Any]],
    rows: List[Dict[str, Any]],
    *,
    keys: Optional[List[str]] = None,
) -> Optional[Dict[str, Any]]:
    """One table section in the preview shape, or None when there is nothing in it.

    ``keys`` restricts and orders the columns — used to render the rung the
    screen opens on rather than every column the surface could show.
    """
    if not columns or not rows:
        return None

    if keys:
        by_key = {c.get('key'): c for c in columns if c.get('key')}
        columns = [by_key[k] for k in keys if k in by_key] or columns

    # A specification's rows carry their values under 'cells'; a preview's rows
    # are flat. Flatten once, here, so nothing downstream has to know both.
    flat: List[Dict[str, Any]] = []
    for row in rows:
        cells = row.get('cells') if isinstance(row, dict) else None
        flat.append(dict(cells) if isinstance(cells, dict) else dict(row or {}))

    out_columns: List[Dict[str, Any]] = []
    for column in columns:
        key = column.get('key')
        if not key:
            continue
        fmt = _infer_format(column, [r.get(key) for r in flat])
        out_columns.append({
            'key': key,
            'label': column.get('label') or str(key),
            'align': column.get('align', 'left'),
            **({'format': fmt} if fmt else {}),
        })

    if not out_columns:
        return None

    return {
        'heading': heading,
        'type': 'table',
        'columns': out_columns,
        'rows': flat,
        'totals': None,
    }


def _add_totals(section: Dict[str, Any]) -> Dict[str, Any]:
    """Sum the MONEY columns of the rows this section already shows.

    Only ``currency`` columns are totalled. Summing a rate, a year or a count of
    things would produce a figure that looks like a total and means nothing, and
    a report that prints one is worse than a report that prints none. Nothing is
    re-derived from the database here — this adds up exactly what is on the page.
    """
    money = [
        c['key'] for c in section['columns']
        if c.get('format') == 'currency'
        and not any(h in f"{c.get('key', '')} {c.get('label', '')}".lower()
                    for h in _NOT_TOTALLED)
    ]
    if not money:
        return section
    totals: Dict[str, Any] = {}
    for key in money:
        running = 0.0
        seen = False
        for row in section['rows']:
            value = row.get(key)
            if _is_number(value):
                running += float(value)
                seen = True
        if seen:
            totals[key] = running
    section['totals'] = totals or None
    return section


def _grouped_sections(
    heading: str,
    columns: List[Dict[str, Any]],
    rows: List[Dict[str, Any]],
    *,
    keys: Optional[List[str]] = None,
    group_by: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """The detail table, split the way the specification says the screen splits it.

    A view specification carries ``default_grouping`` because a person reading
    this surface reads it grouped. A report that flattened that away would be
    showing the same rows in an order the screen never uses, which is the drift
    2a exists to stop. Each group becomes its own section with its own money
    totals; the column the rows were grouped ON is dropped from inside them,
    since it is now the heading and repeating it down every row is noise.
    """
    shown = keys or [c.get('key') for c in columns if c.get('key')]
    usable = group_by and group_by not in ('none', None) and group_by in shown

    if not usable:
        section = _table_section(heading, columns, rows, keys=keys)
        return [_add_totals(section)] if section else []

    buckets: Dict[str, List[Dict[str, Any]]] = {}
    for row in rows:
        cells = row.get('cells') if isinstance(row, dict) else None
        source = cells if isinstance(cells, dict) else (row or {})
        label = str(source.get(group_by) or '(unassigned)')
        buckets.setdefault(label, []).append(row)

    # One group is not a grouping. Rendering it as one would put a heading over
    # the whole table saying what every row already said.
    if len(buckets) < 2:
        section = _table_section(heading, columns, rows, keys=keys)
        return [_add_totals(section)] if section else []

    inner = [k for k in shown if k != group_by]
    out: List[Dict[str, Any]] = []
    for label, bucket in buckets.items():
        section = _table_section(
            f'{heading} — {label}', columns, bucket, keys=inner,
        )
        if section:
            out.append(_add_totals(section))
    return out


def _pick_rung(spec: Dict[str, Any]) -> Optional[List[str]]:
    """Which detail rung this report renders, given what the ROWS actually hold.

    A rung is a named set of columns the screen can step through. The obvious
    choice is ``default_rung`` and it is tried first — but it is not always
    renderable from the rows alone. The parcels surface opens on a ``summary``
    rung of ``group / parcels / acres / units / front feet / % of acres``, and
    the rows carry none of ``group``, ``parcels`` or ``% of acres``: those are
    aggregates the screen computes by grouping the rows as it draws them.
    Rendering that rung here would have produced a table half of whose columns
    were blank — the kind of output that looks like missing data and is not.

    So a rung is used only when EVERY key it names is present in the rows. Where
    the default cannot be rendered the other declared rungs are tried in order,
    and failing all of them every column the rows do carry is shown. Aggregating
    the rows here to satisfy the summary rung would be a second implementation
    of the screen's grouping, free to drift from it, which is the thing 2a is
    for removing.
    """
    rungs = spec.get('rung_columns')
    if not isinstance(rungs, dict) or not rungs:
        return None

    present: set = set()
    for row in spec.get('rows') or []:
        cells = row.get('cells') if isinstance(row, dict) else None
        present.update((cells if isinstance(cells, dict) else (row or {})).keys())

    order = [spec.get('default_rung')] + [k for k in rungs if k != spec.get('default_rung')]
    for name in order:
        keys = rungs.get(name)
        if keys and all(k in present for k in keys):
            return list(keys)

    declared = [c.get('key') for c in spec.get('columns') or [] if c.get('key')]
    fallback = [k for k in declared if k in present]
    return fallback or None


def _nested_tables(spec: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Every {'columns', 'rows'} table hanging off the specification, in the
    order the specification declares them. Dict order is deliberate in these
    modules and is honoured rather than re-sorted."""
    out: List[Dict[str, Any]] = []
    for key, value in spec.items():
        if key in ('columns', 'rows'):
            continue
        if not isinstance(value, dict):
            continue
        if not (value.get('columns') and value.get('rows')):
            continue
        heading = value.get('title') or str(key).replace('_', ' ').title()
        section = _table_section(heading, value['columns'], value['rows'])
        if section:
            out.append(_add_totals(section))
    return out


def sections_from_spec(spec: Dict[str, Any]) -> List[Dict[str, Any]]:
    """The preview sections for one view specification or artifact schema."""
    sections: List[Dict[str, Any]] = []

    # An artifact schema — the two surfaces with no specification yet.
    blocks = spec.get('blocks')
    if isinstance(blocks, list) and blocks:
        for block in blocks:
            if not isinstance(block, dict):
                continue
            if block.get('columns') and block.get('rows'):
                section = _table_section(
                    block.get('title') or '',
                    block['columns'],
                    block['rows'],
                )
                if section:
                    # NO totals row on a schema block. A builder-composed block
                    # is a STATEMENT — its rows are a running derivation and it
                    # carries its own subtotals. Adding the column up produced
                    # "Total $8,356,461" under the operating statement on
                    # 2026-09-14: gross rent, plus its own deductions, plus
                    # effective gross income, plus every expense, plus total
                    # expenses, plus net operating income. A number that means
                    # nothing, printed in bold, on a lender-facing page.
                    #
                    # Totals belong to view-spec DETAIL tables, where the rows
                    # are independent things — parcels in a sales schedule.
                    # That is a structural distinction, not a guess about what
                    # a row is called.
                    sections.append(section)
            elif block.get('pairs'):
                cards = [_kpi_card(p) for p in block['pairs']]
                sections.append({'heading': block.get('title') or '',
                                 'type': 'kpi_cards', 'cards': cards})
        return sections

    kpis = spec.get('kpis')
    if isinstance(kpis, list) and kpis:
        sections.append({
            'heading': '',
            'type': 'kpi_cards',
            'cards': [_kpi_card(k) for k in kpis],
        })
    else:
        # A specification with no KPI list may still state its totals — the
        # parcels surface does, and they are the figures a reader checks first
        # (43 parcels, 1,093 acres, 3,407 units). Taken from the specification,
        # never recomputed: the screen and the report then quote one set.
        totals = spec.get('totals')
        if isinstance(totals, dict) and totals:
            labels = {
                c.get('key'): c.get('label')
                for c in spec.get('columns') or [] if c.get('key')
            }
            cards = [
                _kpi_card({'label': labels.get(key) or str(key).replace('_', ' ').title(),
                           'value': value})
                for key, value in totals.items()
                if _is_number(value)
            ]
            if cards:
                sections.append({'heading': '', 'type': 'kpi_cards', 'cards': cards})

    # The one line of prose a specification may carry. It explains the numbers
    # below it and keeps that position here.
    for note_key in ('note', 'unanchored_note'):
        note = spec.get(note_key)
        if isinstance(note, str) and note.strip():
            sections.append({'heading': '', 'type': 'text', 'content': note.strip()})

    if spec.get('columns') and spec.get('rows'):
        # The rung the screen opens on, not every column the surface could show.
        # A report that silently carried more columns than the screen would be a
        # second definition wearing the first one's name.
        keys = _pick_rung(spec)
        sections.extend(_grouped_sections(
            spec.get('kicker') or 'Detail',
            spec['columns'],
            spec['rows'],
            keys=list(keys) if keys else None,
            group_by=spec.get('default_grouping'),
        ))

    sections.extend(_nested_tables(spec))
    return sections


class SurfacePreviewGenerator(PreviewBaseGenerator):
    """Render a standard surface as a report. PDF and Excel come from the base.

    Subclasses set ``surface_tool``, ``report_code`` and ``report_name``; there
    is nothing else for them to implement, which is the test of whether 2a
    actually landed.
    """

    surface_tool = ''

    def generate_preview(self) -> dict:
        from apps.reports.surface_spec import SurfaceUnavailable, resolve

        try:
            spec = resolve(self.surface_tool, self.project_id)
        except SurfaceUnavailable as exc:
            # Said plainly rather than shown as an empty report. A reader must
            # never be left to guess whether the project has no data or the code
            # cannot reach it.
            return {
                'title': self.report_name,
                'subtitle': None,
                'message': (
                    'This report renders the '
                    f'{self.surface_tool} surface, which cannot be built for a '
                    f'project on its own yet. {exc}'
                ),
                'sections': [],
            }

        if not spec:
            return {
                'title': self.report_name,
                'subtitle': None,
                'message': 'This project has nothing on this surface yet.',
                'sections': [],
            }

        # A schema carries no title or source label — those belong to a view
        # specification. Fall back to the project, so a statement never goes out
        # without saying which property it is about.
        project = self.get_project() or {}
        return {
            'title': spec.get('title') or self.report_name,
            'subtitle': spec.get('source_label') or project.get('project_name') or None,
            'as_of_date': spec.get('generated_at'),
            'message': None,
            'sections': sections_from_spec(spec),
        }
