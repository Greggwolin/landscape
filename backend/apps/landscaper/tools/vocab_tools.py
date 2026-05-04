"""
User-vocabulary tools — per-user phrasing → canonical-value mappings.

Pattern: when Landscaper resolves an ambiguous user phrasing (e.g., "T12" /
"last year's expenses" / "Year 1 proforma") through chat dialogue, the user's
pick is saved here so the same phrasing doesn't re-prompt next time.

First domain: operating_statement_scenario. Pattern is universal — future
domains (cap_rate, growth_rate, hold_period, exit_assumption, etc.) reuse the
same table by passing a different resolution_domain string.

Schema precedent: landscape.opex_label_mapping + _lookup_learned_mapping in
backend/apps/knowledge/services/opex_utils.py.
"""

import logging
import re
from typing import Any, Dict, Optional

from django.db import connection

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


VALID_RESOLUTION_DOMAINS = frozenset({
    'operating_statement_scenario',
    'cap_rate',
    'growth_rate',
    'hold_period',
    'exit_assumption',
    'vacancy_assumption',
})

# Domain-specific allow-lists. When a resolution_domain has a known closed set
# of values, validate against it server-side so the model can't save bogus
# values that won't resolve on lookup.
#
# Production audit (chat DA, 2026-05-01) showed the `default` sentinel is
# dominant in tbl_operating_expenses (63 of 64 projects with opex data), so
# the validator accepts it. POST_RENO_PRO_FORMA also seen in production but
# wasn't in my original spec set — accepted here.
#
# Year-string discriminators ('2023', '2024', etc.) are validated by pattern
# (4-digit numeric string) below.
_OS_SCENARIO_DISCRIMINATORS = frozenset({
    'T-12', 'T12', 'T3_ANNUALIZED',
    'CURRENT_PRO_FORMA', 'BROKER_PRO_FORMA',
    'POST_RENO_PRO_FORMA',
    'default',
})


def _validate_os_scenario_value(resolved_value: str) -> Optional[str]:
    """Return error message if resolved_value isn't a valid OS scenario,
    or None if valid. Accepts the canonical discriminators (including the
    legacy `default` sentinel and POST_RENO_PRO_FORMA), OR a 4-digit year
    string (covers extraction-derived year discriminators like '2023').
    """
    if resolved_value in _OS_SCENARIO_DISCRIMINATORS:
        return None
    if resolved_value.isdigit() and len(resolved_value) == 4:
        return None
    return (
        f"resolved_value {resolved_value!r} is not a valid operating-statement "
        f"scenario discriminator. Must be one of {sorted(_OS_SCENARIO_DISCRIMINATORS)} "
        f"or a 4-digit year string. Use the EXACT `discriminator` value from "
        f"available_scenarios in the get_operating_statement response — NOT "
        f"the human-friendly label or anything else not in the discriminator list."
    )


def _resolve_user_id(kwargs: Dict[str, Any]) -> Optional[Any]:
    """Mirror of the helper in artifact_tools.py — keeps fall-through behavior consistent."""
    return kwargs.get('user_id') or kwargs.get('user_email') or None


# Stop-word list applied during normalization. Conservative: only filler
# tokens that carry no semantic content for any of the resolution domains
# we care about. Domain-meaningful terms ("operating", "statement", "rate",
# "vacancy", "growth", etc.) are intentionally NOT in this set — they
# disambiguate between domains and resolutions.
#
# Goal: collapse common phrasing variants to the same lookup key, e.g.,
#   "show me the T-12"   → "t12"
#   "T-12 please"        → "t12"
#   "the T-12"           → "t12"
#   "T-12"               → "t12"
# while preserving distinctions like
#   "T-12 operating statement" → "t12 operating statement"  (different)
#   "T-12 cap rate"            → "t12 cap rate"             (different)
_STOP_WORDS = frozenset({
    'a', 'an', 'the',
    'show', 'see', 'view', 'display', 'pull', 'fetch',
    'me', 'my', 'us', 'our',
    'i', 'you', 'we',
    'please', 'just', 'really',
    'can', 'could', 'would', 'should', 'will',
    'give', 'get', 'let', 'pull',
    'want', 'need', 'like',
    'this', 'that', 'these', 'those',
    'is', 'are', 'was', 'were', 'be',
    'do', 'did', 'does',
    'now', 'then', 'again',
    'on', 'in', 'of', 'for', 'to',
    's',  # possessive 's after lowercase + alnum-only strip ("user's" → "users", but "year's" → "years"; bare 's' tokens get dropped)
})


