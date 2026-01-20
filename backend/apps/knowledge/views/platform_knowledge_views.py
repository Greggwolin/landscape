import json
import logging
import math
import re
from typing import Dict, List, Optional

from django.db import connection, transaction
from django.http import JsonResponse
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ..models import PlatformKnowledge, PlatformKnowledgeChunk
from ..services.text_extraction import extract_text_from_url, extract_text_and_page_count_from_url
from ..services.chunking import chunk_text, DEFAULT_CHUNK_SIZE
from ..services.embedding_service import generate_embedding
from ..services.platform_knowledge_retriever import get_platform_knowledge_retriever

logger = logging.getLogger(__name__)

PROPERTY_TYPE_KEYWORDS = {
    'multifamily': 'Multifamily',
    'apartment': 'Multifamily',
    'retail': 'Retail',
    'office': 'Office',
    'industrial': 'Industrial',
    'land development': 'Land Development',
    'land dev': 'Land Development',
}

SOURCE_KEYWORDS = {
    'irem': 'IREM',
    'appraisal institute': 'Appraisal Institute',
    'uspap': 'USPAP',
    'naa': 'NAA',
    'boma': 'BOMA',
    'internal': 'Internal',
}

DOMAIN_KEYWORDS = [
    (['operating expense', 'operating expenses', 'opex', 'expense'], 'operating_expenses'),
    (['valuation', 'appraisal', 'cap rate'], 'valuation_methodology'),
    (['market', 'absorption', 'demographics'], 'market_data'),
    (['legal', 'regulatory', 'compliance', 'uspap'], 'legal_regulatory'),
    (['cost', 'construction', 'replacement cost'], 'cost_estimation'),
]


def _infer_source(text: str, filename: str) -> str:
    haystack = f"{filename} {text}".lower()
    for keyword, source in SOURCE_KEYWORDS.items():
        if keyword in haystack:
            return source
    return 'Other'


def _infer_domain(text: str, filename: str) -> str:
    haystack = f"{filename} {text}".lower()
    for keywords, domain in DOMAIN_KEYWORDS:
        if any(keyword in haystack for keyword in keywords):
            return domain
    return 'other'


def _infer_property_types(text: str, filename: str) -> List[str]:
    haystack = f"{filename} {text}".lower()
    property_types = []
    for keyword, label in PROPERTY_TYPE_KEYWORDS.items():
        if keyword in haystack and label not in property_types:
            property_types.append(label)
    if not property_types:
        property_types.append('All')
    return property_types


def _infer_year(text: str, filename: str) -> Optional[int]:
    haystack = f"{filename} {text}"
    match = re.search(r'\b(19|20)\d{2}\b', haystack)
    if match:
        try:
            return int(match.group(0))
        except ValueError:
            return None
    return None


def _build_analysis(filename: str, domain: str, source: str, property_types: List[str]) -> str:
    types = ', '.join(property_types) if property_types else 'multiple property types'
    domain_label = domain.replace('_', ' ')
    return (
        f'"{filename}" appears to reference {domain_label} guidance from {source} '
        f'covering {types.lower()}.'
    )


def _ensure_unique_key(base_key: str) -> str:
    candidate = base_key or f"platform-doc-{int(timezone.now().timestamp())}"
    if not PlatformKnowledge.objects.filter(document_key=candidate).exists():
        return candidate
    suffix = 1
    while PlatformKnowledge.objects.filter(document_key=f"{candidate}-{suffix}").exists():
        suffix += 1
    return f"{candidate}-{suffix}"


