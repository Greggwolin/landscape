"""
Extraction API Views

Endpoints for AI-based data extraction from documents.
"""

print("=== EXTRACTION VERSION 2025-01-14 ===")

import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def extract_data(request, project_id: int):
    """
    POST /api/knowledge/projects/{project_id}/extract/

    Trigger AI extraction from project documents.

    Request body:
    {
        "extraction_type": "unit_mix" | "rent_roll" | "opex" | "market_comps" | "acquisition",
        "doc_ids": [optional list of specific doc IDs],
        "prompt": "optional additional instructions"
    }
    """
    from ..services.extraction_service import ExtractionService

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    extraction_type = body.get('extraction_type')
    if not extraction_type:
        return JsonResponse({
            'success': False,
            'error': 'extraction_type is required',
            'valid_types': ['unit_mix', 'rent_roll', 'opex', 'market_comps', 'acquisition']
        }, status=400)

    service = ExtractionService(int(project_id))

    result = service.extract_from_documents(
        extraction_type=extraction_type,
        doc_ids=body.get('doc_ids'),
        user_prompt=body.get('prompt')
    )

    status = 200 if result.get('success') else 400
    return JsonResponse(result, status=status)


@csrf_exempt
@require_http_methods(["GET"])
def get_pending_extractions(request, project_id: int):
    """
    GET /api/knowledge/projects/{project_id}/extractions/pending/

    Get all pending and conflict extractions for user validation.
    Includes summary counts and conflict details.
    """
    from ..services.extraction_service import ExtractionService

    service = ExtractionService(int(project_id))
    extractions = service.get_pending_extractions()
    summary = service.get_extraction_summary()

    # Serialize datetime objects
    for ext in extractions:
        if ext.get('created_at'):
            ext['created_at'] = ext['created_at'].isoformat()

    return JsonResponse({
        'success': True,
        'project_id': int(project_id),
        'count': len(extractions),
        'summary': summary,
        'extractions': extractions
    })


@csrf_exempt
@require_http_methods(["GET"])
def get_all_extractions(request, project_id: int):
    """
    GET /api/knowledge/projects/{project_id}/extractions/

    Get all extractions for a project (all statuses).
    """
    from django.db import connection

    status_filter = request.GET.get('status')

    with connection.cursor() as cursor:
        query = """
            SELECT
                e.extraction_id,
                e.doc_id,
                d.doc_name,
                e.target_table,
                e.target_field,
                e.extracted_value,
                e.extraction_type,
                e.source_text,
                e.confidence_score,
                e.status,
                e.validated_value,
                e.validated_by,
                e.validated_at,
                e.created_at
            FROM landscape.ai_extraction_staging e
            LEFT JOIN landscape.core_doc d ON e.doc_id = d.doc_id
            WHERE e.project_id = %s
        """
        params = [int(project_id)]

        if status_filter:
            query += " AND e.status = %s"
            params.append(status_filter)

        query += " ORDER BY e.created_at DESC"

        cursor.execute(query, params)
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()

        extractions = []
        for row in rows:
            ext = dict(zip(columns, row))
            # Serialize datetime objects
            if ext.get('created_at'):
                ext['created_at'] = ext['created_at'].isoformat()
            if ext.get('validated_at'):
                ext['validated_at'] = ext['validated_at'].isoformat()
            extractions.append(ext)

    return JsonResponse({
        'success': True,
        'project_id': int(project_id),
        'count': len(extractions),
        'extractions': extractions
    })


@csrf_exempt
@require_http_methods(["POST"])
def validate_extraction(request, project_id: int, extraction_id: int):
    """
    POST /api/knowledge/projects/{project_id}/extractions/{extraction_id}/validate/

    Validate, reject, or edit an extraction.

    Request body:
    {
        "action": "approve" | "reject" | "edit",
        "validated_value": {optional modified value if action is "edit"},
        "validated_by": "optional user identifier"
    }
    """
    from ..services.extraction_service import ExtractionService

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    action = body.get('action')
    if action not in ('approve', 'reject', 'edit'):
        return JsonResponse({
            'success': False,
            'error': 'action must be approve, reject, or edit'
        }, status=400)

    service = ExtractionService(int(project_id))

    result = service.validate_extraction(
        extraction_id=int(extraction_id),
        action=action,
        validated_value=body.get('validated_value'),
        validated_by=body.get('validated_by', 'user')
    )

    status = 200 if result.get('success') else 400
    return JsonResponse(result, status=status)


@csrf_exempt
@require_http_methods(["POST"])
def apply_extractions(request, project_id: int):
    """
    POST /api/knowledge/projects/{project_id}/extractions/apply/

    Apply all validated extractions to their target tables.
    """
    from django.db import connection
    from ..services.extraction_service import ExtractionService

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    extraction_ids = body.get('extraction_ids') or []
    decisions = body.get('decisions') or {}

    fields = body.get('fields') or []
    if fields and not extraction_ids:
        extraction_ids = [f.get('extraction_id') for f in fields if f.get('extraction_id')]
        for field in fields:
            extraction_id = field.get('extraction_id')
            if not extraction_id:
                continue
            field_value = field.get('value')
            decisions[str(extraction_id)] = {
                'action': 'edit' if field_value is not None else 'accept',
                'edited_value': field_value
            }

    if extraction_ids:
        placeholders = ','.join(['%s'] * len(extraction_ids))
        params = [int(project_id)] + [int(eid) for eid in extraction_ids]
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT extraction_id, extraction_type, scope
                FROM landscape.ai_extraction_staging
                WHERE project_id = %s
                  AND extraction_id IN ({placeholders})
            """, params)
            rows = cursor.fetchall()

        has_rent_roll = any((row[1] == 'rent_roll' or row[2] == 'unit') for row in rows)
        if has_rent_roll:
            from apps.documents.views import commit_staging_data_internal
            payload, status_code = commit_staging_data_internal(
                project_id=int(project_id),
                extraction_ids=extraction_ids,
                decisions=decisions,
                user=getattr(request, 'user', None),
                create_snapshot=True
            )
            return JsonResponse(payload, status=status_code)

    service = ExtractionService(int(project_id))
    result = service.apply_validated_extractions()

    return JsonResponse({
        'success': True,
        'project_id': int(project_id),
        **result
    })


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_extraction(request, project_id: int, extraction_id: int):
    """
    DELETE /api/knowledge/projects/{project_id}/extractions/{extraction_id}/

    Delete a pending extraction.
    """
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute("""
            DELETE FROM landscape.ai_extraction_staging
            WHERE extraction_id = %s
            AND project_id = %s
            AND status = 'pending'
            RETURNING extraction_id
        """, [int(extraction_id), int(project_id)])

        result = cursor.fetchone()

        if result:
            return JsonResponse({
                'success': True,
                'deleted_id': result[0]
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Extraction not found or not in pending status'
            }, status=404)


@csrf_exempt
@require_http_methods(["GET"])
def get_extraction_types(request):
    """
    GET /api/knowledge/extraction-types/

    Get available extraction types and their configurations.
    """
    from ..services.extraction_service import EXTRACTION_CONFIGS

    types = []
    for key, config in EXTRACTION_CONFIGS.items():
        types.append({
            'type': key,
            'target_table': config['target_table'],
            'required_fields': config['required_fields'],
            'description': config['prompt_template'].split('\n')[0]
        })

    return JsonResponse({
        'success': True,
        'types': types
    })


# ============================================================================
# Registry-Based Extraction Endpoints (v3)
# ============================================================================

@csrf_exempt
@require_http_methods(["POST"])
def validate_extraction_v2(request, project_id: int, extraction_id: int):
    """
    POST /api/knowledge/projects/{project_id}/extractions/{extraction_id}/validate-v2/

    Validate an extraction using the registry-based writer.

    Request body:
    {
        "action": "accept" | "reject" | "modify",
        "value": (optional) modified value if action='modify',
        "rejection_reason": (optional) if action='reject'
    }
    """
    from django.db import connection
    from ..services.extraction_writer import ExtractionWriter

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    action = body.get('action')
    modified_value = body.get('value')
    rejection_reason = body.get('rejection_reason')

    if action not in ['accept', 'reject', 'modify']:
        return JsonResponse(
            {'error': 'Invalid action. Use accept, reject, or modify'},
            status=400
        )

    with connection.cursor() as cursor:
        # Get the extraction
        cursor.execute("""
            SELECT
                extraction_id, field_key, property_type, extracted_value,
                target_table, target_field, db_write_type, selector_json,
                scope, scope_id, doc_id, source_page, status
            FROM landscape.ai_extraction_staging
            WHERE extraction_id = %s AND project_id = %s
        """, [extraction_id, project_id])

        row = cursor.fetchone()
        if not row:
            return JsonResponse({'error': 'Extraction not found'}, status=404)

        columns = ['extraction_id', 'field_key', 'property_type', 'extracted_value',
                  'target_table', 'target_field', 'db_write_type', 'selector_json',
                  'scope', 'scope_id', 'doc_id', 'source_page', 'status']
        extraction = dict(zip(columns, row))

        if extraction['status'] not in ('pending', None):
            return JsonResponse({'error': f"Extraction already {extraction['status']}"}, status=400)

        # Parse JSON fields
        extracted_value = extraction['extracted_value']
        if isinstance(extracted_value, str):
            extracted_value = json.loads(extracted_value)

        final_value = modified_value if action == 'modify' else extracted_value
        new_status = 'accepted' if action in ['accept', 'modify'] else 'rejected'

        # Get username
        validated_by = getattr(request, 'user', None)
        if validated_by and hasattr(validated_by, 'username'):
            validated_by = validated_by.username
        else:
            validated_by = 'user'

        # Update staging record
        cursor.execute("""
            UPDATE landscape.ai_extraction_staging
            SET status = %s,
                validated_value = %s,
                validated_by = %s,
                validated_at = NOW(),
                rejection_reason = %s
            WHERE extraction_id = %s
        """, [
            new_status,
            json.dumps(final_value) if action != 'reject' else None,
            validated_by,
            rejection_reason if action == 'reject' else None,
            extraction_id
        ])

    # If accepted/modified and has field_key, write to production using registry
    result_message = None
    if action in ['accept', 'modify'] and extraction.get('field_key'):
        property_type = extraction.get('property_type', 'multifamily')
        writer = ExtractionWriter(int(project_id), property_type)
        success, message = writer.write_extraction(
            extraction_id=extraction_id,
            field_key=extraction['field_key'],
            value=final_value,
            scope_id=extraction['scope_id'],
            source_doc_id=extraction['doc_id'],
            source_page=extraction['source_page']
        )

        if not success:
            # Rollback status
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE landscape.ai_extraction_staging
                    SET status = 'pending', validated_value = NULL, validated_at = NULL
                    WHERE extraction_id = %s
                """, [extraction_id])
            return JsonResponse({'error': f'Write failed: {message}'}, status=500)

        result_message = message

    return JsonResponse({
        'status': 'success',
        'action': action,
        'extraction_id': extraction_id,
        'new_status': new_status,
        'write_result': result_message
    })


