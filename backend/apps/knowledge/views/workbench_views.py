"""
Ingestion Workbench Views

Section-aware API for the extraction staging UI.
Provides a cleaner interface over ai_extraction_staging with
field-to-section mapping and human-readable labels.
"""

import json
import logging
import re
import uuid
from functools import wraps
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connection
from django.core.cache import cache

logger = logging.getLogger(__name__)


def json_errors(view_fn):
    """
    Wrap a view so unhandled exceptions return
    {"success": false, "error": "..."} instead of Django's HTML debug page.
    """
    @wraps(view_fn)
    def wrapper(*args, **kwargs):
        try:
            return view_fn(*args, **kwargs)
        except Exception as exc:
            logger.exception(f"[workbench] {view_fn.__name__} failed: {exc}")
            return JsonResponse(
                {'success': False, 'error': str(exc)},
                status=500,
            )
    return wrapper

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


def _is_output_field(registry, field_key: str, property_type: str) -> bool:
    """Return True if the field is a calculated output field that should never appear in the workbench."""
    mapping = registry.get_mapping(field_key, property_type)
    return mapping is not None and mapping.field_role == 'output'


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
# Auto-suppress: silently reject pending rows that match production DB values
# ---------------------------------------------------------------------------

# Whitelist of production tables we allow dynamic reads from
_ALLOWED_TARGET_TABLES = {
    'tbl_project', 'tbl_multifamily_property', 'tbl_multifamily_unit_type',
    'tbl_multifamily_unit', 'tbl_lease', 'tbl_operating_expenses',
    'tbl_loan', 'tbl_equity_structure', 'tbl_dcf_assumption',
    'tbl_sales_comparables', 'tbl_rental_comparable', 'tbl_rental_comp',
    'tbl_parcel', 'tbl_phase', 'tbl_container',
    'tbl_project_assumption', 'tbl_vacancy_assumption',
}

# Columns safe to read (basic validation — reject anything with special chars)
_COLUMN_NAME_RE = re.compile(r'^[a-z_][a-z0-9_]*$')


def _auto_suppress_exact_matches(extractions: list, project_id: int) -> list:
    """
    For pending rows with target_table + target_field, check if the extracted
    value already matches the production DB value. If so, auto-reject them
    silently and exclude from the response.

    Returns the filtered extractions list (without the suppressed rows).
    """
    from apps.knowledge.services.extraction_service import normalize_value_for_comparison

    # Group pending rows by target_table for batched lookups
    pending_by_table: dict = {}  # {table: [(extraction, target_field), ...]}
    for ext in extractions:
        if ext.get('status') != 'pending':
            continue
        tt = ext.get('target_table')
        tf = ext.get('target_field')
        if not tt or not tf:
            continue
        # Security: validate table and column names
        if tt not in _ALLOWED_TARGET_TABLES:
            continue
        if not _COLUMN_NAME_RE.match(tf):
            continue
        pending_by_table.setdefault(tt, []).append((ext, tf))

    if not pending_by_table:
        return extractions

    suppress_ids = set()

    with connection.cursor() as cursor:
        for table, ext_list in pending_by_table.items():
            # Collect distinct target_fields for this table
            fields = list({tf for _, tf in ext_list})

            # Determine the primary key / scope key for WHERE clause
            # For project-scoped tables: WHERE project_id = %s
            # For scope_id tables (unit_type, unit): WHERE project_id = %s
            # We read ALL project rows and match by scope_label/scope_id later.
            select_cols = ', '.join(fields)

            # Add scope identifier columns if present
            scope_cols = []
            if table == 'tbl_multifamily_unit_type':
                scope_cols = ['unit_type_name']
            elif table == 'tbl_multifamily_unit':
                scope_cols = ['unit_number']

            all_cols = fields + [c for c in scope_cols if c not in fields]
            select_cols = ', '.join(all_cols)

            try:
                cursor.execute(
                    f'SELECT {select_cols} FROM landscape.{table} WHERE project_id = %s',
                    [project_id],
                )
                col_names = [col[0] for col in cursor.description]
                db_rows = [dict(zip(col_names, r)) for r in cursor.fetchall()]
            except Exception as e:
                logger.warning(f"[auto_suppress] Failed to read {table}: {e}")
                continue

            if not db_rows:
                continue

            # For project-scoped tables (single row), use first row
            # For scoped tables, match by scope_label → scope_col value
            for ext, tf in ext_list:
                extracted_val = ext.get('extracted_value')
                if extracted_val is None:
                    continue

                field_key = ext.get('field_key', '')

                # Find the matching DB row
                matched_db_val = None
                if scope_cols:
                    # Scoped: match by scope_label
                    scope_label = ext.get('scope_label', '')
                    scope_col = scope_cols[0]
                    for db_row in db_rows:
                        if str(db_row.get(scope_col, '')).lower().strip() == str(scope_label).lower().strip():
                            matched_db_val = db_row.get(tf)
                            break
                else:
                    # Project-scoped: use first row
                    if db_rows:
                        matched_db_val = db_rows[0].get(tf)

                if matched_db_val is None:
                    continue

                # Normalize both and compare
                norm_extracted = normalize_value_for_comparison(extracted_val, field_key=field_key)
                norm_db = normalize_value_for_comparison(matched_db_val, field_key=field_key)

                if norm_extracted and norm_db and norm_extracted == norm_db:
                    suppress_ids.add(ext['extraction_id'])

    if not suppress_ids:
        return extractions

    # Bulk-reject the suppressed rows in the DB
    with connection.cursor() as cursor:
        placeholders = ','.join(['%s'] * len(suppress_ids))
        cursor.execute(f"""
            UPDATE landscape.ai_extraction_staging
            SET status = 'rejected',
                rejection_reason = 'auto_suppressed_exact_match',
                validated_by = 'system',
                validated_at = NOW()
            WHERE extraction_id IN ({placeholders})
              AND status = 'pending'
        """, list(suppress_ids))

    logger.info(f"[auto_suppress] Suppressed {len(suppress_ids)} exact-match rows for project {project_id}")

    # Filter out suppressed rows from the response
    return [e for e in extractions if e['extraction_id'] not in suppress_ids]


