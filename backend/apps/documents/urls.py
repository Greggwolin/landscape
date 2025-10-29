"""URL routing for Documents application."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DocumentViewSet,
    DocumentFolderViewSet,
    upload_document,
    get_staging_data,
    commit_staging_data
)

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'folders', DocumentFolderViewSet, basename='document-folder')

urlpatterns = [
    path('', include(router.urls)),
    # Document upload and extraction endpoints
    path('upload/', upload_document, name='upload_document'),
    path('staging/<int:doc_id>/', get_staging_data, name='get_staging'),
    path('staging/<int:doc_id>/commit/', commit_staging_data, name='commit_staging'),
]
