"""
Reading a screen must not write a financial assumption.

The defect (fixed 2026-09-04): ``DcfAnalysis.get_or_create_for_project`` created
the record with eight assumptions baked into its ``defaults`` — discount rate
10%, exit cap 6%, selling costs 2%, going-in cap 5.5%, credit loss 1%,
management fee 3%, stabilized vacancy 5%, bulk-sale discount 15% (plus a 10-year
hold). Three call sites reached it and two of them were pure reads, so opening
the DCF screen, or asking Landscaper about the cash flow, persisted all eight.
Afterwards nothing on the record, in the API, or on the page distinguished them
from numbers the user had chosen.

The product owner's rule: the app must never supply a financial assumption the
user did not choose.
"""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.financial.models_valuation import DcfAnalysis, IncomeApproach
from apps.financial.services.dcf_assumptions_service import DcfAssumptionsService
from apps.financial.services.growth_rate_service import GrowthRateService
from apps.projects.models import Project


# Every assumption the old defaults dict wrote, by property type.
_LAND_ASSUMPTION_FIELDS = (
    'hold_period_years', 'discount_rate', 'exit_cap_rate', 'selling_costs_pct',
    'bulk_sale_discount_pct',
)
_CRE_ASSUMPTION_FIELDS = _LAND_ASSUMPTION_FIELDS + (
    'going_in_cap_rate', 'cap_rate_method', 'sensitivity_interval',
    'vacancy_rate', 'stabilized_vacancy', 'credit_loss', 'management_fee_pct',
    'reserves_per_unit',
)


@pytest.fixture
def owner(db):
    return get_user_model().objects.create_user(
        username='w2a1_owner', email='w2a1_owner@example.com', password='TestPass123!',
    )


@pytest.fixture
def api(owner):
    """DRF client authenticated as the project owner (the API is JWT-only)."""
    client = APIClient()
    client.force_authenticate(owner)
    return client


def _project(owner, name, type_code):
    return Project.objects.create(
        project_name=name, project_type_code=type_code, created_by=owner,
    )


@pytest.fixture
def land_project(db, owner):
    return _project(owner, 'W2A1 Land', 'LAND')


@pytest.fixture
def mf_project(db, owner):
    return _project(owner, 'W2A1 MF', 'MF')


# ── The write itself ────────────────────────────────────────────────────────

def test_reading_the_dcf_record_creates_nothing(db, land_project):
    """``get_for_project`` is the read path. It must leave the table untouched."""
    assert DcfAnalysis.get_for_project(land_project) is None
    assert not DcfAnalysis.objects.filter(project=land_project).exists()


def test_the_service_reads_without_creating_a_record(db, mf_project):
    """This is the path the chat assistant and the cash-flow artifact take.

    It used to call get_or_create_for_project, so merely asking about a deal
    persisted a full set of assumptions into it.
    """
    service = DcfAssumptionsService(mf_project.project_id)
    # The growth-rate library lives in raw-SQL tables with no Django model, so
    # it is absent from the test database; stub the lookup, not the record read.
    with patch.object(GrowthRateService, 'get_default_set_id', return_value=None):
        assumptions = service.get_all_assumptions()

    assert not DcfAnalysis.objects.filter(project=mf_project).exists()
    assert service.has_saved_record is False
    # And it reports the gap rather than filling it.
    for field in ('discount_rate', 'exit_cap_rate', 'selling_costs_pct',
                  'going_in_cap_rate', 'credit_loss', 'management_fee_pct',
                  'stabilized_vacancy', 'vacancy_rate', 'hold_period_years'):
        assert assumptions[field] is None, f'{field} was substituted, not left unset'


