"""The pricing register's two pieces of judgement, tested without a database.

Both are inferences the screen presents to Gregg as observations, so both are
worth pinning: a wrong width silently misplaces a product on the curve, and a
wrong break flags a price that is fine.
"""

import pytest

from apps.landscaper.tools.pricing_register_builder import (
    annotate_curve_breaks,
    build_pricing_register_schema,
    parse_lot_width,
)


@pytest.mark.parametrize('code,expected', [
    ('50x125', 50),
    ('35x95', 35),
    ('70X130', 70),   # capital X is live in the data
    (' 45 x 115 ', 45),
    ('BFR SFD', None),
    ('MU', None),
    ('6/6Pack', None),
    ('', None),
    (None, None),
])
def test_parse_lot_width(code, expected):
    assert parse_lot_width(code) == expected


def _row(product, price, uom='$/FF', lu='SFD', growth=None):
    return {'id': hash(product) & 0xffff, 'lu_type_code': lu, 'product_code': product,
            'price_per_unit': price, 'unit_of_measure': uom, 'growth_rate': growth,
            'growth_rate_set_id': None, 'price_effective_date': None, 'set_name': None}


def test_curve_break_flags_a_price_above_a_narrower_lot():
    """Peoria Meadows as it stands on 2026-09-13: flat at 2,400 up to 60 feet,
    2,200 from 65 up, and one 50-foot product at 3,000."""
    rows = [
        _row('35x95', 2400), _row('40x115', 2400), _row('45x115', 2400),
        _row('50x120', 3000), _row('50x125', 2400), _row('65x125', 2200),
    ]
    annotate_curve_breaks(rows)
    flagged = [r['product_code'] for r in rows if r.get('curve_break')]
    assert flagged == ['50x120']


def test_a_second_break_is_not_swallowed_by_the_first():
    """A running maximum would hide this: 70x130 is above every lot narrower than
    it except the 3,000 outlier, and it is still a departure from the curve."""
    rows = [
        _row('35x95', 2400), _row('40x115', 2300), _row('50x120', 3000),
        _row('60x125', 2000), _row('70x130', 2600),
    ]
    annotate_curve_breaks(rows)
    flagged = sorted(r['product_code'] for r in rows if r.get('curve_break'))
    assert flagged == ['50x120', '70x130']


def test_a_clean_declining_curve_flags_nothing():
    rows = [_row('35x95', 2600), _row('45x115', 2400), _row('55x125', 2200)]
    annotate_curve_breaks(rows)
    assert not any(r.get('curve_break') for r in rows)


def test_fewer_than_three_priced_widths_is_not_a_curve():
    rows = [_row('35x95', 2400), _row('50x125', 3000)]
    annotate_curve_breaks(rows)
    assert not any(r.get('curve_break') for r in rows)


def test_non_front_foot_products_are_not_on_the_curve():
    """A per-unit price and a per-front-foot price are not comparable, so a
    higher $/Unit product must never be read as breaking the rate curve."""
    rows = [
        _row('35x95', 2400), _row('45x115', 2400), _row('55x125', 2200),
        _row('40x100', 60000, uom='$/Unit'),
    ]
    annotate_curve_breaks(rows)
    assert not any(r.get('curve_break') for r in rows)


def test_per_lot_price_only_where_the_unit_is_front_feet():
    rows = [_row('50x125', 2400), _row('APTS', 25000, uom='$/Unit', lu='MF')]
    schema = build_pricing_register_schema(rows, [])
    table = next(b for b in schema['blocks'] if b['id'] == 'pricing_register_rows')
    by_product = {r['cells']['product']: r['cells'] for r in table['rows']}
    assert by_product['50x125']['price_per_lot'] == 2400 * 50
    # Per-unit pricing is already the price of the thing sold; multiplying it by
    # anything would be a figure nobody entered.
    assert by_product['APTS']['price_per_lot'] is None


def test_every_editable_cell_carries_a_pointer():
    """Presence of a pointer IS the write allowlist. A column drawn as an input
    with no pointer behind it is the defect this surface was built to end."""
    schema = build_pricing_register_schema([_row('50x125', 2400)], [])
    table = next(b for b in schema['blocks'] if b['id'] == 'pricing_register_rows')
    row = table['rows'][0]
    editable = {c['key'] for c in table['columns'] if c.get('editable')}
    assert editable == set(row['cell_source_refs'].keys())


# ── 2026-09-14: units resolved to the administered list, headers named, and the
# project's growth assumption inherited by rows that set none of their own. ──

def test_a_legacy_unit_spelling_resolves_to_the_administered_code():
    """Gregg, 2026-09-14: the Unit column must not offer "(not on the platform
    list)" entries. The fix is resolution, not suppression — dropping the option
    would have left those cells blank."""
    from apps.landscaper.tools.picklists import normalize_measure_code

    assert normalize_measure_code('$/FF') == 'FF'
    assert normalize_measure_code('$/Unit') == 'UNIT'
    assert normalize_measure_code('$/Acre') == 'AC'
    assert normalize_measure_code('$$$') == 'LS'
    # Case is how it was typed, not what it means.
    assert normalize_measure_code('Unit') == 'UNIT'
    # Anything unrecognised passes through rather than being invented away.
    assert normalize_measure_code('WIDGETS') == 'WIDGETS'
    assert normalize_measure_code(None) == ''


