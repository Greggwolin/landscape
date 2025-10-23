"""URL routing for Commercial Real Estate application."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CREPropertyViewSet,
    CRETenantViewSet,
    CRESpaceViewSet,
    CRELeaseViewSet,
)

router = DefaultRouter()
router.register(r'properties', CREPropertyViewSet, basename='cre-property')
router.register(r'tenants', CRETenantViewSet, basename='cre-tenant')
router.register(r'spaces', CRESpaceViewSet, basename='cre-space')
router.register(r'leases', CRELeaseViewSet, basename='cre-lease')

urlpatterns = [
    path('', include(router.urls)),
]
