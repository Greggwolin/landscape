"""Tests for the projected operating statement.

The fixture is NOT invented. It is Chadron Terrace's real statement as it
rendered on screen on 2026-09-16 -- the figures Gregg was looking at when he
reported the defect. It reconciles: 2,696,514 - 262,493 - 13,483 - 26,965 =
2,393,573 (the screen shows 2,393,574, a rounding artefact of the renderer);
774,119 + 109,276 + 93,671 + 39,263 + 34,255 + 125,156 = 1,175,740; and
2,393,574 - 1,175,740 = 1,217,834.

Its growth assumptions are equally real: revenue set 76 at 0.02 and cost set
77 at 0.03, both a single open-ended step from period 1, read from the live
database the same day.
"""

import copy

import pytest

from apps.landscaper.tools.proforma_derivation import (
    HorizonOutOfRange,
    MissingGrowthAssumptions,
    compound_factor,
    project_payload,
    projection_note,
    projection_title,
)
from apps.landscaper.tools.os_artifact_builder import build_os_artifact_schema


CHADRON_TERRACE = {
    'property_summary': {'unit_count': 113},
    'totals': {
        'gross_potential_rent': 2696514,
        'total_other_income': 0,
        'effective_gross_income': 2393574,
        'total_operating_expenses': 1175740,
        'as_is_noi': 1217834,
    },
    'vacancy_deductions': {'rows': [
        {'label': 'Physical Vacancy', 'as_is': {'total': -262493, 'rate': 0.097}},
        {'label': 'Credit Loss', 'as_is': {'total': -13483, 'rate': 0.005}},
        {'label': 'Concessions', 'as_is': {'total': -26965, 'rate': 0.010}},
    ]},
    'operating_expenses': {'rows': [
        {'label': 'Taxes & Insurance', 'level': 0, 'as_is': {'total': 774119}},
        {'label': 'Utilities', 'level': 0, 'as_is': {'total': 109276}},
        {'label': 'Repairs & Maintenance', 'level': 0, 'as_is': {'total': 93671}},
        {'label': 'Administrative', 'level': 0, 'as_is': {'total': 39263}},
        {'label': 'Other Expenses', 'level': 0, 'as_is': {'total': 34255}},
        {'label': 'Management & Reserves', 'level': 0, 'as_is': {'total': 125156}},
    ]},
}

INCOME_STEPS = [{'from_period': 1, 'thru_period': None, 'periods': None, 'rate': 0.02}]
EXPENSE_STEPS = [{'from_period': 1, 'thru_period': None, 'periods': None, 'rate': 0.03}]


def _project(years=3, income=None, expense=None):
    return project_payload(
        CHADRON_TERRACE,
        years=years,
        income_steps=income or INCOME_STEPS,
        expense_steps=expense or EXPENSE_STEPS,
    )


# ── the number Gregg will look at ───────────────────────────────────────────

def test_year_3_gross_potential_rent_matches_hand_arithmetic():
    """Year 3 carries TWO years of growth (Year 1 = today, D-2026-09-22-YEAR1):
    2,696,514 x 1.02^2 = 2,696,514 x 1.0404 = 2,805,453.17 -> 2,805,453.

    Before 2026-09-22 this asserted 1.02^3 (2,861,562) — the off-by-one the
    Year 1 ruling corrected.
    """
    out, _ = _project(3)
    assert round(out['totals']['gross_potential_rent']) == 2805453


def test_year_1_is_todays_run_rate_not_grown():
    """Gregg, 2026-09-22 ("5a"): Year 1 = the current figures, no growth.
    Chadron's Year 1 NOI is therefore its current 1,217,834, not 1,230,433."""
    out, prov = _project(1)
    t = out['totals']
    assert round(t['gross_potential_rent']) == 2696514
    assert round(t['total_operating_expenses']) == 1175740
    assert t['as_is_noi'] == 1217834  # the statement on file, figure for figure
    assert prov['growth_years'] == 0


def test_every_expense_category_grows_independently_at_the_expense_rate():
    out, _ = _project(3)
    f = 1.03 ** 2  # Year 3 = two years of growth
    got = {r['label']: round(r['as_is']['total']) for r in out['operating_expenses']['rows']}
    for row in CHADRON_TERRACE['operating_expenses']['rows']:
        assert got[row['label']] == round(row['as_is']['total'] * f)


# ── the five recorded composition bugs, each made impossible ────────────────

def test_no_expense_category_is_collapsed_or_dropped():
    """April's composed F-12 merged Electricity/Gas/Water/Trash into one
    "Utilities" and dropped Legal/Marketing/Office entirely."""
    out, _ = _project(3)
    before = [r['label'] for r in CHADRON_TERRACE['operating_expenses']['rows']]
    after = [r['label'] for r in out['operating_expenses']['rows']]
    assert after == before


