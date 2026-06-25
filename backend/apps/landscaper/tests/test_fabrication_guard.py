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


# ── JB50 slice 2: structure-only tightening ──────────────────────────────────

def test_blocks_dollar_claim_when_only_a_structure_tool_ran():
    # Reading get_equity_structure (tiers/splits — no computed $) must NOT license
    # invented dollar totals. Previously this was exempt; now it is blocked.
    content = "Per the structure, the LP receives $129.7M and the GP promote is $14.4M."
    assert guard(content, [{'tool': 'get_equity_structure'}]) is True


def test_passes_percent_or_dollar_claim_when_a_numbers_tool_ran():
    # A numbers-producing tool still legitimizes figures.
    content = "Per the model, distributions are $129.7M to LP with a 1.9x multiple."
    assert guard(content, [{'tool': 'calculate_waterfall'}]) is False


# ── JB50 slice 2: fabricated artifact bodies ─────────────────────────────────

def _reno_card_body():
    # The JB48 fabrication shape: a card full of invented dollars.
    return {
        'tool': 'create_artifact',
        'input': {
            'title': 'Renovation Budget',
            'blocks': [{
                'type': 'table',
                'rows': [
                    ['Total Renovation', '$2.94M'],
                    ['Per SF', '$25/SF'],
                    ['Per Unit', '$3,500/unit'],
                ],
            }],
        },
    }


def test_blocks_fabricated_artifact_with_no_numbers_tool():
    # The forced case: a card with dollar cells and no numbers tool this turn.
    # Empty chat text — caught via the artifact body, not the reply text.
    assert guard("", [_reno_card_body()]) is True


def test_blocks_fabricated_artifact_even_with_a_structure_tool():
    # Reading get_equity_structure does not license dollars baked into a card.
    assert guard("", [{'tool': 'get_equity_structure'}, _reno_card_body()]) is True


def test_passes_artifact_when_a_numbers_tool_sourced_it():
    # Compute then card: the numbers tool legitimizes the card's figures.
    assert guard("", [{'tool': 'get_budget_items'}, _reno_card_body()]) is False


def test_blocks_update_artifact_with_percent_figure():
    body = {'tool': 'update_artifact', 'input': {'blocks': [{'rows': [['Vacancy', '9.7%']]}]}}
    assert guard("", [body]) is True


def test_passes_artifact_with_no_money_tokens():
    # A non-financial card (no $/%/x) is not flagged.
    body = {'tool': 'create_artifact', 'input': {'title': 'Unit Mix', 'blocks': [{'rows': [['1BR', '12 units']]}]}}
    assert guard("", [body]) is False


def test_blocks_object_shaped_artifact_call():
    class TC:
        tool = 'create_artifact'
        input = {'rows': [['Total', '$4.98M']]}
    assert guard("", [TC()]) is True