@csrf_exempt
@require_http_methods(["POST"])
def bulk_validate_extractions(request, project_id: int):
    """
    POST /api/knowledge/projects/{project_id}/extractions/bulk-validate/

    Accept or reject multiple extractions at once.

    Request body:
    {
        "extraction_ids": [1, 2, 3, ...],
        "action": "accept" | "reject"
    }
    """
    from django.db import connection, transaction
    from ..services.extraction_writer import ExtractionWriter

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    extraction_ids = body.get('extraction_ids', [])
    action = body.get('action', 'accept')

    if not extraction_ids:
        return JsonResponse({'error': 'No extraction_ids provided'}, status=400)

    if action not in ['accept', 'reject']:
        return JsonResponse({'error': 'Bulk action must be accept or reject'}, status=400)

    results = {'success': [], 'failed': []}
    new_status = 'accepted' if action == 'accept' else 'rejected'

    # Get username
    validated_by = getattr(request, 'user', None)
    if validated_by and hasattr(validated_by, 'username'):
        validated_by = validated_by.username
    else:
        validated_by = 'user'

    for ext_id in extraction_ids:
        try:
            with connection.cursor() as cursor:
                # Get the extraction
                cursor.execute("""
                    SELECT
                        extraction_id, field_key, property_type, extracted_value,
                        scope_id, doc_id, source_page, status
                    FROM landscape.ai_extraction_staging
                    WHERE extraction_id = %s AND project_id = %s
                """, [ext_id, project_id])

                row = cursor.fetchone()
                if not row:
                    results['failed'].append({'id': ext_id, 'error': 'Not found'})
                    continue

                columns = ['extraction_id', 'field_key', 'property_type', 'extracted_value',
                          'scope_id', 'doc_id', 'source_page', 'status']
                extraction = dict(zip(columns, row))

                if extraction['status'] not in ('pending', None):
                    results['failed'].append({'id': ext_id, 'error': f"Already {extraction['status']}"})
                    continue

                # Parse extracted value
                extracted_value = extraction['extracted_value']
                if isinstance(extracted_value, str):
                    extracted_value = json.loads(extracted_value)

                # Update staging record
                cursor.execute("""
                    UPDATE landscape.ai_extraction_staging
                    SET status = %s,
                        validated_value = %s,
                        validated_by = %s,
                        validated_at = NOW()
                    WHERE extraction_id = %s
                """, [
                    new_status,
                    json.dumps(extracted_value) if action == 'accept' else None,
                    validated_by,
                    ext_id
                ])

            # If accepting and has field_key, write to production
            if action == 'accept' and extraction.get('field_key'):
                property_type = extraction.get('property_type', 'multifamily')
                writer = ExtractionWriter(int(project_id), property_type)
                success, message = writer.write_extraction(
                    extraction_id=ext_id,
                    field_key=extraction['field_key'],
                    value=extracted_value,
                    scope_id=extraction['scope_id'],
                    source_doc_id=extraction['doc_id'],
                    source_page=extraction['source_page']
                )

                if success:
                    results['success'].append({'id': ext_id, 'message': message})
                else:
                    # Rollback status
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            UPDATE landscape.ai_extraction_staging
                            SET status = 'pending', validated_value = NULL, validated_at = NULL
                            WHERE extraction_id = %s
                        """, [ext_id])
                    results['failed'].append({'id': ext_id, 'error': message})
            else:
                results['success'].append({'id': ext_id})

        except Exception as e:
            logger.error(f"Bulk validation error for {ext_id}: {e}")
            results['failed'].append({'id': ext_id, 'error': str(e)})

    return JsonResponse({
        'status': 'complete',
        'action': action,
        'success_count': len(results['success']),
        'failed_count': len(results['failed']),
        'results': results
    })


@csrf_exempt
@require_http_methods(["GET"])
def get_field_registry(request):
    """
    GET /api/knowledge/field-registry/

    Get the field registry mappings.

    Query params:
    - property_type: 'multifamily' | 'land_development' (default: multifamily)
    - scope: filter by scope (project, unit_type, etc.)
    - extractable_only: if 'true', only return extractable fields
    """
    from ..services.field_registry import get_registry

    property_type = request.GET.get('property_type', 'multifamily')
    scope_filter = request.GET.get('scope')
    extractable_only = request.GET.get('extractable_only', '').lower() == 'true'

    registry = get_registry()

    if extractable_only:
        fields = registry.get_extractable_fields(property_type)
    elif scope_filter:
        fields = registry.get_fields_by_scope(scope_filter, property_type)
    else:
        fields = list(registry.get_all_mappings(property_type).values())

    # Convert to dicts
    result = []
    for f in fields:
        result.append({
            'field_key': f.field_key,
            'label': f.label,
            'field_type': f.field_type,
            'required': f.required,
            'extractability': f.extractability,
            'extract_policy': f.extract_policy,
            'scope': f.scope,
            'db_write_type': f.db_write_type,
            'db_target': f.db_target,
            'resolved': f.resolved,
            'selector_json': f.selector_json,
        })

    return JsonResponse({
        'success': True,
        'property_type': property_type,
        'count': len(result),
        'fields': result
    })


# ============================================================================
# Document Classification & Registry-Based Extraction (v3)
# ============================================================================

@csrf_exempt
@require_http_methods(["GET"])
def classify_document(request, doc_id: int):
    """
    GET /api/knowledge/documents/{doc_id}/classify/

    Classify a document type based on content analysis.

    Returns document type, confidence, and matched patterns.
    """
    from ..services.document_classifier import DocumentClassifier

    classifier = DocumentClassifier()
    result = classifier.classify_document(int(doc_id))

    return JsonResponse({
        'success': True,
        'doc_id': result.doc_id,
        'doc_name': result.doc_name,
        'classification': {
            'type': result.evidence_type,
            'confidence': result.confidence,
            'matched_patterns': result.matched_patterns
        }
    })


@csrf_exempt
@require_http_methods(["GET"])
def classify_project_documents(request, project_id: int):
    """
    GET /api/knowledge/projects/{project_id}/documents/classify/

    Classify all documents in a project.
    """
    from ..services.document_classifier import DocumentClassifier

    classifier = DocumentClassifier(int(project_id))
    results = classifier.classify_project_documents()

    documents = []
    for r in results:
        documents.append({
            'doc_id': r.doc_id,
            'doc_name': r.doc_name,
            'type': r.evidence_type,
            'confidence': r.confidence,
            'matched_patterns': r.matched_patterns[:3]  # Top 3 patterns
        })

    return JsonResponse({
        'success': True,
        'project_id': int(project_id),
        'document_count': len(documents),
        'documents': documents
    })


@csrf_exempt
@require_http_methods(["POST"])
def extract_document_v3(request, doc_id: int):
    """
    POST /api/knowledge/documents/{doc_id}/extract/

    Extract data from a document using the registry-based extractor.

    Request body (optional):
    {
        "project_id": (required if doc not in project context),
        "property_type": "multifamily" | "land_development",
        "field_keys": [optional list of specific field keys to extract],
        "high_extractability_only": true | false
    }
    """
    from ..services.extraction_service import RegistryBasedExtractor
    from django.db import connection

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    # Get project_id from body or lookup from document
    project_id = body.get('project_id')
    if not project_id:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT project_id FROM landscape.core_doc WHERE doc_id = %s
            """, [int(doc_id)])
            row = cursor.fetchone()
            if row:
                project_id = row[0]
            else:
                return JsonResponse({'success': False, 'error': 'Document not found'}, status=404)

    property_type = body.get('property_type', 'multifamily')
    field_keys = body.get('field_keys')
    high_extractability_only = body.get('high_extractability_only', False)

    extractor = RegistryBasedExtractor(int(project_id), property_type)

    result = extractor.extract_from_document(
        doc_id=int(doc_id),
        field_keys=field_keys,
        high_extractability_only=high_extractability_only
    )

    status = 200 if result.get('success') else 400
    return JsonResponse(result, status=status)


