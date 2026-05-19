"""
Registered-report bypass guard.

Why this exists
---------------
The 22 registered reports (rent roll, unit mix, cash flow, debt summary,
parcel table, etc.) have server-side generators that build the full
artifact schema from SQL — no row cap, no max_tokens risk. The model is
supposed to call `render_report_as_artifact({report_code: 'RPT_XX'})` for
these. BASE_INSTRUCTIONS says so. The `create_artifact` and
`render_report_as_artifact` tool descriptions say so.

The model still routinely picks `create_artifact` instead and either
truncates mid-table (4096-token assistant cap) or silently renders the
first N rows. Three layers of prompt enforcement haven't held the line.

This guard is the programmatic enforcement layer. It runs after the
existing operating-statement guard (so op-statement / T-12 / P&L titles
are handled by that guard's richer subtype-shape logic). On a registered-
report title match it rejects with a structured envelope carrying a
`suggested_tool_call` field — the model's retry-on-error path in
BASE_INSTRUCTIONS picks that up and re-fires through the bridge.

Excluded keywords
-----------------
Anything the operating-statement guard already handles
(operating statement / T-12 / P&L / proforma / NOI / income statement)
is omitted from the keyword list here. Order-based short-circuit in
services.py ensures the op-statement guard runs first.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple

from .schema_validation import SchemaValidationError

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Title keyword → report_code mapping
# ──────────────────────────────────────────────────────────────────────────────
#
# Order matters: longer/more-specific substrings come first so e.g.
# "cash flow monthly" matches RPT_17 before falling through to "cash flow"
# → RPT_12. Substring match is case-insensitive.
#
# Excludes operating-statement keywords (t-12, p&l, proforma, noi, etc.) —
# those are handled by operating_statement_guard.py which runs first.

_TITLE_KEYWORD_TO_REPORT: List[Tuple[str, str]] = [
    # Cash-flow family — longest first so qualifiers win over the bare phrase
    ('cash flow monthly', 'RPT_17'),
    ('cash flow annual', 'RPT_18'),
    ('cash flow by phase', 'RPT_19'),
    ('leveraged cash flow', 'RPT_12'),
    ('cash flow', 'RPT_12'),  # default to leveraged
    # DCF / returns
    ('dcf returns', 'RPT_13'),
    ('unleveraged returns', 'RPT_13'),
    # Sources & uses
    ('sources & uses', 'RPT_01'),
    ('sources and uses', 'RPT_01'),
    # Debt
    ('debt summary', 'RPT_02'),
    ('debt schedule', 'RPT_02'),
    # Loan budget
    ('loan budget', 'RPT_03'),
    # Equity waterfall
    ('equity waterfall', 'RPT_04'),
    ('waterfall', 'RPT_04'),
    # Assumptions / project summary
    ('assumptions summary', 'RPT_05'),
    ('project summary', 'RPT_06'),
    # Rent roll
    ('rent roll', 'RPT_07'),
    # Unit mix
    ('unit mix', 'RPT_08'),
    # Direct cap
    ('direct cap', 'RPT_10'),
    # Sales comparison
    ('sales comparison', 'RPT_11'),
    ('sales comps', 'RPT_11'),
    # Land-dev specific
    ('parcel table', 'RPT_14'),
    ('budget cost summary', 'RPT_15'),
    ('sales schedule', 'RPT_16'),
    # Budget vs actual / variance
    ('budget vs actual', 'RPT_20'),
    ('variance report', 'RPT_20'),
]


# ──────────────────────────────────────────────────────────────────────────────
# Error type
# ──────────────────────────────────────────────────────────────────────────────


class RegisteredReportGuardError(SchemaValidationError):
    """Raised when create_artifact is called for a title that maps to a
    registered report. Carries the suggested bridge-tool call so the
    model's retry-on-error path can re-fire with the right tool/input.
    """

    def __init__(
        self,
        *,
        matched_substring: str,
        matched_report_code: str,
        title: str,
    ) -> None:
        message = (
            f"Title {title!r} matches registered report "
            f"{matched_report_code} (keyword: {matched_substring!r}). "
            f"Use render_report_as_artifact instead — create_artifact "
            f"truncates at the 4096-token assistant cap."
        )
        super().__init__(message)
        self.matched_substring = matched_substring
        self.matched_report_code = matched_report_code
        self.title = title

    def to_envelope_extras(self) -> Dict[str, Any]:
        # Envelope is shaped so the FIRST fields the model reads are the
        # action verb and the exact next tool call. The previous shape led
        # with `error: ...` which pattern-matched to schema-error retry
        # behavior (fix the schema and retry create_artifact). That is
        # exactly the wrong action here — the right action is to switch
        # tools entirely.
        return {
            'action': 'rerun_with_different_tool',
            'next_tool_call': {
                'tool': 'render_report_as_artifact',
                'input': {'report_code': self.matched_report_code},
            },
            'instruction': (
                f"Make exactly this tool call: "
                f"render_report_as_artifact(report_code='{self.matched_report_code}'). "
                f"Do NOT retry create_artifact. Do NOT rename the artifact to "
                f"evade this guard. Do NOT reply in prose claiming the artifact "
                f"is rendered — no artifact was created. The "
                f"`render_report_as_artifact` call is the only valid next move."
            ),
            'guard_code': 'registered_report_must_use_bridge',
            'matched_report_code': self.matched_report_code,
        }


# ──────────────────────────────────────────────────────────────────────────────
# Detection + validation
# ──────────────────────────────────────────────────────────────────────────────


def _match_registered_report(title: str) -> Tuple[str, str] | None:
    """Return (matched_substring, report_code) on first match, else None."""
    t = title.lower()
    for substring, report_code in _TITLE_KEYWORD_TO_REPORT:
        if substring in t:
            return substring, report_code
    return None


def is_registered_report_artifact(title: Any, schema: Any) -> bool:
    """Return True if this artifact's title matches a registered report
    that should go through render_report_as_artifact.
    """
    if not isinstance(title, str):
        return False
    return _match_registered_report(title) is not None


def validate_registered_report_artifact(
    *,
    title: str,
    schema: Any,
    project_id: int | None,
) -> None:
    """Raises RegisteredReportGuardError if the title maps to a registered
    report. Caller (services.py) returns a structured envelope from the
    exception's to_envelope_extras() so the model can retry through the
    bridge tool.
    """
    match = _match_registered_report(title)
    if match is None:
        return
    matched_substring, matched_report_code = match
    raise RegisteredReportGuardError(
        matched_substring=matched_substring,
        matched_report_code=matched_report_code,
        title=title,
    )
