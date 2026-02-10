"""
Canonical chat endpoint for Landscaper.
Orchestrates: Idempotency check -> DB-first queries -> RAG retrieval -> AI response -> persistence

Returns unified response contract - Next.js should pass through without transformation.
"""
import json
import logging
import time

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

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
from apps.projects.models import Project

logger = logging.getLogger(__name__)


def _user_can_access_project(user, project: Project) -> bool:
    """Mirror landscaper project access policy for canonical knowledge chat."""
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.is_superuser or getattr(user, 'role', None) == 'admin':
        return True

    owner_id = getattr(project, 'created_by_id', None)
    if owner_id is None:
        return True

    return owner_id == user.id


def _enforce_project_access(user, project_id: int):
    """Return JsonResponse on denial, otherwise None."""
    try:
        project = Project.objects.get(project_id=project_id)
    except Project.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Project not found'}, status=404)

    if not _user_can_access_project(user, project):
        return JsonResponse({'success': False, 'error': 'Access denied for this project'}, status=403)

    return None


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def chat(request, project_id: int):
    """
    Unified chat endpoint.

    GET: Retrieve chat history
    POST: Send message, get AI response with DB-first + RAG context

    Response shapes are defined in contracts.py - Next.js passes through as-is.
    """
    access_error = _enforce_project_access(request.user, project_id)
    if access_error:
        return access_error

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
    request_start = time.time()
    timings = {}

    try:
        data = json.loads(request.body)
        user_message = data.get('message', '').strip()
        client_request_id = data.get('clientRequestId') or data.get('client_request_id')
        active_tab = data.get('active_tab', 'home')  # Tab context for focused responses
        page_context = data.get('page_context')  # For context-aware tool filtering

        logger.info("[TIMING] Processing message for project %s: %.50s...", project_id, user_message)
        print(f"[TIMING] Processing message for project {project_id}: {user_message[:50]}...")

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

        t0 = time.time()
        conversation_history = get_recent_context(project_id, max_messages=10)
        timings['get_recent_context'] = time.time() - t0
        print(f"[TIMING] get_recent_context: {timings['get_recent_context']:.2f}s")

        t0 = time.time()
        query_builder = QueryBuilder(project_id)
        db_context = query_builder.build_context(user_message)
        timings['query_builder'] = time.time() - t0
        print(f"[TIMING] query_builder.build_context: {timings['query_builder']:.2f}s")

        t0 = time.time()
        rag_retriever = RAGRetriever(project_id)
        rag_context = rag_retriever.retrieve(user_message)
        timings['rag_retrieval'] = time.time() - t0
        print(f"[TIMING] rag_retrieval: {timings['rag_retrieval']:.2f}s (chunks: {len(rag_context.get('chunks', []))})")

        t0 = time.time()
        ai_response = get_landscaper_response(
            user_message=user_message,
            project_id=project_id,
            conversation_history=conversation_history,
            db_context=db_context,
            rag_context=rag_context,
            active_tab=active_tab,
            page_context=page_context  # Pass for context-aware tool filtering
        )
        timings['ai_response'] = time.time() - t0
        print(f"[TIMING] get_landscaper_response: {timings['ai_response']:.2f}s")

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
            tool_executions=ai_metadata.get('tool_executions'),
            error=ai_metadata.get('error'),
            traceback=ai_metadata.get('traceback')
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

        total_time = time.time() - request_start
        print(f"[TIMING] Total request time: {total_time:.2f}s | Breakdown: {timings}")

        return JsonResponse(response.to_dict())

    except json.JSONDecodeError:
        return JsonResponse(error_response('Invalid JSON'), status=400)
    except Exception as e:
        total_time = time.time() - request_start
        logger.exception("[TIMING] Error after %.2fs processing message for project %s: %s", total_time, project_id, str(e))
        return JsonResponse(error_response(str(e)), status=500)


@csrf_exempt
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def clear_chat(request, project_id: int):
    """Clear chat history for project."""
    access_error = _enforce_project_access(request.user, project_id)
    if access_error:
        return access_error

    try:
        deleted_count = clear_history(project_id)
        return JsonResponse({
            'success': True,
            'deletedCount': deleted_count
        })
    except Exception as e:
        logger.exception("Error clearing chat for project %s", project_id)
        return JsonResponse(error_response(str(e)), status=500)


# =====================================================
# Document-Scoped Chat Endpoint
# =====================================================