@csrf_exempt
@require_http_methods(["POST"])
def extract_document_batched(request, doc_id: int):
    """
    POST /api/knowledge/documents/{doc_id}/extract-batched/

    Extract data from a document using batched extraction (scope-grouped).
    This breaks extraction into smaller batches to avoid response size limits.

    Request body:
    {
        "project_id": (required),
        "batches": [optional list of batch names to run],
        "property_type": "multifamily" | "land_development"
    }

    Available batches:
    - core_property: project, mf_property scopes
    - financials: opex, income, assumption scopes
    - unit_types: unit_type scope
    - comparables: sales_comp, rent_comp scopes
    - deal_market: acquisition, market scopes
    - rent_roll: unit scope

    Returns summary of all batches with staged extraction counts.
    """
    print(f"=== EXTRACT_DOCUMENT_BATCHED ENTRY ===")
    print(f"DOC_ID: {doc_id}")

    from ..services.extraction_service import extract_document_batched as do_extract_batched

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    project_id = body.get('project_id')
    if not project_id:
        return JsonResponse({'success': False, 'error': 'project_id is required'}, status=400)

    # Validate project_id is a valid integer
    try:
        project_id_int = int(project_id)
    except (ValueError, TypeError):
        return JsonResponse(
            {'success': False, 'error': 'Invalid project_id — must be an integer'},
            status=400
        )

    batches = body.get('batches')  # Optional list of batch names
    property_type = body.get('property_type', 'multifamily')

    # Get user_id if available
    user_id = None
    if hasattr(request, 'user') and hasattr(request.user, 'id'):
        user_id = request.user.id

    try:
        result = do_extract_batched(
            project_id=project_id_int,
            doc_id=int(doc_id),
            batches=batches,
            property_type=property_type,
            user_id=user_id
        )

        status = 200 if result.get('success') else 400
        return JsonResponse(result, status=status)
    except Exception as e:
        logger.exception(f"Extraction failed for doc_id={doc_id}, project_id={project_id}: {e}")
        return JsonResponse(
            {'success': False, 'error': f'Extraction failed: {str(e)}'},
            status=500
        )


@csrf_exempt
@require_http_methods(["POST"])
def extract_project_v3(request, project_id: int):
    """
    POST /api/knowledge/projects/{project_id}/extract-all/

    Extract from all documents in a project using registry-based extractor.

    Request body (optional):
    {
        "property_type": "multifamily" | "land_development",
        "doc_ids": [optional list of specific doc IDs],
        "high_extractability_only": true | false
    }
    """
    from ..services.extraction_service import RegistryBasedExtractor

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    property_type = body.get('property_type', 'multifamily')
    doc_ids = body.get('doc_ids')
    high_extractability_only = body.get('high_extractability_only', True)

    try:
        extractor = RegistryBasedExtractor(int(project_id), property_type)

        result = extractor.extract_from_project(
            doc_ids=doc_ids,
            high_extractability_only=high_extractability_only
        )

        return JsonResponse(result)
    except (ValueError, TypeError) as e:
        return JsonResponse(
            {'success': False, 'error': f'Invalid project_id: {str(e)}'},
            status=400
        )
    except Exception as e:
        logger.exception(f"Project extraction failed for project_id={project_id}: {e}")
        return JsonResponse(
            {'success': False, 'error': f'Extraction failed: {str(e)}'},
            status=500
        )


