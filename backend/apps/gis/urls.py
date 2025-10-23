"""URL routing for GIS application."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GISViewSet

router = DefaultRouter()
router.register(r'', GISViewSet, basename='gis')

urlpatterns = [
    path('', include(router.urls)),
]
