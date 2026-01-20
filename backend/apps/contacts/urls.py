"""
URL configuration for contacts app.

Provides REST API endpoints for Cabinet, Contact, ContactRole,
ContactRelationship, and ProjectContact operations.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CabinetViewSet,
    ContactViewSet,
    ContactRoleViewSet,
    ProjectContactViewSet,
)

# Main router for top-level resources
router = DefaultRouter()
router.register(r'cabinet', CabinetViewSet, basename='cabinet')
router.register(r'contacts', ContactViewSet, basename='contact')
router.register(r'contact-roles', ContactRoleViewSet, basename='contact-role')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),

    # Project-scoped contact endpoints (nested under projects)
    path(
        'projects/<int:project_pk>/contacts/',
        ProjectContactViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='project-contacts-list'
    ),
    path(
        'projects/<int:project_pk>/contacts/by_category/',
        ProjectContactViewSet.as_view({'get': 'by_category'}),
        name='project-contacts-by-category'
    ),
    path(
        'projects/<int:project_pk>/contacts/<int:pk>/',
        ProjectContactViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='project-contacts-detail'
    ),
]
