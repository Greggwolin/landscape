"""
RF106 regression: get_deal_summary now carries budget / absorption / returns,
so a compound "briefing" reply (budget + absorption + returns in one ask) is
tool-sourced and passes the fabrication guard — while a fabricated figure mixed
into the same reply is still blocked (the guard is NOT weakened by the fix).

These are deterministic unit tests at the guard boundary — no DB, no live model.
The tool output shape mirrors handle_get_deal_summary's enriched response
(verified live against project 9 / Peoria Meadows: budget $40,244,250, absorption
80 units from tbl_absorption_schedule, unlevered project IRR 51.2% / EM 2.93x).
"""

from apps.landscaper.ai_handler import reply_states_unsourced_financials as guard


# A representative enriched get_deal_summary tool execution (RF106 shape).
DEAL_SUMMARY_EXECUTION = {
    'tool': 'get_deal_summary',
    'success': True,
    'result': {
        'success': True,
        'budget': {'total_budget': 40244250.0, 'line_item_count': 30},
        'absorption': {
            'scenario_name': 'Base Case', 'total_units': 80,
            'units_per_period': 8.0, 'est_gross_sales': 6800000.0,
        },
        'returns': {
            'unlevered_project_irr': 0.512374,
            'equity_multiple': 2.932,
            'npv': 78950307.13,
            'basis': 'unlevered (project-level, before financing)',
        },
    },
}

BRIEFING_TOOL_CALLS = [{'tool': 'get_deal_summary'}]


def test_briefing_figures_are_sourced_by_enriched_deal_summary():
    """The exact RF105 failure case: a budget+absorption+returns briefing whose
    figures all trace to the enriched get_deal_summary output must NOT be blocked."""
    content = (
        "Here's where the deal stands: the development budget totals $40,244,250, "
        "absorption runs at 8 units per period across 80 units, and the unlevered "
        "project-level IRR is 51.2% with a 2.93x equity multiple."
    )
    assert guard(content, BRIEFING_TOOL_CALLS,
                 tool_outputs=[DEAL_SUMMARY_EXECUTION]) is False


def test_returns_only_statement_is_sourced():
    content = "Unlevered IRR is about 51% on a 2.93x multiple; NPV ~$78.95M."
    assert guard(content, BRIEFING_TOOL_CALLS,
                 tool_outputs=[DEAL_SUMMARY_EXECUTION]) is False


def test_guard_still_blocks_a_fabricated_figure_in_the_briefing():
    """Guard-not-weakened proof: a briefing that quotes the real sourced figures
    but also invents an annual NOI that the tool never returned is still blocked
    (all-or-nothing figure provenance survives the enrichment)."""
    content = (
        "The development budget totals $40,244,250 and the unlevered IRR is 51.2%, "
        "and the property throws off $5.2M in annual NOI."  # $5.2M is fabricated
    )
    assert guard(content, BRIEFING_TOOL_CALLS,
                 tool_outputs=[DEAL_SUMMARY_EXECUTION]) is True
