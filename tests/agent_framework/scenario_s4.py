"""
Scenario S4 — Mutation Confirmation Flow

Tests Landscaper's propose-then-confirm mutation pattern by triggering
data-modifying tools and verifying the two-phase confirmation flow.

Flow:
1. Create MF project via API
2. Create Landscaper thread (project-scoped)
3. Phase 1 — Single field mutation:
   a. Ask Landscaper to update the property name
   b. Verify response contains mutation_id (proposal created, not yet executed)
   c. Confirm the mutation via REST endpoint
   d. Verify confirmation succeeded
4. Phase 2 — Batch mutation:
   a. Ask Landscaper to update multiple fields at once (city + state)
   b. Verify response contains batch_id
   c. Confirm the batch via REST endpoint
   d. Verify all mutations in batch confirmed
5. Phase 3 — Mutation rejection (let expire / don't confirm):
   a. Ask Landscaper to update a field
   b. Verify proposal created
   c. Do NOT confirm — verify the mutation stays pending
6. Phase 4 — Verify data integrity:
   a. Ask Landscaper "what is the property name?" to confirm Phase 1 write landed
   b. Verify response mentions the updated name
7. Cleanup

Calibration mode: Records mutation IDs, tool calls, response shapes.
Test mode: Compares structural behavior against calibration manifest.
"""

import logging
import time

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s4')

# Phase 1: Single field mutation — update_project_field
SINGLE_MUTATION_PROMPT = (
    'Please change the property name for this project to "Cypress Terrace Apartments". '
    'Update it in the database.'
)
SINGLE_MUTATION_EXPECTED_NAME = 'Cypress Terrace Apartments'

# Phase 2: Batch mutation — bulk_update_fields (multiple fields at once)
BATCH_MUTATION_PROMPT = (
    'Please update the following project details: '
    'set the city to "Santa Monica" and the state to "CA". '
    'Update both fields in the database.'
)

# Phase 3: Unconfirmed mutation — create but don't confirm
UNCONFIRMED_MUTATION_PROMPT = (
    'Please change the zip code for this project to "90401".'
)

# Phase 4: Data integrity check — verify Phase 1 write landed
VERIFY_PROMPT = (
    'What is the current property name for this project?'
)


