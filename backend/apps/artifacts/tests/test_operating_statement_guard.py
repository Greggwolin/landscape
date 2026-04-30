"""
Unit tests for the operating-statement Phase 1 guard.

Pure-logic tests use SimpleTestCase (no DB hit). Source-presence tests
mock django.db.connection.cursor so the guard can be exercised without
the landscape schema being live in the test DB.
"""

from __future__ import annotations

from unittest import mock

from django.test import SimpleTestCase

from apps.artifacts.operating_statement_guard import (
    OperatingStatementGuardError,
    SUBTYPE_CURRENT_PROFORMA,
    SUBTYPE_F12_PROFORMA,
    SUBTYPE_T12,
    is_operating_statement_artifact,
    validate_operating_statement_artifact,
)


def _opex_table(columns):
    return {
        'type': 'table',
        'id': 'opex_table',
        'title': 'Operating Expenses',
        'columns': columns,
        'rows': [],
    }


def _section(title, children=None):
    return {
        'type': 'section',
        'id': f'sec_{title.lower().replace(" ", "_")[:20]}',
        'title': title,
        'children': children or [],
    }


def _doc(blocks):
    return {'blocks': blocks}


def _canonical_opex_columns():
    return [
        {'key': 'line', 'label': 'Line'},
        {'key': 'rate', 'label': 'Rate'},
        {'key': 'annual', 'label': 'Annual'},
        {'key': 'per_unit', 'label': 'Per Unit'},
        {'key': 'per_sf', 'label': 'Per SF'},
    ]


# ──────────────────────────────────────────────────────────────────────────────
# Detection
# ──────────────────────────────────────────────────────────────────────────────


class IsOperatingStatementArtifactTests(SimpleTestCase):
    def test_detects_t12_in_title(self):
        self.assertTrue(is_operating_statement_artifact('Operating Statement — T-12 Apr', _doc([])))

    def test_detects_proforma_in_title(self):
        self.assertTrue(is_operating_statement_artifact('Proforma 2026', _doc([])))

    def test_detects_pl_variants(self):
        for t in ('P&L Summary', 'Profit and Loss', 'Income Statement'):
            self.assertTrue(is_operating_statement_artifact(t, _doc([])))

    def test_skips_unrelated_title(self):
        self.assertFalse(is_operating_statement_artifact('Rent Roll', _doc([])))
        self.assertFalse(is_operating_statement_artifact('Sales Comp Grid', _doc([])))
        self.assertFalse(is_operating_statement_artifact('Cap Stack', _doc([])))

    def test_handles_non_string_title(self):
        self.assertFalse(is_operating_statement_artifact(None, _doc([])))
        self.assertFalse(is_operating_statement_artifact(123, _doc([])))


# ──────────────────────────────────────────────────────────────────────────────
# Subtype declaration
# ──────────────────────────────────────────────────────────────────────────────


class SubtypeDeclarationTests(SimpleTestCase):
    def test_missing_subtype_rejected(self):
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=None,
                title='T-12 Operating Statement',
                schema=_doc([]),
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'subtype_required')
        self.assertIsNotNone(ctx.exception.suggested_question)

    def test_empty_string_subtype_rejected(self):
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype='',
                title='T-12',
                schema=_doc([]),
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'subtype_required')

    def test_invalid_subtype_rejected(self):
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype='proforma',  # not in enum — must be f12_proforma
                title='Proforma',
                schema=_doc([]),
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'invalid_subtype')

    def test_envelope_extras_carry_structured_fields(self):
        try:
            validate_operating_statement_artifact(
                subtype=None,
                title='T-12',
                schema=_doc([]),
                project_id=None,
            )
        except OperatingStatementGuardError as exc:
            extras = exc.to_envelope_extras()
            self.assertEqual(extras['guard_code'], 'subtype_required')
            self.assertIn('guidance', extras)
            self.assertIn('suggested_user_question', extras)


