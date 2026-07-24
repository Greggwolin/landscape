"""CF1 — cash-flow schedule artifact builder + registration tests.

Pure-function tests (no DB): the builder assembles the fixed schema from the
engine-reduced rows + assumptions + results, keeps the assumptions strip editable
and everything else calculated, and applies the Driver-1 column floor. Registration
tests confirm get_cashflow_schedule is advertised and gated for BOTH land and
income property. Session: LSCMD-CF-CASHFLOWSCHED-0724.
"""

from apps.landscaper.tool_registry import get_tools_for_page
from apps.landscaper.tool_schemas import LANDSCAPER_TOOLS
from apps.landscaper.tools.cashflow_artifact_builder import (
    build_cashflow_artifact_schema,
    create_cashflow_artifact,
)


# Three periods, no financing / no reversion (land discounted-sellout shape).
_ROWS = [
    {'seq': 1, 'label': '2028', 'netRevenue': 0.0, 'costs': -5_000_000.0,
     'financing': 0.0, 'lotbank': 0.0, 'reversion': 0.0,
     'net': -5_000_000.0, 'cumulative': -5_000_000.0},
    {'seq': 2, 'label': '2029', 'netRevenue': 20_000_000.0, 'costs': -3_000_000.0,
     'financing': 0.0, 'lotbank': 0.0, 'reversion': 0.0,
     'net': 17_000_000.0, 'cumulative': 12_000_000.0},
    {'seq': 3, 'label': '2030', 'netRevenue': 30_000_000.0, 'costs': -1_000_000.0,
     'financing': 0.0, 'lotbank': 0.0, 'reversion': 0.0,
     'net': 29_000_000.0, 'cumulative': 41_000_000.0},
]
_ASSUMPTIONS = {
    'discount_rate': 0.09,
    'hold_period_years': 3,
    'exit_cap_rate': 0.055,
    'selling_costs_pct': 0.03,
}
_RESULTS = {
    'npv': 33_100_000.0,
    'irr': 0.478,
    'equityMultiple': 2.1,
    'peakEquity': 5_000_000.0,
}


def _build(rows=None, assumptions=None, results=None, label='Net Revenue'):
    return build_cashflow_artifact_schema(
        _ROWS if rows is None else rows,
        _ASSUMPTIONS if assumptions is None else assumptions,
        _RESULTS if results is None else results,
        net_revenue_label=label,
        period_type='year',
        total_periods=3,
    )


def test_three_blocks_kpi_assumptions_period_grid():
    blocks = _build()['blocks']
    assert blocks[0]['type'] == 'key_value_grid'
    assert blocks[0]['id'] == 'cashflow_kpis'
    assert blocks[1]['id'] == 'cashflow_assumptions'
    assert blocks[2]['id'] == 'cashflow_periods'
    assert len(blocks) == 3


def test_kpi_header_uses_engine_results_only():
    kpis = {p['label']: p['value'] for p in _build()['blocks'][0]['pairs']}
    assert kpis['Net Present Value'] == 33_100_000
    assert kpis['IRR'] == '47.8%'
    assert kpis['Equity Multiple'] == '2.10x'
    assert kpis['Peak Capital'] == 5_000_000
    assert kpis['Years'] == 3


def test_missing_results_are_not_fabricated():
    # Empty results → only the period-count KPI survives; no invented NPV/IRR.
    kpis = {p['label']: p['value'] for p in _build(results={})['blocks'][0]['pairs']}
    assert 'Net Present Value' not in kpis
    assert 'IRR' not in kpis
    assert kpis['Years'] == 3


def test_assumptions_strip_is_the_only_editable_surface():
    a_cols = {c['key']: c for c in _build()['blocks'][1]['columns']}
    assert a_cols['value']['editable'] is True   # the steering cells
    assert a_cols['assumption']['editable'] is False
    # Every period-grid column is calculated / read-only.
    for c in _build()['blocks'][2]['columns']:
        assert c['editable'] is False


def test_assumptions_render_present_keys_as_display_strings():
    rows = {r['cells']['assumption']: r['cells']['value']
            for r in _build()['blocks'][1]['rows']}
    assert rows['Discount Rate'] == '9.0%'
    assert rows['Hold Period (yrs)'] == '3'
    assert rows['Exit Cap Rate'] == '5.5%'
    # A key absent from the payload produces no row (no fabrication).
    assert build_cashflow_artifact_schema(
        _ROWS, {'discount_rate': 0.09}, _RESULTS,
        net_revenue_label='Net Revenue', period_type='year', total_periods=3,
    )['blocks'][1]['rows'].__len__() == 1


def test_period_grid_carries_net_and_cumulative():
    grid = _build()['blocks'][2]
    keys = [c['key'] for c in grid['columns']]
    assert keys[0] == 'period'
    assert 'net' in keys and 'cumulative' in keys
    last = grid['rows'][-1]['cells']
    assert last['net'] == 29_000_000.0
    assert last['cumulative'] == 41_000_000.0


def test_driver1_floor_hides_zero_financing_and_reversion():
    keys = [c['key'] for c in _build()['blocks'][2]['columns']]
    assert 'financing' not in keys
    assert 'reversion' not in keys


def test_driver1_floor_shows_financing_and_reversion_when_present():
    rows = [dict(_ROWS[0], financing=-500_000.0),
            dict(_ROWS[1]),
            dict(_ROWS[2], reversion=8_000_000.0)]
    keys = [c['key'] for c in _build(rows=rows)['blocks'][2]['columns']]
    assert 'financing' in keys
    assert 'reversion' in keys


def test_net_revenue_label_switches_land_vs_income():
    land = _build(label='Net Revenue')['blocks'][2]['columns']
    income = _build(label='Net Operating Income')['blocks'][2]['columns']
    assert any(c['label'] == 'Net Revenue' for c in land)
    assert any(c['label'] == 'Net Operating Income' for c in income)


def test_create_cashflow_artifact_rejects_empty_without_touching_db():
    result = create_cashflow_artifact(
        project_id=9, project_name='X', rows=[], assumptions={}, results={},
        net_revenue_label='Net Revenue', period_type='month', total_periods=0,
    )
    assert result['success'] is False


def test_get_cashflow_schedule_advertised_and_gated_for_land_and_income():
    advertised = {t['name'] for t in LANDSCAPER_TOOLS}
    assert 'get_cashflow_schedule' in advertised
    land_tools = get_tools_for_page('chat', project_type_code='land')
    mf_tools = get_tools_for_page('chat', project_type_code='mf')
    assert 'get_cashflow_schedule' in land_tools
    assert 'get_cashflow_schedule' in mf_tools
