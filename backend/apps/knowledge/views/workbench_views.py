"""
Ingestion Workbench Views

Section-aware API for the extraction staging UI.
Provides a cleaner interface over ai_extraction_staging with
field-to-section mapping and human-readable labels.
"""

import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connection

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Field -> Section mapping
# ---------------------------------------------------------------------------

"""
Section assignment has moved to the frontend (useExtractionStaging.ts) where it is
driven by folderTabConfig.ts at runtime, adapting to property type and analysis type.

The backend returns the raw `scope` column from ai_extraction_staging.
Frontend maps scope → folder using SCOPE_TO_FOLDER and the live folder config.

For bulk operations (accept-all, commit) the frontend sends `scopes` arrays
rather than section names.
"""

# Abbreviations that should remain uppercase in labels
UPPERCASE_TOKENS = {
    'sf', 'noi', 'gpr', 'egi', 'apn', 'msa', 'dscr', 'ltv', 'grm',
}


def get_field_label(field_key: str) -> str:
    """
    Convert a field_key like 'total_sf' to a human-readable label like 'Total SF'.
    Special-cases common CRE abbreviations so they stay uppercase.
    """
    parts = field_key.split('_')
    labelled = []
    for part in parts:
        if part.lower() in UPPERCASE_TOKENS:
            labelled.append(part.upper())
        else:
            labelled.append(part.capitalize())
    return ' '.join(labelled)


def _strip_wrapping_quotes(val):
    """Strip leading/trailing double-quotes from string values (LLM artifact)."""
    if isinstance(val, str) and len(val) >= 2 and val[0] == '"' and val[-1] == '"':
        return val[1:-1]
    return val


def _serialize_extraction(row: dict) -> dict:
    """Serialize datetime objects and add label enrichment. scope is passed through as-is."""
    row['field_label'] = get_field_label(row.get('field_key', ''))

    # Strip wrapping quotes from extracted values (LLM returns "CA" instead of CA)
    if row.get('extracted_value') is not None:
        row['extracted_value'] = _strip_wrapping_quotes(row['extracted_value'])

    if row.get('created_at'):
        row['created_at'] = row['created_at'].isoformat()
    if row.get('validated_at'):
        row['validated_at'] = row['validated_at'].isoformat()

    # Ensure confidence_score is a float for JSON serialization
    if row.get('confidence_score') is not None:
        row['confidence_score'] = float(row['confidence_score'])

    return row


# ---------------------------------------------------------------------------
# 1. GET  /api/knowledge/projects/{project_id}/extraction-staging/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["GET"])
def list_staging(request, project_id: int):
    """
    Return all staging rows for a project, enriched with field_label.
    Section grouping is handled on the frontend via folderTabConfig.

    Query params:
        ?status=pending      Filter by status
        ?scope=opex          Filter by DB scope
        ?doc_id=123          Filter by source document (used by Workbench to scope to current session)
    """
    status_filter = request.GET.get('status')
    scope_filter = request.GET.get('scope')
    doc_id_filter = request.GET.get('doc_id')

    with connection.cursor() as cursor:
        query = """
            SELECT
                e.extraction_id,
                e.field_key,
                e.extracted_value,
                e.confidence_score,
                e.status,
                e.validated_value,
                e.validated_by,
                e.validated_at,
                e.created_at,
                e.doc_id,
                d.doc_name AS source_label,
                e.source_page,
                e.source_text,
                e.source_snippet,
                e.target_table,
                e.target_field,
                e.property_type,
                e.db_write_type,
                e.scope,
                e.scope_id,
                e.scope_label,
                e.conflict_with_extraction_id,
                e.rejection_reason
            FROM landscape.ai_extraction_staging e
            LEFT JOIN landscape.core_doc d ON e.doc_id = d.doc_id
            WHERE e.project_id = %s
              AND e.scope NOT IN ('unit')
        """
        params = [int(project_id)]

        if doc_id_filter:
            query += " AND e.doc_id = %s"
            params.append(int(doc_id_filter))

        if status_filter:
            query += " AND e.status = %s"
            params.append(status_filter)

        if scope_filter:
            query += " AND e.scope = %s"
            params.append(scope_filter)

        query += " ORDER BY e.created_at DESC"

        cursor.execute(query, params)
        columns = [col[0] for col in cursor.description]
        rows = [dict(zip(columns, r)) for r in cursor.fetchall()]

    extractions = []
    scope_counts = {}
    status_counts = {}

    for row in rows:
        enriched = _serialize_extraction(row)
        scope = enriched.get('scope', '')

        scope_counts[scope] = scope_counts.get(scope, 0) + 1

        st = enriched.get('status', 'pending')
        status_counts[st] = status_counts.get(st, 0) + 1

        extractions.append(enriched)

    return JsonResponse({
        'success': True,
        'project_id': int(project_id),
        'count': len(extractions),
        'extractions': extractions,
        'scope_counts': scope_counts,
        'status_counts': status_counts,
    })


