"""
A deliberately zeroed renovation rent premium stays zero, and an unset one is
not replaced with a number the user never chose (W2-D2).

The defect: the post-renovation rent premium was read as
``float(value_add.get('rent_premium_pct', 0.15) or 0.15)``. In Python a stored
0 is falsy, so ``0 or 0.15`` is 0.15 — a user who deliberately set the rent lift
to ZERO got 15% instead, inflating projected rents, NOI and the return on
exactly the deals where someone was being careful. Two sibling readers had the
same shape with 0.30, and the Next.js value-add route had it with 0.40.

Product owner's rule (2026-09-04): the app must never supply a financial
assumption the user did not choose. So an unset premium now means NO rent lift,
and the schedule carries a flag so a renderer can say why the line reads $0.
"""

from unittest.mock import patch

import pytest

from apps.financial.services.dcf_calculation_service import (
    DCFCalculationService,
    RENT_PREMIUM_NOT_SET_REASON,
    build_renovation_schedule,
)
from apps.financial.services.unit_rent_schedule_service import UnitRentScheduleService


PER_UNIT_RENT = 1000.0

# A program small enough to hand-check: 4 units, 2 starts/month from month 1,
# 1 month to renovate, 1 month relet lag, 12-month hold. Both batches re-lease
# well inside the hold, so a premium — if one is applied — must show up.
_PROGRAM = dict(
    total_units=4,
    avg_unit_sf=800.0,
    per_unit_monthly_rent=PER_UNIT_RENT,
    hold_period_months=12,
)

_BASE_ASSUMPTIONS = {
    'renovate_all': True,
    'reno_starts_per_month': 2,
    'reno_start_month': 1,
    'months_to_complete': 1,
    'relet_lag_months': 1,
    'reno_cost_per_sf': 25.0,
    'relocation_incentive': 3500.0,
}


def _schedule(**premium_kwargs):
    return build_renovation_schedule(
        value_add={**_BASE_ASSUMPTIONS, **premium_kwargs}, **_PROGRAM
    )


# ── A stored 0 survives as 0 ────────────────────────────────────────────────

def test_a_stored_zero_premium_stays_zero():
    """The headline defect. 0 is an answer, not a missing value."""
    sched = _schedule(rent_premium_pct=0)

    assert sched['premium_per_unit'] == 0.0
    assert sum(sched['rent_premium_gain']) == 0.0
    # A deliberate zero is a CHOICE, so it is not flagged as unset.
    assert sched['rent_premium_not_set'] is False


@pytest.mark.parametrize('zero', [0, 0.0])
def test_a_stored_zero_never_becomes_the_old_fallback(zero):
    """Regression: 0 must not be promoted to 15% (or 30%, or 40%)."""
    zeroed = _schedule(rent_premium_pct=zero)
    fifteen = _schedule(rent_premium_pct=0.15)

    assert sum(fifteen['rent_premium_gain']) > 0, 'control: a real premium lifts rent'
    assert sum(zeroed['rent_premium_gain']) == 0.0
    assert zeroed['rent_premium_gain'] != fifteen['rent_premium_gain']


def test_a_real_premium_is_still_applied_unchanged():
    """Guard against over-correcting: non-zero premiums behave as before."""
    sched = _schedule(rent_premium_pct=0.15)
    assert sched['premium_per_unit'] == pytest.approx(PER_UNIT_RENT * 0.15)
    assert sched['rent_premium_not_set'] is False


# ── An unset premium is not invented ────────────────────────────────────────

@pytest.mark.parametrize(
    'unset', [{}, {'rent_premium_pct': None}], ids=['key-absent', 'key-None']
)
def test_an_unset_premium_does_not_become_a_number(unset):
    sched = build_renovation_schedule(
        value_add={**_BASE_ASSUMPTIONS, **unset}, **_PROGRAM
    )

    assert sched['premium_per_unit'] == 0.0
    assert sum(sched['rent_premium_gain']) == 0.0
    # ...and the caller is TOLD it was unset, so the $0 line can be explained
    # rather than read as a premium that happened to be worth nothing.
    assert sched['rent_premium_not_set'] is True
    assert 'not set' in RENT_PREMIUM_NOT_SET_REASON


def test_unset_and_deliberate_zero_are_distinguishable():
    """Same money, different meaning — the flag is what separates them."""
    unset = build_renovation_schedule(value_add=dict(_BASE_ASSUMPTIONS), **_PROGRAM)
    chosen_zero = _schedule(rent_premium_pct=0)

    assert unset['rent_premium_gain'] == chosen_zero['rent_premium_gain']
    assert unset['rent_premium_not_set'] is not chosen_zero['rent_premium_not_set']


# ── The loaders must not flatten NULL to 0 before the builder sees it ───────

class _FakeCursor:
    """Cursor returning queued fetchone() rows, one per execute()."""

    def __init__(self, rows):
        self._rows = list(rows)
        self._i = -1

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def execute(self, *a, **k):
        self._i += 1

    def fetchone(self):
        return self._rows[self._i] if self._i < len(self._rows) else None


def _dcf_value_add(stored_premium):
    """DCFCalculationService._get_value_add_assumptions over a stubbed DB row."""
    svc = DCFCalculationService.__new__(DCFCalculationService)
    svc.project_id = 42
    # First execute(): tbl_project.value_add_enabled. Second: the assumptions row,
    # whose index 9 is rent_premium_pct.
    va_row = (True, 25.0, 'sf', 3500.0, True, None, 2, 1, 1, stored_premium, 1)
    with patch(
        'apps.financial.services.dcf_calculation_service.connection.cursor',
        return_value=_FakeCursor([(True,), va_row]),
    ):
        return svc._get_value_add_assumptions()


def test_dcf_loader_keeps_a_stored_zero_and_a_null_apart():
    assert _dcf_value_add(0)['rent_premium_pct'] == 0.0
    # NULL must arrive as None, not as _decimal_to_float's 0.0 — otherwise the
    # builder cannot tell "unset" from "the user chose zero".
    assert _dcf_value_add(None)['rent_premium_pct'] is None


def _unit_rent_value_add(stored_premium):
    svc = UnitRentScheduleService.__new__(UnitRentScheduleService)
    svc.project_id = 42
    row = (True, 1, 2, 1, 1, 25.0, 'sf', 3500.0, stored_premium, True, None)
    with patch(
        'apps.financial.services.unit_rent_schedule_service.connection.cursor',
        return_value=_FakeCursor([row]),
    ):
        return svc._get_value_add_assumptions()


def test_unit_rent_loader_keeps_a_stored_zero_and_does_not_invent_30_percent():
    assert _unit_rent_value_add(0)['rent_premium_pct'] == 0.0
    assert _unit_rent_value_add(0.25)['rent_premium_pct'] == pytest.approx(0.25)
    assert _unit_rent_value_add(None)['rent_premium_pct'] is None


def test_renovation_schedule_service_invents_no_premium_when_no_row_exists():
    """The third sibling's 0.30 literal, in its DoesNotExist branch."""
    from apps.calculations.renovation_schedule_service import RenovationScheduleService
    from apps.multifamily.models import ValueAddAssumptions

    svc = RenovationScheduleService.__new__(RenovationScheduleService)
    svc.project_id = 42
    with patch.object(
        ValueAddAssumptions.objects,
        'get',
        side_effect=ValueAddAssumptions.DoesNotExist,
    ):
        assert svc._load_assumptions()['rent_premium_pct'] is None