def _normalize_phrase(phrase: str) -> str:
    """
    Normalize a phrase for vocab lookup.

    Steps:
      1. Lowercase
      2. Replace '&' with 'and'
      3. Drop non-alphanumeric (keep spaces) — strips dashes, punctuation
      4. Tokenize on whitespace
      5. Drop tokens matching `_STOP_WORDS`
      6. Collapse whitespace

    Returns '' if the phrase is empty or normalizes to nothing after
    stop-word filtering. Callers (lookup_user_vocab, handle_save_user_vocab)
    treat the empty-string case as a legitimate skip rather than an error.

    Mirrors the pattern in opex_utils._normalize_label, with stop-word
    filtering added 2026-05-04 (PU41) for prompt-variation tolerance.
    """
    if not phrase:
        return ''
    cleaned = phrase.lower().replace('&', 'and')
    cleaned = ''.join(ch for ch in cleaned if ch.isalnum() or ch.isspace())
    tokens = [t for t in cleaned.split() if t and t not in _STOP_WORDS]
    return ' '.join(tokens)


# ─────────────────────────────────────────────────────────────────────────────
# Static synonym dictionary — platform-shared, hand-curated mapping from
# normalized phrasing to canonical resolution per resolution_domain.
#
# Layered ABOVE per-user vocab in `lookup_user_vocab`. Lookup order:
#   1. Per-user vocab (user override wins)
#   2. Static synonym dictionary (platform default for the phrasing)
#   3. Fall through to ambiguous-scenario flow (caller asks the user)
#
# Curation provenance: PU57 — locked-in list after a multi-pass curation
# starting at PU48, expanded with borderline-included entries at PU50, with
# "market pro forma" + "market rent pro forma" deliberately removed (those
# fall through to the future mixed-source composition tool — see
# SPEC-Hybrid-Operating-Statement-Composition-PU53).
#
# Keys are pre-normalized (already passed through `_normalize_phrase`) so the
# lookup is a single dict access. Values are canonical statement_discriminator
# strings from `_OS_SCENARIO_DISCRIMINATORS`.
#
# Five entries are LOOSE — phrasings that arguably could mean different
# things in different contexts. The dictionary picks the most-common
# CRE-finance interpretation as the default; per-user override wins for
# users who confirm a different mapping (per the lookup ordering above).
# Loose entries: 'historical', 'actuals', 'year' (from "last year"),
# 'inplace' / 'in place', 'stabilized'.
# ─────────────────────────────────────────────────────────────────────────────
_DOMAIN_SYNONYMS: Dict[str, Dict[str, str]] = {
    'operating_statement_scenario': {
        # ── T-12 family ──────────────────────────────────────────────
        't12': 'T-12',                                # also covers "T-12", "T 12"
        'trailing 12 months': 'T-12',
        'trailing twelve months': 'T-12',
        'trailing 12': 'T-12',
        'trailing twelve': 'T-12',
        'ttm': 'T-12',                                # capital-markets shorthand
        '12 months': 'T-12',                          # "last 12 months" → "12 months"
        'twelve months': 'T-12',                      # "last twelve months" → "twelve months"
        'l12': 'T-12',                                # lender shorthand
        'rolling 12': 'T-12',
        'rolling twelve': 'T-12',
        'trailing year': 'T-12',
        # LOOSE — platform default; per-user override wins
        'historical': 'T-12',
        'actuals': 'T-12',
        'year': 'T-12',                               # "last year" → "year"

        # ── T-3 family ───────────────────────────────────────────────
        't3': 'T3_ANNUALIZED',                        # also covers "T-3", "T 3"
        't3 annualized': 'T3_ANNUALIZED',
        'trailing 3 months': 'T3_ANNUALIZED',
        'trailing three months': 'T3_ANNUALIZED',
        'trailing 3 annualized': 'T3_ANNUALIZED',
        'quarter annualized': 'T3_ANNUALIZED',        # "last quarter annualized" → "quarter annualized"
        'trailing quarter annualized': 'T3_ANNUALIZED',
        'l3 annualized': 'T3_ANNUALIZED',

        # ── Current pro forma family ─────────────────────────────────
        'current pro forma': 'CURRENT_PRO_FORMA',
        'asking pro forma': 'CURRENT_PRO_FORMA',
        'asking rate pro forma': 'CURRENT_PRO_FORMA',
        'current scenario': 'CURRENT_PRO_FORMA',
        'todays rents': 'CURRENT_PRO_FORMA',          # "today's rents" → "todays rents"
        'atasking': 'CURRENT_PRO_FORMA',              # "at-asking" → hyphen drop
        # LOOSE — platform default; per-user override wins
        'inplace': 'CURRENT_PRO_FORMA',               # "in-place" → hyphen drop
        'in place': 'CURRENT_PRO_FORMA',
        'stabilized': 'CURRENT_PRO_FORMA',            # "stabilized post-reno" stays a separate entry below

        # ── Broker pro forma family ──────────────────────────────────
        'broker pro forma': 'BROKER_PRO_FORMA',
        'broker numbers': 'BROKER_PRO_FORMA',
        'broker case': 'BROKER_PRO_FORMA',
        'om numbers': 'BROKER_PRO_FORMA',
        'om pro forma': 'BROKER_PRO_FORMA',
        'offering memo numbers': 'BROKER_PRO_FORMA',
        'offering memo proforma': 'BROKER_PRO_FORMA',
        'sellers pro forma': 'BROKER_PRO_FORMA',      # "seller's pro forma" → "sellers pro forma"
        'seller pro forma': 'BROKER_PRO_FORMA',
        'listing pro forma': 'BROKER_PRO_FORMA',

        # ── Post-renovation pro forma family ─────────────────────────
        'post reno pro forma': 'POST_RENO_PRO_FORMA',
        'post renovation pro forma': 'POST_RENO_PRO_FORMA',
        'post reno': 'POST_RENO_PRO_FORMA',
        'post renovation': 'POST_RENO_PRO_FORMA',
        'stabilized post reno': 'POST_RENO_PRO_FORMA',  # disambiguates bare "stabilized"
        'post rehab': 'POST_RENO_PRO_FORMA',
        'post rehab pro forma': 'POST_RENO_PRO_FORMA',
        'valueadd stabilized': 'POST_RENO_PRO_FORMA', # "value-add stabilized" → hyphen drop
        'value add pro forma': 'POST_RENO_PRO_FORMA',
        'renovated stabilized': 'POST_RENO_PRO_FORMA',
        'after rehab': 'POST_RENO_PRO_FORMA',
        'after renovation': 'POST_RENO_PRO_FORMA',
    },
    # Other resolution_domains (cap_rate, growth_rate, hold_period,
    # exit_assumption, vacancy_assumption) have placeholders in
    # VALID_RESOLUTION_DOMAINS but no synonym dictionaries yet — those tools
    # haven't shipped, so synonyms are deferred until each domain has actual
    # production traffic.
}


