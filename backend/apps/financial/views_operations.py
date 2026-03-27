"""
Operations save endpoints — migrated from legacy Next.js routes.

PUT /api/projects/{project_id}/operations/inputs/   — batch upsert user inputs
PUT /api/projects/{project_id}/operations/settings/  — toggle value-add, vacancy override, mgmt fee

Tables touched:
  - tbl_operations_user_inputs  (composite key: project_id + section + line_item_key)
  - tbl_project_assumption      (composite key: project_id + assumption_key)
  - tbl_project                 (value_add_enabled flag)
"""

import logging
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)


# =============================================================================
# PUT /api/projects/{project_id}/operations/inputs/
# =============================================================================

@api_view(['PUT'])
@permission_classes([AllowAny])
def operations_inputs(request, project_id):
    """
    Batch upsert operations line-item inputs.

    Request body:
    {
        "updates": [
            {
                "section": "rental_income" | "vacancy_deductions" | "other_income" | "operating_expenses",
                "line_item_key": str,
                "category_id": int | null,
                "as_is_value": float | null,
                "as_is_count": float | null,
                "as_is_rate": float | null,
                "as_is_growth_rate": float | null,
                "post_reno_value": float | null,
                "post_reno_count": float | null,
                "post_reno_rate": float | null,
                "post_reno_per_sf": float | null,
                "post_reno_growth_rate": float | null
            }
        ]
    }
    """
    updates = request.data.get('updates')
    if not updates or not isinstance(updates, list):
        return Response({'error': 'Missing updates array'}, status=400)

    try:
        with connection.cursor() as cursor:
            for update in updates:
                section = update.get('section')
                line_item_key = update.get('line_item_key')

                if not section or not line_item_key:
                    continue

                # Special handling: management fee percentage also updates assumption
                if line_item_key == 'calculated_management_fee':
                    _upsert_management_fee(cursor, project_id, update)
                    continue

                # Generic user_inputs upsert
                cursor.execute("""
                    INSERT INTO landscape.tbl_operations_user_inputs (
                        project_id, section, line_item_key, category_id,
                        as_is_value, as_is_count, as_is_rate, as_is_growth_rate,
                        post_reno_value, post_reno_count, post_reno_rate,
                        post_reno_per_sf, post_reno_growth_rate,
                        updated_at
                    ) VALUES (
                        %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s,
                        NOW()
                    )
                    ON CONFLICT (project_id, section, line_item_key)
                    DO UPDATE SET
                        as_is_value = COALESCE(EXCLUDED.as_is_value, tbl_operations_user_inputs.as_is_value),
                        as_is_count = COALESCE(EXCLUDED.as_is_count, tbl_operations_user_inputs.as_is_count),
                        as_is_rate = COALESCE(EXCLUDED.as_is_rate, tbl_operations_user_inputs.as_is_rate),
                        as_is_growth_rate = COALESCE(EXCLUDED.as_is_growth_rate, tbl_operations_user_inputs.as_is_growth_rate),
                        post_reno_value = COALESCE(EXCLUDED.post_reno_value, tbl_operations_user_inputs.post_reno_value),
                        post_reno_count = COALESCE(EXCLUDED.post_reno_count, tbl_operations_user_inputs.post_reno_count),
                        post_reno_rate = COALESCE(EXCLUDED.post_reno_rate, tbl_operations_user_inputs.post_reno_rate),
                        post_reno_per_sf = COALESCE(EXCLUDED.post_reno_per_sf, tbl_operations_user_inputs.post_reno_per_sf),
                        post_reno_growth_rate = COALESCE(EXCLUDED.post_reno_growth_rate, tbl_operations_user_inputs.post_reno_growth_rate),
                        updated_at = NOW()
                """, [
                    project_id,
                    section,
                    line_item_key,
                    update.get('category_id'),
                    update.get('as_is_value'),
                    update.get('as_is_count'),
                    update.get('as_is_rate'),
                    update.get('as_is_growth_rate'),
                    update.get('post_reno_value'),
                    update.get('post_reno_count'),
                    update.get('post_reno_rate'),
                    update.get('post_reno_per_sf'),
                    update.get('post_reno_growth_rate'),
                ])

        return Response({
            'success': True,
            'updated_count': len(updates),
        })

    except Exception as e:
        logger.exception('Error saving operations inputs')
        return Response({'error': 'Failed to save operations inputs'}, status=500)


