"""
search_my_knowledge — the user's own persistent knowledge (chat VQ, 2026-10-18;
Gregg's decision 1c).

Everything a user has put into Landscape — documents attached in a staging
(pre-project) chat, county records Landscaper saved from the web, project
documents — is searchable from ANY of that user's chats and projects, and by
no one else. It reads the passages the document pipeline already stores for
each document; nothing is copied.

Ownership: the document's uploader, the chat it was attached in, or the
project it belongs to must be the user's. A call without a user is refused.
"""

import logging
from typing import Any, Dict, Optional

from django.db import connection

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)

MIN_SIMILARITY = 0.30

OWNED_DOC_SQL = """
    (d.created_by = %(uid)s
     OR EXISTS (SELECT 1 FROM landscape.landscaper_chat_thread t
                WHERE t.id = d.thread_id AND t.created_by = %(uid)s)
     OR EXISTS (SELECT 1 FROM landscape.tbl_project p
                WHERE p.project_id = d.project_id AND p.created_by_id = %(uid)s))
"""


def _where_it_lives(project_name: Optional[str], thread_title: Optional[str]) -> str:
    if project_name:
        return f"project: {project_name}"
    if thread_title:
        return f"chat: {thread_title}"
    return "chat"


@register_tool('search_my_knowledge')
def search_my_knowledge_tool(tool_input: Dict[str, Any] = None, project_id: int = None,
                             user_id: Optional[int] = None, **kwargs) -> Dict[str, Any]:
    tool_input = tool_input or {}
    query = (tool_input.get('query') or '').strip()
    limit = max(1, min(int(tool_input.get('limit') or 8), 20))
    if not user_id:
        return {'success': False, 'error': 'no_user',
                'instruction': "Your knowledge could not be searched (no signed-in user). Say so in one line."}
    if not query:
        return {'success': False, 'error': 'empty_query',
                'instruction': "Nothing was searched. Ask what to look for."}

    from apps.knowledge.services.embedding_service import generate_embedding
    vec = generate_embedding(query)
    if not vec:
        return {'success': False, 'error': 'search_unavailable',
                'instruction': "The search did not run. Say so in one line; do not guess what your documents say."}
    vec_str = '[' + ','.join(str(x) for x in vec) + ']'

    with connection.cursor() as cur:
        cur.execute(f"""
            SELECT d.doc_id, d.doc_name, ke.content_text,
                   1 - (ke.embedding <=> %(v)s::vector) AS similarity,
                   p.project_name, t.title, d.profile_json->>'source_url'
            FROM landscape.knowledge_embeddings ke
            JOIN landscape.core_doc d ON d.doc_id = ke.source_id
            LEFT JOIN landscape.tbl_project p ON p.project_id = d.project_id
            LEFT JOIN landscape.landscaper_chat_thread t ON t.id = d.thread_id
            WHERE ke.source_type = 'document_chunk'
              AND ke.embedding IS NOT NULL
              AND d.deleted_at IS NULL
              AND {OWNED_DOC_SQL}
            ORDER BY ke.embedding <=> %(v)s::vector
            LIMIT %(lim)s
        """, {'v': vec_str, 'uid': user_id, 'lim': limit})
        rows = cur.fetchall()

        cur.execute(f"""
            SELECT d.doc_id, d.doc_name, d.processing_status
            FROM landscape.core_doc d
            WHERE d.deleted_at IS NULL AND {OWNED_DOC_SQL}
              AND COALESCE(d.processing_status, 'pending') NOT IN ('ready', 'skipped')
              AND d.created_at > NOW() - INTERVAL '14 days'
            ORDER BY d.doc_id DESC LIMIT 5
        """, {'uid': user_id})
        not_ready = [{'doc_id': r[0], 'doc_name': r[1], 'status': r[2]} for r in cur.fetchall()]

    passages = [{
        'doc_id': r[0], 'doc_name': r[1], 'text': r[2], 'similarity': round(float(r[3]), 3),
        'where': _where_it_lives(r[4], r[5]), 'source_url': r[6],
    } for r in rows if float(r[3]) >= MIN_SIMILARITY]

    note = ""
    if not_ready:
        note = (" These documents of yours are not searchable yet (still being read or failed): "
                + "; ".join(f"{d['doc_name']} ({d['status']})" for d in not_ready)
                + ". Mention any that look relevant.")
    if not passages:
        return {'success': True, 'passages': [], 'not_yet_searchable': not_ready,
                'instruction': ("Nothing in your saved documents matches. Say so plainly; do not "
                                "describe what they probably contain." + note)}
    return {
        'success': True,
        'passages': passages,
        'not_yet_searchable': not_ready,
        'instruction': (
            "These passages are from the user's own documents. Quote them and name the document "
            "(and where it lives) for every fact. State only what the passages say; if they do not "
            "answer the question, say so and offer to read the full document with "
            "get_document_content." + note
        ),
    }
