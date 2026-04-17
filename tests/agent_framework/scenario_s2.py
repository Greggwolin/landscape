"""
Scenario S2 — Manual Entry via Modals

The simplest scenario: no document upload, no extraction. Tests the core
Landscaper → modal → data entry loop.

Steps:
1. Create MF project via Next.js API (faster, deterministic)
2. Create project-scoped Landscaper thread
3. Ask Landscaper to open each modal:
   - property_details
   - rent_roll
   - operating_statement
   - income_approach
4. Verify each modal call returns correct action/modal_name
5. Ask Landscaper contextual questions about the (empty) project
6. Verify responses are sensible (no errors, mentions relevant concepts)

Calibration mode: Records actual tool call results and response patterns.
Test mode: Compares against calibration manifest.
"""

import logging

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s2')


# Modals to test, with their expected page_context for natural routing
S2_MODALS = [
    ('property_details', 'mf_property'),
    ('rent_roll', 'mf_property'),
    ('operating_statement', 'mf_operations'),
    ('income_approach', 'mf_valuation'),
]

# Questions to ask after modal sequence — tests contextual awareness
S2_QUESTIONS = [
    {
        'prompt': 'What information do I need to enter for a multifamily valuation?',
        'page_context': 'mf_valuation',
        'expect_mentions': ['rent roll', 'operating'],
    },
    {
        'prompt': 'Can you summarize what data has been entered so far for this project?',
        'page_context': 'general',
        'expect_mentions': [],  # Calibration will capture actual response
    },
]


class ScenarioS2(BaseAgent):
    """Manual entry via modals — no document upload."""

    def __init__(self):
        super().__init__('s2_manual_entry')
        self.validator = Validator('s2_manual_entry')

    def run_scenario(self):
        # ── Step 1: Create project ───────────────────────────────────
        project_name = f'{config.TEST_PROJECT_PREFIX}S2_Manual_Entry'

        self.create_project_via_api(
            project_name=project_name,
            project_type_code='MF',
            city='Phoenix',
            state='AZ',
        )

        self.validator.calibrate('project_id', self.project_id)
        self.validator.assert_field_equals(
            'project_created', self.project_id is not None, True
        )

        # ── Step 2: Create project-scoped thread ─────────────────────
        self.create_thread(
            project_id=self.project_id,
            page_context='mf_property',
        )

        self.validator.assert_field_equals(
            'thread_created', self.thread_id is not None, True
        )

        # ── Step 3: Test each modal ──────────────────────────────────
        for modal_name, page_context in S2_MODALS:
            logger.info(f'Testing modal: {modal_name}')

            chat_resp = self.request_modal(
                modal_name=modal_name,
                page_context=page_context,
            )

            # Validate tool was called and returned correct modal
            self.validator.assert_tool_called(chat_resp, 'open_input_modal')
            self.validator.assert_tool_success(chat_resp, 'open_input_modal')
            self.validator.assert_modal_opened(chat_resp, modal_name)
            self.validator.assert_response_not_error(chat_resp)

            # Calibrate the full tool result for manifest
            tc = chat_resp.find_tool_call('open_input_modal')
            if tc:
                self.validator.calibrate(
                    f'modal_result:{modal_name}',
                    tc.result,
                )

        # ── Step 4: Ask contextual questions ─────────────────────────
        for i, q in enumerate(S2_QUESTIONS):
            logger.info(f'Asking question {i+1}: {q["prompt"][:60]}...')

            chat_resp = self.send_message(
                content=q['prompt'],
                page_context=q['page_context'],
            )

            self.validator.assert_response_not_error(chat_resp)

            for keyword in q['expect_mentions']:
                self.validator.assert_response_mentions(chat_resp, keyword)

            # Calibrate the response content
            self.validator.calibrate(
                f'question_{i+1}_response_length',
                len(chat_resp.assistant_content),
            )
            self.validator.calibrate(
                f'question_{i+1}_tools_called',
                [tc.tool_name for tc in chat_resp.tool_calls],
            )

        # ── Step 5: Summary ──────────────────────────────────────────
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S2 complete: {self.validator.pass_count}/{len(self.validator.results)} checks passed'
        )

    def get_results(self) -> tuple[dict, dict]:
        """Run and return (scenario_result, validation_summary)."""
        result = self.run(cleanup=True)
        validation = self.validator.summary()

        # Save manifest if calibrating
        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s2():
    """Entry point for running S2 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS2()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s2_manual_entry')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
