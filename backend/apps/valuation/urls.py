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
    ProjectLandComparablesView,
    LandComparableDetailView,
    LandComparableAdjustmentsView,
    LandComparableAdjustmentDetailView,
    ContainerCostMetadataView,
    ProjectDepreciationView,
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

urlpatterns += [
    path(
        'projects/<int:project_id>/valuation/land-comps/',
        ProjectLandComparablesView.as_view(),
        name='project-land-comparables'
    ),
    path(
        'projects/<int:project_id>/valuation/land-comps/<int:comp_id>/',
        LandComparableDetailView.as_view(),
        name='project-land-comparable-detail'
    ),
    path(
        'projects/<int:project_id>/valuation/land-comps/<int:comp_id>/adjustments/',
        LandComparableAdjustmentsView.as_view(),
        name='land-comparable-adjustments'
    ),
    path(
        'projects/<int:project_id>/valuation/land-comps/<int:comp_id>/adjustments/<int:adj_id>/',
        LandComparableAdjustmentDetailView.as_view(),
        name='land-comparable-adjustment-detail'
    ),
    path(
        'containers/<int:container_id>/cost-metadata/',
        ContainerCostMetadataView.as_view(),
        name='container-cost-metadata'
    ),
    path(
        'projects/<int:project_id>/valuation/depreciation/',
        ProjectDepreciationView.as_view(),
        name='project-depreciation'
    ),
]
