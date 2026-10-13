"""Verified calculations in the fabrication guard, and the what-if write refusal.

QV, 2026-10-13. Both come out of the 165-turn question battery run that day:

* The guard blanked honest arithmetic on real inputs ("cost per lot:
  $39,709,125 / 3,403 = [figure withheld]"). Gregg's decision 3a: show a figure
  worked out from real numbers, marked as calculated, with its inputs — and the
  server re-does the sum, so wrong arithmetic is still withheld.
* A what-if question wrote real lot pricing. A turn that ran a what-if may not
  also write real project data.

Pure functions only — no database.
"""
from apps.landscaper.ai_handler import (
    _REDACTION_PLACEHOLDER,
    _compose_guarded_reply,
    _label_verified_calculations,
    _sourced_with_calculations,
    _verified_calculations,
    reply_states_unsourced_financials,
)
from apps.landscaper.tool_executor import _whatif_turn_write_refusal

BUDGET_TOOL = [{'tool': 'get_budget_rollup', 'input': {}}]
# What the tools "returned" this turn: a budget total, a lot count, two categories.
OUTPUTS = [{
    'tool': 'get_budget_rollup', 'success': True,
    'result': {'grand_total': 39709125, 'total_lots': 3403,
               'categories': [{'name': 'Planning', 'amount': 4100000},
                              {'name': 'Engineering', 'amount': 2812750},
                              {'name': 'Horizontal', 'amount': 32796375}]},
}]
SOURCED = {39709125.0, 3403.0, 4100000.0, 2812750.0, 32796375.0}


# ── the battery's own failing answer ─────────────────────────────────────────

def test_cost_per_lot_division_is_verified_and_not_blocked():
    reply = ("Total development budget: $39,709,125\nTotal residential lots: 3,403\n"
             "Cost per lot: $39,709,125 / 3,403 = $11,669")
    assert reply_states_unsourced_financials(reply, BUDGET_TOOL, tool_outputs=OUTPUTS) is False


def test_same_answer_without_the_arithmetic_is_still_blocked():
    reply = "Total development budget: $39,709,125. Cost per lot is $11,669."
    assert reply_states_unsourced_financials(reply, BUDGET_TOOL, tool_outputs=OUTPUTS) is True


def test_wrong_arithmetic_is_still_blocked():
    reply = "Cost per lot: $39,709,125 / 3,403 = $14,250"
    assert reply_states_unsourced_financials(reply, BUDGET_TOOL, tool_outputs=OUTPUTS) is True
    verified, ends = _verified_calculations(reply, SOURCED)
    assert verified == set() and ends == []


def test_input_no_tool_returned_is_still_blocked():
    # 2,950 lots was never returned — the sum computes, but on an invented input.
    reply = "Cost per lot: $39,709,125 / 2,950 = $13,461"
    assert reply_states_unsourced_financials(reply, BUDGET_TOOL, tool_outputs=OUTPUTS) is True


def test_no_numbers_tool_means_no_calculation_is_accepted():
    reply = "Cost per lot: $39,709,125 / 3,403 = $11,669"
    assert reply_states_unsourced_financials(reply, [], tool_outputs=[]) is True


# ── operators, units, formats ────────────────────────────────────────────────

def test_division_sign_and_unit_words():
    verified, _ = _verified_calculations(
        "Cost per lot: $39,709,125 ÷ 3,403 lots = $11,669", SOURCED)
    assert 11669.0 in verified


def test_subtotal_by_addition():
    verified, _ = _verified_calculations(
        "Soft costs: $4,100,000 + $2,812,750 = $6,912,750", SOURCED)
    assert 6912750.0 in verified


def test_share_as_percentage():
    verified, _ = _verified_calculations(
        "Horizontal share: $32,796,375 ÷ $39,709,125 = 82.6%", SOURCED)
    assert 82.6 in verified


def test_second_line_may_build_on_a_verified_result():
    reply = ("Soft costs: $4,100,000 + $2,812,750 = $6,912,750\n"
             "Soft-cost share: $6,912,750 ÷ $39,709,125 = 17.4%")
    verified, ends = _verified_calculations(reply, SOURCED)
    assert verified == {6912750.0, 17.4} and len(ends) == 2
    assert reply_states_unsourced_financials(reply, BUDGET_TOOL, tool_outputs=OUTPUTS) is False


