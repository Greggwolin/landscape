"""
Landscaper web research tools (chat VQ, 2026-10-16; D-2026-10-16-WEB-RESEARCH).

web_search        — Brave Search API; titles, links, snippets, dates.
read_web_page     — reads one public page or PDF and returns its text.
save_web_document — downloads a whole file (e.g. a 300 MB county packet that
                    is too big to read in a turn), copies it into the app's
                    file store and files it in the chat's/project's documents
                    — or in platform knowledge — where it is read in the
                    background (chat VQ, 2026-10-17).

Universal and pre-project safe. Neither writes anything. Spend is bounded
by caps (settings.WEB_RESEARCH_*): searches per turn, pages per turn, and
searches per day across the whole app (counted from the tool calls stored on
assistant messages, so it holds across server workers without a new table).

Every return carries an `instruction` the model must follow — above all on
the empty and failed paths, which is where it improvises (2026-10-16: an
unread 69-page report was "summarised" from its file name).
"""

import logging
import os
import threading
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.db import connection

from ..services.web_research import (
    WebResearchError, brave_search, check_public_url, download_to_file, fetch_page,
    uploadthing_upload,
)
from ..tool_executor import register_tool

logger = logging.getLogger(__name__)

CITE_RULE = (
    "Every fact you take from the web must carry its source in the same sentence "
    "(site name and the page's date if shown) and the link once. Say which facts came "
    "from the web and which from the project's own data or attached documents; never "
    "blend them silently. A link may only be one that appeared, character for character, "
    "in a tool result in this conversation (a result url, final_url, or a search result) — "
    "never build, shorten or guess an address. Write each link as a bare address on its "
    "own, not inside a sentence's punctuation."
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
        if e.code == 'fetch_too_large':
            return {
                'success': False, 'error': e.code, 'url': url, 'message': e.message,
                'instruction': (
                    f"Nothing was read from {url} — it is too big to read inside one answer. "
                    "Do not stop there and do not send the user to the county site: call "
                    "save_web_document with this exact url now (no need to ask), then tell the "
                    "user it is being saved and read, and that you can answer from it in a few "
                    "minutes. Do NOT describe or guess at what the file contains."
                ),
            }
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
            + (" ".join(notes) + " If your answer depends on the part not read, save the whole "
               "file with save_web_document so it can be read in full, and say so. " if notes else "")
            + CITE_RULE
        ),
    }


# ── save_web_document ──────────────────────────────────────────────────────

_IN_FLIGHT: set = set()
_IN_FLIGHT_LOCK = threading.Lock()


def _already_saved(url: str, project_id: Optional[int], thread_id: Optional[str]) -> Optional[Dict[str, Any]]:
    if not project_id and not thread_id:
        return None
    owner = "d.project_id = %s" if project_id else "d.thread_id = %s::uuid"
    with connection.cursor() as cur:
        cur.execute(f"""
            SELECT d.doc_id, d.doc_name, d.processing_status
            FROM landscape.core_doc d
            WHERE {owner} AND d.deleted_at IS NULL
              AND d.profile_json->>'source_url' = %s
            ORDER BY d.doc_id DESC LIMIT 1
        """, [project_id or thread_id, url])
        row = cur.fetchone()
    return {'doc_id': row[0], 'doc_name': row[1], 'processing_status': row[2]} if row else None


def _platform_already_saved(url: str) -> Optional[str]:
    with connection.cursor() as cur:
        cur.execute("""
            SELECT document_key FROM landscape.tbl_platform_knowledge
            WHERE metadata->>'source_url' = %s ORDER BY id DESC LIMIT 1
        """, [url])
        row = cur.fetchone()
    return row[0] if row else None


def _store_copy(url: str) -> Dict[str, Any]:
    """Download, copy to the file store, and return the stored file's facts."""
    got = download_to_file(url)
    try:
        token = getattr(settings, 'UPLOADTHING_TOKEN', '') or os.environ.get('UPLOADTHING_TOKEN', '')
        stored = uploadthing_upload(got['path'], got['file_name'], got['content_type'], token)
    finally:
        try:
            os.unlink(got['path'])
        except OSError:
            pass
    return {**got, 'storage_uri': stored}


