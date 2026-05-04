"""
Scenario S14 — Project Info Input via Chat Workflow

The first of a workflow-test family covering the chat-driven equivalents of
the legacy alpha18 input screens. Each scenario in the family picks up where
the previous one left off; this one starts at the very beginning — a freshly
created project with only minimal metadata — and drives the project-info
input entirely through Landscaper chat.

Tested behaviors:
1. Bulk conversational entry — user pastes a chunk of project info in one
   message; Landscaper parses it and writes the fields. Verify the writes
   landed by re-reading project state.
2. Landscaper-driven completion — after the bulk write, Landscaper should
   identify remaining unset fields and ask the user. Verify the prompt
   surfaces specific gaps rather than a generic "tell me more."
3. Single-field updates — user provides one field at a time; verify each
   write.
4. Modal handoff — user explicitly asks for the form ("open the project
   details form"). Verify open_input_modal('project_details') fires AND
   that no DB writes happen from the modal call itself (modals don't
   auto-save; the user has to commit from inside the modal — out of scope
   for this scenario).
5. State verification — final summary query. Verify Landscaper's response
   matches the project state we wrote.

Cleanup: deletes the project at end (per BaseAgent _created_project_ids).

Calibration mode: records tool calls and response patterns.
Test mode: compares against calibration manifest.

Out of scope (separate scenarios):
- Property details (S15 — rent roll / units for MF, parcels / land use for LD)
- Market data (S16 — comps, demographics, location intelligence)
- Operations / valuation / etc. (later in the workflow chain)
"""

import logging

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s14')


# ─────────────────────────────────────────────────────────────────────────────
# Phase 2 — Bulk conversational entry. User provides multiple fields in one
# message. Tests Landscaper's ability to parse natural language into a
# bulk_update_fields call (or sequential update_project_field calls).
# ─────────────────────────────────────────────────────────────────────────────
BULK_INPUT_PROMPT = (
    "Here's the project info: it's an 84-unit garden-style apartment, "
    "75,000 gross square feet, built in 1985. The address is 1234 Main "
    "Street, Phoenix, AZ. Maricopa County."
)

# Fields we expect Landscaper to write from the bulk input. Used for
# state-verification re-reads in Phase 2.
EXPECTED_BULK_FIELDS = {
    'total_units': 84,
    'gross_sf': 75000,
    'year_built': 1985,
    'jurisdiction_city': 'Phoenix',
    'jurisdiction_state': 'AZ',
    'jurisdiction_county': 'Maricopa',
    # property_subtype: 'GARDEN_STYLE_APARTMENT' would be ideal but the
    # canonical value depends on the lookup table; calibrate rather than assert.
}


# ─────────────────────────────────────────────────────────────────────────────
# Phase 3 — Landscaper-driven completion. After the bulk write, ask
# Landscaper to identify what's still missing. Should surface specific gaps
# (e.g., analysis_type, target_acquisition_date, hold_period) — not a
# generic "tell me more" deflection.
# ─────────────────────────────────────────────────────────────────────────────
GAP_PROMPT = (
    "What other project info is missing that I should fill in?"
)


# ─────────────────────────────────────────────────────────────────────────────
# Phase 4 — Single-field updates. User provides one field at a time. Tests
# the granular update path (update_project_field per call).
# ─────────────────────────────────────────────────────────────────────────────
SINGLE_FIELD_UPDATES = [
    # analysis_perspective (not analysis_type) is the directly-writable column.
    # analysis_type is a legacy DERIVED field — Landscaper correctly refuses
    # to write it directly, so testing it produced false negatives.
    ('Set the analysis perspective to investment.', 'analysis_perspective', 'INVESTMENT'),
    ('The acquisition target date is 2026-09-01.', 'target_acquisition_date', '2026-09-01'),
]