@csrf_exempt
@require_http_methods(["GET"])
def preview_extractable_fields(request, doc_id: int):
    """
    GET /api/knowledge/documents/{doc_id}/extractable-fields/

    Preview what fields can be extracted from a document without running extraction.

    Returns classification and available fields based on document type.
    """
    from ..services.extraction_service import classify_and_preview
    from django.db import connection

    # Get project_id from document
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT project_id FROM landscape.core_doc WHERE doc_id = %s
        """, [int(doc_id)])
        row = cursor.fetchone()
        if not row:
            return JsonResponse({'success': False, 'error': 'Document not found'}, status=404)
        project_id = row[0]

    result = classify_and_preview(project_id, int(doc_id))
    result['success'] = True

    return JsonResponse(result)


@csrf_exempt
@require_http_methods(["GET"])
def get_fields_for_doc_type(request, doc_type: str):
    """
    GET /api/knowledge/fields/{doc_type}/

    Get extractable fields for a specific document type.

    Path params:
    - doc_type: offering_memorandum, rent_roll, t12, appraisal, comp_report, site_plan, proforma

    Query params:
    - property_type: 'multifamily' | 'land_development' (default: multifamily)
    - high_only: if 'true', only return high extractability fields
    """
    from ..services.field_registry import get_registry

    property_type = request.GET.get('property_type', 'multifamily')
    high_only = request.GET.get('high_only', '').lower() == 'true'

    registry = get_registry()
    fields = registry.get_extraction_fields_for_doc_type(
        doc_type,
        property_type,
        high_extractability_only=high_only
    )

    result = []
    for f in fields:
        result.append({
            'field_key': f.field_key,
            'label': f.label,
            'field_type': f.field_type,
            'required': f.required,
            'extractability': f.extractability,
            'scope': f.scope,
            'db_target': f.db_target,
            'evidence_types': f.evidence_types
        })

    return JsonResponse({
        'success': True,
        'doc_type': doc_type,
        'property_type': property_type,
        'count': len(result),
        'fields': result
    })


@csrf_exempt
@require_http_methods(["POST"])
def extract_rent_roll(request, doc_id: int):
    """
    POST /api/knowledge/documents/{doc_id}/extract-rent-roll/

    Extract rent roll data from a document using chunked extraction.
    This handles large rent rolls (100+ units) by splitting into ~35 unit chunks.

    Request body:
    {
        "project_id": (required),
        "property_type": "multifamily" (optional, default: multifamily)
    }

    Returns:
    {
        "success": true/false,
        "doc_id": 58,
        "project_id": 17,
        "job_id": 123,
        "estimated_units": 113,
        "chunks_processed": 4,
        "units_extracted": 113,
        "staged_count": 113,
        "errors": []
    }
    """
    from django.utils import timezone
    from ..services.extraction_service import extract_rent_roll_chunked
    from ..models import ExtractionJob

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    project_id = body.get('project_id')
    if not project_id:
        return JsonResponse({'success': False, 'error': 'project_id is required'}, status=400)

    property_type = body.get('property_type', 'multifamily')

    # Get user if available
    user = None
    if hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user

    # Check for existing active job for this project/scope
    existing_job = ExtractionJob.objects.filter(
        project_id=project_id,
        scope=ExtractionJob.Scope.RENT_ROLL,
        status__in=[ExtractionJob.Status.QUEUED, ExtractionJob.Status.PROCESSING]
    ).first()

    if existing_job:
        return JsonResponse({
            'success': False,
            'error': 'An extraction is already in progress for this project',
            'job_id': existing_job.job_id,
            'status': existing_job.status,
        }, status=409)

    # Create job record
    job = ExtractionJob.objects.create(
        project_id=int(project_id),
        document_id=int(doc_id),
        scope=ExtractionJob.Scope.RENT_ROLL,
        status=ExtractionJob.Status.PROCESSING,
        started_at=timezone.now(),
        created_by=user
    )

    try:
        result = extract_rent_roll_chunked(
            project_id=int(project_id),
            doc_id=int(doc_id),
            property_type=property_type,
            user_id=user.id if user else None
        )

        # Update job with results
        if result.get('success'):
            job.status = ExtractionJob.Status.COMPLETED
            job.completed_at = timezone.now()
            job.total_items = result.get('units_extracted', 0)
            job.processed_items = result.get('staged_count', 0)
            job.result_summary = {
                'units_extracted': result.get('units_extracted', 0),
                'staged_count': result.get('staged_count', 0),
                'chunks_processed': result.get('chunks_processed', 0),
                'estimated_units': result.get('estimated_units', 0),
            }
        else:
            job.status = ExtractionJob.Status.FAILED
            job.completed_at = timezone.now()
            job.error_message = result.get('error', 'Extraction failed')

        job.save()

        # Include job_id in response
        result['job_id'] = job.job_id

        status_code = 200 if result.get('success') else 400
        return JsonResponse(result, status=status_code)

    except Exception as e:
        # Update job with failure
        job.status = ExtractionJob.Status.FAILED
        job.completed_at = timezone.now()
        job.error_message = str(e)
        job.save()

        return JsonResponse({
            'success': False,
            'error': str(e),
            'job_id': job.job_id,
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def compare_rent_roll(request, project_id: int):
    """
    POST /api/knowledge/projects/{project_id}/rent-roll/compare/

    Compare extracted rent roll against existing data.
    Returns deltas only + analysis summary.
    """
    from django.db import connection
    from apps.documents.models import Document
    from apps.multifamily.models import MultifamilyUnit, MultifamilyLease
    from ..services.extraction_service import PlaceholderDetector

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    document_id = body.get('document_id')
    if not document_id:
        return JsonResponse({'success': False, 'error': 'document_id is required'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                extraction_id,
                extracted_value
            FROM landscape.ai_extraction_staging
            WHERE project_id = %s
              AND doc_id = %s
              AND status = 'pending'
              AND (extraction_type = 'rent_roll' OR scope = 'unit')
            ORDER BY extraction_id
        """, [int(project_id), int(document_id)])
        staged_rows = cursor.fetchall()

    doc = Document.objects.filter(doc_id=document_id).first()
    document_name = doc.doc_name if doc else None

    def _normalize_value(value):
        from decimal import Decimal
        if value is None:
            return None
        # Handle Decimal explicitly (before string check since Decimal can be converted to str)
        if isinstance(value, Decimal):
            return round(float(value), 2)
        if isinstance(value, str):
            cleaned = value.strip()
            if cleaned == '' or cleaned.lower() in ('null', 'none', 'n/a', '-'):
                return None
            try:
                num = float(cleaned.replace(',', '').replace('$', '').replace('%', ''))
                return round(num, 2)
            except ValueError:
                return cleaned.lower()
        if isinstance(value, (int, float)):
            return round(float(value), 2)
        if hasattr(value, 'isoformat'):
            return value.isoformat()
        if isinstance(value, (dict, list)):
            return json.dumps(value, sort_keys=True)
        return value

    # Build existing unit + latest lease map
    units = list(MultifamilyUnit.objects.filter(project_id=project_id).values())
    leases = list(
        MultifamilyLease.objects.filter(unit__project_id=project_id)
        .order_by('-lease_start_date')
        .values('unit_id', 'resident_name', 'lease_start_date', 'lease_end_date', 'base_rent_monthly')
    )
    lease_by_unit_id = {}
    for lease in leases:
        unit_id = lease.get('unit_id')
        if unit_id and unit_id not in lease_by_unit_id:
            lease_by_unit_id[unit_id] = lease

    existing_units = []
    existing_by_unit_num = {}
    for unit in units:
        unit_number = unit.get('unit_number')
        lease = lease_by_unit_id.get(unit.get('unit_id'))
        current_rent = unit.get('current_rent')
        if current_rent is None and lease:
            current_rent = lease.get('base_rent_monthly')

        combined = {
            'unit_number': unit_number,
            'unit_type': unit.get('unit_type'),
            'bedrooms': unit.get('bedrooms'),
            'bathrooms': unit.get('bathrooms'),
            'square_feet': unit.get('square_feet'),
            'current_rent': current_rent,
            'market_rent': unit.get('market_rent'),
            'occupancy_status': unit.get('occupancy_status'),
            'tenant_name': lease.get('resident_name') if lease else None,
            'lease_start': lease.get('lease_start_date') if lease else None,
            'lease_end': lease.get('lease_end_date') if lease else None,
            'move_in_date': None,
        }
        existing_units.append(combined)
        if unit_number is not None:
            existing_by_unit_num[str(unit_number)] = combined

    placeholder_analysis = PlaceholderDetector.analyze_rent_roll(existing_units)

    deltas = []
    exact_matches = 0
    fills = 0
    conflicts = 0

    for extraction_id, extracted_value in staged_rows:
        extracted_data = extracted_value
        if isinstance(extracted_data, str):
            try:
                extracted_data = json.loads(extracted_data)
            except json.JSONDecodeError:
                continue

        if not isinstance(extracted_data, dict):
            continue

        unit_number = extracted_data.get('unit_number')
        existing = existing_by_unit_num.get(str(unit_number), {})
        unit_deltas = []

        for field, extracted_field_value in extracted_data.items():
            if field in ('id', 'extraction_id'):
                continue

            extracted_norm = _normalize_value(extracted_field_value)
            if extracted_norm is None:
                continue

            existing_value = existing.get(field)
            existing_norm = _normalize_value(existing_value)

            if extracted_norm == existing_norm:
                exact_matches += 1
                continue

            field_placeholder = placeholder_analysis['fields'].get(field, {})
            is_placeholder = field_placeholder.get('is_placeholder', False)

            if existing_norm is None and extracted_norm is not None:
                fills += 1
                unit_deltas.append({
                    'field': field,
                    'action': 'fill',
                    'extracted_value': extracted_field_value,
                    'existing_value': None
                })
            elif is_placeholder:
                fills += 1
                unit_deltas.append({
                    'field': field,
                    'action': 'replace_placeholder',
                    'extracted_value': extracted_field_value,
                    'existing_value': existing_value,
                    'placeholder_pattern': field_placeholder.get('pattern')
                })
            else:
                conflicts += 1
                unit_deltas.append({
                    'field': field,
                    'action': 'conflict',
                    'extracted_value': extracted_field_value,
                    'existing_value': existing_value
                })

        if unit_deltas:
            deltas.append({
                'unit_number': unit_number,
                'extraction_id': extraction_id,
                'changes': unit_deltas
            })

    analysis_message_parts = []
    if placeholder_analysis['placeholder_detected']:
        fields = ', '.join(placeholder_analysis['placeholder_fields'])
        analysis_message_parts.append(
            f"Placeholder data detected in: {fields}. "
            "The existing values appear to be defaults, not actual lease data."
        )
    if fills > 0 and conflicts == 0:
        analysis_message_parts.append(f"{fills} blank fields will be populated from this file.")
    if conflicts > 0:
        analysis_message_parts.append(f"{conflicts} fields have different values that need review.")
    if exact_matches > 0:
        analysis_message_parts.append(f"{exact_matches} fields matched exactly and will not be modified.")

    analysis_message = ' '.join(analysis_message_parts)

    if placeholder_analysis['placeholder_detected'] and conflicts == 0:
        recommendation = 'accept_all'
    elif conflicts > 0:
        recommendation = 'review_conflicts'
    else:
        recommendation = 'accept_all'

    return JsonResponse({
        'document_name': document_name,
        'summary': {
            'total_fields_extracted': exact_matches + fills + conflicts,
            'exact_matches': exact_matches,
            'fills': fills,
            'conflicts': conflicts
        },
        'analysis': {
            'placeholder_detected': placeholder_analysis['placeholder_detected'],
            'placeholder_fields': placeholder_analysis['placeholder_fields'],
            'message': analysis_message,
            'recommendation': recommendation
        },
        'deltas': deltas
    })


@csrf_exempt
@require_http_methods(["GET"])
def list_rent_roll_snapshots(request, project_id: int):
    """
    GET /api/knowledge/projects/{project_id}/snapshots/

    List available snapshots for rollback.
    Returns snapshots ordered by most recent first.
    """
    from apps.documents.models import ExtractionCommitSnapshot

    snapshots = ExtractionCommitSnapshot.objects.filter(
        project_id=project_id,
        scope='rent_roll',
    ).order_by('-committed_at')[:20]

    result = []
    for snap in snapshots:
        extraction_ids = snap.changes_applied.get('extraction_ids', []) if snap.changes_applied else []
        result.append({
            'snapshot_id': snap.snapshot_id,
            'committed_at': snap.committed_at.isoformat() if snap.committed_at else None,
            'is_active': snap.is_active,
            'rolled_back_at': snap.rolled_back_at.isoformat() if snap.rolled_back_at else None,
            'units_count': len(snap.snapshot_data.get('units', [])) if snap.snapshot_data else 0,
            'extractions_count': len(extraction_ids),
            'doc_id': snap.doc_id,
        })

    return JsonResponse({
        'success': True,
        'snapshots': result
    })


@csrf_exempt
@require_http_methods(["GET"])
def get_extraction_jobs(request, project_id: int):
    """
    GET /api/knowledge/projects/{project_id}/extraction-jobs/

    Get status of extraction jobs for a project.

    Query params:
    - scope: Filter by scope (rent_roll, operating_statement, etc.)

    Returns list of jobs with their current status.
    """
    from ..models import ExtractionJob
    from django.db import connection

    scope = request.GET.get('scope')

    # Get jobs for this project
    jobs = ExtractionJob.objects.filter(project_id=project_id)

    if scope:
        jobs = jobs.filter(scope=scope)

    # Get the most recent job per scope
    jobs = jobs.order_by('scope', '-created_at')

    latest_jobs = {}
    for job in jobs:
        if job.scope not in latest_jobs:
            latest_jobs[job.scope] = job

    # Get document names
    doc_ids = [j.document_id for j in latest_jobs.values()]
    doc_names = {}
    if doc_ids:
        with connection.cursor() as cursor:
            placeholders = ','.join(['%s'] * len(doc_ids))
            cursor.execute(f"""
                SELECT doc_id, doc_name FROM landscape.core_doc
                WHERE doc_id IN ({placeholders})
            """, doc_ids)
            for row in cursor.fetchall():
                doc_names[row[0]] = row[1]

    results = []
    for scope_key, job in latest_jobs.items():
        results.append({
            'id': job.job_id,
            'scope': job.scope,
            'status': job.status,
            'document_id': job.document_id,
            'document_name': doc_names.get(job.document_id),
            'progress': {
                'total': job.total_items,
                'processed': job.processed_items,
                'percent': job.progress_percent,
            },
            'result_summary': job.result_summary,
            'error_message': job.error_message,
            'created_at': job.created_at.isoformat(),
            'started_at': job.started_at.isoformat() if job.started_at else None,
            'completed_at': job.completed_at.isoformat() if job.completed_at else None,
        })

    return JsonResponse({'success': True, 'jobs': results})


