"""
Automatic document processing pipeline.
Handles: upload → extract → chunk → embed → ready

This service processes documents through the full RAG pipeline:
1. Extract text from document (PDF, DOCX, TXT)
2. Chunk text into semantic units
3. Generate embeddings for each chunk
4. Update processing status for visibility
"""
import logging
from typing import Optional, Dict, Any, List, Callable
from django.db import connection, transaction

from .text_extraction import extract_text_from_url
from .chunking import chunk_document_with_sections
from .embedding_storage import store_embedding
from ..models import KnowledgeEmbedding

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """
    Processes documents through the full pipeline:
    extract text → chunk → generate embeddings
    """

    def __init__(self):
        self.status_callbacks: List[Callable] = []

    def on_status_change(self, callback: Callable):
        """Register callback for status updates."""
        self.status_callbacks.append(callback)

    def _update_status(self, doc_id: int, status: str, error: str = None, **kwargs):
        """Update document processing status in core_doc."""
        with connection.cursor() as cursor:
            updates = ["processing_status = %s"]
            params = [status]

            if status == 'extracting':
                updates.append("processing_started_at = NOW()")
            elif status in ('ready', 'failed', 'skipped'):
                updates.append("processing_completed_at = NOW()")

            if error:
                updates.append("processing_error = %s")
                params.append(error)
            else:
                # Clear error on non-error status updates
                updates.append("processing_error = NULL")

            if 'chunks_count' in kwargs:
                updates.append("chunks_count = %s")
                params.append(kwargs['chunks_count'])

            if 'embeddings_count' in kwargs:
                updates.append("embeddings_count = %s")
                params.append(kwargs['embeddings_count'])

            params.append(doc_id)

            cursor.execute(f"""
                UPDATE landscape.core_doc
                SET {', '.join(updates)}
                WHERE doc_id = %s
            """, params)

        # Notify callbacks
        for callback in self.status_callbacks:
            try:
                callback(doc_id, status, error)
            except Exception as e:
                logger.warning(f"Status callback failed: {e}")

    def process_document(self, doc_id: int) -> Dict[str, Any]:
        """
        Process a single document through the full pipeline.

        Args:
            doc_id: Document ID from core_doc

        Returns:
            Dict with success status and details
        """
        result = {
            'doc_id': doc_id,
            'success': False,
            'status': 'failed',
            'error': None,
            'chunks_created': 0,
            'embeddings_created': 0,
            'extracted_text_length': 0,
        }

        try:
            # Fetch document info
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT doc_id, storage_uri, mime_type, doc_name, doc_type, project_id
                    FROM landscape.core_doc
                    WHERE doc_id = %s
                """, [doc_id])
                row = cursor.fetchone()

            if not row:
                result['error'] = 'Document not found'
                return result

            doc_id, storage_uri, mime_type, doc_name, doc_type, project_id = row

            if not storage_uri:
                self._update_status(doc_id, 'skipped', 'No storage URI')
                result['status'] = 'skipped'
                result['error'] = 'No storage URI'
                return result

            # === STEP 1: Extract text ===
            logger.info(f"[doc_id={doc_id}] Extracting text from {doc_name or 'unnamed'}...")
            self._update_status(doc_id, 'extracting')

            extracted_text, extract_error = extract_text_from_url(storage_uri, mime_type)

            if extract_error or not extracted_text:
                error_msg = extract_error or 'No text extracted'
                logger.warning(f"[doc_id={doc_id}] Extraction failed: {error_msg}")
                self._update_status(doc_id, 'failed', error_msg)
                result['error'] = error_msg
                return result

            result['extracted_text_length'] = len(extracted_text)
            logger.info(f"[doc_id={doc_id}] Extracted {len(extracted_text)} characters")

            # === STEP 2: Chunk text ===
            logger.info(f"[doc_id={doc_id}] Chunking text...")
            self._update_status(doc_id, 'chunking')

            chunks = chunk_document_with_sections(
                text=extracted_text,
                doc_name=doc_name,
                doc_type=doc_type,
                project_id=project_id
            )

            if not chunks:
                self._update_status(doc_id, 'failed', 'No chunks generated')
                result['error'] = 'No chunks generated'
                return result

            result['chunks_created'] = len(chunks)
            logger.info(f"[doc_id={doc_id}] Created {len(chunks)} chunks")

            # === STEP 3: Generate embeddings ===
            logger.info(f"[doc_id={doc_id}] Generating embeddings...")
            self._update_status(doc_id, 'embedding')

            embeddings_created = 0

            with transaction.atomic():
                # Clear existing embeddings for this doc
                deleted_count = KnowledgeEmbedding.objects.filter(
                    source_type='document_chunk',
                    source_id=doc_id
                ).delete()[0]

                if deleted_count > 0:
                    logger.info(f"[doc_id={doc_id}] Cleared {deleted_count} existing embeddings")

                for chunk in chunks:
                    # Build content with context
                    content_with_context = self._build_embedding_content(chunk, doc_name, doc_type)

                    # Build tags
                    chunk_tags = []
                    if doc_type:
                        chunk_tags.append(f"doc_type:{doc_type}")
                    chunk_tags.append(f"chunk:{chunk['chunk_index']+1}/{chunk['total_chunks']}")

                    # Store embedding (generates vector and saves)
                    embedding_id = store_embedding(
                        content_text=content_with_context,
                        source_type='document_chunk',
                        source_id=doc_id,
                        entity_ids=[project_id] if project_id else [],
                        tags=chunk_tags
                    )

                    if embedding_id:
                        embeddings_created += 1

            result['embeddings_created'] = embeddings_created
            logger.info(f"[doc_id={doc_id}] Created {embeddings_created} embeddings")

            # === STEP 4: Mark complete ===
            if embeddings_created > 0:
                self._update_status(
                    doc_id, 'ready',
                    chunks_count=len(chunks),
                    embeddings_count=embeddings_created
                )
                result['success'] = True
                result['status'] = 'ready'
                logger.info(f"[doc_id={doc_id}] Processing complete - ready for RAG")
            else:
                self._update_status(doc_id, 'failed', 'No embeddings created')
                result['error'] = 'No embeddings created'

            return result

        except Exception as e:
            logger.exception(f"[doc_id={doc_id}] Document processing failed")
            self._update_status(doc_id, 'failed', str(e))
            result['error'] = str(e)
            return result

    def _build_embedding_content(self, chunk: Dict, doc_name: str = None, doc_type: str = None) -> str:
        """Build content string with context for better semantic matching."""
        parts = []

        if doc_name:
            parts.append(f"Document: {doc_name}")
        if doc_type:
            parts.append(f"Type: {doc_type}")

        parts.append(chunk['content'])

        return "\n".join(parts)


# Singleton instance
processor = DocumentProcessor()


def queue_document_for_processing(doc_id: int, project_id: int = None, priority: int = 0):
    """
    Add document to processing queue.

    Args:
        doc_id: Document ID
        project_id: Project ID (for filtering)
        priority: Higher = processed first
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO landscape.doc_processing_queue (doc_id, project_id, priority, status)
            VALUES (%s, %s, %s, 'queued')
            ON CONFLICT (doc_id) DO UPDATE SET
                status = 'queued',
                priority = EXCLUDED.priority,
                attempts = 0,
                error_message = NULL,
                created_at = NOW()
        """, [doc_id, project_id, priority])

        # Also update core_doc status
        cursor.execute("""
            UPDATE landscape.core_doc
            SET processing_status = 'queued',
                processing_error = NULL
            WHERE doc_id = %s
        """, [doc_id])

    logger.info(f"Queued document {doc_id} for processing (priority={priority})")


def process_queue(max_items: int = 10) -> Dict[str, Any]:
    """
    Process pending items in the queue.
    Call this from a cron job or background worker.

    Args:
        max_items: Maximum documents to process in this batch

    Returns:
        Summary of processing results
    """
    results = {
        'processed': 0,
        'succeeded': 0,
        'failed': 0,
        'details': []
    }

    with connection.cursor() as cursor:
        # Get queued items (use FOR UPDATE SKIP LOCKED for concurrent workers)
        cursor.execute("""
            SELECT queue_id, doc_id, project_id
            FROM landscape.doc_processing_queue
            WHERE status = 'queued'
              AND attempts < max_attempts
            ORDER BY priority DESC, created_at ASC
            LIMIT %s
            FOR UPDATE SKIP LOCKED
        """, [max_items])

        items = cursor.fetchall()

    if not items:
        logger.debug("No documents in queue to process")
        return results

    logger.info(f"Processing {len(items)} documents from queue")

    for queue_id, doc_id, project_id in items:
        # Mark as processing
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE landscape.doc_processing_queue
                SET status = 'processing', started_at = NOW(), attempts = attempts + 1
                WHERE queue_id = %s
            """, [queue_id])

        # Process the document
        result = processor.process_document(doc_id)
        results['processed'] += 1
        results['details'].append(result)

        # Update queue status
        with connection.cursor() as cursor:
            if result['success']:
                cursor.execute("""
                    UPDATE landscape.doc_processing_queue
                    SET status = 'completed', completed_at = NOW()
                    WHERE queue_id = %s
                """, [queue_id])
                results['succeeded'] += 1
            else:
                # Check if we should retry or mark as failed
                cursor.execute("""
                    UPDATE landscape.doc_processing_queue
                    SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'queued' END,
                        error_message = %s
                    WHERE queue_id = %s
                """, [result.get('error'), queue_id])
                results['failed'] += 1

    logger.info(f"Queue processing complete: {results['succeeded']} succeeded, {results['failed']} failed")
    return results


def get_queue_stats() -> Dict[str, Any]:
    """Get current queue statistics."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM landscape.doc_processing_queue
            GROUP BY status
        """)
        status_counts = {row[0]: row[1] for row in cursor.fetchall()}

    return {
        'queued': status_counts.get('queued', 0),
        'processing': status_counts.get('processing', 0),
        'completed': status_counts.get('completed', 0),
        'failed': status_counts.get('failed', 0),
    }
