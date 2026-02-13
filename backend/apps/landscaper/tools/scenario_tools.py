"""
Scenario management tools for Landscaper.

These tools let users save, load, and query past what-if explorations
from within the chat interface. They register via @register_tool and
are dispatched by tool_executor.py.

Tools:
- scenario_save: Save/name the current what-if session
- scenario_load: Load a previously saved scenario into the active shadow
- scenario_log_query: List/search saved scenarios for a project
"""
import json
import logging
from typing import Any, Dict, Optional

from django.db import connection
from django.utils import timezone

from ..tool_executor import register_tool
from ..services import whatif_storage
from ..services.whatif_engine import WhatIfEngine, ShadowContext

logger = logging.getLogger(__name__)


@register_tool('scenario_save')
def handle_scenario_save(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Save the current what-if session as a named scenario.

    Promotes the active shadow to status='saved' and writes
    normalized rows to tbl_assumption_snapshot for SQL querying.
    """
    scenario_name = tool_input.get('scenario_name', '').strip()
    description = tool_input.get('description', '').strip() or None
    tags = tool_input.get('tags', [])

    if not scenario_name:
        return {'success': False, 'error': 'scenario_name is required'}
    if not thread_id:
        return {'success': False, 'error': 'thread_id not available'}

    try:
        # Load active shadow
        shadow_data = whatif_storage.load_shadow_from_db(thread_id)
        if not shadow_data:
            return {
                'success': False,
                'error': 'No active what-if session to save. Run whatif_compute first.',
            }

        scenario_log_id = shadow_data.get('_scenario_log_id')
        if not scenario_log_id:
            return {'success': False, 'error': 'Could not resolve scenario_log_id'}

        # Promote to saved
        whatif_storage.mark_saved(
            scenario_log_id,
            scenario_name,
            description=description,
            tags=tags,
        )

        # Write normalized snapshot rows
        overrides = shadow_data.get('overrides', {})
        _write_assumption_snapshots(scenario_log_id, overrides)

        override_count = len(overrides)
        return {
            'success': True,
            'scenario_log_id': scenario_log_id,
            'scenario_name': scenario_name,
            'overrides_saved': override_count,
            'message': f'Scenario "{scenario_name}" saved with {override_count} override{"s" if override_count != 1 else ""}.',
        }

    except Exception as e:
        logger.error(f"scenario_save error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool('scenario_load')
def handle_scenario_load(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Load a previously saved scenario into the active shadow.

    Replays saved overrides against the CURRENT database state,
    recomputing metrics fresh. This means deltas reflect the impact
    on the current baseline, not the historical one.
    """
    scenario_log_id = tool_input.get('scenario_log_id')
    if not scenario_log_id:
        return {'success': False, 'error': 'scenario_log_id is required'}
    if not thread_id:
        return {'success': False, 'error': 'thread_id not available'}

    try:
        # Load the saved scenario
        saved = _load_scenario_by_id(scenario_log_id, project_id)
        if not saved:
            return {
                'success': False,
                'error': f'Scenario {scenario_log_id} not found or does not belong to this project.',
            }

        saved_overrides = saved['scenario_data'].get('overrides', {})
        if not saved_overrides:
            return {
                'success': True,
                'message': f'Scenario "{saved["scenario_name"]}" has no overrides (baseline checkpoint).',
                'scenario_name': saved['scenario_name'],
                'overrides_loaded': 0,
            }

        # Create a fresh shadow with current baseline, then replay overrides
        engine = WhatIfEngine(project_id)
        shadow = engine.create_shadow(thread_id)

        for key, ov_data in saved_overrides.items():
            shadow = engine.apply_override(
                shadow,
                field=ov_data.get('field', ''),
                table=ov_data.get('table', ''),
                new_value=ov_data.get('override_value'),
                label=ov_data.get('label', ''),
                unit=ov_data.get('unit', ''),
                record_id=ov_data.get('record_id'),
            )

        # Compute metrics against current baseline
        results = engine.compute_shadow_metrics(shadow)

        # Persist as new active shadow
        scenario_log_id_new = whatif_storage.save_shadow_to_db(
            thread_id=thread_id,
            project_id=project_id,
            scenario_data=shadow.to_scenario_data(),
        )
        shadow.scenario_log_id = scenario_log_id_new

        return {
            'success': True,
            'mode': 'whatif',
            'scenario_name': saved['scenario_name'],
            'overrides_loaded': len(saved_overrides),
            'message': f'Loaded "{saved["scenario_name"]}" ({len(saved_overrides)} overrides replayed against current data).',
            **results,
        }

    except Exception as e:
        logger.error(f"scenario_load error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool('scenario_log_query')
def handle_scenario_log_query(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    List saved scenarios for a project.

    Supports optional filtering by status, tags, and search term.
    Returns summary info (not full scenario_data) for efficiency.
    """
    status_filter = tool_input.get('status', 'saved')
    tag_filter = tool_input.get('tag')
    search = tool_input.get('search', '').strip()
    limit = min(tool_input.get('limit', 20), 50)

    try:
        scenarios = _query_scenarios(
            project_id,
            status_filter=status_filter,
            tag_filter=tag_filter,
            search=search,
            limit=limit,
        )

        return {
            'success': True,
            'count': len(scenarios),
            'scenarios': scenarios,
        }

    except Exception as e:
        logger.error(f"scenario_log_query error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


# =============================================================================
# Internal helpers
# =============================================================================

def _write_assumption_snapshots(scenario_log_id: int, overrides: Dict[str, Any]) -> int:
    """
    Write normalized rows to tbl_assumption_snapshot from the overrides dict.

    Returns number of rows written.
    """
    if not overrides:
        return 0

    rows = []
    now = timezone.now()
    for key, ov in overrides.items():
        rows.append((
            scenario_log_id,
            ov.get('field', ''),
            ov.get('table', ''),
            ov.get('record_id'),
            json.dumps(ov.get('original_value')),
            json.dumps(ov.get('override_value')),
            ov.get('label', ''),
            ov.get('unit', ''),
            ov.get('applied_at', now.isoformat()),
        ))

    with connection.cursor() as cursor:
        cursor.executemany("""
            INSERT INTO landscape.tbl_assumption_snapshot
                (scenario_log_id, field, table_name, record_id,
                 original_value, override_value, label, unit, applied_at)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s)
        """, rows)

    return len(rows)


def _load_scenario_by_id(scenario_log_id: int, project_id: int) -> Optional[Dict[str, Any]]:
    """Load a scenario row by ID, scoped to project."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT scenario_log_id, scenario_name, description, status,
                   scenario_data, tags, created_at, updated_at
            FROM landscape.tbl_scenario_log
            WHERE scenario_log_id = %s AND project_id = %s
        """, [scenario_log_id, project_id])
        row = cursor.fetchone()

    if not row:
        return None

    data = row[4] if isinstance(row[4], dict) else json.loads(row[4])
    return {
        'scenario_log_id': row[0],
        'scenario_name': row[1],
        'description': row[2],
        'status': row[3],
        'scenario_data': data,
        'tags': row[5],
        'created_at': row[6].isoformat() if row[6] else None,
        'updated_at': row[7].isoformat() if row[7] else None,
    }


def _query_scenarios(
    project_id: int,
    status_filter: str = 'saved',
    tag_filter: Optional[str] = None,
    search: str = '',
    limit: int = 20,
) -> list:
    """Query scenarios with optional filters."""
    conditions = ["project_id = %s"]
    params = [project_id]

    if status_filter and status_filter != 'all':
        conditions.append("status = %s")
        params.append(status_filter)

    if tag_filter:
        conditions.append("%s = ANY(tags)")
        params.append(tag_filter)

    if search:
        conditions.append("(scenario_name ILIKE %s OR description ILIKE %s)")
        params.extend([f'%{search}%', f'%{search}%'])

    where_clause = " AND ".join(conditions)
    params.append(limit)

    with connection.cursor() as cursor:
        cursor.execute(f"""
            SELECT scenario_log_id, scenario_name, description, status,
                   tags, source,
                   scenario_data->'overrides' AS overrides_json,
                   scenario_data->'computed_results'->'metrics' AS metrics_json,
                   created_at, updated_at, committed_at
            FROM landscape.tbl_scenario_log
            WHERE {where_clause}
            ORDER BY updated_at DESC
            LIMIT %s
        """, params)
        rows = cursor.fetchall()

    scenarios = []
    for row in rows:
        overrides_raw = row[6]
        if isinstance(overrides_raw, str):
            overrides_raw = json.loads(overrides_raw)
        overrides_raw = overrides_raw or {}

        metrics_raw = row[7]
        if isinstance(metrics_raw, str):
            metrics_raw = json.loads(metrics_raw)

        # Build override summary (field/label/from/to) without full data
        override_summary = []
        for key, ov in overrides_raw.items():
            override_summary.append({
                'field': ov.get('field'),
                'label': ov.get('label', ov.get('field')),
                'from': ov.get('original_value'),
                'to': ov.get('override_value'),
                'unit': ov.get('unit', ''),
            })

        scenarios.append({
            'scenario_log_id': row[0],
            'scenario_name': row[1],
            'description': row[2],
            'status': row[3],
            'tags': row[4],
            'source': row[5],
            'overrides_count': len(overrides_raw),
            'overrides_summary': override_summary,
            'metrics': metrics_raw,
            'created_at': row[8].isoformat() if row[8] else None,
            'updated_at': row[9].isoformat() if row[9] else None,
            'committed_at': row[10].isoformat() if row[10] else None,
        })

    return scenarios
