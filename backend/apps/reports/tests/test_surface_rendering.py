"""The 2a machinery, tested without a database.

Every test here runs on dicts. That is deliberate: the point of D-2026-09-14-
SURFACE-ARCH is that a report holds no queries of its own, so if any of this
needed a database to test, the decision would not have landed.
"""

from apps.artifacts.catalog import CATALOG
from apps.reports.generator_router import GENERATOR_REGISTRY
from apps.reports.surface_map import (
    SURFACES,
    UNMAPPED_REPORTS,
    mapped_reports,
    reports_for_surface,
    surface_for_report,
)
from apps.reports.generators.surface_preview import (
    SurfacePreviewGenerator,
    _add_totals,
    _infer_format,
    _pick_rung,
    sections_from_spec,
)


# ── the mapping ──────────────────────────────────────────────────────────

def test_every_surface_is_a_catalogue_entry_and_vice_versa():
    """The mapping and the catalogue name the same nine surfaces.

    A surface added to the panel without a decision about which report renders
    it fails here rather than quietly becoming a tenth thing nobody mapped.
    """
    assert {entry['tool'] for entry in CATALOG} == set(SURFACES)


def test_every_report_code_is_mapped_or_explicitly_unmapped():
    """No report code may be silently absent from the decision."""
    routed = set(GENERATOR_REGISTRY)
    accounted = set(mapped_reports()) | set(UNMAPPED_REPORTS)
    assert routed - accounted == set(), 'report codes with no decision recorded'
    assert accounted - routed == set(), 'mapped codes the router does not know'


def test_the_counts_are_what_the_prose_says():
    """The numbers in surface_map's docstring, asserted.

    Prose drifts from code silently. The first draft said eight surfaces carried
    twelve report codes; they carry thirteen, and the set-equality test above
    passed anyway because it never counted.
    """
    assert len(SURFACES) == 9
    assert sum(1 for e in SURFACES.values() if e['definition'] == 'view_spec') == 7
    assert sum(1 for e in SURFACES.values() if e['reports']) == 8
    assert len(mapped_reports()) == 13
    assert len(UNMAPPED_REPORTS) == 9
    assert len(GENERATOR_REGISTRY) == 13 + 9


def test_no_report_is_both_mapped_and_unmapped():
    assert set(mapped_reports()).isdisjoint(UNMAPPED_REPORTS)


def test_no_report_belongs_to_two_surfaces():
    codes = mapped_reports()
    assert len(codes) == len(set(codes))


def test_lookups_agree_in_both_directions():
    assert surface_for_report('RPT_16') == 'get_sales_schedule'
    assert 'RPT_16' in reports_for_surface('get_sales_schedule')
    assert surface_for_report('RPT_13') is None  # a results report, not a surface


def test_the_generators_that_claim_a_surface_declare_the_mapped_one():
    """A generator's ``surface_tool`` must match what the map says it renders.

    This is the join that would rot first: someone repoints a generator at a
    different surface and the map still describes the old arrangement.
    """
    import importlib

    for code, (module_path, class_name) in GENERATOR_REGISTRY.items():
        generator = getattr(importlib.import_module(module_path), class_name)
        tool = getattr(generator, 'surface_tool', '')
        if not tool:
            continue
        assert tool == surface_for_report(code), (
            f'{code} renders {tool} but surface_map says '
            f'{surface_for_report(code)}'
        )


# ── format inference ─────────────────────────────────────────────────────

def test_a_declared_format_always_wins():
    column = {'key': 'anything', 'label': 'Anything', 'format': 'percentage'}
    assert _infer_format(column, [1, 2, 3]) == 'percentage'


def test_a_column_of_strings_gets_no_format():
    """A specification that formatted a cell has already decided how it reads."""
    assert _infer_format({'key': 'irr', 'label': 'IRR'}, ['45.7%']) is None
    assert _infer_format({'key': 'parcel', 'label': 'Parcel'}, ['1.101']) is None


def test_an_empty_column_gets_no_format():
    assert _infer_format({'key': 'net', 'label': 'Net'}, [None, '']) is None


