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


def _row(product, price, uom='$/FF', lu='SFD'):
    return {'id': hash(product) & 0xffff, 'lu_type_code': lu, 'product_code': product,
            'price_per_unit': price, 'unit_of_measure': uom, 'growth_rate': None,
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
