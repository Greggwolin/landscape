"""URL routing for Market Intelligence application."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AIIngestionHistoryViewSet, MarketReportViewSet

router = DefaultRouter()
router.register(r'ingestions', AIIngestionHistoryViewSet, basename='ai-ingestion')
router.register(r'reports', MarketReportViewSet, basename='market-report')

urlpatterns = [
    path('', include(router.urls)),
]
