"""
Doc-chat seed summary service.

Builds the bounded factual greeting that gets posted as the first
assistant message when a "Chat with this document" thread is created.

Bounded shape (v1, deterministic — no LLM call):
    [Doc Type]: [Doc Name]
    Parties: <if present>
    Last modified: <date>

    What would you like to discuss?

If a richer LLM-generated overview is needed later, swap the body of
`build_doc_seed_summary` to call Anthropic with the doc's text content;
the surrounding wiring (view → service → ThreadMessage seed) does not
change.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from django.db import connection

logger = logging.getLogger(__name__)


def _format_party_field(profile_json: Optional[Dict[str, Any]]) -> Optional[str]:
    """Pull a 'parties' or 'party' string out of the profile JSON, if any."""
    if not profile_json or not isinstance(profile_json, dict):
        return None
    raw = profile_json.get('parties') or profile_json.get('party')
    if raw is None:
        return None
    if isinstance(raw, str):
        s = raw.strip()
        return s or None
    if isinstance(raw, (list, tuple)):
        items = [str(x).strip() for x in raw if str(x).strip()]
        if not items:
            return None
        return ', '.join(items)
    return None


def _format_date(value: Any) -> Optional[str]:
    """Best-effort short date string for a TIMESTAMP."""
    if value is None:
        return None
    try:
        return value.strftime('%b %d, %Y')
    except Exception:
        try:
            return str(value).split('T', 1)[0]
        except Exception:
            return None


def build_doc_seed_summary(doc_id: int) -> Dict[str, str]:
    """
    Return a dict with:
      - title:        a short label suitable for the thread title
      - summary_text: the bounded multi-line first-assistant message

    The title falls back to "Document <id>" when the doc record cannot
    be loaded, and the summary text always ends with the canonical
    open-question line so the user never lands in a thread that doesn't
    invite a reply.
    """
    title = f'Document {doc_id}'
    body_lines: list[str] = []

    try:
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT
                    doc_id,
                    doc_name,
                    original_filename,
                    doc_type,
                    profile_json,
                    updated_at,
                    created_at
                FROM landscape.core_doc
                WHERE doc_id = %s
                  AND (deleted_at IS NULL)
                """,
                [doc_id],
            )
            row = cur.fetchone()
    except Exception as e:
        logger.warning(f"core_doc lookup failed for doc_id={doc_id}: {e}")
        row = None

    if row:
        _, doc_name, original_filename, doc_type, profile_json, updated_at, created_at = row
        display_name = (doc_name or original_filename or '').strip() or f'Document {doc_id}'
        title = display_name

        type_label = (doc_type or 'Document').strip() or 'Document'
        body_lines.append(f"{type_label}: {display_name}")

        parties = _format_party_field(profile_json)
        if parties:
            body_lines.append(f"Parties: {parties}")

        last_modified = _format_date(updated_at) or _format_date(created_at)
        if last_modified:
            body_lines.append(f"Last modified: {last_modified}")

    if not body_lines:
        # Doc record missing or hidden — keep the seed minimal but present.
        body_lines.append(f"Document {doc_id}")

    body_lines.append("")  # blank line before the prompt
    body_lines.append("What would you like to discuss?")

    return {
        'title': title,
        'summary_text': "\n".join(body_lines),
    }
