"""
Tests for the dedup-hit params_json merge (LSCMD-BA-DEDUPPARAMS-0814-BA1).

LAYER: pure logic. SimpleTestCase forbids database queries, so this module runs
in every environment — including CI, where the DB-backed layer does not (see
below). It covers _merge_dedup_params directly.

The WIRING layer — that create_artifact_record's dedup branch actually calls the
helper with the stored row's params and persists the result — lives in
apps/landscaper/tests/test_artifact_integration.py::ArtifactDedupParamsMergeTests.
Testing only this module would repeat the mistake of 02a10d2f, whose merge logic
was fine and whose wiring was the bug.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from apps.artifacts.services import _merge_dedup_params


def _clarification(steps):
    return {'server_rendered': True, 'clarification_config': {'steps': steps}}


class DedupParamsMergeLogic(SimpleTestCase):
    """params_json is not purely tool-authored: tool-owned keys must refresh,
    user-owned keys must survive."""

    # ── user-owned state survives ────────────────────────────────────────

    def test_report_modification_spec_survives_a_params_free_refresh(self):
        """The report toolbar PATCHes the user's view state into params_json.
        A plain re-ask of the report carries no modification_spec, so a
        wholesale replace silently discarded the saved view."""
        spec = {'visible_columns': ['unit', 'rent'], 'sort': {'column': 'unit'}}
        merged = _merge_dedup_params(
            stored={
                'report_code': 'RPT_XX',
                'report_name': 'Old Name',
                'modification_spec': spec,
            },
            fresh={'report_code': 'RPT_XX', 'report_name': 'New Name'},
        )
        self.assertEqual(merged['modification_spec'], spec)
        self.assertEqual(merged['report_name'], 'New Name')

    def test_unknown_stored_keys_are_not_dropped(self):
        """The helper must not enumerate a whitelist — any key the tool didn't
        send is state it doesn't own and can't be assumed disposable."""
        merged = _merge_dedup_params(
            stored={'some_future_user_key': 7, 'shared': 'old'},
            fresh={'shared': 'new'},
        )
        self.assertEqual(merged['some_future_user_key'], 7)
        self.assertEqual(merged['shared'], 'new')

    # ── tool-owned state still refreshes (02a10d2f intact) ───────────────

    def test_budget_view_config_is_replaced_by_the_fresh_fetch(self):
        """A stale view spec is the exact failure 02a10d2f closed. The merge
        must not weaken it."""
        merged = _merge_dedup_params(
            stored={'server_rendered': True, 'budget_view_config': {'version': 1}},
            fresh={'server_rendered': True, 'budget_view_config': {'version': 2}},
        )
        self.assertEqual(merged['budget_view_config'], {'version': 2})

    def test_map_and_location_brief_configs_are_replaced(self):
        """Same latent bug as budget: re-running a map never updated map_config,
        so a click-through re-hydrated the OLD map."""
        merged = _merge_dedup_params(
            stored={'map_config': {'pins': 1}, 'location_brief_config': {'depth': 'condensed'}},
            fresh={'map_config': {'pins': 9}, 'location_brief_config': {'depth': 'comprehensive'}},
        )
        self.assertEqual(merged['map_config'], {'pins': 9})
        self.assertEqual(merged['location_brief_config'], {'depth': 'comprehensive'})

    # ── clarification evidence carry-forward ─────────────────────────────

    def test_answered_step_evidence_carries_forward_by_id(self):
        """The apply service flips an answered step to 'entered'. The builder
        rebuilds evidence from the model's tool args (default 'assumed') and
        never reads the DB, so a re-fire on the same thread would re-ask for a
        figure the user already supplied."""
        merged = _merge_dedup_params(
            stored=_clarification([
                {'id': 'step1', 'question': 'Cap rate?', 'evidence': 'entered'},
                {'id': 'step2', 'question': 'Vacancy?', 'evidence': 'assumed'},
            ]),
            fresh=_clarification([
                {'id': 'step1', 'question': 'Cap rate (%)?', 'evidence': 'assumed'},
                {'id': 'step2', 'question': 'Vacancy?', 'evidence': 'assumed'},
                {'id': 'step3', 'question': 'Exit year?', 'evidence': 'assumed'},
            ]),
        )
        by_id = {s['id']: s for s in merged['clarification_config']['steps']}
        self.assertEqual(by_id['step1']['evidence'], 'entered')
        self.assertEqual(by_id['step2']['evidence'], 'assumed')
        self.assertEqual(by_id['step3']['evidence'], 'assumed')

    def test_fresh_config_still_wins_on_question_text_options_and_targets(self):
        """Only the evidence badge is carried. Everything else about the step
        is the tool's to restate."""
        merged = _merge_dedup_params(
            stored=_clarification([{
                'id': 'step1', 'question': 'Old?', 'evidence': 'benchmark',
                'options': [{'value': 'a'}], 'target': {'table': 'old_tbl'},
            }]),
            fresh=_clarification([{
                'id': 'step1', 'question': 'New?', 'evidence': 'assumed',
                'options': [{'value': 'b'}], 'target': {'table': 'new_tbl'},
            }]),
        )
        step = merged['clarification_config']['steps'][0]
        self.assertEqual(step['evidence'], 'benchmark')  # carried
        self.assertEqual(step['question'], 'New?')
        self.assertEqual(step['options'], [{'value': 'b'}])
        self.assertEqual(step['target'], {'table': 'new_tbl'})

    def test_only_entered_and_benchmark_carry_not_assumed_or_calculated(self):
        """'assumed' is the builder's default — carrying it would pin a step
        the user has since answered. 'calculated' belongs to the preliminary
        strip, which is never an input."""
        merged = _merge_dedup_params(
            stored=_clarification([
                {'id': 's1', 'evidence': 'assumed'},
                {'id': 's2', 'evidence': 'calculated'},
            ]),
            fresh=_clarification([
                {'id': 's1', 'evidence': 'entered'},
                {'id': 's2', 'evidence': 'entered'},
            ]),
        )
        by_id = {s['id']: s for s in merged['clarification_config']['steps']}
        self.assertEqual(by_id['s1']['evidence'], 'entered')
        self.assertEqual(by_id['s2']['evidence'], 'entered')

    def test_caller_params_json_is_never_mutated_in_place(self):
        """The tools pass the same dict they built; writing the carry-forward
        into it would corrupt the caller's view of its own arguments."""
        fresh = _clarification([{'id': 'step1', 'evidence': 'assumed'}])
        fresh_step = fresh['clarification_config']['steps'][0]

        merged = _merge_dedup_params(
            stored=_clarification([{'id': 'step1', 'evidence': 'entered'}]),
            fresh=fresh,
        )
        self.assertEqual(merged['clarification_config']['steps'][0]['evidence'], 'entered')
        self.assertEqual(fresh_step['evidence'], 'assumed')
        self.assertIsNot(merged['clarification_config']['steps'][0], fresh_step)
        self.assertIsNot(merged['clarification_config'], fresh['clarification_config'])

    def test_no_prior_flips_leaves_the_fresh_config_untouched(self):
        """The carry-forward is a no-op when nothing was answered — the common
        case on a first re-fire."""
        fresh = _clarification([{'id': 'step1', 'evidence': 'assumed'}])
        merged = _merge_dedup_params(
            stored=_clarification([{'id': 'step1', 'evidence': 'assumed'}]),
            fresh=fresh,
        )
        self.assertIs(merged['clarification_config'], fresh['clarification_config'])

    # ── degenerate inputs ────────────────────────────────────────────────

    def test_none_non_dict_and_empty_params_are_safe(self):
        """Legacy or hand-edited rows must not blow up the dedup path."""
        self.assertEqual(_merge_dedup_params(stored=None, fresh={'a': 1}), {'a': 1})
        self.assertEqual(_merge_dedup_params(stored=['x'], fresh={'a': 1}), {'a': 1})
        self.assertEqual(_merge_dedup_params(stored='oops', fresh={'a': 1}), {'a': 1})
        self.assertEqual(_merge_dedup_params(stored={'a': 1}, fresh=None), {'a': 1})
        self.assertEqual(_merge_dedup_params(stored={}, fresh={'a': 1}), {'a': 1})
        self.assertEqual(_merge_dedup_params(stored={'a': 1}, fresh={}), {'a': 1})
        self.assertEqual(_merge_dedup_params(stored=None, fresh=None), {})

    def test_malformed_clarification_config_does_not_raise(self):
        """steps missing, not a list, or holding non-dicts — all reachable from
        a hand-edited row, none of them worth a 500."""
        self.assertEqual(
            _merge_dedup_params(
                stored={'clarification_config': {'steps': [{'id': 's1', 'evidence': 'entered'}]}},
                fresh={'clarification_config': {}},
            )['clarification_config'],
            {},
        )
        merged = _merge_dedup_params(
            stored={'clarification_config': {'steps': None}},
            fresh=_clarification([{'id': 's1', 'evidence': 'assumed'}]),
        )
        self.assertEqual(merged['clarification_config']['steps'][0]['evidence'], 'assumed')

        merged = _merge_dedup_params(
            stored=_clarification([{'id': 's1', 'evidence': 'entered'}]),
            fresh={'clarification_config': {'steps': ['not-a-dict', {'id': 's1'}]}},
        )
        steps = merged['clarification_config']['steps']
        self.assertEqual(steps[0], 'not-a-dict')
        self.assertEqual(steps[1]['evidence'], 'entered')

    def test_clarification_config_that_is_not_a_dict_is_passed_through(self):
        merged = _merge_dedup_params(
            stored=_clarification([{'id': 's1', 'evidence': 'entered'}]),
            fresh={'clarification_config': 'garbage'},
        )
        self.assertEqual(merged['clarification_config'], 'garbage')
