"""URL routing for Calculations application."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CalculationViewSet

router = DefaultRouter()
router.register(r'calculations', CalculationViewSet, basename='calculation')

urlpatterns = [
    path('', include(router.urls)),
]