def _save_to_documents(url: str, title: Optional[str], project_id: Optional[int],
                       thread_id: Optional[str], user_id: Optional[int]) -> None:
    from django.db import connection as conn
    try:
        f = _store_copy(url)
        name = (title or '').strip() or f['file_name']
        if f['content_type'] == 'application/pdf' and not name.lower().endswith('.pdf'):
            name += '.pdf'
        profile = {'source_url': url, 'source_final_url': f['final_url'],
                   'saved_by': 'landscaper_web', 'saved_from': 'web'}
        import json as _json
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO landscape.core_doc (
                    project_id, thread_id, doc_name, doc_type, status, version_no,
                    storage_uri, sha256_hash, mime_type, file_size_bytes, profile_json,
                    created_by, updated_by)
                VALUES (%s, %s::uuid, %s, 'general', 'draft', 1, %s, %s, %s, %s, %s::jsonb, %s, %s)
                RETURNING doc_id
            """, [project_id, None if project_id else thread_id, name[:250], f['storage_uri'],
                  f['sha256'], f['content_type'], f['size'], _json.dumps(profile), user_id, user_id])
            doc_id = cur.fetchone()[0]
        logger.info("save_web_document: doc %s saved from %s (%s bytes)", doc_id, url, f['size'])
        from apps.knowledge.services.document_processor import start_background_processing
        start_background_processing(doc_id)
    except Exception:
        logger.exception("save_web_document failed for %s", url)
    finally:
        with _IN_FLIGHT_LOCK:
            _IN_FLIGHT.discard(url)
        conn.close()


def _save_to_platform(url: str, title: Optional[str], description: Optional[str],
                      user_id: Optional[int]) -> None:
    from django.db import connection as conn
    try:
        f = _store_copy(url)
        from apps.knowledge.views.platform_knowledge_views import ingest_platform_document_core
        from urllib.parse import urlparse
        result = ingest_platform_document_core(
            storage_uri=f['storage_uri'],
            doc_name=(title or '').strip() or f['file_name'],
            mime_type=f['content_type'],
            publisher=urlparse(f['final_url']).hostname,
            metadata={'source_url': url, 'source_final_url': f['final_url'],
                      'saved_by': 'landscaper_web'},
            description=description,
            file_hash=f['sha256'],
            file_size_bytes=f['size'],
            created_by=str(user_id) if user_id else 'landscaper',
        )
        logger.info("save_web_document (platform): %s -> %s", url, result)
    except Exception:
        logger.exception("save_web_document (platform) failed for %s", url)
    finally:
        with _IN_FLIGHT_LOCK:
            _IN_FLIGHT.discard(url)
        conn.close()


@register_tool('save_web_document')
def save_web_document_tool(tool_input: Dict[str, Any] = None, project_id: int = None,
                           thread_id: Optional[str] = None, user_id: Optional[int] = None,
                           **kwargs) -> Dict[str, Any]:
    tool_input = tool_input or {}
    url = (tool_input.get('url') or '').strip()
    destination = (tool_input.get('destination') or 'documents').strip().lower()
    title = tool_input.get('title')
    ok, reason = check_public_url(url)
    if not ok:
        return _refusal('url_refused', reason,
                        "Nothing was saved. Tell the user why in one line.")

    if destination == 'platform_knowledge':
        where = "platform knowledge (the shared reference library, available in every project)"
        existing = _platform_already_saved(url)
        if existing:
            return {'success': True, 'already_saved': True, 'url': url, 'destination': destination,
                    'instruction': ("This file is already in platform knowledge. Say so; search it "
                                    "with the platform knowledge tool to answer from it.")}
        target = lambda: _save_to_platform(url, title, tool_input.get('description'), user_id)  # noqa: E731
    else:
        if not project_id and not thread_id:
            return _refusal('no_place_to_save', "There is no chat or project to file the document in.",
                            "Nothing was saved. Tell the user that in one line.")
        where = "this project's documents" if project_id else "this chat's documents"
        existing = _already_saved(url, project_id, thread_id)
        if existing:
            return {'success': True, 'already_saved': True, 'url': url, 'destination': 'documents',
                    'doc_id': existing['doc_id'], 'doc_name': existing['doc_name'],
                    'processing_status': existing['processing_status'],
                    'instruction': (
                        f"Already saved in {where} as \"{existing['doc_name']}\" (status: "
                        f"{existing['processing_status']}). If the status is ready, read it with "
                        "get_document_content and answer from it; otherwise say it is still being read.")}
        target = lambda: _save_to_documents(url, title, project_id, thread_id, user_id)  # noqa: E731

    with _IN_FLIGHT_LOCK:
        if url in _IN_FLIGHT:
            return {'success': True, 'already_saving': True, 'url': url,
                    'instruction': "This file is already being saved. Say so; do not save it again."}
        _IN_FLIGHT.add(url)
    threading.Thread(target=target, name=f"save-web-{abs(hash(url)) % 10_000}", daemon=True).start()
    return {
        'success': True,
        'saving': True,
        'url': url,
        'destination': destination if destination == 'platform_knowledge' else 'documents',
        'instruction': (
            f"The file is downloading now and will be filed in {where}, then read. Tell the user "
            "that in one line — large county packets take several minutes — and that you can "
            "answer from the full document once it is read (they can ask again shortly). Do NOT "
            "describe what the file contains yet, and do not send them to the county site for it."
        ),
    }