def _lookup_synonym(resolution_domain: str, normalized: str) -> Optional[str]:
    """Return the canonical resolution for a normalized phrase via the static
    synonym dictionary, or None if no entry exists for this (domain, phrase).
    """
    domain_synonyms = _DOMAIN_SYNONYMS.get(resolution_domain)
    if not domain_synonyms:
        return None
    return domain_synonyms.get(normalized)


def lookup_user_vocab(
    user_id: Any,
    resolution_domain: str,
    phrasing: str,
) -> Optional[Dict[str, Any]]:
    """
    Resolve a phrasing to a canonical value via two-layer lookup.

    Lookup order (per the synonym-matching spec, PU43/PU57):
      1. Per-user vocab (user override wins). If the user has confirmed
         a mapping for this phrasing in the past, return it. The
         resolution_source field on the response is 'user_vocab'.
      2. Static synonym dictionary (`_DOMAIN_SYNONYMS`). If the phrasing
         is a known synonym for this resolution_domain, return the canonical
         value. The resolution_source field is 'synonym_dict'.
      3. Both miss — return None. The caller falls through to the
         ambiguous-scenario flow which asks the user to pick.

    User-vocab is checked FIRST so user-specific preferences win over the
    platform-shared dictionary. This matches the design call in PU45.

    Returns a dict with keys: resolved_value, times_used, last_confirmed_at,
    context_note, resolution_source. Returns None if no mapping exists.

    Side effect: per-user-vocab hits increment times_used and refresh
    last_confirmed_at. Synonym-dict hits do NOT mutate any state — they're
    platform-shared and have no per-user accounting.

    Internal helper — not registered as a tool. Used by get_operating_statement
    and (future) other tools that need vocabulary resolution.
    """
    if not phrasing:
        return None

    normalized = _normalize_phrase(phrasing)
    if not normalized:
        return None

    # Layer 1: per-user vocab (user override wins).
    if user_id:
        try:
            with connection.cursor() as cur:
                cur.execute(
                    """
                    SELECT resolved_value, times_used, last_confirmed_at, context_note
                    FROM landscape.tbl_user_scenario_vocab
                    WHERE user_id = %s
                      AND resolution_domain = %s
                      AND normalized_phrase = %s
                    LIMIT 1
                    """,
                    [user_id, resolution_domain, normalized],
                )
                row = cur.fetchone()
                if row:
                    # Touch on read — increment times_used + refresh last_confirmed_at.
                    cur.execute(
                        """
                        UPDATE landscape.tbl_user_scenario_vocab
                           SET times_used = times_used + 1,
                               last_confirmed_at = NOW(),
                               updated_at = NOW()
                         WHERE user_id = %s
                           AND resolution_domain = %s
                           AND normalized_phrase = %s
                        """,
                        [user_id, resolution_domain, normalized],
                    )

                    return {
                        'resolved_value': row[0],
                        'times_used': row[1],
                        'last_confirmed_at': row[2].isoformat() if row[2] else None,
                        'context_note': row[3],
                        'resolution_source': 'user_vocab',
                    }
        except Exception as exc:  # pragma: no cover — defensive
            logger.warning(
                'lookup_user_vocab user-vocab probe failed '
                '(user_id=%s domain=%s phrasing=%r): %s',
                user_id, resolution_domain, phrasing, exc,
            )
            # Fall through to synonym dict — don't fail the whole lookup
            # because the user-vocab side errored.

    # Layer 2: static synonym dictionary.
    canonical = _lookup_synonym(resolution_domain, normalized)
    if canonical:
        return {
            'resolved_value': canonical,
            'times_used': None,            # synonym hits aren't tracked per-user
            'last_confirmed_at': None,
            'context_note': None,
            'resolution_source': 'synonym_dict',
        }

    # Both layers missed.
    return None