def test_bold_markdown_around_figures():
    verified, _ = _verified_calculations(
        "Cost per lot: **$39,709,125** ÷ **3,403** = **$11,669**", SOURCED)
    assert 11669.0 in verified


def test_abbreviated_result_within_displayed_precision():
    verified, _ = _verified_calculations(
        "Soft costs: $4,100,000 + $2,812,750 = $6.9M", SOURCED)
    assert 6900000.0 in verified


def test_rounded_input_is_not_accepted():
    # "$40M" is not what the tool returned ($39,709,125); inputs must not be rounded.
    verified, _ = _verified_calculations("Cost per lot: $40M ÷ 3,403 = $11,754", SOURCED)
    assert verified == set()


def test_mixed_operator_chain_is_not_evaluated():
    verified, _ = _verified_calculations(
        "$4,100,000 + $2,812,750 ÷ 3,403 = $2,031", SOURCED)
    assert verified == set()


def test_division_by_zero_is_ignored():
    verified, _ = _verified_calculations("$4,100,000 ÷ 0 = $0", SOURCED | {0.0})
    assert verified == set()


# ── labelling and redaction ──────────────────────────────────────────────────

def test_result_is_labelled_calculated_once():
    reply = "Cost per lot: $39,709,125 ÷ 3,403 = $11,669 per lot."
    labelled, n = _label_verified_calculations(reply, SOURCED)
    assert n == 1
    assert labelled == "Cost per lot: $39,709,125 ÷ 3,403 = $11,669 (calculated) per lot."
    again, _ = _label_verified_calculations(labelled, SOURCED)
    assert again == labelled  # idempotent


def test_unverified_arithmetic_is_not_labelled():
    reply = "Cost per lot: $39,709,125 ÷ 3,403 = $14,250"
    assert _label_verified_calculations(reply, SOURCED) == (reply, 0)


def test_verified_calculation_survives_redaction_of_another_figure():
    reply = ("Cost per lot: $39,709,125 ÷ 3,403 = $11,669. "
             "Comparable projects run about $18,000 per lot.")
    assert reply_states_unsourced_financials(reply, BUDGET_TOOL, tool_outputs=OUTPUTS) is True
    out, redacted = _compose_guarded_reply(
        reply, _sourced_with_calculations(reply, SOURCED), escalate=False)
    assert redacted == 1
    assert "$11,669" in out and "$18,000" not in out and _REDACTION_PLACEHOLDER in out


# ── what-if turns never write real data ──────────────────────────────────────

def test_real_write_refused_after_whatif_in_same_turn():
    refusal = _whatif_turn_write_refusal(
        'update_land_use_pricing', True,
        ['get_cashflow_results', 'whatif_compute', 'update_land_use_pricing'])
    assert refusal and refusal['success'] is False
    assert refusal['error'] == 'whatif_turn_no_real_writes'


def test_auto_execute_tool_is_refused_even_if_not_flagged_mutation():
    assert _whatif_turn_write_refusal(
        'update_parcel_sale_assumptions', False, ['sensitivity_grid']) is not None


def test_directed_change_with_no_whatif_still_writes():
    # BM8: when the user directs a change, Landscaper makes it.
    assert _whatif_turn_write_refusal(
        'update_land_use_pricing', True,
        ['get_pricing_register', 'update_land_use_pricing']) is None


def test_read_tools_and_whatif_tools_are_never_refused():
    prior = ['whatif_compute']
    assert _whatif_turn_write_refusal('get_cashflow_results', False, prior) is None
    assert _whatif_turn_write_refusal('whatif_commit', True, prior) is None
    assert _whatif_turn_write_refusal('scenario_save', True, prior) is None
    assert _whatif_turn_write_refusal('create_artifact', True, prior) is None


def test_no_prior_tool_list_means_no_refusal():
    assert _whatif_turn_write_refusal('update_land_use_pricing', True, None) is None


