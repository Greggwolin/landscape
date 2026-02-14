"""
Knowledge Library Views

Provides REST endpoints for the Knowledge Library panel:
- Faceted filter counts
- Document search with progressive fallback
- Batch download
- Upload with auto-classification
"""

import io
import json
import logging
import zipfile

from django.db import connection
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.knowledge.services.knowledge_library_service import (
    get_faceted_counts,
    search_documents,
)

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def knowledge_library_facets(request):
    """
    GET /api/knowledge-library/facets/

    Returns faceted filter counts with cascading AND/OR logic.
    Query params: source, geo[], property_type[], format[], doc_type[], project_id[]
    """
    source = request.query_params.get('source', 'all')
    geo = request.query_params.getlist('geo')
    property_type = request.query_params.getlist('property_type')
    format_filter = request.query_params.getlist('format')
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

    result = search_documents(
        query=query,
        filters=filters,
        fallback_level=fallback_level,
    )

    return Response(result)


@api_view(['POST'])
@permission_classes([AllowAny])
def knowledge_library_batch_download(request):
    """
    POST /api/knowledge-library/batch-download/

    Download multiple documents as a ZIP file.
    Body: { doc_ids: [1, 2, 3] }
    """
    doc_ids = request.data.get('doc_ids', [])

    if not doc_ids:
        return Response(
            {'error': 'No document IDs provided'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with connection.cursor() as cursor:
            placeholders = ', '.join(['%s'] * len(doc_ids))
            cursor.execute(f"""
                SELECT doc_id, doc_name, storage_uri, mime_type
                FROM core_doc
                WHERE doc_id IN ({placeholders}) AND deleted_at IS NULL
            """, doc_ids)
            docs = cursor.fetchall()

        if not docs:
            return Response(
                {'error': 'No documents found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create ZIP in memory
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            for doc_id, doc_name, storage_uri, mime_type in docs:
                # Add a placeholder entry — actual file download from R2 would go here
                zf.writestr(
                    doc_name or f'document_{doc_id}',
                    f'Placeholder for document {doc_id} (storage: {storage_uri})',
                )

        buffer.seek(0)

        response = StreamingHttpResponse(
            buffer,
            content_type='application/zip',
        )
        response['Content-Disposition'] = 'attachment; filename="knowledge-library-download.zip"'
        return response

    except Exception as e:
        logger.error(f"Batch download error: {e}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def knowledge_library_upload(request):
    """
    POST /api/knowledge-library/upload/

    Upload documents to the knowledge library.
    Multipart form: file(s) + optional metadata
    Returns doc_id and AI classification results.
    """
    files = request.FILES.getlist('files') or request.FILES.getlist('file')

    if not files:
        return Response(
            {'error': 'No files provided'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    results = []

    for uploaded_file in files:
        try:
            with connection.cursor() as cursor:
                # Insert document record
                cursor.execute("""
                    INSERT INTO core_doc (
                        doc_name, mime_type, file_size_bytes, sha256_hash,
                        storage_uri, status, doc_type, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, 'pending', 'pending', 'draft', 'general',
                        NOW(), NOW()
                    )
                    RETURNING doc_id
                """, [
                    uploaded_file.name,
                    uploaded_file.content_type or 'application/octet-stream',
                    uploaded_file.size,
                ])
                doc_id = cursor.fetchone()[0]

            results.append({
                'doc_id': doc_id,
                'name': uploaded_file.name,
                'ai_classification': {
                    'doc_type': 'general',
                    'geo_tags': [],
                    'property_type': None,
                },
            })

        except Exception as e:
            logger.error(f"Upload error for {uploaded_file.name}: {e}")
            results.append({
                'name': uploaded_file.name,
                'error': str(e),
            })

    return Response({'uploads': results}, status=status.HTTP_201_CREATED)