@require_http_methods(["GET"])
def get_extraction_job(request, project_id: int, job_id: int):
    """
    GET /api/knowledge/projects/{project_id}/extraction-jobs/{job_id}/

    Get status of a single extraction job.
    Used for polling after apply-mapping starts async extraction.
    """
    from ..models import ExtractionJob
    from django.db import connection

    try:
        job = ExtractionJob.objects.get(job_id=job_id, project_id=project_id)
    except ExtractionJob.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Job not found'}, status=404)

    # Get document name
    doc_name = None
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT doc_name FROM landscape.core_doc WHERE doc_id = %s
        """, [job.document_id])
        row = cursor.fetchone()
        if row:
            doc_name = row[0]

    return JsonResponse({
        'success': True,
        'job': {
            'id': job.job_id,
            'scope': job.scope,
            'status': job.status,
            'document_id': job.document_id,
            'document_name': doc_name,
            'progress': {
                'total': job.total_items,
                'processed': job.processed_items,
                'percent': job.progress_percent,
            },
            'result_summary': job.result_summary,
            'error_message': job.error_message,
            'created_at': job.created_at.isoformat(),
            'started_at': job.started_at.isoformat() if job.started_at else None,
            'completed_at': job.completed_at.isoformat() if job.completed_at else None,
        }
    })


@csrf_exempt
@require_http_methods(["POST"])
def cancel_extraction_job(request, project_id: int, job_id: int):
    """
    POST /api/knowledge/projects/{project_id}/extraction-jobs/{job_id}/cancel/

    Cancel a running extraction job.
    """
    from django.utils import timezone
    from django.db import connection
    from ..models import ExtractionJob

    try:
        job = ExtractionJob.objects.get(
            job_id=job_id,
            project_id=project_id
        )
    except ExtractionJob.DoesNotExist:
        return JsonResponse(
            {'success': False, 'error': 'Job not found'},
            status=404
        )

    if job.status not in (ExtractionJob.Status.QUEUED, ExtractionJob.Status.PROCESSING):
        return JsonResponse(
            {'success': False, 'error': 'Job cannot be cancelled (already completed or failed)'},
            status=400
        )

    job.status = ExtractionJob.Status.CANCELLED
    job.completed_at = timezone.now()
    job.error_message = 'Cancelled by user'
    job.save()

    logger.info(f"[cancel_extraction_job] Cancelled job {job_id} for project {project_id}")

    # Clear any staged data for this document
    with connection.cursor() as cursor:
        cursor.execute("""
            DELETE FROM landscape.ai_extraction_staging
            WHERE project_id = %s
            AND doc_id = %s
            AND status = 'pending'
        """, [project_id, job.document_id])
        deleted_count = cursor.rowcount

    logger.info(f"[cancel_extraction_job] Cleaned up {deleted_count} pending extractions for doc {job.document_id}")

    return JsonResponse({
        'success': True,
        'message': 'Job cancelled',
        'cleaned_up': deleted_count
    })


@csrf_exempt
@require_http_methods(["POST"])
def rollback_rent_roll_commit(request, project_id: int, snapshot_id: int):
    """
    POST /api/knowledge/projects/{project_id}/rollback/{snapshot_id}/

    Rollback a previous extraction commit.
    """
    from django.db import transaction, connection
    from django.utils import timezone
    from apps.documents.models import ExtractionCommitSnapshot
    from apps.multifamily.models import MultifamilyUnit, MultifamilyLease

    try:
        snapshot = ExtractionCommitSnapshot.objects.get(
            snapshot_id=snapshot_id,
            project_id=project_id,
            is_active=True
        )
    except ExtractionCommitSnapshot.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Snapshot not found or no longer available for rollback'
        }, status=404)

    snapshot_units = snapshot.snapshot_data.get('units', [])
    snapshot_leases = snapshot.snapshot_data.get('leases', [])

    with transaction.atomic():
        MultifamilyLease.objects.filter(unit__project_id=project_id).delete()
        MultifamilyUnit.objects.filter(project_id=project_id).delete()

        for unit_data in snapshot_units:
            unit_data = dict(unit_data)
            unit_data.pop('unit_id', None)
            unit_data.pop('created_at', None)
            unit_data.pop('updated_at', None)
            MultifamilyUnit.objects.create(**unit_data)

        for lease_data in snapshot_leases:
            lease_data = dict(lease_data)
            lease_data.pop('lease_id', None)
            lease_data.pop('created_at', None)
            lease_data.pop('updated_at', None)
            unit_number = lease_data.pop('unit_number', None)
            if not unit_number:
                continue
            unit = MultifamilyUnit.objects.filter(
                project_id=project_id,
                unit_number=unit_number
            ).first()
            if not unit:
                continue
            lease_data['unit_id'] = unit.unit_id
            MultifamilyLease.objects.create(**lease_data)

        snapshot.is_active = False
        snapshot.rolled_back_at = timezone.now()
        snapshot.save()

        extraction_ids = snapshot.changes_applied.get('extraction_ids', [])
        if extraction_ids:
            placeholders = ','.join(['%s'] * len(extraction_ids))
            params = [int(project_id)] + [int(eid) for eid in extraction_ids]
            with connection.cursor() as cursor:
                cursor.execute(f"""
                    UPDATE landscape.ai_extraction_staging
                    SET status = 'rolled_back'
                    WHERE project_id = %s
                      AND extraction_id IN ({placeholders})
                """, params)

    return JsonResponse({
        'success': True,
        'units_restored': len(snapshot_units),
        'message': 'Rent roll restored to previous state'
    })


# ============================================================================
# Extraction History Report Endpoint
# ============================================================================

# Category mapping for filter pills - maps field_key patterns to categories
FIELD_CATEGORY_MAPPING = {
    # Project category - property identification
    'project': [
        'property_name', 'street_address', 'city', 'state', 'county', 'zip_code',
        'submarket', 'market', 'apn_primary', 'listing_brokerage', 'property_class',
        'property_subtype', 'location_lat', 'location_lon', 'location_description',
        'year_built', 'year_renovated', 'zoning', 'zoning_description', 'neighborhood'
    ],
    # Physical category - property characteristics
    'physical': [
        'total_units', 'total_sf', 'rentable_sf', 'avg_unit_size', 'stories',
        'buildings', 'parking_spaces', 'parking_ratio', 'lot_size', 'lot_acres',
        'density', 'condition', 'construction_type', 'amenities', 'unit_mix',
        'covered_parking', 'carport_spaces', 'garage_spaces', 'surface_spaces'
    ],
    # Pricing category - valuation metrics
    'pricing': [
        'purchase_price', 'asking_price', 'price_per_unit', 'price_per_sf',
        'cap_rate', 'going_in_cap', 'exit_cap', 'offer_price', 'list_price',
        'market_value', 'appraised_value', 'stabilized_value', 'grm', 'price_to_rent'
    ],
    # Income category - revenue and rent
    'income': [
        'gross_potential_rent', 'gpr', 'effective_gross_income', 'egi',
        'vacancy_rate', 'economic_vacancy', 'physical_vacancy', 'concessions',
        'loss_to_lease', 'other_income', 'laundry_income', 'parking_income',
        'pet_income', 'utility_reimbursement', 'storage_income', 'late_fees',
        'application_fees', 'noi', 'net_operating_income',
        # Rent roll / unit fields
        'unit_number', 'unit_type', 'unit_rent', 'market_rent', 'lease_start',
        'lease_end', 'tenant_name', 'deposit', 'move_in_date', 'in_place_rent',
        'bed_count', 'bath_count'
    ],
    # Expenses category - operating expenses
    'expenses': [
        'total_operating_expenses', 'opex', 'expense_ratio',
        'property_taxes', 'real_estate_taxes', 'insurance', 'utilities',
        'repairs_maintenance', 'property_management', 'management_fee',
        'payroll', 'administrative', 'marketing', 'contract_services',
        'turnover_costs', 'reserves', 'replacement_reserves', 'professional_fees',
        'landscaping', 'trash', 'pest_control', 'security', 'elevator', 'hvac'
    ],
    # Market category - demographics and comps
    'market': [
        'submarket', 'msa', 'population', 'median_income', 'avg_household_income',
        'employment_growth', 'rent_growth', 'absorption_rate', 'occupancy_rate',
        'comp_rent', 'comp_cap_rate', 'comp_price_per_unit', 'comp_property_name',
        'comp_sale_date', 'comp_sale_price'
    ],
    # Debt category - financing
    'debt': [
        'loan_amount', 'loan_to_value', 'ltv', 'debt_service_coverage', 'dscr',
        'interest_rate', 'loan_term', 'amortization', 'lender', 'loan_type',
        'prepayment_penalty', 'maturity_date', 'debt_yield', 'debt_service',
        'io_period', 'balloon_amount'
    ]
}

# Reverse mapping: field_key -> category
def get_field_category(field_key: str) -> str:
    """Get category for a field key using pattern matching."""
    if not field_key:
        return 'other'

    field_lower = field_key.lower()

    for category, patterns in FIELD_CATEGORY_MAPPING.items():
        for pattern in patterns:
            if pattern in field_lower or field_lower.startswith(pattern):
                return category

    # Fall back to scope-based categorization
    return 'other'


@csrf_exempt
@require_http_methods(["GET"])
def get_extraction_history(request, project_id: int):
    """
    GET /api/knowledge/projects/{project_id}/extraction-history/

    Get extraction history for reports tab with category filtering and history tracking.

    CRITICAL: Only returns fields where field_role = 'input' from the field registry.
    Output/calculated fields are filtered out even if they were incorrectly extracted.

    Query params:
    - category: comma-separated list of categories to filter (project,physical,pricing,income,expenses,market,debt)
    - status: filter by status (all, pending, accepted, rejected, applied)
    - include_history: if 'true', include superseded extractions for each field
    - sort: field to sort by (extracted_at, field_key, confidence_score)
    - order: asc or desc (default: desc)

    Response:
    {
        "success": true,
        "project_id": 17,
        "extractions": [...],
        "category_counts": {"project": 12, "physical": 8, ...},
        "total": 73
    }
    """
    from django.db import connection
    from ..services.field_registry import get_registry

    # Parse query params
    categories = request.GET.get('category', '').split(',') if request.GET.get('category') else None
    categories = [c.strip().lower() for c in categories if c.strip()] if categories else None
    status_filter = request.GET.get('status', 'all')
    include_history = request.GET.get('include_history', '').lower() == 'true'
    sort_field = request.GET.get('sort', 'created_at')
    sort_order = request.GET.get('order', 'desc')

    # Validate sort field
    valid_sort_fields = ['created_at', 'field_key', 'confidence_score', 'status']
    if sort_field not in valid_sort_fields:
        sort_field = 'created_at'

    # Build query - get project type and extractions
    with connection.cursor() as cursor:
        # First get the project's property type
        cursor.execute("""
            SELECT project_type FROM landscape.tbl_project WHERE project_id = %s
        """, [int(project_id)])
        project_row = cursor.fetchone()
        project_type = project_row[0] if project_row else 'MF'

        # Map project_type code to registry property_type
        # LAND -> land_development, MF/default -> multifamily
        if project_type == 'LAND':
            registry_property_type = 'land_development'
        else:
            registry_property_type = 'multifamily'

        # Get all extractions for this project with document info
        query = """
            SELECT
                e.extraction_id,
                e.doc_id,
                d.doc_name,
                e.field_key,
                e.target_table,
                e.target_field,
                e.extracted_value,
                e.validated_value,
                e.extraction_type,
                e.source_text,
                e.source_snippet,
                e.source_page,
                e.confidence_score,
                e.status,
                e.scope,
                e.scope_label,
                e.validated_by,
                e.validated_at,
                e.rejection_reason,
                e.created_at,
                e.created_by
            FROM landscape.ai_extraction_staging e
            LEFT JOIN landscape.core_doc d ON e.doc_id = d.doc_id
            WHERE e.project_id = %s
        """
        params = [int(project_id)]

        # Add status filter
        if status_filter and status_filter != 'all':
            query += " AND e.status = %s"
            params.append(status_filter)

        # Add sort
        order_dir = 'DESC' if sort_order.lower() == 'desc' else 'ASC'
        query += f" ORDER BY e.{sort_field} {order_dir}"

        cursor.execute(query, params)
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()

    # Get the field registry to filter by field_role = 'input'
    # Use the project's property type to load the correct registry
    registry = get_registry()
    property_mappings = registry.get_all_mappings(registry_property_type)

    # Build set of input field keys (exclude output/calculated fields)
    input_field_keys = set()
    field_labels = {}  # Cache field labels from registry
    for field_key, mapping in property_mappings.items():
        if mapping.field_role == 'input':
            input_field_keys.add(field_key)
            field_labels[field_key] = mapping.label

    # Process results and categorize
    extractions = []
    category_counts = {
        'project': 0,
        'physical': 0,
        'pricing': 0,
        'income': 0,
        'expenses': 0,
        'market': 0,
        'debt': 0,
        'other': 0
    }

    for row in rows:
        ext = dict(zip(columns, row))

        # Get field key
        field_key = ext.get('field_key') or ext.get('target_field') or ''

        # CRITICAL: Filter out output/calculated fields
        # Only include fields where field_role = 'input' in the registry
        if field_key and field_key not in input_field_keys:
            # Skip this extraction - it's an output field or not in registry
            continue

        # Determine category for this extraction
        category = get_field_category(field_key)
        ext['category'] = category

        # Increment category count
        if category in category_counts:
            category_counts[category] += 1
        else:
            category_counts['other'] += 1

        # Skip if category filter active and doesn't match
        if categories and category not in categories:
            continue

        # Use label from registry if available, otherwise derive from field_key
        label = field_labels.get(field_key)
        if not label:
            label = field_key.replace('_', ' ').title() if field_key else ext.get('target_field', 'Unknown')
        ext['field_label'] = label

        # Format confidence
        confidence = ext.get('confidence_score')
        if confidence is not None:
            confidence = float(confidence)
            if confidence >= 0.9:
                ext['confidence_label'] = 'High'
            elif confidence >= 0.7:
                ext['confidence_label'] = 'Medium'
            elif confidence >= 0.5:
                ext['confidence_label'] = 'Low'
            else:
                ext['confidence_label'] = 'Review'
            ext['confidence_percent'] = int(confidence * 100)
        else:
            ext['confidence_label'] = None
            ext['confidence_percent'] = None

        # Format value for display
        extracted_value = ext.get('extracted_value')
        if extracted_value is not None:
            if isinstance(extracted_value, dict):
                # JSON object - try to get a display value
                ext['formatted_value'] = str(extracted_value.get('value', extracted_value))
            elif isinstance(extracted_value, list):
                ext['formatted_value'] = f"[{len(extracted_value)} items]"
            else:
                ext['formatted_value'] = str(extracted_value)
        else:
            ext['formatted_value'] = None

        # Serialize datetime objects
        if ext.get('created_at'):
            ext['created_at'] = ext['created_at'].isoformat()
        if ext.get('validated_at'):
            ext['validated_at'] = ext['validated_at'].isoformat()

        extractions.append(ext)

    return JsonResponse({
        'success': True,
        'project_id': int(project_id),
        'extractions': extractions,
        'category_counts': category_counts,
        'total': len(extractions)
    })


@csrf_exempt
@require_http_methods(["GET"])
def get_field_history(request, project_id: int, field_key: str):
    """
    GET /api/knowledge/projects/{project_id}/extraction-history/{field_key}/

    Get history of values for a specific field.

    CRITICAL: Only returns history for fields where field_role = 'input'.
    Returns 404 if field is not an input field.

    Returns all extractions for this field across all documents,
    ordered by date with the most recent (current) first.
    """
    from django.db import connection
    from ..services.field_registry import get_registry

    with connection.cursor() as cursor:
        # First get the project's property type
        cursor.execute("""
            SELECT project_type FROM landscape.tbl_project WHERE project_id = %s
        """, [int(project_id)])
        project_row = cursor.fetchone()
        project_type = project_row[0] if project_row else 'MF'

        # Map project_type code to registry property_type
        if project_type == 'LAND':
            registry_property_type = 'land_development'
        else:
            registry_property_type = 'multifamily'

    # Verify field is an input field (not output/calculated)
    # Use the project's property type to load the correct registry
    registry = get_registry()
    property_mappings = registry.get_all_mappings(registry_property_type)
    field_mapping = property_mappings.get(field_key)

    if field_mapping and field_mapping.field_role != 'input':
        return JsonResponse({
            'success': False,
            'error': f'Field {field_key} is an output/calculated field and cannot be extracted'
        }, status=404)

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                e.extraction_id,
                e.doc_id,
                d.doc_name,
                e.extracted_value,
                e.validated_value,
                e.confidence_score,
                e.status,
                e.source_snippet,
                e.source_page,
                e.validated_by,
                e.validated_at,
                e.rejection_reason,
                e.created_at
            FROM landscape.ai_extraction_staging e
            LEFT JOIN landscape.core_doc d ON e.doc_id = d.doc_id
            WHERE e.project_id = %s AND e.field_key = %s
            ORDER BY e.created_at DESC
        """, [int(project_id), field_key])

        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()

    history = []
    for i, row in enumerate(rows):
        entry = dict(zip(columns, row))

        # First row is current, rest are historical
        entry['is_current'] = i == 0

        # Format confidence
        confidence = entry.get('confidence_score')
        if confidence is not None:
            entry['confidence_percent'] = int(float(confidence) * 100)

        # Format value
        value = entry.get('validated_value') or entry.get('extracted_value')
        if isinstance(value, dict):
            entry['formatted_value'] = str(value.get('value', value))
        elif isinstance(value, list):
            entry['formatted_value'] = f"[{len(value)} items]"
        else:
            entry['formatted_value'] = str(value) if value else None

        # Serialize datetimes
        if entry.get('created_at'):
            entry['created_at'] = entry['created_at'].isoformat()
        if entry.get('validated_at'):
            entry['validated_at'] = entry['validated_at'].isoformat()

        # Add superseded info for non-current entries
        if i > 0 and len(history) > 0:
            entry['superseded_by'] = history[i - 1].get('doc_name', 'Newer extraction')
        elif i == 0:
            entry['superseded_by'] = None

        history.append(entry)

    # Determine category and get label from registry
    category = get_field_category(field_key)
    label = field_mapping.label if field_mapping else field_key.replace('_', ' ').title()

    return JsonResponse({
        'success': True,
        'project_id': int(project_id),
        'field_key': field_key,
        'field_label': label,
        'category': category,
        'current': history[0] if history else None,
        'history': history[1:] if len(history) > 1 else [],
        'total_versions': len(history)
    })


