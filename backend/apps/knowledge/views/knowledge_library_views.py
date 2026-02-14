"""
Knowledge Library Views

Provides REST endpoints for the Knowledge Library panel:
- Faceted filter counts
- Document search with progressive fallback
- Batch download (ZIP with real files, PK text fallbacks, skipped manifest)
- Upload with auto-classification (doc type, geo tags, property type)
"""

import hashlib
import io
import json
import logging
import zipfile

import requests
from django.db import connection
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.knowledge.services.knowledge_library_service import (
    get_faceted_counts,
    search_documents,
)
from apps.knowledge.services.auto_classifier import auto_classify_document

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def knowledge_library_facets(request):
    """
    GET /api/knowledge-library/facets/

    Returns faceted filter counts with cascading AND/OR logic.
    Query params: source, geo[], property_type[], fmt[], doc_type[], project_id[]
    Note: 'fmt' (not 'format') avoids collision with DRF's ?format= content negotiation param.
    """
    source = request.query_params.get('source', 'all')
    geo = request.query_params.getlist('geo')
    property_type = request.query_params.getlist('property_type')
    format_filter = request.query_params.getlist('fmt')
    doc_type = request.query_params.getlist('doc_type')
    project_id = request.query_params.getlist('project_id')

    result = get_faceted_counts(
        source=source,
        geo=geo,
        property_type=property_type,
        format_filter=format_filter,
        doc_type=doc_type,
        project_id=project_id,
    )

    return Response(result)


@api_view(['POST'])
@permission_classes([AllowAny])
def knowledge_library_search(request):
    """
    POST /api/knowledge-library/search/

    Search documents with progressive fallback logic.
    Body: { query, filters: { source, geo[], property_type[], format[], doc_type[], project_id[] }, fallback_level }
    """
    body = request.data
    query = body.get('query', '')
    filters = body.get('filters', {})
    fallback_level = body.get('fallback_level', 0)
    limit = min(int(body.get('limit', 20)), 100)  # Cap at 100

    result = search_documents(
        query=query,
        filters=filters,
        fallback_level=fallback_level,
        limit=limit,
    )

    return Response(result)


# =====================================================
# Batch Download
# =====================================================

