"""URL routing for calculations app."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CalculationViewSet, ProjectMetricsView

router = DefaultRouter()
router.register(r'calculations', CalculationViewSet, basename='calculation')

urlpatterns = [
    path('', include(router.urls)),
    # Project-specific metrics endpoint
    path('projects/<int:project_id>/metrics/', ProjectMetricsView.as_view(), name='project-metrics'),
]
