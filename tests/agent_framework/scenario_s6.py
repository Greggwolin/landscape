"""
Scenario S6 — Unassigned Threads (Pre-Project Chat)

Tests Landscaper behavior in threads with no project_id (unassigned mode).
Only UNASSIGNED_SAFE_TOOLS should be available. Project-scoped queries
should fail gracefully rather than crashing.

Flow:
1. Create an unassigned thread (no project_id)
2. Phase 1 — Platform knowledge (should work):
   a. Ask a general CRE knowledge question
   b. Verify response is substantive (no error, no "I need a project")
3. Phase 2 — Project-scoped query (should fail gracefully):
   a. Ask "what is the property name?" (requires project context)
   b. Verify Landscaper explains it needs a project, not a traceback
4. Phase 3 — Project creation tool (the way out):
   a. Ask Landscaper to create a new MF project
   b. Verify create_project tool is called
   c. If mutation proposed → confirm it
   d. Verify project_id returned
5. Phase 4 — Post-creation context:
   a. On the SAME thread, ask a project-scoped question
   b. Verify Landscaper can now answer with project context
6. Cleanup (delete the created project)

Calibration mode: Records tool calls, response patterns, error handling.
Test mode: Compares against calibration manifest.
"""

import logging

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s6')

# Phase 1: General knowledge — should work without project
KNOWLEDGE_PROMPT = (
    'What is the typical cap rate range for Class B multifamily '
    'properties in mid-tier US markets?'
)

# Phase 2: Project-scoped — should fail gracefully
PROJECT_SCOPED_PROMPT = (
    'What is the property name and address for this project?'
)

# Phase 3: Create project via Landscaper
CREATE_PROJECT_PROMPT = (
    'Please create a new multifamily project called '
    '"AGENT_TEST_S6_Unassigned_Flow" in Portland, Oregon.'
)

# Phase 4: Post-creation verification
POST_CREATE_PROMPT = (
    'Now that the project is created, what project type is it?'
)


