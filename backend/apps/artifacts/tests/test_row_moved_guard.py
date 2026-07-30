"""
Tests for the row-moved guard (CC13) — the half CC11 could not close.

CC11 compared each cell's captured value against what is stored. That catches a
row changing behind the artifact's back, but NOT the case that motivated the
work: the user's screen is stale while the server's snapshot is fresh. The
server rebuilds the artifact after every write, so by the time the second click
arrives the snapshot and the database agree with each other and disagree only
with what the user was looking at. Nothing in the request said which version
that was — so no server-only check could tell a current click from a stale one.

CC13 changes the request contract instead: the client sends the source_ref it
was rendering, and the server refuses (`row_moved`) when the position now
resolves to a different row. The click names the row, not the slot.

Pure-logic tests (SimpleTestCase, no DB) — the guard lives entirely in path
resolution, so the whole contract is testable without touching the database.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from apps.artifacts.views import _resolve_edit_target


def _schema(first_parcel=161, second_parcel=162):
    """A two-row sales schedule. Row 0 is whichever parcel sorts first — which
    is exactly what changes when a sale date is edited."""
    def row(rid, parcel):
        return {
            'id': f'p{rid}',
            'editable': True,
            'cells': {'parcel': f'P-{parcel}', 'sale_date': '2028-03-01'},
            'cell_source_refs': {
                'sale_date': {
                    'table': 'tbl_parcel_sale_assumptions',
                    'row_id': parcel,
                    'column': 'sale_date',
                    'captured_value': '2028-03-01',
                },
            },
        }
    return {'blocks': [
        {'id': 'sales', 'type': 'table',
         'columns': [{'key': 'parcel', 'label': 'Parcel'},
                     {'key': 'sale_date', 'label': 'Sale Date'}],
         'rows': [row(1, first_parcel), row(2, second_parcel)]},
    ]}


_PATH_ROW0 = ['blocks', '0', 'rows', '0', 'cells', 'sale_date']


def _ref(parcel, column='sale_date'):
    return {'table': 'tbl_parcel_sale_assumptions', 'row_id': parcel, 'column': column}


class RowMovedGuard(SimpleTestCase):

    def test_matching_row_resolves_normally(self):
        ref, err = _resolve_edit_target(
            _schema(), {'cell_path': _PATH_ROW0, 'new_value': '2029-01-01',
                        'expected_ref': _ref(161)})
        self.assertIsNone(err)
        self.assertEqual(ref['row_id'], 161)

    def test_the_cc3_incident_is_refused(self):
        # The user aimed at parcel 161's position. 161's date moved, so 162 has
        # taken row 0. Without the guard this wrote 161's new date onto 162.
        _ref_out, err = _resolve_edit_target(
            _schema(first_parcel=162, second_parcel=161),
            {'cell_path': _PATH_ROW0, 'new_value': '2032-06-01',
             'expected_ref': _ref(161)})
        self.assertIsNotNone(err)
        self.assertEqual(err['error'], 'row_moved')

    def test_the_refusal_names_both_rows(self):
        _r, err = _resolve_edit_target(
            _schema(first_parcel=162, second_parcel=161),
            {'cell_path': _PATH_ROW0, 'new_value': 'x', 'expected_ref': _ref(161)})
        self.assertIn('161', err['detail'])
        self.assertIn('162', err['detail'])
        self.assertIn('Nothing was written', err['detail'])
        self.assertTrue(err['suggested_user_question'])

    def test_a_different_column_in_the_same_row_is_refused(self):
        # Guards against a column-order change, not just a row reorder.
        _r, err = _resolve_edit_target(
            _schema(), {'cell_path': _PATH_ROW0, 'new_value': 'x',
                        'expected_ref': _ref(161, column='commission_amount')})
        self.assertEqual(err['error'], 'row_moved')

    def test_row_id_compares_across_string_and_int(self):
        # The client sends JSON; ids may arrive as strings. Same row, so proceed.
        ref, err = _resolve_edit_target(
            _schema(), {'cell_path': _PATH_ROW0, 'new_value': 'x',
                        'expected_ref': {'table': 'tbl_parcel_sale_assumptions',
                                         'row_id': '161', 'column': 'sale_date'}})
        self.assertIsNone(err)
        self.assertEqual(ref['row_id'], 161)


class BackwardCompatible(SimpleTestCase):
    """Optional by design — the guard must not break a caller that omits it."""

    def test_no_expected_ref_still_resolves(self):
        ref, err = _resolve_edit_target(
            _schema(), {'cell_path': _PATH_ROW0, 'new_value': 'x'})
        self.assertIsNone(err)
        self.assertEqual(ref['row_id'], 161)

    def test_a_malformed_expected_ref_is_ignored_not_fatal(self):
        # A ref with no table tells us nothing; it must not become a refusal.
        ref, err = _resolve_edit_target(
            _schema(), {'cell_path': _PATH_ROW0, 'new_value': 'x',
                        'expected_ref': {'row_id': 161}})
        self.assertIsNone(err)

    def test_pair_paths_are_unaffected(self):
        schema = {'blocks': [{'id': 'kv', 'type': 'key_value_grid', 'pairs': [
            {'label': 'Name', 'value': 'Peoria',
             'source_ref': {'table': 'tbl_project', 'row_id': 9,
                            'column': 'project_name'}}]}]}
        ref, err = _resolve_edit_target(
            schema, {'pair_path': ['blocks', '0', 'pairs', '0'], 'new_value': 'x'})
        self.assertIsNone(err)
        self.assertEqual(ref['table'], 'tbl_project')


class GuardOrdering(SimpleTestCase):
    """A cell with no pointer is still rejected first — the ref remains the
    allowlist, and the row-moved check never widens what is writable."""

    def test_unwritable_cell_still_rejected_even_with_a_matching_ref(self):
        schema = {'blocks': [{'id': 't', 'type': 'table',
                              'columns': [{'key': 'total', 'label': 'Total'}],
                              'rows': [{'id': 'r1', 'cells': {'total': 100}}]}]}
        _r, err = _resolve_edit_target(
            schema, {'cell_path': ['blocks', '0', 'rows', '0', 'cells', 'total'],
                     'new_value': '1',
                     'expected_ref': {'table': 'x', 'row_id': 1, 'column': 'total'}})
        self.assertEqual(err['error'], 'no_cell_source_ref')
