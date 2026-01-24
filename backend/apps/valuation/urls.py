"""
Valuation URLs

URL configuration for narrative versioning API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    NarrativeVersionViewSet,
    NarrativeCommentViewSet,
    NarrativeChangeViewSet,
    ProjectNarrativeView,
    ProjectNarrativeVersionsView,
)

router = DefaultRouter()
router.register(r'narrative-versions', NarrativeVersionViewSet, basename='narrative-version')
router.register(r'narrative-comments', NarrativeCommentViewSet, basename='narrative-comment')
router.register(r'narrative-changes', NarrativeChangeViewSet, basename='narrative-change')

urlpatterns = [
    # ViewSet routes
    path('', include(router.urls)),

    # Project-scoped narrative routes
    path(
        'projects/<int:project_id>/narrative/<str:approach_type>/',
        ProjectNarrativeView.as_view(),
        name='project-narrative'
    ),
    path(
        'projects/<int:project_id>/narrative/<str:approach_type>/versions/',
        ProjectNarrativeVersionsView.as_view(),
        name='project-narrative-versions'
    ),
]
