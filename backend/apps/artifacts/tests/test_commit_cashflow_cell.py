"""
Tests for the cash-flow-assumptions inline-edit write path (CC2 — editing spine
slice 4).

Pure-logic tests (SimpleTestCase, no DB) lock in the fail-closed guarantees:
  * only assumptions backed by a writable column resolve to a ref; benchmark
    rows (growth-rate sets), the bulk-sale flag and every calculated cell in the
    KPI header and period grid have NO ref — the ref is the allowlist
  * the writer refuses any column outside that set even if a ref were forged
  * a percent cell takes a PERCENT: exactly ÷100, no magnitude heuristic in
    either direction
  * whole-number and currency cells coerce and refuse on their own terms
  * bad input is rejected BEFORE any database round-trip
  * the assumptions table is scoped into the NPV impact line

The two DB-dependent guarantees are verified live per §15.2, not here:
  1. a write to a sibling assumption record (a project holding both a land_dev
     and a cre row) is refused as `stale_dcf_row` rather than silently
     redirected — the failure it prevents is a write that reports success and
     changes no number on screen;
  2. the engine re-runs on the next read, so the period grid and NPV move
     without any stored schedule being updated.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from apps.artifacts.views import (
    _NPV_IMPACTING_TABLES,
    _coerce_dcf_value,
    _resolve_cell_source_ref,
    _write_dcf_cell,
)
from apps.landscaper.tools.cashflow_artifact_builder import (
    EDITABLE_ASSUMPTION_COLUMNS,
    build_cashflow_artifact_schema,
)


_ROWS = [
    {'seq': 1, 'label': '2028', 'netRevenue': 0.0, 'costs': -5_000_000.0,
     'financing': 0.0, 'reversion': 0.0, 'net': -5_000_000.0,
     'cumulative': -5_000_000.0},
]
_RESULTS = {'npv': 33_100_000.0, 'irr': 0.478}
_ASSUMPTIONS = {
    'discount_rate': 0.20,
    'hold_period_years': 5,
    'exit_cap_rate': 0.01,
    'selling_costs_pct': 0.04,
    'price_growth_rate': 0.03,
    'cost_inflation_rate': 0.025,
    'bulk_sale_period': 5,
    'bulk_sale_discount_pct': 0.15,
}
# Shaped like project 9's engine-selected record.
_DCF_ROW = {
    'dcf_analysis_id': 1,
    'property_type': 'land_dev',
    'discount_rate': 0.20,
    'hold_period_years': 5,
    'exit_cap_rate': 0.01,
    'selling_costs_pct': 0.04,
    'price_growth_set_id': 45,
    'cost_inflation_set_id': 74,
    'bulk_sale_enabled': False,
    'bulk_sale_period': 5,
    'bulk_sale_discount_pct': None,
}


def _schema():
    return build_cashflow_artifact_schema(
        _ROWS, _ASSUMPTIONS, _RESULTS,
        net_revenue_label='Net Revenue', period_type='year', total_periods=1,
        property_type='land_dev', dcf_row=_DCF_ROW,
        growth_set_names={45: 'Price Inflaton', 74: 'Cost Inflation'},
    )


def _row_index(label):
    rows = _schema()['blocks'][1]['rows']
    for idx, r in enumerate(rows):
        if r['cells']['assumption'] == label:
            return idx
    raise AssertionError(f'no assumption row labelled {label!r}')


class EditableCellRefs(SimpleTestCase):
    """Which cells the commit path will accept — resolved through the same
    walker the endpoint uses, not by reading the builder's intent."""

    def test_steering_assumption_resolves_to_its_row_and_column(self):
        path = ['blocks', '1', 'rows', str(_row_index('Discount Rate')),
                'cells', 'value']
        ref, err = _resolve_cell_source_ref(_schema(), path)
        self.assertIsNone(err)
        self.assertEqual(ref['table'], 'tbl_dcf_analysis')
        self.assertEqual(ref['column'], 'discount_rate')
        self.assertEqual(ref['row_id'], 1)

    def test_benchmark_row_is_rejected(self):
        # Growth is a library link — editable in the library, never here.
        path = ['blocks', '1', 'rows', str(_row_index('Price Growth')),
                'cells', 'value']
        _ref, err = _resolve_cell_source_ref(_schema(), path)
        self.assertIsNotNone(err)
        self.assertEqual(err['error'], 'no_cell_source_ref')

    def test_non_allowlisted_flag_row_is_rejected(self):
        path = ['blocks', '1', 'rows', str(_row_index('Bulk Sale at Exit')),
                'cells', 'value']
        _ref, err = _resolve_cell_source_ref(_schema(), path)
        self.assertIsNotNone(err)
        self.assertEqual(err['error'], 'no_cell_source_ref')

    def test_label_cell_is_rejected(self):
        path = ['blocks', '1', 'rows', str(_row_index('Discount Rate')),
                'cells', 'assumption']
        _ref, err = _resolve_cell_source_ref(_schema(), path)
        self.assertIsNotNone(err)
        self.assertEqual(err['error'], 'no_cell_source_ref')

    def test_every_period_grid_cell_is_rejected(self):
        for key in ('net', 'cumulative', 'costs', 'net_revenue'):
            path = ['blocks', '2', 'rows', '0', 'cells', key]
            _ref, err = _resolve_cell_source_ref(_schema(), path)
            self.assertIsNotNone(err, f'{key} must not be writable')


