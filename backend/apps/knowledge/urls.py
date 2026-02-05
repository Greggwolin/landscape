"""
Knowledge API URLs
"""

from django.urls import path
from .views import session_views, extraction_views, status_views, chat_views, platform_knowledge_views, benchmark_views, alpha_views

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
    path('projects/<int:project_id>/extractions/apply/', extraction_views.apply_extractions, name='knowledge-extractions-apply'),
    path('projects/<int:project_id>/documents/classify/', extraction_views.classify_project_documents, name='knowledge-classify-project-docs'),

    # Document-level extraction endpoints (registry-based v3)
    path('documents/<int:doc_id>/extract/', extraction_views.extract_document_v3, name='knowledge-extract-doc'),
    path('documents/<int:doc_id>/extract-batched/', extraction_views.extract_document_batched, name='knowledge-extract-doc-batched'),
    path('documents/<int:doc_id>/extract-rent-roll/', extraction_views.extract_rent_roll, name='knowledge-extract-rent-roll'),
    path('documents/<int:doc_id>/classify/', extraction_views.classify_document, name='knowledge-classify-doc'),
    path('documents/<int:doc_id>/extractable-fields/', extraction_views.preview_extractable_fields, name='knowledge-extractable-fields'),
    path('projects/<int:project_id>/rent-roll/compare/', extraction_views.compare_rent_roll, name='knowledge-rent-roll-compare'),
    path('projects/<int:project_id>/snapshots/', extraction_views.list_rent_roll_snapshots, name='knowledge-rent-roll-snapshots'),
    path('projects/<int:project_id>/rollback/<int:snapshot_id>/', extraction_views.rollback_rent_roll_commit, name='knowledge-rent-roll-rollback'),
    path('projects/<int:project_id>/extraction-jobs/', extraction_views.get_extraction_jobs, name='knowledge-extraction-jobs'),
    path('projects/<int:project_id>/extraction-jobs/<int:job_id>/', extraction_views.get_extraction_job, name='knowledge-extraction-job'),
    path('projects/<int:project_id>/extraction-jobs/<int:job_id>/cancel/', extraction_views.cancel_extraction_job, name='knowledge-cancel-extraction-job'),

    # Column discovery & field mapping (CC Prompt C3)
    path('projects/<int:project_id>/discover-columns/', extraction_views.discover_rent_roll_columns, name='knowledge-discover-columns'),
    path('projects/<int:project_id>/apply-mapping/', extraction_views.apply_rent_roll_mapping, name='knowledge-apply-mapping'),

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

    # Canonical chat endpoints
    path('chat/<int:project_id>/', chat_views.chat, name='knowledge_chat'),
    path('chat/<int:project_id>/clear/', chat_views.clear_chat, name='knowledge_chat_clear'),
    # Document-scoped chat endpoint
    path('projects/<int:project_id>/docs/<int:doc_id>/chat/', chat_views.document_chat, name='knowledge_doc_chat'),
    # Platform knowledge ingestion endpoints
    path('platform/analyze/', platform_knowledge_views.analyze_platform_document, name='platform_knowledge_analyze'),
    path('platform/ingest/', platform_knowledge_views.ingest_platform_document, name='platform_knowledge_ingest'),
    path('platform/query/', platform_knowledge_views.query_platform_knowledge, name='platform_knowledge_query'),
    path('platform/alpha-help/', alpha_views.AlphaHelpView.as_view(), name='alpha_help'),
    path('platform/<str:document_key>/chat/', platform_knowledge_views.chat_with_document, name='platform_knowledge_chat'),
    path('platform/<str:document_key>/', platform_knowledge_views.update_platform_knowledge, name='platform_knowledge_update'),
    path('alpha/feedback/', alpha_views.AlphaFeedbackView.as_view(), name='alpha_feedback'),

    # Benchmark endpoints (IREM, BOMA, NAA structured data)
    path('benchmarks/expense/', benchmark_views.get_expense_benchmark, name='benchmark_expense'),
    path('benchmarks/compare/', benchmark_views.compare_expense, name='benchmark_compare'),
    path('benchmarks/summary/', benchmark_views.get_expense_summary, name='benchmark_summary'),
    path('benchmarks/search/', benchmark_views.search_benchmarks, name='benchmark_search'),
    path('benchmarks/trend/', benchmark_views.get_category_trend, name='benchmark_trend'),
]