def test_the_retired_time_expressions_resolve_to_the_measure():
    """Migration 0053 removed $/MO, $/QTR and $/YR from the administered list.

    D-2026-09-14-MQR: time is the measure, so a quarter is QTR and the rate is
    dollars per quarter. Nothing in the database carried the retired codes, but
    a value typed before the retirement — or arriving from an import — must land
    on a real option rather than forcing an off-list entry.
    """
    from apps.landscaper.tools.picklists import normalize_measure_code

    assert normalize_measure_code('$/MO') == 'MO'
    assert normalize_measure_code('$/QTR') == 'QTR'
    assert normalize_measure_code('$/YR') == 'YR'
    assert normalize_measure_code('$/Month') == 'MO'
    assert normalize_measure_code('quarter') == 'QTR'
    assert normalize_measure_code('yr') == 'YR'


def test_no_alias_resolves_to_a_price_expression():
    """The point of the whole exercise: a unit code never carries money.

    Every value this module can produce must be a measure. If someone adds an
    alias mapping onto a $/x code, this fails rather than quietly reintroducing
    the defect that took two migrations to remove.
    """
    from apps.landscaper.tools.picklists import (
        LEGACY_MEASURE_ALIASES, _CASE_ONLY_CODES,
    )

    for administered in list(LEGACY_MEASURE_ALIASES.values()) + list(_CASE_ONLY_CODES.values()):
        assert '/' not in administered, f'{administered} is money per something'
        assert '$' not in administered, f'{administered} carries a currency sign'


def test_the_curve_and_the_lot_price_see_through_a_legacy_spelling():
    """A row stored as $/FF is a front-foot row. Before normalisation it was
    excluded from both the curve check and the per-lot price."""
    rows = [_row('35x95', 2400, uom='$/FF'), _row('45x115', 2400, uom='FF'),
            _row('55x125', 2600, uom='$/FF')]
    annotate_curve_breaks(rows)
    assert rows[-1].get('curve_break') is True

    schema = build_pricing_register_schema(rows, [])
    table = next(b for b in schema['blocks'] if b['id'] == 'pricing_register_rows')
    by_product = {r['cells']['product']: r['cells'] for r in table['rows']}
    assert by_product['35x95']['uom'] == 'FF'
    assert by_product['35x95']['price_per_lot'] == 2400 * 35


def test_the_price_columns_say_what_the_number_is():
    schema = build_pricing_register_schema([_row('50x125', 2400)], [])
    table = next(b for b in schema['blocks'] if b['id'] == 'pricing_register_rows')
    labels = {c['key']: c['label'] for c in table['columns']}
    assert labels['price'] == '$ / Unit'
    assert labels['price_per_lot'] == '$ / Lot'


def test_a_row_with_no_rate_of_its_own_takes_the_project_rate():
    """Gregg, 2026-09-14: *"if a global growth rate is adopted, then all lines in
    the column will contain the global growth rate but can be overwritten."*"""
    default = {'rate': 0.03, 'label': 'Revenue Inflation', 'set_id': 72, 'source': 'set'}
    rows = [
        _row('50x125', 2400, growth=None),
        _row('55x125', 2300, growth=0.045),
    ]
    schema = build_pricing_register_schema(rows, [], growth_default=default)
    table = next(b for b in schema['blocks'] if b['id'] == 'pricing_register_rows')
    by_product = {r['cells']['product']: r for r in table['rows']}

    inherited = by_product['50x125']
    assert inherited['cells']['growth_rate'] == 0.03
    assert inherited.get('growth_inherited') is True
    # Still an input: the pointer is what lets a person type over it.
    assert 'growth_rate' in inherited['cell_source_refs']

    own = by_product['55x125']
    assert own['cells']['growth_rate'] == 0.045
    assert own.get('growth_inherited') is None


def test_a_row_that_points_at_a_set_does_not_inherit():
    """Naming a growth source IS an answer. Overwriting it with the project
    default would silently discard the set the row was pointed at."""
    default = {'rate': 0.03, 'label': 'Revenue Inflation', 'set_id': 72, 'source': 'set'}
    row = _row('50x125', 2400, growth=None)
    row['growth_rate_set_id'] = 71
    schema = build_pricing_register_schema([row], [], growth_default=default)
    table = next(b for b in schema['blocks'] if b['id'] == 'pricing_register_rows')
    assert table['rows'][0].get('growth_inherited') is None


def test_with_no_project_default_nothing_is_invented():
    rows = [_row('50x125', 2400, growth=None)]
    schema = build_pricing_register_schema(rows, [], growth_default=None)
    table = next(b for b in schema['blocks'] if b['id'] == 'pricing_register_rows')
    assert table['rows'][0]['cells']['growth_rate'] is None
    assert table['rows'][0].get('growth_inherited') is None


def test_the_rate_column_offers_a_list_and_stays_typeable():
    choices = [{'value': '', 'label': 'Type a rate…'},
               {'value': '0.03', 'label': '3.0% — Revenue Inflation (this project)'}]
    schema = build_pricing_register_schema(
        [_row('50x125', 2400)], [], growth_rate_choices=choices)
    table = next(b for b in schema['blocks'] if b['id'] == 'pricing_register_rows')
    rate_col = next(c for c in table['columns'] if c['key'] == 'growth_rate')
    assert rate_col['options'] == choices
    # A published list must not become a cage: a rate nobody published is still
    # a rate, so the column declares that it remains typeable.
    assert rate_col['allow_custom'] is True
