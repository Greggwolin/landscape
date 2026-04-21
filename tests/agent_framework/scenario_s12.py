"""
Scenario S12 — Waterfall Calculation (calculate_waterfall)

Tests the calculate_waterfall Landscaper tool against an existing MF project
that has equity structure, waterfall tiers, and financial data populated.

Uses project 17 (Chadron) — a populated MF project.

Flow:
1. Auth + create thread on project 17
2. Phase 1 — Run waterfall:
   Ask Landscaper to calculate the equity waterfall.
   Expect: calculate_waterfall tool called, tiers fetched, results returned
3. Phase 2 — Interpret results:
   Ask for a plain-English summary of GP/LP splits.
   Expect: Landscaper references waterfall results in narrative form
4. Phase 3 — Error handling (optional):
   If project has no tiers, expect a clean error message (not a crash)

No cleanup needed — uses existing project.

Calibration mode: Records tool calls, tier count, result shape.
Test mode: Compares against calibration manifest.
"""

import logging

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s12')

TARGET_PROJECT_ID = 17

P1_PROMPT = (
    'Use the calculate_waterfall tool to run the equity waterfall '
    'distribution for this project. Show me the GP/LP splits across '
    'all tiers.'
)

P2_PROMPT = (
    'Summarize the waterfall results in plain English. '
    'What does the GP promote look like at each hurdle? '
    'Is this a favorable structure for the LP?'
)


class ScenarioS12(BaseAgent):
    """Waterfall calculation test against existing MF project."""

    def __init__(self):
        super().__init__('s12_waterfall')
        self.validator = Validator('s12_waterfall')
        self.project_id = TARGET_PROJECT_ID

    def run_scenario(self):
        # ── Step 1: Create thread ──────────────────────────────────────
        self.create_thread(
            project_id=self.project_id,
            page_context='mf_capitalization',
        )
        self.validator.assert_field_equals(
            'thread_created', self.thread_id is not None, True
        )

        # ── Phase 1: Run waterfall ─────────────────────────────────────
        logger.info('--- Phase 1: Calculate waterfall ---')
        resp1 = self.send_message(P1_PROMPT, page_context='mf_capitalization')

        self.validator.assert_response_not_error(resp1)

        tc1 = resp1.find_tool_call('calculate_waterfall')
        tool_called = tc1 is not None
        self.validator.assert_field_equals('p1_tool_called', tool_called, True)

        tools_used = [tc.tool_name for tc in resp1.tool_calls]
        self.validator.calibrate('p1_tools', tools_used)
        self.validator.calibrate('p1_response_length', len(resp1.assistant_content))

        if tc1 and tc1.result:
            result = tc1.result
            success = result.get('success', False)
            self.validator.calibrate('p1_success', success)

            if success:
                # Waterfall ran — validate structure
                tier_count = result.get('tier_count', 0)
                period_count = result.get('period_count', 0)
                self.validator.calibrate('p1_tier_count', tier_count)
                self.validator.calibrate('p1_period_count', period_count)
                self.validator.assert_field_equals('p1_has_tiers', tier_count > 0, True)
                self.validator.assert_field_equals('p1_has_periods', period_count > 0, True)

                # Check settings were returned
                settings = result.get('settings', {})
                self.validator.assert_field_equals(
                    'p1_has_settings', len(settings) > 0, True
                )

                # Check waterfall result object exists
                wf_result = result.get('result', {})
                self.validator.assert_field_equals(
                    'p1_has_result', len(wf_result) > 0 if isinstance(wf_result, dict) else False, True
                )
                self.validator.calibrate('p1_result_keys', sorted(wf_result.keys()) if isinstance(wf_result, dict) else [])
            else:
                # Waterfall failed — record the error for calibration
                error_msg = result.get('error', '')
                self.validator.calibrate('p1_error', error_msg)
                logger.warning(f'calculate_waterfall returned error: {error_msg}')

                # If error says "no equity structure" or "no tiers", that's a data gap, not a bug
                is_data_gap = any(
                    phrase in error_msg.lower()
                    for phrase in ['no equity', 'no tiers', 'no waterfall']
                )
                self.validator.calibrate('p1_is_data_gap', is_data_gap)
        else:
            self.validator.calibrate('p1_success', False)

        # ── Phase 2: Interpret results ─────────────────────────────────
        logger.info('--- Phase 2: Interpret waterfall ---')
        resp2 = self.send_message(P2_PROMPT, page_context='mf_capitalization')

        self.validator.assert_response_not_error(resp2)
        self.validator.calibrate('p2_tools', [tc.tool_name for tc in resp2.tool_calls])
        self.validator.calibrate('p2_response_length', len(resp2.assistant_content))

        # Should be a substantive narrative response
        self.validator.assert_field_equals(
            'p2_substantive_response',
            len(resp2.assistant_content) > 50,
            True,
        )

        # ── Summary ────────────────────────────────────────────────────
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S12 complete: {self.validator.pass_count}/'
            f'{len(self.validator.results)} checks passed'
        )

    def cleanup(self):
        """No cleanup needed — uses existing project."""
        pass

    def get_results(self) -> tuple[dict, dict]:
        result = self.run(cleanup=False)
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s12():
    """Entry point for running S12 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS12()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s12_waterfall')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
