"""
Publisher-code resolution for market series (services/market_ingest_py/.../provider_codes.py).

Every expected code below was checked against the live BLS or FRED API on 2026-09-29.
The two negative cases are the defect this module exists to stop: a code that names one
place (Phoenix's PHOE004NA) being used for another place.
"""
import sys
from pathlib import Path

import pytest

_PKG = Path(__file__).resolve().parents[4] / 'services' / 'market_ingest_py'
if str(_PKG) not in sys.path:
    sys.path.insert(0, str(_PKG))

from market_ingest.provider_codes import resolve_provider_code  # noqa: E402

pytestmark = pytest.mark.unit


@pytest.mark.parametrize('template, kwargs, expected', [
    # BLS LAUS
    ('LAS{LAUS_AREA}03', dict(geo_level='STATE', state_fips='04'), 'LASST040000000000003'),
    ('LAU{LAUS_AREA}03', dict(geo_level='MSA', state_fips='04', cbsa_code='38060'), 'LAUMT043806000000003'),
    ('LAU{LAUS_AREA}03', dict(geo_level='MSA', state_fips='06', cbsa_code='31080'), 'LAUMT063108000000003'),
    ('LAU{LAUS_AREA}03', dict(geo_level='COUNTY', state_fips='04', county_fips='013'), 'LAUCN040130000000003'),
    ('LAU{LAUS_AREA}05', dict(geo_level='COUNTY', state_fips='04', county_fips='04021'), 'LAUCN040210000000005'),
    ('LAU{LAUS_AREA}03', dict(geo_level='CITY', state_fips='04', place_fips='55000'), 'LAUCT045500000000003'),
    # BLS CES
    ('SMS{CES_AREA}0000000001', dict(geo_level='MSA', state_fips='04', cbsa_code='38060'), 'SMS04380600000000001'),
    ('SMS{CES_AREA}0000000001', dict(geo_level='STATE', state_fips='04'), 'SMS04000000000000001'),
    ('SMU{CES_AREA}2000000001', dict(geo_level='MSA', state_fips='04', cbsa_code='38060'), 'SMU04380602000000001'),
    # FRED templates
    ('{STATE_ABBR}NA', dict(geo_level='STATE', state_fips='04'), 'AZNA'),
    ('{STATE_ABBR}POP', dict(geo_level='STATE', state_fips='06'), 'CAPOP'),
    ('ATNHPIUS{CBSA_CODE}Q', dict(geo_level='MSA', state_fips='04', cbsa_code='46060'), 'ATNHPIUS46060Q'),
    # national codes need no geography
    ('CPIAUCSL', dict(geo_level='US'), 'CPIAUCSL'),
])
def test_resolves(template, kwargs, expected):
    code, reason = resolve_provider_code(template, **kwargs)
    assert reason is None
    assert code == expected


def test_fixed_place_code_refused_below_nation():
    code, reason = resolve_provider_code('PHOE004NA', geo_level='MSA', state_fips='04', cbsa_code='46060')
    assert code is None
    assert 'one fixed place' in reason


def test_override_wins():
    code, reason = resolve_provider_code(None, geo_level='MSA', override='PHXRNSA')
    assert (code, reason) == ('PHXRNSA', None)


def test_csa_has_no_laus_area():
    # 429 is the Phoenix-Mesa CSA, not a metro; BLS has no series for it.
    code, reason = resolve_provider_code('LAU{LAUS_AREA}03', geo_level='MSA', state_fips='04', cbsa_code='429')
    assert code is None and 'cannot be derived' in reason


def test_unknown_placeholder_refused():
    code, reason = resolve_provider_code('SMU{STATE_FIPS}{SUPERSECTOR}', geo_level='STATE', state_fips='04')
    assert code is None