# ---------------------------------------------------------------------------
# 1. GET  /api/knowledge/projects/{project_id}/extraction-staging/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["GET"])
@json_errors
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
              AND e.scope NOT IN ('unit', 'unit_type')
              AND (d.doc_id IS NOT NULL AND d.deleted_at IS NULL)
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

    # ── Strip calculated output fields ────────────────────────────────────
    # Output fields (field_role='output') are derived/calculated values that
    # should never be extracted from a document or appear in the workbench.
    # This guards against stale staging rows created before the field_role
    # column was added to the land dev registry.
    from apps.knowledge.services.field_registry import get_registry as _get_registry
    _registry = _get_registry()
    rows = [
        r for r in rows
        if not _is_output_field(_registry, r.get('field_key', ''), r.get('property_type') or 'multifamily')
    ]

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

    # ── Auto-suppress exact matches ──────────────────────────────────────
    # For pending rows where target_table + target_field are set, look up
    # the current production DB value. If it matches the extracted value
    # (post-normalization), silently reject the row so it doesn't clutter
    # the workbench.
    extractions = _auto_suppress_exact_matches(extractions, int(project_id))

    # Recompute counts after suppression
    scope_counts = {}
    status_counts = {}
    for e in extractions:
        sc = e.get('scope', '')
        scope_counts[sc] = scope_counts.get(sc, 0) + 1
        st = e.get('status', 'pending')
        status_counts[st] = status_counts.get(st, 0) + 1

    # Enrich conflict rows with existing DB value and source
    conflict_ids = [
        e['conflict_with_extraction_id']
        for e in extractions
        if e.get('conflict_with_extraction_id')
    ]
    if conflict_ids:
        with connection.cursor() as cursor:
            placeholders = ','.join(['%s'] * len(conflict_ids))
            cursor.execute(f"""
                SELECT
                    e.extraction_id,
                    e.extracted_value,
                    e.confidence_score,
                    d.doc_name
                FROM landscape.ai_extraction_staging e
                LEFT JOIN landscape.core_doc d ON e.doc_id = d.doc_id
                WHERE e.extraction_id IN ({placeholders})
            """, conflict_ids)
            conflict_lookup = {}
            for cid, cval, cconf, cdoc in cursor.fetchall():
                conflict_lookup[cid] = {
                    'existing_value': _strip_wrapping_quotes(cval) if cval else cval,
                    'existing_confidence': float(cconf) if cconf else None,
                    'existing_source': cdoc,
                }
        for e in extractions:
            cid = e.get('conflict_with_extraction_id')
            if cid and cid in conflict_lookup:
                e['conflict_existing'] = conflict_lookup[cid]

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
@json_errors
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
@json_errors
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
@json_errors
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
@json_errors
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

    # Collect all output (calculated) field keys from both registries so the
    # bulk-accept never promotes a field that should not be written.
    from apps.knowledge.services.field_registry import get_registry as _get_registry
    _registry = _get_registry()
    output_field_keys = sorted(
        m.field_key
        for pt in ('multifamily', 'land_development')
        for m in _registry.get_all_mappings(pt).values()
        if m.field_role == 'output'
    )

    with connection.cursor() as cursor:
        if scopes and isinstance(scopes, list):
            scope_placeholders = ', '.join(['%s'] * len(scopes))
            if output_field_keys:
                key_placeholders = ', '.join(['%s'] * len(output_field_keys))
                cursor.execute(
                    f"""
                    UPDATE landscape.ai_extraction_staging
                    SET status = 'accepted',
                        validated_by = 'user',
                        validated_at = NOW()
                    WHERE project_id = %s
                      AND status = 'pending'
                      AND scope IN ({scope_placeholders})
                      AND field_key NOT IN ({key_placeholders})
                    """,
                    [int(project_id)] + scopes + output_field_keys,
                )
            else:
                cursor.execute(
                    f"""
                    UPDATE landscape.ai_extraction_staging
                    SET status = 'accepted',
                        validated_by = 'user',
                        validated_at = NOW()
                    WHERE project_id = %s
                      AND status = 'pending'
                      AND scope IN ({scope_placeholders})
                    """,
                    [int(project_id)] + scopes,
                )
        else:
            if output_field_keys:
                key_placeholders = ', '.join(['%s'] * len(output_field_keys))
                cursor.execute(
                    f"""
                    UPDATE landscape.ai_extraction_staging
                    SET status = 'accepted',
                        validated_by = 'user',
                        validated_at = NOW()
                    WHERE project_id = %s
                      AND status = 'pending'
                      AND field_key NOT IN ({key_placeholders})
                    """,
                    [int(project_id)] + output_field_keys,
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
# Floor plan matrix helpers
# ---------------------------------------------------------------------------

def _check_floor_plan_matrix(project_id: int, committed_rows: list) -> dict | None:
    """
    After committing staging rows, check if there are pending unit_type
    staging rows for the same doc(s). If so, either auto-write them (no
    existing floor plan) or return a prompt payload for user confirmation.
    """
    # Collect doc_ids from committed rows
    doc_ids = list({r.get('doc_id') for r in committed_rows if r.get('doc_id')})
    if not doc_ids:
        return None

    with connection.cursor() as cursor:
        # Find pending unit_type staging rows for these docs
        placeholders = ', '.join(['%s'] * len(doc_ids))
        cursor.execute(
            f"""
            SELECT extraction_id, field_key, extracted_value, scope_label
            FROM landscape.ai_extraction_staging
            WHERE project_id = %s
              AND scope = 'unit_type'
              AND status = 'pending'
              AND doc_id IN ({placeholders})
            ORDER BY scope_label
            """,
            [project_id] + doc_ids,
        )
        unit_type_rows = [
            dict(zip([c[0] for c in cursor.description], r))
            for r in cursor.fetchall()
        ]

        if not unit_type_rows:
            return None

        # Check for existing floor plan matrix rows
        cursor.execute(
            """
            SELECT COUNT(*) FROM landscape.tbl_multifamily_unit_type
            WHERE project_id = %s
            """,
            [project_id],
        )
        existing_count = cursor.fetchone()[0]

    # Parse unit_type staging data for summary
    unit_types_summary = []
    for row in unit_type_rows:
        try:
            data = json.loads(row['extracted_value']) if isinstance(row['extracted_value'], str) else row['extracted_value']
            name = data.get('unit_type_name') or row.get('scope_label') or 'Unknown'
            count = data.get('unit_count', '?')
            rent = data.get('market_rent', '?')
            unit_types_summary.append(f"{name} ({count} units, ${rent}/mo)")
        except (json.JSONDecodeError, TypeError, AttributeError):
            unit_types_summary.append(row.get('scope_label') or 'Unknown type')

    staging_ids = [r['extraction_id'] for r in unit_type_rows]

    if existing_count == 0:
        # No existing floor plan — auto-write
        _write_floor_plan_from_staging(project_id, unit_type_rows)
        return None  # Silent success, no prompt needed

    # Existing floor plan found — return prompt data for user confirmation
    return {
        'existing_count': existing_count,
        'new_type_count': len(unit_type_rows),
        'new_types_summary': unit_types_summary,
        'staging_ids': staging_ids,
        'message': (
            f"A floor plan matrix already exists ({existing_count} unit types). "
            f"The rent roll data shows {len(unit_type_rows)} unit types: "
            f"{', '.join(unit_types_summary)}. "
            f"Replace the existing floor plan matrix with the rent roll data?"
        ),
    }


def _write_floor_plan_from_staging(project_id: int, unit_type_rows: list):
    """
    Write unit_type staging rows to tbl_multifamily_unit_type and mark
    them as applied. Deduplicates by unit_type_name.
    """
    seen = set()
    to_insert = []

    for row in unit_type_rows:
        try:
            data = json.loads(row['extracted_value']) if isinstance(row['extracted_value'], str) else row['extracted_value']
        except (json.JSONDecodeError, TypeError):
            continue

        name = data.get('unit_type_name') or data.get('unit_type_code') or row.get('scope_label')
        if not name or name in seen:
            continue
        seen.add(name)
        to_insert.append(data)

    if not to_insert:
        return

    with connection.cursor() as cursor:
        for data in to_insert:
            type_name = data.get('unit_type_name') or data.get('unit_type_code')
            type_code = data.get('unit_type_code') or type_name
            cursor.execute(
                """
                INSERT INTO landscape.tbl_multifamily_unit_type
                    (project_id, unit_type_code, unit_type_name,
                     bedrooms, bathrooms, avg_square_feet,
                     total_units, unit_count,
                     current_market_rent, market_rent,
                     current_rent_avg, concessions_avg,
                     value_source)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (project_id, unit_type_name) DO UPDATE SET
                    unit_type_code = EXCLUDED.unit_type_code,
                    bedrooms = EXCLUDED.bedrooms,
                    bathrooms = EXCLUDED.bathrooms,
                    avg_square_feet = EXCLUDED.avg_square_feet,
                    total_units = EXCLUDED.total_units,
                    unit_count = EXCLUDED.unit_count,
                    current_market_rent = EXCLUDED.current_market_rent,
                    market_rent = EXCLUDED.market_rent,
                    current_rent_avg = EXCLUDED.current_rent_avg,
                    concessions_avg = EXCLUDED.concessions_avg,
                    value_source = EXCLUDED.value_source,
                    updated_at = CURRENT_TIMESTAMP
                """,
                [
                    project_id,
                    type_code,
                    type_name,
                    data.get('bedrooms'),
                    data.get('bathrooms'),
                    data.get('avg_square_feet'),
                    data.get('unit_count'),  # total_units
                    data.get('unit_count'),  # unit_count
                    data.get('market_rent'),  # current_market_rent
                    data.get('market_rent'),  # market_rent
                    data.get('current_rent_avg'),
                    data.get('concessions_avg'),
                    'import',
                ],
            )

        # Mark staging rows as applied
        staging_ids = [r['extraction_id'] for r in unit_type_rows]
        placeholders = ', '.join(['%s'] * len(staging_ids))
        cursor.execute(
            f"""
            UPDATE landscape.ai_extraction_staging
            SET status = 'applied'
            WHERE extraction_id IN ({placeholders})
            """,
            staging_ids,
        )

    logger.info(
        f"[workbench] Auto-wrote {len(to_insert)} unit types to "
        f"tbl_multifamily_unit_type for project {project_id}"
    )


# ---------------------------------------------------------------------------
# 5. POST /api/knowledge/projects/{project_id}/extraction-staging/commit/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
@json_errors
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

    # Post-commit: flip core_doc visibility (hidden during ingestion)
    # IntakeStartView sets deleted_at = NOW() for structured_ingestion docs
    # so they stay hidden in DMS until commit succeeds.
    if committed > 0:
        doc_ids = list({row['doc_id'] for row in rows if row.get('doc_id')})
        if doc_ids:
            with connection.cursor() as cursor:
                placeholders = ', '.join(['%s'] * len(doc_ids))
                cursor.execute(
                    f"""
                    UPDATE landscape.core_doc
                    SET deleted_at = NULL
                    WHERE doc_id IN ({placeholders})
                      AND deleted_at IS NOT NULL
                    """,
                    [int(d) for d in doc_ids],
                )
                logger.info(
                    f"[commit_staging] Flipped deleted_at=NULL for doc_ids={doc_ids}, "
                    f"rows affected={cursor.rowcount}, project={project_id}"
                )

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

    # Post-commit: detect unit_type staging rows for floor plan matrix prompt
    # These rows are hidden from the Workbench UI (scope exclusion) and handled here.
    floor_plan_prompt = _check_floor_plan_matrix(int(project_id), rows)
    if floor_plan_prompt:
        result['floor_plan_prompt'] = floor_plan_prompt

    return JsonResponse(result)


# ---------------------------------------------------------------------------
# 6. POST /api/knowledge/projects/{project_id}/extraction-staging/abandon/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
@json_errors
def abandon_session(request, project_id: int):
    """
    Abandon a workbench session: hard-delete ALL staging rows for this doc
    (regardless of status), delete extracted text, and mark the intake
    session as 'abandoned'.  The caller (frontend) also deletes the
    UploadThing file and soft-deletes core_doc separately.

    Request body:
        { "doc_id": 123, "intake_uuid": "abc-def-..." }

    Both fields are optional — doc_id scopes the staging + text cleanup,
    intake_uuid scopes the session status update.
    """
    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    doc_id = body.get('doc_id')
    intake_uuid = body.get('intake_uuid')

    deleted_staging = 0
    deleted_text = False
    session_updated = False

    with connection.cursor() as cursor:
        if doc_id:
            # 1. Hard-delete ALL staging rows for this doc (any status)
            cursor.execute(
                """
                DELETE FROM landscape.ai_extraction_staging
                WHERE project_id = %s
                  AND doc_id = %s
                """,
                [int(project_id), int(doc_id)],
            )
            deleted_staging = cursor.rowcount

            # 2. Delete extracted text for this doc
            cursor.execute(
                """
                DELETE FROM landscape.core_doc_text
                WHERE doc_id = %s
                """,
                [int(doc_id)],
            )
            deleted_text = cursor.rowcount > 0

            # 3. Remove from extraction queue (old pipeline)
            cursor.execute(
                """
                DELETE FROM landscape.dms_extract_queue
                WHERE doc_id = %s
                """,
                [int(doc_id)],
            )

            # 4. Hard-delete the core_doc record itself
            cursor.execute(
                """
                DELETE FROM landscape.core_doc
                WHERE doc_id = %s AND project_id = %s
                """,
                [int(doc_id), int(project_id)],
            )

        # 5. Mark intake session as abandoned
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
        'deleted_staging': deleted_staging,
        'deleted_text': deleted_text,
        'session_updated': session_updated,
    })


