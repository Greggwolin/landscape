"""
Canonical chat endpoint for Landscaper.
Orchestrates: Idempotency check -> DB-first queries -> RAG retrieval -> AI response -> persistence

Returns unified response contract - Next.js should pass through without transformation.
"""
import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ..services.rag_retrieval import RAGRetriever
from ..services.landscaper_ai import get_landscaper_response
from ..services.query_builder import QueryBuilder
from ..contracts import (
    ChatResponse,
    ChatHistoryResponse,
    ChatMessage,
    ChatMetadata,
    ChatSource,
    error_response
)
from apps.landscaper.services.message_storage import (
    check_idempotency,
    save_message_pair,
    get_history,
    clear_history,
    get_recent_context
)

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def chat(request, project_id: int):
    """
    Unified chat endpoint.

    GET: Retrieve chat history
    POST: Send message, get AI response with DB-first + RAG context

    Response shapes are defined in contracts.py - Next.js passes through as-is.
    """
    if request.method == "GET":
        return _get_chat_history(request, project_id)
    return _send_message(request, project_id)


def _get_chat_history(request, project_id: int) -> JsonResponse:
    """Get chat history for project, optionally filtered by tab."""
    try:
        limit = int(request.GET.get('limit', 100))
        before_id = request.GET.get('before_id')
        active_tab = request.GET.get('active_tab')  # Optional tab filter

        raw_messages = get_history(project_id, limit=limit, before_id=before_id, active_tab=active_tab)

        messages = [
            ChatMessage(
                message_id=m['message_id'],
                role=m['role'],
                content=m['content'],
                created_at=m['created_at'],
                metadata=m.get('metadata')
            )
            for m in raw_messages
        ]

        response = ChatHistoryResponse(
            success=True,
            messages=messages,
            project_id=project_id
        )

        return JsonResponse(response.to_dict())

    except Exception as e:
        logger.exception("Error getting chat history for project %s", project_id)
        return JsonResponse(error_response(str(e)), status=500)


def _send_message(request, project_id: int) -> JsonResponse:
    """
    Process user message with full context stack:

    1. Parse request + check idempotency
    2. Detect intent and run DB queries (DB-FIRST)
    3. Retrieve relevant document chunks (RAG, project-scoped)
    4. Build enriched prompt
    5. Get AI response
    6. Persist messages atomically
    7. Return unified response (no transformation needed by Next.js)
    """
    try:
        data = json.loads(request.body)
        user_message = data.get('message', '').strip()
        client_request_id = data.get('clientRequestId') or data.get('client_request_id')
        active_tab = data.get('active_tab', 'home')  # Tab context for focused responses

        if not user_message:
            return JsonResponse(error_response('Message is required'), status=400)

        if client_request_id:
            cached = check_idempotency(project_id, client_request_id)
            if cached:
                logger.info("Returning cached response for request %s", client_request_id)

                cached_metadata = cached.get('metadata') or {}
                cached_sources = [
                    ChatSource(
                        filename=source.get('filename', 'Unknown'),
                        doc_id=source.get('doc_id'),
                        similarity=source.get('similarity')
                    )
                    for source in cached_metadata.get('sources', [])
                    if isinstance(source, dict)
                ]

                response = ChatResponse(
                    success=True,
                    message_id=cached['message_id'],
                    content=cached['content'],
                    metadata=ChatMetadata(
                        sources=cached_sources,
                        db_query_used=cached_metadata.get('db_query_used'),
                        rag_chunks_used=cached_metadata.get('rag_chunks_used', 0),
                        field_updates=cached_metadata.get('fieldUpdates'),
                        client_request_id=client_request_id,
                    ),
                    created_at=cached['created_at'],
                    was_duplicate=True
                )
                return JsonResponse(response.to_dict())

        conversation_history = get_recent_context(project_id, max_messages=10)

        query_builder = QueryBuilder(project_id)
        db_context = query_builder.build_context(user_message)

        rag_retriever = RAGRetriever(project_id)
        rag_context = rag_retriever.retrieve(user_message)

        ai_response = get_landscaper_response(
            user_message=user_message,
            project_id=project_id,
            conversation_history=conversation_history,
            db_context=db_context,
            rag_context=rag_context,
            active_tab=active_tab
        )

        sources = []
        if rag_context and rag_context.get('chunks'):
            for chunk in rag_context['chunks'][:3]:
                sources.append(ChatSource(
                    filename=chunk.get('filename', 'Unknown'),
                    doc_id=chunk.get('source_doc_id'),
                    similarity=chunk.get('similarity')
                ))

        # Include tool execution info from AI response
        ai_metadata = ai_response.get('metadata', {})

        metadata = ChatMetadata(
            sources=sources,
            db_query_used=db_context.get('query_type') if db_context else None,
            rag_chunks_used=len(rag_context.get('chunks', [])) if rag_context else 0,
            field_updates=ai_response.get('suggestions'),
            client_request_id=client_request_id,
            tools_used=ai_metadata.get('tools_used'),
            tool_executions=ai_metadata.get('tool_executions')
        )

        user_msg, assistant_msg = save_message_pair(
            project_id=project_id,
            user_content=user_message,
            assistant_content=ai_response['content'],
            client_request_id=client_request_id,
            metadata=metadata.to_dict(),
            active_tab=active_tab
        )

        response = ChatResponse(
            success=True,
            message_id=assistant_msg['message_id'],
            content=ai_response['content'],
            metadata=metadata,
            created_at=assistant_msg['created_at'],
            was_duplicate=False
        )

        return JsonResponse(response.to_dict())

    except json.JSONDecodeError:
        return JsonResponse(error_response('Invalid JSON'), status=400)
    except Exception as e:
        logger.exception("Error processing message for project %s", project_id)
        return JsonResponse(error_response(str(e)), status=500)


@csrf_exempt
@require_http_methods(["DELETE"])
def clear_chat(request, project_id: int):
    """Clear chat history for project."""
    try:
        deleted_count = clear_history(project_id)
        return JsonResponse({
            'success': True,
            'deletedCount': deleted_count
        })
    except Exception as e:
        logger.exception("Error clearing chat for project %s", project_id)
        return JsonResponse(error_response(str(e)), status=500)
