"""URL routing for benchmarks app."""

from rest_framework.routers import DefaultRouter
from .views_absorption import (
    AbsorptionVelocityViewSet,
    LandscaperAbsorptionDetailViewSet,
)

router = DefaultRouter()
router.register(r'benchmarks/absorption-velocity', AbsorptionVelocityViewSet, basename='absorption-velocity')
router.register(r'benchmarks/landscaper-absorption', LandscaperAbsorptionDetailViewSet, basename='landscaper-absorption')

urlpatterns = router.urls