def test_no_phantom_line_is_introduced():
    """April's composed F-12 invented "Pest Control 1,380"."""
    out, _ = _project(3)
    assert len(out['operating_expenses']['rows']) == \
        len(CHADRON_TERRACE['operating_expenses']['rows'])
    assert len(out['vacancy_deductions']['rows']) == \
        len(CHADRON_TERRACE['vacancy_deductions']['rows'])


def test_the_rendered_statement_has_the_same_rows_as_the_historical_one():
    """The strongest form of the structural guarantee: render both through
    the unchanged builder and compare the line labels."""
    hist, _ = build_os_artifact_schema(CHADRON_TERRACE)
    out, _prov = _project(3)
    proj, _ = build_os_artifact_schema(out)
    hist_lines = [r['cells']['line'] for r in hist['blocks'][0]['rows']]
    proj_lines = [r['cells']['line'] for r in proj['blocks'][0]['rows']]
    assert proj_lines == hist_lines


def test_no_field_outside_the_figures_is_touched():
    out, _ = _project(3)
    assert out['property_summary'] == CHADRON_TERRACE['property_summary']


def test_the_source_payload_is_not_mutated():
    before = copy.deepcopy(CHADRON_TERRACE)
    _project(3)
    assert CHADRON_TERRACE == before


# ── percentages hold, dollars move ──────────────────────────────────────────

def test_deduction_percentages_are_preserved_against_the_grown_rent():
    out, _ = _project(3)
    gpr = out['totals']['gross_potential_rent']
    for row in out['vacancy_deductions']['rows']:
        rate = row['as_is']['rate']
        assert abs(abs(row['as_is']['total']) - gpr * rate) < 0.01


def test_a_deduction_with_no_rate_grows_with_the_rent():
    payload = copy.deepcopy(CHADRON_TERRACE)
    payload['vacancy_deductions']['rows'][1]['as_is'].pop('rate')
    out, _ = project_payload(payload, years=3,
                             income_steps=INCOME_STEPS, expense_steps=EXPENSE_STEPS)
    assert round(abs(out['vacancy_deductions']['rows'][1]['as_is']['total'])) == \
        round(13483 * 1.02 ** 2)


def test_a_rate_expressed_as_a_percent_is_read_the_same_way_the_label_is():
    """The payload is inconsistent: some rows carry 9.7, others 0.097. The
    renderer disambiguates on < 1; this must agree or the printed percentage
    stops describing the arithmetic."""
    payload = copy.deepcopy(CHADRON_TERRACE)
    payload['vacancy_deductions']['rows'][0]['as_is']['rate'] = 9.7
    out, _ = project_payload(payload, years=3,
                             income_steps=INCOME_STEPS, expense_steps=EXPENSE_STEPS)
    gpr = out['totals']['gross_potential_rent']
    assert abs(abs(out['vacancy_deductions']['rows'][0]['as_is']['total'])
               - gpr * 0.097) < 0.01


# ── the statement reconciles down the page ──────────────────────────────────

def test_effective_gross_income_reconciles_rather_than_being_grown():
    out, _ = _project(3)
    t = out['totals']
    deductions = sum(abs(r['as_is']['total'])
                     for r in out['vacancy_deductions']['rows'])
    assert abs(t['effective_gross_income']
               - (t['gross_potential_rent'] + t['total_other_income'] - deductions)) < 0.01


def test_total_operating_expenses_equals_the_sum_of_its_categories():
    out, _ = _project(3)
    total = sum(abs(r['as_is']['total'])
                for r in out['operating_expenses']['rows'] if r.get('level') == 0)
    assert abs(out['totals']['total_operating_expenses'] - total) < 0.01


def test_noi_equals_egi_less_expenses():
    out, _ = _project(3)
    t = out['totals']
    assert abs(t['as_is_noi']
               - (t['effective_gross_income'] - t['total_operating_expenses'])) < 0.01


def test_noi_grows_because_income_and_expenses_grow_at_different_rates():
    """A sanity check with a direction: income at 2% and expenses at 3% means
    NOI grows more slowly than income, and the margin compresses."""
    out, _ = _project(3)
    base = CHADRON_TERRACE['totals']
    assert out['totals']['as_is_noi'] > base['as_i' + 's_noi']
    base_margin = base['as_is_noi'] / base['effective_gross_income']
    new_margin = out['totals']['as_is_noi'] / out['totals']['effective_gross_income']
    assert new_margin < base_margin


# ── stepped growth ──────────────────────────────────────────────────────────

def test_stepped_rates_compound_period_by_period():
    steps = [
        {'from_period': 1, 'thru_period': 2, 'periods': None, 'rate': 0.02},
        {'from_period': 3, 'thru_period': None, 'periods': None, 'rate': 0.05},
    ]
    assert abs(compound_factor(steps, 3) - (1.02 * 1.02 * 1.05)) < 1e-12


def test_a_period_no_step_covers_grows_at_zero_not_at_a_default():
    steps = [{'from_period': 1, 'thru_period': 2, 'periods': None, 'rate': 0.02}]
    assert abs(compound_factor(steps, 4) - (1.02 * 1.02)) < 1e-12


