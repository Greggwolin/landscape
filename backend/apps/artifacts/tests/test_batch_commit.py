"""Tests for the batch-commit shared resolver (CB8 — editing spine slice 2).

Pure-logic tests (SimpleTestCase, no DB) cover `_resolve_edit_target` — the
single resolve path both the single and batch commit endpoints share. The
DB-backed batch behavior (3 edits in one action, all-or-report partial failure,
duplicate rejection, one rebuild + one impact line) is verified live against
project 9 per §15.2.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from apps.artifacts.views import _resolve_edit_target


def _budget_schema():
    return {
        'blocks': [
            {'id': 'kpis', 'type': 'key_value_grid', 'pairs': [
                {'label': 'City', 'value': 'Peoria',
                 'source_ref': {'table': 'tbl_project', 'row_id': 9, 'column': 'city',
                                'captured_at': 'x'}},
                {'label': 'No Ref', 'value': 'x'},
            ]},
            {'id': 'rows', 'type': 'table',
             'columns': [{'key': 'category'}, {'key': 'qty'}, {'key': 'rate'}, {'key': 'amount'}],
             'rows': [
                 {'id': 'b1', 'editable': True, 'cell_source_refs': {
                     'qty': {'table': 'core_fin_fact_budget', 'row_id': 257, 'column': 'qty', 'captured_at': 'x'},
                     'rate': {'table': 'core_fin_fact_budget', 'row_id': 257, 'column': 'rate', 'captured_at': 'x'},
                 }, 'cells': {'category': 'Grading', 'qty': 788, 'rate': 250, 'amount': 197000}},
             ]},
        ],
    }


class ResolveEditTarget(SimpleTestCase):
    # ── cell path resolves to its budget ref ──────────────────────────────────
    def test_cell_path_resolves(self):
        sr, err = _resolve_edit_target(
            _budget_schema(), {'cell_path': ['blocks', '1', 'rows', '0', 'cells', 'rate'], 'new_value': '270'})
        self.assertIsNone(err)
        self.assertEqual((sr['table'], sr['row_id'], sr['column']), ('core_fin_fact_budget', 257, 'rate'))

    # ── kv pair path resolves (project profile — the single path must keep working) ─
    def test_pair_path_resolves(self):
        sr, err = _resolve_edit_target(
            _budget_schema(), {'pair_path': ['blocks', '0', 'pairs', '0'], 'new_value': 'Mesa'})
        self.assertIsNone(err)
        self.assertEqual((sr['table'], sr['column']), ('tbl_project', 'city'))

    # ── exactly one of cell_path / pair_path ──────────────────────────────────
    def test_neither_path_rejected(self):
        sr, err = _resolve_edit_target(_budget_schema(), {'new_value': '1'})
        self.assertIsNone(sr)
        self.assertEqual(err['error'], 'path_required')

    def test_both_paths_rejected(self):
        sr, err = _resolve_edit_target(_budget_schema(), {
            'cell_path': ['blocks', '1', 'rows', '0', 'cells', 'rate'],
            'pair_path': ['blocks', '0', 'pairs', '0'], 'new_value': '1'})
        self.assertIsNone(sr)
        self.assertEqual(err['error'], 'path_required')

    # ── calculated cell (amount) has no ref → fail closed ─────────────────────
    def test_amount_cell_fails_closed(self):
        sr, err = _resolve_edit_target(
            _budget_schema(), {'cell_path': ['blocks', '1', 'rows', '0', 'cells', 'amount'], 'new_value': '1'})
        self.assertIsNone(sr)
        self.assertEqual(err['error'], 'no_cell_source_ref')

    # ── kv pair without a source_ref → rejected ───────────────────────────────
    def test_pair_without_ref_rejected(self):
        sr, err = _resolve_edit_target(
            _budget_schema(), {'pair_path': ['blocks', '0', 'pairs', '1'], 'new_value': '1'})
        self.assertIsNone(sr)
        self.assertEqual(err['error'], 'no_source_ref')

    def test_non_dict_spec_rejected(self):
        sr, err = _resolve_edit_target(_budget_schema(), 'not-a-dict')
        self.assertIsNone(sr)
        self.assertEqual(err['error'], 'invalid_edit')
