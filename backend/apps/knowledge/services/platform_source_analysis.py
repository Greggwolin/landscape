"""AI-first publisher/source analysis for platform knowledge ingestion."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

from anthropic import Anthropic
from django.conf import settings

logger = logging.getLogger(__name__)

CLAUDE_MODEL = 'claude-sonnet-4-20250514'
ANTHROPIC_TIMEOUT_SECONDS = 45


def _get_anthropic_client() -> Optional[Anthropic]:
    api_key = None

    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    env_file = os.path.join(backend_dir, '.env')

    if os.path.exists(env_file):
        try:
            with open(env_file, 'r', encoding='utf-8') as handle:
                for line in handle:
                    if line.strip().startswith('ANTHROPIC_API_KEY='):
                        api_key = line.split('=', 1)[1].strip()
                        break
        except Exception:
            logger.exception('Unable to read backend .env for ANTHROPIC_API_KEY')

    if not api_key:
        api_key = os.getenv('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', None)

    if not api_key:
        return None

    try:
        return Anthropic(api_key=api_key, timeout=ANTHROPIC_TIMEOUT_SECONDS)
    except TypeError:
        return Anthropic(api_key=api_key)


def _clean_json_text(value: str) -> str:
    cleaned = value.strip()
    cleaned = cleaned.replace('```json', '```')
    if cleaned.startswith('```') and cleaned.endswith('```'):
        cleaned = cleaned[3:-3].strip()
    return cleaned


def _parse_json_response(raw_text: str) -> Optional[Dict[str, Any]]:
    if not raw_text:
        return None

    cleaned = _clean_json_text(raw_text)
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    object_match = re.search(r'\{[\s\S]*\}', cleaned)
    if not object_match:
        return None

    try:
        parsed = json.loads(object_match.group(0))
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        return None

    return None


def _clamp_confidence(value: Any) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, numeric))


def _normalize_list_strings(values: Any) -> List[str]:
    if not isinstance(values, list):
        return []

    seen = set()
    result: List[str] = []
    for value in values:
        if not isinstance(value, str):
            continue
        cleaned = re.sub(r'\s+', ' ', value).strip()
        if not cleaned:
            continue
        lower = cleaned.lower()
        if lower in seen:
            continue
        seen.add(lower)
        result.append(cleaned)
    return result


def _build_fallback(doc_name: str, text: str) -> Dict[str, Any]:
    haystack = f"{doc_name}\n{text[:8000]}"

    prepared_by_match = re.search(
        r'(?:prepared by|published by|produced by|author(?:ed)? by)\s*[:\-]\s*([^\n\r]{2,120})',
        haystack,
        flags=re.IGNORECASE,
    )

    if prepared_by_match:
        candidate = prepared_by_match.group(1).strip(' .,:;')
        return {
            'suggested_source': {
                'name': candidate,
                'confidence': 0.72,
                'evidence': 'Found explicit publisher/author phrase in extracted text.',
            },
            'referenced_sources': [],
        }

    return {
        'suggested_source': None,
        'referenced_sources': [],
    }


def analyze_publisher_and_references(doc_name: str, text: str) -> Dict[str, Any]:
    """
    Identify document publisher vs referenced organizations.

    Returns:
        {
          "suggested_source": {"name": str, "confidence": float, "evidence": str} | None,
          "referenced_sources": [str, ...]
        }
    """
    text = text or ''
    excerpt = text[:18000]

    fallback = _build_fallback(doc_name, text)
    client = _get_anthropic_client()
    if client is None:
        return fallback

    prompt = f"""
You are classifying document provenance for real-estate platform knowledge ingestion.

Task:
1) Identify the PUBLISHER/AUTHOR organization that created and distributed this document.
2) Identify REFERENCED SOURCES mentioned/cited in the content.

Critical distinction:
- Publisher/Author = org responsible for the document itself.
- Referenced sources = orgs cited for data/methodology/content; do NOT treat as publisher.

Publisher evidence to prioritize:
- Cover-page branding/logo text
- "Prepared by" / "Published by" / copyright notices
- Footer/header branding repeated through pages
- Contact email domains
- Brokerage license references

If uncertain, return lower confidence and concise evidence.

Return STRICT JSON only with this schema:
{{
  "suggested_source": {{
    "name": "string",
    "confidence": 0.0,
    "evidence": "string"
  }} OR null,
  "referenced_sources": ["string", ...]
}}

Document filename:
{doc_name}

Document text excerpt:
{excerpt}
""".strip()

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=900,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )

        text_blocks = [
            block.text for block in response.content
            if getattr(block, 'type', None) == 'text' and getattr(block, 'text', None)
        ]
        raw_text = '\n'.join(text_blocks).strip()
        parsed = _parse_json_response(raw_text)
        if not parsed:
            return fallback

        suggested = parsed.get('suggested_source')
        referenced_sources = _normalize_list_strings(parsed.get('referenced_sources'))

        normalized_suggested = None
        if isinstance(suggested, dict):
            name = re.sub(r'\s+', ' ', str(suggested.get('name') or '')).strip()
            evidence = re.sub(r'\s+', ' ', str(suggested.get('evidence') or '')).strip()
            confidence = _clamp_confidence(suggested.get('confidence'))
            if name:
                normalized_suggested = {
                    'name': name,
                    'confidence': confidence,
                    'evidence': evidence,
                }

        return {
            'suggested_source': normalized_suggested,
            'referenced_sources': referenced_sources,
        }
    except Exception:
        logger.exception('Publisher/source analysis failed; falling back')
        return fallback
