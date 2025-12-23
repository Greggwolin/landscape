"""
Knowledge API URLs
"""

from django.urls import path
from .views import session_views, extraction_views, status_views

urlpatterns = [
    # Session management
    path('sessions/start/', session_views.start_session, name='knowledge-session-start'),
    path('sessions/<uuid:session_id>/end/', session_views.end_session, name='knowledge-session-end'),
    path('sessions/<uuid:session_id>/context/', session_views.get_session_context, name='knowledge-session-context'),

    # Project-level extraction endpoints
    path('projects/<int:project_id>/extract/', extraction_views.extract_data, name='knowledge-extract'),
    path('projects/<int:project_id>/extract-all/', extraction_views.extract_project_v3, name='knowledge-extract-all'),
    path('projects/<int:project_id>/extractions/', extraction_views.get_all_extractions, name='knowledge-extractions'),
    path('projects/<int:project_id>/extractions/pending/', extraction_views.get_pending_extractions, name='knowledge-extractions-pending'),
    path('projects/<int:project_id>/extractions/<int:extraction_id>/', extraction_views.delete_extraction, name='knowledge-extraction-detail'),
    path('projects/<int:project_id>/extractions/<int:extraction_id>/validate/', extraction_views.validate_extraction, name='knowledge-extraction-validate'),
    path('projects/<int:project_id>/extractions/<int:extraction_id>/validate-v2/', extraction_views.validate_extraction_v2, name='knowledge-extraction-validate-v2'),
    path('projects/<int:project_id>/extractions/bulk-validate/', extraction_views.bulk_validate_extractions, name='knowledge-extractions-bulk-validate'),
    path('projects/<int:project_id>/documents/classify/', extraction_views.classify_project_documents, name='knowledge-classify-project-docs'),

    # Document-level extraction endpoints (registry-based v3)
    path('documents/<int:doc_id>/extract/', extraction_views.extract_document_v3, name='knowledge-extract-doc'),
    path('documents/<int:doc_id>/extract-batched/', extraction_views.extract_document_batched, name='knowledge-extract-doc-batched'),
    path('documents/<int:doc_id>/extract-rent-roll/', extraction_views.extract_rent_roll, name='knowledge-extract-rent-roll'),
    path('documents/<int:doc_id>/classify/', extraction_views.classify_document, name='knowledge-classify-doc'),
    path('documents/<int:doc_id>/extractable-fields/', extraction_views.preview_extractable_fields, name='knowledge-extractable-fields'),

    # Field registry endpoints
    path('field-registry/', extraction_views.get_field_registry, name='knowledge-field-registry'),
    path('fields/<str:doc_type>/', extraction_views.get_fields_for_doc_type, name='knowledge-fields-for-doc-type'),
    path('extraction-types/', extraction_views.get_extraction_types, name='knowledge-extraction-types'),

    # Extraction history report endpoints
    path('projects/<int:project_id>/extraction-history/', extraction_views.get_extraction_history, name='knowledge-extraction-history'),
    path('projects/<int:project_id>/extraction-history/<str:field_key>/', extraction_views.get_field_history, name='knowledge-field-history'),

    # Extraction approval workflow endpoints
    path('projects/<int:project_id>/extractions/<int:extraction_id>/status/', extraction_views.update_extraction_status, name='knowledge-extraction-status'),
    path('projects/<int:project_id>/extractions/bulk-status/', extraction_views.bulk_update_status, name='knowledge-extractions-bulk-status'),
    path('projects/<int:project_id>/extractions/approve-high-confidence/', extraction_views.approve_high_confidence, name='knowledge-extractions-approve-high-confidence'),

    # Status endpoints
    path('projects/<int:project_id>/processing-status/', status_views.get_project_processing_status, name='knowledge-processing-status'),
    path('projects/<int:project_id>/confidence/', status_views.get_project_confidence, name='knowledge-confidence'),
    path('projects/<int:project_id>/context/', status_views.get_project_context_summary, name='knowledge-context'),
    path('projects/<int:project_id>/reprocess-failed/', status_views.reprocess_project_failed, name='knowledge-reprocess-failed'),
    path('documents/<int:doc_id>/status/', status_views.get_document_status, name='knowledge-doc-status'),
    path('documents/<int:doc_id>/queue/', status_views.queue_document, name='knowledge-doc-queue'),
    path('documents/<int:doc_id>/reprocess/', status_views.reprocess_document, name='knowledge-doc-reprocess'),
    path('documents/<int:doc_id>/process/', status_views.process_document_now, name='knowledge-doc-process'),
    path('queue/status/', status_views.get_queue_status, name='knowledge-queue-status'),
]