# ---------------------------------------------------------------------------
# 7. POST /api/knowledge/projects/{project_id}/extraction-staging/apply-floor-plan/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
@json_errors
def apply_floor_plan(request, project_id: int):
    """
    User-confirmed replacement of the floor plan matrix.
    Called after commit_staging returns floor_plan_prompt and the user confirms.

    Request body:
        { "staging_ids": [1, 2, 3] }

    Deletes existing tbl_multifamily_unit_type rows for the project,
    then writes unit_type staging rows and marks them as applied.
    """
    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    staging_ids = body.get('staging_ids')
    if not staging_ids or not isinstance(staging_ids, list):
        return JsonResponse({
            'success': False,
            'error': 'staging_ids must be a non-empty list',
        }, status=400)

    with connection.cursor() as cursor:
        # Fetch the staging rows
        placeholders = ', '.join(['%s'] * len(staging_ids))
        cursor.execute(
            f"""
            SELECT extraction_id, field_key, extracted_value, scope_label
            FROM landscape.ai_extraction_staging
            WHERE project_id = %s
              AND extraction_id IN ({placeholders})
              AND scope = 'unit_type'
            """,
            [int(project_id)] + [int(sid) for sid in staging_ids],
        )
        unit_type_rows = [
            dict(zip([c[0] for c in cursor.description], r))
            for r in cursor.fetchall()
        ]

        if not unit_type_rows:
            return JsonResponse({
                'success': False,
                'error': 'No unit_type staging rows found for the given IDs',
            }, status=404)

        # Delete existing floor plan matrix rows
        cursor.execute(
            """
            DELETE FROM landscape.tbl_multifamily_unit_type
            WHERE project_id = %s
            """,
            [int(project_id)],
        )
        deleted_count = cursor.rowcount

    # Write new rows from staging data
    _write_floor_plan_from_staging(int(project_id), unit_type_rows)

    logger.info(
        f"[workbench] Replaced floor plan matrix for project {project_id}: "
        f"deleted {deleted_count} old rows, wrote {len(unit_type_rows)} new rows"
    )

    return JsonResponse({
        'success': True,
        'deleted': deleted_count,
        'written': len(unit_type_rows),
    })


