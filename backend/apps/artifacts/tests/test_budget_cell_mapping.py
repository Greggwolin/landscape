"""
Budget slice 2 — the cell→column mapping and the impact line.

TWO THINGS ARE GUARDED HERE, and both are the kind that fail quietly.

1. THE COLUMN CROSS-OVER. The artifact's cell keys are not the database's
   column names, and two of them cross:

       artifact `description`  →  column `notes`
       artifact `notes`        →  column `internal_memo`

   Getting this wrong does not raise. It overwrites the line's description with
   the user's note and looks like it worked. So the mapping lives in exactly one
   place and is asserted here.

2. THE SILENT IMPACT LINE. start_period / periods_to_complete are TIMING inputs:
   they change when money is spent, not how much, so a duration edit can reshape
   the whole schedule and move NPV by less than a dollar. The old formatter
   returned '' for that — a committed write that reported nothing, which the user
   cannot tell apart from a no-op. Every clause test below exists to keep the
   line speaking.

No database is touched: these are pure functions over dicts.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from apps.artifacts.views import (
    _build_impact_line,
    _diagnose_zero_npv,
    _format_npv_clause,
    _format_timing_clause,
)
from apps.landscaper.tools.budget_artifact_builder import (
    _BUDGET_CELL_TO_COLUMN,
    _EDITABLE_BUDGET_COLUMNS,
    _cell_source_refs,
)

CAPTURED_AT = '2026-08-20T00:00:00+00:00'


def _record():
    """One budget row as fetch_budget_schedule_data returns it."""
    return {
        'fact_id': 257,
        'qty': 788.0,
        'rate': 250.0,
        'amount': 197000.0,
        'uom_code': 'LS',
        # The line's DESCRIPTION lives in `notes`...
        'notes': 'Mass grading',
        # ...and the user's note lives in `internal_memo`.
        'internal_memo': 'Bid pending from Sundt',
        'start_period': 4,
        'periods_to_complete': 3,
        'end_period': 6,
    }


class BudgetCellColumnMapping(SimpleTestCase):
    def test_notes_cell_writes_internal_memo_not_the_description(self):
        """THE trap. If this fails, a note is about to eat a description."""
        self.assertEqual(_BUDGET_CELL_TO_COLUMN['notes'], 'internal_memo')

    def test_description_cell_writes_the_notes_column(self):
        """The other half of the cross-over, live since slice 2b.

        Slice 2 could rely on `description` being read-only; a line has to be
        nameable to be created, so both halves are now user-editable IN
        OPPOSITE DIRECTIONS. This pair of assertions is the only thing between
        a user's note and a line's title.
        """
        self.assertEqual(_BUDGET_CELL_TO_COLUMN['description'], 'notes')

    def test_the_two_halves_of_the_cross_over_never_share_a_column(self):
        refs = _cell_source_refs(_record(), CAPTURED_AT)
        self.assertEqual(refs['description']['column'], 'notes')
        self.assertEqual(refs['notes']['column'], 'internal_memo')
        self.assertNotEqual(refs['description']['column'], refs['notes']['column'])

    def test_each_half_captures_its_own_value_not_the_others(self):
        refs = _cell_source_refs(_record(), CAPTURED_AT)
        self.assertEqual(refs['description']['captured_value'], 'Mass grading')
        self.assertEqual(refs['notes']['captured_value'], 'Bid pending from Sundt')

    def test_period_cells_map_to_the_period_columns(self):
        self.assertEqual(_BUDGET_CELL_TO_COLUMN['start'], 'start_period')
        self.assertEqual(_BUDGET_CELL_TO_COLUMN['duration'], 'periods_to_complete')

    def test_uom_maps_to_the_fk_code_column(self):
        self.assertEqual(_BUDGET_CELL_TO_COLUMN['uom'], 'uom_code')

    def test_editable_set_is_the_slice_2b_set(self):
        self.assertEqual(
            set(_EDITABLE_BUDGET_COLUMNS),
            {'qty', 'rate', 'uom', 'start', 'duration', 'notes',
             'division', 'stage', 'category', 'description', 'vendor',
             'timing_method', 'start_date', 'end_date', 'cf_start',
             'curve_profile', 'curve_steepness', 'escalation',
             'escalation_method'},
        )

    def test_contingency_is_absent_from_the_surface(self):
        """Deliberately not built. contingency_pct is read by no engine and
        contingency_mode has no data, no constraint and no code anywhere, so a
        contingency cell would persist a value that changes nothing -- the same
        control-that-does-nothing we refused to ship for escalation."""
        for key in _EDITABLE_BUDGET_COLUMNS:
            self.assertNotIn('contingency', key)

    def test_the_view_spec_offers_exactly_what_the_builder_backs(self):
        """The renderer decides editability from the refs; the view spec tells
        the user what is on offer. If those drift, the surface either
        advertises cells it cannot write or hides ones it can -- the second is
        what shipped in slice 1 and what UB4 found in QA.

        The FRONTEND carries BUDGET_EDITABLE_CELLS in
        src/components/wrapper/budgetCellTarget.ts and is DELIBERATELY BEHIND
        these two for now: slice 2b built the server-side field model first, and
        the renderer still offers only the six cells it can draw. Raising the
        frontend constant before the renderer can draw the rest would mark every
        existing artifact stale and turn the whole table read-only -- the UB4
        all-or-nothing rule working exactly as intended, against us. It moves
        when the cells it names can actually be rendered.
        """
        from apps.landscaper.tools.schedule_view_spec import BUDGET_OFFERED_CELLS
        self.assertEqual(set(BUDGET_OFFERED_CELLS), set(_EDITABLE_BUDGET_COLUMNS))

    def test_every_ref_points_at_the_mapped_column(self):
        """The refs are generated FROM the mapping, so this proves the whole
        table at once rather than one entry at a time."""
        refs = _cell_source_refs(_record(), CAPTURED_AT)
        for cell_key in _EDITABLE_BUDGET_COLUMNS:
            expected = _BUDGET_CELL_TO_COLUMN.get(cell_key, cell_key)
            self.assertEqual(refs[cell_key]['column'], expected, cell_key)

    def test_notes_ref_captures_the_memo_value_not_the_description(self):
        refs = _cell_source_refs(_record(), CAPTURED_AT)
        self.assertEqual(refs['notes']['captured_value'], 'Bid pending from Sundt')
        self.assertNotEqual(refs['notes']['captured_value'], 'Mass grading')

    def test_amount_carries_no_ref(self):
        """The trigger owns amount. A ref would make it writable."""
        self.assertNotIn('amount', _cell_source_refs(_record(), CAPTURED_AT))

    def test_an_unmapped_cell_key_gets_no_ref(self):
        """Fail closed: a key nobody added to the editable set is read-only,
        rather than falling through to a same-named column."""
        refs = _cell_source_refs(_record(), CAPTURED_AT)
        for unmapped in ('period', 'end_period', 'amount', 'contingency'):
            self.assertNotIn(unmapped, refs, unmapped)

    def test_date_captures_are_json_serialisable(self):
        """The schema is PERSISTED as JSON.

        A psycopg2 date lands in a ref's captured_value unserialisable, and the
        failure mode is nasty: the row write itself succeeds, then saving the
        rebuilt artifact raises `Object of type date is not JSON serializable`,
        so the database is updated while the client gets a 500 and shows the
        edit as still pending. Found in a browser, not by a test — this is the
        test.
        """
        import json
        from datetime import date
        record = _record()
        record['start_date'] = date(2027, 3, 1)
        record['end_date'] = date(2027, 6, 1)
        refs = _cell_source_refs(record, CAPTURED_AT)
        json.dumps(refs)  # must not raise
        self.assertEqual(refs['start_date']['captured_value'], '2027-03-01')
        self.assertEqual(refs['end_date']['captured_value'], '2027-06-01')

    def test_row_without_a_fact_id_gets_no_refs(self):
        record = _record()
        record['fact_id'] = None
        self.assertEqual(_cell_source_refs(record, CAPTURED_AT), {})


class TimingClause(SimpleTestCase):
    def test_start_change_names_the_derived_end_period(self):
        """The user changed start; the TRIGGER changed end_period. Both belong
        in the same sentence, or the second change is discovered later."""
        clause = _format_timing_clause(
            'Mass grading',
            {'start_period': 4, 'periods_to_complete': 3, 'end_period': 6},
            {'start_period': 7, 'periods_to_complete': 3, 'end_period': 9},
        )
        self.assertIn('starts period 7 (was 4)', clause)
        self.assertIn('ends 9', clause)

    def test_duration_change_names_what_was_edited_and_what_was_derived(self):
        clause = _format_timing_clause(
            'Mass grading',
            {'start_period': 4, 'periods_to_complete': 3, 'end_period': 6},
            {'start_period': 4, 'periods_to_complete': 6, 'end_period': 9},
        )
        self.assertIn('runs 6 periods (was 3)', clause)
        self.assertIn('ends 9', clause)

    def test_both_changed_reports_both(self):
        clause = _format_timing_clause(
            'Mass grading',
            {'start_period': 4, 'periods_to_complete': 3, 'end_period': 6},
            {'start_period': 7, 'periods_to_complete': 6, 'end_period': 12},
        )
        self.assertIn('starts period 7 (was 4)', clause)
        self.assertIn('runs 6 periods (was 3)', clause)
        self.assertIn('ends 12', clause)

    def test_a_previously_unset_start_reads_as_a_dash_not_none(self):
        clause = _format_timing_clause(
            'Mass grading',
            {'start_period': None, 'periods_to_complete': 3, 'end_period': None},
            {'start_period': 2, 'periods_to_complete': 3, 'end_period': 4},
        )
        self.assertIn('(was —)', clause)
        self.assertNotIn('None', clause)

    def test_nothing_moved_produces_no_clause(self):
        same = {'start_period': 4, 'periods_to_complete': 3, 'end_period': 6}
        self.assertEqual(_format_timing_clause('Mass grading', same, dict(same)), '')

    def test_singular_period_is_not_pluralised(self):
        clause = _format_timing_clause(
            'Mass grading',
            {'start_period': 4, 'periods_to_complete': 3, 'end_period': 6},
            {'start_period': 4, 'periods_to_complete': 1, 'end_period': 4},
        )
        self.assertIn('runs 1 period (was 3)', clause)
        self.assertNotIn('1 periods', clause)


class NpvClause(SimpleTestCase):
    def test_a_real_move_reports_the_delta_and_the_new_total(self):
        clause = _format_npv_clause(2_328_400.0, 2_310_000.0, discount_rate=0.11)
        self.assertIn('−$18,400', clause)
        self.assertIn('$2,310,000', clause)

    def test_a_gain_uses_a_plus(self):
        clause = _format_npv_clause(2_310_000.0, 2_328_400.0, discount_rate=0.11)
        self.assertIn('+$18,400', clause)

    def test_a_sub_dollar_move_says_it_moved_never_unchanged(self):
        """CASE 3b, and SUCCESS CRITERION 11's wording rule.

        A cash flow values money by WHEN it occurs, so a timing edit on a real
        amount at a real rate always moves NPV. "Unchanged" would be false, and
        would teach the user that retiming a cost is free — the opposite of
        what the model is telling them. Say what is true: it moved, by less
        than the dollar we print to.
        """
        clause = _format_npv_clause(2_310_000.0, 2_310_000.4, discount_rate=0.11)
        self.assertIn('less than $1', clause)
        self.assertNotIn('unchanged', clause.lower())

    def test_a_sub_dollar_fall_names_the_direction(self):
        clause = _format_npv_clause(2_310_000.4, 2_310_000.0, discount_rate=0.11)
        self.assertIn('down', clause)
        self.assertIn('less than $1', clause)

    def test_the_headline_stays_in_whole_dollars(self):
        """Chasing a sub-dollar move by widening precision would change how
        every NPV in the product reads, to win an edge case."""
        clause = _format_npv_clause(2_310_000.0, 2_310_000.4, discount_rate=0.11)
        self.assertIn('$2,310,000', clause)
        self.assertNotIn('2,310,000.4', clause)

    def test_the_word_unchanged_never_appears_in_any_branch(self):
        for before, after, rate, cause in (
            (2_328_400.0, 2_310_000.0, 0.11, None),
            (2_310_000.0, 2_310_000.4, 0.11, None),
            (2_310_000.0, 2_310_000.0, 0.0, 'the rate is zero'),
            (2_310_000.0, 2_310_000.0, 0.11, None),
            (None, None, 0.11, None),
            (2_310_000.0, 2_310_000.0, None, None),
        ):
            clause = _format_npv_clause(
                before, after, discount_rate=rate, zero_cause=cause,
                timing_edit=True)
            self.assertNotIn('unchanged', clause.lower(), (before, after, rate))


class ExactZeroDelta(SimpleTestCase):
    """CASE 3c. An exact zero is a condition to explain, never a bare result."""

    def test_a_named_cause_is_stated(self):
        clause = _format_npv_clause(
            2_310_000.0, 2_310_000.0, discount_rate=0.0,
            zero_cause='the project discount rate is zero', timing_edit=True)
        self.assertIn('the project discount rate is zero', clause)

    def test_an_unexplained_zero_on_a_timing_edit_is_flagged_as_a_defect(self):
        """SUCCESS CRITERION 15.

        None of the known causes applies, so the timing input did not reach the
        engine. Reporting this as a quiet success is the silent-write failure
        the impact line exists to prevent.
        """
        clause = _format_npv_clause(
            2_310_000.0, 2_310_000.0, discount_rate=0.11,
            zero_cause=None, timing_edit=True)
        self.assertIn('defect', clause)
        self.assertIn('may not have reached the cash flow', clause)

    def test_an_unexplained_zero_on_a_NON_timing_edit_is_not_a_defect(self):
        """A rate edit that nets to zero NPV is unremarkable — only a RETIMED
        cost is guaranteed to move present value."""
        clause = _format_npv_clause(
            2_310_000.0, 2_310_000.0, discount_rate=0.11,
            zero_cause=None, timing_edit=False)
        self.assertNotIn('defect', clause)

    # ── which cause was detected ────────────────────────────────────────────
    def _snapshots(self, *, before_start=4, after_start=7, amount=197000.0):
        return (
            {257: {'start_period': before_start, 'periods_to_complete': 3,
                   'end_period': before_start + 2, 'label': 'Grading',
                   'amount': amount}},
            {257: {'start_period': after_start, 'periods_to_complete': 3,
                   'end_period': after_start + 2, 'label': 'Grading',
                   'amount': amount}},
        )

    def test_zero_discount_rate_is_detected(self):
        before, after = self._snapshots()
        self.assertIn('discount rate is zero', _diagnose_zero_npv(
            discount_rate=0.0, timing_before=before, timing_after=after,
            horizon=60))

    def test_zero_amount_is_detected(self):
        before, after = self._snapshots(amount=0.0)
        self.assertIn('no amount to move', _diagnose_zero_npv(
            discount_rate=0.11, timing_before=before, timing_after=after,
            horizon=60))

    def test_an_unchanged_spread_is_detected(self):
        before, after = self._snapshots(before_start=4, after_start=4)
        self.assertIn('did not actually change', _diagnose_zero_npv(
            discount_rate=0.11, timing_before=before, timing_after=after,
            horizon=60))

    def test_outside_the_horizon_is_detected(self):
        before, after = self._snapshots(before_start=200, after_start=240)
        self.assertIn('outside the analysis horizon', _diagnose_zero_npv(
            discount_rate=0.11, timing_before=before, timing_after=after,
            horizon=60))

    def test_a_line_moved_INTO_the_horizon_is_not_called_outside_it(self):
        """Only truncated-either-way counts. A cost that moves from beyond the
        horizon to inside it genuinely should change NPV."""
        before, after = self._snapshots(before_start=200, after_start=10)
        self.assertIsNone(_diagnose_zero_npv(
            discount_rate=0.11, timing_before=before, timing_after=after,
            horizon=60))

    def test_no_known_cause_returns_none_so_the_caller_can_flag_it(self):
        before, after = self._snapshots()
        self.assertIsNone(_diagnose_zero_npv(
            discount_rate=0.11, timing_before=before, timing_after=after,
            horizon=60))

    def test_no_discount_rate_says_so_rather_than_showing_a_number(self):
        """The engine falls back to 10% when a project has no stored rate. An
        NPV computed from an invented rate must never be reported as the
        user's own figure."""
        clause = _format_npv_clause(2_328_400.0, 2_310_000.0, discount_rate=None)
        self.assertIn('no discount rate', clause)
        self.assertNotIn('$2,310,000', clause)

    def test_an_unreadable_cash_flow_says_so(self):
        clause = _format_npv_clause(None, None, discount_rate=0.11)
        self.assertIn('unavailable', clause)

    def test_every_branch_is_non_empty(self):
        for before, after, rate in (
            (2_328_400.0, 2_310_000.0, 0.11),
            (2_310_000.0, 2_310_000.0, 0.11),
            (None, 2_310_000.0, 0.11),
            (2_310_000.0, None, 0.11),
            (2_328_400.0, 2_310_000.0, None),
            (None, None, None),
        ):
            self.assertTrue(
                _format_npv_clause(before, after, discount_rate=rate).strip(),
                (before, after, rate),
            )


