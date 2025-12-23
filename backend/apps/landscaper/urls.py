"""URL routing for Landscaper AI app."""

from django.urls import path
from .views import (
    ChatMessageViewSet,
    VarianceView,
    ActivityFeedViewSet,
    ExtractionMappingViewSet,
    ExtractionLogViewSet,
)

# Project-scoped endpoints
urlpatterns = [
    # Chat endpoints
    path(
        'projects/<int:project_id>/landscaper/chat/',
        ChatMessageViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='landscaper-chat'
    ),

    # Variance analysis endpoint
    path(
        'projects/<int:project_id>/landscaper/variances/',
        VarianceView.as_view(),
        name='landscaper-variances'
    ),

    # Activity feed endpoints
    path(
        'projects/<int:project_id>/landscaper/activities/',
        ActivityFeedViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='landscaper-activities'
    ),
    path(
        'projects/<int:project_id>/landscaper/activities/<int:pk>/mark-read/',
        ActivityFeedViewSet.as_view({
            'post': 'mark_read',
        }),
        name='landscaper-activity-mark-read'
    ),
    path(
        'projects/<int:project_id>/landscaper/activities/mark-all-read/',
        ActivityFeedViewSet.as_view({
            'post': 'mark_all_read',
        }),
        name='landscaper-activities-mark-all-read'
    ),

    # ========================================================================
    # Extraction Mapping Admin Endpoints (not project-scoped)
    # ========================================================================

    # Extraction mappings CRUD
    path(
        'landscaper/mappings/',
        ExtractionMappingViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='extraction-mappings'
    ),
    path(
        'landscaper/mappings/<int:pk>/',
        ExtractionMappingViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy',
        }),
        name='extraction-mapping-detail'
    ),

    # Mapping utilities
    path(
        'landscaper/mappings/stats/',
        ExtractionMappingViewSet.as_view({
            'get': 'stats',
        }),
        name='extraction-mappings-stats'
    ),
    path(
        'landscaper/mappings/bulk-toggle/',
        ExtractionMappingViewSet.as_view({
            'post': 'bulk_toggle',
        }),
        name='extraction-mappings-bulk-toggle'
    ),
    path(
        'landscaper/mappings/document-types/',
        ExtractionMappingViewSet.as_view({
            'get': 'document_types',
        }),
        name='extraction-mappings-document-types'
    ),
    path(
        'landscaper/mappings/target-tables/',
        ExtractionMappingViewSet.as_view({
            'get': 'target_tables',
        }),
        name='extraction-mappings-target-tables'
    ),

    # Extraction logs
    path(
        'landscaper/logs/',
        ExtractionLogViewSet.as_view({
            'get': 'list',
        }),
        name='extraction-logs'
    ),
    path(
        'landscaper/logs/<int:pk>/',
        ExtractionLogViewSet.as_view({
            'get': 'retrieve',
        }),
        name='extraction-log-detail'
    ),
    path(
        'landscaper/logs/<int:pk>/review/',
        ExtractionLogViewSet.as_view({
            'post': 'review',
        }),
        name='extraction-log-review'
    ),
]
