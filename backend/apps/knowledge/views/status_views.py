"""
API views for document processing status.

Provides endpoints to:
- Check individual document processing status
- Get project-wide processing summary
- Reprocess failed documents
- Queue documents for processing
"""
import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import connection


@csrf_exempt
@require_http_methods(["GET"])
def get_document_status(request, doc_id):
    """
    GET /api/knowledge/documents/{doc_id}/status/

    Get processing status for a single document.

    Returns:
        - doc_id, doc_name
        - processing_status: pending|queued|extracting|chunking|embedding|ready|failed|skipped
        - processing_started_at, processing_completed_at
        - processing_error (if failed)
        - chunks_count, embeddings_count (if processed)
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                doc_id,
                doc_name,
                doc_type,
                processing_status,
                processing_started_at,
                processing_completed_at,
                processing_error,
                chunks_count,
                embeddings_count
            FROM landscape.core_doc
            WHERE doc_id = %s
        """, [doc_id])

        row = cursor.fetchone()

    if not row:
        return JsonResponse({'success': False, 'error': 'Document not found'}, status=404)

    return JsonResponse({
        'success': True,
        'document': {
            'doc_id': row[0],
            'doc_name': row[1],
            'doc_type': row[2],
            'processing_status': row[3] or 'pending',
            'processing_started_at': row[4].isoformat() if row[4] else None,
            'processing_completed_at': row[5].isoformat() if row[5] else None,
            'processing_error': row[6],
            'chunks_count': row[7] or 0,
            'embeddings_count': row[8] or 0,
        }
    })


@csrf_exempt
@require_http_methods(["GET"])
def get_project_processing_status(request, project_id):
    """
    GET /api/knowledge/projects/{project_id}/processing-status/

    Get processing status summary for all documents in a project.

    Returns:
        - summary: total_documents, ready, processing, queued, failed, skipped
        - status_counts: breakdown by status
        - documents: recent documents with their status (limit 20)
    """
    with connection.cursor() as cursor:
        # Get status counts
        cursor.execute("""
            SELECT
                COALESCE(processing_status, 'pending') as status,
                COUNT(*) as count
            FROM landscape.core_doc
            WHERE project_id = %s
            GROUP BY COALESCE(processing_status, 'pending')
        """, [project_id])

        status_counts = {row[0]: row[1] for row in cursor.fetchall()}

        # Get recent documents with status
        cursor.execute("""
            SELECT
                doc_id,
                doc_name,
                doc_type,
                COALESCE(processing_status, 'pending') as processing_status,
                processing_error,
                chunks_count,
                embeddings_count,
                created_at
            FROM landscape.core_doc
            WHERE project_id = %s
            ORDER BY
                CASE COALESCE(processing_status, 'pending')
                    WHEN 'extracting' THEN 1
                    WHEN 'chunking' THEN 2
                    WHEN 'embedding' THEN 3
                    WHEN 'queued' THEN 4
                    WHEN 'pending' THEN 5
                    WHEN 'failed' THEN 6
                    ELSE 7
                END,
                created_at DESC
            LIMIT 20
        """, [project_id])

        columns = ['doc_id', 'doc_name', 'doc_type', 'processing_status',
                   'processing_error', 'chunks_count', 'embeddings_count', 'created_at']
        documents = []
        for row in cursor.fetchall():
            doc = dict(zip(columns, row))
            doc['created_at'] = doc['created_at'].isoformat() if doc['created_at'] else None
            documents.append(doc)

    # Calculate summary
    total = sum(status_counts.values())
    ready = status_counts.get('ready', 0)
    processing = (status_counts.get('extracting', 0) +
                  status_counts.get('chunking', 0) +
                  status_counts.get('embedding', 0))
    queued = status_counts.get('queued', 0) + status_counts.get('pending', 0)

    return JsonResponse({
        'success': True,
        'project_id': int(project_id),
        'summary': {
            'total_documents': total,
            'ready': ready,
            'processing': processing,
            'queued': queued,
            'failed': status_counts.get('failed', 0),
            'skipped': status_counts.get('skipped', 0),
        },
        'status_counts': status_counts,
        'documents': documents,
    })


