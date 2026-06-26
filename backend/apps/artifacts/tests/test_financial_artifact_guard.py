"""
Tests for the create-time financial-artifact fabrication guard
(JB55-ARTIFACT-CREATE-GUARD-0625).

Pure-logic tests (SimpleTestCase, no DB) cover the sourcing rule. The DB-backed
test proves create_artifact_record REJECTS a fabricated financial card before it
persists (the hard-prevention guarantee) and PASSES a card a numbers tool sourced.
"""

from __future__ import annotations

from django.test import SimpleTestCase, TestCase

from apps.artifacts.financial_artifact_guard import (
    FinancialArtifactGuardError,
    artifact_states_financials,
    validate_financial_artifact_sourcing,
)


def _fin_doc():
    return {'blocks': [{'type': 'text', 'id': 't1', 'content': 'Total renovation budget: $2.94M ($25/SF)'}]}


def _nonfin_doc():
    # Percentages but no financial-claim keyword → not a financial card.
    return {'blocks': [{'type': 'text', 'id': 't1', 'content': 'Unit mix: Studio 20%, 1BR 50%, 2BR 30%'}]}


class FinancialArtifactSourcingLogic(SimpleTestCase):
    # ── detection ────────────────────────────────────────────────────────────
    def test_detects_financial_card(self):
        self.assertTrue(artifact_states_financials('Renovation Budget', _fin_doc()))

    def test_non_financial_card_not_detected(self):
        self.assertFalse(artifact_states_financials('Unit Mix', _nonfin_doc()))

    # ── the forced fabrication: financial card, no numbers tool → raise ───────
    def test_blocks_financial_card_with_no_numbers_tool(self):
        with self.assertRaises(FinancialArtifactGuardError) as ctx:
            validate_financial_artifact_sourcing(
                title='Renovation Budget', schema=_fin_doc(), prior_tool_calls=['create_artifact'],
            )
        self.assertEqual(ctx.exception.code, 'unsourced_financial_artifact')
        extras = ctx.exception.to_envelope_extras()
        self.assertEqual(extras['guard_code'], 'unsourced_financial_artifact')
        self.assertIn('suggested_user_question', extras)

    def test_blocks_when_only_a_structure_tool_ran(self):
        # Reading get_equity_structure (tiers/splits) does not license card dollars.
        with self.assertRaises(FinancialArtifactGuardError):
            validate_financial_artifact_sourcing(
                title='Equity Card', schema=_fin_doc(),
                prior_tool_calls=['get_equity_structure', 'create_artifact'],
            )

    # ── passes: a numbers tool sourced the card ──────────────────────────────
    def test_passes_when_a_numbers_tool_ran(self):
        validate_financial_artifact_sourcing(
            title='Renovation Budget', schema=_fin_doc(),
            prior_tool_calls=['get_budget_items', 'create_artifact'],
        )  # no raise

    def test_passes_calculate_tool(self):
        validate_financial_artifact_sourcing(
            title='Returns', schema=_fin_doc(), prior_tool_calls=['calculate_waterfall'],
        )  # no raise

    # ── passes: non-financial card, or unknown caller ────────────────────────
    def test_passes_non_financial_card_even_with_no_tools(self):
        validate_financial_artifact_sourcing(
            title='Unit Mix', schema=_nonfin_doc(), prior_tool_calls=[],
        )  # no raise

    def test_skips_when_tool_list_unknown(self):
        # prior_tool_calls=None (REST/edit callers) → guard is a no-op.
        validate_financial_artifact_sourcing(
            title='Renovation Budget', schema=_fin_doc(), prior_tool_calls=None,
        )  # no raise


class CreateArtifactRecordRejection(TestCase):
    """The hard-prevention guarantee: a fabricated financial card never persists."""

    def _count(self):
        from apps.artifacts.models import Artifact
        return Artifact.objects.count()

    def test_fabricated_card_rejected_at_create_and_not_persisted(self):
        from apps.artifacts.services import create_artifact_record
        before = self._count()
        result = create_artifact_record(
            title='Renovation Budget',
            schema=_fin_doc(),
            project_id=1,
            tool_name='create_artifact',
            prior_tool_calls=['create_artifact'],  # no numbers tool this turn
        )
        self.assertFalse(result.get('success'))
        self.assertEqual(result.get('guard_code'), 'unsourced_financial_artifact')
        self.assertEqual(self._count(), before)  # nothing written

    def test_sourced_card_not_blocked_by_financial_guard(self):
        from apps.artifacts.services import create_artifact_record
        result = create_artifact_record(
            title='Renovation Budget',
            schema=_fin_doc(),
            project_id=1,
            tool_name='create_artifact',
            prior_tool_calls=['get_budget_items', 'create_artifact'],
        )
        # The financial guard must not be the thing that rejected it.
        self.assertNotEqual(result.get('guard_code'), 'unsourced_financial_artifact')
