"""URL routing for GIS application."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GISViewSet, parcel_query, parcel_ingest

router = DefaultRouter()
router.register(r'', GISViewSet, basename='gis')

urlpatterns = [
    path('parcel-query/', parcel_query, name='parcel-query'),
    path('parcel-ingest/', parcel_ingest, name='parcel-ingest'),
    path('', include(router.urls)),
]