def _is_downloadable_url(uri: str) -> bool:
    """Check if a storage_uri is a real, downloadable HTTP URL."""
    if not uri:
        return False
    return (
        uri.startswith('http')
        and 'placeholder.local' not in uri
        and uri != 'pending'
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def knowledge_library_batch_download(request):
    """
    POST /api/knowledge-library/batch-download/

    Download multiple documents as a ZIP file.
    Body: { doc_ids: [1, 2, 3, -5, -7] }

    Positive IDs → core_doc documents
    Negative IDs → platform knowledge documents (id = abs(doc_id))

    For core_doc:
      - Real URL (utfs.io etc.) → download file bytes into ZIP
      - Placeholder/local URL → skip, add to _skipped.txt manifest

    For platform knowledge:
      - Real URL → download file bytes into ZIP
      - No file URL → assemble chunk content as .txt fallback
    """
    doc_ids = request.data.get('doc_ids', [])

    if not doc_ids:
        return Response(
            {'error': 'No document IDs provided'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Split IDs into core_doc (positive) and platform_knowledge (negative)
    core_ids = [int(d) for d in doc_ids if int(d) > 0]
    pk_ids = [abs(int(d)) for d in doc_ids if int(d) < 0]

    try:
        included_count = 0
        skipped: list[dict] = []

        buffer = io.BytesIO()
        used_names: set[str] = set()

        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:

            # ── Core documents ──
            if core_ids:
                with connection.cursor() as cursor:
                    placeholders = ', '.join(['%s'] * len(core_ids))
                    cursor.execute(f"""
                        SELECT doc_id, doc_name, storage_uri, mime_type
                        FROM landscape.core_doc
                        WHERE doc_id IN ({placeholders}) AND deleted_at IS NULL
                    """, core_ids)
                    core_docs = cursor.fetchall()

                for doc_id, doc_name, storage_uri, mime_type in core_docs:
                    safe_name = _unique_filename(doc_name or f'document_{doc_id}', used_names)

                    if _is_downloadable_url(storage_uri or ''):
                        file_bytes = _download_file(storage_uri)
                        if file_bytes:
                            zf.writestr(safe_name, file_bytes)
                            included_count += 1
                        else:
                            skipped.append({
                                'name': doc_name or f'document_{doc_id}',
                                'reason': f'Download failed from {storage_uri}',
                            })
                    else:
                        skipped.append({
                            'name': doc_name or f'document_{doc_id}',
                            'reason': 'No downloadable file URL (placeholder or local path)',
                        })

            # ── Platform Knowledge documents ──
            if pk_ids:
                with connection.cursor() as cursor:
                    placeholders = ', '.join(['%s'] * len(pk_ids))
                    cursor.execute(f"""
                        SELECT id, title, file_path
                        FROM landscape.tbl_platform_knowledge
                        WHERE id IN ({placeholders}) AND is_active = true
                    """, pk_ids)
                    pk_docs = cursor.fetchall()

                for pk_id, title, file_path in pk_docs:
                    safe_title = _sanitize_filename(title or f'platform_{pk_id}')

                    if _is_downloadable_url(file_path or ''):
                        file_bytes = _download_file(file_path)
                        if file_bytes:
                            # Determine extension from file_path
                            ext = ''
                            if '.' in file_path.split('/')[-1]:
                                ext = '.' + file_path.split('.')[-1]
                            name = _unique_filename(f'{safe_title}{ext}' if ext else safe_title, used_names)
                            zf.writestr(name, file_bytes)
                            included_count += 1
                        else:
                            # Fall back to text content
                            text_content = _get_pk_text_content(pk_id, title)
                            if text_content:
                                name = _unique_filename(f'{safe_title}.txt', used_names)
                                zf.writestr(name, text_content)
                                included_count += 1
                            else:
                                skipped.append({'name': title, 'reason': 'Download failed and no text content available'})
                    else:
                        # No downloadable URL — use text content from chunks
                        text_content = _get_pk_text_content(pk_id, title)
                        if text_content:
                            name = _unique_filename(f'{safe_title}.txt', used_names)
                            zf.writestr(name, text_content)
                            included_count += 1
                        else:
                            skipped.append({'name': title, 'reason': 'No file URL and no text content'})

            # ── Skipped manifest ──
            if skipped:
                manifest_lines = [
                    "The following files could not be included in this download:",
                    "",
                ]
                for item in skipped:
                    manifest_lines.append(f"  - {item['name']}")
                    manifest_lines.append(f"    Reason: {item['reason']}")
                    manifest_lines.append("")
                manifest_lines.append(
                    "To make these files available, re-upload them through the Knowledge Library."
                )
                zf.writestr('_skipped.txt', '\n'.join(manifest_lines))

        if included_count == 0 and not skipped:
            return Response(
                {'error': 'No documents found for the given IDs'},
                status=status.HTTP_404_NOT_FOUND,
            )

        buffer.seek(0)
        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/zip',
        )
        response['Content-Disposition'] = 'attachment; filename="knowledge-library-download.zip"'

        # Include download stats in a custom header for the frontend
        total_requested = len(core_ids) + len(pk_ids)
        response['X-Download-Included'] = str(included_count)
        response['X-Download-Skipped'] = str(len(skipped))
        response['X-Download-Total'] = str(total_requested)
        # Expose custom headers to JS
        response['Access-Control-Expose-Headers'] = 'X-Download-Included, X-Download-Skipped, X-Download-Total'

        return response

    except Exception as e:
        logger.error("Batch download error: %s", e, exc_info=True)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def _download_file(url: str, timeout: int = 30) -> bytes | None:
    """Download file bytes from a URL. Returns None on failure."""
    try:
        resp = requests.get(url, timeout=timeout, stream=True)
        resp.raise_for_status()
        return resp.content
    except Exception as e:
        logger.warning("Failed to download %s: %s", url, e)
        return None


def _get_pk_text_content(pk_id: int, title: str) -> str | None:
    """Assemble platform knowledge text content from chunks."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT content
                FROM landscape.tbl_platform_knowledge_chunks
                WHERE document_id = %s
                ORDER BY chunk_index
            """, [pk_id])
            rows = cursor.fetchall()
            if not rows:
                return None

            header = f"# {title}\n\n"
            body = "\n\n".join(row[0] for row in rows if row[0])
            return header + body if body else None
    except Exception as e:
        logger.warning("Failed to get PK text for id=%s: %s", pk_id, e)
        return None


def _sanitize_filename(name: str) -> str:
    """Remove characters unsafe for ZIP filenames."""
    # Replace unsafe chars with underscore
    safe = ''.join(c if c.isalnum() or c in (' ', '-', '_', '.') else '_' for c in name)
    return safe.strip() or 'unnamed'


def _unique_filename(name: str, used: set[str]) -> str:
    """Ensure filename is unique within the ZIP."""
    if name not in used:
        used.add(name)
        return name
    base, ext = (name.rsplit('.', 1) + [''])[:2]
    if ext:
        ext = '.' + ext
    counter = 2
    while True:
        candidate = f"{base}_{counter}{ext}"
        if candidate not in used:
            used.add(candidate)
            return candidate
        counter += 1


# =====================================================
# Upload with Auto-Classification
# =====================================================

@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def knowledge_library_upload(request):
    """
    POST /api/knowledge-library/upload/

    Upload documents to the knowledge library with auto-classification.
    Multipart form: file(s) + optional project_id

    For each file:
    1. Insert core_doc record
    2. Run auto_classify_document (text extraction, doc type, geo tags, property type)
    3. Return classification results

    Response:
    {
      "uploads": [
        {
          "doc_id": 123,
          "name": "filename.pdf",
          "ai_classification": {
            "doc_type": "Offering",
            "doc_type_confidence": 0.85,
            "property_type": "MF",
            "property_type_confidence": 0.72,
            "geo_tags": [
              {"level": "state", "value": "AZ"},
              {"level": "city", "value": "Phoenix"}
            ],
            "text_extracted": true,
            "text_length": 45230
          }
        }
      ]
    }
    """
    files = request.FILES.getlist('files') or request.FILES.getlist('file')
    project_id = request.data.get('project_id')
    if project_id:
        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            project_id = None

    if not files:
        return Response(
            {'error': 'No files provided'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    results = []

    for uploaded_file in files:
        try:
            # Read file bytes for classification (and potential future storage)
            file_bytes = uploaded_file.read()
            uploaded_file.seek(0)  # Reset for any future use

            # Compute SHA-256 hash
            sha256 = hashlib.sha256(file_bytes).hexdigest()

            with connection.cursor() as cursor:
                # Insert document record with pending storage
                cursor.execute("""
                    INSERT INTO landscape.core_doc (
                        doc_name, mime_type, file_size_bytes, sha256_hash,
                        storage_uri, status, doc_type, project_id,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s,
                        'pending', 'draft', 'general', %s,
                        NOW(), NOW()
                    )
                    RETURNING doc_id
                """, [
                    uploaded_file.name,
                    uploaded_file.content_type or 'application/octet-stream',
                    len(file_bytes),
                    sha256,
                    project_id,
                ])
                doc_id = cursor.fetchone()[0]

            # Run auto-classification pipeline
            classification = auto_classify_document(
                doc_id=doc_id,
                file_bytes=file_bytes,
                filename=uploaded_file.name,
                mime_type=uploaded_file.content_type or '',
                project_id=project_id,
            )

            results.append({
                'doc_id': doc_id,
                'name': uploaded_file.name,
                'ai_classification': classification,
            })

        except Exception as e:
            logger.error("Upload error for %s: %s", uploaded_file.name, e, exc_info=True)
            results.append({
                'name': uploaded_file.name,
                'error': str(e),
            })

    return Response({'uploads': results}, status=status.HTTP_201_CREATED)
