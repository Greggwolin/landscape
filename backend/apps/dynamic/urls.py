"""
Dynamic Columns URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DynamicColumnViewSet, DynamicColumnValueViewSet

router = DefaultRouter()
router.register(r'columns', DynamicColumnViewSet, basename='dynamic-columns')
router.register(r'values', DynamicColumnValueViewSet, basename='dynamic-values')

urlpatterns = [
    path('projects/<int:project_id>/dynamic/', include(router.urls)),
]
