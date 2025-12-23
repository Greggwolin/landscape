"""
Django signals for automatic document processing.

Wire up auto-queueing of documents when they're uploaded.
"""
import logging

logger = logging.getLogger(__name__)


def auto_queue_document(doc_id: int, project_id: int = None):
    """
    Queue a document for processing after upload.
    Called from DMS upload flow or signal.

    Args:
        doc_id: Document ID from core_doc
        project_id: Project ID (for filtering)
    """
    from .services.document_processor import queue_document_for_processing

    try:
        queue_document_for_processing(doc_id, project_id, priority=0)
        logger.info(f"Auto-queued document {doc_id} for processing")
    except Exception as e:
        logger.error(f"Failed to auto-queue document {doc_id}: {e}")


# Django signal handler (if you have a CoreDoc Django model)
# Uncomment and adapt if using Django models for core_doc
#
# from django.db.models.signals import post_save
# from django.dispatch import receiver
# from dms.models import CoreDoc
#
# @receiver(post_save, sender=CoreDoc)
# def on_document_created(sender, instance, created, **kwargs):
#     """Auto-queue newly created documents for processing."""
#     if created and instance.storage_uri:
#         auto_queue_document(instance.doc_id, instance.project_id)
