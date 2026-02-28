"""Document extraction views — Django endpoint for AI-powered field extraction.

Self-contained: calls Anthropic Claude directly with PDF/image for
project-creation field extraction. No dependency on extraction_service.py.
"""

import base64
import json
import logging
import os
import re

from django.db import connection
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
}

MAX_PDF_PAGES = 100  # Anthropic API limit

FIELD_EXTRACTION_PROMPT = """You are extracting structured data from a real estate document for project creation.

Extract the following fields if present (return null for fields not found):
- property_name: The name of the project or development as stated in the document title or page headers
- street_address: Full street address (number and street name only, not city/state/zip)
- city: City name
- state: US state (2-letter abbreviation preferred)
- zip_code: ZIP code
- county: County name
- site_area: Total site acreage (number)
- total_units: Total dwelling units or lots (number)
- building_sf: Total gross floor area or building SF (number)
- developer: Developer or owner name
- property_subtype: One of: MPC, INFILL, LOT_DEVELOPMENT, ENTITLED_LAND, LAND_BANK, MULTIFAMILY, OFFICE, RETAIL, INDUSTRIAL, MIXED_USE, HOTEL, SELF_STORAGE
- document_type: What kind of document this is (e.g., Community Master Plan, Offering Memorandum, Appraisal, Site Plan)
- zoning: Zoning designation(s)
- jurisdiction: Approving jurisdiction or municipality
- entitlement_status: Current entitlement status if mentioned
- cross_streets: Nearest cross streets or intersection

Return a JSON object where each key is the field name and the value is an object with:
- "value": The extracted value
- "confidence": "high", "medium", or "low"
- "source_quote": Brief supporting quote (max 100 chars)

Return ONLY valid JSON, no other text."""


def _get_anthropic_client():
    """Get Anthropic client, importing lazily."""
    from anthropic import Anthropic
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set")
    return Anthropic(api_key=api_key)


def _trim_pdf(raw_bytes: bytes, max_pages: int = MAX_PDF_PAGES) -> bytes:
    """Trim PDF to max_pages if it exceeds the limit. Returns original bytes if under limit."""
    try:
        from pypdf import PdfReader, PdfWriter
        import io

        reader = PdfReader(io.BytesIO(raw_bytes))
        page_count = len(reader.pages)

        if page_count <= max_pages:
            return raw_bytes

        logger.info("[EXTRACTION] Trimming PDF from %d to %d pages", page_count, max_pages)
        writer = PdfWriter()
        for i in range(max_pages):
            writer.add_page(reader.pages[i])

        buf = io.BytesIO()
        writer.write(buf)
        return buf.getvalue()
    except Exception as e:
        logger.warning("[EXTRACTION] PDF trim failed: %s — sending original", e)
        return raw_bytes


def _parse_json_response(text: str) -> dict:
    """Parse JSON from Claude's response, handling markdown fences."""
    # Strip markdown code fences
    cleaned = text.strip()
    if cleaned.startswith('```'):
        cleaned = re.sub(r'^```(?:json)?\s*\n?', '', cleaned)
        cleaned = re.sub(r'\n?```\s*$', '', cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try to find JSON object in response
    obj_match = re.search(r'\{[\s\S]*\}', text)
    if obj_match:
        try:
            return json.loads(obj_match.group())
        except json.JSONDecodeError:
            pass

    return {}


@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([AllowAny])
def extract_for_project(request):
    """
    Accept a file upload (PDF or image) via multipart form data,
    send it to Claude for AI extraction, and return structured fields.

    POST /api/dms/extract-for-project/
    Body: multipart/form-data with 'file' field
    Returns: { document_type, extracted_fields, raw_text_preview }
    """
    uploaded = request.FILES.get('file')
    if not uploaded:
        return Response({'error': 'No file provided'}, status=400)

    mime = uploaded.content_type or ''
    if mime not in ALLOWED_MIME_TYPES:
        return Response(
            {'error': f'Unsupported file type ({mime}). Upload PDF or image files.'},
            status=400,
        )

    raw_bytes = uploaded.read()
    size_mb = len(raw_bytes) / (1024 * 1024)
    logger.info("[EXTRACTION] File: %s  size=%.2fMB  type=%s", uploaded.name, size_mb, mime)

    if size_mb > 50:
        return Response(
            {'error': f'File too large ({size_mb:.1f}MB). Max 50MB.'},
            status=400,
        )

    # Trim PDF if over Anthropic page limit
    if mime == 'application/pdf':
        raw_bytes = _trim_pdf(raw_bytes)

    # Build Claude message content
    b64_data = base64.standard_b64encode(raw_bytes).decode('utf-8')

    if mime == 'application/pdf':
        doc_content = {
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": b64_data},
        }
    else:
        doc_content = {
            "type": "image",
            "source": {"type": "base64", "media_type": mime, "data": b64_data},
        }

    try:
        client = _get_anthropic_client()
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": [
                    doc_content,
                    {"type": "text", "text": FIELD_EXTRACTION_PROMPT},
                ],
            }],
        )

        response_text = response.content[0].text
        extracted = _parse_json_response(response_text)

        # Keep {value, confidence, source_quote} structure — frontend expects .value
        extracted_fields = {}
        for key, val in extracted.items():
            if isinstance(val, dict) and 'value' in val:
                extracted_fields[key] = val
            else:
                # Wrap bare values so frontend can always do field.value
                extracted_fields[key] = {'value': val, 'confidence': 'medium'}

        # Alias total_acreage → site_area (form expects site_area or site_size_acres)
        if 'total_acreage' in extracted_fields and 'site_area' not in extracted_fields:
            extracted_fields['site_area'] = extracted_fields['total_acreage']

        # Alias total_gfa → building_sf (form expects building_sf)
        if 'total_gfa' in extracted_fields and 'building_sf' not in extracted_fields:
            extracted_fields['building_sf'] = extracted_fields['total_gfa']

        # Extract document_type value for top-level field
        doc_type = 'Unknown'
        if 'document_type' in extracted_fields:
            dt = extracted_fields['document_type']
            doc_type = dt.get('value', 'Unknown') if isinstance(dt, dict) else dt

        result = {
            'document_type': doc_type,
            'extracted_fields': extracted_fields,
            'field_count': len([v for v in extracted_fields.values()
                               if isinstance(v, dict) and v.get('value') is not None]),
            'model': 'claude-sonnet-4-20250514',
        }

        logger.info(
            "[EXTRACTION] Success: %d fields extracted from %s",
            result['field_count'], uploaded.name,
        )
        return Response(result)

    except ValueError as e:
        return Response({'error': str(e)}, status=503)
    except Exception as e:
        logger.exception("[EXTRACTION] Unexpected error")
        return Response({'error': f'Extraction failed: {e}'}, status=500)


