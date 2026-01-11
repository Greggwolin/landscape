"""
Main ingestion pipeline: Document → Text → Chunks → Embeddings
"""
from typing import Optional, Dict, Any, List
from django.db import transaction

from .text_extraction import extract_text_from_url
from .chunking import chunk_document_with_sections
from .embedding_storage import store_embedding
from ..models import KnowledgeEmbedding


class DocumentIngestionResult:
    """Result of document ingestion."""

    def __init__(self):
        self.success = False
        self.doc_id = None
        self.chunks_created = 0
        self.embeddings_created = 0
        self.error = None
        self.extracted_text_length = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            'success': self.success,
            'doc_id': self.doc_id,
            'chunks_created': self.chunks_created,
            'embeddings_created': self.embeddings_created,
            'extracted_text_length': self.extracted_text_length,
            'error': self.error
        }


def ingest_document(
    doc_id: int,
    storage_uri: str,
    mime_type: str = None,
    doc_name: str = None,
    doc_type: str = None,
    project_id: int = None,
    entity_ids: List[int] = None,
    tags: List[str] = None,
    skip_if_exists: bool = True
) -> DocumentIngestionResult:
    """
    Full ingestion pipeline for a single document.

    Args:
        doc_id: Document ID from core_doc
        storage_uri: URL to document file
        mime_type: MIME type of document
        doc_name: Original filename
        doc_type: Document category
        project_id: Associated project
        entity_ids: Related knowledge entity IDs
        tags: Tags for filtering
        skip_if_exists: Skip if document already has embeddings

    Returns:
        DocumentIngestionResult with status
    """
    result = DocumentIngestionResult()
    result.doc_id = doc_id

    # Check if already processed
    if skip_if_exists:
        existing = KnowledgeEmbedding.objects.filter(
            source_type='document_chunk',
            source_id=doc_id
        ).exists()

        if existing:
            result.success = True
            result.error = "Already processed (skipped)"
            return result

    # Step 1: Extract text
    extracted_text, extract_error = extract_text_from_url(storage_uri, mime_type)

    if extract_error or not extracted_text:
        result.error = extract_error or "No text extracted"
        return result

    result.extracted_text_length = len(extracted_text)

    # Step 2: Chunk text
    chunks = chunk_document_with_sections(
        text=extracted_text,
        doc_name=doc_name,
        doc_type=doc_type,
        project_id=project_id
    )

    if not chunks:
        result.error = "No chunks generated"
        return result

    result.chunks_created = len(chunks)

    # Step 3: Generate and store embeddings
    with transaction.atomic():
        # Clear any existing embeddings for this doc (if re-processing)
        KnowledgeEmbedding.objects.filter(
            source_type='document_chunk',
            source_id=doc_id
        ).delete()

        for chunk in chunks:
            # Build content with context for better embeddings
            content_with_context = _build_embedding_content(chunk, doc_name, doc_type)

            # Build tags
            chunk_tags = list(tags or [])
            if doc_type:
                chunk_tags.append(f"doc_type:{doc_type}")
            chunk_tags.append(f"chunk:{chunk['chunk_index']+1}/{chunk['total_chunks']}")

            embedding_id = store_embedding(
                content_text=content_with_context,
                source_type='document_chunk',
                source_id=doc_id,
                entity_ids=entity_ids or [],
                tags=chunk_tags
            )

            if embedding_id:
                result.embeddings_created += 1

    result.success = result.embeddings_created > 0

    if not result.success:
        result.error = "Failed to create embeddings"

    return result


def _build_embedding_content(chunk: Dict, doc_name: str = None, doc_type: str = None) -> str:
    """
    Build content string with context for better semantic matching.
    """
    parts = []

    if doc_name:
        parts.append(f"Document: {doc_name}")
    if doc_type:
        parts.append(f"Type: {doc_type}")

    parts.append(chunk['content'])

    return "\n".join(parts)


def ingest_documents_batch(
    documents: List[Dict[str, Any]],
    skip_if_exists: bool = True,
    progress_callback=None
) -> Dict[str, Any]:
    """
    Ingest multiple documents.

    Args:
        documents: List of dicts with doc_id, storage_uri, mime_type, etc.
        skip_if_exists: Skip already processed docs
        progress_callback: Optional callback(current, total, result)

    Returns:
        Summary dict with counts
    """
    results = {
        'total': len(documents),
        'successful': 0,
        'skipped': 0,
        'failed': 0,
        'total_chunks': 0,
        'total_embeddings': 0,
        'errors': []
    }

    for i, doc in enumerate(documents):
        result = ingest_document(
            doc_id=doc['doc_id'],
            storage_uri=doc['storage_uri'],
            mime_type=doc.get('mime_type'),
            doc_name=doc.get('doc_name'),
            doc_type=doc.get('doc_type'),
            project_id=doc.get('project_id'),
            entity_ids=doc.get('entity_ids'),
            tags=doc.get('tags'),
            skip_if_exists=skip_if_exists
        )

        if result.success:
            if 'skipped' in (result.error or ''):
                results['skipped'] += 1
            else:
                results['successful'] += 1
                results['total_chunks'] += result.chunks_created
                results['total_embeddings'] += result.embeddings_created
        else:
            results['failed'] += 1
            results['errors'].append({
                'doc_id': doc['doc_id'],
                'error': result.error
            })

        if progress_callback:
            progress_callback(i + 1, len(documents), result)

    return results