def _store_embedding(chunk_id: int, embedding: List[float]) -> None:
    embedding_str = '[' + ','.join(str(x) for x in embedding) + ']'
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE landscape.tbl_platform_knowledge_chunks
            SET embedding = %s::vector
            WHERE id = %s
            """,
            [embedding_str, chunk_id]
        )


@csrf_exempt
@require_http_methods(["POST"])
def analyze_platform_document(request):
    try:
        data = json.loads(request.body)
        storage_uri = data.get('storage_uri')
        doc_name = data.get('doc_name') or 'Platform Knowledge Document'
        mime_type = data.get('mime_type')

        if not storage_uri:
            return JsonResponse({'error': 'storage_uri is required'}, status=400)

        text, error = extract_text_from_url(storage_uri, mime_type)
        text = text or ''

        domain = _infer_domain(text, doc_name)
        source = _infer_source(text, doc_name)
        property_types = _infer_property_types(text, doc_name)
        year = _infer_year(text, doc_name)
        analysis = _build_analysis(doc_name, domain, source, property_types)
        estimated_chunks = max(1, math.ceil(len(text) / DEFAULT_CHUNK_SIZE)) if text else 1

        return JsonResponse({
            'success': True,
            'analysis': analysis,
            'suggestions': {
                'knowledge_domain': domain,
                'property_types': property_types,
                'source': source,
                'year': year,
                'geographic_scope': 'National'
            },
            'estimated_chunks': estimated_chunks,
            'warning': error
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as exc:
        logger.exception('Platform knowledge analyze error')
        return JsonResponse({'error': str(exc)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def ingest_platform_document(request):
    try:
        data = json.loads(request.body)
        storage_uri = data.get('storage_uri')
        doc_name = data.get('doc_name') or 'Platform Knowledge Document'
        mime_type = data.get('mime_type')

        if not storage_uri:
            return JsonResponse({'error': 'storage_uri is required'}, status=400)

        base_title = doc_name.rsplit('.', 1)[0]
        document_key = _ensure_unique_key(slugify(base_title)[:90])

        doc = PlatformKnowledge.objects.create(
            document_key=document_key,
            title=base_title,
            subtitle=data.get('geographic_scope'),
            edition=data.get('edition'),
            publisher=data.get('source'),
            publication_year=data.get('year'),
            knowledge_domain=data.get('knowledge_domain') or 'other',
            property_types=data.get('property_types') or [],
            description=data.get('description'),
            total_chapters=0,
            total_pages=None,
            file_path=storage_uri,
            file_hash=data.get('file_hash'),
            file_size_bytes=data.get('file_size_bytes'),
            ingestion_status=PlatformKnowledge.IngestionStatus.PROCESSING,
            created_by=data.get('created_by') or 'system'
        )

        text, page_count, error = extract_text_and_page_count_from_url(storage_uri, mime_type)
        if error or not text:
            doc.ingestion_status = PlatformKnowledge.IngestionStatus.FAILED
            if page_count is not None:
                doc.page_count = page_count
            doc.save(update_fields=['ingestion_status', 'page_count'])
            return JsonResponse({'error': error or 'No text extracted'}, status=500)

        chunks = chunk_text(text)
        if not chunks:
            doc.ingestion_status = PlatformKnowledge.IngestionStatus.FAILED
            doc.save(update_fields=['ingestion_status'])
            return JsonResponse({'error': 'No chunks generated'}, status=500)

        with transaction.atomic():
            for chunk in chunks:
                chunk_record = PlatformKnowledgeChunk.objects.create(
                    document=doc,
                    chapter=None,
                    chunk_index=chunk['chunk_index'],
                    content=chunk['content'],
                    content_type=PlatformKnowledgeChunk.ContentType.TEXT,
                    page_number=None,
                    section_path=None,
                    token_count=len(chunk['content'].split())
                )
                embedding = generate_embedding(chunk['content'])
                if embedding:
                    _store_embedding(chunk_record.id, embedding)

        doc.ingestion_status = PlatformKnowledge.IngestionStatus.INDEXED
        doc.last_indexed_at = timezone.now()
        doc.chunk_count = len(chunks)
        doc.page_count = page_count
        doc.save(update_fields=['ingestion_status', 'last_indexed_at', 'chunk_count', 'page_count'])

        return JsonResponse({
            'success': True,
            'document_key': doc.document_key,
            'chunk_count': doc.chunk_count
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as exc:
        logger.exception('Platform knowledge ingest error')
        return JsonResponse({'error': str(exc)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def chat_with_document(request, document_key: str):
    """
    Chat with a specific platform knowledge document.

    POST body:
    {
        "message": "What does this document say about cap rates?",
        "max_chunks": 5  // optional, default 5
    }

    Response: AI-generated answer scoped to the specified document.
    """
    try:
        from ..services.landscaper_ai import get_landscaper_response

        data = json.loads(request.body)
        user_message = data.get('message', '').strip()

        if not user_message:
            return JsonResponse({'error': 'message is required'}, status=400)

        max_chunks = data.get('max_chunks', 5)

        # Verify document exists
        try:
            doc = PlatformKnowledge.objects.get(document_key=document_key, is_active=True)
        except PlatformKnowledge.DoesNotExist:
            return JsonResponse({'error': 'Document not found'}, status=404)

        # Get document-scoped chunks
        retriever = get_platform_knowledge_retriever()
        chunks = retriever.retrieve_for_document(
            query=user_message,
            document_key=document_key,
            max_chunks=max_chunks,
            similarity_threshold=0.5
        )

        # Format chunks for context
        chunks_text = ""
        if chunks:
            chunks_text = "\n---\n".join([
                f"[Passage {i+1}, similarity: {c['similarity']:.2f}]\n{c['content'][:800]}..."
                if len(c['content']) > 800 else f"[Passage {i+1}, similarity: {c['similarity']:.2f}]\n{c['content']}"
                for i, c in enumerate(chunks[:5])
            ])

        # Build document-specific context for AI
        doc_context = f"""
