"""URL routing for Land Development app."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import LandPlanningViewSet

router = DefaultRouter()
router.register(r'planning', LandPlanningViewSet, basename='land-planning')

urlpatterns = [
    path('', include(router.urls)),
]
