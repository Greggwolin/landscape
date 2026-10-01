"""Land financing by container — XN62-LANDDEBT-0929.

A loan tied to containers draws on THEIR costs times its share of each, is
released only by THEIR parcel sales, and is sized against THEIR development
budget. A loan with no container rows is project-wide, which is what every
loan was before. Pure tests: no database — the scoping rules are pure
functions so they can be pinned down on their own.
"""

from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from apps.calculations.loan_sizing_service import budget_basis_from_rows
from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService

# Divisions: two villages (10, 20); phases 11 under 10, 21 under 20; parcel 211
# under phase 21.  ancestry: division_id -> (village, phase)
ANCESTRY = {
    10: (10, None),
    11: (10, 11),
    20: (20, None),
    21: (20, 21),
    211: (20, 21),
}


def _cost_schedule():
    return {
        'categorySummary': {
            'Development': {
                'items': [
                    # Village 1's phase: 100 per period in periods 0-2
                    {'containerId': 11, 'totalAmount': 300.0,
                     'periods': [{'periodIndex': i, 'amount': 100.0} for i in range(3)]},
                    # Village 2's phase: 1,000 in periods 1-2
                    {'containerId': 21, 'totalAmount': 2000.0,
                     'periods': [{'periodIndex': i, 'amount': 1000.0} for i in (1, 2)]},
                    # A parcel line under Village 2's phase: 50 in period 3
                    {'containerId': 211, 'totalAmount': 50.0,
                     'periods': [{'periodIndex': 3, 'amount': 50.0}]},
                ],
            },
            'Land Acquisition': {
                'items': [
                    {'containerId': None, 'totalAmount': 5000.0,
                     'periods': [{'periodIndex': 0, 'amount': 5000.0}]},
                ],
            },
        },
    }


def _absorption_schedule():
    # parcel containerId is a tbl_phase id; phase 901 -> division 11, 902 -> 21
    return {
        'periodSales': [
            {'periodIndex': 4, 'parcels': [{'containerId': 901, 'units': 10}]},
            {'periodIndex': 5, 'parcels': [{'containerId': 902, 'units': 20}]},
        ],
    }


PHASE_TO_DIVISION = {901: 11, 902: 21}


def _scoped(shares, unassigned_share=0.0, periods=6):
    return LandDevCashFlowService._scoped_financing_inputs(
        _cost_schedule(), _absorption_schedule(), periods, PHASE_TO_DIVISION,
        {'shares': shares, 'ancestry': ANCESTRY, 'unassigned_share': unassigned_share},
    )


# (a) two loans 60/40 on one container draw 60/40 of each period's cost
def test_two_loans_split_each_period_60_40():
    a_totals, _, _ = _scoped({21: 0.6})
    b_totals, _, _ = _scoped({21: 0.4})
    full = [0.0, 1000.0, 1000.0, 50.0, 0.0, 0.0]  # phase 21 plus its parcel line
    for idx, amount in enumerate(full):
        assert abs(a_totals[idx] - amount * 0.6) < 1e-9
        assert abs(b_totals[idx] - amount * 0.4) < 1e-9
        assert abs(a_totals[idx] + b_totals[idx] - amount) < 1e-9


# (b) a loan on Village 2 releases only from Village 2 parcel sales, and draws
# nothing of Village 1's costs or the land purchase
def test_village_loan_released_only_by_its_own_sales():
    totals, lots, cost_per_lot = _scoped({20: 1.0})
    assert totals == [0.0, 1000.0, 1000.0, 50.0, 0.0, 0.0]
    assert 4 not in lots                      # Village 1's sale releases nothing
    assert lots[5] == {21: 20}
    assert set(cost_per_lot) == {21}


def test_acquisition_counts_only_when_the_loan_funds_it():
    without, _, _ = _scoped({20: 1.0})
    with_acq, _, _ = _scoped({20: 1.0}, unassigned_share=1.0)
    assert without[0] == 0.0
    assert with_acq[0] == 5000.0