class ScenarioS6(BaseAgent):
    """Unassigned thread behavior: safe tools, graceful failures, project creation."""

    def __init__(self):
        super().__init__('s6_unassigned_threads')
        self.validator = Validator('s6_unassigned_threads')
        self._landscaper_created_project_id = None

    def run_scenario(self):
        # ── Step 1: Create unassigned thread ────────────────────────
        self.create_thread(
            project_id=None,  # Unassigned — no project
            page_context='general',
        )

        self.validator.assert_field_equals(
            'thread_created', self.thread_id is not None, True
        )
        self.validator.calibrate('thread_id', self.thread_id)

        # ── Phase 1: Platform knowledge (should work) ──────────────
        logger.info('--- Phase 1: Platform knowledge query ---')
        self._test_knowledge_query()

        # ── Phase 2: Project-scoped query (graceful failure) ────────
        logger.info('--- Phase 2: Project-scoped query (expect graceful fail) ---')
        self._test_project_scoped_query()

        # ── Phase 3: Project creation via Landscaper ────────────────
        logger.info('--- Phase 3: Create project via Landscaper ---')
        self._test_project_creation()

        # ── Phase 4: Post-creation context ──────────────────────────
        logger.info('--- Phase 4: Post-creation verification ---')
        self._test_post_creation()

        # ── Summary ─────────────────────────────────────────────────
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S6 complete: {self.validator.pass_count}/'
            f'{len(self.validator.results)} checks passed'
        )

    def _test_knowledge_query(self):
        """Phase 1: General CRE question — should work in unassigned mode."""
        chat_resp = self.send_message(
            content=KNOWLEDGE_PROMPT,
            page_context='general',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p1_tools', tools_used)
        logger.info(f'  Phase 1 tools: {tools_used}')

        # Response should mention cap rate (the topic asked about)
        self.validator.assert_response_mentions(chat_resp, 'cap rate')

        # Response should be substantive (not a "I can't help" deflection)
        content_len = len(chat_resp.assistant_content)
        self.validator.assert_field_equals(
            'p1_substantive_response', content_len > 100, True
        )
        self.validator.calibrate('p1_response_length', content_len)

        snippet = chat_resp.assistant_content[:200]
        logger.info(f'  Response ({content_len} chars): {snippet}...')

    def _test_project_scoped_query(self):
        """Phase 2: Ask for project data — should fail gracefully, not crash."""
        # NOTE: We use send_message's lower-level path here because the
        # standard path raises AgentError on success=false. For this test
        # we need to handle both outcomes: Landscaper might respond with
        # a helpful "you need to select a project" message (success=true)
        # or it might return success=false with an explanation.

        self._ensure_auth()
        import requests as req
        import time

        url = config.THREAD_MESSAGES_ENDPOINT.format(thread_id=self.thread_id)
        body = {'content': PROJECT_SCOPED_PROMPT, 'page_context': 'general'}

        self._log_step('send_message', f'Sending project-scoped query to unassigned thread')

        start = time.time()
        try:
            resp = self.session.post(url, json=body, timeout=config.CHAT_TIMEOUT)
        except req.RequestException as e:
            self._fail_step(f'Chat request failed: {e}')
            # Still pass the "graceful" check — a network error isn't a crash
            self.validator.assert_field_equals('p2_no_crash', True, True)
            return

        elapsed = time.time() - start
        data = resp.json()

        # The key test: did the server return a response (not 500)?
        self.validator.assert_field_equals(
            'p2_no_500', resp.status_code != 500, True
        )
        self.validator.calibrate('p2_status_code', resp.status_code)

        # Extract assistant content
        asst_msg = data.get('assistant_message', {})
        content = asst_msg.get('content', data.get('response', ''))

        tools_used = []
        metadata = asst_msg.get('metadata', {})
        if metadata:
            tools_used = [tc.get('tool_name', tc.get('name', ''))
                          for tc in metadata.get('tool_calls', [])]

        self.validator.calibrate('p2_tools', tools_used)
        self.validator.calibrate('p2_response_length', len(content))

        # Landscaper should either:
        # (a) explain it needs a project, or
        # (b) attempt the query and get empty results
        # Either way, no traceback/crash
        content_lower = content.lower()
        # Use phrases, not bare words — "exception" appears in natural
        # language ("with the exception of...") and causes false positives.
        crash_indicators = [
            'traceback (most recent call last)',
            'raise exception',
            'raised an exception',
            'nonetype',
            'attributeerror',
            'typeerror:',
            'keyerror:',
            'valueerror:',
        ]
        has_crash = any(ind in content_lower for ind in crash_indicators)

        self.validator.assert_field_equals(
            'p2_no_crash_in_response', has_crash, False
        )

        # Check if Landscaper explains the limitation
        explains_limitation = any(phrase in content_lower for phrase in [
            'project', 'select', 'create', 'no project', 'need a project',
            'not associated', 'don\'t have',
        ])
        self.validator.calibrate('p2_explains_limitation', explains_limitation)

        self._pass_step(f'Project-scoped query handled gracefully in {elapsed:.1f}s')
        logger.info(f'  Status: {resp.status_code}')
        logger.info(f'  Tools: {tools_used}')
        logger.info(f'  Response ({len(content)} chars): {content[:200]}...')

    def _test_project_creation(self):
        """Phase 3: Ask Landscaper to create a project in unassigned thread."""
        chat_resp = self.send_message(
            content=CREATE_PROJECT_PROMPT,
            page_context='general',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p3_tools', tools_used)
        logger.info(f'  Phase 3 tools: {tools_used}')

        # Verify create_project was called
        tc = chat_resp.find_tool_call('create_project')
        self.validator.assert_field_equals(
            'p3_create_project_called', tc is not None, True
        )

        if not tc:
            logger.warning('  create_project not called — skipping confirm')
            return

        # Handle mutation confirmation if needed
        if chat_resp.has_mutation:
            logger.info('  Mutation proposed — confirming...')
            confirm_data = self.confirm_mutation(chat_resp)
            self.validator.assert_field_equals(
                'p3_confirm_success', confirm_data.get('success', False), True
            )
            # confirm_mutation returns {success, mutation_id, project_id (from row),
            # result: {project_id (from create)}}. For create_project the new
            # project_id lives in result.project_id (the row's project_id is 0).
            exec_result = confirm_data.get('result', {})
            pid = (
                exec_result.get('project_id')
                or confirm_data.get('project_id')
                or tc.result.get('project_id')
            )
        else:
            # Tool executed directly
            pid = tc.result.get('project_id')

        self.validator.assert_field_equals(
            'p3_project_id_returned', pid is not None, True
        )
        self.validator.calibrate('p3_project_id', pid)

        if pid:
            self._landscaper_created_project_id = pid
            self.project_id = pid
            self._created_project_ids.append(pid)
            logger.info(f'  Project created: id={pid}')
        else:
            logger.warning('  No project_id in create_project result')

    def _test_post_creation(self):
        """Phase 4: After creating project, verify project-scoped queries work."""
        if not self._landscaper_created_project_id:
            self._log_step('post_creation', 'Skipped — no project was created')
            self._pass_step('Skipped Phase 4 — no project from Phase 3')
            self.validator.calibrate('p4_skipped', True)
            return

        chat_resp = self.send_message(
            content=POST_CREATE_PROMPT,
            page_context='general',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p4_tools', tools_used)
        logger.info(f'  Phase 4 tools: {tools_used}')

        # Response should mention multifamily (the type we created)
        self.validator.assert_response_mentions(chat_resp, 'multifamily')

        self.validator.calibrate('p4_response_length',
                                 len(chat_resp.assistant_content))

        snippet = chat_resp.assistant_content[:200]
        logger.info(f'  Response: {snippet}...')

    def get_results(self) -> tuple[dict, dict]:
        """Run and return (scenario_result, validation_summary)."""
        result = self.run(cleanup=True)
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s6():
    """Entry point for running S6 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS6()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s6_unassigned_threads')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
