"""
Stage 1b of the unit-turnover build (#LS-1123-08): one projection.

Before this change four entry points each carried their own "rent, less
vacancy, less expenses" and returned four different Year-1 NOIs for one
property (Chadron Terrace, live read 2026-11-23: DCF 1,230,631 · Landscaper
cash-flow adapter 3,136,660 · report calculator 1,510,654 · what-if on its own
base). They now all call mf_rent_base.annual_operating_line with the ten inputs
DCFCalculationService.operating_inputs() returns.

These tests pin (1) the arithmetic of the line, by hand, and (2) that each
entry point produces the line's NOI when handed the same inputs. The live
tie-out on the five apartment projects is recorded on the pull request.
"""

import inspect
from datetime import date
from decimal import Decimal

import pytest

from apps.calculations.adapters import multifamily_adapter
from apps.calculations.adapters.multifamily_adapter import (
    MultifamilyAssumptions,
    MultifamilyCashFlowAdapter,
)
from apps.financial.services import dcf_calculation_service
from apps.financial.services.mf_rent_base import (
    OPERATING_INPUT_KEYS,
    annual_operating_line,
)
from apps.landscaper.services import whatif_engine
from apps.landscaper.services.whatif_engine import WhatIfEngine
from apps.reports.calculators import multifamily_calculator

INPUTS = {
    'current_annual_rent': 1_000_000.0,
    'base_opex': 300_000.0,
    'unit_count': 100,
    'income_growth_rate': 0.03,
    'expense_growth_rate': 0.02,
    'vacancy_rate': 0.05,
    'credit_loss_rate': 0.01,
    'other_income': 20_000.0,
    'management_fee_pct': 0.03,
    'replacement_reserves_per_unit': 250.0,
}


# ── 1. The arithmetic, by hand ──────────────────────────────────────────────

def test_year_one_by_hand():
    line = annual_operating_line(year=1, **INPUTS)
    assert line['gpr'] == pytest.approx(1_000_000.0)
    assert line['vacancy_loss'] == pytest.approx(50_000.0)
    assert line['credit_loss'] == pytest.approx(10_000.0)      # share of potential rent
    assert line['egi'] == pytest.approx(960_000.0)             # 1,000,000 - 50,000 - 10,000 + 20,000
    assert line['management_fee'] == pytest.approx(28_800.0)   # 3% of EGI
    assert line['replacement_reserves'] == pytest.approx(25_000.0)
    assert line['total_opex'] == pytest.approx(353_800.0)
    assert line['noi'] == pytest.approx(606_200.0)


def test_year_three_grows_rent_and_base_expenses_only():
    line = annual_operating_line(year=3, **INPUTS)
    assert line['gpr'] == pytest.approx(1_000_000.0 * 1.03 ** 2)
    assert line['base_opex'] == pytest.approx(300_000.0 * 1.02 ** 2)
    assert line['other_income'] == pytest.approx(20_000.0)          # held flat
    assert line['replacement_reserves'] == pytest.approx(25_000.0)  # held flat
    assert line['management_fee'] == pytest.approx(line['egi'] * 0.03)
    assert line['noi'] == pytest.approx(line['egi'] - line['total_opex'])


def test_the_line_takes_exactly_the_documented_inputs():
    params = set(inspect.signature(annual_operating_line).parameters) - {'year'}
    assert params == set(OPERATING_INPUT_KEYS) == set(INPUTS)


# ── 2. Every entry point returns the line's NOI ─────────────────────────────

def test_dcf_service_builds_its_years_from_the_line():
    src = inspect.getsource(dcf_calculation_service.DCFCalculationService.calculate)
    assert 'annual_operating_line(year=year, **operating_inputs)' in src
    assert 'self.operating_inputs(assumptions, base_data)' in src


def _adapter(hold_months=36):
    adapter = object.__new__(MultifamilyCashFlowAdapter)
    adapter.project_id = 1
    adapter.operating_inputs = dict(INPUTS)
    adapter.assumptions = MultifamilyAssumptions(
        project_id=1,
        analysis_start_date=date(2026, 1, 1),
        hold_period_months=hold_months,
        unit_count=100,
        total_sf=80_000,
        gross_potential_rent_annual=Decimal('1000000'),
        vacancy_pct=Decimal('0.05'),
        credit_loss_pct=Decimal('0.01'),
        other_income_annual=Decimal('20000'),
        rent_growth_rate_set_id=None,
        total_opex_annual=Decimal('300000'),
        management_fee_pct=Decimal('0.03'),
        expense_growth_rate_set_id=None,
        reserves_per_unit=Decimal('250'),
        purchase_price=Decimal('10000000'),
        closing_costs_pct=Decimal('0'),
        exit_cap_rate=Decimal('0.06'),
        disposition_costs_pct=Decimal('0.02'),
        loan_amount=Decimal('0'),
        interest_rate=Decimal('0.06'),
        amortization_months=360,
        io_months=0,
        loan_term_months=120,
        equity_amount=Decimal('10000000'),
    )
    return adapter


