"""URL routing for Landscaper AI app."""

from django.urls import path
from .views import ChatMessageViewSet, VarianceView, ActivityFeedViewSet

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
]
