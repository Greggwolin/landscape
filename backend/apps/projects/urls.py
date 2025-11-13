"""
URL configuration for projects app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet
from .views_preferences import UserPreferenceViewSet
from apps.market_intel.views import RentComparableViewSet, MarketRateAnalysisViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'user-preferences', UserPreferenceViewSet, basename='user-preference')

# Custom URL patterns for nested resources
urlpatterns = [
    path('', include(router.urls)),
    # Rent comparables endpoints
    path('projects/<int:project_pk>/comparables/',
         RentComparableViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='project-comparables-list'),
    path('projects/<int:project_pk>/comparables/<int:pk>/',
         RentComparableViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='project-comparables-detail'),
    # Market rates endpoints
    path('projects/<int:project_pk>/market-rates/',
         MarketRateAnalysisViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='project-market-rates-list'),
    path('projects/<int:project_pk>/market-rates/<int:pk>/',
         MarketRateAnalysisViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='project-market-rates-detail'),
    path('projects/<int:project_pk>/market-rates/calculate/',
         MarketRateAnalysisViewSet.as_view({'post': 'calculate'}),
         name='project-market-rates-calculate'),
]
