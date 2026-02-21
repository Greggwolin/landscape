"""API views for Documents application."""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.files.storage import default_storage
from django.utils import timezone
from django.db.models import Q, Max
from django.db import connection, transaction
from .models import (
    Document,
    DocumentFolder,
    DMSExtractQueue,
    DMSAssertion,
    AICorrectionLog,
    ExtractionCommitSnapshot,
)
from .serializers import DocumentSerializer, DocumentFolderSerializer
from apps.multifamily.models import MultifamilyUnitType, MultifamilyUnit, MultifamilyLease
from apps.knowledge.services.extraction_service import (
    parse_rent_roll_tags,
    map_occupancy_status,
    extract_tenant_name,
)
import uuid
import json
import hashlib
import logging
from datetime import datetime, timedelta

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

        # Collision check BEFORE saving file or creating core_doc
        query = Document.objects.filter(
            project_id=project_id,
            deleted_at__isnull=True
        )

        filename_match = query.filter(doc_name__iexact=file.name).first()
        hash_match = query.filter(sha256_hash=file_hash).first()

        if filename_match or hash_match:
            if filename_match and hash_match and filename_match.doc_id == hash_match.doc_id:
                match_type = "both"
                matched_doc = filename_match
            elif hash_match:
                match_type = "content"
                matched_doc = hash_match
            else:
                match_type = "filename"
                matched_doc = filename_match

            facts_count = 0
            embeddings_count = 0
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT COUNT(*) FROM landscape.doc_extracted_facts
                        WHERE doc_id = %s AND superseded_at IS NULL
                    """, [matched_doc.doc_id])
                    facts_row = cursor.fetchone()
                    facts_count = facts_row[0] if facts_row else 0

                    cursor.execute("""
                        SELECT COUNT(*) FROM landscape.knowledge_embeddings
                        WHERE source_type IN ('document', 'document_chunk')
                        AND source_id = %s
                        AND superseded_by_version IS NULL
                    """, [matched_doc.doc_id])
                    embeddings_row = cursor.fetchone()
                    embeddings_count = embeddings_row[0] if embeddings_row else 0
            except Exception:
                pass

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
            }, status=status.HTTP_200_OK)

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
        from apps.knowledge.services.document_processor import processor
        try:
            process_result = processor.process_document(doc.doc_id)
            logger.info(f"RAG processing complete for doc_id={doc.doc_id}: {process_result.get('embeddings_created', 0)} embeddings")
        except Exception as process_error:
            # Log but don't fail - document is saved, processing can be retried
            logger.warning(f"RAG processing failed for doc_id={doc.doc_id}: {process_error}")

        # Trigger media scan (detect embedded images — scan only, not extract)
        from apps.knowledge.services.media_extraction_service import MediaExtractionService
        try:
            media_svc = MediaExtractionService()
            scan_result = media_svc.scan_document(doc.doc_id, saved_path)
            detected = scan_result.get('total_detected', 0) if scan_result else 0
            logger.info(f"Media scan complete for doc_id={doc.doc_id}: {detected} assets detected")
        except Exception as scan_error:
            logger.warning(f"Media scan failed for doc_id={doc.doc_id}: {scan_error}")

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


def _parse_date_value(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    if hasattr(value, 'isoformat') and not isinstance(value, str):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            try:
                return datetime.strptime(value, '%m/%d/%Y').date()
            except ValueError:
                return None
    return None


def _snapshot_model(instance, extra=None):
    from decimal import Decimal
    from datetime import date, datetime

    def _serialize_value(value):
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, (date, datetime)):
            return value.isoformat()
        return value

    data = {}
    for field in instance._meta.fields:
        data[field.attname] = _serialize_value(getattr(instance, field.attname))
    if extra:
        data.update(extra)
    return data


def commit_staging_data_internal(
    project_id,
    extraction_ids,
    decisions,
    user,
    create_snapshot=True
):
    """
    Internal commit function used by both DMS and modal paths.
    Writes directly to MultifamilyUnit/MultifamilyLease from ai_extraction_staging JSON.
    """
    if not project_id:
        return ({'success': False, 'error': 'project_id is required'}, status.HTTP_400_BAD_REQUEST)
    if not extraction_ids:
        return ({'success': False, 'error': 'extraction_ids is required'}, status.HTTP_400_BAD_REQUEST)

    decisions = decisions or {}

    with transaction.atomic():
        # Fetch extractions
        placeholders = ','.join(['%s'] * len(extraction_ids))
        params = [int(project_id)] + [int(eid) for eid in extraction_ids]
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT extraction_id, doc_id, extracted_value, status
                FROM landscape.ai_extraction_staging
                WHERE project_id = %s
                  AND extraction_id IN ({placeholders})
                ORDER BY extraction_id
            """, params)
            rows = cursor.fetchall()

        if not rows:
            return ({'success': False, 'error': 'No matching extractions found'}, status.HTTP_404_NOT_FOUND)

        doc_id = rows[0][1]

        # Create snapshot before any changes
        snapshot = None
        if create_snapshot:
            ExtractionCommitSnapshot.objects.filter(
                project_id=project_id,
                scope='rent_roll',
                is_active=True
            ).update(is_active=False)

            existing_units = MultifamilyUnit.objects.filter(project_id=project_id).select_related('project')
            existing_leases = MultifamilyLease.objects.filter(unit__project_id=project_id).select_related('unit')

            snapshot_data = {
                'units': [_snapshot_model(u) for u in existing_units],
                'leases': [
                    _snapshot_model(l, extra={'unit_number': l.unit.unit_number if l.unit else None})
                    for l in existing_leases
                ],
            }

            snapshot = ExtractionCommitSnapshot.objects.create(
                project_id=project_id,
                document_id=doc_id,
                scope='rent_roll',
                committed_by=user if getattr(user, 'is_authenticated', False) else None,
                snapshot_data=snapshot_data,
                changes_applied={
                    'extraction_ids': extraction_ids,
                    'decisions': decisions
                }
            )

        errors = []
        units_affected = 0

        for extraction_id, _, extracted_value, _ in rows:
            decision = decisions.get(str(extraction_id)) or decisions.get(extraction_id) or {}
            action = decision.get('action', 'accept')

            if action == 'reject':
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE landscape.ai_extraction_staging
                        SET status = 'rejected'
                        WHERE extraction_id = %s
                    """, [extraction_id])
                continue

            value_to_apply = decision.get('edited_value') if action == 'edit' else extracted_value
            if isinstance(value_to_apply, str):
                try:
                    value_to_apply = json.loads(value_to_apply)
                except json.JSONDecodeError:
                    errors.append({'extraction_id': extraction_id, 'error': 'Invalid JSON value'})
                    continue

            if not isinstance(value_to_apply, dict):
                errors.append({'extraction_id': extraction_id, 'error': 'Extraction payload is not a JSON object'})
                continue

            unit_number = value_to_apply.get('unit_number')
            if not unit_number:
                errors.append({'extraction_id': extraction_id, 'error': 'Missing unit_number'})
                continue

            unit = MultifamilyUnit.objects.filter(project_id=project_id, unit_number=unit_number).first()

            def _set_if_present(obj, field_name, source_key):
                if source_key in value_to_apply and value_to_apply[source_key] is not None:
                    setattr(obj, field_name, value_to_apply[source_key])
                    return True
                return False

            # Process tenant name - extract actual name, not placeholders
            raw_tenant = value_to_apply.get('tenant_name')
            actual_tenant_name = extract_tenant_name(raw_tenant)

            # Map occupancy status from source_status or occupancy_status
            source_status = value_to_apply.get('source_status') or value_to_apply.get('occupancy_status')
            mapped_status = map_occupancy_status(source_status, actual_tenant_name)

            # Build extra_data from extraction
            extra_data = value_to_apply.get('extra_data', {})

            # If tags are present at top level, parse them into extra_data
            if 'tags' in value_to_apply and value_to_apply['tags']:
                tag_data = parse_rent_roll_tags(value_to_apply['tags'])
                extra_data.update(tag_data)

            # Also capture any unmapped fields in extra_data
            known_fields = {
                'unit_number', 'unit_type', 'bedrooms', 'bathrooms', 'square_feet', 'sf',
                'current_rent', 'rent_current', 'market_rent', 'lease_start', 'lease_end',
                'tenant_name', 'status', 'source_status', 'occupancy_status', 'extra_data', 'tags'
            }
            for key, val in value_to_apply.items():
                if key not in known_fields and val is not None:
                    extra_data[key] = val

            # Check for Section 8 in extra_data and set flag
            is_section8 = extra_data.get('section_8', False)

            if unit:
                updated = False
                updated |= _set_if_present(unit, 'unit_type', 'unit_type')
                updated |= _set_if_present(unit, 'bedrooms', 'bedrooms')
                updated |= _set_if_present(unit, 'bathrooms', 'bathrooms')
                updated |= _set_if_present(unit, 'square_feet', 'square_feet')
                updated |= _set_if_present(unit, 'current_rent', 'current_rent')
                updated |= _set_if_present(unit, 'market_rent', 'market_rent')

                # Use mapped status instead of raw value
                if mapped_status:
                    unit.occupancy_status = mapped_status
                    updated = True

                # Set Section 8 flag if detected
                if is_section8:
                    unit.is_section8 = True
                    updated = True

                # Save extra_data if present
                if extra_data:
                    # Merge with existing extra_data if any
                    existing_extra = unit.extra_data or {}
                    existing_extra.update(extra_data)
                    unit.extra_data = existing_extra
                    updated = True

                if updated:
                    unit.save()
            else:
                create_data = {
                    'project_id': project_id,
                    'unit_number': unit_number,
                    'unit_type': value_to_apply.get('unit_type') or 'Unknown',
                    'square_feet': value_to_apply.get('square_feet') or 0,
                    'occupancy_status': mapped_status,
                }
                if value_to_apply.get('bedrooms') is not None:
                    create_data['bedrooms'] = value_to_apply.get('bedrooms')
                if value_to_apply.get('bathrooms') is not None:
                    create_data['bathrooms'] = value_to_apply.get('bathrooms')
                if value_to_apply.get('current_rent') is not None:
                    create_data['current_rent'] = value_to_apply.get('current_rent')
                if value_to_apply.get('market_rent') is not None:
                    create_data['market_rent'] = value_to_apply.get('market_rent')
                if is_section8:
                    create_data['is_section8'] = True
                if extra_data:
                    create_data['extra_data'] = extra_data

                # Derive clean unit_type from bedrooms/bathrooms if available
                from apps.multifamily.models import derive_unit_type, parse_unit_category, parse_unit_designation
                raw_type = create_data.get('unit_type', '')
                br = create_data.get('bedrooms')
                ba = create_data.get('bathrooms')
                derived = derive_unit_type(br, ba)
                if derived != 'Unknown':
                    create_data['unit_type'] = derived
                create_data['unit_category'] = parse_unit_category(raw_type)
                create_data['unit_designation'] = parse_unit_designation(raw_type)

                unit = MultifamilyUnit.objects.create(**create_data)

            lease_start = _parse_date_value(value_to_apply.get('lease_start'))
            lease_end = _parse_date_value(value_to_apply.get('lease_end'))

            if lease_start or lease_end:
                if not lease_start:
                    lease_start = timezone.now().date()
                if not lease_end:
                    lease_end = lease_start + timedelta(days=365)

                term_days = (lease_end - lease_start).days
                term_months = max(1, round(term_days / 30))

                existing_lease = None
                if lease_start:
                    existing_lease = MultifamilyLease.objects.filter(
                        unit_id=unit.unit_id,
                        lease_start_date=lease_start
                    ).first()
                if not existing_lease:
                    existing_lease = MultifamilyLease.objects.filter(
                        unit_id=unit.unit_id
                    ).order_by('-lease_start_date').first()

                rent_value = value_to_apply.get('current_rent') or value_to_apply.get('market_rent') or 0

                if existing_lease:
                    existing_lease.lease_start_date = lease_start
                    existing_lease.lease_end_date = lease_end
                    existing_lease.lease_term_months = term_months
                    existing_lease.base_rent_monthly = rent_value
                    # Use processed tenant name (not placeholder)
                    if actual_tenant_name is not None:
                        existing_lease.resident_name = actual_tenant_name
                    existing_lease.save()
                else:
                    MultifamilyLease.objects.create(
                        unit_id=unit.unit_id,
                        resident_name=actual_tenant_name,
                        lease_start_date=lease_start,
                        lease_end_date=lease_end,
                        lease_term_months=term_months,
                        base_rent_monthly=rent_value,
                        lease_status='ACTIVE'
                    )

            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE landscape.ai_extraction_staging
                    SET status = 'committed'
                    WHERE extraction_id = %s
                """, [extraction_id])

            units_affected += 1

    response_payload = {
        'success': len(errors) == 0,
        'snapshot_id': snapshot.snapshot_id if snapshot else None,
        'units_affected': units_affected,
        'rollback_available': bool(snapshot),
        'errors': errors
    }
    return (response_payload, status.HTTP_200_OK if len(errors) == 0 else status.HTTP_207_MULTI_STATUS)


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
        if request.data.get('extraction_ids'):
            payload, status_code = commit_staging_data_internal(
                project_id=request.data.get('project_id'),
                extraction_ids=request.data.get('extraction_ids'),
                decisions=request.data.get('decisions'),
                user=getattr(request, 'user', None),
                create_snapshot=True
            )
            return Response(payload, status=status_code)

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