def test_most_specific_assignment_wins():
    # Village 2 at 50%, but its phase 21 directly at 100%
    assert LandDevCashFlowService._share_for_division(211, {20: 0.5, 21: 1.0}, ANCESTRY) == 1.0
    assert LandDevCashFlowService._share_for_division(21, {20: 0.5}, ANCESTRY) == 0.5
    assert LandDevCashFlowService._share_for_division(11, {20: 0.5}, ANCESTRY) == 0.0


# (c) LTC basis includes the funded containers' budget lines, excludes others
def test_ltc_basis_includes_funded_budget_lines_only():
    rows = [
        # (division_id, tier1_id, tier2_id, activity, amount)
        (11, 10, 11, 'Improvements', Decimal('300')),
        (21, 20, 21, 'Improvements', Decimal('2000')),
        (211, 20, 21, 'Planning & Engineering', Decimal('50')),
        (None, None, None, 'Improvements', Decimal('999')),
    ]
    total, by_activity = budget_basis_from_rows(rows, {20: 0.5}, project_wide=False)
    assert total == Decimal('1025')  # (2000 + 50) x 50%
    assert by_activity == {'Improvements': Decimal('1000'), 'Planning & Engineering': Decimal('25')}

    total_all, _ = budget_basis_from_rows(rows, {}, project_wide=True)
    assert total_all == Decimal('3349')


def test_sizing_todos_are_gone():
    import inspect
    from apps.calculations import loan_sizing_service
    assert 'TODO' not in inspect.getsource(loan_sizing_service)


# (d) the stored construction-loan schedule and the cash-flow financing section
# go through the SAME per-loan function, so they cannot disagree about a loan
def _fake_loan(**kw):
    base = dict(
        loan_id=7, loan_name='Village 2 A&D', structure_type='REVOLVER',
        takes_out_loan_id=None, takes_out_loan=None,
        loan_term_months=24, loan_term_years=None, loan_start_date=None,
        closing_costs_appraisal=0, closing_costs_legal=0, closing_costs_other=0,
        loan_to_cost_pct=60, interest_rate_pct=8, origination_fee_pct=1,
        interest_reserve_inflator=1.0, repayment_acceleration=1.0,
        release_price_pct=110, minimum_release_amount=0, draw_trigger_type='COST_INCURRED',
    )
    base.update(kw)
    return SimpleNamespace(**base)


def _periods(n=6):
    from datetime import date
    return [{'endDate': date(2027, 1 + i, 28)} for i in range(n)]


def test_financing_section_uses_per_loan_period_data():
    svc = LandDevCashFlowService(1)
    svc._acquisition_date_cache = None  # no acquisition ledger in a pure test
    loan = _fake_loan()
    with mock.patch.object(svc, '_fetch_loans', side_effect=[[loan], []]), \
         mock.patch.object(svc, 'build_loan_period_data', wraps=lambda *a, **k: []) as spy, \
         mock.patch('apps.financial.services.land_dev_cashflow_service.DebtServiceEngine') as eng:
        eng.return_value.calculate_revolver.return_value = SimpleNamespace(periods=[])
        svc._build_financing_section({}, {}, _periods(), None)
    spy.assert_called_once()
    assert spy.call_args[0][0] is loan


def test_construction_loan_run_uses_per_loan_period_data():
    from apps.calculations import construction_loan_service as cls_mod
    loan = _fake_loan()
    with mock.patch.object(cls_mod.Loan.objects, 'get', return_value=loan), \
         mock.patch.object(LandDevCashFlowService, '_get_project_config', return_value={'start_date': _periods()[0]['endDate']}), \
         mock.patch.object(LandDevCashFlowService, '_get_dcf_assumptions', return_value={}), \
         mock.patch.object(LandDevCashFlowService, '_get_dcf_hold_period_months', return_value=None), \
         mock.patch.object(LandDevCashFlowService, '_determine_required_periods', return_value=6), \
         mock.patch.object(LandDevCashFlowService, '_extend_periods_for_loans', return_value=6), \
         mock.patch.object(LandDevCashFlowService, '_generate_cost_schedule', return_value={}) as cost_gen, \
         mock.patch.object(LandDevCashFlowService, '_generate_absorption_schedule', return_value={}), \
         mock.patch.object(LandDevCashFlowService, 'build_loan_period_data', return_value=[]) as spy, \
         mock.patch('apps.calculations.engines.debt_service_engine.DebtServiceEngine.calculate_revolver',
                    side_effect=RuntimeError('stop after inputs')):
        result = cls_mod.ConstructionLoanService(1, 7).calculate_and_store()
    assert result['success'] is False  # stopped on purpose after the inputs
    spy.assert_called_once()
    assert spy.call_args[0][0] is loan
    # project-wide schedules; the loan's own rows do the scoping
    assert cost_gen.call_args[0][1] is None


