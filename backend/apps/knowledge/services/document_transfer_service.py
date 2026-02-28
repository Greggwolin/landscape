"""
Service to transfer project documents to Platform Knowledge before project deletion.

Iterates a project's indexed documents, ingests each into the platform knowledge
store (chunking + embedding), and returns a summary of results.
"""

import logging
from typing import Any, Dict

from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.documents.models import Document
from ..models import PlatformKnowledge, PlatformKnowledgeChunk
from .text_extraction import extract_text_and_page_count_from_url
from .chunking import chunk_text
from .embedding_service import generate_embedding
from .source_registry_service import refresh_source_document_counts

logger = logging.getLogger(__name__)

# Statuses worth transferring — skip drafts and failed docs
TRANSFERABLE_STATUSES = ('indexed', 'processing', 'archived')


def _store_embedding(chunk_id: int, embedding: list) -> None:
    """Store a vector embedding for a platform knowledge chunk."""
    from django.db import connection

    embedding_str = '[' + ','.join(str(x) for x in embedding) + ']'
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE landscape.tbl_platform_knowledge_chunks
            SET embedding = %s::vector
            WHERE id = %s
            """,
            [embedding_str, chunk_id],
        )


def _ensure_unique_key(base_key: str) -> str:
    """Generate a unique document_key for platform knowledge."""
    candidate = base_key or f"transferred-{int(timezone.now().timestamp())}"
    if not PlatformKnowledge.objects.filter(document_key=candidate).exists():
        return candidate
    suffix = 1
    while PlatformKnowledge.objects.filter(document_key=f"{candidate}-{suffix}").exists():
        suffix += 1
    return f"{candidate}-{suffix}"


def transfer_project_documents_to_platform(project_id: int) -> Dict[str, Any]:
    """
    Transfer all eligible project documents into platform knowledge.

    Returns:
        {
            "transferred": int,
            "failed": int,
            "skipped": int,
            "details": [{ "doc_id": ..., "doc_name": ..., "status": "transferred"|"failed"|"skipped", "error": ... }]
        }
    """
    documents = Document.objects.filter(
        project_id=project_id,
        deleted_at__isnull=True,
    )

    results = {
        'transferred': 0,
        'failed': 0,
        'skipped': 0,
        'details': [],
    }

    for doc in documents:
        detail = {
            'doc_id': doc.doc_id,
            'doc_name': doc.doc_name,
            'status': 'skipped',
            'error': None,
        }

        # Skip docs that aren't worth transferring
        if doc.status not in TRANSFERABLE_STATUSES:
            detail['error'] = f'Status "{doc.status}" not eligible for transfer'
            results['skipped'] += 1
            results['details'].append(detail)
            continue

        # Skip docs without a storage URI
        if not doc.storage_uri:
            detail['error'] = 'No storage_uri'
            results['skipped'] += 1
            results['details'].append(detail)
            continue

        try:
            _transfer_single_document(doc)
            detail['status'] = 'transferred'
            results['transferred'] += 1
        except Exception as exc:
            logger.exception(
                'Failed to transfer document %s (doc_id=%s) to platform knowledge',
                doc.doc_name,
                doc.doc_id,
            )
            detail['status'] = 'failed'
            detail['error'] = str(exc)
            results['failed'] += 1

        results['details'].append(detail)

    # Update source document counts after bulk transfer
    try:
        refresh_source_document_counts()
    except Exception:
        logger.warning('Failed to refresh source document counts after transfer')

    return results


def _transfer_single_document(doc: Document) -> None:
    """Ingest a single project document into platform knowledge."""

    # Extract text
    text, page_count, error = extract_text_and_page_count_from_url(
        doc.storage_uri, doc.mime_type
    )
    if error or not text:
        raise ValueError(error or 'No text could be extracted')

    # Generate chunks
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError('No chunks generated from document text')

    # Build the platform knowledge record
    base_title = doc.doc_name.rsplit('.', 1)[0] if '.' in doc.doc_name else doc.doc_name
    document_key = _ensure_unique_key(
        slugify(f"transferred-{base_title}")[:90]
    )

    with transaction.atomic():
        pk_doc = PlatformKnowledge.objects.create(
            document_key=document_key,
            title=base_title,
            subtitle=None,
            edition=None,
            publisher=None,
            source=None,
            publication_year=None,
            knowledge_domain='other',
            property_types=[],
            description=f'Transferred from project (project_id={doc.project_id}) during project deletion.',
            metadata={
                'transfer_source': 'project_deletion',
                'original_project_id': doc.project_id,
                'original_doc_id': doc.doc_id,
                'original_doc_type': doc.doc_type,
                'original_discipline': doc.discipline,
                'transferred_at': timezone.now().isoformat(),
            },
            total_chapters=0,
            total_pages=page_count,
            file_path=doc.storage_uri,
            file_hash=doc.sha256_hash,
            file_size_bytes=doc.file_size_bytes,
            ingestion_status=PlatformKnowledge.IngestionStatus.PROCESSING,
            created_by='system:project_delete_transfer',
        )

        for chunk in chunks:
            chunk_record = PlatformKnowledgeChunk.objects.create(
                document=pk_doc,
                chapter=None,
                chunk_index=chunk['chunk_index'],
                content=chunk['content'],
                content_type=PlatformKnowledgeChunk.ContentType.TEXT,
                page_number=None,
                section_path=None,
                token_count=len(chunk['content'].split()),
            )
            embedding = generate_embedding(chunk['content'])
            if embedding:
                _store_embedding(chunk_record.id, embedding)

        pk_doc.ingestion_status = PlatformKnowledge.IngestionStatus.INDEXED
        pk_doc.last_indexed_at = timezone.now()
        pk_doc.chunk_count = len(chunks)
        pk_doc.save(update_fields=['ingestion_status', 'last_indexed_at', 'chunk_count'])
