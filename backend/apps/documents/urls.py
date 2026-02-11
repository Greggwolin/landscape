"""URL routing for Documents application."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
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
    restore_document,
    permanent_delete_document,
)
from .media_views import (
    scan_document_media,
    extract_document_media,
    classify_document_media,
    reclassify_document_media,
    list_document_media,
    submit_media_actions,
    media_links,
    delete_media_link,
    reorder_media_links,
    available_media,
)
from .api.corrections import ExtractionReviewViewSet
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
    path('projects/<int:project_id>/docs/<int:doc_id>/restore/', restore_document, name='restore_document'),
    path('projects/<int:project_id>/docs/<int:doc_id>/permanent-delete/', permanent_delete_document, name='permanent_delete_document'),
    # Media extraction and classification endpoints
    path('documents/<int:doc_id>/media/', list_document_media, name='list_document_media'),
    path('documents/<int:doc_id>/media/scan/', scan_document_media, name='scan_document_media'),
    path('documents/<int:doc_id>/media/extract/', extract_document_media, name='extract_document_media'),
    path('documents/<int:doc_id>/media/classify/', classify_document_media, name='classify_document_media'),
    path('documents/<int:doc_id>/media/reclassify/', reclassify_document_media, name='reclassify_document_media'),
    path('documents/<int:doc_id>/media/actions/', submit_media_actions, name='submit_media_actions'),
    # Media entity linking endpoints
    path('media/links/', media_links, name='media_links'),
    path('media/links/<int:link_id>/', delete_media_link, name='delete_media_link'),
    path('media/links/reorder/', reorder_media_links, name='reorder_media_links'),
    path('media/available/', available_media, name='available_media'),
]