# (f) a take-out is a finding returned to the caller, not a crash or a log line
def test_take_out_surfaces_as_finding():
    svc = LandDevCashFlowService(1)
    svc._acquisition_date_cache = None
    taken = SimpleNamespace(loan_name='Land loan')
    loan = _fake_loan(takes_out_loan_id=3, takes_out_loan=taken, loan_name='A&D revolver')
    with mock.patch.object(svc, '_fetch_loans', side_effect=[[loan], []]), \
         mock.patch.object(svc, 'build_loan_period_data', return_value=[]), \
         mock.patch('apps.financial.services.land_dev_cashflow_service.DebtServiceEngine') as eng:
        eng.return_value.calculate_revolver.return_value = SimpleNamespace(periods=[])
        section = svc._build_financing_section({}, {}, _periods(), None)
    assert section['findings'][0]['code'] == 'take_out_not_modelled'
    assert 'Land loan is taken out by A&D revolver' in section['findings'][0]['message']
    assert svc._financing_findings == section['findings']


# A term loan whose amortisation is shorter than its term stops paying once
# the balance is gone (found on Peoria loan 63: 20-month amortisation on a
# 120-month term kept charging the full payment to month 120).
def test_term_loan_payments_stop_at_payoff():
    from apps.calculations.engines.debt_service_engine import DebtServiceEngine, TermLoanParams
    params = TermLoanParams(
        loan_amount=1_000_000, interest_rate_annual=0.06, amortization_months=20,
        interest_only_months=24, loan_term_months=120, origination_fee_pct=0.0,
        loan_start_period=0, payment_frequency='MONTHLY',
    )
    r = DebtServiceEngine().calculate_term(params, 120)
    paid_principal = sum(p.principal_component for p in r.periods)
    assert abs(paid_principal - 1_000_000) < 1.0
    assert all(p.scheduled_payment == 0 for p in r.periods[45:])
    total_paid = sum(p.scheduled_payment for p in r.periods) + sum(p.balloon_amount for p in r.periods)
    assert total_paid < 1_000_000 * 1.25  # 24 months IO + 20 amortising, not 96 full payments


# Sizing never sizes a loan off a missing basis
def test_ratio_with_no_basis_is_skipped_not_zero():
    from types import SimpleNamespace
    from unittest import mock
    from apps.calculations import loan_sizing_service as L
    loan = SimpleNamespace(loan_id=None, loan_to_value_pct=50, loan_to_cost_pct=50,
                           commitment_amount=None, loan_amount=None, origination_fee_pct=0,
                           interest_reserve_amount=0, closing_costs_appraisal=0,
                           closing_costs_legal=0, closing_costs_other=0)
    project = SimpleNamespace(project_id=9, project_type_code='LAND')
    with mock.patch.object(L, 'purchase_price_basis', return_value={'amount': L.Decimal('0'), 'source': None}), \
         mock.patch.object(L, 'development_budget_basis', return_value={'total': L.Decimal('1000'), 'by_activity': {}, 'funds_acquisition': True, 'project_wide': True}):
        r = L.LoanSizingService.calculate_commitment(loan, project)
    assert r['governing_constraint'] == 'LTC'
    assert r['commitment_amount'] == L.Decimal('500.00')
    assert any('Loan-to-value ignored' in n for n in r['sizing_notes'])


