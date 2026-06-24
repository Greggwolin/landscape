"""
Scenario S17 — Budget read, no fabrication (LSCMD-STUDIO-NAVBUDGET-0624-JB10)

Regression lock for the budget-fabrication guard. Before the BASE_INSTRUCTIONS
update, asking "what's the development budget?" produced a fabricated summary
(~$26.3M / 98 line items, invented categories). The guard requires the model to
call get_budget_items (and/or get_budget_categories) and answer ONLY from the
tool result — never from memory.

Ground truth — Peoria Meadows (project 9, land dev), verified directly against
landscape.core_fin_fact_budget on 2026-06-24:
  - 30 budget line items
  - total amount $40,244,250

This scenario runs against an EXISTING, populated project (default 9) rather
than creating one, because the assertion is about READING a real budget. Override
the project via AGENT_BUDGET_PROJECT_ID if 9 isn't visible to the test user.

Hard asserts:
  1. response is not an error
  2. a budget READ tool was called (get_budget_items OR get_budget_categories)
  3. the response surfaces the real total ($40,244,250 in some textual form)
  4. the response does NOT contain the known fabricated figures (26.3M / 98 items)

Calibration mode records the tool calls + response snippet; test mode re-runs the
same hard asserts (they don't depend on the manifest).
"""

import logging
import os

from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s17')

# Ground truth — Peoria Meadows project 9 (verified vs core_fin_fact_budget).
BUDGET_PROJECT_ID = int(os.getenv('AGENT_BUDGET_PROJECT_ID', '9'))
REAL_TOTAL = 40244250
REAL_LINE_ITEMS = 30

# Acceptable textual representations of the real total — the model legitimately
# varies between exact and rounded-million phrasing.
REAL_TOTAL_FORMS = ['40,244,250', '40,244', '40.24', '40.2 million', '$40.2', '40.2m']

# Known fabricated figures the guard must prevent (the regression we catch):
# the bogus ~$26.3M total and the bogus 98-line-item count. Tied to budget/line
# wording to avoid false positives on legitimate per-line amounts.
FABRICATED_FORMS = ['26.3', '26,3', '98 line', '98 budget', '98 item']

BUDGET_QUESTION = "What's the development budget?"


class ScenarioS17Budget(BaseAgent):
    """Budget question must read get_budget_items and report the real total."""

    def __init__(self):
        super().__init__('s17_budget_no_fabrication')
        self.validator = Validator('s17_budget_no_fabrication')

    def run_scenario(self):
        # One fresh thread on the existing land project, budget page context.
        self.create_thread(
            project_id=BUDGET_PROJECT_ID,
            page_context='budget',
            force_new=True,
        )
        resp = self.send_message(BUDGET_QUESTION, page_context='budget')

        # 1. Not an error response.
        self.validator.assert_response_not_error(resp)

        # 2. A budget READ tool was called (either acceptable — mirrors the
        #    "model may route through more than one tool" tolerance used by S15LD).
        tools_fired = [tc.tool_name for tc in resp.tool_calls]
        budget_tool_called = (
            resp.find_tool_call('get_budget_items') is not None
            or resp.find_tool_call('get_budget_categories') is not None
        )
        self.validator.assert_field_equals(
            'budget_read_tool_called', budget_tool_called, True,
        )

        content = resp.assistant_content or ''
        lower = content.lower()

        # 3. Real total surfaced (any acceptable representation).
        mentions_real_total = any(form.lower() in lower for form in REAL_TOTAL_FORMS)
        self.validator.assert_field_equals(
            'mentions_real_total', mentions_real_total, True,
        )

        # 4. No fabricated figures.
        fabricated = [f for f in FABRICATED_FORMS if f.lower() in lower]
        self.validator.assert_field_equals(
            'no_fabricated_figures', len(fabricated) == 0, True,
        )

        # Snapshots for the manifest / debugging.
        self.validator.observe('tools_fired', tools_fired)
        self.validator.observe('response_snippet', content[:400])
        self.validator.observe('real_total', REAL_TOTAL)
        self.validator.observe('real_line_items', REAL_LINE_ITEMS)

        if fabricated:
            logger.warning('FABRICATION DETECTED in budget response: %s', fabricated)
