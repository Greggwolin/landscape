"""
Tests for the parcel-sale-schedule inline-edit write path (CB9 — editing spine
slice 3).

Pure-logic tests (SimpleTestCase, no DB) lock in the fail-closed guarantees:
  * the two editable cells (sale_date, commission_amount) resolve to their refs
  * the derived cells (gross / cost_of_sale / net) and the rate-card price have
    NO ref, so they are rejected — the ref is the allowlist
  * the sale writer refuses any column outside {sale_date, commission_amount}
    even if a ref were somehow forged
  * an empty / unparseable sale_date is rejected (the column is NOT NULL)
  * sale_date parsing accepts ISO + common human formats
  * NPV scoping includes the sales table.

The end-to-end DB write (write → recalc → derived values consistent; commission
override survives a recalc) is verified live against project 9 per §15.2; these
tests guard the boundary logic.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from apps.artifacts.views import (
    _EDITABLE_SALE_CELL_COLUMNS,
    _NPV_IMPACTING_TABLES,
    _coerce_sale_date,
    _resolve_cell_source_ref,
    _write_sale_cell,
)
from apps.landscaper.tools.sales_artifact_builder import build_sales_artifact_schema


# A parcel row shaped like the get_sales_schedule read path: parcel_id present
# (so the editable cells get refs), plus the derived columns.
_PARCEL_ROWS = [
    {
        'parcel_id': 4101, 'parcel_code': 'A-1', 'product_code': 'SFD-50',
        'area': None, 'phase': None, 'sale_date': None,
        'gross_sale_proceeds': 5_000_000.0, 'commission_amount': 150_000.0,
        'cost_of_sale': 90_000.0, 'net_sale_proceeds': 4_760_000.0,
    },
    # A row with NO parcel_id — inert: it must carry no refs and be uneditable.
    {
        'parcel_id': None, 'parcel_code': 'A-2', 'product_code': 'SFD-50',
        'area': None, 'phase': None, 'sale_date': None,
        'gross_sale_proceeds': 3_000_000.0, 'commission_amount': 90_000.0,
        'cost_of_sale': 54_000.0, 'net_sale_proceeds': 2_856_000.0,
    },
]

_PRICING_ROWS = [
    {'lu_type_code': 'SFD', 'product_code': 'SFD-50', 'price_per_unit': 100000.0,
     'unit_of_measure': 'EA', 'growth_rate': 0.03,
     'growth_rate_set_id': None, 'benchmark_id': None},
]


def _sales_schema():
    return build_sales_artifact_schema(
        _PARCEL_ROWS, _PRICING_ROWS,
        total_gross=8_000_000.0, total_net=7_616_000.0,
        parcel_count=2, product_count=1, span_label='2030',
    )


def _schedule_block_index(schema):
    for i, b in enumerate(schema['blocks']):
        if b.get('id') == 'sales_parcel_schedule':
            return i
    raise AssertionError('no sales_parcel_schedule block')


class EditableCellRefs(SimpleTestCase):
    """The parcel schedule exposes exactly sale_date + commission as editable."""

    def setUp(self):
        self.schema = _sales_schema()
        self.blk = _schedule_block_index(self.schema)

    def _ref(self, row_idx, column):
        return _resolve_cell_source_ref(
            self.schema,
            ['blocks', str(self.blk), 'rows', str(row_idx), 'cells', column],
        )

    def test_sale_date_resolves_to_parcel_id(self):
        ref, err = self._ref(0, 'sale_date')
        self.assertIsNone(err)
        self.assertEqual(ref['table'], 'tbl_parcel_sale_assumptions')
        self.assertEqual(ref['row_id'], 4101)  # the PARCEL id, not assumption_id
        self.assertEqual(ref['column'], 'sale_date')

    def test_commission_resolves_to_commission_amount(self):
        ref, err = self._ref(0, 'commission')
        self.assertIsNone(err)
        self.assertEqual(ref['row_id'], 4101)
        self.assertEqual(ref['column'], 'commission_amount')

    # ── the fail-closed guarantee: derived cells have NO ref ──────────────────
    def test_gross_cell_is_rejected(self):
        ref, err = self._ref(0, 'gross')
        self.assertIsNone(ref)
        self.assertEqual(err['error'], 'no_cell_source_ref')

    def test_cost_of_sale_cell_is_rejected(self):
        ref, err = self._ref(0, 'cost_of_sale')
        self.assertIsNone(ref)
        self.assertEqual(err['error'], 'no_cell_source_ref')

    def test_net_cell_is_rejected(self):
        ref, err = self._ref(0, 'net')
        self.assertIsNone(ref)
        self.assertEqual(err['error'], 'no_cell_source_ref')

    # ── a parcel row without a parcel_id carries no refs at all ───────────────
    def test_row_without_parcel_id_is_inert(self):
        ref, err = self._ref(1, 'sale_date')
        self.assertIsNone(ref)
        self.assertEqual(err['error'], 'no_cell_source_ref')

    # ── the rate-card rows carry no refs → price is read-only this slice ───────
    def test_rate_card_price_is_rejected(self):
        for i, b in enumerate(self.schema['blocks']):
            if b.get('id') == 'sales_pricing_ratecard':
                ref, err = _resolve_cell_source_ref(
                    self.schema, ['blocks', str(i), 'rows', '0', 'cells', 'price'])
                self.assertIsNone(ref)
                self.assertEqual(err['error'], 'no_cell_source_ref')
                return
        raise AssertionError('no sales_pricing_ratecard block')


class WriteSaleCellGuards(SimpleTestCase):
    """The pre-DB guard branches of _write_sale_cell (no DB touched)."""

    def test_editable_columns_are_sale_date_and_commission(self):
        self.assertEqual(_EDITABLE_SALE_CELL_COLUMNS,
                         {'sale_date', 'commission_amount'})

    def test_non_editable_column_rejected(self):
        # Even if a ref were forged for a derived column, the writer refuses it.
        res = _write_sale_cell(project_id=9, parcel_id=4101,
                               column='net_sale_proceeds', raw_value='1')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'column_not_writable')

    def test_gross_column_rejected(self):
        res = _write_sale_cell(project_id=9, parcel_id=4101,
                               column='gross_sale_proceeds', raw_value='1')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'column_not_writable')

    def test_missing_project_rejected(self):
        res = _write_sale_cell(project_id=None, parcel_id=4101,
                               column='sale_date', raw_value='2030-01-01')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'project_required')

    def test_non_integer_parcel_rejected(self):
        res = _write_sale_cell(project_id=9, parcel_id='not-an-int',
                               column='sale_date', raw_value='2030-01-01')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'invalid_row_id')

    def test_empty_sale_date_rejected(self):
        res = _write_sale_cell(project_id=9, parcel_id=4101,
                               column='sale_date', raw_value='')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'invalid_value')

    def test_unparseable_sale_date_rejected(self):
        res = _write_sale_cell(project_id=9, parcel_id=4101,
                               column='sale_date', raw_value='the fifth of never')
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'invalid_value')


class CoerceSaleDate(SimpleTestCase):
    def test_iso_date(self):
        self.assertEqual(_coerce_sale_date('2030-06-15'), '2030-06-15')

    def test_iso_datetime(self):
        self.assertEqual(_coerce_sale_date('2030-06-15T00:00:00'), '2030-06-15')

    def test_us_slash(self):
        self.assertEqual(_coerce_sale_date('6/15/2030'), '2030-06-15')

    def test_long_form(self):
        self.assertEqual(_coerce_sale_date('June 15, 2030'), '2030-06-15')

    def test_empty_is_none(self):
        self.assertIsNone(_coerce_sale_date(''))
        self.assertIsNone(_coerce_sale_date('   '))
        self.assertIsNone(_coerce_sale_date(None))

    def test_garbage_is_none(self):
        self.assertIsNone(_coerce_sale_date('not a date'))


class NpvScoping(SimpleTestCase):
    def test_sales_table_impacts_npv(self):
        self.assertIn('tbl_parcel_sale_assumptions', _NPV_IMPACTING_TABLES)
        self.assertIn('core_fin_fact_budget', _NPV_IMPACTING_TABLES)
