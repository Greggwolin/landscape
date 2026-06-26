"""
Create-time fabrication guard for financial artifacts (JB55-ARTIFACT-CREATE-GUARD-0625).

Hard-prevention companion to JB50 slice 2's reply-assembly guard: rejects a
`create_artifact` whose body states money/percent/multiple figures when NO
numbers-producing tool ran this turn — so a fabricated financial card never
persists or renders, instead of being disclaimed in the chat after the fact.

Sourcing signal (Option A) is identical to slice 2: the turn's already-run tool
names are threaded into the create path; a card is "sourced" iff one of them is a
numbers-producing tool. The detection regexes and the prefix split are reused
from `ai_handler` (lazy import, so the two guards never drift and there is no
import cycle at module load).

Scope: only freeform `create_artifact` FINANCIAL cards (money/percent/multiple
content AND a financial-claim keyword — same conservative detection JB50 uses, so
non-financial cards with a stray "%" are not blocked; location briefs/maps go
through other tools and never reach this path). When the turn's tool list is
unknown (`prior_tool_calls is None` — non-tool-loop callers like REST edits) the
guard is skipped; the reply-assembly net still covers the model path.
"""

from typing import Any, Dict, List, Optional

from .schema_validation import SchemaValidationError


class FinancialArtifactGuardError(SchemaValidationError):
    """Raised when a financial card states figures not sourced from a tool this
    turn. Mirrors OperatingStatementGuardError's structured envelope so the
    model's retry-on-error path can recompute or ask the user."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        guidance: Optional[str] = None,
        suggested_question: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.guidance = guidance
        self.suggested_question = suggested_question

    def to_envelope_extras(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {'guard_code': self.code}
        if self.guidance:
            out['guidance'] = self.guidance
        if self.suggested_question:
            out['suggested_user_question'] = self.suggested_question
        return out


def artifact_states_financials(title: str, schema: Any) -> bool:
    """True when the serialized card content has a money/percent/multiple figure
    AND a financial-claim keyword. Conservative (both conditions) so a hard block
    never fires on a legitimate non-financial card (e.g. a unit-mix table with
    percentages but no financial keyword)."""
    from apps.landscaper.ai_handler import _MONEY_OR_PCT_RE, _FIN_CLAIM_KW
    text = f"{title}\n{schema}"
    return bool(_MONEY_OR_PCT_RE.search(text)) and bool(_FIN_CLAIM_KW.search(text))


def _numbers_tool_ran(prior_tool_calls: List[str]) -> bool:
    from apps.landscaper.ai_handler import _NUMBERS_PRODUCING_PREFIXES
    return any(
        str(n).startswith(_NUMBERS_PRODUCING_PREFIXES) for n in (prior_tool_calls or [])
    )


def validate_financial_artifact_sourcing(
    *,
    title: str,
    schema: Any,
    prior_tool_calls: Optional[List[str]],
) -> None:
    """Raise FinancialArtifactGuardError when a financial card has unsourced
    figures. No-op when `prior_tool_calls is None` (unknown caller) or the card
    is non-financial or a numbers-producing tool ran this turn."""
    if prior_tool_calls is None:
        return
    if not artifact_states_financials(title, schema):
        return
    if _numbers_tool_ran(prior_tool_calls):
        return
    raise FinancialArtifactGuardError(
        'unsourced_financial_artifact',
        'financial artifact contains figures not sourced from a tool this turn',
        guidance=(
            'This card states dollar/percent figures but no numbers-producing tool '
            '(calculate_/compute_/get_budget/get_operating_statement/get_cashflow_results/…) '
            'ran this turn. Open the screen that already shows these numbers via '
            'navigate_to_screen, or call the relevant calculate_/get_ tool and rebuild the '
            'card from its real output. Do not estimate or carry figures from memory.'
        ),
        suggested_question=(
            "I don't have those figures from the project's data yet — want me to open the "
            "screen that shows them, or run the calculation? I won't estimate them."
        ),
    )
