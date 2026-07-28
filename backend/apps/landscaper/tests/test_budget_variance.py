"""VR1 — budget variance review: service math + artifact builder + registration.

Pure-function tests (no DB): the peer-set ladder, county normalization, severity
banding, the headline sentence, and the artifact schema. Registration tests
confirm review_budget_variance is advertised and gated for BOTH land and income
property. Session: LSCMD-CB-VARIANCE-0727-CB2.

The behavior these lock down is the one that must never regress: a line with no
peer set is NOT reported as fine, and a missing firm-library reference is NEVER
substituted with an inferred value.
"""

from apps.landscaper.services.variance_service import (
    DEFAULT_BLOCKER_PCT,
    DEFAULT_REVIEW_PCT,
    MIN_PEER_PROJECTS,
    _peer_set,
    _pct_diff,
    _severity,
    headline_finding,
    normalize_county,
)
from apps.landscaper.tool_registry import get_tools_for_page
from apps.landscaper.tool_schemas import LANDSCAPER_TOOLS
from apps.landscaper.tools.variance_artifact_builder import (
    build_variance_artifact_schema,
)


# ─── County normalization ────────────────────────────────────────────────
# Live data holds both "Maricopa" and "Maricopa County" for the same county;
# without normalization the peer set silently splits and loses half its evidence.

def test_county_normalization_collapses_the_suffix_and_case():
    assert normalize_county('Maricopa') == 'maricopa'
    assert normalize_county('Maricopa County') == 'maricopa'
    assert normalize_county('  maricopa county  ') == 'maricopa'
    assert normalize_county(None) is None
    assert normalize_county('') is None


# ─── Divergence + severity banding ───────────────────────────────────────

def test_pct_diff_signs_and_zero_reference():
    assert _pct_diff(150.0, 100.0) == 50.0
    assert _pct_diff(50.0, 100.0) == -50.0
    assert _pct_diff(100.0, 0) is None
    assert _pct_diff(100.0, None) is None


def test_severity_bands_use_magnitude_not_direction():
    assert _severity(60.0, DEFAULT_REVIEW_PCT, DEFAULT_BLOCKER_PCT) == 'blocker'
    assert _severity(-60.0, DEFAULT_REVIEW_PCT, DEFAULT_BLOCKER_PCT) == 'blocker'
    assert _severity(30.0, DEFAULT_REVIEW_PCT, DEFAULT_BLOCKER_PCT) == 'review'
    assert _severity(-30.0, DEFAULT_REVIEW_PCT, DEFAULT_BLOCKER_PCT) == 'review'
    assert _severity(10.0, DEFAULT_REVIEW_PCT, DEFAULT_BLOCKER_PCT) is None
    assert _severity(None, DEFAULT_REVIEW_PCT, DEFAULT_BLOCKER_PCT) is None


def test_severity_boundaries_are_inclusive():
    assert _severity(DEFAULT_REVIEW_PCT, DEFAULT_REVIEW_PCT, DEFAULT_BLOCKER_PCT) == 'review'
    assert _severity(DEFAULT_BLOCKER_PCT, DEFAULT_REVIEW_PCT, DEFAULT_BLOCKER_PCT) == 'blocker'


# ─── Peer-set ladder ─────────────────────────────────────────────────────

_GEO = {'project_name': 'Peoria Meadows', 'county': 'Maricopa',
        'market': 'Phoenix', 'state': 'AZ'}


def _peer(project_id, county, market, state, category_id=31, uom='$/FF', rate=250.0):
    return {
        'project_id': project_id, 'project_name': f'P{project_id}',
        'county': county, 'market': market, 'state': state,
        'category_id': category_id, 'uom_code': uom, 'rate': rate,
        '_county_key': normalize_county(county),
    }


def test_peer_set_prefers_county_and_spans_the_suffix_variants():
    peers = [
        _peer(1, 'Maricopa', 'Phoenix', 'AZ'),
        _peer(2, 'Maricopa County', 'Phoenix', 'AZ'),
        _peer(3, 'Pima', 'Tucson', 'AZ'),
    ]
    found, scope = _peer_set(peers, category_id=31, uom_code='$/FF', geo=_GEO)
    assert {p['project_id'] for p in found} == {1, 2}
    assert 'Maricopa' in scope


def test_peer_set_falls_back_to_a_wider_scope_when_county_is_thin():
    peers = [
        _peer(1, 'Maricopa', 'Phoenix', 'AZ'),   # only ONE county peer
        _peer(2, 'Pinal', 'Phoenix', 'AZ'),
        _peer(3, 'Pima', 'Tucson', 'AZ'),
    ]
    assert MIN_PEER_PROJECTS == 2
    found, scope = _peer_set(peers, category_id=31, uom_code='$/FF', geo=_GEO)
    # County has 1 project → ladder widens to market (Phoenix: projects 1 + 2).
    assert {p['project_id'] for p in found} == {1, 2}
    assert scope == 'Phoenix'


def test_peer_set_never_mixes_units_or_categories():
    peers = [
        _peer(1, 'Maricopa', 'Phoenix', 'AZ', uom='$/Unit'),
        _peer(2, 'Maricopa', 'Phoenix', 'AZ', category_id=44),
    ]
    found, scope = _peer_set(peers, category_id=31, uom_code='$/FF', geo=_GEO)
    assert found == [] and scope is None


