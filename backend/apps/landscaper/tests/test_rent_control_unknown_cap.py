"""
Unknown rent-control cap must never be filled in with an invented figure.

Before this test, `calculate_ltl_recovery_impact` fell back to `Decimal('0.05')`
(vacancy-decontrol branch) or `Decimal('0.03')` (no-decontrol branch) whenever the
jurisdiction record carried no maximum allowable increase. That guess was both fed
into the recovery math and interpolated into prose the user reads as a statement of
law ("Rent increases capped at 5% annually for existing tenants.").

These tests pin both halves of the rule: no invented rate in the numbers, and no
invented rate in the narrative.
"""

import re
from decimal import Decimal

from apps.landscaper.services.rent_control_service import (
    RentControlImpact,
    RentControlService,
    RentControlStatus,
    format_rent_control_summary,
)


PERCENT_RE = re.compile(r'\d+(?:\.\d+)?\s*%')


def _status(**overrides) -> RentControlStatus:
    base = dict(
        is_rent_controlled=True,
        is_exempt=False,
        exemption_reason=None,
        ordinance_name='Some Local Ordinance',
        max_annual_increase=None,
        allows_vacancy_decontrol=True,
        jurisdiction_city='springfield',
        jurisdiction_state='CA',
        notes=None,
    )
    base.update(overrides)
    return RentControlStatus(**base)


def _impact_for(status: RentControlStatus) -> RentControlImpact:
    service = RentControlService(project_id=1)
    service.get_rent_control_status = lambda: status  # type: ignore[method-assign]
    return service.calculate_ltl_recovery_impact(
        annual_loss_to_lease=Decimal('268000'),
        total_current_rent=Decimal('60000'),
    )


def test_unknown_cap_produces_no_recovery_numbers_with_decontrol():
    impact = _impact_for(_status(allows_vacancy_decontrol=True))

    assert impact.max_annual_increase is None
    assert impact.annual_recovery_potential is None
    assert impact.unrealized_ltl_year1 is None
    assert impact.years_to_full_recovery is None
    # Rent control still applies — the constraint is real, only unquantified.
    assert impact.has_impact is True


def test_unknown_cap_produces_no_recovery_numbers_without_decontrol():
    impact = _impact_for(_status(allows_vacancy_decontrol=False))

    assert impact.max_annual_increase is None
    assert impact.annual_recovery_potential is None
    assert impact.unrealized_ltl_year1 is None
    assert impact.years_to_full_recovery is None


def test_unknown_cap_states_no_percentage_in_prose():
    for decontrol in (True, False):
        impact = _impact_for(_status(allows_vacancy_decontrol=decontrol))

        # The old fallbacks would have produced "5%" / "3%" here.
        assert not PERCENT_RE.search(impact.notes), impact.notes
        assert '5%' not in impact.notes
        assert '3%' not in impact.notes
        assert 'not on record' in impact.notes.lower()


def test_unknown_cap_serializes_without_inventing_a_rate():
    payload = _impact_for(_status()).to_dict()

    assert payload['max_annual_increase'] is None
    assert payload['annual_recovery_potential'] is None
    assert payload['unrealized_ltl_year1'] is None
    assert payload['years_to_full_recovery'] is None
    assert not PERCENT_RE.search(payload['notes'])


def test_summary_reports_unknown_cap_rather_than_a_number():
    status = _status()
    impact = _impact_for(status)

    summary = format_rent_control_summary(status, impact)

    assert not PERCENT_RE.search(summary), summary
    assert 'Not on record' in summary
    # Names what is needed to resolve it, and where.
    assert 'governing ordinance' in summary
    assert 'Springfield, CA' in summary
    assert 'Recovery analysis unavailable' in summary


def test_known_cap_still_calculates_and_cites_the_record():
    status = _status(
        max_annual_increase=Decimal('0.04'),
        ordinance_name='LA RSO',
    )
    impact = _impact_for(status)

    assert impact.max_annual_increase == Decimal('0.04')
    assert impact.annual_recovery_potential == Decimal('60000') * 12 * Decimal('0.04')
    assert impact.years_to_full_recovery is not None
    assert '4%' in impact.notes
    assert 'LA RSO record on file' in impact.notes

    summary = format_rent_control_summary(status, impact)
    assert '4.0%' in summary
    assert 'per jurisdiction record' in summary


def test_zero_rent_roll_does_not_break_the_sentence():
    """years_to_recover is None when there is no rent to increase — prose must hold."""
    status = _status(max_annual_increase=Decimal('0.04'))
    service = RentControlService(project_id=1)
    service.get_rent_control_status = lambda: status  # type: ignore[method-assign]

    impact = service.calculate_ltl_recovery_impact(
        annual_loss_to_lease=Decimal('268000'),
        total_current_rent=Decimal('0'),
    )

    assert impact.years_to_full_recovery is None
    assert 'not calculable' in impact.notes
    assert format_rent_control_summary(status, impact)  # must not raise