# ──────────────────────────────────────────────────────────────────────────────
# Content-shape: forbidden sections
# ──────────────────────────────────────────────────────────────────────────────


class ForbiddenSectionTests(SimpleTestCase):
    def test_property_overview_rejected_for_all_subtypes(self):
        schema = _doc([_section('Property Overview')])
        for subtype in (SUBTYPE_T12, SUBTYPE_F12_PROFORMA, SUBTYPE_CURRENT_PROFORMA):
            with self.subTest(subtype=subtype):
                with mock.patch.object(
                    __import__('apps.artifacts.operating_statement_guard', fromlist=['_check_source_data_presence']),
                    '_check_source_data_presence',
                ):
                    with self.assertRaises(OperatingStatementGuardError) as ctx:
                        validate_operating_statement_artifact(
                            subtype=subtype,
                            title='Operating Statement',
                            schema=schema,
                            project_id=None,
                        )
                    self.assertEqual(ctx.exception.code, 'forbidden_section')

    def test_value_add_rejected_in_t12_only(self):
        schema = _doc([_section('Value-Add Opportunity')])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'forbidden_section_for_t12')

    def test_loss_to_lease_rejected_in_t12_only(self):
        schema = _doc([_section('Loss to Lease')])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'forbidden_section_for_t12')

    def test_value_add_allowed_in_f12_proforma(self):
        # f12_proforma legitimately discusses upside; no rejection on this title alone.
        schema = _doc([_section('Value-Add Opportunity')])
        # Source-data check would fire; bypass for this content-only test.
        validate_operating_statement_artifact(
            subtype=SUBTYPE_F12_PROFORMA,
            title='F-12 Proforma',
            schema=schema,
            project_id=None,  # skips source-data check
        )


# ──────────────────────────────────────────────────────────────────────────────
# Content-shape: forbidden columns
# ──────────────────────────────────────────────────────────────────────────────


class ForbiddenColumnTests(SimpleTestCase):
    def test_market_rent_column_rejected_in_t12(self):
        schema = _doc([{
            'type': 'table',
            'id': 'rev_table',
            'title': 'Revenue',
            'columns': [
                {'key': 'line', 'label': 'Line'},
                {'key': 'in_place', 'label': 'In-Place Rent'},
                {'key': 'market', 'label': 'Market Rent'},  # forbidden in t12
            ],
            'rows': [],
        }])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'forbidden_column_for_t12')

    def test_market_rent_column_allowed_in_current_proforma(self):
        schema = _doc([{
            'type': 'table',
            'id': 'rev_table',
            'title': 'Revenue',
            'columns': [
                {'key': 'line', 'label': 'Line'},
                {'key': 'in_place', 'label': 'In-Place Rent'},
                {'key': 'market', 'label': 'Market Rent'},
            ],
            'rows': [],
        }])
        # Should not raise — current_proforma is the right home for market rent columns.
        validate_operating_statement_artifact(
            subtype=SUBTYPE_CURRENT_PROFORMA,
            title='Current Proforma',
            schema=schema,
            project_id=None,
        )


# ──────────────────────────────────────────────────────────────────────────────
# Content-shape: unit-type-row detection (T-12 only)
# ──────────────────────────────────────────────────────────────────────────────


