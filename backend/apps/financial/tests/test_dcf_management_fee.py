"""
The DCF counts the management fee once, and recomputes it in the terminal year
(ARGUS parity re-audit 2026-10-21, §2.5 and §2.6 — #LS-1021-01, #LS-1021-02).

Two defects, both in dcf_calculation_service.py:

1. Base opex summed every operating-expense row for the active statement,
   management-category rows included, and then the model added its own
   computed management fee (EGI × pct) on top. The Direct Cap view beside it
   (views_income_approach.py) strips the management category first, so the two
   tiles disagreed on the same property. The DCF query now carries
   `_NON_MANAGEMENT_OPEX_FILTER`; `is_management_expense_row` is its Python
   twin and is pinned here to the Direct Cap rule, case by case.

2. The terminal-year fee was Year N's fee grown at the EXPENSE growth rate.
   A fee that is a percentage of income must follow income: terminal fee =
   pct × terminal EGI. `terminal_management_fee` is now the single place both
   the annual and the monthly path compute it.

These are pure-function tests; the database paths are exercised by the
Valuation → Income → DCF screen against a project whose statement carries a
management line.
"""

import inspect

import pytest

from apps.financial.services import dcf_calculation_service as svc
from apps.financial.services import mf_rent_base
from apps.financial.services.dcf_calculation_service import (
    _NON_MANAGEMENT_OPEX_FILTER,
    is_management_expense_row,
    terminal_management_fee,
)


# ── 1. Only the management FEE line is replaced (decision 10a) ──────────────

@pytest.mark.parametrize('category, parent, expected', [
    ('management_fee', None, True),
    ('Management Fee', 'management', True),
    ('Management Fee (3%)', 'management', True),   # Chadron Terrace's label
    ('MANAGEMENT_FEE', 'administrative', True),    # the name decides, not the parent
    ('Mgmt Fee', None, True),
    ('Off-Site Management', 'management', True),   # the management company's charge
    ('management_offsite', 'management', True),
    ('On-Site Management', 'management', False),   # staff — stays an expense
    ('Payroll', 'management', False),              # filed under Management, not the fee
    ('Administrative', 'management', False),
    ('asset_management', 'management', False),
    ('Manager Rent Credit', 'administrative', False),
    ('property_taxes', 'taxes_insurance', False),
    ('management_software', 'administrative', False),
    (None, None, False),
    ('', '', False),
])
def test_fee_rule(category, parent, expected):
    assert is_management_expense_row(category, parent) is expected
    assert mf_rent_base.is_management_fee_row(category) is expected


def test_sql_filter_and_python_rule_share_one_pattern():
    # The two definitions cannot drift: the SQL is built from the same pattern
    # the Python regex compiles, over the same normalisation.
    assert mf_rent_base.MANAGEMENT_FEE_PATTERN in _NON_MANAGEMENT_OPEX_FILTER
    assert "REGEXP_REPLACE(LOWER(COALESCE(expense_category, '')), '[^a-z]+', ' ', 'g')" in _NON_MANAGEMENT_OPEX_FILTER
    assert 'AND NOT (' in _NON_MANAGEMENT_OPEX_FILTER
    assert 'parent_category' not in _NON_MANAGEMENT_OPEX_FILTER
    assert '%' not in _NON_MANAGEMENT_OPEX_FILTER   # safe beside %s parameters


def test_base_opex_query_carries_the_filter():
    # Guard against the filter being defined but not applied: the query that
    # sums tbl_operating_expenses must append it.
    source = inspect.getsource(svc.DCFCalculationService._get_base_data)
    assert 'FROM landscape.tbl_operating_expenses' in source
    assert '_NON_MANAGEMENT_OPEX_FILTER' in source


def test_direct_cap_view_uses_the_same_rule():
    from apps.financial import views_income_approach
    source = inspect.getsource(views_income_approach._get_income_approach_data)
    assert 'is_mgmt = is_management_fee_row(cat)' in source
    assert "parent_cat == 'management'" not in source


# ── 2. Terminal fee follows terminal income ─────────────────────────────────

def test_terminal_fee_is_pct_of_terminal_egi():
    assert terminal_management_fee(1_000_000.0, 0.03) == pytest.approx(30_000.0)


def test_terminal_fee_does_not_follow_expense_growth():
    """Income grows 3%, expenses grow 5%: the carried-forward figure (old code)
    and the recomputed figure (new code) differ, and only the new one is
    pct × terminal EGI."""
    year_n_egi = 1_000_000.0
    pct = 0.03
    year_n_fee = year_n_egi * pct                 # 30,000
    income_growth, expense_growth = 0.03, 0.05
    terminal_egi = year_n_egi * (1 + income_growth)  # 1,030,000

    old_way = year_n_fee * (1 + expense_growth)   # 31,500 — the July defect
    new_way = terminal_management_fee(terminal_egi, pct)  # 30,900

    assert new_way == pytest.approx(terminal_egi * pct)
    assert new_way != pytest.approx(old_way)
    assert old_way - new_way == pytest.approx(600.0)


def test_both_dcf_paths_call_the_shared_helper():
    annual = inspect.getsource(svc.DCFCalculationService.calculate)
    assert 'terminal_management_fee(terminal_egi, management_fee_pct)' in annual
    assert "last_year['management_fee'] * (1 + expense_growth_rate)" not in annual
    monthly_name = next(
        n for n in dir(svc.DCFCalculationService)
        if 'monthly' in n.lower() and callable(getattr(svc.DCFCalculationService, n))
        and 'terminal_management_fee' in inspect.getsource(getattr(svc.DCFCalculationService, n))
    )
    monthly = inspect.getsource(getattr(svc.DCFCalculationService, monthly_name))
    assert "year_n_mgmt_fee * (1 + expense_growth_rate)" not in monthly
