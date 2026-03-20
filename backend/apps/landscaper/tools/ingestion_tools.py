"""
Ingestion Workbench tools for Landscaper AI.

Provides read/write access to ai_extraction_staging so the Landscaper
can help users review, correct, approve, and reject extracted field values
during the structured ingestion workflow.

Tools:
  1. get_ingestion_staging   - Read current extraction state
  2. update_staging_field    - Correct/override an extracted value
  3. approve_staging_field   - Accept fields (mark as 'accepted')
  4. reject_staging_field    - Reject fields (mark as 'rejected')
  5. explain_extraction      - Explain why a value was extracted with source citation
"""

import json
import logging
from django.db import connection
from django.utils import timezone
from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


@register_tool('get_ingestion_staging')
def get_ingestion_staging(doc_id: int = None, status_filter: str = None,
                          field_key_filter: str = None, **kwargs):
    """
    Get extracted field values from ai_extraction_staging for a document.

    Returns field_key, extracted_value, confidence, status, source page/snippet
    for each extraction row.
    """
    # project_id can come directly as kwarg or nested in project_context
    project_id = kwargs.get('project_id')
    if not project_id:
        project_context = kwargs.get('project_context', {})
        project_id = project_context.get('project_id')
    tool_input = kwargs.get('tool_input', {})

    # Allow tool_input to override positional args
    doc_id = doc_id or tool_input.get('doc_id')
    status_filter = status_filter or tool_input.get('status_filter', 'all')
    field_key_filter = field_key_filter or tool_input.get('field_key_filter')

    if not doc_id:
        return {'success': False, 'error': 'doc_id is required'}
    if not project_id:
        return {'success': False, 'error': 'project_id not available in context'}

    try:
        query = """
            SELECT
                extraction_id,
                field_key,
                target_table,
                target_field,
                extracted_value,
                confidence_score,
                status,
                source_page,
                source_snippet,
                source_text,
                scope,
                scope_label,
                scope_id,
                array_index,
                rejection_reason,
                conflict_with_extraction_id,
                validated_value,
                validated_by,
                validated_at
            FROM landscape.ai_extraction_staging
            WHERE project_id = %s AND doc_id = %s
        """
        params = [project_id, doc_id]

        if status_filter and status_filter != 'all':
            query += " AND status = %s"
            params.append(status_filter)

        if field_key_filter:
            query += " AND field_key ILIKE %s"
            params.append(f'%{field_key_filter}%')

        query += " ORDER BY field_key, scope, array_index NULLS LAST, extraction_id"

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        fields = []
        for row in rows:
            field = dict(zip(columns, row))
            # Serialize jsonb values
            if field.get('extracted_value') is not None:
                if isinstance(field['extracted_value'], str):
                    try:
                        field['extracted_value'] = json.loads(field['extracted_value'])
                    except (json.JSONDecodeError, TypeError):
                        pass
            if field.get('validated_value') is not None:
                if isinstance(field['validated_value'], str):
                    try:
                        field['validated_value'] = json.loads(field['validated_value'])
                    except (json.JSONDecodeError, TypeError):
                        pass
            # Convert datetime to string
            if field.get('validated_at'):
                field['validated_at'] = str(field['validated_at'])
            fields.append(field)

        # Build summary counts
        status_counts = {}
        for f in fields:
            s = f.get('status', 'unknown')
            status_counts[s] = status_counts.get(s, 0) + 1

        return {
            'success': True,
            'doc_id': doc_id,
            'total_fields': len(fields),
            'status_summary': status_counts,
            'fields': fields,
        }

    except Exception as e:
        logger.error(f"Error getting ingestion staging for doc {doc_id}: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_staging_field', is_mutation=True)
def update_staging_field(extraction_id: int = None, new_value=None,
                         reason: str = None, **kwargs):
    """
    Update the extracted value of a staging field.
    Sets validated_value to the new corrected value.
    """
    # project_id can come directly as kwarg or nested in project_context
    project_id = kwargs.get('project_id')
    if not project_id:
        project_context = kwargs.get('project_context', {})
        project_id = project_context.get('project_id')
    tool_input = kwargs.get('tool_input', {})
    propose_only = kwargs.get('propose_only', True)

    extraction_id = extraction_id or tool_input.get('extraction_id')
    new_value = new_value if new_value is not None else tool_input.get('new_value')
    reason = reason or tool_input.get('reason', '')

    if not extraction_id:
        return {'success': False, 'error': 'extraction_id is required'}
    if new_value is None:
        return {'success': False, 'error': 'new_value is required'}

    # Serialize value to JSON for jsonb column
    if isinstance(new_value, (dict, list)):
        json_value = json.dumps(new_value)
    elif isinstance(new_value, (int, float)):
        json_value = json.dumps(new_value)
    elif isinstance(new_value, bool):
        json_value = json.dumps(new_value)
    else:
        json_value = json.dumps(str(new_value))

    if propose_only:
        return {
            'success': True,
            'proposed': True,
            'action': 'update_staging_field',
            'extraction_id': extraction_id,
            'new_value': new_value,
            'reason': reason,
            'message': f'Propose updating extraction {extraction_id} to {new_value}. Confirm to apply.',
        }

    try:
        with connection.cursor() as cursor:
            # Verify row belongs to project
            cursor.execute("""
                SELECT extraction_id, field_key, extracted_value
                FROM landscape.ai_extraction_staging
                WHERE extraction_id = %s AND project_id = %s
            """, [extraction_id, project_id])
            row = cursor.fetchone()

            if not row:
                return {'success': False, 'error': f'Extraction {extraction_id} not found for this project'}

            cursor.execute("""
                UPDATE landscape.ai_extraction_staging
                SET validated_value = %s::jsonb,
                    validated_by = 'landscaper',
                    validated_at = NOW()
                WHERE extraction_id = %s AND project_id = %s
            """, [json_value, extraction_id, project_id])

        return {
            'success': True,
            'extraction_id': extraction_id,
            'field_key': row[1],
            'previous_value': row[2],
            'new_value': new_value,
            'reason': reason,
            'message': f'Updated extraction {extraction_id} ({row[1]}) value.',
        }

    except Exception as e:
        logger.error(f"Error updating staging field {extraction_id}: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('approve_staging_field', is_mutation=True)
def approve_staging_field(extraction_ids: list = None, **kwargs):
    """
    Accept/approve extracted field values, marking them as 'accepted'.
    """
    # project_id can come directly as kwarg or nested in project_context
    project_id = kwargs.get('project_id')
    if not project_id:
        project_context = kwargs.get('project_context', {})
        project_id = project_context.get('project_id')
    tool_input = kwargs.get('tool_input', {})
    propose_only = kwargs.get('propose_only', True)

    extraction_ids = extraction_ids or tool_input.get('extraction_ids', [])

    if not extraction_ids:
        return {'success': False, 'error': 'extraction_ids is required (list of IDs)'}

    if propose_only:
        return {
            'success': True,
            'proposed': True,
            'action': 'approve_staging_field',
            'extraction_ids': extraction_ids,
            'message': f'Propose approving {len(extraction_ids)} field(s). Confirm to apply.',
        }

    try:
        # Convert to tuple for SQL IN clause
        id_placeholders = ','.join(['%s'] * len(extraction_ids))
        params = extraction_ids + [project_id]

        with connection.cursor() as cursor:
            cursor.execute(f"""
                UPDATE landscape.ai_extraction_staging
                SET status = 'accepted',
                    validated_by = 'landscaper',
                    validated_at = NOW()
                WHERE extraction_id IN ({id_placeholders})
                  AND project_id = %s
                  AND status != 'accepted'
                RETURNING extraction_id, field_key
            """, params)
            updated = cursor.fetchall()

        return {
            'success': True,
            'approved_count': len(updated),
            'approved_fields': [{'extraction_id': r[0], 'field_key': r[1]} for r in updated],
            'message': f'Approved {len(updated)} field(s).',
        }

    except Exception as e:
        logger.error(f"Error approving staging fields: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('reject_staging_field', is_mutation=True)
def reject_staging_field(extraction_ids: list = None, reason: str = None, **kwargs):
    """
    Reject extracted field values, marking them as 'rejected' with reason.
    """
    # project_id can come directly as kwarg or nested in project_context
    project_id = kwargs.get('project_id')
    if not project_id:
        project_context = kwargs.get('project_context', {})
        project_id = project_context.get('project_id')
    tool_input = kwargs.get('tool_input', {})
    propose_only = kwargs.get('propose_only', True)

    extraction_ids = extraction_ids or tool_input.get('extraction_ids', [])
    reason = reason or tool_input.get('reason', 'Rejected by user via Landscaper')

    if not extraction_ids:
        return {'success': False, 'error': 'extraction_ids is required (list of IDs)'}

    if propose_only:
        return {
            'success': True,
            'proposed': True,
            'action': 'reject_staging_field',
            'extraction_ids': extraction_ids,
            'reason': reason,
            'message': f'Propose rejecting {len(extraction_ids)} field(s). Confirm to apply.',
        }

    try:
        id_placeholders = ','.join(['%s'] * len(extraction_ids))
        params = [reason] + extraction_ids + [project_id]

        with connection.cursor() as cursor:
            cursor.execute(f"""
                UPDATE landscape.ai_extraction_staging
                SET status = 'rejected',
                    rejection_reason = %s,
                    validated_by = 'landscaper',
                    validated_at = NOW()
                WHERE extraction_id IN ({id_placeholders})
                  AND project_id = %s
                  AND status != 'rejected'
                RETURNING extraction_id, field_key
            """, params)
            updated = cursor.fetchall()

        return {
            'success': True,
            'rejected_count': len(updated),
            'rejected_fields': [{'extraction_id': r[0], 'field_key': r[1]} for r in updated],
            'reason': reason,
            'message': f'Rejected {len(updated)} field(s).',
        }

    except Exception as e:
        logger.error(f"Error rejecting staging fields: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('explain_extraction')
def explain_extraction(extraction_id: int = None, **kwargs):
    """
    Explain why a specific field was extracted with its current value.

    Returns source text, page number, confidence reasoning, and surrounding
    context from the document to help the user understand the extraction.
    """
    # project_id can come directly as kwarg or nested in project_context
    project_id = kwargs.get('project_id')
    if not project_id:
        project_context = kwargs.get('project_context', {})
        project_id = project_context.get('project_id')
    tool_input = kwargs.get('tool_input', {})

    extraction_id = extraction_id or tool_input.get('extraction_id')

    if not extraction_id:
        return {'success': False, 'error': 'extraction_id is required'}

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    e.extraction_id,
                    e.field_key,
                    e.target_table,
                    e.target_field,
                    e.extracted_value,
                    e.confidence_score,
                    e.status,
                    e.source_page,
                    e.source_text,
                    e.source_snippet,
                    e.extraction_type,
                    e.scope,
                    e.scope_label,
                    e.conflict_with_extraction_id,
                    e.rejection_reason,
                    d.doc_name,
                    d.doc_type,
                    d.mime_type
                FROM landscape.ai_extraction_staging e
                LEFT JOIN landscape.core_doc d ON e.doc_id = d.doc_id
                WHERE e.extraction_id = %s AND e.project_id = %s
            """, [extraction_id, project_id])
            row = cursor.fetchone()

        if not row:
            return {'success': False, 'error': f'Extraction {extraction_id} not found for this project'}

        columns = [
            'extraction_id', 'field_key', 'target_table', 'target_field',
            'extracted_value', 'confidence_score', 'status', 'source_page',
            'source_text', 'source_snippet', 'extraction_type', 'scope',
            'scope_label', 'conflict_with_extraction_id', 'rejection_reason',
            'doc_name', 'doc_type', 'mime_type',
        ]
        field = dict(zip(columns, row))

        # Build explanation
        explanation_parts = []

        # Source document
        doc_name = field.get('doc_name', 'Unknown document')
        doc_type = field.get('doc_type', 'unknown type')
        explanation_parts.append(f"**Source:** {doc_name} ({doc_type})")

        # Page reference (rarely populated — only include when present)
        if field.get('source_page'):
            explanation_parts.append(f"**Page:** {field['source_page']}")

        # Confidence
        conf = field.get('confidence_score')
        if conf is not None:
            conf_pct = float(conf) * 100
            if conf_pct >= 90:
                conf_label = 'High confidence'
            elif conf_pct >= 70:
                conf_label = 'Medium confidence'
            else:
                conf_label = 'Low confidence'
            explanation_parts.append(f"**Confidence:** {conf_pct:.0f}% ({conf_label})")

        # Source citation — prefer source_snippet (87% populated), fall back
        # to source_text (12%), then show "no source" message
        if field.get('source_snippet'):
            explanation_parts.append(f"**Evidence:** \"{field['source_snippet']}\"")
        elif field.get('source_text'):
            # Truncate to 500 chars for readability
            text = field['source_text'][:500]
            if len(field['source_text']) > 500:
                text += '...'
            explanation_parts.append(f"**Evidence:** \"{text}\"")
        else:
            explanation_parts.append(
                f"**Evidence:** No source snippet recorded. "
                f"This value was extracted from {doc_name} but the specific "
                f"text passage was not captured."
            )

        # Conflict info
        if field.get('conflict_with_extraction_id'):
            explanation_parts.append(
                f"**Conflict:** This value conflicts with extraction {field['conflict_with_extraction_id']}. "
                "Multiple sources provided different values for this field."
            )

        # Extraction type
        if field.get('extraction_type'):
            explanation_parts.append(f"**Extraction method:** {field['extraction_type']}")

        # Scope
        if field.get('scope_label'):
            explanation_parts.append(f"**Scope:** {field['scope_label']} ({field.get('scope', '')})")

        return {
            'success': True,
            'extraction_id': extraction_id,
            'field_key': field.get('field_key'),
            'extracted_value': field.get('extracted_value'),
            'explanation': '\n'.join(explanation_parts),
            'raw': field,
        }

    except Exception as e:
        logger.error(f"Error explaining extraction {extraction_id}: {e}")
        return {'success': False, 'error': str(e)}