@register_tool('save_user_vocab')
def handle_save_user_vocab(
    tool_input: Optional[Dict[str, Any]] = None,
    project_id: Optional[int] = None,
    user_id: Any = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Save (upsert) a user's phrasing → canonical-value mapping.

    Use this AFTER the user confirms a resolution to an ambiguous phrasing in
    chat. Call once per confirmed mapping. The same phrasing won't re-prompt
    that user next time — the mapping resolves silently.

    The first domain in production use is 'operating_statement_scenario'
    (resolved_value is a statement_discriminator string like 'CURRENT_PRO_FORMA'
    or 'T-12'). Pattern is universal: future domains pass a different
    resolution_domain.

    Args (in tool_input):
        phrasing (str, required):
            The user's original wording verbatim, e.g., "the T-12",
            "last year's operating statement", "Year 1 proforma".
        resolution_domain (str, required):
            One of the VALID_RESOLUTION_DOMAINS values.
        resolved_value (str, required):
            The canonical value the phrase maps to. For
            operating_statement_scenario this is a statement_discriminator
            string.
        context_note (str, optional):
            Free-text note captured at confirmation time. Useful for
            "user picked this when project had no true T-12 on file".
    """
    tool_input = tool_input or kwargs.get('tool_input') or {}
    user_id = user_id or _resolve_user_id(kwargs)

    phrasing = tool_input.get('phrasing')
    resolution_domain = tool_input.get('resolution_domain')
    resolved_value = tool_input.get('resolved_value')
    context_note = tool_input.get('context_note')

    if not user_id:
        return {'success': False, 'error': 'user_id is required (not resolvable from request context)'}
    if not phrasing or not isinstance(phrasing, str):
        return {'success': False, 'error': 'phrasing is required (string)'}
    if not resolution_domain or resolution_domain not in VALID_RESOLUTION_DOMAINS:
        return {
            'success': False,
            'error': (
                f'resolution_domain must be one of {sorted(VALID_RESOLUTION_DOMAINS)}; '
                f'got {resolution_domain!r}'
            ),
        }
    if not resolved_value or not isinstance(resolved_value, str):
        return {'success': False, 'error': 'resolved_value is required (string)'}

    # Domain-specific value validation. Catches sentinels like 'default' that
    # the model might emit despite system-prompt guidance.
    if resolution_domain == 'operating_statement_scenario':
        err = _validate_os_scenario_value(resolved_value)
        if err:
            return {'success': False, 'error': err}

    normalized = _normalize_phrase(phrasing)
    if not normalized:
        return {'success': False, 'error': f'phrasing normalized to empty string: {phrasing!r}'}

    try:
        with connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO landscape.tbl_user_scenario_vocab (
                    user_id, resolution_domain, source_phrase, normalized_phrase,
                    resolved_value, times_used, last_confirmed_at, context_note,
                    created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, 1, NOW(), %s,
                    NOW(), NOW()
                )
                ON CONFLICT (user_id, resolution_domain, normalized_phrase)
                DO UPDATE SET
                    source_phrase = EXCLUDED.source_phrase,
                    resolved_value = EXCLUDED.resolved_value,
                    context_note = COALESCE(EXCLUDED.context_note, landscape.tbl_user_scenario_vocab.context_note),
                    times_used = landscape.tbl_user_scenario_vocab.times_used + 1,
                    last_confirmed_at = NOW(),
                    updated_at = NOW()
                RETURNING vocab_id, times_used
                """,
                [
                    user_id, resolution_domain, phrasing, normalized,
                    resolved_value, context_note,
                ],
            )
            row = cur.fetchone()
            vocab_id = row[0] if row else None
            times_used = row[1] if row else None

        return {
            'success': True,
            'vocab_id': vocab_id,
            'resolution_domain': resolution_domain,
            'phrasing': phrasing,
            'normalized_phrase': normalized,
            'resolved_value': resolved_value,
            'times_used': times_used,
            'message': (
                f"Saved: '{phrasing}' → {resolved_value} "
                f"(domain: {resolution_domain}, used {times_used}× by this user)"
            ),
        }
    except Exception as exc:
        logger.exception(
            'save_user_vocab failed (user_id=%s domain=%s phrasing=%r)',
            user_id, resolution_domain, phrasing,
        )
        return {'success': False, 'error': f'database write failed: {exc}'}
