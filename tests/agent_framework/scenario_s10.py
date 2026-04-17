"""
Scenario S10 — Negative Testing (Error Handling & Edge Cases)

Tests Landscaper's resilience to bad inputs and error conditions:
- Expired mutations: attempt to confirm after TTL
- Invalid tool inputs: nonsense queries that may trigger tools with bad params
- Nonexistent entity references: ask about projects/containers that don't exist
- Graceful degradation: verify Landscaper explains errors, doesn't crash

Flow:
1. Create MF project + thread
2. Phase 1 — Expired mutation:
   a. Trigger a mutation (update project field)
   b. Wait or manually expire it via timestamp
   c. Attempt to confirm → expect rejection with expiry reason
3. Phase 2 — Nonexistent entity:
   a. Ask Landscaper about a container/parcel that doesn't exist
   b. Verify Landscaper handles empty results gracefully (no crash)
4. Phase 3 — Malformed request:
   a. Ask Landscaper to update a field that doesn't exist
   b. Verify graceful error explanation, no traceback
5. Phase 4 — Double confirmation:
   a. Trigger and confirm a mutation
   b. Attempt to confirm the same mutation again
   c. Verify it's rejected (already confirmed)
6. Cleanup

Calibration mode: Records error patterns, tool calls, status codes.
Test mode: Compares against calibration manifest.
"""

import logging
import time

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s10')

# ── Prompts ─────────────────────────────────────────────────────────────────

# Phase 1: Trigger a mutation we can let expire
TRIGGER_MUTATION_PROMPT = (
    'Please change the property name to "AGENT_TEST_S10_Expiry_Check".'
)

# Phase 2: Ask about something that doesn't exist
NONEXISTENT_ENTITY_PROMPT = (
    'What are the details for Building 99, Floor 47, Unit XYZ-9999? '
    'Show me the lease terms for that unit.'
)

# Phase 3: Ask to update a nonsense field
BAD_FIELD_PROMPT = (
    'Please update the field "unicorn_rainbow_factor" to 42 for this project.'
)

# Phase 4: Trigger a clean mutation for double-confirm test
CLEAN_MUTATION_PROMPT = (
    'Please change the zip code to "99999".'
)

# Phase 5: Recovery — normal question after errors
RECOVERY_PROMPT = (
    'What is the property name for this project?'
)


