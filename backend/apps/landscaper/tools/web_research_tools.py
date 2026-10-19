"""
Landscaper web research tools (chat VQ, 2026-10-16; D-2026-10-16-WEB-RESEARCH).

web_search        — Brave Search API; titles, links, snippets, dates.
read_web_page     — reads one public page or PDF and returns its text.
save_web_document — downloads a whole file (e.g. a 300 MB county packet that
                    is too big to read in a turn), copies it into the app's
                    file store and files it in the chat's/project's documents,
                    i.e. the user's own knowledge, where it is read in the
                    background (chat VQ, 2026-10-17/18).

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


# ── links this chat has actually been shown (VQ, 2026-10-19) ───────────────
# Four misses in one afternoon came from the same habit: the model rebuilds a
# file address from a document's title ("Staff Report - Sierra Reflections
# Appeal.pdf") instead of copying the real one it was given ("Staff Report
# FINAL - ..."), gets a 404, and reports the document as unavailable. Prompts
# did not stop it. So the tool itself remembers every link a page read or a
# search returned in this chat, and when the model asks for an address it was
# never shown, it is given the closest real one instead.

import time as _time
from difflib import SequenceMatcher
from urllib.parse import unquote, urlsplit

_SEEN: Dict[str, Dict[str, Any]] = {}
_SEEN_LOCK = threading.Lock()
_SEEN_TTL = 6 * 3600
_SEEN_MAX = 800


def _seen_key(project_id=None, **kwargs) -> str:
    return str(kwargs.get('thread_id') or (f"p{project_id}" if project_id else "anon"))


def _remember_links(key: str, items) -> None:
    now = _time.time()
    with _SEEN_LOCK:
        for k in [k for k, v in _SEEN.items() if now - v['t'] > _SEEN_TTL]:
            _SEEN.pop(k, None)
        bucket = _SEEN.setdefault(key, {'t': now, 'urls': {}})
        bucket['t'] = now
        for it in items or []:
            u = isinstance(it, dict) and it.get('url')
            if u:
                bucket['urls'][u] = it.get('text') or it.get('title') or ''
        if len(bucket['urls']) > _SEEN_MAX:
            for u in list(bucket['urls'])[:len(bucket['urls']) - _SEEN_MAX]:
                bucket['urls'].pop(u, None)


def _norm(u: str):
    parts = urlsplit(u)
    path = unquote(parts.path).lower()
    folder, _, name = path.rpartition('/')
    return parts.netloc.lower().removeprefix('www.'), folder, name


def closest_known_link(url: str, known: Dict[str, str], min_ratio: float = 0.85) -> Optional[str]:
    """The real link this chat was shown that `url` was most likely meant to be.

    Same site and same folder only; compared on the file name. None when the
    address was itself shown, or nothing is close enough."""
    if not url or url in known:
        return None
    host, folder, name = _norm(url)
    if not name:
        return None
    scored = []
    for u in known:
        h, f, n = _norm(u)
        if h != host or f != folder or not n:
            continue
        scored.append((SequenceMatcher(None, name, n).ratio(), u))
    if not scored:
        return None
    scored.sort(reverse=True)
    best_r, best = scored[0]
    # Two near-equal candidates means the guess could be either document;
    # reading the wrong one is worse than a 404, so take neither.
    if len(scored) > 1 and best_r - scored[1][0] < 0.08:
        return None
    return best if best_r >= min_ratio else None


def _known_links(key: str) -> Dict[str, str]:
    with _SEEN_LOCK:
        b = _SEEN.get(key)
        return dict(b['urls']) if b else {}


# ── open the listed documents, don't leave it to the model (VQ, 2026-10-19) ─
# Fifth miss: the model read the county case page, whose links included the
# Board's staff report, opened only the slide deck, and asked whether to keep
# looking. Choosing what to open off a listing page is now done here: the one
# or two documents that best match the reading's focus are opened and returned
# with the page.

import re as _re

_FILE_LINK = _re.compile(r"(?i)\.(pdf|docx?|xlsx?|pptx?)(?:$|[?#])")
_STOP = {"the", "and", "for", "with", "from", "this", "that", "into", "what", "when",
         "which", "about", "county", "any", "all", "did", "does", "2025", "2026"}


def _focus_words(focus: Optional[str]):
    return {w for w in _re.findall(r"[a-z][a-z0-9]{2,}", (focus or "").lower()) if w not in _STOP}


def pick_documents_to_open(links, focus: Optional[str], already=(), limit: int = 2,
                           subject: Optional[str] = None):
    """The listed files that best match the focus: at least two focus words,
    and within one word of the best match. Ties keep page order.

    With a subject (the property / case), only files that mention it — in the
    title, file name or folder — are considered, and they are ranked on the
    question alone: a case page lists every case in the district, and the
    subject's own application packet otherwise outranks the document asked for."""
    words = _focus_words(focus)
    subj = _focus_words(subject)
    if not words:
        return []
    scored = []
    for i, l in enumerate(links or []):
        u = l.get('url') or ''
        if not _FILE_LINK.search(u) or u in already:
            continue
        name = unquote(urlsplit(u).path.rsplit('/', 1)[-1])
        hay = (l.get('text', '') + ' ' + name).lower()
        if subj:
            where = (l.get('text', '') + ' ' + unquote(urlsplit(u).path)).lower().replace('-', ' ')
            if not any(w in where for w in subj):
                continue
        score = sum(1 for w in words if w in hay)
        if score >= 2:
            scored.append((-score, i, l))
    if not scored:
        return []
    scored.sort()
    top = -scored[0][0]
    # Stay in the best match's folder: a case page also lists older cases'
    # files under the same name ("Staff Report", 2020).
    folder = urlsplit(scored[0][2]['url']).path.rsplit('/', 1)[0]
    return [l for neg, _i, l in scored
            if -neg >= top - 1 and urlsplit(l['url']).path.rsplit('/', 1)[0] == folder][:limit]


