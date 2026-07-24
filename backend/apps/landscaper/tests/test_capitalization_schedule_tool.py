"""CAP1 — capitalization schedule artifact builder + registration tests.

Pure-function tests (no DB): the builder assembles the fixed schema from the
serialized waterfall result (partner summaries + project summary + tier config),
keeps the deal terms editable and every distribution calculated, and applies the
Driver-1 promote-column floor. Registration tests confirm
get_capitalization_schedule is advertised and gated for BOTH land and income.
Session: LSCMD-CAP-CAPSCHED-0724.
"""

from apps.landscaper.tool_registry import get_tools_for_page
from apps.landscaper.tool_schemas import LANDSCAPER_TOOLS
from apps.landscaper.tools.capitalization_artifact_builder import (
    build_capitalization_artifact_schema,
    create_capitalization_artifact,
)


_LP = {
    'irr': 0.182, 'equity_multiple': 1.9, 'promote': 0.0,
    'total_distributions': 18_000_000.0,
    'tier1': 5_000_000.0, 'tier2': 13_000_000.0,
}
_GP = {
    'irr': 0.34, 'equity_multiple': 2.5, 'promote': 4_900_000.0,
    'total_distributions': 3_800_000.0,
    'tier1': 556_000.0, 'tier2': 3_244_000.0,
}
_PROJ = {
    'total_equity': 20_000_000.0, 'lp_equity': 18_000_000.0,
    'gp_equity': 2_000_000.0, 'project_irr': 0.21, 'project_emx': 2.05,
}
_TIERS = [
    {'tier_number': 1, 'tier_name': 'Return of Capital + Pref',
     'irr_hurdle': 0.08, 'emx_hurdle': None, 'promote_percent': 0.0,
     'lp_split_pct': 90.0, 'gp_split_pct': 10.0},
    {'tier_number': 2, 'tier_name': 'Promote',
     'irr_hurdle': 0.12, 'emx_hurdle': None, 'promote_percent': 20.0,
     'lp_split_pct': 80.0, 'gp_split_pct': 20.0},
]


def _build(lp=None, gp=None, proj=None, tiers=None):
    return build_capitalization_artifact_schema(
        _LP if lp is None else lp,
        _GP if gp is None else gp,
        _PROJ if proj is None else proj,
        _TIERS if tiers is None else tiers,
    )


def test_three_blocks_kpi_stack_waterfall():
    blocks = _build()['blocks']
    assert blocks[0]['id'] == 'cap_kpis'
    assert blocks[1]['id'] == 'cap_stack'
    assert blocks[2]['id'] == 'cap_waterfall'
    assert len(blocks) == 3


def test_kpi_header_uses_engine_results_only():
    kpis = {p['label']: p['value'] for p in _build()['blocks'][0]['pairs']}
    assert kpis['LP IRR'] == '18.2%'
    assert kpis['LP Multiple'] == '1.90x'
    assert kpis['GP Promote'] == 4_900_000
    assert kpis['Project IRR'] == '21.0%'
    assert kpis['Total Equity'] == 20_000_000


def test_missing_results_not_fabricated():
    kpis = {p['label']: p['value']
            for p in _build(lp={}, gp={}, proj={})['blocks'][0]['pairs']}
    assert kpis == {}  # nothing to show, nothing invented


def test_capital_stack_amount_editable_share_calculated():
    stack = _build()['blocks'][1]
    cols = {c['key']: c for c in stack['columns']}
    assert cols['amount']['editable'] is True
    assert cols['share']['editable'] is False
    rows = {r['cells']['source']: r['cells'] for r in stack['rows']}
    assert rows['LP Equity']['amount'] == 18_000_000.0
    assert rows['LP Equity']['share'] == '90.0%'
    assert rows['GP Equity']['share'] == '10.0%'


def test_waterfall_terms_editable_distributions_calculated():
    wf = _build()['blocks'][2]
    cols = {c['key']: c for c in wf['columns']}
    assert cols['hurdle']['editable'] is True
    assert cols['lp_split']['editable'] is True
    assert cols['gp_split']['editable'] is True
    assert cols['lp_dist']['editable'] is False   # calculated
    assert cols['gp_dist']['editable'] is False   # calculated


def test_tier_distributions_pulled_by_tier_number():
    rows = _build()['blocks'][2]['rows']
    t1, t2 = rows[0]['cells'], rows[1]['cells']
    assert t1['lp_dist'] == 5_000_000.0 and t1['gp_dist'] == 556_000.0
    assert t2['lp_dist'] == 13_000_000.0 and t2['gp_dist'] == 3_244_000.0
    assert t1['hurdle'] == '8.0%'
    assert t1['lp_split'] == '90.0%'


def test_driver1_promote_column_shows_when_present():
    keys = [c['key'] for c in _build()['blocks'][2]['columns']]
    assert 'promote' in keys  # tier 2 carries a 20% promote


def test_driver1_promote_column_hidden_when_none():
    flat = [dict(t, promote_percent=0.0) for t in _TIERS]
    keys = [c['key'] for c in _build(tiers=flat)['blocks'][2]['columns']]
    assert 'promote' not in keys


def test_create_capitalization_artifact_rejects_empty_without_touching_db():
    result = create_capitalization_artifact(
        project_id=9, project_name='X', lp_summary={}, gp_summary={},
        project_summary={}, tier_config=[],
    )
    assert result['success'] is False


def test_get_capitalization_schedule_advertised_and_gated_land_and_income():
    advertised = {t['name'] for t in LANDSCAPER_TOOLS}
    assert 'get_capitalization_schedule' in advertised
    land_tools = get_tools_for_page('chat', project_type_code='land')
    mf_tools = get_tools_for_page('chat', project_type_code='mf')
    assert 'get_capitalization_schedule' in land_tools
    assert 'get_capitalization_schedule' in mf_tools