def _get_version_root(doc: Document) -> int:
    """Return the root doc_id for a version chain (V1)."""
    return doc.parent_doc_id or doc.doc_id


def _get_version_chain(project_id: int, root_doc_id: int):
    """Query all documents in a version chain (root + children)."""
    return Document.objects.filter(
        project_id=project_id,
        deleted_at__isnull=True
    ).filter(
        Q(doc_id=root_doc_id) | Q(parent_doc_id=root_doc_id)
    )


def _get_extraction_counts(doc_id: int) -> tuple[int, int]:
    """Get extracted fact and embedding counts for a document."""
    facts_count = 0
    embeddings_count = 0
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM landscape.doc_extracted_facts
                WHERE doc_id = %s AND superseded_at IS NULL
            """, [doc_id])
            facts_row = cursor.fetchone()
            facts_count = facts_row[0] if facts_row else 0

            cursor.execute("""
                SELECT COUNT(*) FROM landscape.knowledge_embeddings
                WHERE source_type IN ('document', 'document_chunk')
                AND source_id = %s
                AND superseded_by_version IS NULL
            """, [doc_id])
            embeddings_row = cursor.fetchone()
            embeddings_count = embeddings_row[0] if embeddings_row else 0
    except Exception:
        # If tables are missing or queries fail, return zeros
        pass

    return facts_count, embeddings_count


def _build_extraction_summary(facts_count: int, embeddings_count: int) -> str:
    return f"{facts_count} facts • {embeddings_count} embeddings"

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
                "doc_type": matched_doc.doc_type,
                "file_size_bytes": matched_doc.file_size_bytes,
                "mime_type": matched_doc.mime_type,
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
    - Creates a new core_doc record (version chain)
    - Keeps existing extractions (cumulative knowledge)
    - Creates new embeddings for the new version

    Request: multipart form with file (+ optional notes)
    """
    try:
        existing_doc = Document.objects.get(doc_id=doc_id, project_id=project_id, deleted_at__isnull=True)

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {"error": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        version_notes = request.data.get('notes') or request.data.get('version_notes') or ''

        # Determine root doc (V1)
        root_doc_id = _get_version_root(existing_doc)
        root_doc = Document.objects.get(doc_id=root_doc_id, project_id=project_id)

        chain = _get_version_chain(project_id, root_doc_id)
        max_version = chain.aggregate(max_version=Max('version_no')).get('max_version') or 0
        new_version_no = max_version + 1

        old_facts, old_embeddings = _get_extraction_counts(existing_doc.doc_id)

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

        profile_json = existing_doc.profile_json or {}
        if not isinstance(profile_json, dict):
            profile_json = {}
        profile_json = dict(profile_json)
        if version_notes:
            profile_json['version_notes'] = version_notes

        with transaction.atomic():
            new_doc = Document.objects.create(
                project_id=project_id,
                workspace_id=existing_doc.workspace_id,
                phase_id=existing_doc.phase_id,
                parcel_id=existing_doc.parcel_id,
                doc_name=root_doc.doc_name,
                doc_type=root_doc.doc_type,
                discipline=root_doc.discipline,
                mime_type=uploaded_file.content_type or 'application/octet-stream',
                file_size_bytes=len(file_content),
                sha256_hash=content_hash,
                storage_uri=saved_path,
                version_no=new_version_no,
                parent_doc_id=root_doc_id,
                status='processing',
                profile_json=profile_json,
                created_by=existing_doc.created_by,
                updated_by=existing_doc.updated_by,
                created_at=timezone.now(),
                updated_at=timezone.now(),
            )

            # Queue for processing
            DMSExtractQueue.objects.create(
                doc_id=new_doc.doc_id,
                extract_type='general',
                priority=5,
                status='pending'
            )

        # Mark old embeddings as superseded by the new version
        try:
            old_doc_ids = list(chain.values_list('doc_id', flat=True))
            with connection.cursor() as cursor:
                for old_doc_id in old_doc_ids:
                    cursor.execute("""
                        UPDATE landscape.knowledge_embeddings
                        SET superseded_by_version = %s
                        WHERE source_type IN ('document', 'document_chunk')
                        AND source_id = %s
                        AND superseded_by_version IS NULL
                    """, [new_version_no, old_doc_id])
        except Exception:
            logger.warning("Failed to supersede embeddings for version chain %s", root_doc_id)

        # Trigger synchronous RAG processing for new version
        from apps.knowledge.services.document_processor import processor
        try:
            process_result = processor.process_document(new_doc.doc_id)
            logger.info(
                f"RAG processing complete for doc_id={new_doc.doc_id} (v{new_version_no}): "
                f"{process_result.get('embeddings_created', 0)} embeddings"
            )
        except Exception as process_error:
            logger.warning(f"RAG processing failed for doc_id={new_doc.doc_id}: {process_error}")

        # Auto-generate diff note if none provided
        new_facts, new_embeddings = _get_extraction_counts(new_doc.doc_id)
        diff_note = (
            f"Facts: {old_facts} → {new_facts} ({new_facts - old_facts:+d}). "
            f"Embeddings: {old_embeddings} → {new_embeddings} ({new_embeddings - old_embeddings:+d})."
        )
        if diff_note:
            if version_notes:
                profile_json['version_notes'] = f"{version_notes}\n{diff_note}"
            else:
                profile_json['version_notes'] = diff_note
            new_doc.profile_json = profile_json
            new_doc.save(update_fields=['profile_json'])

        return Response({
            "doc_id": new_doc.doc_id,
            "version_no": new_doc.version_no,
            "new_version": new_doc.version_no,
            "doc_name": new_doc.doc_name,
            "created_at": new_doc.created_at.isoformat() if new_doc.created_at else None,
            "updated_at": new_doc.updated_at.isoformat() if new_doc.updated_at else None,
            "storage_uri": new_doc.storage_uri,
            "mime_type": new_doc.mime_type,
            "file_size_bytes": new_doc.file_size_bytes,
            "sha256_hash": new_doc.sha256_hash,
            "status": new_doc.status,
            "parent_doc_id": new_doc.parent_doc_id,
            "message": "New version uploaded.",
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


@api_view(['GET'])
@permission_classes([AllowAny])
def list_document_versions(request, project_id, doc_id):
    """
    List version chain for a document (root + all versions).
    Returns array ordered by version_no ascending.
    """
    try:
        doc = Document.objects.get(doc_id=doc_id, project_id=project_id, deleted_at__isnull=True)
        root_doc_id = _get_version_root(doc)

        chain = _get_version_chain(project_id, root_doc_id).order_by('version_no', 'created_at')

        versions = []
        for version_doc in chain:
            facts_count, embeddings_count = _get_extraction_counts(version_doc.doc_id)
            profile = version_doc.profile_json or {}
            notes = None
            if isinstance(profile, dict):
                notes = profile.get('version_notes') or profile.get('notes')

            versions.append({
                "doc_id": version_doc.doc_id,
                "version_no": version_doc.version_no,
                "doc_name": version_doc.doc_name,
                "uploaded_at": version_doc.created_at.isoformat() if version_doc.created_at else None,
                "uploaded_by": version_doc.created_by or "System",
                "notes": notes,
                "extraction_summary": _build_extraction_summary(facts_count, embeddings_count),
            })

        return Response(versions)

    except Document.DoesNotExist:
        return Response(
            {"error": "Document not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception("Error listing versions for doc %s", doc_id)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def link_document_version(request, project_id, doc_id):
    """
    Link an existing document as a new version of a target document.
    Request body: { "source_doc_id": int }
    """
    try:
        source_doc_id = request.data.get('source_doc_id')
        if not source_doc_id:
            return Response(
                {"error": "source_doc_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        target_doc = Document.objects.get(doc_id=doc_id, project_id=project_id, deleted_at__isnull=True)
        source_doc = Document.objects.get(doc_id=source_doc_id, project_id=project_id, deleted_at__isnull=True)

        if target_doc.doc_id == source_doc.doc_id:
            return Response(
                {"error": "source_doc_id cannot match target doc_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        root_doc_id = _get_version_root(target_doc)
        root_doc = Document.objects.get(doc_id=root_doc_id, project_id=project_id)

        chain = _get_version_chain(project_id, root_doc_id)
        max_version = chain.aggregate(max_version=Max('version_no')).get('max_version') or 0
        new_version_no = max_version + 1

        profile_json = source_doc.profile_json or {}
        if not isinstance(profile_json, dict):
            profile_json = {}
        profile_json = dict(profile_json)
        target_facts, target_embeddings = _get_extraction_counts(root_doc.doc_id)
        source_facts, source_embeddings = _get_extraction_counts(source_doc.doc_id)
        profile_json['version_notes'] = (
            f"Linked as version V{new_version_no} of \"{root_doc.doc_name}\". "
            f"Facts: {target_facts} → {source_facts} ({source_facts - target_facts:+d}). "
            f"Embeddings: {target_embeddings} → {source_embeddings} ({source_embeddings - target_embeddings:+d})."
        )

        source_doc.parent_doc_id = root_doc_id
        source_doc.version_no = new_version_no
        source_doc.doc_name = f"{root_doc.doc_name} (V{new_version_no})"
        source_doc.updated_at = timezone.now()
        source_doc.profile_json = profile_json
        source_doc.save()

        return Response({
            "doc_id": source_doc.doc_id,
            "version_no": source_doc.version_no,
            "doc_name": source_doc.doc_name,
            "parent_doc_id": source_doc.parent_doc_id,
            "message": "Document linked as new version.",
        })

    except Document.DoesNotExist:
        return Response(
            {"error": "Document not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception("Error linking version for doc %s", doc_id)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def restore_document_version(request, project_id, doc_id):
    """
    Restore a prior version by creating a new version from it.
    Request body: { "source_doc_id": int }
    """
    try:
        source_doc_id = request.data.get('source_doc_id')
        if not source_doc_id:
            return Response(
                {"error": "source_doc_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        current_doc = Document.objects.get(doc_id=doc_id, project_id=project_id, deleted_at__isnull=True)
        source_doc = Document.objects.get(doc_id=source_doc_id, project_id=project_id, deleted_at__isnull=True)

        root_doc_id = _get_version_root(current_doc)
        root_doc = Document.objects.get(doc_id=root_doc_id, project_id=project_id)

        chain = _get_version_chain(project_id, root_doc_id)
        max_version = chain.aggregate(max_version=Max('version_no')).get('max_version') or 0
        new_version_no = max_version + 1

        profile_json = source_doc.profile_json or {}
        if not isinstance(profile_json, dict):
            profile_json = {}
        profile_json = dict(profile_json)
        profile_json['version_notes'] = (
            f"Restored from V{source_doc.version_no}."
        )

        new_doc = Document.objects.create(
            project_id=project_id,
            workspace_id=source_doc.workspace_id,
            phase_id=source_doc.phase_id,
            parcel_id=source_doc.parcel_id,
            doc_name=root_doc.doc_name,
            doc_type=source_doc.doc_type,
            discipline=source_doc.discipline,
            mime_type=source_doc.mime_type,
            file_size_bytes=source_doc.file_size_bytes,
            sha256_hash=source_doc.sha256_hash,
            storage_uri=source_doc.storage_uri,
            version_no=new_version_no,
            parent_doc_id=root_doc_id,
            status='processing',
            profile_json=profile_json,
            created_by=source_doc.created_by,
            updated_by=source_doc.updated_by,
            created_at=timezone.now(),
            updated_at=timezone.now(),
        )

        # Queue for processing (restore creates a new active version)
        DMSExtractQueue.objects.create(
            doc_id=new_doc.doc_id,
            extract_type='general',
            priority=5,
            status='pending'
        )

        # Trigger synchronous RAG processing for restored version
        from apps.knowledge.services.document_processor import processor
        try:
            process_result = processor.process_document(new_doc.doc_id)
            logger.info(
                f"RAG processing complete for doc_id={new_doc.doc_id} (v{new_version_no}): "
                f"{process_result.get('embeddings_created', 0)} embeddings"
            )
        except Exception as process_error:
            logger.warning(f"RAG processing failed for doc_id={new_doc.doc_id}: {process_error}")

        return Response({
            "doc_id": new_doc.doc_id,
            "version_no": new_doc.version_no,
            "doc_name": new_doc.doc_name,
            "created_at": new_doc.created_at.isoformat() if new_doc.created_at else None,
            "updated_at": new_doc.updated_at.isoformat() if new_doc.updated_at else None,
            "storage_uri": new_doc.storage_uri,
            "mime_type": new_doc.mime_type,
            "file_size_bytes": new_doc.file_size_bytes,
            "sha256_hash": new_doc.sha256_hash,
            "message": "Version restored as new active version.",
        })

    except Document.DoesNotExist:
        return Response(
            {"error": "Document not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception("Error restoring version for doc %s", doc_id)
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


@api_view(['POST'])
@permission_classes([AllowAny])
def restore_document(request, project_id, doc_id):
    """Restore a soft-deleted document from trash."""
    try:
        doc = Document.objects.get(doc_id=doc_id, project_id=project_id)

        if not doc.deleted_at:
            return Response(
                {"error": "Document is not in trash"},
                status=status.HTTP_400_BAD_REQUEST
            )

        doc.deleted_at = None
        doc.deleted_by = None
        doc.updated_at = timezone.now()
        doc.save()

        return Response({
            "success": True,
            "message": "Document restored",
            "doc_id": doc_id,
            "doc_name": doc.doc_name
        })

    except Document.DoesNotExist:
        return Response(
            {"error": "Document not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception("Error restoring doc %s", doc_id)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([AllowAny])
def permanent_delete_document(request, project_id, doc_id):
    """
    Permanently delete a document. Only works on documents that are already in trash.
    This is irreversible and will delete the document record and associated data.
    """
    try:
        doc = Document.objects.get(doc_id=doc_id, project_id=project_id)

        if not doc.deleted_at:
            return Response(
                {"error": "Document must be in trash before permanent deletion. Use soft delete first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        doc_name = doc.doc_name

        # Delete associated data
        from django.db import connection
        with connection.cursor() as cursor:
            # Delete extraction staging rows to avoid FK violations
            try:
                cursor.execute("""
                    DELETE FROM landscape.ai_extraction_staging
                    WHERE doc_id = %s
                """, [doc_id])
            except Exception:
                logger.warning("Failed to delete ai_extraction_staging for doc %s", doc_id)

            # Delete extracted facts
            cursor.execute("""
                DELETE FROM landscape.doc_extracted_facts
                WHERE doc_id = %s
            """, [doc_id])
            facts_deleted = cursor.rowcount

            # Delete embeddings
            cursor.execute("""
                DELETE FROM landscape.knowledge_embeddings
                WHERE source_type = 'document' AND source_id = %s
            """, [doc_id])
            embeddings_deleted = cursor.rowcount

        # Delete the document record
        doc.delete()

        return Response({
            "success": True,
            "message": "Document permanently deleted",
            "doc_id": doc_id,
            "doc_name": doc_name,
            "facts_deleted": facts_deleted,
            "embeddings_deleted": embeddings_deleted
        })

    except Document.DoesNotExist:
        return Response(
            {"error": "Document not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception("Error permanently deleting doc %s", doc_id)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
