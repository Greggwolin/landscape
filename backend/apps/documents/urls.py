"""URL routing for Documents application."""

print("DOCS URL IMPORT CHECKPOINT: django.urls")
from django.urls import path, include
print("DOCS URL IMPORT CHECKPOINT: rest_framework.routers")
from rest_framework.routers import DefaultRouter
print("DOCS URL IMPORT CHECKPOINT: apps.documents.views")
from .views import (
    DocumentViewSet,
    DocumentFolderViewSet,
    upload_document,
    get_staging_data,
    commit_staging_data,
    check_upload_collision,
    upload_new_version,
    soft_delete_document,
    rename_document,
)
print("DOCS URL IMPORT CHECKPOINT: apps.documents.api.corrections")
from .api.corrections import ExtractionReviewViewSet
print("DOCS URL IMPORT CHECKPOINT: apps.documents.api.section_detection")
from .api.section_detection import DocumentSectionViewSet

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'folders', DocumentFolderViewSet, basename='document-folder')
router.register(r'extractions', ExtractionReviewViewSet, basename='extraction')
router.register(r'document-sections', DocumentSectionViewSet, basename='document-section')

urlpatterns = [
    path('', include(router.urls)),
    # Document upload and extraction endpoints
    path('upload/', upload_document, name='upload_document'),
    path('staging/<int:doc_id>/', get_staging_data, name='get_staging'),
    path('staging/<int:doc_id>/commit/', commit_staging_data, name='commit_staging'),
    # Versioning and collision detection endpoints
    path('projects/<int:project_id>/check-collision/', check_upload_collision, name='check_upload_collision'),
    path('projects/<int:project_id>/docs/<int:doc_id>/version/', upload_new_version, name='upload_new_version'),
    path('projects/<int:project_id>/docs/<int:doc_id>/delete/', soft_delete_document, name='soft_delete_document'),
    path('projects/<int:project_id>/docs/<int:doc_id>/rename/', rename_document, name='rename_document'),
]
