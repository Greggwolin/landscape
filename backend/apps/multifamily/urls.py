"""URL routing for Multifamily application."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MultifamilyUnitViewSet,
    MultifamilyUnitTypeViewSet,
    MultifamilyLeaseViewSet,
    MultifamilyTurnViewSet,
    MultifamilyReportViewSet,
)

router = DefaultRouter()
router.register(r'units', MultifamilyUnitViewSet, basename='multifamily-unit')
router.register(r'unit-types', MultifamilyUnitTypeViewSet, basename='multifamily-unit-type')
router.register(r'leases', MultifamilyLeaseViewSet, basename='multifamily-lease')
router.register(r'turns', MultifamilyTurnViewSet, basename='multifamily-turn')
router.register(r'reports', MultifamilyReportViewSet, basename='multifamily-report')

urlpatterns = [
    path('', include(router.urls)),
]