def _upsert_management_fee(cursor, project_id, update):
    """Handle management fee special case: update tbl_project_assumption."""
    as_is_rate = update.get('as_is_rate')
    post_reno_rate = update.get('post_reno_rate')

    # Use whichever rate is provided (post_reno takes precedence if both sent)
    rate = post_reno_rate if post_reno_rate is not None else as_is_rate
    if rate is not None:
        cursor.execute("""
            INSERT INTO landscape.tbl_project_assumption
                (project_id, assumption_key, assumption_value)
            VALUES (%s, 'management_fee_pct', %s)
            ON CONFLICT (project_id, assumption_key)
            DO UPDATE SET assumption_value = %s, updated_at = NOW()
        """, [project_id, str(rate), str(rate)])


# =============================================================================
# PUT /api/projects/{project_id}/operations/settings/
# =============================================================================

@api_view(['PUT'])
@permission_classes([AllowAny])
def operations_settings(request, project_id):
    """
    Update operations settings.

    Request body (all fields optional):
    {
        "value_add_enabled": bool,
        "vacancy_override_pct": float | null,   // null = clear override
        "management_fee_pct": float,
        "management_fee_source": "ingestion" | "user_modified"
    }
    """
    data = request.data
    result = {}

    try:
        with connection.cursor() as cursor:

            # ── value_add_enabled toggle on tbl_project ──
            if 'value_add_enabled' in data and isinstance(data['value_add_enabled'], bool):
                try:
                    cursor.execute("""
                        UPDATE landscape.tbl_project
                        SET value_add_enabled = %s
                        WHERE project_id = %s
                    """, [data['value_add_enabled'], project_id])
                    result['value_add_enabled'] = data['value_add_enabled']
                except Exception:
                    logger.warning(
                        'value_add_enabled column not found — migration 043 may not have run'
                    )

            # ── vacancy_override_pct ──
            if 'vacancy_override_pct' in data:
                val = data['vacancy_override_pct']
                if val is None:
                    # Clear override → revert to rent-roll-calculated vacancy
                    cursor.execute("""
                        DELETE FROM landscape.tbl_project_assumption
                        WHERE project_id = %s AND assumption_key = 'vacancy_override_pct'
                    """, [project_id])
                else:
                    cursor.execute("""
                        INSERT INTO landscape.tbl_project_assumption
                            (project_id, assumption_key, assumption_value)
                        VALUES (%s, 'vacancy_override_pct', %s)
                        ON CONFLICT (project_id, assumption_key)
                        DO UPDATE SET assumption_value = %s, updated_at = NOW()
                    """, [project_id, str(val), str(val)])
                result['vacancy_override_pct'] = val

            # ── management_fee_pct ──
            if 'management_fee_pct' in data and isinstance(data['management_fee_pct'], (int, float)):
                val = data['management_fee_pct']
                cursor.execute("""
                    INSERT INTO landscape.tbl_project_assumption
                        (project_id, assumption_key, assumption_value)
                    VALUES (%s, 'management_fee_pct', %s)
                    ON CONFLICT (project_id, assumption_key)
                    DO UPDATE SET assumption_value = %s, updated_at = NOW()
                """, [project_id, str(val), str(val)])
                result['management_fee_pct'] = val

            # ── management_fee_source ──
            if 'management_fee_source' in data:
                source = data['management_fee_source']
                if source == 'ingestion':
                    # Revert: remove user override
                    cursor.execute("""
                        DELETE FROM landscape.tbl_project_assumption
                        WHERE project_id = %s AND assumption_key = 'management_fee_source'
                    """, [project_id])
                else:
                    cursor.execute("""
                        INSERT INTO landscape.tbl_project_assumption
                            (project_id, assumption_key, assumption_value)
                        VALUES (%s, 'management_fee_source', %s)
                        ON CONFLICT (project_id, assumption_key)
                        DO UPDATE SET assumption_value = %s, updated_at = NOW()
                    """, [project_id, source, source])
                result['management_fee_source'] = source

        return Response({'success': True, **result})

    except Exception as e:
        logger.exception('Error updating operations settings')
        return Response({'error': 'Failed to update operations settings'}, status=500)