# ============================================================================
# Extraction Approval Workflow Endpoints
# ============================================================================

@csrf_exempt
@require_http_methods(["PATCH"])
def update_extraction_status(request, project_id: int, extraction_id: int):
    """
    PATCH /api/knowledge/projects/{project_id}/extractions/{extraction_id}/status/

    Update status of a single extraction with approval workflow logic.

    High confidence (>=0.90): pending -> applied (direct write)
    Lower confidence: pending -> accepted -> applied (two-step)

    Request body:
    {
        "status": "accepted" | "applied" | "rejected" | "pending",
        "validated_value": optional - if user edited the value
    }

    Response:
    {
        "success": true,
        "extraction_id": 123,
        "status": "accepted",
        "previous_status": "pending",
        "updated_at": "2025-12-23T15:30:00Z",
        "write_result": "optional message if applied"
    }
    """
    from django.db import connection
    from ..services.extraction_writer import ExtractionWriter

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    new_status = body.get('status')
    validated_value = body.get('validated_value')

    valid_statuses = ['pending', 'accepted', 'applied', 'rejected']
    if new_status not in valid_statuses:
        return JsonResponse({
            'success': False,
            'error': f'Invalid status. Must be one of: {valid_statuses}'
        }, status=400)

    # Get username
    validated_by = getattr(request, 'user', None)
    if validated_by and hasattr(validated_by, 'username'):
        validated_by = validated_by.username
    else:
        validated_by = 'user'

    with connection.cursor() as cursor:
        # Get the extraction
        cursor.execute("""
            SELECT
                extraction_id, field_key, property_type, extracted_value,
                target_table, target_field, db_write_type, selector_json,
                scope, scope_id, doc_id, source_page, status, confidence_score
            FROM landscape.ai_extraction_staging
            WHERE extraction_id = %s AND project_id = %s
        """, [int(extraction_id), int(project_id)])

        row = cursor.fetchone()
        if not row:
            return JsonResponse({'success': False, 'error': 'Extraction not found'}, status=404)

        columns = ['extraction_id', 'field_key', 'property_type', 'extracted_value',
                  'target_table', 'target_field', 'db_write_type', 'selector_json',
                  'scope', 'scope_id', 'doc_id', 'source_page', 'status', 'confidence_score']
        extraction = dict(zip(columns, row))
        previous_status = extraction['status']

        # Cannot modify applied extractions
        if previous_status == 'applied' and new_status != 'applied':
            return JsonResponse({
                'success': False,
                'error': 'Cannot modify applied extractions'
            }, status=400)

        # Parse extracted value
        extracted_value = extraction['extracted_value']
        if isinstance(extracted_value, str):
            try:
                extracted_value = json.loads(extracted_value)
            except json.JSONDecodeError:
                pass

        # Determine final value
        final_value = validated_value if validated_value is not None else extracted_value
        user_modified = validated_value is not None

        # Update the staging record
        cursor.execute("""
            UPDATE landscape.ai_extraction_staging
            SET status = %s,
                validated_value = %s,
                validated_by = %s,
                validated_at = NOW(),
                rejection_reason = CASE WHEN %s = 'rejected' THEN 'User rejected' ELSE NULL END
            WHERE extraction_id = %s
            RETURNING extraction_id
        """, [
            new_status,
            json.dumps(final_value) if new_status not in ['rejected', 'pending'] else None,
            validated_by,
            new_status,
            int(extraction_id)
        ])

    # If applying, write to production database
    write_result = None
    if new_status == 'applied' and extraction.get('field_key'):
        property_type = extraction.get('property_type', 'multifamily')
        writer = ExtractionWriter(int(project_id), property_type)
        success, message = writer.write_extraction(
            extraction_id=int(extraction_id),
            field_key=extraction['field_key'],
            value=final_value,
            scope_id=extraction['scope_id'],
            source_doc_id=extraction['doc_id'],
            source_page=extraction['source_page']
        )

        if not success:
            # Rollback status to accepted (not pending, since user intended to apply)
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE landscape.ai_extraction_staging
                    SET status = 'accepted'
                    WHERE extraction_id = %s
                """, [int(extraction_id)])
            return JsonResponse({
                'success': False,
                'error': f'Failed to write to database: {message}'
            }, status=500)

        write_result = message

    return JsonResponse({
        'success': True,
        'extraction_id': int(extraction_id),
        'status': new_status,
        'previous_status': previous_status,
        'user_modified': user_modified,
        'write_result': write_result
    })


@csrf_exempt
@require_http_methods(["POST"])
def bulk_update_status(request, project_id: int):
    """
    POST /api/knowledge/projects/{project_id}/extractions/bulk-status/

    Update status of multiple extractions at once.

    Request body:
    {
        "extraction_ids": [1, 2, 3, ...],
        "status": "accepted" | "applied" | "rejected"
    }

    Response:
    {
        "success": true,
        "updated": 3,
        "failed": 0,
        "results": [...]
    }
    """
    from django.db import connection
    from ..services.extraction_writer import ExtractionWriter

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    extraction_ids = body.get('extraction_ids', [])
    new_status = body.get('status')

    if not extraction_ids:
        return JsonResponse({'success': False, 'error': 'No extraction_ids provided'}, status=400)

    valid_statuses = ['accepted', 'applied', 'rejected', 'pending']
    if new_status not in valid_statuses:
        return JsonResponse({
            'success': False,
            'error': f'Invalid status. Must be one of: {valid_statuses}'
        }, status=400)

    # Get username
    validated_by = getattr(request, 'user', None)
    if validated_by and hasattr(validated_by, 'username'):
        validated_by = validated_by.username
    else:
        validated_by = 'user'

    results = []
    updated_count = 0
    failed_count = 0

    for ext_id in extraction_ids:
        try:
            with connection.cursor() as cursor:
                # Get extraction
                cursor.execute("""
                    SELECT
                        extraction_id, field_key, property_type, extracted_value,
                        scope_id, doc_id, source_page, status
                    FROM landscape.ai_extraction_staging
                    WHERE extraction_id = %s AND project_id = %s
                """, [int(ext_id), int(project_id)])

                row = cursor.fetchone()
                if not row:
                    results.append({'id': ext_id, 'success': False, 'error': 'Not found'})
                    failed_count += 1
                    continue

                columns = ['extraction_id', 'field_key', 'property_type', 'extracted_value',
                          'scope_id', 'doc_id', 'source_page', 'status']
                extraction = dict(zip(columns, row))

                if extraction['status'] == 'applied':
                    results.append({'id': ext_id, 'success': False, 'error': 'Already applied'})
                    failed_count += 1
                    continue

                # Parse value
                extracted_value = extraction['extracted_value']
                if isinstance(extracted_value, str):
                    try:
                        extracted_value = json.loads(extracted_value)
                    except json.JSONDecodeError:
                        pass

                # Update status
                cursor.execute("""
                    UPDATE landscape.ai_extraction_staging
                    SET status = %s,
                        validated_value = %s,
                        validated_by = %s,
                        validated_at = NOW()
                    WHERE extraction_id = %s
                """, [
                    new_status,
                    json.dumps(extracted_value) if new_status not in ['rejected', 'pending'] else None,
                    validated_by,
                    int(ext_id)
                ])

            # If applying, write to database
            if new_status == 'applied' and extraction.get('field_key'):
                property_type = extraction.get('property_type', 'multifamily')
                writer = ExtractionWriter(int(project_id), property_type)
                success, message = writer.write_extraction(
                    extraction_id=int(ext_id),
                    field_key=extraction['field_key'],
                    value=extracted_value,
                    scope_id=extraction['scope_id'],
                    source_doc_id=extraction['doc_id'],
                    source_page=extraction['source_page']
                )

                if not success:
                    # Rollback
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            UPDATE landscape.ai_extraction_staging
                            SET status = 'accepted'
                            WHERE extraction_id = %s
                        """, [int(ext_id)])
                    results.append({'id': ext_id, 'success': False, 'error': message})
                    failed_count += 1
                    continue

            results.append({'id': ext_id, 'success': True, 'status': new_status})
            updated_count += 1

        except Exception as e:
            logger.error(f"Bulk status update error for {ext_id}: {e}")
            results.append({'id': ext_id, 'success': False, 'error': str(e)})
            failed_count += 1

    return JsonResponse({
        'success': True,
        'updated': updated_count,
        'failed': failed_count,
        'results': results
    })


