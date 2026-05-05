"""
Scenario S16 — Operating Statement Workflow with Discriminator Honesty

Exercises the discriminator-honesty + vocabulary-learning behavior that
shipped May 1, 2026 (chat DA, commit 13346bf):

  - get_operating_statement v2 returns code='ambiguous_scenario' when the
    user's phrasing is unresolvable against the project's data tags
  - save_user_vocab persists per-user phrasing → discriminator mappings
  - Subsequent get_operating_statement calls consult the vocab table and
    resolve directly without going through the ambiguous-response loop
  - The OS guard rejects artifacts whose title contradicts the declared
    artifact_subtype (catches the canonical Chadron failure)
  - Untagged ("default") data composes with honest "Default (untagged)"
    framing rather than being dressed up as T-12 or Pro Forma

Phases (per S16-Scenario-Design-PU32.html):
  1. Setup — seed synthetic fixture project tagged CURRENT_PRO_FORMA + verify
     Chadron Terrace is reachable as the default-tagged candidate for Phase 6
  2. Ambiguous-scenario response (T-12 ask against current-pro-forma data)
  3. User picks → vocab learns → artifact composes with honest title
  4. Vocab hit on a fresh thread (cross-thread persistence)
  5. Label-mismatch rejection — TWO assertions:
     (a) Direct guard call with a known-bad payload → error code check
     (b) Model-coaxing prompt → full retry loop (observe-only)
  6. Untagged-data honesty (Chadron Terrace, default discriminator)
  7. Cleanup — synthetic project (auto via _created_project_ids), test
     artifacts created on Chadron, vocab records for the test user

Out of scope (separate scenarios / specs):
  - Real F-12 forward projection (the "T-12 trended forward via project
    growth assumptions" scenario — queued as separate work)
  - Link-to-existing-artifact-instead-of-recomposing (Gregg's PU22 design
    point — separate spec; S16 still expects fresh composition in Phase 4)
"""

import json
import logging
import os
import subprocess
from typing import Optional

import requests

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s16')


# ─────────────────────────────────────────────────────────────────────────────
# Fixture data — the Phase 1 seeder writes these into tbl_multifamily_unit
# and tbl_operating_expenses with statement_discriminator=CURRENT_PRO_FORMA.
# Numbers are approximate but realistic for a 60-unit garden-style MF.
# ─────────────────────────────────────────────────────────────────────────────
FIXTURE_UNITS = {
    'count': 60,
    'bedrooms': 1,
    'bathrooms': 1.0,
    'square_feet': 700,
    'market_rent': 1500,
    'current_rent': 1450,
    'unit_type': '1BR/1BA',
}

FIXTURE_OPEX_ROWS = [
    {'category': 'Real Estate Taxes', 'annual_amount': 80000},
    {'category': 'Insurance', 'annual_amount': 25000},
    {'category': 'Utilities — Water/Sewer', 'annual_amount': 18000},
    {'category': 'Utilities — Electric', 'annual_amount': 12000},
    {'category': 'Repairs & Maintenance', 'annual_amount': 35000},
    {'category': 'Landscaping', 'annual_amount': 9000},
    {'category': 'Trash Removal', 'annual_amount': 7000},
    {'category': 'Pest Control', 'annual_amount': 3500},
    {'category': 'Marketing', 'annual_amount': 6000},
    {'category': 'Office Supplies', 'annual_amount': 2500},
]

CHADRON_NAME_PATTERN = 'chadron'  # ILIKE %chadron% to find the canonical default-tagged project


# ─────────────────────────────────────────────────────────────────────────────
# Phase 5a — direct guard call. Snippet runs inside `manage.py shell -c` so
# we exercise the same Python that production uses. Builds a known-bad
# operating-statement schema (subtype=t12, title contains "Current Pro
# Forma") and asserts the guard rejects with code='label_data_mismatch_*'.
# ─────────────────────────────────────────────────────────────────────────────
PHASE_5A_GUARD_SNIPPET = r"""
import json
from apps.artifacts.operating_statement_guard import (
    validate_operating_statement_artifact,
    OperatingStatementGuardError,
)

bad_schema = {
    'blocks': [
        {
            'type': 'table',
            'id': 'os_table',
            'columns': [
                {'key': 'line', 'label': 'Line Item'},
                {'key': 'annual', 'label': 'Annual'},
                {'key': 'per_unit', 'label': '$/Unit'},
            ],
            'rows': [
                {'id': 'gpr', 'cells': {'line': 'Gross Potential Rent', 'annual': 1080000, 'per_unit': 18000}},
                {'id': 'noi', 'cells': {'line': 'Net Operating Income', 'annual': 690000, 'per_unit': 11500}},
            ],
        }
    ]
}

result = {'raised': False, 'code': None, 'subtype_seen': None}
try:
    validate_operating_statement_artifact(
        subtype='t12',
        title='Current Pro Forma Operating Statement',
        schema=bad_schema,
        project_id=None,  # skip source-presence check; we only care about label-data check here
    )
except OperatingStatementGuardError as e:
    result['raised'] = True
    result['code'] = e.code
    result['subtype_seen'] = e.subtype

print(json.dumps(result))
"""