# Due on sale: whatever a loan still owes is retired when its last collateral sells
def test_revolver_retired_at_last_collateral_sale():
    from apps.calculations.engines.debt_service_engine import (
        DebtServiceEngine, PeriodCosts, RevolverLoanParams)
    pd = [PeriodCosts(i, '', 1000.0 if i < 6 else 0.0,
                      {1: 5} if i in (8, 10) else {}, {1: 100.0}) for i in range(24)]
    base = dict(loan_to_cost_pct=0.6, interest_rate_annual=0.08, origination_fee_pct=0.0,
                interest_reserve_inflator=1.0, repayment_acceleration=1.0, release_price_pct=0.5,
                release_price_minimum=0.0, closing_costs=0.0, loan_start_period=0, loan_term_months=24)
    last = LandDevCashFlowService._last_collateral_sale(pd, 0)
    assert last == 10
    r = DebtServiceEngine().calculate_revolver(RevolverLoanParams(**base, payoff_period=last), pd)
    assert r.periods[10].ending_balance == 0
    assert all(p.accrued_interest == 0 and p.ending_balance == 0 for p in r.periods[11:])
    r_old = DebtServiceEngine().calculate_revolver(RevolverLoanParams(**base), pd)
    assert r_old.periods[-1].ending_balance > 0  # without due-on-sale it lingered


