"""
URL configuration for projects app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, AnalysisTypeConfigViewSet, AnalysisDraftViewSet
from .views_preferences import UserPreferenceViewSet
from apps.market_intel.views import RentComparableViewSet, MarketRateAnalysisViewSet, MarketCompetitiveProjectViewSet, MarketMacroDataViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'user-preferences', UserPreferenceViewSet, basename='user-preference')
router.register(r'config/analysis-types', AnalysisTypeConfigViewSet, basename='analysis-type-config')
router.register(r'drafts', AnalysisDraftViewSet, basename='analysis-draft')

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
    # Market competitive projects endpoints (land development comps)
    path('projects/<int:project_pk>/market/competitors/',
         MarketCompetitiveProjectViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='project-market-competitors-list'),
    path('projects/<int:project_pk>/market/competitors/<int:pk>/',
         MarketCompetitiveProjectViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='project-market-competitors-detail'),
    # Market macro data endpoints
    path('projects/<int:project_pk>/market/macro/',
         MarketMacroDataViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='project-market-macro-list'),
    path('projects/<int:project_pk>/market/macro/<int:pk>/',
         MarketMacroDataViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='project-market-macro-detail'),
]