# ── the user's message is itself a hypothetical ──────────────────────────────
# Verification on 2026-10-13 caught the model calling update_land_use_pricing
# BEFORE whatif_compute, which the tool-order check alone cannot see.

def test_marker_constants_agree():
    from apps.landscaper import ai_handler, tool_executor
    assert ai_handler._HYPOTHETICAL_TURN_MARKER == tool_executor.HYPOTHETICAL_TURN_MARKER


def test_battery_scenario_questions_read_as_hypothetical():
    from apps.landscaper.ai_handler import _is_hypothetical_request
    for q in (
        "Slow absorption by a third across the remaining phases. What happens to cash flow and returns?",
        "What if lot prices come in 10% below plan?",
        "Assume the builder walks on the next takedown and those parcels sit a year. Compare to base case.",
        "What if development costs run 15% over?",
        "At what absorption pace does this deal stop working?",
        "Run a downside case where rates go up 200 basis points.",
        "What if I sold the whole thing today instead of developing it?",
    ):
        assert _is_hypothetical_request(q), q


def test_directed_changes_do_not_read_as_hypothetical():
    from apps.landscaper.ai_handler import _is_hypothetical_request
    for q in (
        "Set the SFD lot price to $2,500 per front foot.",
        "Change the lot price on Parcel 12 to $85,000.",
        "Update the absorption to 8 lots a month.",
        "Apply it.",
        "What if we drop prices 10%? Go ahead and make that change.",
        "What's the total development budget?",
        "",
    ):
        assert not _is_hypothetical_request(q), q


def test_write_before_the_whatif_tool_is_refused_when_user_asked_a_whatif():
    from apps.landscaper.tool_executor import HYPOTHETICAL_TURN_MARKER
    refusal = _whatif_turn_write_refusal(
        'update_land_use_pricing', True,
        ['get_cashflow_results', 'update_land_use_pricing', HYPOTHETICAL_TURN_MARKER])
    assert refusal and refusal['error'] == 'whatif_turn_no_real_writes'


def test_last_user_text_reads_the_latest_user_message():
    from apps.landscaper.ai_handler import _last_user_text
    history = [{'role': 'user', 'content': 'first'},
               {'role': 'assistant', 'content': 'reply'},
               {'role': 'user', 'content': 'What if prices drop?'}]
    assert _last_user_text(history) == 'What if prices drop?'
    assert _last_user_text([]) == '' and _last_user_text(None) == ''


# ── arithmetic laid out in a table or list (the battery's C3 and E2 answers) ──

C3_OUTPUTS = [{
    'tool': 'get_budget_rollup', 'success': True,
    'result': {'grand_total': 39709125, 'categories': [
        {'name': 'Onsite Improvements', 'amount': 22221000, 'pct': 56.0},
        {'name': 'Offsite Improvements', 'amount': 10575375, 'pct': 26.6},
        {'name': 'Civil Engineering', 'amount': 5412750, 'pct': 13.6},
        {'name': 'Land Planning', 'amount': 1500000, 'pct': 3.8}]},
}]
C3_REPLY = (
    "Total development budget: **$39,709,125**\n\n"
    "Horizontal Costs:  $32,796,375   82.6%\n"
    "  Onsite Improvements   $22,221,000   56.0%\n"
    "  Offsite Improvements  $10,575,375   26.6%\n\n"
    "Soft Costs:             $6,912,750   17.4%\n"
    "  Civil Engineering      $5,412,750   13.6%\n"
    "  Land Planning          $1,500,000    3.8%\n")


def test_subtotal_above_its_rows_is_verified_money_and_percent():
    assert reply_states_unsourced_financials(
        C3_REPLY, BUDGET_TOOL, tool_outputs=C3_OUTPUTS) is False
    labelled, n = _label_verified_calculations(
        C3_REPLY, {39709125.0, 22221000.0, 56.0, 10575375.0, 26.6, 5412750.0, 13.6, 1500000.0, 3.8})
    assert n == 4  # both subtotals, money and percent
    assert "$6,912,750 (calculated)" in labelled and "17.4% (calculated)" in labelled