def test_money_percent_and_count_columns_are_told_apart():
    assert _infer_format({'key': 'net', 'label': 'Net'}, [1.0]) == 'currency'
    assert _infer_format({'key': 'growth', 'label': 'Growth'}, [3.0]) == 'percentage'
    assert _infer_format({'key': 'units', 'label': 'Units'}, [128]) == 'number'


def test_a_rate_is_not_money_even_though_it_reads_like_money():
    """'cost of sale %' and 'growth rate' both contain a currency hint."""
    assert _infer_format({'key': 'growth_rate', 'label': 'Growth Rate'}, [3.0]) \
        == 'percentage'


def test_capital_is_money_and_a_cap_rate_is_not():
    """'cap' as a percentage hint caught "Peak capital" and would have printed
    $106,026,927 as 106,026,927.0%."""
    assert _infer_format({'key': 'peak_capital', 'label': 'Peak Capital'},
                         [106026927.0]) == 'currency'
    assert _infer_format({'key': 'exit_cap_rate', 'label': 'Exit Cap Rate'},
                         [5.0]) == 'percentage'


def test_the_domain_acronyms_are_money():
    for key in ('noi', 'egi', 'gpr', 'opex'):
        assert _infer_format({'key': key, 'label': key.upper()}, [1.0]) == 'currency'


# ── totals ───────────────────────────────────────────────────────────────

def _section(columns, rows):
    return {'heading': '', 'type': 'table', 'columns': columns,
            'rows': rows, 'totals': None}


def test_money_columns_are_totalled():
    section = _add_totals(_section(
        [{'key': 'net', 'label': 'Net', 'format': 'currency'}],
        [{'net': 10.0}, {'net': 5.0}],
    ))
    assert section['totals'] == {'net': 15.0}


def test_a_price_column_is_never_totalled():
    """Twenty-one prices per lot, per unit and per acre added together produced
    a $216,030 'total' on the rate card before this rule existed."""
    section = _add_totals(_section(
        [{'key': 'price', 'label': 'Price', 'format': 'currency'}],
        [{'price': 60000.0}, {'price': 2400.0}],
    ))
    assert section['totals'] is None


def test_counts_and_rates_are_not_totalled():
    section = _add_totals(_section(
        [{'key': 'units', 'label': 'Units', 'format': 'number'},
         {'key': 'growth', 'label': 'Growth', 'format': 'percentage'}],
        [{'units': 128, 'growth': 3.0}],
    ))
    assert section['totals'] is None


# ── rung selection ───────────────────────────────────────────────────────

def test_the_default_rung_is_used_when_the_rows_can_render_it():
    spec = {
        'rung_columns': {'standard': ['a', 'b'], 'detail': ['a', 'b', 'c']},
        'default_rung': 'standard',
        'rows': [{'cells': {'a': 1, 'b': 2, 'c': 3}}],
    }
    assert _pick_rung(spec) == ['a', 'b']


def test_a_rung_of_aggregates_the_rows_do_not_carry_is_skipped():
    """The parcels surface opens on a summary rung of computed group totals.

    Rendering it against the raw rows produced a table half of whose columns
    were blank, which reads as missing data and is not.
    """
    spec = {
        'rung_columns': {
            'summary': ['group', 'parcels', 'acres', 'pct_acres'],
            'standard': ['parcel', 'acres'],
        },
        'default_rung': 'summary',
        'rows': [{'cells': {'parcel': '1.101', 'acres': 32}}],
        'columns': [{'key': 'parcel'}, {'key': 'acres'}],
    }
    assert _pick_rung(spec) == ['parcel', 'acres']


def test_with_no_renderable_rung_every_column_the_rows_carry_is_shown():
    spec = {
        'rung_columns': {'summary': ['group']},
        'default_rung': 'summary',
        'rows': [{'cells': {'parcel': '1.101'}}],
        'columns': [{'key': 'parcel'}, {'key': 'group'}],
    }
    assert _pick_rung(spec) == ['parcel']


# ── sections ─────────────────────────────────────────────────────────────

