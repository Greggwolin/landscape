"""
Rent Roll Parser Service

Extracts structured tabular data (headers + rows) from document text
for the Rent Roll Mapper in the Ingestion Workbench.

Uses Claude to parse semi-structured rent roll text into a clean
headers + rows format.
"""

import json
import logging
import os
import re
from typing import Dict, List, Any, Optional

from anthropic import Anthropic

logger = logging.getLogger(__name__)


def _get_anthropic_client() -> Anthropic:
    """Get Anthropic client with API key from .env file or environment.

    Mirrors the pattern used by extraction_service._get_anthropic_client().
    Django does not auto-load backend/.env into os.environ, so we read
    the file directly as primary source.
    """
    api_key = None

    # Primary: read directly from backend/.env
    env_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        '.env',
    )
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if line.strip().startswith('ANTHROPIC_API_KEY='):
                    api_key = line.split('=', 1)[1].strip()
                    break

    # Fallback: system env or Django settings
    if not api_key:
        from django.conf import settings
        api_key = os.getenv('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', None)

    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not found. Set it in backend/.env or environment.")

    return Anthropic(api_key=api_key)


def parse_rent_roll_table(
    doc_text: str,
    doc_name: str = 'rent_roll',
) -> Optional[Dict[str, Any]]:
    """
    Parse document text into structured table format.

    Returns:
        {
            "headers": ["Unit", "Type", "BD/BA", "SF", "Tenant", ...],
            "rows": [
                ["101", "1BR", "1/1.00", "650", "John Smith", ...],
                ...
            ]
        }
    """
    if not doc_text or not doc_text.strip():
        return None

    # Truncate very large texts to ~30K chars to stay within context
    text_for_parse = doc_text[:30000] if len(doc_text) > 30000 else doc_text

    prompt = f"""Analyze this rent roll document and extract the tabular data.

Return a JSON object with exactly two keys:
- "headers": array of column header strings as they appear in the document
- "rows": array of arrays, each inner array is one unit row with values corresponding to headers

Rules:
1. Include ALL columns from the source document, even ones you don't recognize
2. Preserve original header text exactly as written
3. Skip summary/total rows (rows with "Total", "Subtotal", "Grand Total")
4. Skip empty rows and header-echo rows
5. Values should be strings. Use "" for empty cells, not null
6. Do NOT combine or split columns — preserve the source structure exactly
7. Include EVERY unit row, even if some fields are empty

Document text:
---
{text_for_parse}
---

Return only valid JSON, no markdown fences, no explanation."""

    try:
        client = _get_anthropic_client()

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text.strip()

        # Strip markdown fences if present
        if text.startswith('```'):
            text = re.sub(r'^```(?:json)?\s*', '', text)
            text = re.sub(r'\s*```$', '', text)

        parsed = json.loads(text)

        headers = parsed.get('headers', [])
        rows = parsed.get('rows', [])

        if not headers:
            logger.warning(f"No headers parsed from {doc_name}")
            return None

        # Filter out obvious non-unit rows
        clean_rows = []
        for row in rows:
            # Skip if row is all empty
            if all(str(v).strip() == '' for v in row):
                continue
            # Pad short rows
            while len(row) < len(headers):
                row.append('')
            # Truncate long rows
            row = row[:len(headers)]
            clean_rows.append(row)

        logger.info(
            f"Parsed rent roll {doc_name}: {len(headers)} columns, "
            f"{len(clean_rows)} rows (from {len(rows)} raw)"
        )

        return {
            'headers': headers,
            'rows': clean_rows,
        }

    except json.JSONDecodeError as exc:
        logger.error(f"Failed to parse Claude response as JSON: {exc}")
        return None
    except Exception as exc:
        logger.exception(f"Rent roll parsing failed for {doc_name}: {exc}")
        raise