@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def document_chat(request, project_id: int, doc_id: int):
    """
    Chat with Landscaper about a specific document.
    RAG retrieval is scoped to embeddings from this document only.

    Request body:
    {
        "message": "What is the asking price in this document?",
        "clientRequestId": "optional-idempotency-key"
    }

    Response: Same structure as regular chat, but context limited to single doc.
    """
    access_error = _enforce_project_access(request.user, project_id)
    if access_error:
        return access_error

    try:
        from apps.documents.models import Document
        from ..services.embedding_service import generate_embedding
        from ..services.landscaper_ai import get_landscaper_response
        from django.db import connection

        data = json.loads(request.body)
        user_message = data.get('message', '').strip()

        if not user_message:
            return JsonResponse(error_response('Message is required'), status=400)

        # Verify document exists and belongs to project
        try:
            doc = Document.objects.get(doc_id=doc_id, project_id=project_id, deleted_at__isnull=True)
        except Document.DoesNotExist:
            return JsonResponse(error_response('Document not found'), status=404)

        # Get document-scoped embeddings
        query_embedding = generate_embedding(user_message)
        relevant_chunks = []

        if query_embedding:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        ke.embedding_id,
                        ke.content_text,
                        ke.source_id,
                        1 - (ke.embedding <=> %s::vector) as similarity
                    FROM landscape.knowledge_embeddings ke
                    WHERE ke.source_type = 'document_chunk'
                    AND ke.source_id = %s
                    AND (ke.superseded_by_version IS NULL OR ke.superseded_by_version = 0)
                    ORDER BY ke.embedding <=> %s::vector
                    LIMIT 10
                """, [query_embedding, doc_id, query_embedding])

                for row in cursor.fetchall():
                    relevant_chunks.append({
                        'chunk_id': row[0],
                        'text': row[1],
                        'doc_id': row[2],
                        'similarity': float(row[3])
                    })

        # Get extracted facts for this document (from doc_extracted_facts if table exists)
        extracted_facts = []
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT field_name, field_value, confidence, source_version
                    FROM landscape.doc_extracted_facts
                    WHERE doc_id = %s AND superseded_at IS NULL
                    ORDER BY confidence DESC NULLS LAST
                    LIMIT 20
                """, [doc_id])

                for row in cursor.fetchall():
                    extracted_facts.append({
                        'field_name': row[0],
                        'field_value': row[1],
                        'confidence': float(row[2]) if row[2] else None,
                        'version': row[3]
                    })
        except Exception:
            # Table might not exist yet
            pass

        # Build document-specific context
        facts_text = ""
        if extracted_facts:
            facts_text = "\n".join([
                f"- {f['field_name']}: {f['field_value']} (confidence: {f['confidence']:.0%})"
                for f in extracted_facts if f['field_value']
            ])

        chunks_text = ""
        if relevant_chunks:
            chunks_text = "\n---\n".join([
                f"[Passage {i+1}, similarity: {c['similarity']:.2f}]\n{c['text'][:500]}..."
                if len(c['text']) > 500 else f"[Passage {i+1}, similarity: {c['similarity']:.2f}]\n{c['text']}"
                for i, c in enumerate(relevant_chunks[:5])
            ])

        # Build document context for AI
        doc_context = {
            "document": {
                "filename": doc.doc_name,
                "doc_type": doc.doc_type,
                "version": doc.version_no,
                "uploaded_at": doc.created_at.isoformat() if doc.created_at else None,
            },
            "extracted_facts": extracted_facts,
            "relevant_chunks": relevant_chunks,
        }

        # Create document-specific system prompt addition
        doc_system_context = f"""
You are Landscaper, assisting with a SPECIFIC document: "{doc.doc_name}" (Version {doc.version_no}, Type: {doc.doc_type}).

IMPORTANT: Answer questions based ONLY on this document's content. If the information isn't in this document, clearly say so.

Formatting instructions:
- Use plain text with clear line breaks.
- Avoid markdown headers, bullets, or bold markers (no #, **, or * formatting).
- Use short labeled lines and indentation for hierarchy.

"""
        if facts_text:
            doc_system_context += f"""Extracted facts from this document:
{facts_text}

"""
        if chunks_text:
            doc_system_context += f"""Relevant passages from this document:
{chunks_text}
"""

        # Get AI response with document context
        ai_response = get_landscaper_response(
            user_message=user_message,
            project_id=project_id,
            conversation_history=[],  # Document chat doesn't use history
            db_context=None,  # Skip DB context for document-scoped chat
            rag_context={"chunks": relevant_chunks, "doc_context": doc_system_context},
            active_tab="document_chat"
        )

        # Build sources list
        sources = []
        for chunk in relevant_chunks[:3]:
            sources.append(ChatSource(
                filename=doc.doc_name,
                doc_id=doc_id,
                similarity=chunk.get('similarity')
            ))

        metadata = ChatMetadata(
            sources=sources,
            db_query_used=None,
            rag_chunks_used=len(relevant_chunks),
            field_updates=None,
            client_request_id=data.get('clientRequestId')
        )

        response = ChatResponse(
            success=True,
            message_id=f"doc-chat-{doc_id}-{int(__import__('time').time())}",
            content=ai_response['content'],
            metadata=metadata,
            created_at=__import__('datetime').datetime.now().isoformat(),
            was_duplicate=False
        )

        return JsonResponse(response.to_dict())

    except json.JSONDecodeError:
        return JsonResponse(error_response('Invalid JSON'), status=400)
    except Exception as e:
        logger.exception("Error in document chat for doc %s", doc_id)
        return JsonResponse(error_response(str(e)), status=500)
