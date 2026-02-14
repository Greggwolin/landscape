import json
import logging
import math
import re
from typing import Any, Dict, List, Optional

from django.db import connection, transaction
from django.http import JsonResponse
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ..models import KnowledgeSource, PlatformKnowledge, PlatformKnowledgeChunk
from ..services.platform_source_analysis import analyze_publisher_and_references
from ..services.text_extraction import extract_text_from_url, extract_text_and_page_count_from_url
from ..services.chunking import chunk_text, DEFAULT_CHUNK_SIZE
from ..services.embedding_service import generate_embedding
from ..services.platform_knowledge_retriever import get_platform_knowledge_retriever
from ..services.source_registry_service import (
    match_source_name,
    refresh_source_document_counts,
)

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
    'cbre': 'CBRE',
    'colliers': 'Colliers',
    'cushman': 'Cushman & Wakefield',
    'jll': 'JLL',
    'newmark': 'Newmark',
    'berkadia': 'Berkadia',
    'eastdil': 'Eastdil Secured',
    'walker dunlop': 'Walker & Dunlop',
    'walker & dunlop': 'Walker & Dunlop',
    'irem': 'IREM',
    'appraisal institute': 'Appraisal Institute',
    'costar': 'CoStar',
    'realpage': 'RealPage',
    'yardi': 'Yardi',
    'federal reserve': 'Federal Reserve',
    'freddie mac': 'Freddie Mac',
    'fannie mae': 'Fannie Mae',
    'hud': 'HUD',
    'census bureau': 'Census Bureau',
}

DOMAIN_KEYWORDS = [
    (['operating expense', 'operating expenses', 'opex', 'expense'], 'operating_expenses'),
    (['valuation', 'appraisal', 'cap rate'], 'valuation_methodology'),
    (['market', 'absorption', 'demographics'], 'market_data'),
    (['legal', 'regulatory', 'compliance', 'uspap'], 'legal_regulatory'),
    (['cost', 'construction', 'replacement cost'], 'cost_estimation'),
]


def _infer_source(text: str, filename: str) -> str:
    haystack = f"{filename} {text[:8000]}".lower()
    for keyword, source in SOURCE_KEYWORDS.items():
        if keyword in haystack:
            return source
    return ''


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


def _build_analysis(
    filename: str,
    domain: str,
    source: str,
    property_types: List[str],
    source_evidence: str = '',
    referenced_sources: Optional[List[str]] = None,
) -> str:
    referenced_sources = referenced_sources or []
    types = ', '.join(property_types) if property_types else 'multiple property types'
    domain_label = domain.replace('_', ' ')
    publisher_label = source or 'not confidently identified'
    summary = (
        f'"{filename}" is categorized as {domain_label} content for {types.lower()}. '
        f'Publisher signal: {publisher_label}.'
    )
    if source_evidence:
        summary += f' Evidence: {source_evidence}'
    if referenced_sources:
        summary += f" Referenced sources: {', '.join(referenced_sources[:5])}."
    return summary


