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
    EDITABLE_ASSUMPTION_COLUMNS,
    PERCENT_ASSUMPTION_COLUMNS,
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


# The engine-selected tbl_dcf_analysis row for an income deal. Values here are
# what a user actually entered; the strip must echo THESE, not the payload.
_DCF_CRE = {
    'dcf_analysis_id': 7,
    'property_type': 'cre',
    'discount_rate': 0.09,
    'hold_period_years': 3,
    'exit_cap_rate': 0.055,
    'selling_costs_pct': 0.03,
    'going_in_cap_rate': None,
    'vacancy_rate': None,
    'stabilized_vacancy': None,
    'credit_loss': None,
    'management_fee_pct': None,
    'reserves_per_unit': None,
    'income_growth_set_id': None,
    'expense_growth_set_id': None,
}


# The engine-selected tbl_dcf_analysis row for a land deal. exit_cap_rate is
# deliberately NULL here so the Not-set-vs-Entered split is exercised.
_DCF_LAND = {
    'dcf_analysis_id': 1,
    'property_type': 'land_dev',
    'discount_rate': 0.09,
    'hold_period_years': 3,
    'exit_cap_rate': None,
    'selling_costs_pct': 0.03,
    'price_growth_set_id': 45,
    'cost_inflation_set_id': None,
    'bulk_sale_enabled': False,
    'bulk_sale_period': 5,
    'bulk_sale_discount_pct': 0.15,
}

_LAND_ASSUMPTIONS = dict(
    _ASSUMPTIONS,
    price_growth_rate=0.03,
    cost_inflation_rate=0.025,
    bulk_sale_period=5,
    bulk_sale_discount_pct=0.15,
)


def _build(rows=None, assumptions=None, results=None, label='Net Revenue',
           property_type='cre', dcf_row=None, growth_set_names=None):
    return build_cashflow_artifact_schema(
        _ROWS if rows is None else rows,
        _ASSUMPTIONS if assumptions is None else assumptions,
        _RESULTS if results is None else results,
        net_revenue_label=label,
        period_type='year',
        total_periods=3,
        property_type=property_type,
        dcf_row=dcf_row,
        growth_set_names=growth_set_names,
    )