# ---------------------------------------------------------------------------
# Persistence: write extraction results to doc_extracted_facts
# ---------------------------------------------------------------------------

CONFIDENCE_MAP = {
    'high': 0.95,
    'medium': 0.75,
    'low': 0.50,
}


def persist_extraction_results(doc_id, extracted_fields, extraction_method='project_creation'):
    """
    Writes extraction results to doc_extracted_facts.
    Each field becomes one row.  Does not raise on failure — logs warning only.

    Parameters:
        doc_id: int — core_doc.doc_id for the uploaded document
        extracted_fields: dict — {field_name: {value, confidence, ...}, ...}
        extraction_method: str — label for extraction_method column
    """
    if not doc_id or not extracted_fields:
        return 0

    rows_written = 0
    try:
        with connection.cursor() as cursor:
            for field_name, field_data in extracted_fields.items():
                if not isinstance(field_data, dict):
                    field_value = str(field_data) if field_data is not None else None
                    confidence = 0.75
                else:
                    field_value = field_data.get('value')
                    if field_value is not None:
                        field_value = str(field_value)

                    # Map string confidence to numeric
                    raw_conf = field_data.get('confidence', 0.75)
                    if isinstance(raw_conf, str):
                        confidence = CONFIDENCE_MAP.get(raw_conf.lower(), 0.75)
                    else:
                        confidence = float(raw_conf) if raw_conf else 0.75

                if field_value is None:
                    continue

                cursor.execute("""
                    INSERT INTO landscape.doc_extracted_facts
                        (doc_id, source_version, field_name, field_value,
                         confidence, extraction_method)
                    VALUES (%s, 1, %s, %s, %s, %s)
                    ON CONFLICT (doc_id, source_version, field_name)
                    DO UPDATE SET
                        field_value = EXCLUDED.field_value,
                        confidence = EXCLUDED.confidence,
                        extraction_method = EXCLUDED.extraction_method
                """, [doc_id, field_name, field_value, confidence, extraction_method])
                rows_written += 1

        logger.info(
            "[EXTRACTION] Persisted %d facts for doc_id=%s (method=%s)",
            rows_written, doc_id, extraction_method,
        )
    except Exception as e:
        logger.warning(
            "[EXTRACTION] Failed to persist facts for doc_id=%s: %s",
            doc_id, e,
        )

    return rows_written


@api_view(['POST'])
@permission_classes([AllowAny])
def persist_extraction(request):
    """
    Persist extraction results for a document that already exists in core_doc.

    POST /api/dms/persist-extraction/
    Body JSON: { doc_id, extracted_fields, extraction_method? }
    """
    doc_id = request.data.get('doc_id')
    extracted_fields = request.data.get('extracted_fields')
    extraction_method = request.data.get('extraction_method', 'project_creation')

    if not doc_id or not extracted_fields:
        return Response(
            {'error': 'doc_id and extracted_fields are required'},
            status=400,
        )

    rows = persist_extraction_results(doc_id, extracted_fields, extraction_method)

    return Response({
        'success': True,
        'doc_id': doc_id,
        'rows_written': rows,
    })
