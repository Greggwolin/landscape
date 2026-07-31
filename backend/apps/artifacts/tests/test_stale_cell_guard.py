"""
Tests for the stale-cell guard (CC11 — editing spine, cross-cutting).

An edit is aimed by POSITION, and a position only means anything for the version
of the table it was read from. Several schedules reorder on write — the sales
schedule sorts by sale date — so a path built from a stale snapshot can resolve
to a different row's source_ref and write somewhere the user never chose, with a
success message. CC hit exactly this restoring a sales row during the CC3 run.

Every editable cell already recorded ``captured_value``; nothing read it. The
guard compares it to what is stored immediately before writing and refuses on a
proven mismatch.

Pure-logic tests here (SimpleTestCase, no DB) cover the comparison rules and the
fail-OPEN policy on anything unverifiable. The DB-backed behaviours — a genuine
mismatch refusing with ``stale_cell``, and a batch checking every edit against
the pre-batch state so it cannot false-positive on its own writes — are verified
live per §15.2.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.test import SimpleTestCase

from apps.artifacts.views import (
    _STALE_CHECK_TABLES,
    _check_cell_not_stale,
    _values_equivalent,
)


class ValueEquivalence(SimpleTestCase):
    """Tolerant on representation, strict on meaning."""

    def test_float_matches_decimal(self):
        # The captured value is JSON (float); the stored value is a Decimal.
        self.assertTrue(_values_equivalent(0.09, Decimal('0.0900')))

    def test_int_matches_decimal(self):
        self.assertTrue(_values_equivalent(5, Decimal('5')))

    def test_different_numbers_do_not_match(self):
        self.assertFalse(_values_equivalent(0.09, Decimal('0.2000')))

    def test_a_cent_of_difference_does_not_match(self):
        self.assertFalse(_values_equivalent(150000.0, Decimal('150000.01')))

    def test_iso_string_matches_stored_date(self):
        self.assertTrue(_values_equivalent('2028-03-01', date(2028, 3, 1)))

    def test_different_dates_do_not_match(self):
        self.assertFalse(_values_equivalent('2028-03-01', date(2029, 3, 1)))

    def test_code_strings_match_exactly(self):
        self.assertTrue(_values_equivalent('LOT', 'LOT'))
        self.assertFalse(_values_equivalent('LOT', 'FF'))

    def test_whitespace_is_not_a_difference(self):
        self.assertTrue(_values_equivalent(' LOT ', 'LOT'))

    def test_both_empty_matches(self):
        self.assertTrue(_values_equivalent(None, None))

    def test_one_empty_does_not_match(self):
        # A cell that showed a value and is now NULL (or the reverse) IS stale.
        self.assertFalse(_values_equivalent(0.15, None))
        self.assertFalse(_values_equivalent(None, Decimal('0.15')))


class FailsOpenWhenUnverifiable(SimpleTestCase):
    """Refusing on a cell we cannot check would break every path that predates
    the guard. Only a PROVEN mismatch refuses — everything else proceeds."""

    def test_ref_without_a_captured_value_proceeds(self):
        ref = {'table': 'core_fin_fact_budget', 'row_id': 1, 'column': 'rate'}
        self.assertIsNone(_check_cell_not_stale(ref))

    def test_unknown_table_proceeds(self):
        ref = {'table': 'tbl_project', 'row_id': 9, 'column': 'project_name',
               'captured_value': 'Peoria Meadows'}
        self.assertIsNone(_check_cell_not_stale(ref))

    def test_column_outside_the_editable_set_proceeds(self):
        # Not a hole: such a column has no source_ref, so it never reaches a
        # write. The guard simply declines to vouch for it.
        ref = {'table': 'core_fin_fact_budget', 'row_id': 1, 'column': 'amount',
               'captured_value': 197000}
        self.assertIsNone(_check_cell_not_stale(ref))

    def test_non_numeric_row_id_proceeds(self):
        ref = {'table': 'core_fin_fact_budget', 'row_id': 'abc', 'column': 'rate',
               'captured_value': 250}
        self.assertIsNone(_check_cell_not_stale(ref))


class CheckedTables(SimpleTestCase):
    def test_every_writable_schedule_table_is_covered(self):
        # If a new schedule becomes editable without an entry here, its cells
        # silently lose the protection — so assert the set explicitly.
        self.assertEqual(
            set(_STALE_CHECK_TABLES),
            {'core_fin_fact_budget', 'tbl_parcel_sale_assumptions', 'tbl_dcf_analysis'},
        )

    def test_each_entry_names_a_key_column(self):
        for table, (qualified, key_column, _allowed) in _STALE_CHECK_TABLES.items():
            self.assertTrue(qualified.startswith('landscape.'), table)
            self.assertTrue(key_column, table)


class PercentBoundsFollowColumnPrecision(SimpleTestCase):
    """A percent just under the old blanket bound used to reach Postgres and
    come back as an overflow. The bound now follows each column's own precision,
    so the refusal is legible."""

    def test_four_decimal_five_digit_columns_cap_at_999(self):
        from apps.landscaper.tools.cashflow_artifact_builder import percent_bounds_for
        lo, hi = percent_bounds_for('selling_costs_pct')
        self.assertEqual(hi, 999.99)
        self.assertEqual(lo, -999.99)

    def test_six_digit_columns_cap_higher(self):
        from apps.landscaper.tools.cashflow_artifact_builder import percent_bounds_for
        _lo, hi = percent_bounds_for('discount_rate')
        self.assertEqual(hi, 9999.99)

    def test_unknown_column_gets_the_tighter_bound(self):
        from apps.landscaper.tools.cashflow_artifact_builder import percent_bounds_for
        _lo, hi = percent_bounds_for('some_future_rate')
        self.assertEqual(hi, 999.99)

    def test_the_value_that_used_to_overflow_now_refuses_cleanly(self):
        from apps.artifacts.views import _coerce_dcf_value
        _s, _e, err = _coerce_dcf_value('selling_costs_pct', '999.5')
        self.assertIsNone(err, 'just inside the column precision — must be accepted')
        _s, _e, err = _coerce_dcf_value('selling_costs_pct', '1000')
        self.assertIsNotNone(err)
        self.assertEqual(err['error'], 'value_out_of_range')
        self.assertIn('999.99', err['detail'])