def test_adapter_year_noi_is_the_line_noi():
    flows = _adapter().generate_period_cash_flows()
    for year in (1, 2, 3):
        months = flows['noi'][(year - 1) * 12: year * 12]
        assert sum(months) == pytest.approx(annual_operating_line(year=year, **INPUTS)['noi'])


def test_adapter_sale_is_priced_off_the_year_after_the_hold():
    flows = _adapter(hold_months=36).generate_period_cash_flows()
    terminal_noi = annual_operating_line(year=4, **INPUTS)['noi']
    net_sale = terminal_noi / 0.06 * (1 - 0.02)
    assert flows['unlevered'][-1] == pytest.approx(flows['noi'][-1] + net_sale)


def test_adapter_no_longer_invents_its_operating_inputs():
    src = inspect.getsource(multifamily_adapter.MultifamilyCashFlowAdapter.load_assumptions)
    assert '5500' not in src                       # the $5,500-a-unit expense estimate
    assert "Decimal('0.02'),  # 2% default" not in src.split('disposition_costs_pct')[0]
    assert 'operating_inputs()' in src
    flow_src = inspect.getsource(multifamily_adapter.MultifamilyCashFlowAdapter.generate_period_cash_flows)
    assert 'get_growth_rate' not in flow_src       # the second /100 (#LS-1123-03)


def _whatif(assumption_overrides=None):
    income = {
        'hold_period_years': 5,
        'discount_rate': 0.08,
        'terminal_cap_rate': 0.06,
        'selling_costs_pct': 0.02,
        'vacancy_rate': INPUTS['vacancy_rate'],
        'credit_loss_rate': INPUTS['credit_loss_rate'],
        'other_income': INPUTS['other_income'],
        'income_growth_rate': INPUTS['income_growth_rate'],
        'expense_growth_rate': INPUTS['expense_growth_rate'],
        'management_fee_pct': INPUTS['management_fee_pct'],
        'replacement_reserves_per_unit': INPUTS['replacement_reserves_per_unit'],
    }
    income.update(assumption_overrides or {})
    return WhatIfEngine._compute_income_metrics(None, {
        'income_assumptions': income,
        'tbl_project': {'total_units': INPUTS['unit_count'], 'gross_sf': 80_000.0},
        'annual_rental_income': INPUTS['current_annual_rent'],
        'total_opex': INPUTS['base_opex'],
    })


def test_whatif_baseline_is_the_line():
    out = _whatif()
    line = annual_operating_line(year=1, **INPUTS)
    assert out['noi_year1'] == pytest.approx(line['noi'])
    assert out['egi_year1'] == pytest.approx(line['egi'])
    assert out['total_opex'] == pytest.approx(line['total_opex'])
    assert out['vacancy_rate'] == pytest.approx(0.05)


def test_whatif_vacancy_override_still_moves_the_answer():
    out = _whatif({'physical_vacancy_pct': 0.10})
    shocked = annual_operating_line(year=1, **{**INPUTS, 'vacancy_rate': 0.10})
    assert out['noi_year1'] == pytest.approx(shocked['noi'])
    assert out['noi_year1'] < _whatif()['noi_year1']


def test_whatif_reads_rent_and_expenses_from_the_dcf_base():
    src = inspect.getsource(whatif_engine.WhatIfEngine._load_income_property_assumptions)
    assert 'operating_inputs()' in src
    assert 'SUM(current_rent)' not in src
    assert 'FROM landscape.tbl_operating_expenses' not in src


def test_report_calculator_in_place_scenario_uses_the_line():
    calc = multifamily_calculator.MultifamilyCalculator
    assert 'self._current_line(year)' in inspect.getsource(calc.calculate_egi)
    assert 'self._current_opex(year)' in inspect.getsource(calc.calculate_noi)
    opex_src = inspect.getsource(calc._current_opex)
    assert "self._dec(line['total_opex'])" in opex_src
    assert 'management_fee_sql_predicate' in opex_src


def test_report_calculator_ties_when_handed_the_inputs(monkeypatch):
    calc = object.__new__(multifamily_calculator.MultifamilyCalculator)
    calc.project_id = 1
    calc._operating_inputs = dict(INPUTS)
    line = annual_operating_line(year=1, **INPUTS)
    monkeypatch.setattr(calc, '_current_opex', lambda year=1: {
        'total_opex': calc._dec(line['total_opex']),
        'expenses_by_category': {},
        'line_items': [],
    })
    out = calc.calculate_noi('current', 1)
    assert float(out['noi']) == pytest.approx(line['noi'], abs=0.01)
    assert float(out['gross_scheduled_rent']) == pytest.approx(line['gpr'])
    assert float(out['effective_gross_income']) == pytest.approx(line['egi'])


def test_whatif_supplies_no_figure_of_its_own():
    # A missing input is an error, never a default the user did not choose.
    with pytest.raises(ValueError, match='missing operating inputs'):
        WhatIfEngine._compute_income_metrics(None, {
            'income_assumptions': {'hold_period_years': 5},
            'tbl_project': {'total_units': 10},
            'annual_rental_income': 100_000.0,
            'total_opex': 30_000.0,
        })