_SPEC = {
    'topic': 'sales',
    'kicker': 'Sales schedule',
    'title': 'Demo — Sales',
    'source_label': 'the parcel sale schedule',
    'kpis': [{'label': 'Total Net Proceeds', 'value': 15.0},
             {'label': 'Sale-Date Span', 'value': '2028–2034'}],
    'columns': [{'key': 'area', 'label': 'Area', 'align': 'left'},
                {'key': 'parcel', 'label': 'Parcel', 'align': 'left'},
                {'key': 'net', 'label': 'Net', 'align': 'right'}],
    'rung_columns': {'standard': ['area', 'parcel', 'net']},
    'default_rung': 'standard',
    'default_grouping': 'area',
    'rows': [
        {'id': 'r1', 'cells': {'area': 'Area 1', 'parcel': '1.101', 'net': 10.0}},
        {'id': 'r2', 'cells': {'area': 'Area 2', 'parcel': '2.101', 'net': 5.0}},
    ],
}


def test_a_specification_renders_kpis_then_one_section_per_group():
    sections = sections_from_spec(_SPEC)
    assert sections[0]['type'] == 'kpi_cards'
    tables = [s for s in sections if s['type'] == 'table']
    assert [t['heading'] for t in tables] == [
        'Sales schedule — Area 1', 'Sales schedule — Area 2',
    ]
    # the column grouped ON is not repeated inside its own group
    assert [c['key'] for c in tables[0]['columns']] == ['parcel', 'net']
    assert tables[0]['totals'] == {'net': 10.0}


def test_a_raw_number_kpi_is_formatted_and_a_string_one_is_left_alone():
    cards = sections_from_spec(_SPEC)[0]['cards']
    assert cards[0]['value'] == '$15'
    assert cards[1]['value'] == '2028–2034'


def test_one_group_is_not_rendered_as_a_grouping():
    spec = dict(_SPEC, rows=[_SPEC['rows'][0]])
    tables = [s for s in sections_from_spec(spec) if s['type'] == 'table']
    assert len(tables) == 1
    assert tables[0]['heading'] == 'Sales schedule'


def test_an_artifact_schema_renders_too():
    """Two of the nine surfaces have no view specification yet."""
    schema = {'blocks': [
        {'id': 'k', 'type': 'kpi', 'pairs': [{'label': 'NOI', 'value': 940198}]},
        {'id': 't', 'type': 'table',
         'columns': [{'key': 'line', 'label': 'Line Item', 'align': 'left'},
                     {'key': 'annual', 'label': 'Annual', 'align': 'right'}],
         'rows': [{'id': 'r1', 'cells': {'line': 'Rent', 'annual': 100.0}}]},
    ]}
    sections = sections_from_spec(schema)
    assert sections[0]['cards'] == [{'label': 'NOI', 'value': '$940,198'}]
    assert sections[1]['rows'] == [{'line': 'Rent', 'annual': 100.0}]


# ── the honest failure ───────────────────────────────────────────────────

def test_an_unresolvable_surface_says_so_instead_of_rendering_empty():
    """A reader must never have to guess whether a project has no data or the
    code cannot reach it."""

    class _Unbuilt(SurfacePreviewGenerator):
        report_code = 'RPT_XX'
        report_name = 'Unbuilt'
        # Was get_operating_statement until 2026-09-14, when
        # build_os_payload_for_project made that one resolvable. Any surface
        # still in UNRESOLVED proves the same behaviour.
        surface_tool = 'get_rent_roll_schedule'

    preview = _Unbuilt(project_id=1).generate_preview()
    assert preview['sections'] == []
    assert 'get_rent_roll_schedule' in preview['message']
    assert 'no function fetches them' in preview['message']


def test_the_operating_statement_is_resolvable_and_the_rest_are_listed():
    """Six of nine resolve; the three that do not each say what they need."""
    from apps.reports.surface_spec import RESOLVERS, UNRESOLVED

    assert 'get_operating_statement' in RESOLVERS
    assert 'get_operating_statement' not in UNRESOLVED
    assert len(RESOLVERS) == 6
    assert set(UNRESOLVED) == {
        'get_capitalization_schedule',
        'get_rent_roll_schedule',
        'review_budget_variance',
    }
    assert set(RESOLVERS) | set(UNRESOLVED) == set(SURFACES)