class ImpactLineIsNeverEmpty(SimpleTestCase):
    """Condition 1 of the UB3 answers, and the regression test for the finding.

    `npv_relevant=False` throughout so no database read is attempted — the NPV
    half is exercised directly in NpvClause above.
    """

    def test_a_sub_dollar_duration_edit_names_the_schedule_and_says_it_moved(self):
        """SUCCESS CRITERION 11, end to end.

        The schedule moved and the money moved by less than the dollar we
        print. The line must carry the new start, the trigger-derived end
        period, AND the statement that NPV moved by under $1 — and must never
        say "unchanged".
        """
        line = _build_impact_line(
            project_id=9,
            npv_before=2_310_000.0,
            npv_after=2_310_000.4,
            timing_before={257: {'start_period': 4, 'periods_to_complete': 3,
                                 'end_period': 6, 'label': 'Mass grading',
                                 'amount': 197000.0}},
            timing_after={257: {'start_period': 7, 'periods_to_complete': 6,
                                'end_period': 12, 'label': 'Mass grading',
                                'amount': 197000.0}},
            note_labels=[],
            npv_relevant=True,
            horizon=60,
            discount_rate=0.11,
        )
        self.assertTrue(line.strip())
        self.assertIn('starts period 7 (was 4)', line)
        self.assertIn('ends 12', line)
        self.assertIn('less than $1', line)
        self.assertNotIn('unchanged', line.lower())

    def test_an_unexplained_zero_reaches_the_user_as_a_defect(self):
        """SUCCESS CRITERION 15, end to end.

        Simulates the propagation break: the write landed and the schedule
        moved, but the engine returned the same NPV and no known cause
        explains it. That must surface, not pass as success.
        """
        line = _build_impact_line(
            project_id=9,
            npv_before=2_310_000.0,
            npv_after=2_310_000.0,
            timing_before={257: {'start_period': 4, 'periods_to_complete': 3,
                                 'end_period': 6, 'label': 'Mass grading',
                                 'amount': 197000.0}},
            timing_after={257: {'start_period': 7, 'periods_to_complete': 3,
                                'end_period': 9, 'label': 'Mass grading',
                                'amount': 197000.0}},
            note_labels=[],
            npv_relevant=True,
            horizon=60,
            discount_rate=0.11,
        )
        self.assertIn('starts period 7 (was 4)', line)
        self.assertIn('defect', line)

    def test_an_explained_zero_names_its_cause(self):
        """SUCCESS CRITERION 14. A zero-rate project is a real answer, not a
        defect — and not a bare "no change" either."""
        line = _build_impact_line(
            project_id=9,
            npv_before=2_310_000.0,
            npv_after=2_310_000.0,
            timing_before={257: {'start_period': 4, 'periods_to_complete': 3,
                                 'end_period': 6, 'label': 'Mass grading',
                                 'amount': 197000.0}},
            timing_after={257: {'start_period': 7, 'periods_to_complete': 3,
                                'end_period': 9, 'label': 'Mass grading',
                                'amount': 197000.0}},
            note_labels=[],
            npv_relevant=True,
            horizon=60,
            discount_rate=0.0,
        )
        self.assertIn("discount rate is zero", line)
        self.assertNotIn('defect', line)

    def test_a_non_timing_edit_is_not_diagnosed_as_a_schedule_non_change(self):
        """A rate or UOM edit never touched the schedule, so explaining its
        zero delta as 'the schedule did not actually change' would be an answer
        about something the user did not do."""
        line = _build_impact_line(
            project_id=9,
            npv_before=2_310_000.0,
            npv_after=2_310_000.0,
            timing_before={},
            timing_after={},
            note_labels=[],
            npv_relevant=True,
            horizon=60,
            discount_rate=0.11,
        )
        self.assertNotIn('schedule did not actually change', line)
        self.assertNotIn('defect', line)
        self.assertIn('no change from this edit', line)

    def test_a_negative_npv_is_parenthesised_not_dollar_minus(self):
        """A land-dev NPV is routinely negative early on; naive interpolation
        renders that as '$-412,002', with the sign inside the amount."""
        line = _build_impact_line(
            project_id=9,
            npv_before=-390_502.0,
            npv_after=-412_002.0,
            timing_before={},
            timing_after={},
            note_labels=[],
            npv_relevant=True,
            horizon=60,
            discount_rate=0.11,
        )
        self.assertIn('($412,002)', line)
        self.assertNotIn('$-412,002', line)

    def test_absent_discount_rate_shows_no_number(self):
        """SUCCESS CRITERION 13."""
        line = _build_impact_line(
            project_id=9,
            npv_before=2_310_000.0,
            npv_after=2_290_000.0,
            timing_before={},
            timing_after={},
            note_labels=[],
            npv_relevant=True,
            horizon=60,
            discount_rate=None,
        )
        self.assertIn('no discount rate', line)
        self.assertNotIn('$2,290,000', line)

    def test_a_timing_edit_with_no_npv_context_still_reports_the_schedule(self):
        line = _build_impact_line(
            project_id=9,
            npv_before=None,
            npv_after=None,
            timing_before={257: {'start_period': 4, 'periods_to_complete': 3,
                                 'end_period': 6, 'label': 'Mass grading',
                                 'amount': 197000.0}},
            timing_after={257: {'start_period': 4, 'periods_to_complete': 6,
                                'end_period': 9, 'label': 'Mass grading',
                                'amount': 197000.0}},
            note_labels=[],
            npv_relevant=False,
        )
        self.assertIn('runs 6 periods (was 3)', line)
        self.assertIn('ends 9', line)

    def test_a_notes_edit_confirms_what_was_saved(self):
        """Condition 7: a note moves no money and shifts no schedule, so the
        NPV clause alone would leave it looking like nothing happened."""
        line = _build_impact_line(
            project_id=9,
            npv_before=None,
            npv_after=None,
            timing_before={},
            timing_after={},
            note_labels=['Mass grading'],
            npv_relevant=False,
        )
        self.assertEqual(line, 'Note saved on Mass grading')

    def test_a_batch_of_both_kinds_produces_both_clauses(self):
        """Condition 6: the timing clause is scoped to start/duration, and a
        mixed batch reports each kind."""
        line = _build_impact_line(
            project_id=9,
            npv_before=None,
            npv_after=None,
            timing_before={257: {'start_period': 4, 'periods_to_complete': 3,
                                 'end_period': 6, 'label': 'Mass grading'}},
            timing_after={257: {'start_period': 7, 'periods_to_complete': 3,
                                'end_period': 9, 'label': 'Mass grading'}},
            note_labels=['Legal'],
            npv_relevant=False,
        )
        self.assertIn('Mass grading starts period 7 (was 4)', line)
        self.assertIn('Note saved on Legal', line)

    def test_a_write_with_nothing_to_say_still_says_something(self):
        """The floor. Reached only by a landed write with no schedule, no note
        and no cash-flow relevance — but it must never be ''."""
        line = _build_impact_line(
            project_id=9,
            npv_before=None,
            npv_after=None,
            timing_before={},
            timing_after={},
            note_labels=[],
            npv_relevant=False,
        )
        self.assertTrue(line.strip())

    def test_a_row_with_no_before_snapshot_is_skipped_not_crashed(self):
        line = _build_impact_line(
            project_id=9,
            npv_before=None,
            npv_after=None,
            timing_before={},
            timing_after={257: {'start_period': 7, 'periods_to_complete': 3,
                                'end_period': 9, 'label': 'Mass grading'}},
            note_labels=['Legal'],
            npv_relevant=False,
        )
        self.assertEqual(line, 'Note saved on Legal')