@pytest.mark.parametrize('type_code, fields', [
    ('LAND', _LAND_ASSUMPTION_FIELDS),
    ('MF', _CRE_ASSUMPTION_FIELDS),
])
def test_the_write_path_creates_an_empty_record(db, owner, type_code, fields):
    """A record may be created when the user is actually saving — but it starts
    empty. Not one assumption arrives with a value nobody typed."""
    project = _project(owner, f'W2A1 {type_code}', type_code)
    dcf, created = DcfAnalysis.get_or_create_for_project(project)

    assert created is True
    dcf.refresh_from_db()
    for field in fields:
        assert getattr(dcf, field) is None, (
            f'{field} was persisted as {getattr(dcf, field)!r} without the user choosing it'
        )


def test_a_stored_value_still_survives_a_read(db, land_project):
    """The fix must not lose a real decision: what the user entered comes back."""
    dcf, _ = DcfAnalysis.get_or_create_for_project(land_project)
    dcf.discount_rate = '0.1750'
    dcf.save(update_fields=['discount_rate'])

    service = DcfAssumptionsService(land_project.project_id)
    assert service.get_common_assumptions()['discount_rate'] == pytest.approx(0.175)
    assert service.has_saved_record is True


def test_a_user_entered_zero_is_not_confused_with_unset(db, land_project):
    """0% selling costs is an answer. It must not read back as 'not set'."""
    dcf, _ = DcfAnalysis.get_or_create_for_project(land_project)
    dcf.selling_costs_pct = '0.0000'
    dcf.save(update_fields=['selling_costs_pct'])

    common = DcfAssumptionsService(land_project.project_id).get_common_assumptions()
    assert common['selling_costs_pct'] == 0.0
    assert common['selling_costs_pct'] is not None
    assert common['exit_cap_rate'] is None  # genuinely unset, for contrast


# ── The HTTP read path ──────────────────────────────────────────────────────

def test_get_dcf_analysis_endpoint_does_not_create_a_record(db, api, mf_project):
    """The screen fetch. A GET is not a decision."""
    response = api.get(f'/api/valuation/dcf-analysis/{mf_project.project_id}/')

    assert response.status_code == 200
    assert not DcfAnalysis.objects.filter(project=mf_project).exists()

    body = response.json()
    assert body['exists'] is False
    assert body['created'] is False
    for field in ('discount_rate', 'exit_cap_rate', 'selling_costs_pct',
                  'going_in_cap_rate', 'credit_loss', 'management_fee_pct',
                  'stabilized_vacancy'):
        assert body[field] is None, f'GET served a {field} nobody entered'
    # Growth rates are resolved from a set the user links. With no set there is
    # no rate — not the old 3% house number.
    assert body['income_growth_rate'] is None
    assert body['price_growth_rate'] is None


def test_patch_creates_the_record_with_only_what_was_sent(db, api, mf_project):
    """The save path still works — and still writes only the user's own value."""
    response = api.patch(
        f'/api/valuation/dcf-analysis/{mf_project.project_id}/',
        data={'discount_rate': '0.0825'},
        format='json',
    )

    assert response.status_code == 200
    dcf = DcfAnalysis.objects.get(project=mf_project)
    assert float(dcf.discount_rate) == pytest.approx(0.0825)
    for field in ('exit_cap_rate', 'going_in_cap_rate', 'credit_loss',
                  'management_fee_pct', 'stabilized_vacancy', 'selling_costs_pct'):
        assert getattr(dcf, field) is None, f'saving one field also invented {field}'


# ── The income-approach record ──────────────────────────────────────────────

def test_income_approach_records_start_without_a_cap_rate(db, mf_project):
    """tbl_income_approach had its own create-on-read defaults: a 5.25% selected
    cap rate, a 'comparable sales' derivation, and a model-level 5% stabilized
    vacancy — all persisted by a page view."""
    income_approach = IncomeApproach.objects.create(project_id=mf_project.project_id)
    income_approach.refresh_from_db()

    assert income_approach.selected_cap_rate is None
    assert income_approach.market_cap_rate_method is None
    assert income_approach.stabilized_vacancy_rate is None
