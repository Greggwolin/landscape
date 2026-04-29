"""URL routes for the artifacts app (Finding #4 Phase 1)."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ArtifactViewSet


router = DefaultRouter()
router.register(r'artifacts', ArtifactViewSet, basename='artifact')

urlpatterns = [
    path('', include(router.urls)),
]
