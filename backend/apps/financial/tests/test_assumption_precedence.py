"""
Valuation-assumption precedence + the post-reno rent guard
(LSCMD-PD-ASSUMPFIX-0813-PD28, Fixes 2 and 4).

Fix 2 — Lynn Villa had vacancy_rate = 0.0200 stored on tbl_dcf_analysis and
rendered 3.0%, because get_all_assumptions() merged the OM-extracted
tbl_project_assumption row AFTER the dcf record and dict-spread let it win.
get_dcf_parameters() never read the four disputed columns at all.

Gregg's ruling (2026-08-13): explicit user setting > OM-extracted value >
engine default. A NULL column is not an opinion — it must fall through rather
than clobber extracted data with a generic default.
"""

from unittest.mock import patch

import pytest

from apps.financial.services.income_approach_service import IncomeApproachDataService
from apps.knowledge.services.column_discovery import _match_column_to_field


# ── Fix 2: precedence ───────────────────────────────────────────────────────

def _service_with_overrides(row):
    """IncomeApproachDataService whose tbl_dcf_analysis read returns `row`."""
    svc = IncomeApproachDataService(42)

    class _Cursor:
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def execute(self, *a, **k): pass
        def fetchone(self): return row

    return svc, patch(
        'apps.financial.services.income_approach_service.connection.cursor',
        return_value=_Cursor(),
    )


def test_non_null_columns_become_overrides():
    # (vacancy_rate, credit_loss, management_fee_pct, reserves_per_unit)
    svc, cursor_patch = _service_with_overrides((0.02, 0.005, 0.04, 275))
    with cursor_patch:
        assert svc.get_valuation_overrides() == {
            'vacancy_rate': 0.02,
            'credit_loss_rate': 0.005,
            'management_fee_pct': 0.04,
            'replacement_reserves_per_unit': 275.0,
        }


def test_null_columns_are_omitted_not_defaulted():
    """The Lynn Villa shape: vacancy set, the other three NULL.

    The three NULLs must be ABSENT from the override dict — present-but-default
    would overwrite the extracted values and change expenses, which is exactly
    what Gregg ruled against.
    """
    svc, cursor_patch = _service_with_overrides((0.02, None, None, None))
    with cursor_patch:
        assert svc.get_valuation_overrides() == {'vacancy_rate': 0.02}


def test_all_null_yields_no_overrides():
    svc, cursor_patch = _service_with_overrides((None, None, None, None))
    with cursor_patch:
        assert svc.get_valuation_overrides() == {}


def test_missing_row_yields_no_overrides():
    svc, cursor_patch = _service_with_overrides(None)
    with cursor_patch:
        assert svc.get_valuation_overrides() == {}


def test_overrides_are_applied_last_in_get_all_assumptions():
    """Precedence, asserted at the accessor: the user's value wins, and the
    keys it does NOT set keep the extracted values beneath them."""
    svc = IncomeApproachDataService(42)
    extracted = {
        'vacancy_rate': 0.03,                    # from physical_vacancy_pct
        'credit_loss_rate': 0.0025,              # from bad_debt_pct
        'management_fee_pct': 0.0375,            # from management_fee_pct
        'replacement_reserves_per_unit': 250.0,  # from capex_per_unit
    }
    with patch.object(svc, 'get_dcf_parameters', return_value={}), \
         patch.object(svc, 'get_vacancy_assumptions', return_value=dict(extracted)), \
         patch.object(svc, 'get_growth_rates', return_value={}), \
         patch.object(svc, 'get_operating_assumptions', return_value={}), \
         patch.object(svc, 'get_capitalization_params', return_value={}), \
         patch.object(svc, 'get_valuation_overrides', return_value={'vacancy_rate': 0.02}):
        out = svc.get_all_assumptions()

    assert out['vacancy_rate'] == 0.02                      # user setting wins
    assert out['credit_loss_rate'] == 0.0025                # extracted survives
    assert out['management_fee_pct'] == 0.0375              # extracted survives
    assert out['replacement_reserves_per_unit'] == 250.0    # extracted survives


def test_override_read_failure_degrades_instead_of_raising():
    svc = IncomeApproachDataService(42)
    with patch('apps.financial.services.income_approach_service.connection.cursor',
               side_effect=RuntimeError('column does not exist')):
        assert svc.get_valuation_overrides() == {}


# ── Fix 4: post-reno rents never bind to a current/market rent field ────────

@pytest.mark.parametrize('header', [
    'Post-Reno Rent', 'Post Reno Rent', 'Renovated Rent', 'Reno Rent',
    'Upgraded Rent', 'Post-Renovation Rental Rate', 'Premium Rent',
    'Post Reno Pro Forma',
])
def test_post_reno_rent_columns_are_refused(header):
    field, _confidence = _match_column_to_field(header, [])
    assert field is None, f'{header!r} leaked into {field}'


@pytest.mark.parametrize('header,expected', [
    ('Market Rent', 'market_rent'),
    ('Asking Rent', 'market_rent'),
    ('Current Rent', 'current_rent'),
    ('Monthly Rent', 'current_rent'),
    # The renovation columns have their OWN correct mappings and must survive —
    # the guard keys on renovation vocabulary, so these are the regression risk.
    ('Reno Status', 'renovation_status'),
    ('Renovation Date', 'renovation_date'),
    ('Reno Cost', 'renovation_cost'),
])
def test_legitimate_columns_still_map(header, expected):
    field, _confidence = _match_column_to_field(header, [])
    assert field == expected
