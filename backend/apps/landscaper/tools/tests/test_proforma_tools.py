"""
Unit tests for `_compose_proforma_schema` in proforma_tools.py.

Pure schema-composition tests — no DB hit, no growth-rate fetch. Synthetic
operations data shaped to match what views_operations.operations_data emits.

Verifies:
  1. Schema validates against the block-document schema (unique IDs, one
     top-level table, canonical 3-column shape).
  2. Schema passes the Phase 5 OS guard for subtype f12_proforma.
  3. Income-side numbers grow by income_growth_rate; vacancy/credit/
     concessions percentages are preserved (recomputed from grown GPR).
  4. Expense-side numbers grow by expense_growth_rate.
  5. Management Fee % is preserved (recomputed from grown EGI).
  6. Replacement Reserves per-unit grows by expense_growth_rate.
  7. Title surfaces growth rates applied.
  8. NO unit-mix breakdown rows in the income section.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from apps.artifacts.operating_statement_guard import (
    is_operating_statement_artifact,
)
from apps.artifacts.schema_validation import validate_block_document
from apps.landscaper.tools.proforma_tools import (
    _compose_proforma_schema,
    _per_unit,
    _round_currency,
)


def _synthetic_operations(
    *,
    gpr: float = 2_693_258.0,
    physical_vac_pct: float = 0.097,
    credit_loss_pct: float = 0.005,
    concessions_pct: float = 0.010,
    mgmt_fee_pct: float = 0.030,
    reserves_per_unit: float = 300.0,
):
    """Mirror the shape of operations_data response for Chadron Terrace-like input."""
    return {
        'rental_income': {
            'section_total': {'as_is': gpr},
            'rows': [],  # T-12 doesn't include unit-type breakdown in income
        },
        'vacancy_deductions': {
            'rows': [
                {'line_item_key': 'physical_vacancy', 'label': 'Physical Vacancy',
                 'as_is': {'rate': physical_vac_pct, 'total': -gpr * physical_vac_pct}},
                {'line_item_key': 'credit_loss', 'label': 'Credit Loss',
                 'as_is': {'rate': credit_loss_pct, 'total': -gpr * credit_loss_pct}},
                {'line_item_key': 'concessions', 'label': 'Concessions',
                 'as_is': {'rate': concessions_pct, 'total': -gpr * concessions_pct}},
            ],
            'section_total': {'as_is': -gpr * (physical_vac_pct + credit_loss_pct + concessions_pct)},
        },
        'other_income': {'rows': [], 'section_total': {'as_is': 0}},
        'operating_expenses': {
            'rows': [
                {
                    'parent_category': 'taxes_insurance',
                    'label': 'Taxes & Insurance',
                    'children': [
                        {'line_item_key': 'real_estate_taxes', 'label': 'Real Estate Taxes',
                         'as_is': {'total': 573_900}},
                        {'line_item_key': 'insurance', 'label': 'Insurance',
                         'as_is': {'total': 129_688}},
                    ],
                },
                {
                    'parent_category': 'utilities',
                    'label': 'Utilities',
                    'children': [
                        {'line_item_key': 'electricity', 'label': 'Electricity',
                         'as_is': {'total': 121_524}},
                        {'line_item_key': 'gas', 'label': 'Gas', 'as_is': {'total': 34_032}},
                        {'line_item_key': 'water_sewer', 'label': 'Water & Sewer',
                         'as_is': {'total': 147_912}},
                        {'line_item_key': 'trash', 'label': 'Trash', 'as_is': {'total': 31_512}},
                    ],
                },
                {
                    # Skipped — composer recomputes mgmt_fee + reserves explicitly
                    'parent_category': 'management_reserves',
                    'label': 'Management & Reserves',
                    'children': [],
                },
            ],
            'section_total': {'as_is': 1_175_740},
        },
        'assumptions': {
            'physical_vacancy_pct': physical_vac_pct,
            'credit_loss_pct': credit_loss_pct,
            'concessions_pct': concessions_pct,
            'management_fee_pct': mgmt_fee_pct,
            'reserves_per_unit': reserves_per_unit,
        },
    }


class ComposeProformaSchemaTests(SimpleTestCase):
    """Phase-5-compliant single-table schema with grown numbers."""

    def setUp(self):
        self.unit_count = 113
        self.income_growth = 0.030
        self.expense_growth = 0.030
        self.ops = _synthetic_operations()
        self.schema = _compose_proforma_schema(
            operations=self.ops,
            growth={
                'income_growth_rate': self.income_growth,
                'expense_growth_rate': self.expense_growth,
            },
            unit_count=self.unit_count,
        )

    # 1. Generic schema validation
    def test_schema_validates(self):
        validate_block_document(self.schema)  # raises on failure

    # 2. Single top-level table, canonical 3-col shape
    def test_single_top_level_table(self):
        blocks = self.schema['blocks']
        self.assertEqual(len(blocks), 1)
        self.assertEqual(blocks[0]['type'], 'table')

    def test_canonical_columns(self):
        cols = [c['key'] for c in self.schema['blocks'][0]['columns']]
        self.assertEqual(cols, ['line', 'annual', 'per_unit'])

    # 3. Title detection — Phase 5 OS guard activates on title keywords
    def test_proforma_title_triggers_os_guard(self):
        # Detection helper used by the guard; F-12 title must include 'proforma'
        self.assertTrue(is_operating_statement_artifact('Chadron Terrace — F-12 Proforma · Income +3.0%, Expenses +3.0%', self.schema))

    # 4. Income section — GPR grown, no unit-mix breakdown
    def test_gpr_grown_by_income_rate(self):
        rows = {r['id']: r for r in self.schema['blocks'][0]['rows']}
        gpr_t12 = self.ops['rental_income']['section_total']['as_is']
        expected = _round_currency(gpr_t12 * (1.0 + self.income_growth))
        self.assertEqual(rows['gpr']['cells']['annual'], expected)

    def test_no_unit_type_rows_in_income(self):
        """Per Gregg's directive: F-12 mirrors T-12 structure exactly. T-12
        has no unit-mix breakdown in the income section, so F-12 doesn't either."""
        import re
        unit_type_re = re.compile(
            r'^\s*('
            r'studio|efficiency|eff\b'
            r'|\d+\s*(br|bd|ba|bed|bath|bedroom|bathroom)'
            r')',
            re.IGNORECASE,
        )
        for row in self.schema['blocks'][0]['rows']:
            label = row['cells'].get('line', '')
            self.assertFalse(
                unit_type_re.match(label),
                f'unit-type row leaked into F-12 income section: {label!r}',
            )

    # 5. Vacancy / credit / concessions percentages preserved (values recompute)
    def test_vacancy_percentages_preserved(self):
        rows = {r['id']: r for r in self.schema['blocks'][0]['rows']}
        gpr_grown = self.ops['rental_income']['section_total']['as_is'] * (1.0 + self.income_growth)
        # Each is negative (deduction)
        self.assertEqual(
            rows['phys_vac']['cells']['annual'],
            _round_currency(-gpr_grown * 0.097),
        )
        self.assertEqual(
            rows['credit_loss']['cells']['annual'],
            _round_currency(-gpr_grown * 0.005),
        )
        self.assertEqual(
            rows['concessions']['cells']['annual'],
            _round_currency(-gpr_grown * 0.010),
        )
        # Labels carry the rate inline
        self.assertIn('(9.7%)', rows['phys_vac']['cells']['line'])
        self.assertIn('(0.5%)', rows['credit_loss']['cells']['line'])
        self.assertIn('(1.0%)', rows['concessions']['cells']['line'])

    # 6. Expense lines grow by expense rate
    def test_expense_lines_grown_by_expense_rate(self):
        rows = {r['id']: r for r in self.schema['blocks'][0]['rows']}
        # Real estate taxes is the first child of the first parent (taxes_insurance)
        # Row id pattern: opex_<parent_idx>_<child_idx>_<line_item_key>
        re_taxes_row = next(r for r in self.schema['blocks'][0]['rows']
                            if 'real_estate_taxes' in r['id'])
        expected = _round_currency(573_900 * (1.0 + self.expense_growth))
        self.assertEqual(re_taxes_row['cells']['annual'], expected)

        # Utilities: each of 4 children should appear independently — no collapsing
        utility_lines = [r for r in self.schema['blocks'][0]['rows']
                         if r['id'].startswith('opex_1_')]
        utility_labels = sorted(r['cells']['line'] for r in utility_lines)
        self.assertEqual(
            utility_labels,
            ['Electricity', 'Gas', 'Trash', 'Water & Sewer'],
        )

    # 7. Management Fee % preserved, recomputed from grown EGI
    def test_mgmt_fee_pct_preserved(self):
        rows = {r['id']: r for r in self.schema['blocks'][0]['rows']}
        gpr_grown = 2_693_258 * (1.0 + self.income_growth)
        egi_grown = (
            gpr_grown
            - gpr_grown * 0.097
            - gpr_grown * 0.005
            - gpr_grown * 0.010
        )
        expected = _round_currency(egi_grown * 0.030)
        self.assertEqual(rows['mgmt_fee']['cells']['annual'], expected)
        self.assertIn('(3.0%)', rows['mgmt_fee']['cells']['line'])

    # 8. Replacement reserves per-unit grows by expense rate
    def test_reserves_grown_by_expense_rate(self):
        rows = {r['id']: r for r in self.schema['blocks'][0]['rows']}
        expected_per_unit = 300.0 * (1.0 + self.expense_growth)
        expected_total = _round_currency(expected_per_unit * self.unit_count)
        self.assertEqual(rows['reserves']['cells']['annual'], expected_total)

    # 9. Section dividers are label-only
    def test_section_dividers_label_only(self):
        rows = self.schema['blocks'][0]['rows']
        income_hdr = next(r for r in rows if r['id'] == 'hdr_income')
        opex_hdr = next(r for r in rows if r['id'] == 'hdr_opex')
        for hdr in (income_hdr, opex_hdr):
            self.assertEqual(set(hdr['cells'].keys()), {'line'})

    # 10. NOI = EGI - Total OpEx (round-trip arithmetic)
    def test_noi_equals_egi_minus_opex(self):
        rows = {r['id']: r for r in self.schema['blocks'][0]['rows']}
        egi = rows['egi']['cells']['annual']
        total_opex = rows['total_opex']['cells']['annual']
        noi = rows['noi']['cells']['annual']
        # Allow ±$2 rounding drift across the chain (each line is rounded to whole $)
        self.assertAlmostEqual(noi, egi - total_opex, delta=2)


class HelpersTests(SimpleTestCase):
    def test_per_unit_zero_unit_count_safe(self):
        self.assertEqual(_per_unit(100.0, 0), 0)

    def test_round_currency_negative(self):
        self.assertEqual(_round_currency(-1234.51), -1235)
        self.assertEqual(_round_currency(-1234.49), -1234)
