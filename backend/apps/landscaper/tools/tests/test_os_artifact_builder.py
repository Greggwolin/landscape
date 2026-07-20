"""Regression tests for the server-side operating-statement artifact builder.

These guard the RF 2026-07-19 payload-mapping fixes:
  - operations_data sections are dicts with a "rows" list (not lists), and
  - the expense section already includes management fee + reserves (so the
    builder must not re-add them from `totals`, which would double-count).

Pure unit tests: build_os_artifact_schema is a dict-in/schema-out function
with no DB or Django-model access, so no database fixture is required.
"""

from apps.landscaper.tools.os_artifact_builder import build_os_artifact_schema

# Synthetic payload mirroring the real operations_data shape (round numbers,
# no production data). Reconciliation by construction:
#   GPR 1,000,000 - vacancy 100,000            = EGI 900,000
#   EGI 900,000  - opex 400,000 (250k + 150k)  = NOI 500,000
PAYLOAD = {
    'property_summary': {'unit_count': 100},
    'totals': {
        'gross_potential_rent': 1_000_000,
        'total_other_income': 0,
        'effective_gross_income': 900_000,
        'total_operating_expenses': 400_000,
        'as_is_noi': 500_000,
    },
    'vacancy_deductions': {'rows': [
        {'label': 'Physical Vacancy', 'level': 0, 'as_is': {'rate': 0.05, 'total': -50_000}},
        {'label': 'Credit Loss', 'level': 0, 'as_is': {'rate': 0.005, 'total': -50_000}},
    ]},
    'operating_expenses': {'rows': [
        {'label': 'Taxes & Insurance', 'level': 0, 'as_is': {'total': 250_000}},
        # This category already bundles management fee + reserves, exactly as
        # operations_data returns it. The builder must NOT re-add them.
        {'label': 'Management & Reserves', 'level': 0, 'as_is': {'total': 150_000}},
    ]},
    'other_income': {'rows': []},
    'rental_income': {'rows': []},
}


def _table(payload):
    schema, unit_count = build_os_artifact_schema(payload)
    blocks = schema['blocks']
    tables = [b for b in blocks if b.get('type') == 'table']
    assert len(tables) == 1, 'guard requires exactly one top-level table block'
    return tables[0], unit_count


def _labels_and_annual(table):
    out = []
    for row in table['rows']:
        cells = row['cells']
        out.append((cells.get('line'), cells.get('annual')))
    return out


def test_sections_are_dicts_with_rows_and_do_not_crash():
    # The pre-fix builder iterated the section dict directly and raised
    # AttributeError: 'str' object has no attribute 'get'. This must not happen.
    table, unit_count = _table(PAYLOAD)
    assert unit_count == 100
    assert [c['key'] for c in table['columns']] == ['line', 'annual', 'per_unit']


def test_noi_grand_total_matches_payload():
    table, _ = _table(PAYLOAD)
    rows = dict(_labels_and_annual(table))
    assert rows['Net Operating Income'] == 500_000
    assert rows['Effective Gross Income'] == 900_000
    assert rows['Total Operating Expenses'] == 400_000


def test_expense_line_items_reconcile_without_double_counting():
    # The rendered expense line items (indented category rows, excluding the
    # "Operating Expenses" divider and the "Total Operating Expenses" subtotal)
    # must sum to total_operating_expenses. If management fee/reserves were
    # re-added from totals, this sum would exceed the total.
    table, _ = _table(PAYLOAD)
    expense_items = 0
    seen_header = False
    for line, annual in _labels_and_annual(table):
        if line == 'Operating Expenses':
            seen_header = True
            continue
        if line == 'Total Operating Expenses':
            break
        if seen_header and annual is not None:
            expense_items += annual
    assert expense_items == 400_000


def test_vacancy_rows_render_as_negative_less_lines():
    table, _ = _table(PAYLOAD)
    labels = [line for line, _ in _labels_and_annual(table)]
    assert any(l.startswith('Less: Physical Vacancy') for l in labels)
    # amount carried through as a negative
    rows = dict(_labels_and_annual(table))
    phys = next(v for k, v in rows.items() if k.startswith('Less: Physical Vacancy'))
    assert phys == -50_000
