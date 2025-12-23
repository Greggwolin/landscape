"""
API views for Landscaper chat with RAG.
"""
import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import connection

from ..services.landscaper_ai import (
    get_landscaper_response,
    save_chat_message,
)
from ..services.rag_retrieval import get_conversation_context


@csrf_exempt
@require_http_methods(["GET"])
def get_chat_history(request, project_id):
    """
    GET /api/knowledge/chat/{project_id}/

    Retrieve chat history for a project.
    """
    try:
        limit = int(request.GET.get('limit', 50))
        messages = get_conversation_context(project_id, limit=limit)

        return JsonResponse({
            'success': True,
            'project_id': project_id,
            'messages': messages,
            'count': len(messages)
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def send_message(request, project_id):
    """
    POST /api/knowledge/chat/{project_id}/send/

    Send a message and get AI response.

    Request body:
    {
        "message": "What absorption rate should I use?",
        "conversation_history": [...]  // optional, will fetch from DB if not provided
    }
    """
    try:
        data = json.loads(request.body)
        user_message = data.get('message', '').strip()

        if not user_message:
            return JsonResponse({
                'success': False,
                'error': 'Message is required'
            }, status=400)

        # Optional: use provided history or fetch from DB
        conversation_history = data.get('conversation_history')

        # Get user_id if authenticated
        user_id = None
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_id = request.user.id

        # Save user message
        save_chat_message(
            project_id=project_id,
            role='user',
            content=user_message,
            user_id=user_id
        )

        # Get AI response with RAG context
        response = get_landscaper_response(
            user_message=user_message,
            project_id=project_id,
            conversation_history=conversation_history
        )

        # Save assistant response
        save_chat_message(
            project_id=project_id,
            role='assistant',
            content=response['content'],
            metadata=response.get('metadata'),
            user_id=user_id
        )

        return JsonResponse({
            'success': True,
            'response': {
                'content': response['content'],
                'metadata': response.get('metadata', {}),
                'context': response.get('context_used', {}),
                # NEW: Structured data for table rendering
                'structured_data': response.get('structured_data'),
                'data_type': response.get('data_type'),
                'data_title': response.get('data_title'),
                'columns': response.get('columns'),
            }
        })

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON'
        }, status=400)

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["DELETE"])
def clear_chat_history(request, project_id):
    """
    DELETE /api/knowledge/chat/{project_id}/clear/

    Clear chat history for a project.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM landscape.landscaper_chat_message
                WHERE project_id = %s
            """, [project_id])

            deleted_count = cursor.rowcount

        return JsonResponse({
            'success': True,
            'deleted_count': deleted_count
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def search_documents(request, project_id):
    """
    POST /api/knowledge/chat/{project_id}/search/

    Search document embeddings without generating AI response.
    Useful for showing relevant documents as user types.

    Request body:
    {
        "query": "absorption rate",
        "limit": 5,
        "threshold": 0.7
    }
    """
    try:
        data = json.loads(request.body)
        query = data.get('query', '').strip()

        if not query:
            return JsonResponse({
                'success': False,
                'error': 'Query is required'
            }, status=400)

        limit = int(data.get('limit', 5))
        threshold = float(data.get('threshold', 0.7))

        from ..services.embedding_storage import search_similar

        results = search_similar(
            query_text=query,
            limit=limit,
            similarity_threshold=threshold
        )

        # Enrich with document metadata
        if results:
            doc_ids = list(set(r['source_id'] for r in results if r.get('source_type') == 'document_chunk'))

            if doc_ids:
                with connection.cursor() as cursor:
                    placeholders = ','.join(['%s'] * len(doc_ids))
                    cursor.execute(f"""
                        SELECT doc_id, doc_name, doc_type
                        FROM landscape.core_doc
                        WHERE doc_id IN ({placeholders})
                    """, doc_ids)

                    doc_metadata = {row[0]: {'doc_name': row[1], 'doc_type': row[2]} for row in cursor.fetchall()}

                    for r in results:
                        doc_id = r.get('source_id')
                        if doc_id in doc_metadata:
                            r.update(doc_metadata[doc_id])

        return JsonResponse({
            'success': True,
            'results': results,
            'count': len(results)
        })

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON'
        }, status=400)

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
