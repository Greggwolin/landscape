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
    """3-column canonical shape per operating-statement rendering spec.
    Rates go inline in labels (e.g., 'Management Fee (3.0%)'). $/SF and
    Units are dropped — operating statements are unit-denominated and
    don't carry per-unit-type counts; that's rent-roll territory.
    """
    return [
        {'key': 'line', 'label': ''},
        {'key': 'annual', 'label': 'Annual'},
        {'key': 'per_unit', 'label': '$/Unit'},
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

    def test_value_add_section_block_rejected_in_f12_proforma(self):
        # The single-table mandate added later (Pass 5) rejects ALL section
        # blocks at the top level for OS artifacts regardless of subtype.
        # The previous T12-only forbidden-section-titles rule was superseded
        # by the broader structural rule. Value-Add content, if needed, goes
        # as a row inside the single table — not as a separate section block.
        schema = _doc([_section('Value-Add Opportunity')])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_F12_PROFORMA,
                title='F-12 Proforma',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'section_block_in_os')


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
        # Pass 6 added a top-level canonical-shape check (line/annual/per_unit
        # required). To keep this test focused on the T-12-only market-rent
        # forbidden-column rule, we include the canonical columns alongside
        # the in_place/market extras. `market` and `in_place` aren't in the
        # _OS_FORBIDDEN_COLUMN_KEYS set, so they pass the forbidden-extras
        # check; the t12-only substring rule still flags `market` for t12 but
        # not for current_proforma.
        schema = _doc([{
            'type': 'table',
            'id': 'rev_table',
            'title': 'Revenue',
            'columns': [
                {'key': 'line', 'label': ''},
                {'key': 'annual', 'label': 'Annual'},
                {'key': 'per_unit', 'label': '$/Unit'},
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
# Top-level structure — single-table enforcement
# ──────────────────────────────────────────────────────────────────────────────


class TopLevelStructureTests(SimpleTestCase):
    def test_top_level_section_block_rejected(self):
        # Section block at the top level produces duplicate Income heading.
        schema = _doc([{
            'type': 'section',
            'id': 'sec_income',
            'title': 'Income',
            'children': [_opex_table(_canonical_opex_columns())],
        }])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'section_block_in_os')

    def test_multiple_top_level_tables_rejected(self):
        schema = _doc([
            _opex_table(_canonical_opex_columns()),
            _opex_table(_canonical_opex_columns()),
        ])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'multiple_tables_in_os')

    def test_single_top_level_table_passes(self):
        schema = _doc([_opex_table(_canonical_opex_columns())])
        validate_operating_statement_artifact(
            subtype=SUBTYPE_T12,
            title='T-12',
            schema=schema,
            project_id=None,
        )


# ──────────────────────────────────────────────────────────────────────────────
# Content-shape: property-metadata pairs in kv_grid (all subtypes)
# ──────────────────────────────────────────────────────────────────────────────


class PropertyMetadataKvGridTests(SimpleTestCase):
    def _kv_grid(self, pairs):
        return {
            'type': 'key_value_grid',
            'id': 'header_grid',
            'pairs': pairs,
        }

    def test_units_pair_rejected_for_t12(self):
        schema = _doc([self._kv_grid([
            {'label': 'Property', 'value': 'Chadron Terrace'},
            {'label': 'Units', 'value': 113},
        ])])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'property_metadata_in_os')

    def test_square_feet_pair_rejected_for_f12_proforma(self):
        schema = _doc([self._kv_grid([
            {'label': 'Property', 'value': 'Chadron Terrace'},
            {'label': 'Square Feet', 'value': 138504},
            {'label': 'Period', 'value': 'F-12 forecast'},
        ])])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_F12_PROFORMA,
                title='F-12 Proforma',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'property_metadata_in_os')

    def test_year_built_pair_rejected(self):
        schema = _doc([self._kv_grid([
            {'label': 'Year Built', 'value': 2016},
        ])])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'property_metadata_in_os')

    def test_property_and_period_only_passes(self):
        # Property NAME and PERIOD are legitimate header info; no metadata.
        schema = _doc([self._kv_grid([
            {'label': 'Property', 'value': 'Chadron Terrace'},
            {'label': 'Period', 'value': 'T-12 ending Apr 2026'},
        ])])
        validate_operating_statement_artifact(
            subtype=SUBTYPE_T12,
            title='T-12',
            schema=schema,
            project_id=None,
        )

    def test_address_pair_rejected_case_insensitive(self):
        schema = _doc([self._kv_grid([
            {'label': 'ADDRESS', 'value': '123 Main St'},
        ])])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_CURRENT_PROFORMA,
                title='Current Proforma',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'property_metadata_in_os')


