"""
Guard post-processing: preserve the reply, redact only the figures
(LSCMD-PD-GUARDFIX-0813-PD15, Fixes 1 + 2).

The detection logic (`reply_states_unsourced_financials`) is deliberately NOT
exercised here — test_fabrication_guard.py owns that, and PD15 changed none of
it. These tests pin what happens AFTER a hit: the model's finding survives, the
unsourced tokens are blanked in place, sourced tokens are untouched, and a
second consecutive fire says something different from the first.
"""

from apps.landscaper.ai_handler import (
    _GUARD_ESCALATION_NOTE,
    _GUARD_FALLBACK_QUESTION,
    _REDACTION_PLACEHOLDER,
    _collect_sourced_numbers,
    _compose_guarded_reply,
    _prior_reply_was_guard_blocked,
    _redact_unsourced_figures,
)


# ── Redaction: only the flagged tokens ──────────────────────────────────────

def test_redacts_unsourced_token_and_keeps_the_prose():
    # The PD14 turn-2 shape: a correct, useful finding carrying one invented figure.
    content = (
        "The OM's extraction contains unit types only — there is no unit-level "
        "rent roll in it. The 1BR asking rent shows as $2,100."
    )
    out, count = _redact_unsourced_figures(content, sourced=set())
    assert count == 1
    assert '$2,100' not in out
    assert _REDACTION_PLACEHOLDER in out
    # The finding itself — the whole reason PD15 exists — is intact.
    assert "unit types only" in out
    assert "no unit-level rent roll" in out


def test_leaves_a_sourced_figure_alone():
    sourced = _collect_sourced_numbers([
        {'tool': 'get_budget_items', 'success': True, 'result': {'total': 2100}},
    ])
    out, count = _redact_unsourced_figures('The 1BR rent is $2,100.', sourced)
    assert count == 0
    assert out == 'The 1BR rent is $2,100.'
    assert _REDACTION_PLACEHOLDER not in out


def test_redacts_only_the_unsourced_token_in_a_mixed_reply():
    sourced = _collect_sourced_numbers([
        {'tool': 'calculate_cash_flow', 'success': True, 'result': {'noi': 412000}},
    ])
    content = 'NOI is $412,000 and the exit cap is 5.5%.'
    out, count = _redact_unsourced_figures(content, sourced)
    assert count == 1
    assert '$412,000' in out          # traced → untouched
    assert '5.5%' not in out          # traced to nothing → blanked
    assert out.count(_REDACTION_PLACEHOLDER) == 1


def test_no_figures_means_no_change():
    content = 'There is no rent roll in the extraction.'
    out, count = _redact_unsourced_figures(content, sourced=set())
    assert count == 0
    assert out == content


def test_percent_matches_its_fraction_from_tool_output():
    # 9.7% in the reply vs 0.097 returned by the tool — the same figure.
    sourced = _collect_sourced_numbers([
        {'tool': 'calculate_project_metrics', 'success': True,
         'result': {'vacancy': 0.097}},
    ])
    out, count = _redact_unsourced_figures('Vacancy runs 9.7%.', sourced)
    assert count == 0
    assert out == 'Vacancy runs 9.7%.'


# ── Composition: reply + separator + question ───────────────────────────────

def test_composed_reply_keeps_body_and_appends_the_question():
    content = 'No unit-level rent roll is present. The asking rent shows $2,100.'
    out, count = _compose_guarded_reply(content, sourced=set(), escalate=False)
    assert count == 1
    assert out.startswith('No unit-level rent roll is present.')
    assert '\n\n---\n' in out
    assert out.endswith(_GUARD_FALLBACK_QUESTION)


def test_empty_reply_degrades_to_the_question_alone():
    out, count = _compose_guarded_reply('', sourced=set(), escalate=False)
    assert out == _GUARD_FALLBACK_QUESTION
    assert count == 0


# ── Consecutive fires: never the same sentence twice ────────────────────────

def test_detects_a_prior_guard_blocked_reply_from_its_text():
    history = [
        {'role': 'user', 'content': 'extract the rent roll from the OM'},
        {'role': 'assistant',
         'content': f'Found nothing traceable. {_REDACTION_PLACEHOLDER}'},
    ]
    assert _prior_reply_was_guard_blocked(history) is True


def test_detects_a_prior_guard_blocked_reply_from_metadata():
    history = [
        {'role': 'assistant', 'content': 'anything at all',
         'metadata': {'fabrication_guard_blocked': True}},
    ]
    assert _prior_reply_was_guard_blocked(history) is True


def test_a_clean_prior_reply_is_not_a_prior_fire():
    history = [
        {'role': 'user', 'content': 'what is the NOI?'},
        {'role': 'assistant', 'content': 'NOI is $412,000 per the cash flow.'},
    ]
    assert _prior_reply_was_guard_blocked(history) is False


def test_only_the_immediately_previous_assistant_turn_counts():
    history = [
        {'role': 'assistant', 'content': f'old block {_REDACTION_PLACEHOLDER}'},
        {'role': 'user', 'content': 'ok, try again'},
        {'role': 'assistant', 'content': 'NOI is $412,000 per the cash flow.'},
        {'role': 'user', 'content': 'and the rent roll?'},
    ]
    assert _prior_reply_was_guard_blocked(history) is False


def test_two_consecutive_fires_do_not_repeat_the_same_sentence():
    content = 'Still nothing traceable. The asking rent shows $2,100.'

    first, _ = _compose_guarded_reply(content, sourced=set(), escalate=False)
    history = [
        {'role': 'user', 'content': 'extract the rent roll from the OM'},
        {'role': 'assistant', 'content': first},
    ]
    escalate = _prior_reply_was_guard_blocked(history)
    assert escalate is True

    second, _ = _compose_guarded_reply(content, sourced=set(), escalate=escalate)
    assert second != first
    assert second.endswith(_GUARD_ESCALATION_NOTE)
    assert _GUARD_FALLBACK_QUESTION not in second
    # Both turns still carry the finding and still withhold the figure.
    for reply in (first, second):
        assert 'Still nothing traceable.' in reply
        assert '$2,100' not in reply
