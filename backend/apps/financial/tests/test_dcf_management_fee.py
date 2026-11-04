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
from apps.financial.services.dcf_calculation_service import (
    _NON_MANAGEMENT_OPEX_FILTER,
    is_management_expense_row,
    terminal_management_fee,
)


# ── 1. Management rows are excluded by the same rule the Direct Cap view uses ──

@pytest.mark.parametrize('category, parent, expected', [
    ('management_fee', None, True),
    ('Management Fee', None, True),           # case-insensitive, as the view's .lower()
    ('MANAGEMENT_FEE', 'administrative', True),
    ('asset_management', 'management', True),  # any row under the management parent
    ('payroll', 'management', True),
    ('property_taxes', 'taxes_insurance', False),
    ('management_software', 'administrative', False),  # not the fee, not the parent
    (None, None, False),
    ('', '', False),
])
def test_python_twin_matches_direct_cap_rule(category, parent, expected):
    assert is_management_expense_row(category, parent) is expected


def test_sql_filter_names_the_same_categories_as_the_python_twin():
    # The two definitions must not drift: every literal the Python rule uses
    # appears in the SQL, and nothing else is matched.
    for cat in svc.MANAGEMENT_EXPENSE_CATEGORIES:
        assert f"'{cat}'" in _NON_MANAGEMENT_OPEX_FILTER
    assert f"= '{svc.MANAGEMENT_PARENT_CATEGORY}'" in _NON_MANAGEMENT_OPEX_FILTER
    assert 'LOWER(COALESCE(expense_category' in _NON_MANAGEMENT_OPEX_FILTER
    assert 'AND NOT (' in _NON_MANAGEMENT_OPEX_FILTER


def test_base_opex_query_carries_the_filter():
    # Guard against the filter being defined but not applied: the query that
    # sums tbl_operating_expenses must append it.
    source = inspect.getsource(svc.DCFCalculationService._get_base_data)
    assert 'FROM landscape.tbl_operating_expenses' in source
    assert '_NON_MANAGEMENT_OPEX_FILTER' in source


def test_direct_cap_view_still_uses_the_rule_we_mirror():
    # If views_income_approach changes its definition, this test says so and
    # the two must be re-aligned together.
    from apps.financial import views_income_approach
    source = inspect.getsource(views_income_approach)
    assert "('management_fee', 'management fee')" in source
    assert "parent_cat == 'management'" in source


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
