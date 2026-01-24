"""
Narrative URLs

URL configuration for narrative collaboration endpoints.
"""

from django.urls import path

from .views import (
    ProjectNarrativeView,
    ProjectNarrativeVersionsView,
    ProjectNarrativeVersionDetailView,
    ProjectNarrativeStatusView,
    SendForReviewView,
    ReviewStatusView,
    ApplyChangesView,
    FollowUpView,
)

urlpatterns = [
    path(
        'projects/<int:project_id>/narrative/<str:approach_type>/',
        ProjectNarrativeView.as_view(),
        name='project-narrative',
    ),
    path(
        'projects/<int:project_id>/narrative/<str:approach_type>/send-for-review/',
        SendForReviewView.as_view(),
        name='project-narrative-send-for-review',
    ),
    path(
        'projects/<int:project_id>/narrative/<str:approach_type>/apply-changes/',
        ApplyChangesView.as_view(),
        name='project-narrative-apply-changes',
    ),
    path(
        'projects/<int:project_id>/narrative/<str:approach_type>/review-status/',
        ReviewStatusView.as_view(),
        name='project-narrative-review-status',
    ),
    path(
        'projects/<int:project_id>/narrative/<str:approach_type>/follow-up/',
        FollowUpView.as_view(),
        name='project-narrative-follow-up',
    ),
    path(
        'projects/<int:project_id>/narrative/<str:approach_type>/versions/',
        ProjectNarrativeVersionsView.as_view(),
        name='project-narrative-versions',
    ),
    path(
        'projects/<int:project_id>/narrative/<str:approach_type>/versions/<int:version_number>/',
        ProjectNarrativeVersionDetailView.as_view(),
        name='project-narrative-version-detail',
    ),
    path(
        'projects/<int:project_id>/narrative/<str:approach_type>/versions/<int:version_number>/status/',
        ProjectNarrativeStatusView.as_view(),
        name='project-narrative-version-status',
    ),
]