# ---------------------------------------------------------------------------
# 2. POST /api/knowledge/projects/{project_id}/extraction-staging/{id}/approve/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
def approve_staging(request, project_id: int, extraction_id: int):
    """
    Approve a single extraction row.

    Sets status='accepted', validated_by='user', validated_at=NOW().
    Returns the updated row with section/field_label enrichment.
    """
    with connection.cursor() as cursor:
        # Verify the row belongs to this project
        cursor.execute(
            """
            SELECT extraction_id
            FROM landscape.ai_extraction_staging
            WHERE extraction_id = %s AND project_id = %s
            """,
            [int(extraction_id), int(project_id)],
        )
        if not cursor.fetchone():
            return JsonResponse({
                'success': False,
                'error': f'Extraction {extraction_id} not found for project {project_id}',
            }, status=404)

        # Update
        cursor.execute(
            """
            UPDATE landscape.ai_extraction_staging
            SET status = 'accepted',
                validated_by = 'user',
                validated_at = NOW()
            WHERE extraction_id = %s AND project_id = %s
            """,
            [int(extraction_id), int(project_id)],
        )

        # Fetch the updated row
        cursor.execute(
            """
            SELECT
                e.extraction_id,
                e.field_key,
                e.extracted_value,
                e.confidence_score,
                e.status,
                e.validated_value,
                e.validated_by,
                e.validated_at,
                e.created_at,
                e.doc_id,
                d.doc_name AS source_label,
                e.source_page,
                e.source_text,
                e.source_snippet,
                e.target_table,
                e.target_field,
                e.property_type,
                e.db_write_type,
                e.scope,
                e.scope_id,
                e.scope_label,
                e.conflict_with_extraction_id,
                e.rejection_reason
            FROM landscape.ai_extraction_staging e
            LEFT JOIN landscape.core_doc d ON e.doc_id = d.doc_id
            WHERE e.extraction_id = %s
            """,
            [int(extraction_id)],
        )
        columns = [col[0] for col in cursor.description]
        row = dict(zip(columns, cursor.fetchone()))

    return JsonResponse({
        'success': True,
        'extraction': _serialize_extraction(row),
    })


# ---------------------------------------------------------------------------
# 3. POST /api/knowledge/projects/{project_id}/extraction-staging/{id}/reject/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
def reject_staging(request, project_id: int, extraction_id: int):
    """
    Reject a single extraction row.

    Sets status='rejected', rejection_reason='User rejected',
    validated_by='user', validated_at=NOW().
    Returns the updated row with section/field_label enrichment.
    """
    with connection.cursor() as cursor:
        # Verify the row belongs to this project
        cursor.execute(
            """
            SELECT extraction_id
            FROM landscape.ai_extraction_staging
            WHERE extraction_id = %s AND project_id = %s
            """,
            [int(extraction_id), int(project_id)],
        )
        if not cursor.fetchone():
            return JsonResponse({
                'success': False,
                'error': f'Extraction {extraction_id} not found for project {project_id}',
            }, status=404)

        # Update
        cursor.execute(
            """
            UPDATE landscape.ai_extraction_staging
            SET status = 'rejected',
                rejection_reason = 'User rejected',
                validated_by = 'user',
                validated_at = NOW()
            WHERE extraction_id = %s AND project_id = %s
            """,
            [int(extraction_id), int(project_id)],
        )

        # Fetch the updated row
        cursor.execute(
            """
            SELECT
                e.extraction_id,
                e.field_key,
                e.extracted_value,
                e.confidence_score,
                e.status,
                e.validated_value,
                e.validated_by,
                e.validated_at,
                e.created_at,
                e.doc_id,
                d.doc_name AS source_label,
                e.source_page,
                e.source_text,
                e.source_snippet,
                e.target_table,
                e.target_field,
                e.property_type,
                e.db_write_type,
                e.scope,
                e.scope_id,
                e.scope_label,
                e.conflict_with_extraction_id,
                e.rejection_reason
            FROM landscape.ai_extraction_staging e
            LEFT JOIN landscape.core_doc d ON e.doc_id = d.doc_id
            WHERE e.extraction_id = %s
            """,
            [int(extraction_id)],
        )
        columns = [col[0] for col in cursor.description]
        row = dict(zip(columns, cursor.fetchone()))

    return JsonResponse({
        'success': True,
        'extraction': _serialize_extraction(row),
    })


