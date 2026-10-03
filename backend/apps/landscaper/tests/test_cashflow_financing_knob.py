"""The cash flow's Financing knob — XN62-LANDDEBT-0929.

Off (or no loan on the record) must be the cash flow it always was: same
engine call, same KPI labels, same columns, same card. On adds the financing
column, net before financing, and levered + unlevered returns side by side.
"""

from unittest import mock

from apps.financial.services import cashflow_routing
from apps.landscaper.tools.cashflow_artifact_builder import (
    build_cashflow_artifact_schema,
    cashflow_dedup_key,
    financing_moves_cash,
)
from apps.landscaper.tools.cashflow_view_spec import _financing_knob

ROWS = [
    {'seq': 1, 'label': 'Jan', 'netRevenue': 0.0, 'costs': -100.0, 'financing': 60.0,
     'reversion': 0.0, 'net': -40.0, 'cumulative': -40.0},
    {'seq': 2, 'label': 'Feb', 'netRevenue': 500.0, 'costs': 0.0, 'financing': -65.0,
     'reversion': 0.0, 'net': 435.0, 'cumulative': 395.0},
]
RESULTS = {'npv': 300.0, 'irr': 0.25, 'equityMultiple': 1.8, 'peakEquity': 40.0}


def _labels(schema):
    blocks = {b['id']: b for b in schema['blocks']}
    return (
        [p['label'] for p in blocks['cashflow_kpis']['pairs']],
        [c['key'] for c in blocks['cashflow_periods']['columns']],
        blocks,
    )


def test_knob_off_schema_is_unchanged():
    unlevered_rows = [dict(r, financing=0.0) for r in ROWS]
    schema = build_cashflow_artifact_schema(
        unlevered_rows, {}, RESULTS, net_revenue_label='Net Revenue',
        period_type='month', total_periods=2, property_type='land_dev',
        captured_at='t',
    )
    kpis, cols, blocks = _labels(schema)
    assert kpis == ['Net Present Value', 'IRR', 'Equity Multiple', 'Peak Capital', 'Months']
    assert cols == ['period', 'net_revenue', 'costs', 'net', 'cumulative']
    net_col = [c for c in blocks['cashflow_periods']['columns'] if c['key'] == 'net'][0]
    assert net_col['label'] == 'Net Cash Flow'


def test_knob_on_shows_levered_and_unlevered():
    schema = build_cashflow_artifact_schema(
        ROWS, {}, RESULTS, net_revenue_label='Net Revenue',
        period_type='month', total_periods=2, property_type='land_dev',
        captured_at='t',
        results_unlevered={'npv': 200.0, 'irr': 0.18, 'equityMultiple': 1.5},
    )
    kpis, cols, blocks = _labels(schema)
    assert 'IRR (levered)' in kpis and 'IRR (unlevered)' in kpis
    assert 'Net Present Value (unlevered)' in kpis
    assert cols == ['period', 'net_revenue', 'costs', 'financing', 'net_unlevered', 'net', 'cumulative']
    first = blocks['cashflow_periods']['rows'][0]['cells']
    assert first['net_unlevered'] == -100.0  # net -40 less financing +60


def test_default_card_keys_unchanged():
    assert cashflow_dedup_key(None) == 'cashflow:schedule_detail'
    assert cashflow_dedup_key([2, 1]) == 'cashflow:schedule_detail:containers:1-2'
    assert cashflow_dedup_key(None, False) == 'cashflow:schedule_detail:financing-off'


def test_resolve_financing_default_follows_loans():
    with mock.patch.object(cashflow_routing, 'get_project_type_code', return_value='LAND'), \
         mock.patch.object(cashflow_routing, 'project_loan_count', return_value=0):
        assert cashflow_routing.resolve_financing(9) is False
    with mock.patch.object(cashflow_routing, 'get_project_type_code', return_value='LAND'), \
         mock.patch.object(cashflow_routing, 'project_loan_count', return_value=2):
        assert cashflow_routing.resolve_financing(9) is True
        assert cashflow_routing.resolve_financing(9, False) is False
    with mock.patch.object(cashflow_routing, 'get_project_type_code', return_value='MF'), \
         mock.patch.object(cashflow_routing, 'project_loan_count', return_value=1):
        assert cashflow_routing.resolve_financing(17) is False


def test_knob_says_unlevered_when_no_loan():
    knob = _financing_knob({'on': False, 'loan_count': 0})
    assert knob['on'] is False
    assert 'unlevered until one exists' in knob['note']


# HQ129: "at the project level there is an unlevered and levered irr (thats all).
# if no debt, then there is only 1." A loan row that lends nothing is not debt.
def test_levered_pair_only_when_a_loan_moves_cash():
    zero_loan = {'sections': [{'sectionId': 'financing', 'lineItems': [
        {'lineId': 'financing-loan-63', 'periods': []}]}]}
    funded = {'sections': [{'sectionId': 'financing', 'lineItems': [
        {'lineId': 'financing-loan-63', 'periods': [{'periodIndex': 0, 'amount': 48_360_000.0}]}]}]}
    assert financing_moves_cash(zero_loan) is False
    assert financing_moves_cash({'sections': []}) is False
    assert financing_moves_cash(funded) is True