# ──────────────────────────────────────────────────────────────────────────────
# Content-shape: unit-type-row detection (T-12 only)
# ──────────────────────────────────────────────────────────────────────────────


class UnitTypeRowTests(SimpleTestCase):
    def _income_table_with_rows(self, row_first_values):
        # Canonical 3-col OS shape — no units column (forbidden), no avg_rent
        # column (rates go inline in labels).
        return {
            'type': 'table',
            'id': 'income_breakdown',
            'title': 'Income',
            'columns': [
                {'key': 'line', 'label': ''},
                {'key': 'annual', 'label': 'Annual'},
                {'key': 'per_unit', 'label': '$/Unit'},
            ],
            'rows': [
                {'id': f'r_{i}', 'cells': {'line': v, 'annual': 0, 'per_unit': 0}}
                for i, v in enumerate(row_first_values)
            ],
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

    def test_legacy_5_col_with_rate_and_per_sf_rejected_as_forbidden_extras(self):
        """Legacy 5-col shape (line/rate/annual/per_unit/per_sf) gets
        rejected by the new forbidden-extras check — `rate` and `per_sf`
        are not allowed on operating statements."""
        cols = [
            {'key': 'line', 'label': 'Line'},
            {'key': 'rate', 'label': 'Rate'},
            {'key': 'annual', 'label': 'Annual'},
            {'key': 'per_unit', 'label': 'Per Unit'},
            {'key': 'per_sf', 'label': 'Per SF'},
        ]
        schema = _doc([_opex_table(cols)])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'os_table_forbidden_columns')
        forbidden = ctx.exception.missing
        self.assertIn('rate', forbidden)
        self.assertIn('per_sf', forbidden)

    def test_units_column_rejected(self):
        """Units column is forbidden on an operating statement — unit-mix
        belongs on a rent roll."""
        cols = [
            {'key': 'line', 'label': 'Line'},
            {'key': 'units', 'label': 'Units'},
            {'key': 'annual', 'label': 'Annual'},
            {'key': 'per_unit', 'label': '$/Unit'},
        ]
        schema = _doc([_opex_table(cols)])
        with self.assertRaises(OperatingStatementGuardError) as ctx:
            validate_operating_statement_artifact(
                subtype=SUBTYPE_T12,
                title='T-12',
                schema=schema,
                project_id=None,
            )
        self.assertEqual(ctx.exception.code, 'os_table_forbidden_columns')
        self.assertIn('units', ctx.exception.missing)

    def test_2_column_table_rejected_for_missing_per_unit(self):
        cols = [
            {'key': 'line', 'label': 'Line'},
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
        # Could be content-shape's opex_columns_invalid (the table is
        # OpEx-titled) or top-level's os_table_missing_required_columns —
        # both are reasonable rejection codes for missing per_unit.
        self.assertIn(
            ctx.exception.code,
            {'opex_columns_invalid', 'os_table_missing_required_columns'},
        )

    def test_top_level_opex_table_with_canonical_cols_passes(self):
        # Single top-level table titled "Operating Expenses" with the
        # canonical 4-col shape. Replaces an earlier section-wrapped test —
        # Pass 5's single-table mandate forbids top-level section blocks
        # regardless, so the section-wrapped variant is no longer composable.
        # The OpEx column rule still fires here via _is_opex_table's
        # title detection.
        opex_table = _opex_table(_canonical_opex_columns())
        opex_table['id'] = 'opex_main'
        schema = _doc([opex_table])
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