You are Landscaper, assisting with a SPECIFIC platform knowledge document: "{doc.title}"
Publisher: {doc.publisher or 'Unknown'}
Year: {doc.publication_year or 'Unknown'}
Domain: {doc.knowledge_domain or 'General'}

IMPORTANT: Answer questions based ONLY on this document's content. If the information isn't in this document, clearly say so.

Formatting instructions:
- Use plain text with clear line breaks.
- Avoid markdown headers, bullets, or bold markers (no #, **, or * formatting).
- Use short labeled lines and indentation for hierarchy.

"""
        if chunks_text:
            doc_context += f"""Relevant passages from this document:
{chunks_text}
"""

        # Get AI response with document context
        ai_response = get_landscaper_response(
            user_message=user_message,
            project_id=0,  # No project context for platform knowledge
            conversation_history=[],
            db_context=None,
            rag_context={"chunks": chunks, "doc_context": doc_context},
            active_tab="platform_knowledge_chat"
        )

        # Format sources
        sources = []
        for chunk in chunks[:3]:
            source = chunk.get('source', {})
            sources.append({
                'document_title': source.get('document_title'),
                'document_key': source.get('document_key'),
                'chapter_title': source.get('chapter_title'),
                'page': source.get('page'),
                'similarity': chunk.get('similarity')
            })

        return JsonResponse({
            'success': True,
            'content': ai_response['content'],
            'sources': sources,
            'chunks_used': len(chunks)
        })

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as exc:
        logger.exception('Platform knowledge document chat error')
        return JsonResponse({'error': str(exc)}, status=500)


@csrf_exempt
@require_http_methods(["PATCH"])
def update_platform_knowledge(request, document_key: str):
    """
    Update a platform knowledge document's metadata.

    PATCH body:
    {
        "title": "Updated Title",
        "publisher": "IREM",
        "publication_year": 2024,
        "knowledge_domain": "operating_expenses",
        "property_types": ["Multifamily", "Office"],
        "subtitle": "national",
        "description": "Updated description"
    }
    """
    try:
        data = json.loads(request.body)

        try:
            doc = PlatformKnowledge.objects.get(document_key=document_key, is_active=True)
        except PlatformKnowledge.DoesNotExist:
            return JsonResponse({'error': 'Document not found'}, status=404)

        # Update allowed fields
        allowed_fields = [
            'title', 'publisher', 'publication_year', 'knowledge_domain',
            'property_types', 'subtitle', 'description'
        ]

        for field in allowed_fields:
            if field in data:
                setattr(doc, field, data[field])

        doc.save()

        return JsonResponse({
            'success': True,
            'document_key': doc.document_key,
            'title': doc.title,
            'publisher': doc.publisher,
            'publication_year': doc.publication_year,
            'knowledge_domain': doc.knowledge_domain,
            'property_types': doc.property_types,
            'subtitle': doc.subtitle,
            'description': doc.description,
        })

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as exc:
        logger.exception('Platform knowledge update error')
        return JsonResponse({'error': str(exc)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def query_platform_knowledge(request):
    """
    Query platform knowledge using semantic search (RAG).

    POST body:
    {
        "query": "What does IREM say about R&M expenses?",
        "property_type": "Multifamily",  // optional
        "knowledge_domain": "operating_expenses",  // optional
        "max_chunks": 5  // optional, default 5
    }
    """
    try:
        data = json.loads(request.body)
        query = data.get('query', '').strip()

        if not query:
            return JsonResponse({'error': 'query is required'}, status=400)

        property_type = data.get('property_type')
        knowledge_domain = data.get('knowledge_domain')
        max_chunks = data.get('max_chunks', 5)

        retriever = get_platform_knowledge_retriever()
        chunks = retriever.retrieve(
            query=query,
            property_type=property_type,
            knowledge_domain=knowledge_domain,
            max_chunks=max_chunks,
            similarity_threshold=0.60  # Lower threshold for better recall
        )

        # Format response for frontend display
        results = []
        for chunk in chunks:
            source = chunk.get('source', {})
            results.append({
                'content': chunk['content'],
                'similarity': chunk.get('similarity', 0),
                'document_title': source.get('document_title', 'Unknown'),
                'document_key': source.get('document_key', ''),
                'chapter_title': source.get('chapter_title'),
                'chapter_number': source.get('chapter_number'),
                'page': source.get('page'),
                'section_path': source.get('section_path'),
            })

        return JsonResponse({
            'success': True,
            'query': query,
            'results': results,
            'count': len(results)
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as exc:
        logger.exception('Platform knowledge query error')
        return JsonResponse({'error': str(exc)}, status=500)
