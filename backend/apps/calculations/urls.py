"""URL routing for Calculations application."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CalculationViewSet
from .views_renovation import RenovationScheduleView, CostToCompleteView

router = DefaultRouter()
router.register(r'calculations', CalculationViewSet, basename='calculation')

urlpatterns = [
    path('', include(router.urls)),
    path(
        'projects/<int:project_id>/renovation/schedule/',
        RenovationScheduleView.as_view(),
        name='renovation-schedule',
    ),
    path(
        'projects/<int:project_id>/renovation/cost-to-complete/',
        CostToCompleteView.as_view(),
        name='renovation-cost-to-complete',
    ),
]