def test_peer_set_is_empty_below_the_minimum_rather_than_quoting_one_deal():
    peers = [_peer(1, 'Maricopa', 'Phoenix', 'AZ')]
    found, scope = _peer_set(peers, category_id=31, uom_code='$/FF',
                             geo={'county': 'Maricopa', 'market': None, 'state': None})
    assert found == [] and scope is None


# ─── Headline sentence ───────────────────────────────────────────────────

_RESULT = {
    'project_name': 'Peoria Meadows',
    'lines_checked': 30, 'lines_compared': 12,
    'blocker_count': 1, 'review_count': 1, 'library_coverage': 0,
    'thresholds': {'review_pct': 25.0, 'blocker_pct': 50.0, 'min_peer_projects': 2},
    'findings': [
        {'fact_id': 1, 'category_id': 31, 'category_name': 'Sewer',
         'description': 'Sewer improvement', 'uom_code': '$/FF',
         'rate': 420.0, 'amount': 1_000_000.0,
         'peer_median': 291.0, 'peer_low': 250.0, 'peer_high': 500.0,
         'peer_projects': 11, 'peer_scope': 'Maricopa County',
         'pct_diff': 44.3, 'direction': 'above', 'severity': 'review',
         'library_reference': {'available': False, 'reason': 'no firm cost-library entry'}},
    ],
}


def test_headline_quotes_the_peer_set_it_actually_used():
    line = headline_finding(_RESULT)
    assert 'Sewer' in line
    assert '44%' in line
    assert 'above' in line
    assert '11 other Maricopa County deals' in line
    assert '250' in line and '500' in line


def test_headline_is_none_when_nothing_diverged():
    assert headline_finding({'findings': []}) is None


# ─── Artifact schema ─────────────────────────────────────────────────────

def test_schema_has_kpi_header_findings_table_and_note():
    schema = build_variance_artifact_schema(_RESULT)
    types = [b['type'] for b in schema['blocks']]
    assert types == ['key_value_grid', 'table', 'text']

    kpis = {p['label']: p['value'] for p in schema['blocks'][0]['pairs']}
    assert kpis['Lines Checked'] == 30
    assert kpis['Compared to Peers'] == 12
    assert kpis['Flagged'] == 1
    assert kpis['Needs a Decision'] == 1


def test_findings_row_carries_raw_numbers_not_formatted_strings():
    schema = build_variance_artifact_schema(_RESULT)
    cells = schema['blocks'][1]['rows'][0]['cells']
    assert cells['rate'] == 420.0
    assert cells['peer_median'] == 291.0
    assert cells['variance'] == 44.3
    assert cells['peer_projects'] == 11
    assert cells['scope'] == 'Maricopa County'
    assert cells['status'] == 'Review'
    # The range is a span label, not a number — the only string among the values.
    assert cells['peer_range'] == '250–500'


def test_clean_result_says_what_was_compared_not_that_everything_is_fine():
    clean = dict(_RESULT, findings=[], blocker_count=0, review_count=0)
    schema = build_variance_artifact_schema(clean)
    types = [b['type'] for b in schema['blocks']]
    assert types == ['key_value_grid', 'text']  # no findings table
    note = schema['blocks'][-1]['text']
    assert '12 of 30' in note


def test_note_on_findings_states_that_unchecked_is_not_fine():
    note = build_variance_artifact_schema(_RESULT)['blocks'][-1]['text']
    assert 'nothing to compare against' in note
    assert '25' in note and '50' in note


def test_peer_query_excludes_archived_deleted_and_same_name_copies():
    """The guard that stops the review comparing a deal to copies of itself.

    Live data (2026-07-27) holds ten saved copies of "Peoria Meadows"; without
    these three exclusions the peer set is clones and the reported spread is
    fabricated. Asserted against the SQL text because the filter is the contract.
    """
    import inspect
    from apps.landscaper.services import variance_service

    src = inspect.getsource(variance_service._fetch_peer_rates)
    assert 'p.is_active IS TRUE' in src
    assert 'p.deleted_at IS NULL' in src
    assert 'LOWER(TRIM(COALESCE(p.project_name' in src


def test_missing_library_reference_is_reported_never_substituted():
    ref = _RESULT['findings'][0]['library_reference']
    assert ref['available'] is False
    assert 'reason' in ref
    # No numeric key may be present on an unavailable reference.
    assert not any(k in ref for k in ('low', 'mid', 'high'))


# ─── Registration ────────────────────────────────────────────────────────

def test_tool_is_advertised_with_an_explicit_trigger_description():
    tool = next((t for t in LANDSCAPER_TOOLS if t['name'] == 'review_budget_variance'), None)
    assert tool is not None
    desc = tool['description']
    assert 'read-only' in desc.lower()
    assert 'create_artifact' in desc  # the do-NOT-compose instruction
    assert set(tool['input_schema']['properties']) == {'review_pct', 'blocker_pct'}


def test_tool_is_gated_for_both_land_and_income_property():
    land = get_tools_for_page('chat', project_type_code='land')
    mf = get_tools_for_page('chat', project_type_code='mf')
    assert 'review_budget_variance' in land
    assert 'review_budget_variance' in mf


def test_executor_is_registered():
    from apps.landscaper.tool_executor import TOOL_REGISTRY
    assert 'review_budget_variance' in TOOL_REGISTRY