# Where to look up the persisted value for each field. The model legitimately
# routes the same prompt to different tools (update_project_field vs
# update_acquisition); this map enumerates every reachable surface so the
# outcome assertion is tool-agnostic.
#   - 'project'     → GET /api/projects/{id}            (Next.js)
#   - 'acquisition' → GET /api/projects/{id}/assumptions/acquisition/ (Django)
# Listed in priority order; first non-null match wins.
FIELD_VERIFICATION_SOURCES = {
    'analysis_perspective': [('project', 'analysis_perspective')],
    'target_acquisition_date': [
        ('project', 'acquisition_date'),
        ('acquisition', 'acquisition_date'),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# Phase 5 — Modal handoff. User explicitly asks for the form. Should fire
# open_input_modal('project_details') and NOT write any data (the modal
# saves are out of scope; modal call alone is a navigation action).
# ─────────────────────────────────────────────────────────────────────────────
MODAL_PROMPT = (
    "Open the project details form so I can review what's been entered."
)


# ─────────────────────────────────────────────────────────────────────────────
# Phase 6 — State verification. Ask Landscaper to summarize the project
# info. Response should mention the values we wrote (84 units, 1985,
# Phoenix, etc.). This is the end-to-end check that all writes landed AND
# that Landscaper can read them back.
# ─────────────────────────────────────────────────────────────────────────────
SUMMARY_PROMPT = (
    "Give me a summary of this project's info."
)


class ScenarioS14(BaseAgent):
    """Project info input via chat workflow — first in the workflow-test family."""

    def __init__(self):
        super().__init__('s14_project_info_input')
        self.validator = Validator('s14_project_info_input')

    def run_scenario(self):
        # ── Step 1: Setup — fresh project with minimal info ─────────
        project_name = f'{config.TEST_PROJECT_PREFIX}S14_Project_Info_Input'

        self.create_project_via_api(
            project_name=project_name,
            project_type_code='MF',
            # Intentionally NO city/state — those get filled in via chat in Phase 2
        )

        self.validator.observe('project_id', self.project_id)
        self.validator.assert_field_equals(
            'project_created', self.project_id is not None, True
        )

        # ── Step 2: Project-scoped thread ──────────────────────────
        self.create_thread(
            project_id=self.project_id,
            page_context='home',
        )
        self.validator.assert_field_equals(
            'thread_created', self.thread_id is not None, True
        )

        # ── Phase 1: Bulk conversational entry ───────────────────────
        logger.info('--- Phase 1: Bulk conversational entry ---')
        self._test_bulk_input()

        # ── Phase 2: Verify writes landed via DB read ───────────────
        logger.info('--- Phase 2: Verify writes landed ---')
        self._verify_bulk_writes()

        # ── Phase 3: Landscaper-driven completion ───────────────────
        logger.info('--- Phase 3: Landscaper-driven gap surfacing ---')
        self._test_gap_surfacing()

        # ── Phase 4: Single-field updates ───────────────────────────
        logger.info('--- Phase 4: Single-field updates ---')
        self._test_single_field_updates()

        # ── Phase 5: Modal handoff ──────────────────────────────────
        logger.info('--- Phase 5: Modal handoff ---')
        self._test_modal_handoff()

        # ── Phase 6: State verification via Landscaper summary ──────
        logger.info('--- Phase 6: Landscaper summary ---')
        self._test_summary()

        # ── Final pass message ──────────────────────────────────────
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S14 complete: {self.validator.pass_count}/'
            f'{len(self.validator.results)} checks passed'
        )

    # ──────────────────────────────────────────────────────────────────
    # Phase 1
    # ──────────────────────────────────────────────────────────────────
    def _test_bulk_input(self):
        chat_resp = self.send_message(
            content=BULK_INPUT_PROMPT,
            page_context='home',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p1_tools', tools_used)
        logger.info(f'  Phase 1 tools: {tools_used}')

        # Tool routing here legitimately varies between bulk_update_fields and
        # multiple update_project_field calls — both produce the same writes.
        # Observe the choice for the manifest, hard-assert only that SOMETHING
        # wrote fields. Phase 2 verifies the persistence outcome.
        bulk_call = chat_resp.find_tool_call('bulk_update_fields')
        single_calls = [tc for tc in chat_resp.tool_calls if tc.tool_name == 'update_project_field']

        used_bulk = bulk_call is not None
        used_single = len(single_calls) > 0

        self.validator.observe('p1_used_bulk_update', used_bulk)
        self.validator.observe('p1_single_update_count', len(single_calls))

        # The actual assertion: SOMETHING wrote fields
        self.validator.assert_field_equals(
            'p1_some_write_attempted', used_bulk or used_single, True
        )

        # Handle mutation confirmation if needed
        if chat_resp.has_mutation:
            logger.info('  Mutation proposed — confirming...')
            confirm_data = self.confirm_mutation(chat_resp)
            self.validator.assert_field_equals(
                'p1_confirm_success', confirm_data.get('success', False), True
            )

    # ──────────────────────────────────────────────────────────────────
    # Phase 2 — Verify the bulk writes via a fresh DB read
    # ──────────────────────────────────────────────────────────────────
    def _verify_bulk_writes(self):
        """
        Re-fetch project fields via the API to confirm writes landed at
        the database level. Per CLAUDE.md §15.1: never trust API 200; verify
        the actual stored value.
        """
        self._ensure_auth()
        import requests as req

        try:
            resp = self.session.get(
                f'{config.NEXTJS_BASE_URL}/api/projects/{self.project_id}',
                timeout=config.API_TIMEOUT,
            )
        except req.RequestException as e:
            self._fail_step(f'Project re-fetch failed: {e}')
            self.validator.assert_field_equals('p2_refetch_ok', False, True)
            return

        if resp.status_code != 200:
            self._fail_step(f'Project re-fetch returned {resp.status_code}')
            self.validator.assert_field_equals('p2_refetch_ok', False, True)
            return

        project = resp.json()

        # For each expected field, check the project carries the value
        for field, expected_value in EXPECTED_BULK_FIELDS.items():
            actual = project.get(field)
            # Coerce numeric expected values from string responses
            if isinstance(expected_value, int) and isinstance(actual, str):
                try:
                    actual = int(actual)
                except (ValueError, TypeError):
                    pass

            self.validator.calibrate(f'p2_{field}_actual', actual)
            # Calibrate equality rather than hard assert — the model may
            # capture variations (e.g., "Phoenix" vs "phoenix"). First-run
            # calibration captures the actual value; future runs compare.
            matches = actual == expected_value
            self.validator.calibrate(f'p2_{field}_matches', matches)
            logger.info(f'    {field}: actual={actual!r} expected={expected_value!r} match={matches}')

    # ──────────────────────────────────────────────────────────────────
    # Phase 3
    # ──────────────────────────────────────────────────────────────────
    def _test_gap_surfacing(self):
        chat_resp = self.send_message(
            content=GAP_PROMPT,
            page_context='home',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p3_tools', tools_used)
        self.validator.observe('p3_response_length', len(chat_resp.assistant_content))

        # We expect Landscaper to read project state, then describe gaps.
        # Common read tools: get_project_fields, get_field_schema.
        used_read = any(t in tools_used for t in [
            'get_project_fields', 'get_field_schema', 'get_data_completeness',
        ])
        self.validator.observe('p3_used_read_tool', used_read)

        # Response should mention at least one specific concept the user
        # could fill in next — analysis type, hold period, acquisition,
        # purchase price, etc. The exact phrasing varies between runs, so
        # observe (don't assert) the specific list; the hard contract below
        # only requires SOMETHING relevant in the response.
        content_lower = chat_resp.assistant_content.lower()
        gap_concepts = [
            'analysis', 'hold', 'acquisition', 'purchase', 'price',
            'cap rate', 'target', 'subtype', 'class',
        ]
        concepts_mentioned = [c for c in gap_concepts if c in content_lower]
        self.validator.observe('p3_concepts_mentioned', concepts_mentioned)
        self.validator.assert_field_equals(
            'p3_at_least_one_concept', len(concepts_mentioned) > 0, True
        )

    # ──────────────────────────────────────────────────────────────────
    # Phase 4 — outcome-based assertions
    #
    # Each prompt may legitimately route to different tools
    # (update_project_field vs update_acquisition vs bulk_update_fields).
    # Don't assert the tool name — assert the persisted value on whichever
    # surface Landscaper chose to write to. Tool name + confirm outcome are
    # calibrated for the manifest as observability signal only.
    # ──────────────────────────────────────────────────────────────────
    def _test_single_field_updates(self):
        for prompt, field, expected_value in SINGLE_FIELD_UPDATES:
            logger.info(f'  Single update: {prompt!r}')
            chat_resp = self.send_message(content=prompt, page_context='home')

            self.validator.assert_response_not_error(chat_resp)

            tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
            self.validator.observe(f'p4_{field}_tools', tools_used)

            if chat_resp.has_mutation:
                confirm_data = self.confirm_mutation(chat_resp)
                self.validator.calibrate(
                    f'p4_{field}_confirm_success',
                    confirm_data.get('success', False),
                )

            actual, found_on = self._read_persisted_value(field)
            actual = self._normalize_for_compare(actual, expected_value)

            self.validator.calibrate(f'p4_{field}_actual', actual)
            self.validator.observe(f'p4_{field}_found_on', found_on)
            self.validator.assert_field_equals(
                f'p4_{field}_persisted', actual, expected_value
            )

    def _read_persisted_value(self, field: str):
        """
        Look up the persisted value for `field` on every reachable surface
        until one returns non-null. Returns (value, source_label).
        """
        import requests as req
        sources = FIELD_VERIFICATION_SOURCES.get(field, [('project', field)])

        for source, column in sources:
            if source == 'project':
                url = f'{config.NEXTJS_BASE_URL}/api/projects/{self.project_id}'
            elif source == 'acquisition':
                url = (
                    f'{config.DJANGO_BASE_URL}/api/projects/'
                    f'{self.project_id}/assumptions/acquisition/'
                )
            else:
                continue

            try:
                resp = self.session.get(url, timeout=config.API_TIMEOUT)
            except req.RequestException as e:
                logger.warning(f'    {source} fetch failed: {e}')
                continue

            if resp.status_code != 200:
                logger.warning(f'    {source} returned {resp.status_code}')
                continue

            value = resp.json().get(column)
            if value is not None:
                return value, source

        return None, None

    @staticmethod
    def _normalize_for_compare(actual, expected):
        """
        Loose coercion for outcome comparisons. Currently handles ISO dates
        (YYYY-MM-DD) returned with timestamps appended.
        """
        if actual is None:
            return None
        if isinstance(expected, str) and len(expected) == 10 and expected[4] == '-' and expected[7] == '-':
            if isinstance(actual, str):
                return actual[:10]
        return actual

    # ──────────────────────────────────────────────────────────────────
    # Phase 5
    # ──────────────────────────────────────────────────────────────────
    def _test_modal_handoff(self):
        chat_resp = self.send_message(content=MODAL_PROMPT, page_context='home')

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p5_tools', tools_used)

        # Expected: open_input_modal called with modal_name='project_details'
        modal_call = chat_resp.find_tool_call('open_input_modal')
        self.validator.assert_field_equals(
            'p5_open_input_modal_called', modal_call is not None, True
        )

        if modal_call:
            requested_modal = (modal_call.tool_input or {}).get('modal_name')
            self.validator.calibrate('p5_modal_name', requested_modal)
            self.validator.assert_field_equals(
                'p5_correct_modal', requested_modal == 'project_details', True
            )

        # Important: opening the modal must NOT write project fields. The
        # modal is an editing surface; saves are committed from inside the
        # modal (out of scope for this scenario). We don't have a clean
        # way to verify "no writes happened" via the API alone, but we can
        # at least confirm the response didn't include a mutation proposal.
        self.validator.calibrate('p5_had_mutation', chat_resp.has_mutation)

    # ──────────────────────────────────────────────────────────────────
    # Phase 6
    # ──────────────────────────────────────────────────────────────────
    def _test_summary(self):
        chat_resp = self.send_message(content=SUMMARY_PROMPT, page_context='home')

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p6_tools', tools_used)

        # Response should mention the key values we wrote across phases 1 + 4.
        # Calibrate occurrence; hard-assert that AT LEAST a couple are present
        # (to catch totally generic responses that don't actually read state).
        content_lower = chat_resp.assistant_content.lower()
        expected_mentions = [
            ('84', 'unit count'),
            ('1985', 'year built'),
            ('phoenix', 'city'),
            ('investment', 'analysis type'),
        ]
        mentions_present = [
            label for value, label in expected_mentions if value in content_lower
        ]
        self.validator.observe('p6_mentions_present', mentions_present)
        self.validator.assert_field_equals(
            'p6_at_least_two_mentions', len(mentions_present) >= 2, True
        )

        snippet = chat_resp.assistant_content[:300]
        logger.info(f'  Summary response ({len(chat_resp.assistant_content)} chars): {snippet}...')

    def get_results(self) -> tuple[dict, dict]:
        """Run and return (scenario_result, validation_summary)."""
        result = self.run(cleanup=True)
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s14():
    """Entry point for running S14 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS14()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s14_project_info_input')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
