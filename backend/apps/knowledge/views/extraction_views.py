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