def test_subtotal_that_does_not_add_up_is_still_blocked():
    wrong = C3_REPLY.replace("$6,912,750", "$7,400,000")
    assert reply_states_unsourced_financials(wrong, BUDGET_TOOL, tool_outputs=C3_OUTPUTS) is True


def test_subtotal_not_next_to_its_parts_is_still_blocked():
    # Same true subtotal, but stated alone — its inputs are not beside it.
    reply = "Total development budget: $39,709,125. Soft costs come to $6,912,750."
    assert reply_states_unsourced_financials(reply, BUDGET_TOOL, tool_outputs=C3_OUTPUTS) is True


def test_total_below_its_rows_is_verified():
    reply = ("Civil Engineering  $5,412,750\n"
             "Land Planning      $1,500,000\n"
             "Total soft costs   $6,912,750\n")
    verified, _ = _verified_calculations(reply, {5412750.0, 1500000.0})
    assert 6912750.0 in verified


def test_deduction_between_gross_and_net_is_verified():
    cash = [{'tool': 'get_cashflow_results', 'input': {}}]
    outputs = [{'tool': 'get_cashflow_results', 'success': True,
                'result': {'totalGrossRevenue': 638577701, 'totalNetRevenue': 425200441}}]
    reply = ("Total projected revenue:\n"
             "- Gross revenue: $638,577,701\n"
             "- Less revenue deductions: -$213,377,260\n"
             "- Net revenue: $425,200,441\n")
    assert reply_states_unsourced_financials(reply, cash, tool_outputs=outputs) is False


def test_redaction_keeps_the_line_break_after_a_withheld_figure():
    reply = "- Deductions: -$213,377,260\n- Net revenue: $425,200,441"
    out, n = _compose_guarded_reply(reply, {425200441.0}, escalate=False)
    assert n == 1 and f"-{_REDACTION_PLACEHOLDER}\n- Net revenue: $425,200,441" in out


# ── a fully sourced answer from a read tool the guard did not know about ─────

def test_absorption_schedule_answer_is_not_blocked_when_every_figure_traces():
    tools = [{'tool': 'get_absorption_schedule', 'input': {}}]
    outputs = [{'tool': 'get_absorption_schedule', 'success': True,
                'result': {'base_price_per_unit': 85000, 'price_escalation_pct': 0.5,
                           'total_units': 80, 'projected_revenue': 6800000}}]
    reply = ("The absorption schedule shows 80 lots at a base price of $85,000/lot, "
             "escalating 0.5% per period, for projected revenue of $6,800,000.")
    assert reply_states_unsourced_financials(reply, tools, tool_outputs=outputs) is False


def test_absorption_schedule_answer_with_an_invented_price_is_still_blocked():
    tools = [{'tool': 'get_absorption_schedule', 'input': {}}]
    outputs = [{'tool': 'get_absorption_schedule', 'success': True,
                'result': {'base_price_per_unit': 85000, 'total_units': 80}}]
    reply = "Lots are priced at $85,000 each; comparable revenue would be $9,400,000."
    assert reply_states_unsourced_financials(reply, tools, tool_outputs=outputs) is True


def test_total_under_a_drawn_rule_is_still_next_to_its_rows():
    # Verification run 2026-10-13: the model drew a rule between rows and total.
    reply = ("  Civil Engineering      $5,412,750   13.6%\n"
             "  Land Planning          $1,500,000    3.8%\n"
             "  ─────────────────────────────────────────\n"
             "  Soft Costs (total)     $6,912,750   17.4%\n")
    verified, ends = _verified_calculations(reply, {5412750.0, 13.6, 1500000.0, 3.8})
    assert verified == {6912750.0, 17.4} and len(ends) == 2
    labelled, _ = _label_verified_calculations(reply, {5412750.0, 13.6, 1500000.0, 3.8})
    assert "$6,912,750 (calculated)" in labelled and "17.4% (calculated)" in labelled


def test_blank_line_still_separates_blocks():
    reply = ("Civil Engineering  $5,412,750\n"
             "Land Planning      $1,500,000\n"
             "\n"
             "Total soft costs   $6,912,750\n")
    verified, _ = _verified_calculations(reply, {5412750.0, 1500000.0})
    assert verified == set()