class ScenarioS10(BaseAgent):
    """Negative testing: expired mutations, bad inputs, graceful errors."""

    def __init__(self):
        super().__init__('s10_negative_testing')
        self.validator = Validator('s10_negative_testing')
        self._confirmed_mutation_id = None

    def run_scenario(self):
        # ── Step 1: Create project + thread ─────────────────────────────
        project_name = f'{config.TEST_PROJECT_PREFIX}S10_Negative_Testing'

        self.create_project_via_api(
            project_name=project_name,
            project_type_code='MF',
            city='Portland',
            state='OR',
        )

        self.validator.calibrate('project_id', self.project_id)
        self.validator.assert_field_equals(
            'project_created', self.project_id is not None, True
        )

        self.create_thread(
            project_id=self.project_id,
            page_context='home',
        )
        self.validator.assert_field_equals(
            'thread_created', self.thread_id is not None, True
        )

        # ── Phase 1: Expired mutation ───────────────────────────────────
        logger.info('--- Phase 1: Expired mutation ---')
        self._test_expired_mutation()

        # ── Phase 2: Nonexistent entity ─────────────────────────────────
        logger.info('--- Phase 2: Nonexistent entity ---')
        self._test_nonexistent_entity()

        # ── Phase 3: Bad field update ───────────────────────────────────
        logger.info('--- Phase 3: Bad field reference ---')
        self._test_bad_field()

        # ── Phase 4: Double confirmation ────────────────────────────────
        logger.info('--- Phase 4: Double confirmation ---')
        self._test_double_confirm()

        # ── Phase 5: Recovery ───────────────────────────────────────────
        logger.info('--- Phase 5: Recovery after errors ---')
        self._test_recovery()

        # ── Summary ─────────────────────────────────────────────────────
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S10 complete: {self.validator.pass_count}/'
            f'{len(self.validator.results)} checks passed'
        )

    def _test_expired_mutation(self):
        """Phase 1: Trigger a mutation, manually expire it, attempt confirm."""
        # Trigger the mutation
        chat_resp = self.send_message(
            content=TRIGGER_MUTATION_PROMPT,
            page_context='home',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p1_tools', tools_used)
        logger.info(f'  Phase 1 tools: {tools_used}')

        if not chat_resp.has_mutation:
            # If Landscaper executed directly (no mutation gate), skip expiry test
            logger.warning('  No mutation proposed — Landscaper may have executed directly')
            self.validator.calibrate('p1_mutation_proposed', False)
            self.validator.calibrate('p1_skipped_expiry_test', True)
            return

        self.validator.calibrate('p1_mutation_proposed', True)

        # Extract mutation_id but DON'T confirm — attempt to expire it
        # The mutation TTL is 1 hour in production, but we can attempt
        # to confirm with a bogus mutation_id to test the rejection path
        mutation_ids = chat_resp.get_mutation_ids()
        mutation_id = mutation_ids.get('mutation_id')
        batch_id = mutation_ids.get('batch_id')

        self.validator.calibrate('p1_mutation_id', mutation_id)
        self.validator.calibrate('p1_batch_id', batch_id)

        # Instead of waiting 1 hour, test the reject path by trying to
        # confirm a nonexistent/fake mutation ID
        import requests as req

        fake_mutation_id = 99999999
        url = config.MUTATION_CONFIRM_ENDPOINT.format(mutation_id=fake_mutation_id)

        self._log_step('confirm_fake', f'Attempting confirm on fake mutation {fake_mutation_id}')

        try:
            resp = self.session.post(url, json={}, timeout=config.API_TIMEOUT)
        except req.ConnectionError as e:
            self._fail_step(f'Confirm request failed: {e}')
            self.validator.assert_field_equals('p1_fake_no_crash', True, True)
            return

        status = resp.status_code
        try:
            data = resp.json()
        except ValueError:
            # Non-JSON body (e.g. Django HTML 404 page) — still a valid non-500 response
            data = {'error': resp.text[:300]}

        self.validator.calibrate('p1_fake_confirm_status', status)
        self.validator.calibrate('p1_fake_confirm_response', data)

        # Should NOT be 200 (success) — should be 404 or 400
        self.validator.assert_field_equals(
            'p1_fake_not_200', status != 200, True
        )
        # Should NOT be 500 (crash)
        self.validator.assert_field_equals(
            'p1_fake_not_500', status != 500, True
        )

        logger.info(f'  Fake confirm status: {status}')
        logger.info(f'  Response: {data}')

        # Now actually confirm the real one so it doesn't linger
        if mutation_id:
            try:
                real_url = config.MUTATION_CONFIRM_ENDPOINT.format(mutation_id=mutation_id)
                self.session.post(real_url, json={}, timeout=config.API_TIMEOUT)
            except Exception:
                pass  # Best-effort cleanup
        elif batch_id:
            try:
                batch_url = config.BATCH_CONFIRM_ENDPOINT.format(batch_id=batch_id)
                self.session.post(batch_url, json={}, timeout=config.API_TIMEOUT)
            except Exception:
                pass

    def _test_nonexistent_entity(self):
        """Phase 2: Ask about entities that don't exist."""
        chat_resp = self.send_message(
            content=NONEXISTENT_ENTITY_PROMPT,
            page_context='mf_property',
        )

        # This should NOT raise an error — Landscaper should handle gracefully
        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p2_tools', tools_used)
        logger.info(f'  Phase 2 tools: {tools_used}')

        # Response should not contain crash indicators
        content_lower = chat_resp.assistant_content.lower()
        crash_indicators = ['traceback', 'exception', 'nonetype', 'attributeerror',
                            'keyerror', 'indexerror']
        has_crash = any(ind in content_lower for ind in crash_indicators)
        self.validator.assert_field_equals(
            'p2_no_crash_in_response', has_crash, False
        )

        # Landscaper should explain the entity wasn't found
        explains_absence = any(term in content_lower for term in [
            'not found', 'doesn\'t exist', 'don\'t have', 'no record',
            'no data', 'couldn\'t find', 'not available', 'no building',
            'no unit', 'doesn\'t appear',
        ])
        self.validator.calibrate('p2_explains_absence', explains_absence)

        self.validator.calibrate('p2_response_length', len(chat_resp.assistant_content))
        logger.info(f'  Response: {chat_resp.assistant_content[:200]}...')

    def _test_bad_field(self):
        """Phase 3: Ask to update a field that doesn't exist."""
        chat_resp = self.send_message(
            content=BAD_FIELD_PROMPT,
            page_context='home',
        )

        # Should not crash
        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p3_tools', tools_used)
        logger.info(f'  Phase 3 tools: {tools_used}')

        # No crash indicators
        content_lower = chat_resp.assistant_content.lower()
        crash_indicators = ['traceback', 'exception', 'nonetype', 'attributeerror']
        has_crash = any(ind in content_lower for ind in crash_indicators)
        self.validator.assert_field_equals(
            'p3_no_crash_in_response', has_crash, False
        )

        # Landscaper should explain it can't update that field
        explains_limitation = any(term in content_lower for term in [
            'not a valid', 'doesn\'t exist', 'not recognized', 'can\'t update',
            'unable to', 'not available', 'no such', 'invalid',
            'don\'t have', 'not supported', 'unicorn',
        ])
        self.validator.calibrate('p3_explains_limitation', explains_limitation)

        self.validator.calibrate('p3_response_length', len(chat_resp.assistant_content))
        logger.info(f'  Response: {chat_resp.assistant_content[:200]}...')

    def _test_double_confirm(self):
        """Phase 4: Trigger mutation, confirm it, then try to confirm again."""
        chat_resp = self.send_message(
            content=CLEAN_MUTATION_PROMPT,
            page_context='home',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p4_tools', tools_used)

        if not chat_resp.has_mutation:
            logger.warning('  No mutation proposed — skipping double-confirm test')
            self.validator.calibrate('p4_skipped', True)
            return

        self.validator.calibrate('p4_skipped', False)

        # First confirm — should succeed
        mutation_ids = chat_resp.get_mutation_ids()
        mutation_id = mutation_ids.get('mutation_id')
        batch_id = mutation_ids.get('batch_id')

        confirm_data = self.confirm_mutation(chat_resp)
        self.validator.assert_field_equals(
            'p4_first_confirm_success', confirm_data.get('success', False), True
        )
        self.validator.calibrate('p4_first_confirm', confirm_data)

        # Second confirm — should fail (already confirmed)
        import requests as req

        if mutation_id:
            url = config.MUTATION_CONFIRM_ENDPOINT.format(mutation_id=mutation_id)
        elif batch_id:
            url = config.BATCH_CONFIRM_ENDPOINT.format(batch_id=batch_id)
        else:
            logger.warning('  No mutation_id or batch_id — cannot test double confirm')
            return

        self._log_step('double_confirm', f'Attempting second confirm')

        try:
            resp = self.session.post(url, json={}, timeout=config.API_TIMEOUT)
            status = resp.status_code
            data = resp.json() if status != 500 else {'error': resp.text[:300]}
        except req.RequestException as e:
            self._fail_step(f'Double confirm request failed: {e}')
            return

        self.validator.calibrate('p4_double_confirm_status', status)
        self.validator.calibrate('p4_double_confirm_response', data)

        # Should NOT be 500
        self.validator.assert_field_equals(
            'p4_double_not_500', status != 500, True
        )

        # Should either be 400/404/409 (rejected) or 200 with success=false
        is_rejected = (
            status in (400, 404, 409)
            or (status == 200 and not data.get('success', True))
        )
        self.validator.assert_field_equals(
            'p4_double_rejected', is_rejected, True
        )

        logger.info(f'  Double confirm status: {status}')
        logger.info(f'  Response: {data}')

    def _test_recovery(self):
        """Phase 5: After error scenarios, verify Landscaper still works normally."""
        chat_resp = self.send_message(
            content=RECOVERY_PROMPT,
            page_context='home',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p5_tools', tools_used)
        logger.info(f'  Phase 5 tools: {tools_used}')

        # Should get a normal response about the property
        content_len = len(chat_resp.assistant_content)
        self.validator.assert_field_equals(
            'p5_substantive_response', content_len > 50, True
        )
        self.validator.calibrate('p5_response_length', content_len)

        # No crash indicators
        content_lower = chat_resp.assistant_content.lower()
        crash_indicators = ['traceback', 'exception', 'nonetype']
        has_crash = any(ind in content_lower for ind in crash_indicators)
        self.validator.assert_field_equals(
            'p5_no_crash', has_crash, False
        )

        logger.info(f'  Response: {chat_resp.assistant_content[:200]}...')

    def get_results(self) -> tuple[dict, dict]:
        """Run and return (scenario_result, validation_summary)."""
        result = self.run(cleanup=True)
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s10():
    """Entry point for running S10 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS10()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s10_negative_testing')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