def _land(assumptions=None, dcf_row=_DCF_LAND, growth_set_names=None):
    return _build(
        assumptions=_LAND_ASSUMPTIONS if assumptions is None else assumptions,
        property_type='land_dev',
        dcf_row=dcf_row,
        growth_set_names=growth_set_names,
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
    # Editability is expressed per CELL (a source_ref), never by a column flag —
    # so a calculated cell can never become editable by someone flipping a bool.
    assumptions_rows = _land()['blocks'][1]['rows']
    assert any(r.get('cell_source_refs') for r in assumptions_rows)
    # Every period-grid row is calculated: not one carries a ref.
    for r in _land()['blocks'][2]['rows']:
        assert not r.get('cell_source_refs')
        assert not r.get('editable')


def test_assumptions_render_stored_values_as_editable_numbers():
    rows = {r['cells']['assumption']: r['cells']['value']
            for r in _build(dcf_row=_DCF_CRE)['blocks'][1]['rows']}
    # PERCENT UNITS, as a number — the cell must stay numerically editable, and
    # what the user reads is the unit the user types.
    assert rows['Discount Rate'] == 9.0
    assert rows['Hold Period (yrs)'] == 3
    assert rows['Exit Cap Rate'] == 5.5
    # A column the user has not filled in reads EMPTY. It is not dropped (the
    # gap has to be visible) and it is not filled with a house number.
    assert rows['Going-In Cap Rate'] is None
    assert rows['Management Fee'] is None


def test_an_unset_assumption_is_shown_empty_not_hidden_and_not_invented():
    """The rule (2026-09-04): the app never supplies an assumption the user did
    not choose. So a NULL column renders as a row with no value and a basis of
    'Not set' — visible as a gap to fill, never as a number, never omitted."""
    schema = build_cashflow_artifact_schema(
        _ROWS, {'discount_rate': 0.09}, _RESULTS,
        net_revenue_label='Net Revenue', period_type='year', total_periods=3,
        dcf_row={**_DCF_CRE, 'discount_rate': None},
    )
    rows = {r['cells']['assumption']: r['cells'] for r in schema['blocks'][1]['rows']}
    assert rows['Discount Rate']['value'] is None
    assert rows['Discount Rate']['basis'] == 'Not set'
    # The payload carrying 0.09 must not leak into the cell: the DCF row is the
    # only place a user's own value can live.
    assert 9.0 not in [c['value'] for c in rows.values()]


def test_percent_rows_carry_a_percent_cell_format():
    rows = {r['cells']['assumption']: r for r in _build()['blocks'][1]['rows']}
    assert rows['Discount Rate']['cell_formats']['value'] == 'percent'
    # Mixed units in ONE column is exactly why the format is per-cell.
    assert rows['Hold Period (yrs)']['cell_formats']['value'] == 'number'


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


def test_exit_cap_rate_is_income_only():
    """A land deal exits through the parcel sell-out, not a capped NOI.

    ``LandDevCashFlowService`` never reads ``exit_cap_rate``, so offering the row
    on a land artifact — editable, no less — was a cell whose write moved nothing.
    """
    def labels(schema):
        return {r['cells']['assumption'] for r in schema['blocks'][1]['rows']}

    assert 'Exit Cap Rate' not in labels(_land())
    assert 'Exit Cap Rate' in labels(
        _build(property_type='cre', dcf_row={**_DCF_LAND, 'property_type': 'cre',
                                             'exit_cap_rate': 0.055}))


def test_create_cashflow_artifact_rejects_empty_without_touching_db():
    result = create_cashflow_artifact(
        project_id=9, project_name='X', rows=[], assumptions={}, results={},
        net_revenue_label='Net Revenue', period_type='month', total_periods=0,
    )
    assert result['success'] is False


# ─── Editing spine (CC2) ────────────────────────────────────────────────────


def test_writable_specs_match_the_tool_allowlist():
    """The builder may only mark a cell editable if the existing verified writer
    accepts that column. Two lists, one truth — this is the guard against a cell
    that invites an edit the writer will reject."""
    from apps.landscaper.tool_executor import ASSUMPTION_FIELD_TYPES
    assert EDITABLE_ASSUMPTION_COLUMNS <= set(ASSUMPTION_FIELD_TYPES)


def test_percent_columns_are_declared_once_for_render_and_write():
    # The write path scales by exactly the set the render path formatted.
    assert 'discount_rate' in PERCENT_ASSUMPTION_COLUMNS
    assert 'exit_cap_rate' in PERCENT_ASSUMPTION_COLUMNS
    assert 'hold_period_years' not in PERCENT_ASSUMPTION_COLUMNS
    assert 'reserves_per_unit' not in PERCENT_ASSUMPTION_COLUMNS


def test_land_deal_discloses_land_assumptions_not_income_ones():
    labels = [r['cells']['assumption'] for r in _land()['blocks'][1]['rows']]
    assert 'Price Growth' in labels
    assert 'Cost Inflation' in labels
    assert 'Bulk Sale Discount' in labels
    # Income-only rows never appear on a land deal (they are never populated).
    assert 'Vacancy' not in labels
    assert 'Income Growth' not in labels


def test_income_deal_discloses_income_assumptions_not_land_ones():
    income_assumptions = dict(
        _ASSUMPTIONS, vacancy_rate=0.05, going_in_cap_rate=0.055,
        reserves_per_unit=300.0, income_growth_rate=0.03,
    )
    labels = [r['cells']['assumption']
              for r in _build(assumptions=income_assumptions)['blocks'][1]['rows']]
    assert 'Vacancy' in labels
    assert 'Going-In Cap Rate' in labels
    assert 'Bulk Sale Discount' not in labels
    assert 'Price Growth' not in labels


def test_source_ref_pins_the_row_the_render_read():
    rows = {r['cells']['assumption']: r for r in _land()['blocks'][1]['rows']}
    ref = rows['Discount Rate']['cell_source_refs']['value']
    assert ref['table'] == 'tbl_dcf_analysis'
    assert ref['row_id'] == 1              # the engine-selected record
    assert ref['column'] == 'discount_rate'
    # The ref captures the STORED fraction, not the displayed percent.
    assert ref['captured_value'] == 0.09


def test_benchmark_and_non_allowlisted_rows_carry_no_ref():
    rows = {r['cells']['assumption']: r for r in _land()['blocks'][1]['rows']}
    # Growth is a library link — editable in the library, not here.
    assert 'cell_source_refs' not in rows['Price Growth']
    assert 'cell_source_refs' not in rows['Cost Inflation']
    # The on/off flag is not in the writable allowlist → inert, not pretend.
    assert 'cell_source_refs' not in rows['Bulk Sale at Exit']


def test_basis_distinguishes_entered_not_set_and_benchmark():
    built = _land(dcf_row={**_DCF_LAND, 'bulk_sale_discount_pct': None},
                  growth_set_names={45: 'Price Inflaton'})['blocks'][1]['rows']
    cells = {r['cells']['assumption']: r['cells'] for r in built}
    rows = {k: v['basis'] for k, v in cells.items()}
    assert rows['Discount Rate'] == 'Entered'          # stored value
    # Column is NULL. Nothing stands in for it — the basis says so and the cell
    # is empty, rather than a 15% discount nobody chose wearing an 'Assumed' tag.
    assert rows['Bulk Sale Discount'] == 'Not set'
    assert cells['Bulk Sale Discount']['value'] is None
    assert rows['Price Growth'] == 'Benchmark · Price Inflaton'
    # A benchmark row with no set linked has no rate to report.
    assert rows['Cost Inflation'] == 'Not set'
    assert cells['Cost Inflation']['value'] is None
    # No row is ever blank about where its number came from.
    assert all(v for v in rows.values())


def test_no_dcf_record_means_nothing_is_editable():
    """A project with no assumption record yet shows every value as Not set and
    offers NO editable cell — the ref is the allowlist, so absence fails closed
    rather than writing to a record that does not exist."""
    schema = _land(dcf_row=None)
    rows = schema['blocks'][1]['rows']
    assert rows, 'rows still render — the user sees which assumptions are missing'
    assert all('cell_source_refs' not in r for r in rows)
    assert all(r['cells']['basis'] == 'Not set' for r in rows)
    # And not one of them carries a number the user never supplied.
    assert all(r['cells']['value'] is None for r in rows
               if r['cells']['assumption'] != 'Bulk Sale at Exit')


def test_kpi_header_is_never_editable():
    for pair in _land()['blocks'][0]['pairs']:
        assert 'source_ref' not in pair
        assert not pair.get('editable')


def test_get_cashflow_schedule_advertised_and_gated_for_land_and_income():
    advertised = {t['name'] for t in LANDSCAPER_TOOLS}
    assert 'get_cashflow_schedule' in advertised
    land_tools = get_tools_for_page('chat', project_type_code='land')
    mf_tools = get_tools_for_page('chat', project_type_code='mf')
    assert 'get_cashflow_schedule' in land_tools
    assert 'get_cashflow_schedule' in mf_tools