class PercentCoercion(SimpleTestCase):
    """A percent cell takes a percent. Exactly ÷100, in both directions, always."""

    def test_typed_percent_is_scaled_by_exactly_one_hundred(self):
        stored, echoed, err = _coerce_dcf_value('discount_rate', '25')
        self.assertIsNone(err)
        self.assertAlmostEqual(stored, 0.25)
        self.assertEqual(echoed, 25.0)

    def test_trailing_percent_sign_is_accepted(self):
        stored, _echo, err = _coerce_dcf_value('exit_cap_rate', '6.5%')
        self.assertIsNone(err)
        self.assertAlmostEqual(stored, 0.065)

    def test_a_fraction_is_taken_literally_not_reinterpreted(self):
        # 0.25 in a percent cell means a quarter of one percent. It is stored as
        # typed and redisplays as 0.3% — visibly wrong to the user — rather than
        # being silently "corrected" to 25%. No magnitude heuristic.
        stored, echoed, err = _coerce_dcf_value('discount_rate', '0.25')
        self.assertIsNone(err)
        self.assertAlmostEqual(stored, 0.0025)
        self.assertEqual(echoed, 0.25)

    def test_sub_one_percent_is_legitimate_and_accepted(self):
        # Project 9 carries a 1% exit cap; refusing small rates would refuse
        # real data.
        stored, _echo, err = _coerce_dcf_value('exit_cap_rate', '1')
        self.assertIsNone(err)
        self.assertAlmostEqual(stored, 0.01)

    def test_unstorable_magnitude_is_refused_not_clamped(self):
        _s, _e, err = _coerce_dcf_value('discount_rate', '250000')
        self.assertIsNotNone(err)
        self.assertEqual(err['error'], 'value_out_of_range')

    def test_blank_is_refused(self):
        _s, _e, err = _coerce_dcf_value('discount_rate', '')
        self.assertEqual(err['error'], 'invalid_value')

    def test_non_numeric_is_refused(self):
        _s, _e, err = _coerce_dcf_value('discount_rate', 'about twenty')
        self.assertEqual(err['error'], 'invalid_value')


class WholeNumberAndCurrencyCoercion(SimpleTestCase):
    def test_hold_period_coerces_to_int(self):
        stored, echoed, err = _coerce_dcf_value('hold_period_years', '7')
        self.assertIsNone(err)
        self.assertEqual(stored, 7)
        self.assertEqual(echoed, 7)

    def test_fractional_period_is_refused_not_rounded(self):
        _s, _e, err = _coerce_dcf_value('hold_period_years', '7.5')
        self.assertEqual(err['error'], 'invalid_value')

    def test_negative_period_is_refused(self):
        _s, _e, err = _coerce_dcf_value('bulk_sale_period', '-1')
        self.assertEqual(err['error'], 'value_out_of_range')

    def test_currency_accepts_symbol_and_separators(self):
        stored, _echo, err = _coerce_dcf_value('reserves_per_unit', '$1,250')
        self.assertIsNone(err)
        self.assertAlmostEqual(stored, 1250.0)

    def test_negative_reserves_refused(self):
        _s, _e, err = _coerce_dcf_value('reserves_per_unit', '-5')
        self.assertEqual(err['error'], 'value_out_of_range')

    def test_percent_and_integer_sets_are_disjoint(self):
        from apps.landscaper.tools.cashflow_artifact_builder import (
            INTEGER_ASSUMPTION_COLUMNS,
            PERCENT_ASSUMPTION_COLUMNS,
        )
        self.assertFalse(PERCENT_ASSUMPTION_COLUMNS & INTEGER_ASSUMPTION_COLUMNS)


class WriteDcfCellGuards(SimpleTestCase):
    """Guard branches that run BEFORE any database round-trip."""

    def test_calculated_column_refused_even_if_a_ref_were_forged(self):
        res = _write_dcf_cell(project_id=9, dcf_analysis_id=1,
                              column='income_growth_set_id', raw_value='3')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'column_not_writable')

    def test_unknown_column_refused(self):
        res = _write_dcf_cell(project_id=9, dcf_analysis_id=1,
                              column='npv', raw_value='1')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'column_not_writable')

    def test_missing_project_refused(self):
        res = _write_dcf_cell(project_id=None, dcf_analysis_id=1,
                              column='discount_rate', raw_value='25')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'project_required')

    def test_non_integer_row_id_refused(self):
        res = _write_dcf_cell(project_id=9, dcf_analysis_id='not-an-int',
                              column='discount_rate', raw_value='25')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'invalid_row_id')

    def test_bad_value_refused_before_touching_the_database(self):
        # Coercion runs ahead of the row lookup, so an unparseable value costs
        # no query and can never reach the writer.
        res = _write_dcf_cell(project_id=9, dcf_analysis_id=1,
                              column='discount_rate', raw_value='twenty')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'invalid_value')

    def test_allowlist_is_not_empty_and_excludes_derived_columns(self):
        self.assertIn('discount_rate', EDITABLE_ASSUMPTION_COLUMNS)
        self.assertNotIn('price_growth_set_id', EDITABLE_ASSUMPTION_COLUMNS)
        self.assertNotIn('bulk_sale_enabled', EDITABLE_ASSUMPTION_COLUMNS)


class NpvScoping(SimpleTestCase):
    def test_assumptions_table_impacts_npv(self):
        # A discount-rate change must report what it did to the value.
        self.assertIn('tbl_dcf_analysis', _NPV_IMPACTING_TABLES)
