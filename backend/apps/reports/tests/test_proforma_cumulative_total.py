"""
The Cumulative row's Total is the CLOSING balance, not the sum of balances
(LSCMD-PD-GUARDFIX-0813-PD15, Fix 5 — PD14 Defect A1).

`addrow` totals a row by summing its period cells, which is right for every
flow row and wrong for the one running-balance row: summing a running balance
double-counts every earlier period. PD14 saw −$92M in the Total column of a
deal whose closing cumulative is −$41.6M.

Also covers Fix 6's surfacing half: a zero-floored exit puts a note on the
model so the preview and the PDF can print it.

Shared renderer — these assertions hold for RPT_12, RPT_17, RPT_18 and RPT_19.
"""

import pytest

from apps.reports.generators.proforma_base import build_proforma_model


def _envelope(nets_by_year, *, exit_analysis=None):
    """A minimal 1-line-per-year envelope whose leveraged net equals `nets_by_year`.

    Only a `revenue-net` section is supplied, so leveraged_cashflow_summary's
    netting (revenue-net + cost-* + financing + lotbank-*) reduces to it exactly.
    """
    periods, lineitems, subtotals = [], [], []
    for i, amount in enumerate(nets_by_year, start=1):
        year = 2026 + i - 1
        periods.append({
            'periodSequence': i,
            'label': str(year),
            'startDate': f'{year}-01-01',
            'endDate': f'{year}-12-31',
        })
        lineitems.append({
            'description': f'Net Revenue {year}',
            'periods': [{'periodSequence': i, 'amount': amount}],
        })
        subtotals.append({'periodSequence': i, 'amount': amount})

    env = {
        'periods': periods,
        'sections': [{
            'sectionId': 'revenue-net',
            'sectionName': 'Net Revenue',
            'lineItems': lineitems,
            'subtotals': subtotals,
        }],
    }
    if exit_analysis is not None:
        env['exitAnalysis'] = exit_analysis
    return env


def _row(model, label):
    return next(r for r in model['rows'] if r['label'] == label)


# ── Fix 5 ───────────────────────────────────────────────────────────────────

def test_cumulative_total_is_the_final_period_balance_not_the_sum():
    # Running balances: -10M, -30M, -18.4M. The old code totalled their SUM
    # (-58.4M); the answer is the closing balance, -18.4M.
    nets = [-10_000_000.0, -20_000_000.0, 11_600_000.0]
    model = build_proforma_model(_envelope(nets), granularity='year')

    cum = _row(model, 'Cumulative Cash Flow')
    last_bucket = model['buckets'][-1][0]

    assert cum['values'][last_bucket] == pytest.approx(-18_400_000.0)
    assert cum['total'] == pytest.approx(-18_400_000.0)
    # The defect: the running balances summed to a number that means nothing.
    assert sum(cum['values'].values()) == pytest.approx(-58_400_000.0)
    assert cum['total'] != sum(cum['values'].values())


def test_leveraged_cash_flow_total_is_still_the_sum_of_periods():
    # The flow row above it must be untouched — its Total IS the sum.
    nets = [-10_000_000.0, -20_000_000.0, 11_600_000.0]
    model = build_proforma_model(_envelope(nets), granularity='year')

    lcf = _row(model, 'Leveraged Cash Flow')
    assert lcf['total'] == pytest.approx(sum(lcf['values'].values()))
    assert lcf['total'] == pytest.approx(-18_400_000.0)


def test_cumulative_total_equals_leveraged_total_when_all_periods_are_shown():
    # Tie-out: the closing cumulative is by definition the sum of the flows.
    nets = [250_000.0, -125_000.0, 900_000.0, -40_000.0]
    model = build_proforma_model(_envelope(nets), granularity='year')

    assert _row(model, 'Cumulative Cash Flow')['total'] == pytest.approx(
        _row(model, 'Leveraged Cash Flow')['total'])


def test_single_period_cumulative_total_is_that_period():
    model = build_proforma_model(_envelope([-7_500_000.0]), granularity='year')
    assert _row(model, 'Cumulative Cash Flow')['total'] == pytest.approx(-7_500_000.0)


def test_every_other_row_still_totals_by_summing_periods():
    nets = [100.0, 200.0, 300.0]
    model = build_proforma_model(_envelope(nets), granularity='year')
    for r in model['rows']:
        if r['kind'] == 'cumulative':
            continue
        assert r['total'] == pytest.approx(sum(r['values'].values())), r['label']


# ── Fix 6 surfacing ─────────────────────────────────────────────────────────

def test_zero_floored_exit_puts_a_note_on_the_model():
    env = _envelope([-1_000_000.0, -2_000_000.0], exit_analysis={
        'netReversion': 0,
        'exitNotMeaningful': True,
        'exitNotMeaningfulReason': 'Terminal NOI is negative — reversion floored at $0',
    })
    model = build_proforma_model(env, granularity='year')
    assert any('Terminal NOI is negative' in n for n in model['notes'])


def test_a_normal_exit_adds_no_note():
    env = _envelope([-1_000_000.0, 5_000_000.0], exit_analysis={
        'netReversion': 4_000_000.0,
    })
    model = build_proforma_model(env, granularity='year')
    assert model['notes'] == []
