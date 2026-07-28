"""
Tests for the table-cell inline-edit write path (CB6 — editing spine slice 1).

Pure-logic tests (SimpleTestCase, no DB) lock in the fail-closed guarantees:
  * a cell WITH a source_ref (qty/rate) resolves to that ref
  * a cell WITHOUT a source_ref (amount/category/description) is rejected —
    the ref is the allowlist, so a calculated cell can never be written
  * malformed cell paths are rejected
  * the budget writer refuses any column outside {qty, rate} even if a ref
    were somehow present (belt-and-suspenders over the trigger-recomputed
    `amount`)
  * the impact line is an engine delta, empty when nothing moved.

The end-to-end DB write (rate → trigger-recomputed amount) is verified live
against project 9 per §15.2; these tests guard the boundary logic.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from apps.artifacts.views import (
    _EDITABLE_BUDGET_CELL_COLUMNS,
    _format_npv_impact,
    _resolve_cell_source_ref,
    _walk_path,
    _write_budget_cell,
)


def _budget_schema():
    """A budget-schedule schema shaped like build_budget_artifact_schema:
    a KPI grid at block 0 and a line-item table at block 1 whose first row
    carries cell_source_refs for qty + rate ONLY (amount is calculated)."""
    return {
        'blocks': [
            {'id': 'budget_kpis', 'type': 'key_value_grid', 'columns': 4, 'pairs': []},
            {
                'id': 'budget_line_items',
                'type': 'table',
                'columns': [
                    {'key': 'category', 'label': 'Category'},
                    {'key': 'qty', 'label': 'Qty'},
                    {'key': 'rate', 'label': 'Rate'},
                    {'key': 'amount', 'label': 'Amount'},
                ],
                'rows': [
                    {
                        'id': 'b1',
                        'editable': True,
                        'cell_source_refs': {
                            'qty': {'table': 'core_fin_fact_budget', 'row_id': 257,
                                    'column': 'qty', 'captured_at': 'x', 'captured_value': 788.0},
                            'rate': {'table': 'core_fin_fact_budget', 'row_id': 257,
                                     'column': 'rate', 'captured_at': 'x', 'captured_value': 250.0},
                        },
                        'cells': {'category': 'Grading', 'qty': 788.0, 'rate': 250.0, 'amount': 197000.0},
                    },
                    {
                        'id': 'b2',
                        'cells': {'category': 'Legal', 'qty': None, 'rate': None, 'amount': 5000.0},
                    },
                ],
            },
        ],
    }


class WalkPath(SimpleTestCase):
    def test_walks_to_row(self):
        row = _walk_path(_budget_schema(), ['blocks', '1', 'rows', '0'])
        self.assertEqual(row['id'], 'b1')

    def test_out_of_range_returns_none(self):
        self.assertIsNone(_walk_path(_budget_schema(), ['blocks', '1', 'rows', '9']))

    def test_missing_key_returns_none(self):
        self.assertIsNone(_walk_path(_budget_schema(), ['blocks', '1', 'nope']))


class ResolveCellSourceRef(SimpleTestCase):
    # ── the happy path: an editable input cell resolves to its ref ────────────
    def test_rate_cell_resolves(self):
        ref, err = _resolve_cell_source_ref(
            _budget_schema(), ['blocks', '1', 'rows', '0', 'cells', 'rate'])
        self.assertIsNone(err)
        self.assertEqual(ref['table'], 'core_fin_fact_budget')
        self.assertEqual(ref['row_id'], 257)
        self.assertEqual(ref['column'], 'rate')

    def test_qty_cell_resolves(self):
        ref, err = _resolve_cell_source_ref(
            _budget_schema(), ['blocks', '1', 'rows', '0', 'cells', 'qty'])
        self.assertIsNone(err)
        self.assertEqual(ref['column'], 'qty')

    # ── the fail-closed guarantee: a calculated cell has NO ref ───────────────
    def test_amount_cell_is_rejected(self):
        ref, err = _resolve_cell_source_ref(
            _budget_schema(), ['blocks', '1', 'rows', '0', 'cells', 'amount'])
        self.assertIsNone(ref)
        self.assertEqual(err['error'], 'no_cell_source_ref')

    def test_category_cell_is_rejected(self):
        ref, err = _resolve_cell_source_ref(
            _budget_schema(), ['blocks', '1', 'rows', '0', 'cells', 'category'])
        self.assertIsNone(ref)
        self.assertEqual(err['error'], 'no_cell_source_ref')

    # ── a row with no cell_source_refs at all ─────────────────────────────────
    def test_row_without_refs_is_rejected(self):
        ref, err = _resolve_cell_source_ref(
            _budget_schema(), ['blocks', '1', 'rows', '1', 'cells', 'rate'])
        self.assertIsNone(ref)
        self.assertEqual(err['error'], 'no_cell_source_ref')

    # ── malformed paths ───────────────────────────────────────────────────────
    def test_path_not_ending_in_cells_is_rejected(self):
        ref, err = _resolve_cell_source_ref(
            _budget_schema(), ['blocks', '1', 'rows', '0'])
        self.assertIsNone(ref)
        self.assertEqual(err['error'], 'invalid_cell_path')

    def test_path_to_missing_row_is_rejected(self):
        ref, err = _resolve_cell_source_ref(
            _budget_schema(), ['blocks', '1', 'rows', '9', 'cells', 'rate'])
        self.assertIsNone(ref)
        self.assertEqual(err['error'], 'cell_not_found')


class WriteBudgetCellGuards(SimpleTestCase):
    """The pre-DB guard branches of _write_budget_cell (no DB touched)."""

    def test_non_input_column_rejected(self):
        # Even if a ref were forged for `amount`, the writer refuses it.
        res = _write_budget_cell(
            project_id=9, fact_id=257, column='amount', raw_value='999')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'column_not_writable')

    def test_editable_columns_are_qty_and_rate(self):
        self.assertEqual(_EDITABLE_BUDGET_CELL_COLUMNS, {'qty', 'rate'})

    def test_missing_project_rejected(self):
        res = _write_budget_cell(
            project_id=None, fact_id=257, column='rate', raw_value='300')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'project_required')

    def test_non_numeric_value_rejected(self):
        res = _write_budget_cell(
            project_id=9, fact_id=257, column='rate', raw_value='not-a-number')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'invalid_value')

    def test_empty_value_rejected(self):
        res = _write_budget_cell(
            project_id=9, fact_id=257, column='rate', raw_value='')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'invalid_value')


class FormatNpvImpact(SimpleTestCase):
    def test_upward_move(self):
        line = _format_npv_impact(3_000_000, 3_012_400)
        self.assertIn('+$12,400', line)
        self.assertIn('$3,012,400', line)

    def test_downward_move(self):
        line = _format_npv_impact(3_012_400, 3_000_000)
        self.assertTrue(line.startswith('Cash-flow NPV −$12,400'))

    def test_no_move_is_empty(self):
        self.assertEqual(_format_npv_impact(3_000_000, 3_000_000.4), '')

    def test_missing_reading_is_empty(self):
        self.assertEqual(_format_npv_impact(None, 3_000_000), '')
        self.assertEqual(_format_npv_impact(3_000_000, None), '')