# ---------------------------------------------------------------------------
# 8. POST /api/knowledge/projects/{project_id}/rent-roll/parse-columns/
# ---------------------------------------------------------------------------

# Cache key prefix for parsed rent roll rows
_RR_CACHE_PREFIX = 'rr_parsed_'
_RR_CACHE_TTL = 3600  # 1 hour

# BD/BA split patterns
import re
_BDBA_PATTERN = re.compile(
    r'^(\d+)\s*[/\\x]\s*(\d+(?:\.\d+)?)\s*$'
)
_BDBA_HEADER_PATTERN = re.compile(
    r'(?:bd?\s*/?\s*ba|bed\s*/?\s*bath|br\s*/?\s*ba)',
    re.IGNORECASE
)

# Standard target fields with display labels
RENT_ROLL_TARGET_FIELDS = {
    'unit_number': 'Unit Number',
    'unit_type': 'Unit Type / Floor Plan',
    'bedrooms': 'Bedrooms',
    'bathrooms': 'Bathrooms',
    'square_feet': 'Square Feet',
    'tenant_name': 'Tenant Name',
    'current_rent': 'Current Rent',
    'market_rent': 'Market Rent',
    'occupancy_status': 'Occupancy Status',
    'lease_start_date': 'Lease Start',
    'lease_end_date': 'Lease End',
    'move_in_date': 'Move-In Date',
    'is_section8': 'Section 8',
    'is_manager': 'Manager Unit',
    'floor_number': 'Floor',
    'building_name': 'Building',
    'parking_rent': 'Parking Rent',
    'pet_rent': 'Pet Rent',
    'past_due_amount': 'Past Due',
    'deposit_amount': 'Deposit',
}