# ── "$161,385\nMedian" is not $161,385 million (battery I3) ──────────────────

def test_newline_then_capital_m_is_not_a_million_suffix():
    from apps.landscaper.ai_handler import _figure_magnitudes, _num_magnitudes
    text = "Median HH Income: $161,385\nMedian Home Value: $648,178\nBachelor's: 61%"
    assert {m for m, _ in _figure_magnitudes(text)} == {161385.0, 648178.0, 61.0}
    # ...and the same in what the tools returned ("12 months" is 12, not 12 million).
    assert _num_magnitudes('{"hold": "12 months", "beds": "3 bedrooms", "k": 5}') == {12.0, 3.0, 5.0}


def test_real_suffixes_still_scale():
    from apps.landscaper.ai_handler import _num_magnitudes
    assert _num_magnitudes("$3.46M") == {3460000.0}
    assert _num_magnitudes("$1.2 billion and 25k") == {1.2e9, 25000.0}
    assert _num_magnitudes("9.7%") == {9.7}


def test_demographics_answer_is_not_blocked():
    tools = [{'tool': 'get_demographics', 'input': {}}]
    outputs = [{'tool': 'get_demographics', 'success': True,
                'result': {'rings': [{'miles': 1, 'population': 3079, 'households': 984,
                                      'median_hh_income': 161385, 'median_home_value': 648178}]}}]
    reply = ("**1-MILE RING**\nPopulation: 3,079 | Households: 984\n"
             "Median HH Income: $161,385\nMedian Home Value: $648,178\n")
    assert reply_states_unsourced_financials(reply, tools, tool_outputs=outputs) is False


# ── the repeated question (Gregg, 2026-10-13 12:50) ──────────────────────────

PRIOR_CLEAN = {'role': 'assistant', 'content':
               "Gross Revenue:\nResidential $357.0M 55.9%\nCommercial $256.5M 40.2%"}
PRIOR_BLOCKED = {'role': 'assistant', 'content':
                 f"Residential {_REDACTION_PLACEHOLDER}\n---\nI don't have those figures "
                 "from the project's data yet — want me to open the screen that shows "
                 "them, or run the calculation? I won't estimate them."}


def test_restating_a_vetted_reply_without_a_tool_is_not_blocked():
    from apps.landscaper.ai_handler import figures_in_prior_clean_replies
    prior = figures_in_prior_clean_replies([{'role': 'user', 'content': 'split?'}, PRIOR_CLEAN,
                                            {'role': 'user', 'content': 'split again?'}])
    assert prior == {357000000.0, 55.9, 256500000.0, 40.2}
    restated = "I just gave you that: Residential $357.0M (55.9%), Commercial $256.5M (40.2%) of revenue."
    assert reply_states_unsourced_financials(restated, [], tool_outputs=[], prior_sourced=prior) is False


def test_a_new_figure_in_the_restatement_is_still_blocked():
    from apps.landscaper.ai_handler import figures_in_prior_clean_replies
    prior = figures_in_prior_clean_replies([PRIOR_CLEAN])
    reply = "Residential $357.0M (55.9%), Commercial $256.5M (40.2%), Mixed Use $25.1M of revenue."
    assert reply_states_unsourced_financials(reply, [], tool_outputs=[], prior_sourced=prior) is True
    out, n = _compose_guarded_reply(reply, prior, escalate=False)
    assert n == 1 and "$357.0M" in out and "$25.1M" not in out


def test_a_blocked_prior_reply_lends_nothing():
    from apps.landscaper.ai_handler import figures_in_prior_clean_replies
    assert figures_in_prior_clean_replies([PRIOR_BLOCKED]) == set()
    assert figures_in_prior_clean_replies(
        [{'role': 'assistant', 'content': 'x', 'metadata': {'fabrication_guard_blocked': True}}]) == set()


def test_without_prior_figures_the_no_tool_regime_still_blocks():
    assert reply_states_unsourced_financials(
        "Residential $357.0M of revenue.", [], tool_outputs=[], prior_sourced=set()) is True