@csrf_exempt
@require_http_methods(["POST"])
def approve_high_confidence(request, project_id: int):
    """
    POST /api/knowledge/projects/{project_id}/extractions/approve-high-confidence/

    One-click approve all high-confidence pending extractions.

    Request body:
    {
        "confidence_threshold": 0.90 (optional, default 0.90),
        "category": "optional - limit to specific category"
    }

    Response:
    {
        "success": true,
        "approved": 15,
        "applied_to_model": 15,
        "fields": ["property_name", "total_units", ...]
    }
    """
    print(f"=== APPROVE_HIGH_CONFIDENCE ENTRY ===", flush=True)
    print(f"PROJECT_ID: {project_id}", flush=True)

    from django.db import connection
    from ..services.extraction_writer import ExtractionWriter
    from ..services.field_registry import get_registry

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    confidence_threshold = float(body.get('confidence_threshold', 0.90))
    # Lower threshold for opex fields (0.70) - utility values often have lower confidence
    opex_confidence_threshold = float(body.get('opex_confidence_threshold', 0.70))
    category_filter = body.get('category')

    # Get username
    validated_by = getattr(request, 'user', None)
    if validated_by and hasattr(validated_by, 'username'):
        validated_by = validated_by.username
    else:
        validated_by = 'user'

    # Get project type for registry
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT project_type FROM landscape.tbl_project WHERE project_id = %s
        """, [int(project_id)])
        project_row = cursor.fetchone()
        project_type_code = project_row[0] if project_row else 'MF'

    registry_property_type = 'land_development' if project_type_code == 'LAND' else 'multifamily'

    # Get input fields from registry
    registry = get_registry()
    property_mappings = registry.get_all_mappings(registry_property_type)
    input_field_keys = {k for k, m in property_mappings.items() if m.field_role == 'input'}

    # Get high-confidence pending extractions
    # Use lower threshold for opex fields (they often have lower confidence for utilities)
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                extraction_id, field_key, property_type, extracted_value,
                scope_id, doc_id, source_page, confidence_score
            FROM landscape.ai_extraction_staging
            WHERE project_id = %s
              AND status = 'pending'
              AND (
                  (field_key LIKE 'opex_%%' AND confidence_score >= %s)
                  OR (field_key NOT LIKE 'opex_%%' AND confidence_score >= %s)
              )
            ORDER BY created_at DESC
        """, [int(project_id), opex_confidence_threshold, confidence_threshold])

        columns = ['extraction_id', 'field_key', 'property_type', 'extracted_value',
                  'scope_id', 'doc_id', 'source_page', 'confidence_score']
        rows = cursor.fetchall()

    approved = []
    applied = []
    failed = []

    for row in rows:
        extraction = dict(zip(columns, row))
        field_key = extraction.get('field_key')

        # Filter by input fields only
        if field_key and field_key not in input_field_keys:
            continue

        # Filter by category if specified
        if category_filter:
            field_category = get_field_category(field_key)
            if field_category != category_filter:
                continue

        ext_id = extraction['extraction_id']

        # Parse value
        extracted_value = extraction['extracted_value']
        if isinstance(extracted_value, str):
            try:
                extracted_value = json.loads(extracted_value)
            except json.JSONDecodeError:
                pass

        try:
            # Update to applied
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE landscape.ai_extraction_staging
                    SET status = 'applied',
                        validated_value = %s,
                        validated_by = %s,
                        validated_at = NOW()
                    WHERE extraction_id = %s
                """, [
                    json.dumps(extracted_value),
                    validated_by,
                    ext_id
                ])

            # Write to database
            if field_key:
                property_type = extraction.get('property_type', registry_property_type)
                writer = ExtractionWriter(int(project_id), property_type)
                success, message = writer.write_extraction(
                    extraction_id=ext_id,
                    field_key=field_key,
                    value=extracted_value,
                    scope_id=extraction['scope_id'],
                    source_doc_id=extraction['doc_id'],
                    source_page=extraction['source_page']
                )

                if success:
                    applied.append(field_key)
                else:
                    # Rollback
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            UPDATE landscape.ai_extraction_staging
                            SET status = 'pending', validated_value = NULL, validated_at = NULL
                            WHERE extraction_id = %s
                        """, [ext_id])
                    failed.append({'id': ext_id, 'field': field_key, 'error': message})
                    continue

            approved.append(ext_id)

        except Exception as e:
            logger.error(f"High-confidence approval error for {ext_id}: {e}")
            failed.append({'id': ext_id, 'error': str(e)})

    # After all extractions are written, aggregate unit types for multifamily projects
    unit_types_created = 0
    if registry_property_type == 'multifamily' and len(applied) > 0:
        try:
            from ..services.extraction_writer import aggregate_unit_types
            agg_result = aggregate_unit_types(int(project_id))
            unit_types_created = agg_result.get('created', 0) + agg_result.get('updated', 0)
            logger.info(f"Unit type aggregation complete: {unit_types_created} types created/updated")
        except Exception as e:
            logger.error(f"Unit type aggregation failed for project {project_id}: {e}")

    return JsonResponse({
        'success': True,
        'approved': len(approved),
        'applied_to_model': len(applied),
        'fields': list(set(applied)),
        'failed': failed,
        'unit_types_created': unit_types_created
    })