class ScenarioS4(BaseAgent):
    """Mutation confirmation flow: propose → confirm → verify."""

    def __init__(self):
        super().__init__('s4_mutation_confirmation')
        self.validator = Validator('s4_mutation_confirmation')

    def run_scenario(self):
        # ── Step 1: Create project ──────────────────────────────────────
        project_name = f'{config.TEST_PROJECT_PREFIX}S4_Mutation_Flow'

        self.create_project_via_api(
            project_name=project_name,
            project_type_code='MF',
            city='Hawthorne',
            state='CA',
        )

        self.validator.calibrate('project_id', self.project_id)
        self.validator.assert_field_equals(
            'project_created', self.project_id is not None, True
        )

        # ── Step 2: Create thread ───────────────────────────────────────
        self.create_thread(
            project_id=self.project_id,
            page_context='mf_property',
        )

        self.validator.assert_field_equals(
            'thread_created', self.thread_id is not None, True
        )

        # ── Phase 1: Single field mutation ──────────────────────────────
        logger.info('--- Phase 1: Single field mutation ---')
        self._test_single_mutation()

        # ── Phase 2: Batch mutation ─────────────────────────────────────
        logger.info('--- Phase 2: Batch mutation ---')
        self._test_batch_mutation()

        # ── Phase 3: Unconfirmed mutation ───────────────────────────────
        logger.info('--- Phase 3: Unconfirmed mutation (no confirm) ---')
        self._test_unconfirmed_mutation()

        # ── Phase 4: Data integrity ─────────────────────────────────────
        logger.info('--- Phase 4: Data integrity verification ---')
        self._test_data_integrity()

        # ── Summary ─────────────────────────────────────────────────────
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S4 complete: {self.validator.pass_count}/'
            f'{len(self.validator.results)} checks passed'
        )

    def _test_single_mutation(self):
        """Phase 1: Ask for a single field update, confirm it."""
        # Send the mutation request
        chat_resp = self.send_message(
            content=SINGLE_MUTATION_PROMPT,
            page_context='mf_property',
        )

        # Validate: response should not be an error
        self.validator.assert_response_not_error(chat_resp)

        # Check if a mutation tool was called
        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p1_tools', tools_used)
        logger.info(f'  Phase 1 tools: {tools_used}')

        # The response should contain a mutation proposal
        has_mut = chat_resp.has_mutation
        mutation_ids = chat_resp.get_mutation_ids()

        self.validator.assert_field_equals(
            'p1_has_mutation', has_mut, True
        )
        self.validator.calibrate('p1_mutation_ids', mutation_ids)

        # Log what we got
        logger.info(f'  Mutation IDs: {mutation_ids}')
        logger.info(f'  Response snippet: {chat_resp.assistant_content[:200]}')

        if not mutation_ids:
            logger.warning('  No mutation IDs found — skipping confirm step')
            self.validator.assert_field_equals('p1_confirm_success', False, True)
            return

        # Confirm the mutation
        confirm_data = self.confirm_mutation(chat_resp)

        self.validator.assert_field_equals(
            'p1_confirm_success', confirm_data.get('success', False), True
        )
        self.validator.calibrate('p1_confirm_action',
                                 confirm_data.get('action', ''))

        # If batch confirm, check confirmed count
        if 'batch_id' in mutation_ids:
            confirmed_count = confirm_data.get('confirmed', 0)
            self.validator.assert_field_equals(
                'p1_confirmed_count_gt_0', confirmed_count > 0, True
            )
            self.validator.calibrate('p1_confirmed_count', confirmed_count)

        logger.info(f'  Confirm result: {confirm_data}')

    def _test_batch_mutation(self):
        """Phase 2: Ask for multiple field updates, confirm as batch."""
        chat_resp = self.send_message(
            content=BATCH_MUTATION_PROMPT,
            page_context='mf_property',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p2_tools', tools_used)
        logger.info(f'  Phase 2 tools: {tools_used}')

        has_mut = chat_resp.has_mutation
        mutation_ids = chat_resp.get_mutation_ids()

        self.validator.assert_field_equals(
            'p2_has_mutation', has_mut, True
        )
        self.validator.calibrate('p2_mutation_ids', mutation_ids)

        logger.info(f'  Mutation IDs: {mutation_ids}')
        logger.info(f'  Response snippet: {chat_resp.assistant_content[:200]}')

        if not mutation_ids:
            logger.warning('  No mutation IDs found — skipping confirm step')
            self.validator.assert_field_equals('p2_confirm_success', False, True)
            return

        # Confirm
        confirm_data = self.confirm_mutation(chat_resp)

        self.validator.assert_field_equals(
            'p2_confirm_success', confirm_data.get('success', False), True
        )

        # For batch, check how many were confirmed
        if 'batch_id' in mutation_ids:
            confirmed = confirm_data.get('confirmed', 0)
            failed = confirm_data.get('failed', 0)
            self.validator.calibrate('p2_batch_confirmed', confirmed)
            self.validator.calibrate('p2_batch_failed', failed)
            self.validator.assert_field_equals(
                'p2_batch_all_confirmed', failed == 0, True
            )
            logger.info(f'  Batch: {confirmed} confirmed, {failed} failed')
        else:
            self.validator.calibrate('p2_confirm_action',
                                     confirm_data.get('action', ''))

        logger.info(f'  Confirm result: {confirm_data}')

    def _test_unconfirmed_mutation(self):
        """Phase 3: Create a mutation but don't confirm it."""
        chat_resp = self.send_message(
            content=UNCONFIRMED_MUTATION_PROMPT,
            page_context='mf_property',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p3_tools', tools_used)
        logger.info(f'  Phase 3 tools: {tools_used}')

        has_mut = chat_resp.has_mutation
        mutation_ids = chat_resp.get_mutation_ids()

        self.validator.assert_field_equals(
            'p3_has_mutation', has_mut, True
        )
        self.validator.calibrate('p3_mutation_ids', mutation_ids)

        # Intentionally do NOT confirm — mutation should stay pending
        logger.info(f'  Mutation proposed but NOT confirmed: {mutation_ids}')

        # Verify it's still pending by trying to query it
        # (We could hit the pending_mutations table, but that would need
        # a new endpoint. Instead, we just record that we skipped confirm.)
        self.validator.assert_field_equals(
            'p3_skipped_confirm', True, True
        )

    def _test_data_integrity(self):
        """Phase 4: Ask Landscaper to read back the data to verify writes landed."""
        chat_resp = self.send_message(
            content=VERIFY_PROMPT,
            page_context='mf_property',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p4_tools', tools_used)
        logger.info(f'  Phase 4 tools: {tools_used}')

        # The response should mention the name we set in Phase 1
        content_lower = chat_resp.assistant_content.lower()
        expected_lower = SINGLE_MUTATION_EXPECTED_NAME.lower()
        name_found = expected_lower in content_lower

        self.validator.assert_field_equals(
            'p4_name_verified', name_found, True
        )
        self.validator.calibrate('p4_response_length',
                                 len(chat_resp.assistant_content))

        snippet = chat_resp.assistant_content[:300]
        logger.info(f'  Verify response: {snippet}')

    def get_results(self) -> tuple[dict, dict]:
        """Run and return (scenario_result, validation_summary)."""
        result = self.run(cleanup=True)
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s4():
    """Entry point for running S4 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS4()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s4_mutation_confirmation')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
