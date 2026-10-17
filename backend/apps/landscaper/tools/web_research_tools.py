"""
Landscaper web research tools (chat VQ, 2026-10-16; D-2026-10-16-WEB-RESEARCH).

web_search     — Brave Search API; titles, links, snippets, dates.
read_web_page  — reads one public page or PDF and returns its text.

Universal and pre-project safe. Neither writes anything. Spend is bounded
by caps (settings.WEB_RESEARCH_*): searches per turn, pages per turn, and
searches per day across the whole app (counted from the tool calls stored on
assistant messages, so it holds across server workers without a new table).

Every return carries an `instruction` the model must follow — above all on
the empty and failed paths, which is where it improvises (2026-10-16: an
unread 69-page report was "summarised" from its file name).
"""

import logging
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.db import connection

from ..services.web_research import WebResearchError, brave_search, fetch_page
from ..tool_executor import register_tool

logger = logging.getLogger(__name__)

CITE_RULE = (
    "Every fact you take from the web must carry its source in the same sentence "
    "(site name and the page's date if shown) and the link once. Say which facts came "
    "from the web and which from the project's own data or attached documents; never "
    "blend them silently."
)


def _cap(name: str, default: int) -> int:
    try:
        return int(getattr(settings, name, default))
    except (TypeError, ValueError):
        return default


def _turn_count(prior_tool_calls: Optional[List[str]], tool: str) -> int:
    """How many times `tool` has run this turn, including the current call
    (execute_tool appends the current call before executing)."""
    return sum(1 for t in (prior_tool_calls or []) if t == tool)


def searches_today() -> int:
    """web_search calls stored on assistant messages since midnight Phoenix."""
    try:
        with connection.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*)
                FROM landscape.landscaper_thread_message m,
                     jsonb_array_elements(COALESCE(m.metadata->'tool_calls', '[]'::jsonb)) tc
                WHERE m.role = 'assistant'
                  AND m.created_at >= (date_trunc('day', now() AT TIME ZONE 'America/Phoenix')
                                       AT TIME ZONE 'America/Phoenix')
                  AND tc->>'tool' = 'web_search'
            """)
            return int(cur.fetchone()[0] or 0)
    except Exception as e:  # counting must never break a turn
        logger.warning("web_search daily count failed: %s", e)
        return 0


def _refusal(code: str, message: str, instruction: str) -> Dict[str, Any]:
    return {'success': False, 'error': code, 'message': message, 'instruction': instruction}


@register_tool('web_search')
def web_search_tool(tool_input: Dict[str, Any] = None, project_id: int = None,
                    prior_tool_calls: Optional[List[str]] = None, **kwargs) -> Dict[str, Any]:
    tool_input = tool_input or {}
    per_turn = _cap('WEB_RESEARCH_TURN_SEARCH_CAP', 5)
    per_day = _cap('WEB_RESEARCH_DAILY_SEARCH_CAP', 60)

    if _turn_count(prior_tool_calls, 'web_search') > per_turn:
        return _refusal('turn_search_cap',
                        f"This answer has already used its {per_turn} searches.",
                        "Do not search again in this reply. Answer from what you have found, "
                        "say plainly what is still unknown, and offer to keep researching in a follow-up.")
    used = searches_today()
    if used >= per_day:
        return _refusal('daily_search_cap',
                        f"Today's web research budget ({per_day} searches) is used up; it resets at midnight Arizona time.",
                        "Tell the user the day's research budget is spent and when it resets. "
                        "Do not describe what a search would probably have found.")
    try:
        found = brave_search(
            tool_input.get('query', ''),
            getattr(settings, 'BRAVE_SEARCH_API_KEY', '') or '',
            site=tool_input.get('site'),
            count=tool_input.get('count') or 6,
            freshness=tool_input.get('freshness'),
        )
    except WebResearchError as e:
        return _refusal(e.code, e.message,
                        "The search did not run. Tell the user exactly that, in one line, and do not "
                        "guess at what it would have returned.")

    results = found['results']
    if not results:
        return {'success': True, 'query_used': found['query_used'], 'results': [],
                'instruction': ("The search returned nothing. Say so. You may try ONE rephrased "
                                "search; do not describe what the web probably says.")}
    return {
        'success': True,
        'query_used': found['query_used'],
        'results': results,
        'searches_used_today': used + 1,
        'instruction': (
            "These are search results, not facts. A snippet only shows that a page with that "
            "title exists at that address and date. Before stating anything as fact, read the "
            "most official result with read_web_page (government and agency pages before news). "
            + CITE_RULE
        ),
    }


@register_tool('read_web_page')
def read_web_page_tool(tool_input: Dict[str, Any] = None, project_id: int = None,
                       prior_tool_calls: Optional[List[str]] = None, **kwargs) -> Dict[str, Any]:
    tool_input = tool_input or {}
    per_turn = _cap('WEB_RESEARCH_PAGE_CAP_PER_TURN', 8)
    if _turn_count(prior_tool_calls, 'read_web_page') > per_turn:
        return _refusal('turn_page_cap', f"This answer has already read {per_turn} pages.",
                        "Do not read more pages in this reply. Answer from what you have read and "
                        "offer to continue.")
    url = (tool_input.get('url') or '').strip()
    try:
        page = fetch_page(url, max_chars=tool_input.get('max_chars') or 20000,
                          focus=tool_input.get('focus'))
    except WebResearchError as e:
        return {
            'success': False, 'error': e.code, 'url': url, 'message': e.message,
            'instruction': (
                f"Nothing was read from {url}. Tell the user that ({e.message}) and do NOT "
                "describe, summarise or guess at what the page contains. If another search "
                "result covers the same thing, read that one instead."
            ),
        }
    notes = []
    if page.get('pages_note'):
        notes.append(page['pages_note'])
    if page.get('truncated'):
        notes.append("Only part of the text is shown.")
    return {
        'success': True,
        **page,
        'instruction': (
            "This is the page's actual text. Quote and cite it; state only what it says. "
            + (" ".join(notes) + " Say so if your answer depends on the part not read. " if notes else "")
            + CITE_RULE
        ),
    }