def _resolve_source_suggestion(source_name: str) -> Dict[str, Any]:
    cleaned = (source_name or '').strip()
    if not cleaned:
        return {
            'source_id': None,
            'source_name': '',
            'match_status': 'none',
            'match_type': 'none',
            'match_confidence': 0.0,
            'create_suggestion': None,
        }

    match = match_source_name(cleaned, min_confidence=0.82)
    matched_source = match.get('source')
    if match.get('matched') and matched_source:
        return {
            'source_id': matched_source.id,
            'source_name': matched_source.source_name,
            'match_status': 'matched',
            'match_type': match.get('match_type') or 'source_exact',
            'match_confidence': float(match.get('confidence') or 0.0),
            'create_suggestion': None,
        }

    return {
        'source_id': None,
        'source_name': cleaned,
        'match_status': 'suggest_create',
        'match_type': match.get('match_type') or 'no_match',
        'match_confidence': float(match.get('confidence') or 0.0),
        'create_suggestion': match.get('create_suggestion') or {'name': cleaned},
    }


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
        property_types = _infer_property_types(text, doc_name)
        year = _infer_year(text, doc_name)
        source_analysis = analyze_publisher_and_references(doc_name, text)
        suggested_source = source_analysis.get('suggested_source') or {}
        referenced_sources = source_analysis.get('referenced_sources') or []

        raw_source_name = (
            str(suggested_source.get('name')).strip()
            if isinstance(suggested_source, dict) and suggested_source.get('name')
            else ''
        )
        if not raw_source_name:
            raw_source_name = _infer_source(text, doc_name)

        source_resolution = _resolve_source_suggestion(raw_source_name)
        ai_source_confidence = (
            float(suggested_source.get('confidence') or 0.0)
            if isinstance(suggested_source, dict)
            else 0.0
        )
        source_confidence = ai_source_confidence or source_resolution['match_confidence']
        source_evidence = (
            str(suggested_source.get('evidence') or '').strip()
            if isinstance(suggested_source, dict)
            else ''
        )

        analysis = _build_analysis(
            doc_name,
            domain,
            source_resolution['source_name'],
            property_types,
            source_evidence=source_evidence,
            referenced_sources=referenced_sources,
        )
        estimated_chunks = max(1, math.ceil(len(text) / DEFAULT_CHUNK_SIZE)) if text else 1

        return JsonResponse({
            'success': True,
            'analysis': analysis,
            'suggestions': {
                'knowledge_domain': domain,
                'property_types': property_types,
                'source': source_resolution['source_name'],
                'source_id': source_resolution['source_id'],
                'source_confidence': source_confidence,
                'source_evidence': source_evidence,
                'source_match_status': source_resolution['match_status'],
                'source_match_type': source_resolution['match_type'],
                'source_match_confidence': source_resolution['match_confidence'],
                'source_create_suggestion': source_resolution['create_suggestion'],
                'suggested_source': {
                    'name': source_resolution['source_name'] or raw_source_name,
                    'confidence': source_confidence,
                    'evidence': source_evidence,
                    'source_id': source_resolution['source_id'],
                    'matched': bool(source_resolution['source_id']),
                    'match_status': source_resolution['match_status'],
                    'match_type': source_resolution['match_type'],
                },
                'referenced_sources': referenced_sources,
                'year': year,
                'geographic_scope': 'National'
            },
            'referenced_sources': referenced_sources,
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

        requested_source_id = data.get('source_id')
        requested_source_name = (data.get('source') or '').strip()
        resolved_source: Optional[KnowledgeSource] = None
        publisher_value = requested_source_name or None

        if requested_source_id is not None:
            try:
                resolved_source = KnowledgeSource.objects.get(
                    id=int(requested_source_id),
                    is_active=True,
                )
                publisher_value = resolved_source.source_name
            except (TypeError, ValueError):
                return JsonResponse({'error': 'source_id must be an integer'}, status=400)
            except KnowledgeSource.DoesNotExist:
                return JsonResponse({'error': 'source_id not found'}, status=400)
        elif requested_source_name:
            source_match = match_source_name(requested_source_name, min_confidence=0.82)
            if source_match.get('matched') and source_match.get('source'):
                resolved_source = source_match['source']
                publisher_value = resolved_source.source_name

        referenced_sources = data.get('referenced_sources')
        if not isinstance(referenced_sources, list):
            referenced_sources = []
        referenced_sources = [
            str(value).strip()
            for value in referenced_sources
            if isinstance(value, str) and str(value).strip()
        ]

        metadata_payload = data.get('metadata')
        if not isinstance(metadata_payload, dict):
            metadata_payload = {}
        if referenced_sources:
            metadata_payload['referenced_sources'] = referenced_sources

        base_title = doc_name.rsplit('.', 1)[0]
        document_key = _ensure_unique_key(slugify(base_title)[:90])

        doc = PlatformKnowledge.objects.create(
            document_key=document_key,
            title=base_title,
            subtitle=data.get('geographic_scope'),
            edition=data.get('edition'),
            publisher=publisher_value,
            source=resolved_source,
            publication_year=data.get('year'),
            knowledge_domain=data.get('knowledge_domain') or 'other',
            property_types=data.get('property_types') or [],
            description=data.get('description'),
            metadata=metadata_payload,
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
            refresh_source_document_counts()
            return JsonResponse({'error': error or 'No text extracted'}, status=500)

        chunks = chunk_text(text)
        if not chunks:
            doc.ingestion_status = PlatformKnowledge.IngestionStatus.FAILED
            doc.save(update_fields=['ingestion_status'])
            refresh_source_document_counts()
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

        refresh_source_document_counts()

        return JsonResponse({
            'success': True,
            'document_key': doc.document_key,
            'chunk_count': doc.chunk_count,
            'source_id': doc.source_id,
            'publisher': doc.publisher,
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
            'property_types', 'subtitle', 'description', 'metadata'
        ]

        for field in allowed_fields:
            if field in data:
                if field == 'metadata' and not isinstance(data[field], dict):
                    return JsonResponse({'error': 'metadata must be an object'}, status=400)
                setattr(doc, field, data[field])

        if 'source_id' in data:
            source_id = data.get('source_id')
            if source_id in (None, ''):
                doc.source = None
            else:
                try:
                    source_obj = KnowledgeSource.objects.get(id=int(source_id), is_active=True)
                except (TypeError, ValueError):
                    return JsonResponse({'error': 'source_id must be an integer'}, status=400)
                except KnowledgeSource.DoesNotExist:
                    return JsonResponse({'error': 'source_id not found'}, status=400)
                doc.source = source_obj
                doc.publisher = source_obj.source_name

        doc.save()
        refresh_source_document_counts()

        return JsonResponse({
            'success': True,
            'document_key': doc.document_key,
            'title': doc.title,
            'publisher': doc.publisher,
            'source_id': doc.source_id,
            'publication_year': doc.publication_year,
            'knowledge_domain': doc.knowledge_domain,
            'property_types': doc.property_types,
            'subtitle': doc.subtitle,
            'description': doc.description,
            'metadata': doc.metadata,
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