# Header → target field mapping (lowercase aliases)
_HEADER_ALIASES = {
    'unit': 'unit_number', 'unit #': 'unit_number', 'unit no': 'unit_number',
    'unit number': 'unit_number', 'apt': 'unit_number', 'apt #': 'unit_number',
    'apartment': 'unit_number', 'unit no.': 'unit_number',

    'type': 'unit_type', 'unit type': 'unit_type', 'floor plan': 'unit_type',
    'floorplan': 'unit_type', 'plan': 'unit_type', 'style': 'unit_type',

    'beds': 'bedrooms', 'bed': 'bedrooms', 'br': 'bedrooms',
    'bedrooms': 'bedrooms', 'bd': 'bedrooms', 'bedroom': 'bedrooms',
    '# beds': 'bedrooms',

    'baths': 'bathrooms', 'bath': 'bathrooms', 'ba': 'bathrooms',
    'bathrooms': 'bathrooms', 'bathroom': 'bathrooms', '# baths': 'bathrooms',

    'sqft': 'square_feet', 'sf': 'square_feet', 'sq ft': 'square_feet',
    'square feet': 'square_feet', 'size': 'square_feet', 'area': 'square_feet',
    'sq. ft.': 'square_feet', 'square footage': 'square_feet',

    'tenant': 'tenant_name', 'tenant name': 'tenant_name',
    'resident': 'tenant_name', 'resident name': 'tenant_name',
    'lessee': 'tenant_name', 'occupant': 'tenant_name', 'name': 'tenant_name',

    'rent': 'current_rent', 'contract rent': 'current_rent',
    'actual rent': 'current_rent', 'current rent': 'current_rent',
    'monthly rent': 'current_rent', 'base rent': 'current_rent',
    'gross rent': 'current_rent',

    'market': 'market_rent', 'market rent': 'market_rent',
    'asking rent': 'market_rent', 'asking': 'market_rent',
    'mkt rent': 'market_rent', 'pro forma rent': 'market_rent',

    'status': 'occupancy_status', 'occupancy': 'occupancy_status',
    'occ status': 'occupancy_status', 'lease status': 'occupancy_status',
    'occ': 'occupancy_status', 'occupied': 'occupancy_status',

    'lease start': 'lease_start_date', 'lease from': 'lease_start_date',
    'lease begin': 'lease_start_date', 'start date': 'lease_start_date',
    'lease start date': 'lease_start_date', 'commencement': 'lease_start_date',

    'lease end': 'lease_end_date', 'lease to': 'lease_end_date',
    'lease expiration': 'lease_end_date', 'expiration': 'lease_end_date',
    'expiry': 'lease_end_date', 'end date': 'lease_end_date',
    'lease end date': 'lease_end_date', 'expires': 'lease_end_date',
    'lease exp': 'lease_end_date',

    'move in': 'move_in_date', 'move in date': 'move_in_date',
    'move-in date': 'move_in_date', 'movein date': 'move_in_date',
    'original move in': 'move_in_date',

    'floor': 'floor_number', 'floor #': 'floor_number',
    'building': 'building_name', 'bldg': 'building_name',
    'building name': 'building_name', 'property': 'building_name',

    'parking': 'parking_rent', 'parking rent': 'parking_rent',
    'parking fee': 'parking_rent', 'parking income': 'parking_rent',
    'garage': 'parking_rent', 'garage rent': 'parking_rent',
    'carport': 'parking_rent',

    'pet rent': 'pet_rent', 'pet fee': 'pet_rent',
    'pet': 'pet_rent', 'animal fee': 'pet_rent',

    'past due': 'past_due_amount', 'delinquent': 'past_due_amount',
    'delinquency': 'past_due_amount', 'balance due': 'past_due_amount',
    'arrears': 'past_due_amount', 'past due amount': 'past_due_amount',
    'amount past due': 'past_due_amount', 'overdue': 'past_due_amount',

    'deposit': 'deposit_amount', 'security deposit': 'deposit_amount',
    'sec deposit': 'deposit_amount', 'sec dep': 'deposit_amount',
    'security dep': 'deposit_amount',
}


def _suggest_mapping(header: str, sample_values: list) -> tuple:
    """
    Given a source column header and sample values, suggest a target field
    and confidence level.

    Returns: (target_field_or_None, confidence: 'high'|'medium'|'low'|'none')
    """
    lower = header.strip().lower()

    # Check for BD/BA compound column
    if _BDBA_HEADER_PATTERN.search(lower):
        return '__bdba_split__', 'high'

    # Exact alias match
    if lower in _HEADER_ALIASES:
        return _HEADER_ALIASES[lower], 'high'

    # Fuzzy: check if header contains a known alias
    for alias, target in _HEADER_ALIASES.items():
        if len(alias) >= 3 and alias in lower:
            return target, 'medium'

    return None, 'none'


def _parse_bdba(val: str) -> tuple:
    """Parse '1/1.00' or '2/2' style BD/BA values. Returns (bedrooms, bathrooms) or None."""
    if not val:
        return None
    m = _BDBA_PATTERN.match(str(val).strip())
    if m:
        return int(m.group(1)), float(m.group(2))
    return None