def _open_listed(page: Dict[str, Any], focus: Optional[str], key: str,
                 subject: Optional[str] = None) -> list:
    picks = pick_documents_to_open(page.get('links'), focus,
                                   already={page.get('url'), page.get('final_url')},
                                   subject=subject)
    opened = []
    for l in picks:
        item = {'title': l.get('text'), 'url': l['url']}
        try:
            doc = fetch_page(l['url'], max_chars=12000, focus=focus)
            item.update(text=doc['text'], truncated=doc.get('truncated'),
                        pages_note=doc.get('pages_note'))
        except WebResearchError as e:
            item.update(error=e.code, message=e.message)
        opened.append(item)
    _remember_links(key, [{'url': o['url'], 'text': o['title']} for o in opened])
    return opened


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
    _remember_links(_seen_key(project_id, **kwargs), results)
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
    key = _seen_key(project_id, **kwargs)
    asked_for = url
    corrected = closest_known_link(url, _known_links(key))
    if corrected:
        logger.info(f"[web_research] read_web_page: {url} was never shown; using {corrected}")
        url = corrected
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
                "result covers the same thing, read that one instead. If you wrote this address "
                "yourself, stop guessing file names: open the page that lists the documents (for "
                "a county case, the application or agenda page in your search results) and use "
                "the exact urls in its `links`."
            ),
        }
    _remember_links(key, page.get('links') or [])
    _remember_links(key, [{'url': page.get('final_url') or url}])
    opened_docs = []
    if page.get('content_type') == 'html' and page.get('links') and tool_input.get('focus') \
            and tool_input.get('open_documents', True):
        opened_docs = _open_listed(page, tool_input.get('focus'), key, tool_input.get('subject'))
    if opened_docs:
        page['opened_documents'] = opened_docs
    fix_note = (
        f"You asked for {asked_for}, an address this chat was never given; this was read from "
        f"{url}, the real link closest to it. Cite {url}, and copy links exactly from now on. "
        if corrected else ""
    )
    notes = []
    if page.get('pages_note'):
        notes.append(page['pages_note'])
    if page.get('truncated'):
        notes.append("Only part of the text is shown.")
    return {
        'success': True,
        **page,
        'instruction': (
            fix_note
            + ("The listed documents that best match your focus were opened for you and are in "
               "`opened_documents` (title, url, text) — read them and answer from them; those that "
               "failed carry the reason. Open any other listed document that bears on the question "
               "with read_web_page, url copied exactly. Do not ask the user whether to keep looking "
               "while relevant listed documents remain unopened. " if opened_docs else "")
            + "This is the page's actual text. Quote and cite it; state only what it says. "
            + ("The page's document links are in `links` — to open one, use its url exactly; "
               "never build a file address from a title. When the question is about a document of a "
               "kind listed there (a staff report, conditions, minutes, an attachment), open those "
               "links before answering, and never say a document is missing or not posted while it "
               "is in `links`. " if page.get('links') else "")
            + (" ".join(notes) + " If your answer depends on the part not read, save the whole "
               "file with save_web_document so it can be read in full, and say so. " if notes else "")
            + CITE_RULE
        ),
    }


