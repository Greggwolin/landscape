"""API views for Documents application."""

print("DOCS URL IMPORT CHECKPOINT: rest_framework")
from rest_framework import viewsets, status
print("DOCS URL IMPORT CHECKPOINT: rest_framework.decorators")
from rest_framework.decorators import action, api_view, parser_classes, permission_classes
print("DOCS URL IMPORT CHECKPOINT: rest_framework.parsers")
from rest_framework.parsers import MultiPartParser
print("DOCS URL IMPORT CHECKPOINT: rest_framework.response")
from rest_framework.response import Response
print("DOCS URL IMPORT CHECKPOINT: rest_framework.permissions")
from rest_framework.permissions import AllowAny
print("DOCS URL IMPORT CHECKPOINT: django.core.files.storage")
from django.core.files.storage import default_storage
print("DOCS URL IMPORT CHECKPOINT: django.utils")
from django.utils import timezone
print("DOCS URL IMPORT CHECKPOINT: django.db.models")
from django.db.models import Q
print("DOCS URL IMPORT CHECKPOINT: apps.documents.models")
from .models import Document, DocumentFolder, DMSExtractQueue, DMSAssertion, AICorrectionLog
print("DOCS URL IMPORT CHECKPOINT: apps.documents.serializers")
from .serializers import DocumentSerializer, DocumentFolderSerializer
print("DOCS URL IMPORT CHECKPOINT: apps.multifamily.models")
from apps.multifamily.models import MultifamilyUnitType, MultifamilyUnit, MultifamilyLease
import uuid
import json
import hashlib
import logging

logger = logging.getLogger(__name__)