@csrf_exempt
@require_http_methods(["POST"])
@json_errors
def parse_rent_roll_columns(request, project_id: int):
    """
    POST /api/knowledge/projects/{project_id}/rent-roll/parse-columns/

    Extract column headers, sample values, and all unit rows from the
    document text (already stored in core_doc_text). Cache rows server-side
    for commit-mapping to use without re-parsing.

    Request body:
        { "doc_id": 123 }

    Response:
        {
            "success": true,
            "cache_key": "rr_parsed_<uuid>",
            "total_rows": 47,
            "columns": [
                {
                    "source_header": "Unit",
                    "source_index": 0,
                    "sample_values": ["101", "102", "103", "104", "105"],
                    "suggested_target": "unit_number",
                    "confidence": "high",
                    "is_bdba_split": false
                }, ...
            ],
            "target_fields": { "unit_number": "Unit Number", ... },
            "existing_unit_count": 0
        }
    """
    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    doc_id = body.get('doc_id')
    if not doc_id:
        return JsonResponse({'success': False, 'error': 'doc_id required'}, status=400)

    # 1. Fetch document text from core_doc_text
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT dt.extracted_text, d.doc_name
            FROM landscape.core_doc_text dt
            JOIN landscape.core_doc d ON d.doc_id = dt.doc_id
            WHERE dt.doc_id = %s AND d.project_id = %s
        """, [int(doc_id), int(project_id)])
        result = cursor.fetchone()

    if not result:
        return JsonResponse({
            'success': False,
            'error': 'No text found for this document. Has it been processed?'
        }, status=404)

    doc_text, doc_name = result

    # 2. Use Claude to extract structured table from document text
    try:
        from ..services.rent_roll_parser import parse_rent_roll_table
        parsed = parse_rent_roll_table(doc_text, doc_name)
    except Exception as exc:
        logger.exception(f"Rent roll parse failed for doc {doc_id}: {exc}")
        return JsonResponse({
            'success': False,
            'error': f'Failed to parse rent roll: {str(exc)}'
        }, status=500)

    if not parsed or not parsed.get('headers') or not parsed.get('rows'):
        return JsonResponse({
            'success': False,
            'error': 'Could not extract tabular data from document'
        }, status=400)

    headers = parsed['headers']
    rows = parsed['rows']

    # 3. Build column metadata with suggested mappings
    columns = []
    for idx, header in enumerate(headers):
        # Collect sample values (first 5 non-empty)
        samples = []
        for row in rows[:20]:
            if idx < len(row) and row[idx] is not None and str(row[idx]).strip():
                val = str(row[idx]).strip()
                if val not in samples:
                    samples.append(val)
                if len(samples) >= 5:
                    break

        suggested_target, confidence = _suggest_mapping(header, samples)
        is_bdba = suggested_target == '__bdba_split__'
        if is_bdba:
            suggested_target = None

        columns.append({
            'source_header': header,
            'source_index': idx,
            'sample_values': samples,
            'suggested_target': suggested_target,
            'confidence': confidence,
            'is_bdba_split': is_bdba,
        })

    # 4. Cache rows for commit-mapping
    cache_key = f"{_RR_CACHE_PREFIX}{uuid.uuid4().hex[:12]}"
    cache.set(cache_key, {
        'headers': headers,
        'rows': rows,
        'doc_id': int(doc_id),
        'doc_name': doc_name,
        'project_id': int(project_id),
    }, _RR_CACHE_TTL)

    # 5. Count existing units in project
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
        """, [int(project_id)])
        existing_count = cursor.fetchone()[0]

    return JsonResponse({
        'success': True,
        'cache_key': cache_key,
        'doc_name': doc_name,
        'total_rows': len(rows),
        'columns': columns,
        'target_fields': RENT_ROLL_TARGET_FIELDS,
        'existing_unit_count': existing_count,
    })


