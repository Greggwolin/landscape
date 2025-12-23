"""
Extraction API Views

Endpoints for AI-based data extraction from documents.
"""

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

    Get all pending extractions for user validation.
    """
    from ..services.extraction_service import ExtractionService

    service = ExtractionService(int(project_id))
    extractions = service.get_pending_extractions()

    # Serialize datetime objects
    for ext in extractions:
        if ext.get('created_at'):
            ext['created_at'] = ext['created_at'].isoformat()

    return JsonResponse({
        'success': True,
        'project_id': int(project_id),
        'count': len(extractions),
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
    from ..services.extraction_service import ExtractionService

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
    from ..services.extraction_service import extract_document_batched as do_extract_batched

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    project_id = body.get('project_id')
    if not project_id:
        return JsonResponse({'success': False, 'error': 'project_id is required'}, status=400)

    batches = body.get('batches')  # Optional list of batch names
    property_type = body.get('property_type', 'multifamily')

    # Get user_id if available
    user_id = None
    if hasattr(request, 'user') and hasattr(request.user, 'id'):
        user_id = request.user.id

    result = do_extract_batched(
        project_id=int(project_id),
        doc_id=int(doc_id),
        batches=batches,
        property_type=property_type,
        user_id=user_id
    )

    status = 200 if result.get('success') else 400
    return JsonResponse(result, status=status)


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

    extractor = RegistryBasedExtractor(int(project_id), property_type)

    result = extractor.extract_from_project(
        doc_ids=doc_ids,
        high_extractability_only=high_extractability_only
    )

    return JsonResponse(result)


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
        "estimated_units": 113,
        "chunks_processed": 4,
        "units_extracted": 113,
        "staged_count": 113,
        "errors": []
    }
    """
    from ..services.extraction_service import extract_rent_roll_chunked

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    project_id = body.get('project_id')
    if not project_id:
        return JsonResponse({'success': False, 'error': 'project_id is required'}, status=400)

    property_type = body.get('property_type', 'multifamily')

    # Get user_id if available
    user_id = None
    if hasattr(request, 'user') and hasattr(request.user, 'id'):
        user_id = request.user.id

    result = extract_rent_roll_chunked(
        project_id=int(project_id),
        doc_id=int(doc_id),
        property_type=property_type,
        user_id=user_id
    )

    status = 200 if result.get('success') else 400
    return JsonResponse(result, status=status)