# ── save_web_document ──────────────────────────────────────────────────────

_IN_FLIGHT: set = set()
_IN_FLIGHT_LOCK = threading.Lock()


def _already_saved(url: str, project_id: Optional[int], thread_id: Optional[str],
                   user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """A copy of this file already filed here — or anywhere in the user's own
    knowledge (VQ, 2026-10-19: a new chat re-downloaded a 362 MB packet the
    user had saved two days earlier from another chat)."""
    if not project_id and not thread_id and not user_id:
        return None
    from .my_knowledge_tools import OWNED_DOC_SQL
    clauses, params = [], {'url': url, 'uid': user_id or -1}
    if project_id:
        clauses.append("d.project_id = %(pid)s"); params['pid'] = project_id
    if thread_id:
        clauses.append("d.thread_id = %(tid)s::uuid"); params['tid'] = str(thread_id)
    if user_id:
        clauses.append(OWNED_DOC_SQL)
    with connection.cursor() as cur:
        cur.execute(f"""
            SELECT d.doc_id, d.doc_name, d.processing_status
            FROM landscape.core_doc d
            WHERE d.deleted_at IS NULL
              AND d.profile_json->>'source_url' = %(url)s
              AND ({' OR '.join(clauses)})
            ORDER BY d.doc_id DESC LIMIT 1
        """, params)
        row = cur.fetchone()
    return {'doc_id': row[0], 'doc_name': row[1], 'processing_status': row[2]} if row else None


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


@register_tool('save_web_document')
def save_web_document_tool(tool_input: Dict[str, Any] = None, project_id: int = None,
                           thread_id: Optional[str] = None, user_id: Optional[int] = None,
                           **kwargs) -> Dict[str, Any]:
    tool_input = tool_input or {}
    url = (tool_input.get('url') or '').strip()
    title = tool_input.get('title')
    ok, reason = check_public_url(url)
    if not ok:
        return _refusal('url_refused', reason,
                        "Nothing was saved. Tell the user why in one line.")
    if not project_id and not thread_id:
        return _refusal('no_place_to_save', "There is no chat or project to file the document in.",
                        "Nothing was saved. Tell the user that in one line.")
    # Gregg 1c (2026-10-18): the file becomes part of the user's own knowledge —
    # filed with this chat or project, searchable from all their chats and
    # projects via search_my_knowledge, never the shared platform library.
    where = ("this project's documents" if project_id else "this chat's documents") + \
        " and your own knowledge (searchable from any of your chats and projects)"
    existing = _already_saved(url, project_id, thread_id, user_id)
    if existing:
        return {'success': True, 'already_saved': True, 'url': url,
                'doc_id': existing['doc_id'], 'doc_name': existing['doc_name'],
                'processing_status': existing['processing_status'],
                'instruction': (
                    f"Already saved as \"{existing['doc_name']}\" (status: "
                    f"{existing['processing_status']}). If the status is ready, answer from it with "
                    "search_my_knowledge or get_document_content; otherwise say it is still being read.")}
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
        'instruction': (
            f"The file is downloading now and will be filed in {where}, then read. Tell the user "
            "that in one line — large county packets take several minutes — and that you can "
            "answer from the full document once it is read (they can ask again shortly). Do NOT "
            "describe what the file contains yet, and do not send them to the county site for it."
        ),
    }


# ── look_up_public_record (VQ, 2026-10-19) ─────────────────────────────────
# Six tries at one county question took six different wrong paths: searches
# with nothing opened, guessed file names, the slide deck instead of the staff
# report, a re-download of a packet the user already had. Each was patched; the
# next try found a new way. This tool runs the research recipe itself, in one
# call, so the order no longer depends on the model: the user's own documents,
# one search, the official pages it finds, and the documents those pages list
# that best match the question.