class UnitTypeRowTests(SimpleTestCase):
    def _income_table_with_rows(self, row_first_values):
        return {
            'type': 'table',
            'id': 'income_breakdown',
            'title': 'Income',
            'columns': [
                {'key': 'line', 'label': 'Line Item'},
                {'key': 'units', 'label': 'Units'},
                {'key': 'avg_rent', 'label': 'Avg Rent'},
                {'key': 'annual', 'label': 'Annual'},
            ],
            'rows': [{'line': v} for v in row_first_values],
        }

    def test_t12_rejects_1br_2br_breakdown(self):
        schema = _doc([self._income_table_with_rows(['1BR/1BA', '2BR/2BA', '3BR/2BA', 'Gross Potential Rent'])])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12 Operating Statement',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'unit_type_breakdown_in_t12')

    def test_t12_rejects_studio_unit_type(self):
        schema = _doc([self._income_table_with_rows(['Studio', '1BR', '2BR'])])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'unit_type_breakdown_in_t12')

    def test_t12_rejects_unit_type_inside_income_section(self):
        # Same content but nested in a section — section heading is "Income",
        # which the older title-only rule wouldn't have caught.
        schema = _doc([{
            'type': 'section',
            'id': 'sec_income',
            'title': 'Income',
            'children': [self._income_table_with_rows(['1BR/1BA', '2BR/2BA'])],
        }])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'unit_type_breakdown_in_t12')

    def test_t12_allows_total_only_income(self):
        # No unit-type rows — all aggregate line items.
        schema = _doc([self._income_table_with_rows([
            'Gross Potential Rent', 'Vacancy', 'Effective Gross Income',
        ])])
        validate_operating_statement_artifact(
            subtype=SUBTYPE_T12,
            title='T-12',
            schema=schema,
            project_id=None,
        )

    def test_f12_proforma_allows_unit_type_breakdown(self):
        # f12_proforma legitimately may show unit-type breakdowns.
        schema = _doc([self._income_table_with_rows(['1BR/1BA', '2BR/2BA'])])
        validate_operating_statement_artifact(
            subtype=SUBTYPE_F12_PROFORMA,
            title='F-12 Proforma',
            schema=schema,
            project_id=None,
        )

    def test_current_proforma_allows_unit_type_breakdown(self):
        schema = _doc([self._income_table_with_rows(['Studio', '1BR', '2BR'])])
        validate_operating_statement_artifact(
            subtype=SUBTYPE_CURRENT_PROFORMA,
            title='Current Proforma',
            schema=schema,
            project_id=None,
        )


# ──────────────────────────────────────────────────────────────────────────────
# Content-shape: OpEx column structure
# ──────────────────────────────────────────────────────────────────────────────


class OpexColumnShapeTests(SimpleTestCase):
    def test_canonical_5_column_opex_passes(self):
        schema = _doc([_opex_table(_canonical_opex_columns())])
        validate_operating_statement_artifact(
            subtype=SUBTYPE_T12,
            title='T-12',
            schema=schema,
            project_id=None,
        )

    def test_missing_per_unit_rejected(self):
        cols = _canonical_opex_columns()
        cols = [c for c in cols if c['key'] != 'per_unit']
        schema = _doc([_opex_table(cols)])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'opex_columns_invalid')
        self.assertIn('per_unit', ctx.exception.missing)

    def test_3_column_opex_rejected(self):
        cols = [
            {'key': 'line', 'label': 'Line'},
            {'key': 'rate', 'label': 'Rate'},
            {'key': 'annual', 'label': 'Annual'},
        ]
        schema = _doc([_opex_table(cols)])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'opex_columns_invalid')
        self.assertEqual(set(ctx.exception.missing), {'per_unit', 'per_sf'})

    def test_subtable_inside_opex_section_with_4_cols_rejected(self):
        # Sub-table titled "Taxes & Insurance" nested inside an "Operating
        # Expenses" section, with only 4 columns (no Rate). The legacy rule
        # missed this because the sub-table's own title doesn't match the
        # OpEx detector. The new ancestor-aware check catches it.
        sub_table = {
            'type': 'table',
            'id': 'taxes_insurance',
            'title': 'Taxes & Insurance',
            'columns': [
                {'key': 'line', 'label': 'Line Item'},
                {'key': 'annual', 'label': 'Annual'},
                {'key': 'per_unit', 'label': '$/Unit'},
                {'key': 'per_sf', 'label': '$/SF'},
            ],
            'rows': [],
        }
        schema = _doc([{
            'type': 'section',
            'id': 'sec_opex',
            'title': 'Operating Expenses',
            'children': [sub_table],
        }])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'opex_columns_invalid')
        self.assertIn('rate', ctx.exception.missing)

    def test_subtable_inside_opex_section_with_5_cols_passes(self):
        sub_table = _opex_table(_canonical_opex_columns())
        sub_table['title'] = 'Utilities'
        sub_table['id'] = 'utilities'
        schema = _doc([{
            'type': 'section',
            'id': 'sec_opex',
            'title': 'Operating Expenses',
            'children': [sub_table],
        }])
        validate_operating_statement_artifact(
            subtype=SUBTYPE_T12,
            title='T-12',
            schema=schema,
            project_id=None,
        )


