"""URL routing for Landscaper AI app."""

from django.urls import path
from .views import ChatMessageViewSet, VarianceView

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
]