_OFFICIAL = _re.compile(r"(?i)(\.gov|\.us|\.state\.[a-z]{2}\.us|legistar\.com|granicus\.com|municode\.com)(?:/|$)")


def _official(u: str) -> bool:
    return bool(_OFFICIAL.search(urlsplit(u).netloc + "/"))


@register_tool('look_up_public_record')
def look_up_public_record_tool(tool_input: Dict[str, Any] = None, project_id: int = None,
                               user_id: Optional[int] = None,
                               prior_tool_calls: Optional[List[str]] = None,
                               **kwargs) -> Dict[str, Any]:
    tool_input = tool_input or {}
    subject = (tool_input.get('subject') or '').strip()
    question = (tool_input.get('question') or '').strip()
    place = (tool_input.get('jurisdiction') or '').strip()
    if not subject:
        return _refusal('no_subject', "No property, project or case was named.",
                        "Nothing was looked up. Ask which property or case.")
    focus = f"{subject} {question}".strip()
    out: Dict[str, Any] = {'success': True, 'subject': subject, 'question': question}

    # 1. the user's own documents
    if user_id:
        try:
            from .my_knowledge_tools import search_my_knowledge_tool
            mine = search_my_knowledge_tool(tool_input={'query': focus, 'limit': 6},
                                            project_id=project_id, user_id=user_id, **kwargs)
            out['my_documents'] = {k: mine.get(k) for k in ('passages', 'not_yet_searchable')
                                   if mine.get(k) is not None}
        except Exception as e:  # never let one source sink the others
            logger.warning(f"[look_up_public_record] own-knowledge search failed: {e}")
            out['my_documents'] = {'error': 'search_failed'}

    # 2. two searches: the subject, then the question on the official site found
    calls = list(prior_tool_calls or [])
    found = web_search_tool(tool_input={'query': f"{subject} {place}".strip(), 'count': 8},
                            project_id=project_id, prior_tool_calls=calls + ['web_search'], **kwargs)
    results = list(found.get('results') or [])
    if not found.get('success'):
        out['search_error'] = found.get('message') or found.get('error')
    site = next((urlsplit(r['url']).netloc for r in results
                 if r.get('url') and _official(r['url'])), None)
    if site and question:
        more = web_search_tool(tool_input={'query': f"{subject} {question}", 'site': site, 'count': 8},
                               project_id=project_id,
                               prior_tool_calls=calls + ['web_search', 'web_search'], **kwargs)
        seen = {r.get('url') for r in results}
        results += [r for r in (more.get('results') or []) if r.get('url') not in seen]
    out['search_results'] = [{'title': r.get('title'), 'url': r.get('url'), 'date': r.get('date')}
                             for r in results]

    # 3. the official pages that best match, each opening its best-matching documents
    words = _focus_words(focus)

    def _score(r):
        hay = ((r.get('title') or '') + ' ' + (r.get('snippet') or '') + ' '
               + unquote(urlsplit(r.get('url') or '').path)).lower()
        return sum(1 for w in words if w in hay)

    official = [r for r in results if r.get('url') and _official(r['url'])]
    pages = sorted((r for r in official if not _FILE_LINK.search(r['url'])),
                   key=_score, reverse=True)[:2]
    if not pages:
        pages = sorted((r for r in official if _FILE_LINK.search(r['url'])),
                       key=_score, reverse=True)[:1]
    reads = []
    for r in pages:
        page = read_web_page_tool(tool_input={'url': r['url'], 'focus': question or focus,
                                              'subject': subject, 'max_chars': 8000},
                                  project_id=project_id, prior_tool_calls=[], **kwargs)
        page.pop('instruction', None)
        if 'links' in page:
            page['links'] = page['links'][:20]
        reads.append(page)
    out['pages_read'] = reads

    out['instruction'] = (
        "This is the research, already done: your own documents (my_documents), one search "
        "(search_results), the official pages it found (pages_read) and, inside each page, the "
        "listed documents that best match the question (opened_documents). Answer from these. "
        "Cite each fact with its document and link, copied exactly. If the answer needs a listed "
        "document that was not opened, open it with read_web_page (url from `links`, exactly) "
        "before answering. Say a record is missing only if it is in none of the above and the "
        "pages read were the right ones; say which you checked. A document that failed with "
        "fetch_too_large: save it with save_web_document. A scanned document with no text: say "
        "it could not be read, by name. " + CITE_RULE
    )
    return out