# ──────────────────────────────────────────────────────────────────────────────
# Source-data presence (mocked DB)
# ──────────────────────────────────────────────────────────────────────────────


class SourcePresenceTests(SimpleTestCase):
    def _mock_cursor(self, fetchone_results):
        """Build a mock that returns fetchone_results in order across .execute() calls."""
        cursor = mock.MagicMock()
        cursor.fetchone.side_effect = list(fetchone_results)

        cm = mock.MagicMock()
        cm.__enter__.return_value = cursor
        cm.__exit__.return_value = False

        connection = mock.MagicMock()
        connection.cursor.return_value = cm
        return connection

    def test_t12_subtype_passes_when_actuals_exist(self):
        # First execute → core_fin_fact_actual returns a row → t12 source check passes.
        # connection is imported lazily inside the guard's helpers — patch the
        # attribute on django.db so the lazy import picks up the mock.
        connection = self._mock_cursor([(1,)])
        with mock.patch('django.db.connection', connection):
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=_doc([]),
                project_id=42,
            )

    def test_t12_subtype_rejected_when_no_actuals_and_no_doc(self):
        # Three fetchone calls all return None:
        #   1. core_fin_fact_actual → None
        #   2. core_doc taxonomy match → None
        #   3. core_doc + core_doc_text fallback → None
        # → guard raises missing_t12_source.
        connection = self._mock_cursor([None, None, None])
        with mock.patch('django.db.connection', connection):
            with self.assertRaises(OperatingStatementGuardError) as ctx:
                validate_operating_statement_artifact(
                    subtype=SUBTYPE_T12,
                    title='T-12',
                    schema=_doc([]),
                    project_id=42,
                )
            self.assertEqual(ctx.exception.code, 'missing_t12_source')
            self.assertIsNotNone(ctx.exception.suggested_question)

    def test_current_proforma_rejected_when_market_rent_missing(self):
        # Fetchone call sequence:
        #   1. _has_t12_source → core_fin_fact_actual returns (1,) → t12 passes
        #   2-4. _has_market_rent_source unit-level probes (multifamily_unit,
        #        rent_roll_unit, multifamily_unit_type) all return None
        #   5. _has_market_rent_source core_doc taxonomy probe → None
        #   6. _has_market_rent_source core_doc_text fallback → None
        # → guard raises missing_market_rent_source.
        connection = self._mock_cursor([(1,), None, None, None, None, None])
        with mock.patch('django.db.connection', connection):
            with self.assertRaises(OperatingStatementGuardError) as ctx:
                validate_operating_statement_artifact(
                    subtype=SUBTYPE_CURRENT_PROFORMA,
                    title='Current Proforma',
                    schema=_doc([]),
                    project_id=42,
                )
            self.assertEqual(ctx.exception.code, 'missing_market_rent_source')

    def test_pre_project_thread_skips_source_check(self):
        # project_id=None → guard does not query the DB at all
        # No mock needed; if it did query we'd get a real connection error.
        validate_operating_statement_artifact(
            subtype=SUBTYPE_T12,
            title='T-12',
            schema=_doc([]),
            project_id=None,
        )
