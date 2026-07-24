"""SS1 — sales schedule artifact builder + registration tests.

Pure-function tests (no DB): the builder assembles the fixed schema from real
rows and applies the Driver-1 column floor. Registration/gating tests confirm
get_sales_schedule is advertised and LAND-only. Session: LSCMD-SS-SALESSCHED-0724.
"""

import datetime

from apps.landscaper.tool_registry import get_tools_for_page
from apps.landscaper.tool_schemas import LANDSCAPER_TOOLS
from apps.landscaper.tools.sales_artifact_builder import (
    build_sales_artifact_schema,
    create_sales_artifact,
)


# Two areas / two phases / two products, escalation present on one rate-card row.
_PARCELS = [
    {
        'parcel_id': 1, 'parcel_code': '1.101', 'product_code': '50x125',
        'area': 'Area 1', 'phase': '1.1',
        'sale_date': datetime.date(2028, 3, 1),
        'gross_sale_proceeds': 6481984.0, 'commission_amount': 194459.52,
        'cost_of_sale': 50000.0, 'net_sale_proceeds': 6237524.48,
    },
    {
        'parcel_id': 2, 'parcel_code': '2.201', 'product_code': 'MU',
        'area': 'Area 2', 'phase': '2.1',
        'sale_date': datetime.date(2031, 6, 1),
        'gross_sale_proceeds': 11325600.0, 'commission_amount': 339768.0,
        'cost_of_sale': 50000.0, 'net_sale_proceeds': 10935832.0,
    },
]
_PRICING = [
    {'lu_type_code': 'SFD', 'product_code': '50x125', 'price_per_unit': 3000.0,
     'unit_of_measure': '$/FF', 'growth_rate': 0.03,
     'growth_rate_set_id': 7, 'benchmark_id': None},
    {'lu_type_code': 'MX', 'product_code': 'MU', 'price_per_unit': 10.0,
     'unit_of_measure': 'SF', 'growth_rate': 0.0,
     'growth_rate_set_id': None, 'benchmark_id': None},
]


def _build(parcels=None, pricing=None):
    parcels = _PARCELS if parcels is None else parcels
    pricing = _PRICING if pricing is None else pricing
    tg = sum(r['gross_sale_proceeds'] for r in parcels)
    tn = sum(r['net_sale_proceeds'] for r in parcels)
    years = sorted({r['sale_date'].year for r in parcels})
    span = f'{years[0]}–{years[-1]}' if years[0] != years[-1] else str(years[0])
    return build_sales_artifact_schema(
        parcels, pricing, total_gross=tg, total_net=tn,
        parcel_count=len(parcels),
        product_count=len({r['product_code'] for r in parcels}),
        span_label=span,
    )


def test_kpi_header_reconciles_to_totals():
    kpis = {p['label']: p['value'] for p in _build()['blocks'][0]['pairs']}
    assert kpis['Total Gross Proceeds'] == round(6481984.0 + 11325600.0)
    assert kpis['Total Net Proceeds'] == round(6237524.48 + 10935832.0)
    assert kpis['Sale-Date Span'] == '2028–2031'
    assert kpis['Parcels'] == 2
    assert kpis['Products'] == 2


def test_coupled_pair_present_in_one_artifact():
    blocks = _build()['blocks']
    assert blocks[0]['type'] == 'key_value_grid'
    assert blocks[1]['id'] == 'sales_pricing_ratecard'
    assert blocks[2]['id'] == 'sales_parcel_schedule'
    # Exactly one KPI grid + the two coupled grids.
    assert len(blocks) == 3


def test_net_is_calculated_and_never_editable():
    sched = _build()['blocks'][2]
    net_col = next(c for c in sched['columns'] if c['key'] == 'net')
    assert net_col['editable'] is False
    for row in sched['rows']:
        c = row['cells']
        assert round(c['gross'] - c['commission'] - c['cost_of_sale'], 2) == c['net']


def test_deduction_cells_present_and_input_cells_editable():
    cols = {c['key']: c for c in _build()['blocks'][2]['columns']}
    assert cols['commission']['editable'] is False  # calc
    assert cols['cost_of_sale']['editable'] is False  # calc
    assert cols['sale_date']['editable'] is True  # input
    price_col = next(c for c in _build()['blocks'][1]['columns'] if c['key'] == 'price')
    assert price_col['editable'] is True  # input


def test_driver1_floor_shows_columns_when_data_varies():
    b = _build()['blocks']
    sched_keys = [c['key'] for c in b[2]['columns']]
    price_keys = [c['key'] for c in b[1]['columns']]
    assert 'area' in sched_keys  # two areas
    assert 'phase' in sched_keys  # two phases
    assert 'escalation' in price_keys  # one rate-card row escalates


def test_driver1_floor_hides_single_valued_and_zero_escalation_columns():
    one = [dict(_PARCELS[0], area='Area 1', phase='1.1')]
    flat_pricing = [dict(p, growth_rate=0.0) for p in _PRICING]
    b = build_sales_artifact_schema(
        one, flat_pricing, total_gross=one[0]['gross_sale_proceeds'],
        total_net=one[0]['net_sale_proceeds'], parcel_count=1,
        product_count=1, span_label='2028',
    )['blocks']
    sched_keys = [c['key'] for c in b[2]['columns']]
    price_keys = [c['key'] for c in b[1]['columns']]
    assert 'area' not in sched_keys  # single area → hidden
    assert 'phase' not in sched_keys  # single phase → hidden
    assert 'escalation' not in price_keys  # no escalation → hidden


def test_vocabulary_is_sales_never_absorption_or_takedown():
    blocks = _build()['blocks']
    text = str(blocks).lower()
    assert 'absorption' not in text
    assert 'takedown' not in text
    assert blocks[2]['title'] == 'Parcel Sale Schedule'


def test_create_sales_artifact_rejects_empty_without_touching_db():
    # No parcel rows → early return, artifact service never invoked (no write).
    result = create_sales_artifact(
        project_id=9, project_name='X', parcel_rows=[], pricing_rows=[],
        total_gross=0, total_net=0, parcel_count=0, product_count=0,
        span_label='—',
    )
    assert result['success'] is False


def test_get_sales_schedule_is_advertised_and_land_only():
    advertised = {t['name'] for t in LANDSCAPER_TOOLS}
    assert 'get_sales_schedule' in advertised
    land_tools = get_tools_for_page('sales', project_type_code='land')
    mf_tools = get_tools_for_page('sales', project_type_code='mf')
    assert 'get_sales_schedule' in land_tools
    assert 'get_sales_schedule' not in mf_tools