@csrf_exempt
@require_http_methods(["POST"])
def queue_document(request, doc_id):
    """
    POST /api/knowledge/documents/{doc_id}/queue/

    Queue a document for processing.
    Called automatically after upload, or manually to reprocess.
    """
    from ..services.document_processor import queue_document_for_processing

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT doc_id, project_id FROM landscape.core_doc WHERE doc_id = %s
        """, [doc_id])
        row = cursor.fetchone()

    if not row:
        return JsonResponse({'success': False, 'error': 'Document not found'}, status=404)

    queue_document_for_processing(row[0], row[1])

    return JsonResponse({
        'success': True,
        'message': f'Document {doc_id} queued for processing'
    })


@csrf_exempt
@require_http_methods(["POST"])
def reprocess_document(request, doc_id):
    """
    POST /api/knowledge/documents/{doc_id}/reprocess/

    Re-queue a document for processing with high priority.
    Use this to retry failed documents or update embeddings.
    """
    from ..services.document_processor import queue_document_for_processing

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT doc_id, project_id FROM landscape.core_doc WHERE doc_id = %s
        """, [doc_id])
        row = cursor.fetchone()

    if not row:
        return JsonResponse({'success': False, 'error': 'Document not found'}, status=404)

    # High priority for manual reprocess requests
    queue_document_for_processing(row[0], row[1], priority=10)

    return JsonResponse({
        'success': True,
        'message': f'Document {doc_id} queued for reprocessing (high priority)'
    })


@csrf_exempt
@require_http_methods(["POST"])
def reprocess_project_failed(request, project_id):
    """
    POST /api/knowledge/projects/{project_id}/reprocess-failed/

    Re-queue all failed documents in a project for processing.
    """
    from ..services.document_processor import queue_document_for_processing

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT doc_id, project_id
            FROM landscape.core_doc
            WHERE project_id = %s
              AND processing_status = 'failed'
        """, [project_id])
        failed_docs = cursor.fetchall()

    if not failed_docs:
        return JsonResponse({
            'success': True,
            'message': 'No failed documents to reprocess',
            'queued_count': 0
        })

    for doc_id, proj_id in failed_docs:
        queue_document_for_processing(doc_id, proj_id, priority=5)

    return JsonResponse({
        'success': True,
        'message': f'Queued {len(failed_docs)} failed documents for reprocessing',
        'queued_count': len(failed_docs)
    })


@csrf_exempt
@require_http_methods(["GET"])
def get_queue_status(request):
    """
    GET /api/knowledge/queue/status/

    Get overall queue statistics.
    """
    from ..services.document_processor import get_queue_stats

    stats = get_queue_stats()

    return JsonResponse({
        'success': True,
        'queue': stats,
        'has_pending': stats['queued'] > 0 or stats['processing'] > 0
    })


@csrf_exempt
@require_http_methods(["GET"])
def get_project_confidence(request, project_id):
    """
    GET /api/knowledge/projects/{project_id}/confidence/

    Get data confidence scores for a project.

    Returns confidence levels (high/medium/low) and scores (0-100) for:
    - profile: Basic project information completeness
    - units: Unit/rent data completeness (multifamily)
    - parcels: Parcel/land data completeness (land development)
    - budget: Budget data completeness
    - documents: Document processing coverage
    - overall: Weighted average across all domains
    """
    from ..services.confidence_calculator import calculate_project_confidence

    try:
        results = calculate_project_confidence(int(project_id))

        return JsonResponse({
            'success': True,
            'project_id': int(project_id),
            'confidence': results
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_project_context_summary(request, project_id):
    """
    GET /api/knowledge/projects/{project_id}/context/

    Get a summary of what context data is available for a project.
    Useful for debugging Landscaper context issues.
    """
    from ..services.project_context import get_project_context, get_project_context_summary

    try:
        summary = get_project_context_summary(int(project_id))

        # Optionally include full context if requested
        include_full = request.GET.get('full', 'false').lower() == 'true'
        full_context = None
        if include_full:
            full_context = get_project_context(int(project_id))

        return JsonResponse({
            'success': True,
            'project_id': int(project_id),
            'summary': summary,
            'full_context': full_context
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def process_document_now(request, doc_id):
    """
    POST /api/knowledge/documents/{doc_id}/process/

    Process a document synchronously (blocking).
    Returns when processing is complete.

    This is used for immediate processing on upload - no background worker needed.
    The request will block until extraction, chunking, and embedding are complete.
    """
    from ..services.document_processor import processor

    # Verify document exists and check current status
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT doc_id, processing_status, chunks_count, embeddings_count
            FROM landscape.core_doc
            WHERE doc_id = %s
        """, [doc_id])
        row = cursor.fetchone()

    if not row:
        return JsonResponse({
            'success': False,
            'error': 'Document not found'
        }, status=404)

    current_status = row[1]

    # Skip if already processed successfully
    if current_status == 'ready':
        return JsonResponse({
            'success': True,
            'status': 'ready',
            'message': 'Already processed',
            'chunks_created': row[2] or 0,
            'embeddings_created': row[3] or 0
        })

    # Process now (blocking call)
    result = processor.process_document(doc_id)

    return JsonResponse({
        'success': result['success'],
        'status': result['status'],
        'chunks_created': result.get('chunks_created', 0),
        'embeddings_created': result.get('embeddings_created', 0),
        'extracted_text_length': result.get('extracted_text_length', 0),
        'error': result.get('error')
    })