class DocumentFolderViewSet(viewsets.ModelViewSet):
    """ViewSet for DocumentFolder model."""
    
    queryset = DocumentFolder.objects.filter(is_active=True).all()
    serializer_class = DocumentFolderSerializer
    
    @action(detail=False, methods=['get'], url_path='tree')
    def tree(self, request):
        """Get folder tree structure."""
        root_folders = self.queryset.filter(parent_id__isnull=True)
        serializer = self.get_serializer(root_folders, many=True)
        return Response({'folders': serializer.data})


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Document model.
    
    Endpoints:
    - GET /api/documents/ - List all documents
    - POST /api/documents/ - Create document
    - GET /api/documents/:id/ - Retrieve document
    - PUT /api/documents/:id/ - Update document
    - DELETE /api/documents/:id/ - Delete document
    - GET /api/documents/by_project/:project_id/ - Get documents by project
    """
    
    queryset = Document.objects.select_related('project').all()
    serializer_class = DocumentSerializer
    
    def get_queryset(self):
        """Filter by project_id, doc_type, or status if provided."""
        queryset = self.queryset
        project_id = self.request.query_params.get('project_id')
        doc_type = self.request.query_params.get('doc_type')
        status = self.request.query_params.get('status')
        
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if doc_type:
            queryset = queryset.filter(doc_type=doc_type)
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='by_project/(?P<project_id>[0-9]+)')
    def by_project(self, request, project_id=None):
        """Get all documents for a specific project."""
        documents = self.queryset.filter(project_id=project_id)
        serializer = self.get_serializer(documents, many=True)
        
        # Calculate summary stats
        total_size = sum(doc.file_size_bytes for doc in documents)
        status_counts = {}
        for doc in documents:
            status_counts[doc.status] = status_counts.get(doc.status, 0) + 1
        
        return Response({
            'documents': serializer.data,
            'summary': {
                'total_documents': documents.count(),
                'total_size_bytes': total_size,
                'status_breakdown': status_counts
            }
        })


@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([AllowAny])
def upload_document(request):
    """
    Handle document upload for AI extraction

    Expected payload:
    - file: The uploaded file (Excel, CSV, PDF)
    - project_id: Associated project ID
    - doc_type: Optional hint (e.g., "rent_roll", "t12", "om")

    Supported formats:
    - Excel (.xlsx, .xls)
    - CSV (.csv)
    - PDF (.pdf) - including Offering Memorandums with embedded rent roll tables
    """
    try:
        file = request.FILES.get('file')
        project_id = request.data.get('project_id')
        doc_type_hint = request.data.get('doc_type', None)

        if not file or not project_id:
            return Response(
                {'error': 'file and project_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate unique filename
        ext = file.name.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{ext}"
        file_path = f"uploads/{project_id}/{unique_filename}"

        # Calculate hash
        file_content = file.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
        file.seek(0)  # Reset file pointer

        # Save to storage
        saved_path = default_storage.save(file_path, file)

        # Create Document record
        doc = Document.objects.create(
            project_id=project_id,
            workspace_id=1,  # Default workspace
            doc_name=file.name,
            doc_type=doc_type_hint or 'unknown',
            mime_type=file.content_type or 'application/octet-stream',
            file_size_bytes=file.size,
            sha256_hash=file_hash,
            storage_uri=saved_path,
            status='processing',
            created_at=timezone.now(),
            updated_at=timezone.now()
        )

        # Queue for extraction
        extract_job = DMSExtractQueue.objects.create(
            doc_id=doc.doc_id,
            extract_type='rent_roll',
            priority=5,
            status='pending'
        )

        # Trigger synchronous RAG processing (text extraction → chunking → embeddings)
        # Import here to avoid circular imports
        print("DOCS URL IMPORT CHECKPOINT: apps.knowledge.services.document_processor")
        from apps.knowledge.services.document_processor import processor
        try:
            process_result = processor.process_document(doc.doc_id)
            logger.info(f"RAG processing complete for doc_id={doc.doc_id}: {process_result.get('embeddings_created', 0)} embeddings")
        except Exception as process_error:
            # Log but don't fail - document is saved, processing can be retried
            logger.warning(f"RAG processing failed for doc_id={doc.doc_id}: {process_error}")

        return Response({
            'success': True,
            'doc_id': doc.doc_id,
            'extract_job_id': extract_job.queue_id,
            'status': 'queued',
            'message': 'Document uploaded successfully. Extraction will begin shortly.'
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_staging_data(request, doc_id):
    """
    Retrieve extracted data for user review

    Returns structured data with confidence scores
    """
    try:
        doc = Document.objects.get(doc_id=doc_id)

        # Check if extraction is complete
        extract_job = DMSExtractQueue.objects.filter(doc_id=str(doc_id)).first()

        if not extract_job or extract_job.status != 'completed':
            return Response({
                'status': extract_job.status if extract_job else 'not_found',
                'message': 'Extraction not yet complete'
            }, status=status.HTTP_202_ACCEPTED)

        # Get all assertions for this document
        assertions = DMSAssertion.objects.filter(doc_id=str(doc_id))

        # Group by type
        unit_types = []
        units = []
        leases = []

        # Helper to clean NaN values
        import math
        def clean_nan(obj):
            if isinstance(obj, dict):
                return {k: clean_nan(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [clean_nan(v) for v in obj]
            elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                return None
            return obj

        for assertion in assertions:
            data = json.loads(assertion.value_text)
            data = clean_nan(data)  # Clean any NaN values

            if assertion.metric_key.startswith('unit_type_'):
                unit_types.append({
                    'assertion_id': assertion.assertion_id,
                    'data': data,
                    'confidence': float(assertion.confidence) if assertion.confidence else 0.9
                })
            elif assertion.metric_key.startswith('unit_'):
                units.append({
                    'assertion_id': assertion.assertion_id,
                    'data': data,
                    'confidence': float(assertion.confidence) if assertion.confidence else 0.9
                })
            elif assertion.metric_key.startswith('lease_'):
                leases.append({
                    'assertion_id': assertion.assertion_id,
                    'data': data,
                    'confidence': float(assertion.confidence) if assertion.confidence else 0.9
                })

        # Calculate summary stats
        total_units = len(units)
        occupied_units = len(leases)
        vacancy_rate = 1 - (occupied_units / total_units) if total_units > 0 else 0

        total_income = sum(
            l['data']['monthly_rent']
            for l in leases
            if l['data'].get('monthly_rent')
        )

        # Flag items needing review (low confidence or validation issues)
        needs_review = []

        # Check for high rents
        high_rent_leases = [
            l for l in leases
            if l['data'].get('monthly_rent') is not None and l['data'].get('monthly_rent', 0) > 10000
        ]
        if high_rent_leases:
            needs_review.append({
                'severity': 'high',
                'category': 'suspicious_rent',
                'message': f'{len(high_rent_leases)} unit(s) with rent > $10,000',
                'items': high_rent_leases,
                'suggestion': 'Review for data entry errors or annual amounts'
            })

        # Check for missing lease dates
        missing_dates = [
            l for l in leases
            if not l['data'].get('lease_end_date')
        ]
        if missing_dates:
            needs_review.append({
                'severity': 'medium',
                'category': 'missing_lease_dates',
                'message': f'{len(missing_dates)} lease(s) missing end date',
                'items': missing_dates,
                'suggestion': 'Assume month-to-month or set default term'
            })

        # Check for low confidence items
        low_confidence_items = [
            {'type': 'unit_type', 'item': ut} for ut in unit_types if ut['confidence'] < 0.8
        ] + [
            {'type': 'unit', 'item': u} for u in units if u['confidence'] < 0.8
        ] + [
            {'type': 'lease', 'item': l} for l in leases if l['confidence'] < 0.8
        ]

        if low_confidence_items:
            needs_review.append({
                'severity': 'info',
                'category': 'low_confidence',
                'message': f'{len(low_confidence_items)} item(s) with confidence < 80%',
                'items': low_confidence_items
            })

        return Response({
            'doc_id': doc_id,
            'filename': doc.doc_name,
            'extraction_date': doc.updated_at,
            'summary': {
                'total_units': total_units,
                'occupied_units': occupied_units,
                'vacant_units': total_units - occupied_units,
                'vacancy_rate': round(vacancy_rate * 100, 1),
                'monthly_income': round(total_income, 2)
            },
            'unit_types': unit_types,
            'units': units,
            'leases': leases,
            'needs_review': needs_review
        })

    except Document.DoesNotExist:
        return Response(
            {'error': 'Document not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def commit_staging_data(request, doc_id):
    """
    Commit reviewed data to database tables

    Expected payload:
    {
        "project_id": 123,
        "approved_assertions": [assertion_id, ...],
        "corrections": [
            {
                "assertion_id": 123,
                "field_path": "monthly_rent",
                "corrected_value": 2244.00,
                "correction_reason": "decimal_error"
            }
        ]
    }
    """
    print(f"\n🎯 === COMMIT STAGING DATA ===")
    print(f"Doc ID: {doc_id}")
    print(f"Request method: {request.method}")
    print(f"Request data: {request.data}")

    try:
        approved_ids = request.data.get('approved_assertions', [])
        corrections = request.data.get('corrections', [])
        project_id = request.data.get('project_id')

        print(f"Project ID: {project_id}")
        print(f"Approved assertions count: {len(approved_ids)}")
        print(f"Corrections count: {len(corrections)}")

        if not project_id:
            print("❌ ERROR: project_id is required")
            return Response(
                {'error': 'project_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Apply corrections first
        for correction in corrections:
            assertion = DMSAssertion.objects.get(assertion_id=correction['assertion_id'])

            # Parse existing data
            data = json.loads(assertion.value_text)

            # Update field
            field_path = correction['field_path']
            old_value = data.get(field_path)
            new_value = correction['corrected_value']
            data[field_path] = new_value

            # Save updated assertion
            assertion.value_text = json.dumps(data)
            assertion.save()

            # Log correction
            AICorrectionLog.objects.create(
                extraction_result_id=int(doc_id),
                user_id=request.user.id if hasattr(request, 'user') and request.user.is_authenticated else 0,
                project_id=project_id,
                doc_id=str(doc_id),
                field_path=field_path,
                ai_value=str(old_value),
                user_value=str(new_value),
                correction_type=correction.get('correction_reason', 'value_wrong'),
                created_at=timezone.now()
            )

        # Create unit types
        unit_type_assertions = DMSAssertion.objects.filter(
            doc_id=str(doc_id),
            metric_key__startswith='unit_type_',
            assertion_id__in=approved_ids
        )

        unit_type_map = {}  # Maps (bedrooms, bathrooms) -> unit_type_id

        for assertion in unit_type_assertions:
            data = json.loads(assertion.value_text)

            # Generate unit type code
            unit_type_code = f"{int(data['bedroom_count'])}BR{data['bathroom_count']}BA"

            unit_type = MultifamilyUnitType.objects.create(
                project_id=project_id,
                unit_type_code=unit_type_code,
                bedrooms=data['bedroom_count'],
                bathrooms=data['bathroom_count'],
                avg_square_feet=data.get('typical_sqft', 0) or 0,
                current_market_rent=data.get('market_rent_monthly', 0) or 0,
                total_units=data['unit_count']
            )

            key = (data['bedroom_count'], data['bathroom_count'])
            unit_type_map[key] = unit_type.unit_type_id

        # Create units
        unit_assertions = DMSAssertion.objects.filter(
            doc_id=str(doc_id),
            assertion_id__in=approved_ids
        ).exclude(metric_key__startswith='unit_type_').exclude(metric_key__startswith='lease_')

        unit_id_map = {}  # Maps unit_number -> unit_id

        for assertion in unit_assertions:
            if not assertion.metric_key.startswith('unit_'):
                continue

            data = json.loads(assertion.value_text)

            # Find matching unit type
            key = (data.get('bedroom_count'), data.get('bathroom_count'))
            unit_type_code = f"{int(data.get('bedroom_count', 0))}BR{data.get('bathroom_count', 0)}BA" if data.get('bedroom_count') else 'Unknown'

            unit = MultifamilyUnit.objects.create(
                project_id=project_id,
                unit_number=data['unit_number'],
                unit_type=unit_type_code,
                bedrooms=data.get('bedroom_count'),
                bathrooms=data.get('bathroom_count'),
                square_feet=data.get('square_feet', 0) or 0,
                market_rent=data.get('market_rent'),
                renovation_status='ORIGINAL'
            )

            unit_id_map[data['unit_number']] = unit.unit_id

        # Create leases
        lease_assertions = DMSAssertion.objects.filter(
            doc_id=str(doc_id),
            metric_key__startswith='lease_',
            assertion_id__in=approved_ids
        )

        for assertion in lease_assertions:
            data = json.loads(assertion.value_text)

            unit_id = unit_id_map.get(data['unit_number'])
            if not unit_id:
                continue

            # Parse dates
            from datetime import datetime, timedelta
            lease_start = datetime.fromisoformat(data['lease_start_date']) if data.get('lease_start_date') else timezone.now().date()
            lease_end = datetime.fromisoformat(data['lease_end_date']) if data.get('lease_end_date') else lease_start + timedelta(days=365)

            # Calculate term
            if data.get('lease_end_date') and data.get('lease_start_date'):
                term_days = (lease_end - lease_start).days
                term_months = max(1, round(term_days / 30))
            else:
                term_months = 12

            MultifamilyLease.objects.create(
                unit_id=unit_id,
                resident_name=data.get('tenant_name'),
                lease_start_date=lease_start,
                lease_end_date=lease_end,
                lease_term_months=term_months,
                base_rent_monthly=data.get('monthly_rent', 0) or 0,
                lease_status='ACTIVE'
            )

        return Response({
            'success': True,
            'message': 'Data committed successfully',
            'records_created': {
                'unit_types': len(unit_type_map),
                'units': len(unit_id_map),
                'leases': len(lease_assertions)
            }
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =====================================================
# DMS Versioning & Collision Detection Endpoints
# =====================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def check_upload_collision(request, project_id):
    """
    Check if uploaded file matches existing document by name or content hash.
    Called BEFORE actual upload to prompt user for action.

    Request body:
    {
        "filename": "Colliers_OM.pdf",
        "content_hash": "sha256_hex_string",  # computed client-side
        "file_size": 1234567
    }

    Response:
    {
        "collision": true/false,
        "match_type": "filename" | "content" | "both" | null,
        "existing_doc": { doc_id, filename, version_number, uploaded_at, extraction_summary } | null
    }
    """
    try:
        filename = request.data.get('filename')
        content_hash = request.data.get('content_hash')

        if not filename:
            return Response(
                {'error': 'filename is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for matches (exclude soft-deleted)
        query = Document.objects.filter(
            project_id=project_id,
            deleted_at__isnull=True
        )

        filename_match = query.filter(doc_name__iexact=filename).first()
        hash_match = query.filter(sha256_hash=content_hash).first() if content_hash else None

        if not filename_match and not hash_match:
            return Response({
                "collision": False,
                "match_type": None,
                "existing_doc": None
            })

        # Determine match type
        if filename_match and hash_match and filename_match.doc_id == hash_match.doc_id:
            match_type = "both"
            matched_doc = filename_match
        elif hash_match:
            match_type = "content"
            matched_doc = hash_match
        else:
            match_type = "filename"
            matched_doc = filename_match

        # Get extraction summary for this doc
        from django.db import connection
        with connection.cursor() as cursor:
            # Count extracted facts
            cursor.execute("""
                SELECT COUNT(*) FROM landscape.doc_extracted_facts
                WHERE doc_id = %s AND superseded_at IS NULL
            """, [matched_doc.doc_id])
            facts_row = cursor.fetchone()
            facts_count = facts_row[0] if facts_row else 0

            # Count embeddings
            cursor.execute("""
                SELECT COUNT(*) FROM landscape.knowledge_embeddings
                WHERE source_type = 'document' AND source_id = %s
                AND superseded_by_version IS NULL
            """, [matched_doc.doc_id])
            embeddings_row = cursor.fetchone()
            embeddings_count = embeddings_row[0] if embeddings_row else 0

        return Response({
            "collision": True,
            "match_type": match_type,
            "existing_doc": {
                "doc_id": matched_doc.doc_id,
                "filename": matched_doc.doc_name,
                "version_number": matched_doc.version_no,
                "uploaded_at": matched_doc.created_at.isoformat() if matched_doc.created_at else None,
                "extraction_summary": {
                    "facts_extracted": facts_count,
                    "embeddings": embeddings_count
                }
            }
        })

    except Exception as e:
        logger.exception("Error checking upload collision for project %s", project_id)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([AllowAny])
def upload_new_version(request, project_id, doc_id):
    """
    Upload a new version of an existing document.
    - Increments version_number
    - Keeps existing extractions (cumulative knowledge)
    - Creates new embeddings tagged with new version
    - Marks old embeddings as potentially superseded

    Request: multipart form with file
    """
    try:
        existing_doc = Document.objects.get(doc_id=doc_id, project_id=project_id)

        if existing_doc.deleted_at:
            return Response(
                {"error": "Cannot version a deleted document"},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {"error": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Compute content hash
        file_content = uploaded_file.read()
        content_hash = hashlib.sha256(file_content).hexdigest()
        uploaded_file.seek(0)  # Reset for upload

        # Generate unique filename
        ext = uploaded_file.name.split('.')[-1] if '.' in uploaded_file.name else ''
        unique_filename = f"{uuid.uuid4()}.{ext}" if ext else str(uuid.uuid4())
        file_path = f"uploads/{project_id}/{unique_filename}"

        # Save to storage
        saved_path = default_storage.save(file_path, uploaded_file)

        # Update existing doc record
        old_version = existing_doc.version_no
        existing_doc.version_no = old_version + 1
        existing_doc.storage_uri = saved_path
        existing_doc.sha256_hash = content_hash
        existing_doc.file_size_bytes = len(file_content)
        existing_doc.mime_type = uploaded_file.content_type or 'application/octet-stream'
        existing_doc.updated_at = timezone.now()
        existing_doc.status = 'processing'  # Will be reprocessed
        existing_doc.save()

        # Mark old embeddings as potentially superseded
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE landscape.knowledge_embeddings
                SET superseded_by_version = %s
                WHERE source_type = 'document'
                AND source_id = %s
                AND superseded_by_version IS NULL
            """, [existing_doc.version_no, doc_id])

        # Queue for reprocessing
        DMSExtractQueue.objects.create(
            doc_id=doc_id,
            extract_type='general',
            priority=5,
            status='pending'
        )

        # Trigger synchronous RAG processing for new version
        from apps.knowledge.services.document_processor import processor
        try:
            process_result = processor.process_document(doc_id)
            logger.info(f"RAG processing complete for doc_id={doc_id} (v{existing_doc.version_no}): {process_result.get('embeddings_created', 0)} embeddings")
        except Exception as process_error:
            logger.warning(f"RAG processing failed for doc_id={doc_id}: {process_error}")

        return Response({
            "doc_id": doc_id,
            "new_version": existing_doc.version_no,
            "old_version": old_version,
            "message": "New version uploaded. Previous extractions preserved, new extractions will be added."
        })

    except Document.DoesNotExist:
        return Response(
            {"error": "Document not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception("Error uploading new version for doc %s", doc_id)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([AllowAny])
def soft_delete_document(request, project_id, doc_id):
    """Soft delete a document - marks as deleted but preserves for audit."""
    try:
        doc = Document.objects.get(doc_id=doc_id, project_id=project_id)

        if doc.deleted_at:
            return Response(
                {"error": "Document is already deleted"},
                status=status.HTTP_400_BAD_REQUEST
            )

        doc.deleted_at = timezone.now()
        doc.deleted_by = request.data.get('deleted_by', 'anonymous')
        doc.save()

        return Response({
            "success": True,
            "message": "Document deleted",
            "doc_id": doc_id
        })

    except Document.DoesNotExist:
        return Response(
            {"error": "Document not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception("Error soft deleting doc %s", doc_id)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PATCH'])
@permission_classes([AllowAny])
def rename_document(request, project_id, doc_id):
    """Rename a document."""
    try:
        doc = Document.objects.get(doc_id=doc_id, project_id=project_id, deleted_at__isnull=True)

        new_name = request.data.get('new_name')
        if not new_name:
            return Response(
                {"error": "new_name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_name = doc.doc_name
        doc.doc_name = new_name.strip()
        doc.updated_at = timezone.now()
        doc.save()

        return Response({
            "success": True,
            "doc_id": doc_id,
            "old_name": old_name,
            "new_name": doc.doc_name
        })

    except Document.DoesNotExist:
        return Response(
            {"error": "Document not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception("Error renaming doc %s", doc_id)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
