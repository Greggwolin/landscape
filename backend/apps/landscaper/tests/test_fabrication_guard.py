"""
Deterministic unit tests for the Landscaper fabrication guard
(LSCMD-LS-FABGUARD-CODE-0624-JB13).

These calibrate the guard LOGIC against the exact known-bad / known-good shapes
(no live model needed): the invented equity waterfall must be flagged; a real
tool-sourced budget answer and a navigate-only reply must pass. Live end-to-end
calibration (does the model recover by calling the tool when blocked) is a
separate, model-in-the-loop step.
"""

from apps.landscaper.ai_handler import reply_states_unsourced_financials as guard


# ── MUST BLOCK: financial figures stated with no financial tool this turn ────

def test_blocks_invented_equity_waterfall_no_tools():
    content = (
        "Here's the equity waterfall: LP invested $129.7M, GP $14.4M, with a "
        "27.2% IRR (91% to LP) and $278.3M total project profit."
    )
    assert guard(content, []) is True


def test_blocks_when_only_a_nonfinancial_tool_ran():
    # Model navigated but still stated an unsourced project figure.
    content = "Opening the budget. The total development budget is about $40M."
    assert guard(content, [{'tool': 'navigate_to_screen'}]) is True


def test_blocks_irr_percentage_with_no_tool():
    assert guard("The projected IRR is 18.5%.", []) is True


# ── MUST PASS: a financial read/calc tool legitimizes the figures ────────────

def test_passes_budget_answer_with_get_budget_items():
    content = "The development budget totals $40,244,250 across 30 line items."
    assert guard(content, [{'tool': 'get_budget_items'}]) is False


def test_passes_budget_answer_with_get_budget_categories():
    content = "Across categories the budget is $40,244,250."
    assert guard(content, [{'tool': 'get_budget_categories'}]) is False


def test_passes_real_waterfall_with_calculate_waterfall():
    content = "Per the model, LP IRR is 18.2% with a 1.9x equity multiple."
    assert guard(content, [{'tool': 'calculate_waterfall'}]) is False


def test_passes_object_shaped_tool_call():
    class TC:
        tool = 'calculate_project_metrics'
    content = "NOI is $1,250,000 and the cap rate is 5.5%."
    assert guard(content, [TC()]) is False


# ── MUST PASS: no false blocks on non-financial or numberless replies ────────

def test_passes_non_financial_count_no_tool():
    # A bare count with no money/percent token and no financial keyword.
    assert guard("This project has 30 parcels across 4 phases.", []) is False


def test_passes_navigate_only_no_figure():
    content = "Opening the development budget screen for you now."
    assert guard(content, [{'tool': 'navigate_to_screen'}]) is False


def test_passes_empty_content():
    assert guard("", []) is False
    assert guard(None, []) is False
