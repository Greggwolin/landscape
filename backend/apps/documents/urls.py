"""URL routing for Documents application."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, DocumentFolderViewSet

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'folders', DocumentFolderViewSet, basename='document-folder')

urlpatterns = [
    path('', include(router.urls)),
]