# =============================================================================
# COLUMN DISCOVERY & FIELD MAPPING (CC Prompt C3)
# =============================================================================

@csrf_exempt
@require_http_methods(["POST"])
def discover_rent_roll_columns(request, project_id: int):
    """
    POST /api/knowledge/projects/{project_id}/discover-columns/

    Analyze uploaded rent roll file and return column discovery results.
    Does NOT extract data yet—just analyzes structure for user confirmation.

    Request body:
    {
        "document_id": int (required)
    }

    Response:
    {
        "file_name": str,
        "total_rows": int,
        "total_columns": int,
        "columns": [
            {
                "source_column": str,
                "source_index": int,
                "sample_values": [str],
                "proposed_target": str|null,
                "confidence": "high"|"medium"|"low"|"none",
                "action": "auto"|"suggest"|"needs_input"|"skip",
                "data_type_hint": str,
                "notes": str|null
            }
        ],
        "parse_warnings": [str],
        "is_structured": bool
    }
    """
    from apps.documents.models import Document
    from ..services.column_discovery import discover_columns, discovery_result_to_dict

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    document_id = body.get('document_id')
    if not document_id:
        return JsonResponse({'success': False, 'error': 'document_id required'}, status=400)

    try:
        document = Document.objects.get(doc_id=document_id, project_id=project_id)
    except Document.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Document not found'}, status=404)

    if not document.storage_uri:
        return JsonResponse({'success': False, 'error': 'Document has no storage URI'}, status=400)

    try:
        result = discover_columns(
            storage_uri=document.storage_uri,
            mime_type=document.mime_type,
            file_name=document.doc_name,
            project_id=project_id,
        )

        response_data = discovery_result_to_dict(result)
        response_data['success'] = True
        response_data['document_id'] = document_id

        return JsonResponse(response_data)

    except Exception as e:
        logger.exception(f"Column discovery failed for doc {document_id}: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def apply_rent_roll_mapping(request, project_id: int):
    """
    POST /api/knowledge/projects/{project_id}/apply-mapping/

    Apply user's column mapping decisions and queue extraction job.
    Creates dynamic columns as needed.

    Request body:
    {
        "document_id": int (required),
        "mappings": [
            {
                "source_column": str,
                "target_field": str|null,
                "create_dynamic": bool,
                "dynamic_column_name": str (if create_dynamic),
                "data_type": str (if create_dynamic)
            }
        ]
    }

    Response:
    {
        "success": bool,
        "job_id": int,
        "dynamic_columns_created": int,
        "standard_mappings": int,
        "skipped_columns": int
    }
    """
    from apps.documents.models import Document
    from apps.dynamic.models import DynamicColumnDefinition
    from ..models import ExtractionJob
    from django.utils import timezone

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    document_id = body.get('document_id')
    mappings = body.get('mappings', [])

    if not document_id:
        return JsonResponse({'success': False, 'error': 'document_id required'}, status=400)

    try:
        document = Document.objects.get(doc_id=document_id, project_id=project_id)
    except Document.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Document not found'}, status=404)

    # Delegate to shared service function
    from ..services.column_discovery import apply_column_mapping

    result = apply_column_mapping(
        project_id=int(project_id),
        document_id=int(document_id),
        mappings=mappings,
    )

    if not result.get('success'):
        status_code = 409 if result.get('existing_job_id') else 400
        return JsonResponse(result, status=status_code)

    return JsonResponse(result)
