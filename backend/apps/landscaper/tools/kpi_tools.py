"""
KPI Definition tools for Landscaper AI.

Phase 6 of What-If Engine: Custom Instructions + KPI Definitions.

Tools:
  1. get_kpi_definitions  - Retrieve user's "results" KPI set for a project type
  2. update_kpi_definitions - Add/remove/reorder KPIs in saved "results" definition

These tools allow the AI to:
- Know what "results" means for the current project type
- Temporarily add KPIs mid-conversation and offer to persist them
"""

import logging
from django.db import connection
from django.utils import timezone
from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


@register_tool('get_kpi_definitions')
def get_kpi_definitions(project_type_code: str = None, **kwargs):
    """
    Get the user's saved KPI definitions for a project type.

    Returns the ordered list of KPIs that define what "results" means
    when the user asks "what are the results if...?"

    Args:
        project_type_code: Project type code (LAND, MF, OFF, RET, IND, HTL, MXU).
                          If not provided, infers from project_context.
    """
    project_context = kwargs.get('project_context', {})

    # Resolve project type code
    if not project_type_code:
        pt = project_context.get('project_type_code', '') or ''
        # Map common names to codes
        type_map = {
            'land_development': 'LAND', 'land': 'LAND',
            'multifamily': 'MF', 'mf': 'MF',
            'office': 'OFF', 'retail': 'RET',
            'industrial': 'IND', 'hotel': 'HTL',
            'mixed_use': 'MXU', 'mixed use': 'MXU',
        }
        project_type_code = type_map.get(pt.lower(), pt.upper()) if pt else 'LAND'

    user_id = 1  # Default until auth is wired up

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT kpi_key, display_label, display_order
                FROM tbl_landscaper_kpi_definition
                WHERE user_id = %s
                  AND project_type_code = %s
                  AND is_active = true
                ORDER BY display_order
            """, [user_id, project_type_code.upper()])
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return {
            'success': True,
            'project_type_code': project_type_code.upper(),
            'kpi_count': len(rows),
            'kpis': rows,
            'hint': (
                'These KPIs define what "results" means for this project type. '
                'When the user says "what are the results", return all of these metrics.'
            ),
        }

    except Exception as e:
        logger.error(f"[KPI_TOOLS] get_kpi_definitions failed: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_kpi_definitions', is_mutation=True)
def update_kpi_definitions(
    action: str = 'add',
    project_type_code: str = None,
    kpi_key: str = None,
    display_label: str = None,
    display_order: int = None,
    **kwargs
):
    """
    Add, remove, or reorder a KPI in the user's "results" definition.

    Use this when:
    - User says "add cash-on-cash to my results" → action='add'
    - User says "remove DSCR from results" → action='remove'
    - User confirms they want to save a temporary KPI addition

    Args:
        action: 'add' to add/activate, 'remove' to deactivate
        project_type_code: Project type code (LAND, MF, etc.)
        kpi_key: Machine key for the KPI (e.g., 'cash_on_cash', 'irr')
        display_label: Human-readable label (required for 'add')
        display_order: Position in results display (optional, auto-assigns if omitted)
    """
    project_context = kwargs.get('project_context', {})

    # Resolve project type code
    if not project_type_code:
        pt = project_context.get('project_type_code', '') or ''
        type_map = {
            'land_development': 'LAND', 'land': 'LAND',
            'multifamily': 'MF', 'mf': 'MF',
            'office': 'OFF', 'retail': 'RET',
            'industrial': 'IND', 'hotel': 'HTL',
            'mixed_use': 'MXU', 'mixed use': 'MXU',
        }
        project_type_code = type_map.get(pt.lower(), pt.upper()) if pt else 'LAND'

    if not kpi_key:
        return {'success': False, 'error': 'kpi_key is required'}

    user_id = 1  # Default until auth is wired up
    ptc = project_type_code.upper()
    now = timezone.now()

    try:
        with connection.cursor() as cursor:
            if action == 'add':
                if not display_label:
                    # Default label from key: 'cash_on_cash' → 'Cash On Cash'
                    display_label = kpi_key.replace('_', ' ').title()

                if display_order is None:
                    # Auto-assign next order
                    cursor.execute("""
                        SELECT COALESCE(MAX(display_order), 0) + 1
                        FROM tbl_landscaper_kpi_definition
                        WHERE user_id = %s AND project_type_code = %s
                    """, [user_id, ptc])
                    display_order = cursor.fetchone()[0]

                cursor.execute("""
                    INSERT INTO tbl_landscaper_kpi_definition
                        (user_id, project_type_code, kpi_key, display_label,
                         display_order, is_active, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, true, %s, %s)
                    ON CONFLICT (user_id, project_type_code, kpi_key)
                    DO UPDATE SET
                        display_label = EXCLUDED.display_label,
                        display_order = EXCLUDED.display_order,
                        is_active = true,
                        updated_at = EXCLUDED.updated_at
                    RETURNING id, kpi_key, display_label, display_order
                """, [user_id, ptc, kpi_key, display_label, display_order, now, now])
                columns = [col[0] for col in cursor.description]
                row = dict(zip(columns, cursor.fetchone()))

                logger.info(f"[KPI_TOOLS] Added KPI '{kpi_key}' to {ptc} results definition")
                return {
                    'success': True,
                    'action': 'added',
                    'kpi': row,
                    'project_type_code': ptc,
                }

            elif action == 'remove':
                cursor.execute("""
                    UPDATE tbl_landscaper_kpi_definition
                    SET is_active = false, updated_at = %s
                    WHERE user_id = %s AND project_type_code = %s AND kpi_key = %s
                    RETURNING id, kpi_key
                """, [now, user_id, ptc, kpi_key])
                result = cursor.fetchone()

                if not result:
                    return {
                        'success': False,
                        'error': f"KPI '{kpi_key}' not found in {ptc} results definition"
                    }

                logger.info(f"[KPI_TOOLS] Removed KPI '{kpi_key}' from {ptc} results definition")
                return {
                    'success': True,
                    'action': 'removed',
                    'kpi_key': kpi_key,
                    'project_type_code': ptc,
                }

            else:
                return {'success': False, 'error': f"Unknown action: {action}. Use 'add' or 'remove'."}

    except Exception as e:
        logger.error(f"[KPI_TOOLS] update_kpi_definitions failed: {e}")
        return {'success': False, 'error': str(e)}