# ---------------------------------------------------------------------------
# 3b. PATCH /api/knowledge/projects/{project_id}/extraction-staging/{id}/update-value/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["PATCH", "POST"])
def update_staging_value(request, project_id: int, extraction_id: int):
    """
    Update the extracted_value for a single staging row (inline edit).

    Request body:
        { "value": "new value" }

    Sets validated_value to the user-supplied value and validated_by='user'.
    """
    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    new_value = body.get('value')
    if new_value is None:
        return JsonResponse({'success': False, 'error': 'Missing "value" field'}, status=400)

    with connection.cursor() as cursor:
        # Verify the row belongs to this project
        cursor.execute(
            """
            SELECT extraction_id
            FROM landscape.ai_extraction_staging
            WHERE extraction_id = %s AND project_id = %s
            """,
            [int(extraction_id), int(project_id)],
        )
        if not cursor.fetchone():
            return JsonResponse({
                'success': False,
                'error': f'Extraction {extraction_id} not found for project {project_id}',
            }, status=404)

        # Update: store user edit as validated_value, keep original extracted_value
        cursor.execute(
            """
            UPDATE landscape.ai_extraction_staging
            SET validated_value = %s,
                validated_by = 'user',
                validated_at = NOW()
            WHERE extraction_id = %s AND project_id = %s
            """,
            [str(new_value), int(extraction_id), int(project_id)],
        )

    return JsonResponse({
        'success': True,
        'extraction_id': int(extraction_id),
        'validated_value': new_value,
    })


# ---------------------------------------------------------------------------
# 4. POST /api/knowledge/projects/{project_id}/extraction-staging/accept-all-pending/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
def accept_all_pending(request, project_id: int):
    """
    Bulk-accept all pending rows for a project.

    Request body (optional):
        { "scopes": ["income", "opex", "acquisition"] }
        Limits the bulk accept to rows with matching DB scopes.
        If omitted, accepts all pending rows for the project.
    """
    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    scopes = body.get('scopes')

    with connection.cursor() as cursor:
        if scopes and isinstance(scopes, list):
            placeholders = ', '.join(['%s'] * len(scopes))
            cursor.execute(
                f"""
                UPDATE landscape.ai_extraction_staging
                SET status = 'accepted',
                    validated_by = 'user',
                    validated_at = NOW()
                WHERE project_id = %s
                  AND status = 'pending'
                  AND scope IN ({placeholders})
                """,
                [int(project_id)] + scopes,
            )
        else:
            cursor.execute(
                """
                UPDATE landscape.ai_extraction_staging
                SET status = 'accepted',
                    validated_by = 'user',
                    validated_at = NOW()
                WHERE project_id = %s
                  AND status = 'pending'
                """,
                [int(project_id)],
            )

        updated = cursor.rowcount

    return JsonResponse({
        'success': True,
        'updated': updated,
    })


