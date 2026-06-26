"""
Deterministic tests for the renovation-breakdown math (RV).

Locks the tie-out to the Renovation page: the per-unit renovation cost is the
$/SF rate spread across gross building SF and applied uniformly per unit. Verified
against project 17 (Chadron Terrace): $25/SF, gross_sf 138,504, 113 units ->
$30,642/unit -> $3,462,600 renovation total, exactly matching the page. The pure
helper needs no DB, so this runs in CI.
"""

from apps.landscaper.tools.renovation_tools import compute_renovation_breakdown

# Chadron Terrace real shape: (bedrooms, unit_count). 1 studio/commercial + 26 1BR
# + 57 2BR + 29 3BR = 113.
CHADRON_GROUPS = [(0, 1), (1, 26), (2, 57), (3, 29)]
CHADRON = dict(reno_cost_per_sf=25.0, relocation_incentive=3500.0,
               renovate_all=True, gross_sf=138504.0, groups=CHADRON_GROUPS)


def test_program_total_ties_to_page():
    r = compute_renovation_breakdown(**CHADRON)
    assert r['computable'] is True
    p = r['program']
    assert p['cost_per_unit'] == 30642          # page shows $30,642 / unit
    assert p['unit_count'] == 113
    assert p['renovation_total'] == 3462600      # page shows $3.46M
    assert p['relocation_total'] == 395500       # page shows ~$396K
    assert p['basis'] == 'blended_uniform_per_unit'


def test_one_bedroom_slice():
    r = compute_renovation_breakdown(**CHADRON, bedrooms_filter=1)
    assert r['slice_empty'] is False
    assert len(r['rows']) == 1
    row = r['rows'][0]
    assert row['bedrooms'] == 1
    assert row['unit_count'] == 26
    assert row['renovation_cost'] == 796704
    assert row['relocation_cost'] == 91000
    assert row['total'] == 887704


def test_full_breakdown_rows_sum_to_program_within_rounding():
    r = compute_renovation_breakdown(**CHADRON)
    reno_sum = sum(row['renovation_cost'] for row in r['rows'])
    # Per-row rounding can drift by a dollar or two from the program total.
    assert abs(reno_sum - r['program']['renovation_total']) <= 5
    assert sum(row['unit_count'] for row in r['rows']) == 113


def test_empty_slice_returns_available_types_not_a_fabrication():
    # A bedroom count with no units (Chadron has no 4-beds).
    r = compute_renovation_breakdown(**CHADRON, bedrooms_filter=4)
    assert r['slice_empty'] is True
    assert r['requested_bedrooms'] == 4
    assert 'rows' not in r  # no fabricated rows
    labels = {t['unit_type'] for t in r['available_unit_types']}
    assert '1BR' in labels and '2BR' in labels and '3BR' in labels


def test_relocation_excluded_when_not_renovate_all():
    r = compute_renovation_breakdown(
        reno_cost_per_sf=25.0, relocation_incentive=3500.0, renovate_all=False,
        gross_sf=138504.0, groups=CHADRON_GROUPS, bedrooms_filter=1)
    assert r['rows'][0]['relocation_cost'] == 0
    assert r['rows'][0]['total'] == r['rows'][0]['renovation_cost']


def test_not_computable_without_sf_or_units():
    assert compute_renovation_breakdown(
        reno_cost_per_sf=25.0, relocation_incentive=3500.0, renovate_all=True,
        gross_sf=0.0, groups=CHADRON_GROUPS)['computable'] is False
    assert compute_renovation_breakdown(
        reno_cost_per_sf=25.0, relocation_incentive=3500.0, renovate_all=True,
        gross_sf=138504.0, groups=[])['computable'] is False
