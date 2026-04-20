"""
Scenario S11 — Demographics Tool (get_demographics)

Tests the get_demographics Landscaper tool against an existing MF project
that has coordinates and Census data loaded for its state.

Uses project 17 (Chadron) — a populated MF project with lat/lon set.

Flow:
1. Auth + create thread on project 17
2. Phase 1 — Default radii:
   Ask for demographics around the project location.
   Expect: get_demographics tool called, rings for 1/3/5 miles returned
3. Phase 2 — Custom radii:
   Ask for demographics at a custom radius (e.g. 10 miles).
   Expect: get_demographics called with custom radii parameter
4. Phase 3 — Contextual follow-up:
   Ask a follow-up about the data (e.g. income trends).
   Expect: Landscaper references the demographics it just retrieved

No cleanup needed — uses existing project, only creates threads.

Calibration mode: Records tool calls, ring data presence, response content.
Test mode: Compares against calibration manifest.
"""

import logging

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s11')

# Existing project — Chadron MF with coordinates
TARGET_PROJECT_ID = 17

# Prompts — explicit tool name to ensure invocation
P1_PROMPT = (
    'Use the get_demographics tool to show me the Census demographics '
    'around this property — population, income, and housing stats for '
    'the standard 1, 3, and 5 mile rings.'
)

P2_PROMPT = (
    'Now use get_demographics again but this time show me a 10-mile ring '
    'around the property. I want to see the broader market area.'
)

P3_PROMPT = (
    'Based on the demographics you just pulled, how does the median '
    'household income compare across the different ring distances? '
    'Is this a strong rental market?'
)


class ScenarioS11(BaseAgent):
    """Demographics tool test against existing MF project."""

    def __init__(self):
        super().__init__('s11_demographics')
        self.validator = Validator('s11_demographics')
        # Use existing project — don't create one
        self.project_id = TARGET_PROJECT_ID

    def run_scenario(self):
        # ── Step 1: Create thread on existing project ──────────────────
        self.create_thread(
            project_id=self.project_id,
            page_context='general',
        )
        self.validator.assert_field_equals(
            'thread_created', self.thread_id is not None, True
        )

        # ── Phase 1: Default radii (1/3/5 mile) ───────────────────────
        logger.info('--- Phase 1: Default radii ---')
        resp1 = self.send_message(P1_PROMPT, page_context='general')

        self.validator.assert_response_not_error(resp1)

        # Check tool was called
        tc1 = resp1.find_tool_call('get_demographics')
        tool_called = tc1 is not None
        self.validator.assert_field_equals('p1_tool_called', tool_called, True)

        # Calibrate tool details
        tools_used = [tc.tool_name for tc in resp1.tool_calls]
        self.validator.calibrate('p1_tools', tools_used)
        self.validator.calibrate('p1_response_length', len(resp1.assistant_content))

        if tc1 and tc1.result:
            result = tc1.result
            self.validator.assert_field_equals('p1_success', result.get('success', False), True)
            rings = result.get('rings', [])
            self.validator.calibrate('p1_ring_count', len(rings))
            self.validator.assert_field_equals('p1_has_rings', len(rings) > 0, True)

            # Check center coordinates exist
            center = result.get('center', {})
            self.validator.assert_field_equals(
                'p1_has_center', center.get('lat') is not None, True
            )
            self.validator.calibrate('p1_center_lat', center.get('lat'))
            self.validator.calibrate('p1_center_lon', center.get('lon'))

            # Check ring data quality — first ring should have population
            if rings:
                first_ring = rings[0]
                self.validator.assert_field_equals(
                    'p1_has_population',
                    first_ring.get('population') is not None and first_ring.get('population', 0) > 0,
                    True,
                )
                self.validator.assert_field_equals(
                    'p1_has_income',
                    first_ring.get('median_household_income') is not None,
                    True,
                )
                self.validator.calibrate('p1_ring_radii',
                                         [r.get('radius_miles') for r in rings])
        else:
            self.validator.assert_field_equals('p1_success', False, True)

        # Check response mentions demographics keywords
        self.validator.assert_response_mentions(resp1, 'population')

        # ── Phase 2: Custom radii (10 mile) ────────────────────────────
        logger.info('--- Phase 2: Custom radii ---')
        resp2 = self.send_message(P2_PROMPT, page_context='general')

        self.validator.assert_response_not_error(resp2)

        tc2 = resp2.find_tool_call('get_demographics')
        p2_tool_called = tc2 is not None
        self.validator.assert_field_equals('p2_tool_called', p2_tool_called, True)

        tools_used_2 = [tc.tool_name for tc in resp2.tool_calls]
        self.validator.calibrate('p2_tools', tools_used_2)
        self.validator.calibrate('p2_response_length', len(resp2.assistant_content))

        if tc2 and tc2.result:
            result2 = tc2.result
            self.validator.calibrate('p2_success', result2.get('success', False))
            rings2 = result2.get('rings', [])
            self.validator.calibrate('p2_ring_count', len(rings2))

            # Check that custom radius was passed
            if tc2.tool_input:
                radii_input = tc2.tool_input.get('radii', [])
                self.validator.calibrate('p2_radii_requested', radii_input)
                # 10 should be in the requested radii
                has_10 = 10 in radii_input if radii_input else False
                self.validator.assert_field_equals('p2_has_10_mile', has_10, True)

        # ── Phase 3: Contextual follow-up ──────────────────────────────
        logger.info('--- Phase 3: Contextual follow-up ---')
        resp3 = self.send_message(P3_PROMPT, page_context='general')

        self.validator.assert_response_not_error(resp3)
        self.validator.calibrate('p3_tools', [tc.tool_name for tc in resp3.tool_calls])
        self.validator.calibrate('p3_response_length', len(resp3.assistant_content))

        # Should mention income in a substantive way
        self.validator.assert_field_equals(
            'p3_substantive_response',
            len(resp3.assistant_content) > 50,
            True,
        )
        self.validator.assert_response_mentions(resp3, 'income')

        # ── Summary ────────────────────────────────────────────────────
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S11 complete: {self.validator.pass_count}/'
            f'{len(self.validator.results)} checks passed'
        )

    def cleanup(self):
        """No cleanup needed — uses existing project, threads are harmless."""
        pass

    def get_results(self) -> tuple[dict, dict]:
        result = self.run(cleanup=False)  # No cleanup for existing project
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s11():
    """Entry point for running S11 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS11()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s11_demographics')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