def test_a_span_expressed_as_periods_is_honoured():
    steps = [
        {'from_period': 1, 'thru_period': None, 'periods': 2, 'rate': 0.02},
        {'from_period': 3, 'thru_period': None, 'periods': None, 'rate': 0.10},
    ]
    assert abs(compound_factor(steps, 3) - (1.02 * 1.02 * 1.10)) < 1e-12


# ── refusing rather than inventing ──────────────────────────────────────────

@pytest.mark.parametrize('bad', [0, -1, 11, 3.5, 'three', None, True])
def test_an_unsupported_horizon_raises_and_states_the_range(bad):
    with pytest.raises(HorizonOutOfRange) as exc:
        _project(bad)
    assert exc.value.min_years == 1 and exc.value.max_years == 10


def test_missing_growth_assumptions_name_what_is_missing():
    err = MissingGrowthAssumptions(17, ['income'])
    assert err.project_id == 17 and err.missing == ['income']
    assert 'income' in str(err)


# ── the title says what it is; the note says where it came from ─────────────
# Gregg, 2026-09-18: the header carries the statement's name and nothing else,
# and the derivation goes under the schedule in small plain type. Both halves
# still have to be on the face of the artifact -- a projection that reads as
# actuals is the expensive failure, and its figures are entirely plausible.

def test_the_title_is_the_property_the_horizon_and_the_word_proforma():
    _out, prov = _project(3)
    title = projection_title('Chadron Terrace', 'Default (untagged)', prov)
    assert title == 'Chadron Terrace — Year 3 Proforma'


def test_the_title_carries_no_derivation():
    _out, prov = _project(3)
    title = projection_title('Chadron Terrace', 'Default (untagged)', prov)
    for noise in ('Default (untagged)', '+2.0%', '+3.0%', 'from '):
        assert noise not in title


def test_the_note_states_the_base_the_horizon_and_both_rates():
    _out, prov = _project(3)
    note = projection_note('Default (untagged)', prov)
    assert 'Default (untagged)' in note
    assert '2 years of growth' in note
    assert '+2.0%' in note and '+3.0%' in note
    assert 'Not actuals' in note


def test_a_one_year_horizon_reads_as_one_year():
    _out, prov = _project(2)
    assert '1 year of growth' in projection_note('Default (untagged)', prov)
    assert '1 years' not in projection_note('Default (untagged)', prov)


def test_the_year_1_note_says_no_growth_was_applied():
    _out, prov = _project(1)
    note = projection_note('Default (untagged)', prov)
    assert 'current run rate' in note
    assert 'no growth' in note


def test_the_note_drops_the_property_name_the_title_already_carries():
    _out, prov = _project(3)
    note = projection_note(
        'Chadron Terrace — Default (untagged) Operating Statement', prov)
    assert 'Chadron Terrace' not in note
    assert 'Default (untagged) Operating Statement' in note


def test_a_stepped_rate_is_flagged_in_the_note_rather_than_shown_as_flat():
    steps = [
        {'from_period': 1, 'thru_period': 2, 'periods': None, 'rate': 0.02},
        {'from_period': 3, 'thru_period': None, 'periods': None, 'rate': 0.05},
    ]
    _out, prov = _project(3, income=steps)
    assert 'stepped' in projection_note('Default (untagged)', prov)


# ── regressions from the first live run, 2026-09-16 ─────────────────────────
# Both were found by running the tool against the real database for the first
# time. Everything above passed throughout; neither could have been caught by
# a test that never opens a connection or writes a record.

def test_the_growth_query_does_not_cast_the_project_id():
    """`project_id` is a bigint. Casting the parameter to text makes Postgres
    refuse outright -- "operator does not exist: bigint = text" -- and the tool
    crashes before printing a figure.

    This asserts on the SQL text rather than on behaviour, deliberately: the
    behavioural version needs a database, and the absence of one is precisely
    how the defect shipped. A string check that runs everywhere beats a real
    check that runs nowhere.
    """
    import inspect

    from apps.landscaper.tools import proforma_derivation

    sql = inspect.getsource(proforma_derivation.load_growth_steps)
    assert '%s::text' not in sql
    assert 'project_id = %s' in sql


def test_a_projection_does_not_take_the_historical_statements_save_slot():
    """Sharing one slot meant asking for a projection silently REPLACED the
    saved historical statement. It did that to Chadron Terrace's real record on
    2026-09-16 -- artifact 126, created 2026-07-20, overwritten at 23:06 and
    restored from its own version history.
    """
    import inspect

    from apps.landscaper.tools import os_artifact_builder

    src = inspect.getsource(os_artifact_builder.create_os_artifact)
    assert 'projection_years' in src
    assert ':y{int(projection_years)}' in src
    assert 'f\'os:{scenario or "default"}\'' in src


def test_create_os_artifact_accepts_a_horizon():
    import inspect

    from apps.landscaper.tools.os_artifact_builder import create_os_artifact

    params = inspect.signature(create_os_artifact).parameters
    assert 'projection_years' in params
    assert params['projection_years'].default is None