class ScenarioS16(BaseAgent):
    """Operating-statement workflow exercising discriminator honesty + vocab learning."""

    def __init__(self):
        super().__init__('s16_operating_statement')
        self.validator = Validator('s16_operating_statement')

        # Tracked across phases
        self.synthetic_project_id: Optional[int] = None
        self.synthetic_project_name: Optional[str] = None
        self.chadron_project_id: Optional[int] = None
        self.test_user_id: Optional[int] = None
        self.fresh_thread_id: Optional[str] = None

        # PU60 — second synthetic project for Phase 9 (MARKET_PRO_FORMA test).
        # Created in Phase 9, tagged MARKET_PRO_FORMA so the new discriminator
        # gets exercised end-to-end through the synonym dict + tool composition.
        # Cleanup is automatic via _created_project_ids (set by the API helper).
        self.market_synthetic_project_id: Optional[int] = None
        self.market_synthetic_project_name: Optional[str] = None

        # Pollution to clean up at end
        self._artifact_ids_created: list[int] = []

    # ──────────────────────────────────────────────────────────────────
    # Top-level scenario flow
    # ──────────────────────────────────────────────────────────────────
    def run_scenario(self):
        # Step 1 — Setup: synthetic fixture + Chadron lookup ──────────
        logger.info('--- Phase 1: Synthetic fixture seed + Chadron lookup ---')
        self._phase1_setup()

        # Step 2 — Ambiguous-scenario response ───────────────────────
        logger.info('--- Phase 2: Ambiguous-scenario response ---')
        self._phase2_ambiguous_scenario()

        # Step 3 — User picks → vocab learns ─────────────────────────
        logger.info('--- Phase 3: Vocab learning ---')
        self._phase3_vocab_learns()

        # Step 4 — Vocab hit on a fresh thread ───────────────────────
        logger.info('--- Phase 4: Vocab hit, fresh thread ---')
        self._phase4_fresh_thread_vocab_hit()

        # Step 5 — Label-mismatch rejection ──────────────────────────
        logger.info('--- Phase 5a: Direct guard call ---')
        self._phase5a_direct_guard()
        logger.info('--- Phase 5b: Model-coaxing observe-only ---')
        self._phase5b_model_coaxing()

        # Step 8 — Synonym-dict hit (added PU58) ────────────────────
        # Tests the new synonym layer in lookup_user_vocab. A phrasing not
        # previously in this user's vocab but present in the static synonym
        # dictionary should resolve directly to the canonical scenario,
        # source='synonym_dict', no save_user_vocab call needed.
        # Slotted between 5b and 6 because both 8 and 6 are post-Chadron-
        # transition phases against the synthetic project + Chadron, and
        # keeping them together makes the transition cleaner.
        logger.info('--- Phase 8: Synonym-dict hit ---')
        self._phase8_synonym_dict_hit()

        # Step 9 — MARKET_PRO_FORMA discriminator end-to-end (added PU60) ──
        # Seeds a SECOND synthetic project with opex tagged MARKET_PRO_FORMA,
        # then asks "show me the market pro forma." Synonym dict resolves
        # the phrase to the new MARKET_PRO_FORMA canonical, and the artifact
        # composes against the seeded data. Verifies the new discriminator
        # is wired through the validator allow-list, the priority map, the
        # epistemic-status map, the label map, and the synonym dict.
        logger.info('--- Phase 9: MARKET_PRO_FORMA end-to-end ---')
        self._phase9_market_pro_forma()

        # Step 6 — Untagged-data honesty (Chadron) ───────────────────
        logger.info('--- Phase 6: Untagged-data honesty (Chadron) ---')
        self._phase6_untagged_honesty()

        # Final pass message
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S16 complete: {self.validator.pass_count}/'
            f'{len(self.validator.results)} checks passed'
        )

    # ──────────────────────────────────────────────────────────────────
    # Phase 1
    # ──────────────────────────────────────────────────────────────────
    def _phase1_setup(self):
        # 1a. Create the synthetic test project
        project_name = f'{config.TEST_PROJECT_PREFIX}S16_CPF_Source'
        self.create_project_via_api(
            project_name=project_name,
            project_type_code='MF',
        )
        self.synthetic_project_id = self.project_id
        self.synthetic_project_name = project_name

        self.validator.assert_field_equals(
            'p1_synthetic_created', self.synthetic_project_id is not None, True
        )
        self.validator.observe('p1_synthetic_project_id', self.synthetic_project_id)

        # 1b. Seed the fixture (units + opex tagged CURRENT_PRO_FORMA + active discriminator pinned)
        seed_result = self._run_seeder(
            project_id=self.synthetic_project_id,
            discriminator='CURRENT_PRO_FORMA',
            units_payload=FIXTURE_UNITS,
            opex_payload=FIXTURE_OPEX_ROWS,
            set_active=True,
        )

        self.validator.assert_field_equals(
            'p1_seed_succeeded', seed_result.get('success', False), True
        )
        self.validator.assert_field_equals(
            'p1_units_seeded', seed_result.get('units_inserted', 0), FIXTURE_UNITS['count']
        )
        self.validator.assert_field_equals(
            'p1_opex_seeded', seed_result.get('opex_inserted', 0), len(FIXTURE_OPEX_ROWS)
        )
        self.validator.assert_field_equals(
            'p1_active_discriminator_set',
            seed_result.get('active_discriminator_set', False),
            True,
        )

        # 1c. Look up Chadron Terrace project_id (used in Phase 6)
        self.chadron_project_id = self._find_project_by_name(CHADRON_NAME_PATTERN)
        self.validator.observe('p1_chadron_project_id', self.chadron_project_id)
        self.validator.assert_field_equals(
            'p1_chadron_found', self.chadron_project_id is not None, True
        )

        # 1d. Capture the test user_id (used at cleanup for vocab DELETE).
        # The base agent authenticates as config.AUTH_USERNAME. We grab the id
        # via a /api/me/ style endpoint if available, otherwise fall through
        # — vocab cleanup degrades to a no-op rather than blowing up the test.
        self.test_user_id = self._lookup_test_user_id()
        self.validator.observe('p1_test_user_id', self.test_user_id)

    # ──────────────────────────────────────────────────────────────────
    # Phase 2 — ambiguous-scenario response
    # ──────────────────────────────────────────────────────────────────
    def _phase2_ambiguous_scenario(self):
        self.create_thread(
            project_id=self.synthetic_project_id,
            page_context='operations',
        )
        self.validator.assert_field_equals(
            'p2_thread_created', self.thread_id is not None, True
        )

        chat_resp = self.send_message(
            content='Show me the T-12 operating statement.',
            page_context='operations',
        )
        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p2_tools', tools_used)

        # The operating-statement tool MUST have been called
        os_call = chat_resp.find_tool_call('get_operating_statement')
        self.validator.assert_field_equals(
            'p2_get_operating_statement_called', os_call is not None, True
        )

        # The tool result should include code='ambiguous_scenario' OR a
        # success=true with scenario_resolved=CURRENT_PRO_FORMA via vocab
        # if a prior run polluted vocab. Hard-assert ambiguous; observe the
        # other case so test failure narrates clearly if vocab leaked.
        tool_code = (os_call.result or {}).get('code') if os_call else None
        self.validator.observe('p2_tool_result_code', tool_code)

        self.validator.assert_field_equals(
            'p2_returned_ambiguous', tool_code == 'ambiguous_scenario', True
        )

        # No artifact should have been created on this turn — the model
        # must pause and ask, not compose.
        artifact_call = chat_resp.find_tool_call('create_artifact')
        self.validator.assert_field_equals(
            'p2_no_artifact_created', artifact_call is None, True
        )

        # Chat reply should mention the actual scenario(s) on file. We seeded
        # CURRENT_PRO_FORMA; the response should reference it (or a synonym).
        content_lower = chat_resp.assistant_content.lower()
        scenario_mentions = [
            kw for kw in ('current pro forma', 'pro forma', 'proforma')
            if kw in content_lower
        ]
        self.validator.observe('p2_scenario_mentions', scenario_mentions)
        self.validator.assert_field_equals(
            'p2_at_least_one_scenario_mentioned', len(scenario_mentions) > 0, True
        )

    # ──────────────────────────────────────────────────────────────────
    # Phase 3 — user picks → vocab learns → honest-titled artifact
    # ──────────────────────────────────────────────────────────────────
    def _phase3_vocab_learns(self):
        chat_resp = self.send_message(
            content='Yes, use the current pro forma.',
            page_context='operations',
        )
        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p3_tools', tools_used)

        # save_user_vocab MUST have fired
        vocab_call = chat_resp.find_tool_call('save_user_vocab')
        self.validator.assert_field_equals(
            'p3_save_user_vocab_called', vocab_call is not None, True
        )

        if vocab_call:
            resolved = (vocab_call.tool_input or {}).get('resolved_value')
            self.validator.calibrate('p3_vocab_resolved_value', resolved)
            self.validator.assert_field_equals(
                'p3_vocab_resolved_correctly', resolved, 'CURRENT_PRO_FORMA'
            )

        # An artifact MUST have been created with a current-pro-forma title
        artifact_call = chat_resp.find_tool_call('create_artifact')
        self.validator.assert_field_equals(
            'p3_artifact_created', artifact_call is not None, True
        )

        if artifact_call:
            title = (artifact_call.tool_input or {}).get('title') or ''
            subtype = (artifact_call.tool_input or {}).get('artifact_subtype')
            self.validator.observe('p3_artifact_title', title)
            self.validator.observe('p3_artifact_subtype', subtype)

            # Title must match the data — must contain "current" + "pro forma" (or "proforma")
            title_lower = title.lower()
            title_ok = ('current' in title_lower
                        and ('pro forma' in title_lower or 'proforma' in title_lower))
            self.validator.assert_field_equals('p3_title_honest', title_ok, True)

            # Title MUST NOT contain T-12 / T12 / "trailing"
            title_dirty = any(
                kw in title_lower for kw in ('t-12', 't12', 'trailing')
            )
            self.validator.assert_field_equals('p3_title_no_t12', title_dirty, False)

            # Subtype must be current_proforma
            self.validator.assert_field_equals(
                'p3_subtype_current_proforma', subtype, 'current_proforma'
            )

            # Capture artifact_id so cleanup can delete it (this artifact
            # lives on the synthetic project which gets project-deleted, but
            # we capture for symmetry with Phase 6 / Chadron tracking).
            artifact_id = (artifact_call.result or {}).get('artifact_id')
            if artifact_id:
                self.validator.observe('p3_artifact_id', artifact_id)

    # ──────────────────────────────────────────────────────────────────
    # Phase 4 — vocab hit on a fresh thread (proves cross-thread persistence)
    # ──────────────────────────────────────────────────────────────────
    def _phase4_fresh_thread_vocab_hit(self):
        # Open a brand-new thread on the same project — force_new=True closes
        # any existing active thread for (project_id, page_context) first so
        # there's no in-thread message-history bleed.
        self.create_thread(
            project_id=self.synthetic_project_id,
            page_context='operations',
            force_new=True,
        )
        self.fresh_thread_id = self.thread_id
        self.validator.assert_field_equals(
            'p4_fresh_thread_created', self.fresh_thread_id is not None, True
        )

        # Phrase MUST match Phase 2's prompt verbatim — vocab lookup is
        # exact-match on the normalized phrase, not prefix/fuzzy. Saving
        # against "Show me the T-12 operating statement." in Phase 3 means
        # this phase needs the same string to hit.
        chat_resp = self.send_message(
            content='Show me the T-12 operating statement.',
            page_context='operations',
        )
        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p4_tools', tools_used)

        # Find ALL get_operating_statement calls and pick the most-
        # authoritative result. The model occasionally fires twice in
        # this turn — first with truncated user_phrasing (e.g. just
        # "T-12") that misses user-vocab and synonym-hits to T-12, which
        # isn't in available_scenarios → ambiguous; then retries with
        # the full phrase that DOES hit vocab. Reading the first call
        # would catch the ambiguous-then-recovered path as a false
        # negative. Prefer a non-ambiguous result; fall back to the
        # last call if all were ambiguous.
        os_calls = [
            tc for tc in chat_resp.tool_calls
            if tc.tool_name == 'get_operating_statement'
        ]
        self.validator.observe('p4_os_call_count', len(os_calls))
        self.validator.assert_field_equals(
            'p4_get_operating_statement_called', len(os_calls) > 0, True
        )

        os_call = None
        for tc in reversed(os_calls):
            r = tc.result or {}
            if r.get('code') != 'ambiguous_scenario':
                os_call = tc
                break
        if os_call is None and os_calls:
            os_call = os_calls[-1]

        # On the vocab-hit path, result.code should be absent (success) or
        # explicitly 'success' depending on tool implementation; what matters
        # is scenario_resolution_source signals 'vocab' (or equivalent),
        # NOT 'ambiguous_scenario'.
        tool_result = (os_call.result or {}) if os_call else {}
        tool_code = tool_result.get('code')
        scenario_resolved = tool_result.get('scenario_resolved')
        resolution_source = tool_result.get('scenario_resolution_source')

        self.validator.observe('p4_tool_result_code', tool_code)
        self.validator.observe('p4_scenario_resolved', scenario_resolved)
        self.validator.observe('p4_resolution_source', resolution_source)

        # Hard contract: the tool DID NOT return ambiguous_scenario this time.
        self.validator.assert_field_equals(
            'p4_not_ambiguous_anymore', tool_code != 'ambiguous_scenario', True
        )

        # Hard contract: scenario resolved to CURRENT_PRO_FORMA
        self.validator.assert_field_equals(
            'p4_resolved_current_proforma',
            scenario_resolved, 'CURRENT_PRO_FORMA',
        )

        # Soft contract: resolution_source signals 'vocab' or similar — the
        # exact string varies and may be 'user_vocab', 'vocab_hit', etc.
        self.validator.calibrate('p4_resolution_source_value', resolution_source)

        # Single round-trip: an artifact should be in this same response
        artifact_call = chat_resp.find_tool_call('create_artifact')
        self.validator.assert_field_equals(
            'p4_artifact_in_same_turn', artifact_call is not None, True
        )

    # ──────────────────────────────────────────────────────────────────
    # Phase 5a — direct guard call
    # ──────────────────────────────────────────────────────────────────
    def _phase5a_direct_guard(self):
        proc = subprocess.run(
            ['./venv/bin/python', 'manage.py', 'shell', '-c', PHASE_5A_GUARD_SNIPPET],
            cwd=self._backend_dir(),
            capture_output=True,
            text=True,
            timeout=60,
        )

        self.validator.observe('p5a_returncode', proc.returncode)
        if proc.returncode != 0:
            logger.warning(f'  Phase 5a subprocess stderr: {proc.stderr[-4000:]}')
            self.validator.assert_field_equals(
                'p5a_subprocess_ok', False, True
            )
            return

        # Parse the JSON line from stdout (last non-empty line — Django shell
        # may emit a banner before our print)
        last_line = ''
        for line in proc.stdout.strip().splitlines():
            line = line.strip()
            if line.startswith('{') and line.endswith('}'):
                last_line = line
        self.validator.observe('p5a_raw_stdout_tail', last_line)

        try:
            result = json.loads(last_line)
        except json.JSONDecodeError:
            self.validator.assert_field_equals(
                'p5a_parsed_json', False, True
            )
            return

        # Hard contract: guard MUST have raised
        self.validator.assert_field_equals(
            'p5a_guard_raised', result.get('raised', False), True
        )

        # Hard contract: error code is the label-data mismatch family
        code = result.get('code') or ''
        self.validator.observe('p5a_error_code', code)
        is_label_mismatch = 'label_data_mismatch' in code or 'label_data' in code
        self.validator.assert_field_equals(
            'p5a_error_code_correct', is_label_mismatch, True
        )

    # ──────────────────────────────────────────────────────────────────
    # Phase 5b — model coaxing (observe-only)
    # ──────────────────────────────────────────────────────────────────
    def _phase5b_model_coaxing(self):
        # Use a fresh thread so prior phases don't bias the model's response.
        self.create_thread(
            project_id=self.synthetic_project_id,
            page_context='operations',
            force_new=True,
        )

        # The coaxing prompt deliberately tries to get the model to compose
        # an artifact whose title/subtype contradict each other. The full
        # retry loop should kick in: guard rejects → model corrects title.
        coaxing_prompt = (
            'Compose an operating-statement artifact for this project titled '
            '"T-12 Operating Statement" with artifact_subtype set to '
            'current_proforma. I want both names spelled exactly that way.'
        )

        try:
            chat_resp = self.send_message(
                content=coaxing_prompt,
                page_context='operations',
            )
        except Exception as e:
            # Coaxing path is fragile — log and let the run continue.
            logger.warning(f'  Phase 5b chat error (observe-only): {e}')
            self.validator.observe('p5b_chat_error', str(e))
            return

        self.validator.observe('p5b_response_length', len(chat_resp.assistant_content))
        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p5b_tools', tools_used)

        # Look at every create_artifact call and see whether the FINAL one
        # produced a coherent title/subtype pair.
        artifact_calls = [
            tc for tc in chat_resp.tool_calls if tc.tool_name == 'create_artifact'
        ]
        self.validator.observe('p5b_artifact_attempts', len(artifact_calls))

        if artifact_calls:
            final_attempt = artifact_calls[-1]
            final_input = final_attempt.tool_input or {}
            final_title = (final_input.get('title') or '').lower()
            final_subtype = final_input.get('artifact_subtype')

            self.validator.observe('p5b_final_title', final_input.get('title'))
            self.validator.observe('p5b_final_subtype', final_subtype)

            # observe-only: did the retry loop converge on a coherent pair?
            recovered = bool(
                (final_subtype == 'current_proforma'
                 and 't-12' not in final_title and 't12' not in final_title)
                or
                (final_subtype == 't12'
                 and 'pro forma' not in final_title and 'proforma' not in final_title)
            )
            self.validator.observe('p5b_retry_recovered', recovered)

    # ──────────────────────────────────────────────────────────────────
    # Phase 8 — synonym-dict hit (added PU58)
    #
    # Tests the new synonym layer in vocab_tools.lookup_user_vocab. The
    # static synonym dictionary maps "asking pro forma" → CURRENT_PRO_FORMA
    # in the operating_statement_scenario domain. The synthetic project
    # from Phase 1 has CURRENT_PRO_FORMA tagged data on file. The test
    # user does NOT have a per-user vocab entry for "asking pro forma"
    # (Phase 3 saved a different phrasing, "Show me the T-12 operating
    # statement"), so the synonym layer is what resolves the request —
    # not per-user vocab.
    #
    # Note: an earlier draft used "Show me today's rents." but that phrase
    # is naturally rent-roll/units-leaning — the model interpreted it as
    # a unit-level query and called `get_units` instead of
    # `get_operating_statement`, so the synonym dict never had a chance
    # to fire. "Asking pro forma" is unambiguously operating-statement-y.
    #
    # Hard contracts:
    #   - get_operating_statement returns success (not ambiguous_scenario)
    #   - scenario_resolved = CURRENT_PRO_FORMA
    #   - scenario_resolution_source = 'synonym_dict' (the new field value
    #     introduced when lookup_user_vocab gained the synonym layer)
    #   - save_user_vocab NOT called (synonym hits don't require saves;
    #     the dictionary is platform-shared, not per-user)
    #   - artifact composed in a single round-trip with an honest title
    # ──────────────────────────────────────────────────────────────────
    def _phase8_synonym_dict_hit(self):
        if not self.synthetic_project_id:
            self.validator.assert_field_equals(
                'p8_synthetic_available', False, True
            )
            return

        # Fresh thread on the synthetic project — keeps the test independent
        # of any vocab-hit state from Phase 4 and avoids in-thread message
        # history bleed.
        self.create_thread(
            project_id=self.synthetic_project_id,
            page_context='operations',
            force_new=True,
        )

        chat_resp = self.send_message(
            content='Show me the asking pro forma.',
            page_context='operations',
        )
        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p8_tools', tools_used)

        os_call = chat_resp.find_tool_call('get_operating_statement')
        self.validator.assert_field_equals(
            'p8_get_operating_statement_called', os_call is not None, True
        )

        if os_call:
            tool_result = os_call.result or {}
            tool_code = tool_result.get('code')
            scenario_resolved = tool_result.get('scenario_resolved')
            resolution_source = tool_result.get('scenario_resolution_source')

            self.validator.observe('p8_tool_result_code', tool_code)
            self.validator.observe('p8_scenario_resolved', scenario_resolved)
            self.validator.observe('p8_resolution_source', resolution_source)

            # Hard contract: tool did NOT return ambiguous_scenario — the
            # synonym dict resolved the phrase before the ambiguous flow
            # could fire.
            self.validator.assert_field_equals(
                'p8_not_ambiguous', tool_code != 'ambiguous_scenario', True
            )

            # Hard contract: resolved to CURRENT_PRO_FORMA (what the synthetic
            # project has on file, matching the synonym dict mapping).
            self.validator.assert_field_equals(
                'p8_resolved_current_proforma',
                scenario_resolved, 'CURRENT_PRO_FORMA',
            )

            # Hard contract: resolution_source identifies the synonym dict
            # path. NOT 'user_vocab' (this user has no vocab for "today's
            # rents") and NOT the legacy 'user_phrasing_lookup' label.
            self.validator.assert_field_equals(
                'p8_resolution_source_synonym_dict',
                resolution_source, 'synonym_dict',
            )

        # Hard contract: save_user_vocab NOT called. Synonym dict hits don't
        # require per-user persistence — the mapping is platform-shared.
        vocab_save_call = chat_resp.find_tool_call('save_user_vocab')
        self.validator.assert_field_equals(
            'p8_no_vocab_save', vocab_save_call is None, True
        )

        # Hard contract: artifact composed in a single round-trip with an
        # honest title (mentioning current pro forma, not T-12).
        artifact_call = chat_resp.find_tool_call('create_artifact')
        self.validator.assert_field_equals(
            'p8_artifact_created', artifact_call is not None, True
        )

        if artifact_call:
            title = (artifact_call.tool_input or {}).get('title') or ''
            subtype = (artifact_call.tool_input or {}).get('artifact_subtype')
            self.validator.observe('p8_artifact_title', title)
            self.validator.observe('p8_artifact_subtype', subtype)

            title_lower = title.lower()
            title_ok = ('current' in title_lower
                        and ('pro forma' in title_lower or 'proforma' in title_lower))
            self.validator.assert_field_equals('p8_title_honest', title_ok, True)

            # Title MUST NOT contain T-12 / trailing keywords
            title_dirty = any(
                kw in title_lower for kw in ('t-12', 't12', 'trailing')
            )
            self.validator.assert_field_equals('p8_title_no_t12', title_dirty, False)

            # Subtype must be current_proforma to match the resolved scenario
            self.validator.assert_field_equals(
                'p8_subtype_current_proforma', subtype, 'current_proforma'
            )

            # Capture artifact_id for symmetry with other phases
            artifact_id = (artifact_call.result or {}).get('artifact_id')
            if artifact_id:
                self.validator.observe('p8_artifact_id', artifact_id)

    # ──────────────────────────────────────────────────────────────────
    # Phase 9 — MARKET_PRO_FORMA discriminator end-to-end (added PU60)
    #
    # Validates that the new MARKET_PRO_FORMA canonical scenario is wired
    # through every layer that needs to know about it:
    #   - vocab_tools._OS_SCENARIO_DISCRIMINATORS allow-list
    #   - vocab_tools._DOMAIN_SYNONYMS (new "market pro forma" entry)
    #   - tool_executor._DISCRIMINATOR_LABEL_MAP / _EPISTEMIC_STATUS
    #   - views_operations.SCENARIO_PRIORITY_MAP
    #   - operating_statement_guard (unchanged — uses current_proforma rules)
    #
    # Setup: a SECOND synthetic project seeded with opex tagged
    # MARKET_PRO_FORMA. Then the simulated user asks "show me the market
    # pro forma" — phrase resolves via synonym dict to MARKET_PRO_FORMA,
    # tool composes against the seeded data, artifact lands with the right
    # honest title.
    #
    # Hard contracts:
    #   - get_operating_statement returns success (not ambiguous_scenario)
    #   - scenario_resolved = MARKET_PRO_FORMA
    #   - scenario_resolution_source = 'synonym_dict'
    #   - artifact title contains "Market" (not "Current", not "T-12",
    #     not "Trailing")
    #   - artifact_subtype = current_proforma (MARKET reuses existing
    #     prescriptive subtype rules per the PU60 audit)
    #   - no save_user_vocab call (synonym dict hits don't save)
    # ──────────────────────────────────────────────────────────────────
    def _phase9_market_pro_forma(self):
        # 1a. Create second synthetic test project
        market_project_name = f'{config.TEST_PROJECT_PREFIX}S16_Market_Source'
        # Reset self.project_id from the API helper so create_project_via_api
        # registers the new project as the active one. The helper appends to
        # _created_project_ids automatically, which means cleanup deletes
        # both synthetic projects without extra plumbing.
        self.create_project_via_api(
            project_name=market_project_name,
            project_type_code='MF',
        )
        self.market_synthetic_project_id = self.project_id
        self.market_synthetic_project_name = market_project_name

        self.validator.assert_field_equals(
            'p9_market_project_created',
            self.market_synthetic_project_id is not None, True,
        )
        self.validator.observe('p9_market_project_id', self.market_synthetic_project_id)

        # 1b. Seed fixture with opex tagged MARKET_PRO_FORMA. Reuses the
        # same seeder used in Phase 1 — the seeder accepts arbitrary
        # discriminator strings; the new canonical is in the allow-list
        # via vocab_tools so the validator side accepts it too.
        seed_result = self._run_seeder(
            project_id=self.market_synthetic_project_id,
            discriminator='MARKET_PRO_FORMA',
            units_payload=FIXTURE_UNITS,
            opex_payload=FIXTURE_OPEX_ROWS,
            set_active=True,
        )
        self.validator.assert_field_equals(
            'p9_seed_succeeded', seed_result.get('success', False), True
        )
        self.validator.assert_field_equals(
            'p9_opex_seeded', seed_result.get('opex_inserted', 0), len(FIXTURE_OPEX_ROWS)
        )

        # 2. Open a fresh thread on the new project
        self.create_thread(
            project_id=self.market_synthetic_project_id,
            page_context='operations',
            force_new=True,
        )

        # 3. Send the chat message — synonym dict path
        chat_resp = self.send_message(
            content='Show me the market pro forma.',
            page_context='operations',
        )
        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p9_tools', tools_used)

        os_call = chat_resp.find_tool_call('get_operating_statement')
        self.validator.assert_field_equals(
            'p9_get_operating_statement_called', os_call is not None, True
        )

        if os_call:
            tool_result = os_call.result or {}
            tool_code = tool_result.get('code')
            scenario_resolved = tool_result.get('scenario_resolved')
            resolution_source = tool_result.get('scenario_resolution_source')

            self.validator.observe('p9_tool_result_code', tool_code)
            self.validator.observe('p9_scenario_resolved', scenario_resolved)
            self.validator.observe('p9_resolution_source', resolution_source)

            # Hard contract: tool did NOT return ambiguous_scenario
            self.validator.assert_field_equals(
                'p9_not_ambiguous', tool_code != 'ambiguous_scenario', True
            )

            # Hard contract: resolved to MARKET_PRO_FORMA
            self.validator.assert_field_equals(
                'p9_resolved_market_proforma',
                scenario_resolved, 'MARKET_PRO_FORMA',
            )

            # Hard contract: synonym dict path fired
            self.validator.assert_field_equals(
                'p9_resolution_source_synonym_dict',
                resolution_source, 'synonym_dict',
            )

        # Hard contract: save_user_vocab NOT called
        vocab_save_call = chat_resp.find_tool_call('save_user_vocab')
        self.validator.assert_field_equals(
            'p9_no_vocab_save', vocab_save_call is None, True
        )

        # Hard contract: artifact composed
        artifact_call = chat_resp.find_tool_call('create_artifact')
        self.validator.assert_field_equals(
            'p9_artifact_created', artifact_call is not None, True
        )

        if artifact_call:
            title = (artifact_call.tool_input or {}).get('title') or ''
            subtype = (artifact_call.tool_input or {}).get('artifact_subtype')
            title_lower = title.lower()
            self.validator.observe('p9_artifact_title', title)
            self.validator.observe('p9_artifact_subtype', subtype)

            # Hard contract: title says "Market" (the new label from
            # _DISCRIMINATOR_LABEL_MAP)
            self.validator.assert_field_equals(
                'p9_title_says_market', 'market' in title_lower, True
            )

            # Hard contract: title MUST NOT contain T-12 / trailing
            # (descriptive scenario keywords that don't apply here)
            title_dirty = any(
                kw in title_lower for kw in ('t-12', 't12', 'trailing')
            )
            self.validator.assert_field_equals('p9_title_no_t12', title_dirty, False)

            # Hard contract: artifact_subtype = current_proforma. MARKET
            # reuses the existing prescriptive subtype per the PU60 audit
            # — no new subtype was added. The OS guard's existing rules
            # accept this combination.
            self.validator.assert_field_equals(
                'p9_subtype_current_proforma', subtype, 'current_proforma'
            )

            # Capture artifact_id for symmetry
            artifact_id = (artifact_call.result or {}).get('artifact_id')
            if artifact_id:
                self.validator.observe('p9_artifact_id', artifact_id)

    # ──────────────────────────────────────────────────────────────────
    # Phase 6 — untagged-data honesty against Chadron
    # ──────────────────────────────────────────────────────────────────
    def _phase6_untagged_honesty(self):
        if not self.chadron_project_id:
            self.validator.assert_field_equals(
                'p6_chadron_available', False, True
            )
            return

        # Switch to Chadron — open a fresh thread on it
        self.create_thread(
            project_id=self.chadron_project_id,
            page_context='operations',
            force_new=True,
        )
        self.validator.observe('p6_chadron_thread', self.thread_id)

        # Turn 1 — generic ask. Chadron's data is `default`-tagged, so
        # the model SHOULD respond ambiguously (no fabricated scenario
        # claim, asks the user to confirm). Same pattern as Phase 2.
        first_resp = self.send_message(
            content='Show me the operating statement.',
            page_context='operations',
        )
        self.validator.assert_response_not_error(first_resp)

        first_tools = [tc.tool_name for tc in first_resp.tool_calls]
        self.validator.observe('p6_turn1_tools', first_tools)
        first_os_call = first_resp.find_tool_call('get_operating_statement')
        first_code = (first_os_call.result or {}).get('code') if first_os_call else None
        self.validator.observe('p6_turn1_tool_code', first_code)

        # Turn 2 — confirm "use the default". Triggers honest composition
        # (parallels Phase 3 against the synthetic project's CURRENT_PRO_FORMA).
        chat_resp = self.send_message(
            content='Yes, use the default scenario.',
            page_context='operations',
        )
        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p6_tools', tools_used)

        os_call = chat_resp.find_tool_call('get_operating_statement')
        self.validator.assert_field_equals(
            'p6_get_operating_statement_called', os_call is not None, True
        )

        artifact_call = chat_resp.find_tool_call('create_artifact')
        # Chadron has data and the user just confirmed which scenario to
        # render — an artifact should have been created on this turn.
        self.validator.assert_field_equals(
            'p6_artifact_created', artifact_call is not None, True
        )

        if artifact_call:
            title = (artifact_call.tool_input or {}).get('title') or ''
            subtype = (artifact_call.tool_input or {}).get('artifact_subtype')
            title_lower = title.lower()
            self.validator.observe('p6_artifact_title', title)
            self.validator.observe('p6_artifact_subtype', subtype)

            # Hard contract: title is honest about untagged-ness — must
            # contain "default" or "untagged" (or some honest framing).
            # Allow either keyword family since the labeling map could
            # evolve. Reject any title that fabricates a specific scenario
            # claim ("T-12", "Pro Forma", "Trailing", etc.) on default data.
            honest_keywords = ('default', 'untagged', 'unspecified')
            fabricated_keywords = (
                't-12', 't12', 'trailing', 'pro forma', 'proforma',
                'broker', 'current pro',
            )
            has_honest = any(kw in title_lower for kw in honest_keywords)
            has_fabricated = any(kw in title_lower for kw in fabricated_keywords)

            self.validator.observe('p6_has_honest_keyword', has_honest)
            self.validator.observe('p6_has_fabricated_keyword', has_fabricated)

            # Hard contract: NOT fabricated (most important — this is the
            # discriminator-honesty rule)
            self.validator.assert_field_equals(
                'p6_no_fabricated_scenario_claim', has_fabricated, False
            )

            # Soft contract: has an honest framing (calibrate so the
            # specific wording can drift without flaking the suite)
            self.validator.calibrate('p6_has_honest_framing', has_honest)

            # Capture artifact_id so we can DELETE it from Chadron at cleanup
            artifact_id = (artifact_call.result or {}).get('artifact_id')
            if artifact_id is not None:
                self._artifact_ids_created.append(int(artifact_id))
                self.validator.observe('p6_artifact_id', artifact_id)

    # ──────────────────────────────────────────────────────────────────
    # Helpers — fixture seeding, project lookup, user id, cleanup
    # ──────────────────────────────────────────────────────────────────
    @staticmethod
    def _backend_dir() -> str:
        """Resolve the backend directory absolute path."""
        # The framework runs from repo root (cwd is .../landscape). The
        # backend dir is one level down. Use abspath to be defensive about
        # cwd shifts inside subprocess.
        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        return os.path.join(repo_root, 'backend')

    def _run_seeder(
        self,
        *,
        project_id: int,
        discriminator: str,
        units_payload: dict,
        opex_payload: list,
        set_active: bool,
    ) -> dict:
        """Invoke the seed_test_opex_fixture management command via subprocess."""
        cmd = [
            './venv/bin/python', 'manage.py', 'seed_test_opex_fixture',
            '--project-id', str(project_id),
            '--discriminator', discriminator,
            '--units-json', json.dumps(units_payload),
            '--opex-json', json.dumps(opex_payload),
        ]
        if set_active:
            cmd.append('--set-active-discriminator')

        self._log_step('seed_fixture', f'Seeding fixture on project {project_id}', {
            'discriminator': discriminator,
            'units_count': units_payload.get('count'),
            'opex_count': len(opex_payload),
        })

        proc = subprocess.run(
            cmd,
            cwd=self._backend_dir(),
            capture_output=True,
            text=True,
            timeout=60,
        )

        if proc.returncode != 0:
            # Capture the tail of stderr — Python tracebacks put the
            # actual exception class + message at the end, after the
            # banner/warnings noise. 4KB is enough for any traceback
            # we'd care to read; bigger than that and we want to look
            # at the file directly.
            stderr_tail = proc.stderr[-4000:]
            logger.warning(f'  Seeder stderr: {stderr_tail}')
            self._fail_step(
                f'Fixture seeder failed (returncode={proc.returncode})',
                {'stderr': stderr_tail},
            )
            return {'success': False, 'error': stderr_tail}

        # Last JSON line in stdout is the result envelope
        for line in reversed(proc.stdout.strip().splitlines()):
            line = line.strip()
            if line.startswith('{') and line.endswith('}'):
                try:
                    parsed = json.loads(line)
                    self._pass_step(
                        f'Fixture seeded: {parsed.get("units_inserted")} units, '
                        f'{parsed.get("opex_inserted")} opex rows',
                        parsed,
                    )
                    return parsed
                except json.JSONDecodeError:
                    continue

        self._fail_step('Seeder ran but no parseable JSON in stdout', {'stdout_tail': proc.stdout[-500:]})
        return {'success': False, 'error': 'unparseable seeder output'}

    def _find_project_by_name(self, name_pattern: str) -> Optional[int]:
        """Look up a project_id by ILIKE match. Returns None if not found."""
        self._ensure_auth()
        try:
            resp = self.session.get(
                f'{config.DJANGO_BASE_URL}/api/projects/',
                params={'search': name_pattern, 'project_type_code': 'MF'},
                timeout=config.API_TIMEOUT,
            )
        except requests.RequestException as e:
            logger.warning(f'  Project lookup ({name_pattern!r}) failed: {e}')
            return None

        if resp.status_code != 200:
            logger.warning(f'  Project lookup returned {resp.status_code}')
            return None

        data = resp.json()
        results = data if isinstance(data, list) else data.get('results') or data.get('projects') or []

        for proj in results:
            name = (proj.get('project_name') or '').lower()
            if name_pattern.lower() in name:
                return proj.get('project_id') or proj.get('id')
        return None

    def _lookup_test_user_id(self) -> Optional[int]:
        """Look up the user_id for the username we authenticated as.

        This Django doesn't expose a /me/ style endpoint, so we resolve via
        a tiny subprocess SQL lookup on auth_user (same pattern the cleanup
        path uses). Returns None on failure; vocab cleanup will then
        degrade to a no-op.
        """
        snippet = (
            "from django.db import connection\n"
            "with connection.cursor() as c:\n"
            "    c.execute(\"SELECT id FROM landscape.auth_user WHERE username = %s\","
            f"              ['{config.AUTH_USERNAME}'])\n"
            "    row = c.fetchone()\n"
            "    print('USER_ID', row[0] if row else 'NONE')\n"
        )
        try:
            proc = subprocess.run(
                ['./venv/bin/python', 'manage.py', 'shell', '-c', snippet],
                cwd=self._backend_dir(),
                capture_output=True,
                text=True,
                timeout=30,
            )
        except Exception as e:
            logger.warning(f'  user_id lookup subprocess failed: {e}')
            return None
        if proc.returncode != 0:
            logger.warning(f'  user_id lookup stderr: {proc.stderr[-4000:]}')
            return None
        for line in proc.stdout.splitlines():
            line = line.strip()
            if line.startswith('USER_ID '):
                val = line.split(' ', 1)[1].strip()
                if val == 'NONE':
                    return None
                try:
                    return int(val)
                except ValueError:
                    return None
        return None

    # ──────────────────────────────────────────────────────────────────
    # Cleanup override — runs AFTER BaseAgent.cleanup() deletes projects
    # ──────────────────────────────────────────────────────────────────
    def cleanup(self):
        # Delete artifacts created on Chadron BEFORE the project-cleanup
        # call (which only deletes the synthetic project). Chadron persists.
        self._cleanup_chadron_artifacts()

        # Delete vocab records for the test user in our domain. Subprocess
        # SQL is the simplest path — no dedicated REST endpoint exists yet.
        self._cleanup_test_user_vocab()

        # Then run the standard project-deletion cleanup (synthetic project)
        super().cleanup()

    def _cleanup_chadron_artifacts(self):
        if not self._artifact_ids_created:
            return
        for aid in self._artifact_ids_created:
            try:
                # ?force=true triggers a hard delete; without it the endpoint
                # would soft-archive (set is_archived=True) and orphans would
                # accumulate forever under the archived flag.
                resp = self.session.delete(
                    f'{config.DJANGO_BASE_URL}/api/artifacts/{aid}/?force=true',
                    timeout=config.API_TIMEOUT,
                )
                if resp.status_code in (200, 204):
                    logger.info(f'  Deleted Chadron-side artifact id={aid}')
                else:
                    logger.warning(
                        f'  Chadron artifact {aid} delete returned {resp.status_code}'
                    )
            except requests.RequestException as e:
                logger.warning(f'  Chadron artifact {aid} delete failed: {e}')
        self._artifact_ids_created.clear()

    def _cleanup_test_user_vocab(self):
        if not self.test_user_id:
            logger.info('  Skipping vocab cleanup — test_user_id not resolved')
            return

        snippet = (
            f"from django.db import connection\n"
            f"with connection.cursor() as c:\n"
            f"    c.execute(\"DELETE FROM landscape.tbl_user_scenario_vocab \"\n"
            f"              \"WHERE user_id = %s AND resolution_domain = %s\",\n"
            f"              [{int(self.test_user_id)}, 'operating_statement_scenario'])\n"
            f"    print('vocab_deleted', c.rowcount)\n"
        )

        try:
            proc = subprocess.run(
                ['./venv/bin/python', 'manage.py', 'shell', '-c', snippet],
                cwd=self._backend_dir(),
                capture_output=True,
                text=True,
                timeout=30,
            )
            if proc.returncode == 0:
                logger.info(f'  Vocab cleanup output: {proc.stdout.strip()[-200:]}')
            else:
                logger.warning(f'  Vocab cleanup stderr: {proc.stderr[-4000:]}')
        except Exception as e:
            logger.warning(f'  Vocab cleanup subprocess failed: {e}')

    # ──────────────────────────────────────────────────────────────────
    # Standard report wrapper
    # ──────────────────────────────────────────────────────────────────
    def get_results(self) -> tuple[dict, dict]:
        """Run and return (scenario_result, validation_summary)."""
        result = self.run(cleanup=True)
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s16():
    """Entry point for running S16 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS16()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s16_operating_statement')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