def test_term_loan_balloons_at_last_collateral_sale():
    from datetime import date
    svc = LandDevCashFlowService(1)
    svc._acquisition_date_cache = date(2027, 1, 28)
    from apps.calculations.engines.debt_service_engine import PeriodCosts
    pd = [PeriodCosts(i, '', 0.0, {1: 3} if i == 30 else {}, {}) for i in range(48)]
    loan = _fake_loan(structure_type='TERM', loan_amount=1000, commitment_amount=1000,
                      loan_term_months=120, amortization_months=240, amortization_years=None,
                      interest_only_months=24, payment_frequency='MONTHLY')
    periods = [{'endDate': date(2027 + (i // 12), 1 + (i % 12), 28)} for i in range(48)]
    params = svc._build_term_params(loan, periods, pd)
    assert params.loan_start_period == 0          # the acquisition date, since none was typed
    assert params.loan_term_months == 31          # ends in the sale period, not month 120


# HQ129: a term loan is retired when its collateral's sales first cover it, not
# held to the last sale while earlier proceeds are paid out (Peoria loan 63 at
# $52M: a 2033 balloon after $335M of 2029 sales gave the levered flow two IRRs).
def test_term_loan_retired_when_sales_first_cover_it():
    from datetime import date
    from apps.calculations.engines.debt_service_engine import PeriodCosts
    svc = LandDevCashFlowService(1)
    svc._acquisition_date_cache = date(2027, 1, 28)
    sales = {12: 400.0, 20: 900.0, 40: 50.0}      # net proceeds; the loan is 1,000
    pd = [PeriodCosts(i, '', 0.0, {1: 1} if i in sales else {}, {}, sale_proceeds=sales.get(i, 0.0))
          for i in range(48)]
    loan = _fake_loan(structure_type='TERM', loan_amount=1000, commitment_amount=1000,
                      loan_term_months=120, amortization_months=240, amortization_years=None,
                      interest_only_months=24, payment_frequency='MONTHLY')
    periods = [{'endDate': date(2027 + (i // 12), 1 + (i % 12), 28)} for i in range(48)]
    assert LandDevCashFlowService._term_payoff_period(pd, 0, 1000.0) == 20
    assert svc._build_term_params(loan, periods, pd).loan_term_months == 21   # balloons at month 20
    # never covered: the last collateral sale, as before
    assert LandDevCashFlowService._term_payoff_period(pd, 0, 10_000.0) == 40
    # sales before the loan starts do not count toward it
    assert LandDevCashFlowService._term_payoff_period(pd, 13, 1000.0) == 40


# Gregg, 2026-09-29 (5a + three structures): which loans use the calculator
def test_release_calculator_routing():
    from types import SimpleNamespace as N
    u = LandDevCashFlowService.uses_release_calculator
    assert u(N(structure_type='REVOLVER', release_price_pct=None))
    assert u(N(structure_type='A_AND_D', release_price_pct=None))
    assert u(N(structure_type='TERM', release_price_pct=115))
    assert not u(N(structure_type='TERM', release_price_pct=None))


def test_term_on_calculator_advances_once_a_and_d_follows_costs():
    from apps.calculations.engines.debt_service_engine import (
        DebtServiceEngine, PeriodCosts, RevolverLoanParams)
    pd = [PeriodCosts(i, '', 1000.0 if 2 <= i < 8 else 0.0,
                      {1: 5} if i == 12 else {}, {1: 100.0}) for i in range(16)]
    base = dict(loan_to_cost_pct=0.6, interest_rate_annual=0.08, origination_fee_pct=0.0,
                interest_reserve_inflator=1.0, repayment_acceleration=1.0, release_price_pct=1.1,
                release_price_minimum=0.0, closing_costs=0.0, loan_start_period=0, loan_term_months=16)
    single = DebtServiceEngine().calculate_revolver(RevolverLoanParams(**base, advance_mode='single'), pd)
    multi = DebtServiceEngine().calculate_revolver(RevolverLoanParams(**base), pd)
    assert [p.period_index for p in single.periods if p.cost_draw > 0] == [0]
    assert len([p for p in multi.periods if p.cost_draw > 0]) > 1


# 6a: a revolver re-lends what releases repay; A&D does not
def _revolver_case():
    from apps.calculations.engines.debt_service_engine import PeriodCosts
    # costs in two waves with sales in between; a commitment too small for both waves at once
    pd = []
    for i in range(30):
        cost = 1000.0 if (i < 5 or 12 <= i < 17) else 0.0
        lots = {1: 10} if i in (8, 9, 22, 24) else {}
        pd.append(PeriodCosts(i, '', cost, lots, {1: 100.0}))
    base = dict(loan_to_cost_pct=0.6, interest_rate_annual=0.06, origination_fee_pct=0.0,
                interest_reserve_inflator=1.0, repayment_acceleration=1.0, release_price_pct=1.2,
                release_price_minimum=0.0, closing_costs=0.0, loan_start_period=0,
                loan_term_months=30, commitment_cap=3500.0)
    return pd, base


def test_revolver_redraws_after_releases():
    from apps.calculations.engines.debt_service_engine import DebtServiceEngine, RevolverLoanParams
    pd, base = _revolver_case()
    ad = DebtServiceEngine().calculate_revolver(RevolverLoanParams(**base), pd)
    rv = DebtServiceEngine().calculate_revolver(RevolverLoanParams(**base, revolving=True), pd)
    ad_draws = sum(p.cost_draw for p in ad.periods)
    rv_draws = sum(p.cost_draw for p in rv.periods)
    assert ad.commitment_amount <= 3500.0 + 1e-6 and rv.commitment_amount <= 3500.0 + 1e-6
    assert ad_draws <= ad.commitment_amount + 1e-6          # A&D: total advances capped
    assert rv_draws > ad_draws                               # revolver re-lends after releases
    assert all(p.beginning_balance <= rv.commitment_amount + 1e-6 for p in rv.periods)


def test_a_and_d_default_is_unchanged_without_a_cap():
    from apps.calculations.engines.debt_service_engine import DebtServiceEngine, RevolverLoanParams
    pd, base = _revolver_case()
    base = dict(base, commitment_cap=None)
    a = DebtServiceEngine().calculate_revolver(RevolverLoanParams(**base), pd)
    b = DebtServiceEngine().calculate_revolver(RevolverLoanParams(**base, revolving=False), pd)
    assert [round(p.ending_balance, 6) for p in a.periods] == [round(p.ending_balance, 6) for p in b.periods]


# Land loans have no additional advances; A&D loans do (Gregg, 2026-09-29)
def test_land_loan_must_be_term():
    import pytest
    from rest_framework import serializers as drf
    from apps.financial.serializers_debt import LoanCreateUpdateSerializer
    s = LoanCreateUpdateSerializer()
    with pytest.raises(drf.ValidationError):
        s.validate({'loan_type': 'LAND', 'structure_type': 'A_AND_D'})
    assert s.validate({'loan_type': 'LAND', 'structure_type': 'TERM'})['structure_type'] == 'TERM'
    assert s.validate({'loan_type': 'CONSTRUCTION', 'structure_type': 'A_AND_D'})


def test_land_loan_on_calculator_advances_once():
    from datetime import date
    svc = LandDevCashFlowService(1)
    svc._acquisition_date_cache = None
    loan = _fake_loan(loan_type='LAND', structure_type='TERM', release_price_pct=115,
                      governing_constraint=None, commitment_amount=0)
    periods = [{'endDate': date(2027, 1 + i, 28)} for i in range(6)]
    assert svc._build_revolver_params(loan, periods).advance_mode == 'single'
    ad = _fake_loan(loan_type='CONSTRUCTION', structure_type='A_AND_D',
                    governing_constraint=None, commitment_amount=0)
    assert svc._build_revolver_params(ad, periods).advance_mode == 'costs'


# Release basis (Gregg, 2026-09-29): per lot, per acre, or a cash sweep of 100%
# of each sale's net proceeds.
def _sale_case():
    from apps.calculations.engines.debt_service_engine import PeriodCosts
    pd = []
    for i in range(20):
        sold = i in (10, 14)
        pd.append(PeriodCosts(i, '', 1000.0 if i < 5 else 0.0,
                              {1: 10} if sold else {}, {1: 100.0},
                              acres_sold=4.0 if sold else 0.0,
                              sale_proceeds=2500.0 if sold else 0.0))
    base = dict(loan_to_cost_pct=0.6, interest_rate_annual=0.06, origination_fee_pct=0.0,
                interest_reserve_inflator=1.0, repayment_acceleration=1.0, release_price_pct=0.5,
                release_price_minimum=0.0, closing_costs=0.0, loan_start_period=0, loan_term_months=20)
    return pd, base


def test_cash_sweep_takes_all_net_proceeds():
    from apps.calculations.engines.debt_service_engine import DebtServiceEngine, RevolverLoanParams
    pd, base = _sale_case()
    r = DebtServiceEngine().calculate_revolver(RevolverLoanParams(**base, release_basis='CASH_SWEEP'), pd)
    p10 = r.periods[10]
    assert abs(p10.release_payments - min(2500.0, p10.beginning_balance + p10.accrued_interest)) < 1e-6


def test_per_acre_release_uses_acres():
    from apps.calculations.engines.debt_service_engine import DebtServiceEngine, RevolverLoanParams
    pd, base = _sale_case()
    r = DebtServiceEngine().calculate_revolver(RevolverLoanParams(**base, release_basis='ACRE'), pd)
    per_acre = r.commitment_amount / 8.0 * 0.5
    assert abs(r.periods[10].release_payments - per_acre * 4.0) < 1e-6


def test_lot_basis_unchanged_by_the_new_fields():
    from apps.calculations.engines.debt_service_engine import DebtServiceEngine, RevolverLoanParams
    pd, base = _sale_case()
    a = DebtServiceEngine().calculate_revolver(RevolverLoanParams(**base), pd)
    b = DebtServiceEngine().calculate_revolver(RevolverLoanParams(**base, release_basis='LOT'), pd)
    assert [p.ending_balance for p in a.periods] == [p.ending_balance for p in b.periods]


def test_cash_sweep_term_loan_uses_calculator():
    from types import SimpleNamespace as N
    assert LandDevCashFlowService.uses_release_calculator(
        N(structure_type='TERM', release_price_pct=None, release_basis='CASH_SWEEP'))


# HQ132 (Gregg, 2026-09-30): "since its a term>bridge loan, it should default to
# the acqusition price for the value /cost." Both bases are the first CLOSING
# amount; a basis the user typed wins; other loans keep their own rule.
def test_term_bridge_sizes_both_bases_on_the_acquisition_price():
    from types import SimpleNamespace
    from unittest import mock
    from apps.calculations import loan_sizing_service as L
    loan = SimpleNamespace(loan_id=None, loan_type='BRIDGE', structure_type='TERM',
                           loan_to_value_pct=50, loan_to_cost_pct=50,
                           commitment_amount=None, loan_amount=None, origination_fee_pct=1,
                           interest_reserve_amount=0, closing_costs_appraisal=0,
                           closing_costs_legal=0, closing_costs_other=0)
    project = SimpleNamespace(project_id=9, project_type_code='LAND')
    price = {'amount': L.Decimal('104000000'), 'source': 'acquisition closing'}
    with mock.patch.object(L, 'acquisition_closing_price', return_value=price), \
         mock.patch.object(L, 'development_budget_basis') as budget:
        r = L.LoanSizingService.calculate_commitment(loan, project)
        assert not budget.called            # the budget plays no part for a term bridge loan
        assert r['ltv_basis_amount'] == L.Decimal('104000000.00')
        assert r['ltc_basis_amount'] == L.Decimal('104000000.00')
        assert r['commitment_amount'] == L.Decimal('52000000.00')
        assert r['net_loan_proceeds'] == L.Decimal('51480000.00')
        typed = L.LoanSizingService.calculate_commitment(loan, project, {'ltv_basis_amount': '90000000'})
        assert typed['ltv_basis_amount'] == L.Decimal('90000000.00')
        assert typed['commitment_amount'] == L.Decimal('45000000.00')   # lesser of 45M (LTV) and 52M (LTC)
    revolver = SimpleNamespace(**{**vars(loan), 'structure_type': 'REVOLVER', 'loan_type': 'CONSTRUCTION'})
    with mock.patch.object(L, 'purchase_price_basis', return_value={'amount': L.Decimal('104000000'), 'source': 'acquisition ledger'}), \
         mock.patch.object(L, 'development_budget_basis', return_value={'total': L.Decimal('39709125'), 'by_activity': {}, 'funds_acquisition': True, 'project_wide': True}):
        r = L.LoanSizingService.calculate_commitment(revolver, project)
    assert r['ltc_basis_amount'] == L.Decimal('143709125.00')   # unchanged rule for other loans


# HQ137: a loan's effective terms come from the sizing rule where nothing was
# saved, flagged as defaults; a typed basis is kept; nothing is written.
def test_effective_terms_default_where_unsaved_and_keep_what_was_typed():
    from datetime import date
    from types import SimpleNamespace
    from unittest import mock
    from apps.calculations import loan_sizing_service as L
    project = SimpleNamespace(project_id=9, project_type_code='LAND')
    price = {'amount': L.Decimal('104000000'), 'source': 'acquisition closing'}
    unsaved = SimpleNamespace(loan_id=63, loan_type='BRIDGE', structure_type='TERM',
                              loan_to_value_pct=50, loan_to_cost_pct=50, commitment_amount=0, loan_amount=0,
                              ltv_basis_amount=0, ltc_basis_amount=0, loan_start_date=None,
                              origination_fee_pct=1, interest_reserve_amount=0, closing_costs_appraisal=0,
                              closing_costs_legal=0, closing_costs_other=0)
    with mock.patch.object(L, 'acquisition_closing_price', return_value=price), \
         mock.patch('apps.financial.services.land_dev_cashflow_service.LandDevCashFlowService.acquisition_date',
                    return_value=date(2026, 1, 1)):
        t = L.effective_loan_terms(unsaved, project)
        assert t['commitment_amount'] == L.Decimal('52000000.00')
        assert t['loan_start_date'] == date(2026, 1, 1)
        assert t['value_basis_is_default'] and t['cost_basis_is_default'] and t['start_is_default']
        assert t['amount_is_saved'] is False
        typed = SimpleNamespace(**{**vars(unsaved), 'ltv_basis_amount': 90_000_000, 'loan_start_date': date(2026, 3, 1)})
        t2 = L.effective_loan_terms(typed, project)
        assert t2['ltv_basis_amount'] == L.Decimal('90000000.00') and not t2['value_basis_is_default']
        assert t2['commitment_amount'] == L.Decimal('45000000.00')
        assert t2['loan_start_date'] == date(2026, 3, 1) and not t2['start_is_default']
        clone = L.with_effective_terms(unsaved, project)
    assert clone.loan_amount == L.Decimal('52000000.00') and unsaved.loan_amount == 0   # the record is untouched