# ---------------------------------------------------------------------------
# 5. POST /api/knowledge/projects/{project_id}/extraction-staging/commit/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
def commit_staging(request, project_id: int):
    """
    Write accepted extractions to production tables via ExtractionWriter.

    Request body (one of):
        { "extraction_ids": [1,2,3] }
        { "commit_all_accepted": true }
        { "scopes": ["income", "opex"] }

    For each accepted row the ExtractionWriter writes to the production table
    and the staging row is set to status='applied'.

    Returns:
        { "success": true, "committed": N, "failed": M, "errors": [] }
    """
    from ..services.extraction_writer import ExtractionWriter

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    extraction_ids = body.get('extraction_ids')
    commit_all = body.get('commit_all_accepted', False)
    scopes_filter = body.get('scopes')

    # Build the query to select the rows to commit
    with connection.cursor() as cursor:
        if extraction_ids:
            if not isinstance(extraction_ids, list) or not extraction_ids:
                return JsonResponse({
                    'success': False,
                    'error': 'extraction_ids must be a non-empty list',
                }, status=400)
            placeholders = ', '.join(['%s'] * len(extraction_ids))
            cursor.execute(
                f"""
                SELECT
                    extraction_id, field_key, extracted_value, validated_value,
                    doc_id, source_page, property_type, scope_id, status
                FROM landscape.ai_extraction_staging
                WHERE project_id = %s
                  AND extraction_id IN ({placeholders})
                  AND status = 'accepted'
                """,
                [int(project_id)] + [int(eid) for eid in extraction_ids],
            )
        elif scopes_filter and isinstance(scopes_filter, list):
            placeholders = ', '.join(['%s'] * len(scopes_filter))
            cursor.execute(
                f"""
                SELECT
                    extraction_id, field_key, extracted_value, validated_value,
                    doc_id, source_page, property_type, scope_id, status
                FROM landscape.ai_extraction_staging
                WHERE project_id = %s
                  AND status = 'accepted'
                  AND scope IN ({placeholders})
                """,
                [int(project_id)] + scopes_filter,
            )
        elif commit_all:
            cursor.execute(
                """
                SELECT
                    extraction_id, field_key, extracted_value, validated_value,
                    doc_id, source_page, property_type, scope_id, status
                FROM landscape.ai_extraction_staging
                WHERE project_id = %s
                  AND status = 'accepted'
                """,
                [int(project_id)],
            )
        else:
            return JsonResponse({
                'success': False,
                'error': 'Provide extraction_ids, commit_all_accepted, or scopes',
            }, status=400)

        columns = [col[0] for col in cursor.description]
        rows = [dict(zip(columns, r)) for r in cursor.fetchall()]

    if not rows:
        return JsonResponse({
            'success': True,
            'committed': 0,
            'failed': 0,
            'errors': [],
        })

    committed = 0
    failed = 0
    errors = []

    for row in rows:
        eid = row['extraction_id']
        field_key = row['field_key']
        # Use validated_value if present, otherwise extracted_value
        value = row['validated_value'] if row['validated_value'] is not None else row['extracted_value']
        prop_type = row.get('property_type') or 'multifamily'
        scope_id = row.get('scope_id')
        doc_id = row.get('doc_id')
        source_page = row.get('source_page')

        try:
            writer = ExtractionWriter(
                project_id=int(project_id),
                property_type=prop_type,
            )
            success, message = writer.write_extraction(
                extraction_id=eid,
                field_key=field_key,
                value=value,
                scope_id=scope_id,
                source_doc_id=doc_id,
                source_page=source_page,
            )

            if success:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE landscape.ai_extraction_staging
                        SET status = 'applied'
                        WHERE extraction_id = %s
                        """,
                        [eid],
                    )
                committed += 1
            else:
                failed += 1
                errors.append({
                    'extraction_id': eid,
                    'field_key': field_key,
                    'error': message,
                })
        except Exception as exc:
            logger.error(f"Commit failed for extraction {eid}: {exc}")
            failed += 1
            errors.append({
                'extraction_id': eid,
                'field_key': field_key,
                'error': str(exc),
            })

    # Post-commit: auto-populate MSA from county/state if applicable
    msa_populated = None
    committed_keys = {row['field_key'] for row in rows}
    if committed_keys & {'county', 'state', 'city'}:
        try:
            from ..services.extraction_service import auto_populate_msa
            msa_populated = auto_populate_msa(int(project_id))
        except Exception as exc:
            logger.warning(f"MSA auto-populate failed for project {project_id}: {exc}")

    result = {
        'success': True,
        'committed': committed,
        'failed': failed,
        'errors': errors,
    }
    if msa_populated:
        result['msa_populated'] = msa_populated

    return JsonResponse(result)


# ---------------------------------------------------------------------------
# 6. POST /api/knowledge/projects/{project_id}/extraction-staging/abandon/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
def abandon_session(request, project_id: int):
    """
    Abandon a workbench session: bulk-reject pending staging rows and mark
    the intake session as 'abandoned'.

    Request body:
        { "doc_id": 123, "intake_uuid": "abc-def-..." }

    Both fields are optional — doc_id scopes the staging cleanup,
    intake_uuid scopes the session status update.
    """
    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    doc_id = body.get('doc_id')
    intake_uuid = body.get('intake_uuid')

    rejected_count = 0
    session_updated = False

    with connection.cursor() as cursor:
        # 1. Bulk-reject pending staging rows for this doc
        if doc_id:
            cursor.execute(
                """
                UPDATE landscape.ai_extraction_staging
                SET status = 'rejected',
                    rejection_reason = 'Session abandoned',
                    validated_by = 'user',
                    validated_at = NOW()
                WHERE project_id = %s
                  AND doc_id = %s
                  AND status = 'pending'
                """,
                [int(project_id), int(doc_id)],
            )
            rejected_count = cursor.rowcount

        # 2. Mark intake session as abandoned
        if intake_uuid:
            cursor.execute(
                """
                UPDATE landscape.tbl_intake_session
                SET status = 'abandoned',
                    updated_at = NOW()
                WHERE intake_uuid = %s
                  AND project_id = %s
                  AND status = 'draft'
                """,
                [str(intake_uuid), int(project_id)],
            )
            session_updated = cursor.rowcount > 0

    return JsonResponse({
        'success': True,
        'rejected_count': rejected_count,
        'session_updated': session_updated,
    })
