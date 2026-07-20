"""Per-request status-event channel for the Landscaper message stream.

Stage 1 of the streaming plan (RF chat, 2026-07-19; speed diagnosis fix #2).
The message endpoint's heartbeat stream (whitespace + trailing JSON) keeps
the socket alive but shows the user nothing. This module lets deep call
sites (the tool dispatcher, later the model loop) emit human-readable
status events that the view's generator forwards to the client as NDJSON —
"Reading the operating statement…" within a second or two, instead of a
blank spinner for the whole turn.

Design: the view's worker thread registers a per-thread emitter before
running the turn and clears it after. Deep code calls ``emit_status(label)``
which silently no-ops when no emitter is registered (non-streamed contexts:
tests, management commands, agent framework). Thread-local because each
in-flight turn runs on its own worker thread.

Stage 2 (next session) adds token deltas from the model's final reply
through the same channel — the event vocabulary already reserves ``delta``.
"""

from __future__ import annotations

import logging
import threading
from typing import Callable, Optional

logger = logging.getLogger(__name__)

_local = threading.local()


def register_status_emitter(emit: Callable[[dict], None]) -> None:
    """Register the current thread's event emitter (view worker only)."""
    _local.emit = emit


def clear_status_emitter() -> None:
    _local.emit = None


def emit_status(label: str) -> None:
    """Emit a human-readable progress label for the in-flight turn.

    Safe to call from anywhere: no-ops when the current thread has no
    registered emitter, and never raises into the caller.
    """
    emit = getattr(_local, 'emit', None)
    if emit is None:
        return
    try:
        emit({'e': 'status', 'label': str(label)[:120]})
    except Exception:  # noqa: BLE001 — status must never break the turn
        logger.exception('emit_status failed')


_FRIENDLY_OVERRIDES = {
    'get_operating_statement': 'Reading the operating statement',
    'get_rent_roll': 'Reading the rent roll',
    'calculate_waterfall': 'Running the equity waterfall',
    'calculate_project_metrics': 'Running project metrics',
    'calculate_cash_flow': 'Running the cash flow',
    'calculate_mf_cashflow': 'Running the cash flow',
    'generate_location_brief': 'Building the location brief',
    'create_artifact': 'Building the card',
    'update_artifact': 'Updating the card',
    'render_report_as_artifact': 'Rendering the report',
    'get_deal_summary': 'Pulling the deal summary',
    'update_loan': 'Updating the loan',
    'open_input_modal': 'Opening the form',
    'navigate_to_screen': 'Opening the screen',
    'save_user_vocab': 'Noting your phrasing',
}


def friendly_tool_label(tool_name: str) -> str:
    """Human progress label for a tool: override table, else a readable
    fallback built from the tool name ("update_budget_item" → "Working:
    update budget item")."""
    label = _FRIENDLY_OVERRIDES.get(tool_name)
    if label:
        return f'{label}…'
    return f"Working: {tool_name.replace('_', ' ')}…"
