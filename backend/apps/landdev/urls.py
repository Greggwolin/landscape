"""URL routing for Land Development app."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import LandPlanningViewSet, AcreageAllocationViewSet

router = DefaultRouter()
router.register(r'planning', LandPlanningViewSet, basename='land-planning')

# Acreage allocation CRUD — project-scoped
allocation_list = AcreageAllocationViewSet.as_view({
    'get': 'list',
    'post': 'create',
})
allocation_detail = AcreageAllocationViewSet.as_view({
    'put': 'update',
    'delete': 'destroy',
})
allocation_types = AcreageAllocationViewSet.as_view({
    'get': 'allocation_types',
})

urlpatterns = [
    path('', include(router.urls)),

    # /api/landdev/projects/{project_id}/allocations/
    path(
        'projects/<int:project_id>/allocations/',
        allocation_list,
        name='allocation-list',
    ),
    # /api/landdev/projects/{project_id}/allocations/types/
    path(
        'projects/<int:project_id>/allocations/types/',
        allocation_types,
        name='allocation-types',
    ),
    # /api/landdev/projects/{project_id}/allocations/{pk}/
    path(
        'projects/<int:project_id>/allocations/<int:pk>/',
        allocation_detail,
        name='allocation-detail',
    ),
]