# ---------------------------------------------------------------------------
# 8. POST /api/knowledge/projects/{project_id}/rent-roll/commit-mapping/
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
@json_errors
def commit_rent_roll_mapping(request, project_id: int):
    """
    POST /api/knowledge/projects/{project_id}/rent-roll/commit-mapping/

    Apply confirmed column mappings to cached rows. Writes units to
    tbl_multifamily_unit, creates dynamic columns as needed.

    Request body:
        {
            "cache_key": "rr_parsed_abc123",
            "mappings": [
                { "source_index": 0, "target": "unit_number" },
                { "source_index": 1, "target": "__bdba_split__" },
                { "source_index": 2, "target": "current_rent" },
                { "source_index": 3, "target": "__dynamic__", "dynamic_label": "Parking" },
                { "source_index": 4, "target": "__skip__" }
            ]
        }

    Returns:
        {
            "success": true,
            "units_written": 47,
            "units_updated": 3,
            "dynamic_columns_created": ["Parking", "Past Due"],
            "errors": []
        }
    """
    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    cache_key = body.get('cache_key')
    mappings = body.get('mappings', [])

    if not cache_key:
        return JsonResponse({'success': False, 'error': 'cache_key required'}, status=400)
    if not mappings:
        return JsonResponse({'success': False, 'error': 'mappings required'}, status=400)

    # 1. Retrieve cached data
    cached = cache.get(cache_key)
    if not cached:
        return JsonResponse({
            'success': False,
            'error': 'Cached data expired or not found. Please re-parse.',
        }, status=410)

    if cached['project_id'] != int(project_id):
        return JsonResponse({
            'success': False,
            'error': 'Cache key does not belong to this project',
        }, status=403)

    headers = cached['headers']
    rows = cached['rows']
    doc_id = cached['doc_id']

    # 2. Build mapping index: source_index → target info
    mapping_index = {}
    for m in mappings:
        src_idx = m.get('source_index')
        target = m.get('target')
        if src_idx is not None and target and target != '__skip__':
            mapping_index[int(src_idx)] = m

    if 'unit_number' not in {m.get('target') for m in mappings}:
        return JsonResponse({
            'success': False,
            'error': 'unit_number mapping is required',
        }, status=400)

    # 3. Create dynamic column definitions as needed
    from ..services.column_discovery import _infer_data_type as infer_dtype

    dynamic_cols_created = []
    dynamic_col_ids = {}  # source_index → column_definition_id

    for m in mappings:
        if m.get('target') == '__dynamic__':
            label = m.get('dynamic_label', f"Column {m['source_index']}")
            col_key = re.sub(r'[^a-z0-9_]', '_', label.lower().strip())
            src_idx = int(m['source_index'])

            # Infer data type from header and sample values
            sample_vals = []
            for row in rows[:20]:
                v = row[src_idx] if src_idx < len(row) else None
                if v is not None and str(v).strip():
                    sample_vals.append(str(v).strip())
            data_type = infer_dtype(label, sample_vals)

            with connection.cursor() as cursor:
                # Upsert dynamic column definition
                cursor.execute("""
                    INSERT INTO landscape.tbl_dynamic_column_definition
                    (project_id, table_name, column_key, display_label, data_type,
                     source, is_proposed, is_active, is_calculable,
                     display_order, created_at)
                    VALUES (%s, 'multifamily_unit', %s, %s, %s,
                            'rent_roll_mapper', false, true, false,
                            0, NOW())
                    ON CONFLICT (project_id, table_name, column_key) DO UPDATE SET
                        display_label = EXCLUDED.display_label,
                        data_type = EXCLUDED.data_type
                    RETURNING id
                """, [int(project_id), col_key, label, data_type])
                col_def_id = cursor.fetchone()[0]

            dynamic_col_ids[src_idx] = col_def_id
            dynamic_cols_created.append(label)

    # 4. Write units
    units_written = 0
    units_updated = 0
    errors = []

    for row_idx, row in enumerate(rows):
        try:
            unit_data = _build_unit_data(row, mapping_index, dynamic_col_ids)
            if not unit_data:
                continue

            unit_number = unit_data.pop('__unit_number__', None)
            if not unit_number:
                continue

            dynamic_values = unit_data.pop('__dynamic__', {})

            # Ensure NOT NULL columns have defaults
            unit_data.setdefault('unit_type', 'Unknown')
            unit_data.setdefault('square_feet', 0)

            # Build SQL columns and values
            std_cols = {}
            for target_field, val in unit_data.items():
                if val is not None and target_field in RENT_ROLL_TARGET_FIELDS:
                    std_cols[target_field] = val

            # Upsert into tbl_multifamily_unit
            with connection.cursor() as cursor:
                # Check if exists
                cursor.execute("""
                    SELECT unit_id FROM landscape.tbl_multifamily_unit
                    WHERE project_id = %s AND unit_number = %s
                """, [int(project_id), str(unit_number)])
                existing = cursor.fetchone()

                if existing:
                    # UPDATE
                    unit_id = existing[0]
                    if std_cols:
                        set_clauses = [f"{k} = %s" for k in std_cols.keys()]
                        set_clauses.append("updated_at = NOW()")
                        cursor.execute(f"""
                            UPDATE landscape.tbl_multifamily_unit
                            SET {', '.join(set_clauses)}
                            WHERE unit_id = %s AND project_id = %s
                        """, list(std_cols.values()) + [unit_id, int(project_id)])
                    units_updated += 1
                else:
                    # INSERT
                    cols = ['project_id', 'unit_number'] + list(std_cols.keys()) + ['created_at', 'updated_at']
                    placeholders = ['%s', '%s'] + ['%s'] * len(std_cols) + ['NOW()', 'NOW()']
                    vals = [int(project_id), str(unit_number)] + list(std_cols.values())
                    cursor.execute(f"""
                        INSERT INTO landscape.tbl_multifamily_unit ({', '.join(cols)})
                        VALUES ({', '.join(placeholders)})
                        RETURNING unit_id
                    """, vals)
                    unit_id = cursor.fetchone()[0]
                    units_written += 1

                # Write dynamic column values
                for src_idx, col_def_id in dynamic_values.items():
                    val = row[src_idx] if src_idx < len(row) else None
                    if val is not None and str(val).strip():
                        cursor.execute("""
                            INSERT INTO landscape.tbl_dynamic_column_value
                            (column_definition_id, row_id, value_text, created_at, updated_at)
                            VALUES (%s, %s, %s, NOW(), NOW())
                            ON CONFLICT (column_definition_id, row_id) DO UPDATE SET
                                value_text = EXCLUDED.value_text,
                                updated_at = NOW()
                        """, [col_def_id, unit_id, str(val).strip()])

        except Exception as exc:
            logger.error(f"Row {row_idx} failed: {exc}")
            errors.append({
                'row_index': row_idx,
                'error': str(exc),
            })

    # 4.5 Auto-create dynamic columns for unmapped source columns
    from ..services.column_discovery import _infer_data_type

    # Identify which source indices are explicitly mapped or skipped
    handled_indices = set(mapping_index.keys())
    for m in mappings:
        if m.get('target') == '__skip__':
            handled_indices.add(m.get('source_index'))

    unmapped_indices = set(range(len(headers))) - handled_indices
    auto_dynamic_created = []

    # Find the unit_number source index for value lookups
    unit_number_idx = next(
        (int(m['source_index']) for m in mappings if m.get('target') == 'unit_number'),
        None
    )

    for src_idx in sorted(unmapped_indices):
        header = headers[src_idx] if src_idx < len(headers) else None
        if not header or not str(header).strip():
            continue

        label = str(header).strip()
        # Skip if this header would match a known alias
        if label.strip().lower() in _HEADER_ALIASES:
            continue

        # Collect non-empty values across all rows
        non_empty = []
        for row in rows:
            val = row[src_idx] if src_idx < len(row) else None
            if val is not None and str(val).strip():
                non_empty.append(str(val).strip())

        # Skip all-empty columns
        if not non_empty:
            continue

        # Infer data type from header name and sample values
        sample_vals = non_empty[:20]
        data_type = _infer_data_type(label, sample_vals)

        col_key = re.sub(r'[^a-z0-9_]', '_', label.lower().strip())

        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO landscape.tbl_dynamic_column_definition
                    (project_id, table_name, column_key, display_label, data_type,
                     source, is_proposed, is_active, is_calculable,
                     display_order, created_at)
                    VALUES (%s, 'multifamily_unit', %s, %s, %s,
                            'rent_roll_mapper', false, true, false,
                            0, NOW())
                    ON CONFLICT (project_id, table_name, column_key) DO UPDATE SET
                        display_label = EXCLUDED.display_label,
                        data_type = EXCLUDED.data_type
                    RETURNING id
                """, [int(project_id), col_key, label, data_type])
                col_def_id = cursor.fetchone()[0]

            # Write values for all rows using unit_number lookup
            if unit_number_idx is not None:
                for row in rows:
                    val = row[src_idx] if src_idx < len(row) else None
                    if val is None or not str(val).strip():
                        continue
                    unit_num = row[unit_number_idx] if unit_number_idx < len(row) else None
                    if not unit_num:
                        continue
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            SELECT unit_id FROM landscape.tbl_multifamily_unit
                            WHERE project_id = %s AND unit_number = %s
                        """, [int(project_id), str(unit_num).strip()])
                        result = cursor.fetchone()
                        if result:
                            cursor.execute("""
                                INSERT INTO landscape.tbl_dynamic_column_value
                                (column_definition_id, row_id, value_text, created_at, updated_at)
                                VALUES (%s, %s, %s, NOW(), NOW())
                                ON CONFLICT (column_definition_id, row_id) DO UPDATE SET
                                    value_text = EXCLUDED.value_text,
                                    updated_at = NOW()
                            """, [col_def_id, result[0], str(val).strip()])

            auto_dynamic_created.append({'label': label, 'data_type': data_type})
        except Exception as exc:
            logger.error(f"Auto-dynamic column '{label}' failed: {exc}")

    # 5. Post-commit: flip core_doc visibility (hidden during structured ingestion)
    if (units_written > 0 or units_updated > 0) and doc_id:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE landscape.core_doc
                SET deleted_at = NULL
                WHERE doc_id = %s
                  AND deleted_at IS NOT NULL
                """,
                [int(doc_id)],
            )
            logger.info(
                f"[commit_rent_roll] Flipped deleted_at=NULL for doc_id={doc_id}, "
                f"rows affected={cursor.rowcount}, project={project_id}"
            )

    # 6. Clean up cache
    cache.delete(cache_key)

    return JsonResponse({
        'success': True,
        'units_written': units_written,
        'units_updated': units_updated,
        'dynamic_columns_created': dynamic_cols_created,
        'auto_dynamic_columns': auto_dynamic_created,
        'errors': errors,
        'doc_id': doc_id,
    })


def _build_unit_data(row: list, mapping_index: dict, dynamic_col_ids: dict) -> dict:
    """
    Transform a raw row using the mapping index into a dict ready for DB insert.
    Handles BD/BA splitting and dynamic column routing.
    """
    data = {}
    dynamic = {}

    for src_idx, m in mapping_index.items():
        target = m.get('target')
        val = row[src_idx] if src_idx < len(row) else None
        if val is None or str(val).strip() == '':
            continue
        val = str(val).strip()

        if target == '__bdba_split__':
            parsed = _parse_bdba(val)
            if parsed:
                bd, ba = parsed
                data['bedrooms'] = bd
                data['bathrooms'] = ba
                # Derive unit_type if not already mapped
                if 'unit_type' not in data:
                    from apps.multifamily.models import derive_unit_type
                    data['unit_type'] = derive_unit_type(bd, ba)
            continue

        if target == '__dynamic__':
            if src_idx in dynamic_col_ids:
                dynamic[src_idx] = dynamic_col_ids[src_idx]
            continue

        if target == 'unit_number':
            data['__unit_number__'] = val
            continue

        # Standard field mapping — apply type coercion
        if target in ('bedrooms', 'bathrooms', 'square_feet', 'floor_number'):
            try:
                data[target] = float(val.replace(',', ''))
            except (ValueError, TypeError):
                data[target] = None
        elif target in ('current_rent', 'market_rent', 'parking_rent', 'pet_rent',
                       'past_due_amount', 'deposit_amount'):
            try:
                clean = val.replace('$', '').replace(',', '').strip()
                data[target] = float(clean)
            except (ValueError, TypeError):
                data[target] = None
        elif target in ('is_section8', 'is_manager'):
            lower = val.lower()
            data[target] = lower in ('true', 'yes', '1', 'y', 'x')
        else:
            data[target] = val

    if dynamic:
        data['__dynamic__'] = dynamic

    # Infer occupancy_status if not explicitly mapped
    if 'occupancy_status' not in data:
        tenant = data.get('tenant_name', '')
        if tenant and tenant.strip().lower() not in ('vacant', 'empty', '', 'n/a', '-', '--'):
            data['occupancy_status'] = 'Occupied'
        else:
            data['occupancy_status'] = 'Vacant'
    else:
        # Normalize raw status text to standard values
        raw = str(data['occupancy_status']).strip().lower()
        if raw in ('occupied', 'current', 'occ', 'yes', 'y', '1', 'leased'):
            data['occupancy_status'] = 'Occupied'
        elif raw in ('vacant', 'empty', 'vac', 'no', 'n', '0', 'available'):
            data['occupancy_status'] = 'Vacant'
        elif raw in ('notice', 'ntv', 'notice to vacate'):
            data['occupancy_status'] = 'Notice'
        elif raw in ('down', 'offline', 'out of service'):
            data['occupancy_status'] = 'Down'
        elif raw in ('mtm', 'month-to-month', 'month to month', 'm2m'):
            data['occupancy_status'] = 'Occupied'  # MTM is still occupied
        # else: keep the raw value as-is

    return data if '__unit_number__' in data else None
