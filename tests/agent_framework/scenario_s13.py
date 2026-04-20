"""
Scenario S13 — MF Cash Flow Metrics (calculate_mf_cashflow)

Tests the calculate_mf_cashflow Landscaper tool against an existing MF
project with units, leases, loan, and assumptions populated.

Uses project 17 (Chadron) — a populated MF project.

Flow:
1. Auth + create thread on project 17
2. Phase 1 — Calculate MF metrics:
   Ask for levered/unlevered IRR, NPV, equity multiple, DSCR.
   Expect: calculate_mf_cashflow tool called, metrics returned
3. Phase 2 — Monthly detail:
   Ask for monthly cash flow breakdown.
   Expect: calculate_mf_cashflow called with include_monthly=true
4. Phase 3 — Analysis:
   Ask Landscaper to interpret the results and flag concerns.
   Expect: substantive narrative referencing the metrics

No cleanup needed — uses existing project.

Calibration mode: Records tool calls, metric values, response content.
Test mode: Compares against calibration manifest.
"""

import logging

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s13')

TARGET_PROJECT_ID = 17

P1_PROMPT = (
    'Use the calculate_mf_cashflow tool to calculate the investment metrics '
    'for this multifamily property — I need the levered IRR, unlevered IRR, '
    'NPV, equity multiple, and DSCR.'
)

P2_PROMPT = (
    'Now run calculate_mf_cashflow again but include the monthly cash flow '
    'detail. I want to see the monthly NOI and debt service arrays.'
)

P3_PROMPT = (
    'Based on these cash flow metrics, give me your assessment. '
    'Is the levered return adequate for a value-add MF deal? '
    'Any red flags in the DSCR or equity multiple?'
)


class ScenarioS13(BaseAgent):
    """MF cash flow metrics test against existing MF project."""

    def __init__(self):
        super().__init__('s13_mf_cashflow')
        self.validator = Validator('s13_mf_cashflow')
        self.project_id = TARGET_PROJECT_ID

    def run_scenario(self):
        # ── Step 1: Create thread ──────────────────────────────────────
        self.create_thread(
            project_id=self.project_id,
            page_context='mf_valuation',
        )
        self.validator.assert_field_equals(
            'thread_created', self.thread_id is not None, True
        )

        # ── Phase 1: Calculate metrics ─────────────────────────────────
        logger.info('--- Phase 1: Calculate MF cash flow metrics ---')
        resp1 = self.send_message(P1_PROMPT, page_context='mf_valuation')

        self.validator.assert_response_not_error(resp1)

        tc1 = resp1.find_tool_call('calculate_mf_cashflow')
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
                metrics = result.get('metrics', {})
                assumptions = result.get('assumptions', {})

                # Validate metric fields exist
                self.validator.assert_field_equals(
                    'p1_has_metrics', len(metrics) > 0, True
                )

                # Calibrate individual metrics (values are project-dependent)
                self.validator.calibrate('p1_levered_irr', metrics.get('levered_irr'))
                self.validator.calibrate('p1_unlevered_irr', metrics.get('unlevered_irr'))
                self.validator.calibrate('p1_levered_npv', metrics.get('levered_npv'))
                self.validator.calibrate('p1_unlevered_npv', metrics.get('unlevered_npv'))
                self.validator.calibrate('p1_equity_multiple', metrics.get('equity_multiple'))
                self.validator.calibrate('p1_average_dscr', metrics.get('average_dscr'))

                # At least IRR should be non-null for a populated project
                has_irr = metrics.get('levered_irr') is not None or metrics.get('unlevered_irr') is not None
                self.validator.assert_field_equals('p1_has_irr', has_irr, True)

                # Assumptions should include basic deal parameters
                self.validator.assert_field_equals(
                    'p1_has_assumptions', len(assumptions) > 0, True
                )
                self.validator.calibrate('p1_hold_period', assumptions.get('hold_period_months'))
                self.validator.calibrate('p1_unit_count', assumptions.get('unit_count'))
                self.validator.calibrate('p1_purchase_price', assumptions.get('purchase_price'))

            else:
                error_msg = result.get('error', '')
                self.validator.calibrate('p1_error', error_msg)
                logger.warning(f'calculate_mf_cashflow returned error: {error_msg}')

                # Check if it's a data gap vs a code bug
                is_data_gap = any(
                    phrase in error_msg.lower()
                    for phrase in ['no units', 'no lease', 'no loan', 'numpy', 'not available']
                )
                self.validator.calibrate('p1_is_data_gap', is_data_gap)
        else:
            self.validator.calibrate('p1_success', False)

        # Response should mention return metrics
        self.validator.assert_response_mentions(resp1, 'irr')

        # ── Phase 2: Monthly detail ────────────────────────────────────
        logger.info('--- Phase 2: Monthly cash flow detail ---')
        resp2 = self.send_message(P2_PROMPT, page_context='mf_valuation')

        self.validator.assert_response_not_error(resp2)

        tc2 = resp2.find_tool_call('calculate_mf_cashflow')
        p2_tool_called = tc2 is not None
        self.validator.assert_field_equals('p2_tool_called', p2_tool_called, True)

        tools_used_2 = [tc.tool_name for tc in resp2.tool_calls]
        self.validator.calibrate('p2_tools', tools_used_2)
        self.validator.calibrate('p2_response_length', len(resp2.assistant_content))

        if tc2 and tc2.result:
            result2 = tc2.result
            self.validator.calibrate('p2_success', result2.get('success', False))

            # Check include_monthly was passed
            if tc2.tool_input:
                include_monthly = tc2.tool_input.get('include_monthly', False)
                self.validator.assert_field_equals(
                    'p2_include_monthly_passed', include_monthly, True
                )

            # Check monthly arrays exist in response
            monthly = result2.get('monthly_cash_flows', {})
            has_monthly = len(monthly) > 0 if isinstance(monthly, dict) else False
            self.validator.calibrate('p2_has_monthly', has_monthly)

            if has_monthly:
                self.validator.calibrate('p2_noi_periods', len(monthly.get('noi', [])))
                self.validator.calibrate('p2_levered_periods', len(monthly.get('levered', [])))

        # ── Phase 3: Analysis narrative ────────────────────────────────
        logger.info('--- Phase 3: Interpret results ---')
        resp3 = self.send_message(P3_PROMPT, page_context='mf_valuation')

        self.validator.assert_response_not_error(resp3)
        self.validator.calibrate('p3_tools', [tc.tool_name for tc in resp3.tool_calls])
        self.validator.calibrate('p3_response_length', len(resp3.assistant_content))

        # Should be a substantive analytical response
        self.validator.assert_field_equals(
            'p3_substantive_response',
            len(resp3.assistant_content) > 100,
            True,
        )

        # ── Summary ────────────────────────────────────────────────────
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S13 complete: {self.validator.pass_count}/'
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


def run_s13():
    """Entry point for running S13 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS13()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s13_mf_cashflow')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
