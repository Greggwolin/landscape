"""
Scenario operations tools for Landscaper.

These tools handle advanced scenario operations: replay, comparison,
diff, branching, and cross-project application. They register via
@register_tool and are dispatched by tool_executor.py.

Tools:
- scenario_replay: Replay saved overrides against current DB state
- scenario_compare: Side-by-side comparison of two scenarios
- scenario_diff: Show which overrides still differ from current DB
- scenario_branch: Create a new scenario branching from an existing one
- scenario_apply_cross_project: Apply rate/percentage overrides to another project
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

# Fields that are transferable across projects (rates/percentages only).
# Absolute values (prices, costs, dollar amounts) are project-specific.
TRANSFERABLE_FIELD_SUFFIXES = (
    '_pct', '_rate', '_ratio', '_margin',
    '_growth', '_escalation', '_cap_rate',
)

TRANSFERABLE_FIELDS = {
    'vacancy_loss_pct', 'collection_loss_pct', 'physical_vacancy_pct',
    'economic_vacancy_pct', 'vacancy_rate', 'stabilized_vacancy',
    'credit_loss', 'discount_rate', 'discount_rate_pct',
    'exit_cap_rate', 'going_in_cap_rate', 'cost_of_capital_pct',
    'annual_rent_growth_pct', 'management_fee_pct', 'escalation_rate',
    'recovery_rate', 'selling_costs_pct', 'bulk_sale_discount_pct',
    'occupancy_pct', 'sensitivity_interval',
}


@register_tool('scenario_replay')
def handle_scenario_replay(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Replay a saved scenario against the current database state.

    Creates a fresh shadow with current baseline, applies the saved
    overrides, and computes metrics. Deltas reflect impact on the
    current state, not the historical baseline.
    """
    scenario_log_id = tool_input.get('scenario_log_id')
    if not scenario_log_id:
        return {'success': False, 'error': 'scenario_log_id is required'}
    if not thread_id:
        return {'success': False, 'error': 'thread_id not available'}

    try:
        from .scenario_tools import _load_scenario_by_id
        scenario = _load_scenario_by_id(scenario_log_id, project_id)
        if not scenario:
            return {
                'success': False,
                'error': f'Scenario {scenario_log_id} not found.',
            }

        engine = WhatIfEngine(project_id)
        result = engine.replay_scenario(scenario['scenario_data'], thread_id)

        if not result.get('success', False):
            return result

        # Persist the replayed shadow
        shadow = result.pop('shadow', None)
        if shadow:
            new_id = whatif_storage.save_shadow_to_db(
                thread_id=thread_id,
                project_id=project_id,
                scenario_data=shadow.to_scenario_data(),
            )
            result['scenario_log_id'] = new_id

        result['scenario_name'] = scenario.get('scenario_name', '')
        result['mode'] = 'whatif'
        result['message'] = (
            f'Replayed "{scenario.get("scenario_name", "")}" '
            f'({result.get("overrides_replayed", 0)} overrides) against current data.'
        )

        return result

    except Exception as e:
        logger.error(f"scenario_replay error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool('scenario_compare')
def handle_scenario_compare(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Compare two saved scenarios side-by-side.

    Replays both against the current DB independently and produces
    baseline, A metrics, B metrics, and all pairwise deltas.
    """
    scenario_id_a = tool_input.get('scenario_id_a')
    scenario_id_b = tool_input.get('scenario_id_b')

    if not scenario_id_a or not scenario_id_b:
        return {'success': False, 'error': 'Both scenario_id_a and scenario_id_b are required'}

    try:
        from .scenario_tools import _load_scenario_by_id

        scenario_a = _load_scenario_by_id(scenario_id_a, project_id)
        scenario_b = _load_scenario_by_id(scenario_id_b, project_id)

        if not scenario_a:
            return {'success': False, 'error': f'Scenario {scenario_id_a} not found.'}
        if not scenario_b:
            return {'success': False, 'error': f'Scenario {scenario_id_b} not found.'}

        name_a = scenario_a.get('scenario_name') or f'Scenario {scenario_id_a}'
        name_b = scenario_b.get('scenario_name') or f'Scenario {scenario_id_b}'

        engine = WhatIfEngine(project_id)
        comparison = engine.compare_scenarios(
            scenario_a['scenario_data'],
            scenario_b['scenario_data'],
            name_a=name_a,
            name_b=name_b,
        )

        return {
            'success': True,
            'mode': 'comparison',
            **comparison,
        }

    except Exception as e:
        logger.error(f"scenario_compare error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool('scenario_diff')
def handle_scenario_diff(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Diff a saved scenario against the current database.

    Shows which overrides would still be different from current DB values
    (still_different) and which have been absorbed (DB now matches override).
    """
    scenario_log_id = tool_input.get('scenario_log_id')
    if not scenario_log_id:
        return {'success': False, 'error': 'scenario_log_id is required'}

    try:
        from .scenario_tools import _load_scenario_by_id
        scenario = _load_scenario_by_id(scenario_log_id, project_id)
        if not scenario:
            return {'success': False, 'error': f'Scenario {scenario_log_id} not found.'}

        engine = WhatIfEngine(project_id)
        diff_result = engine.diff_scenario(scenario['scenario_data'])

        return {
            'success': True,
            'scenario_name': scenario.get('scenario_name', ''),
            **diff_result,
        }

    except Exception as e:
        logger.error(f"scenario_diff error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool('scenario_branch')
def handle_scenario_branch(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Create a new scenario branching from an existing one.

    Copies the parent scenario's overrides into a new saved scenario
    with parent_scenario_id set. The branch can then be modified
    independently.
    """
    parent_id = tool_input.get('parent_scenario_id')
    new_name = tool_input.get('scenario_name', '').strip()
    description = tool_input.get('description', '').strip() or None

    if not parent_id:
        return {'success': False, 'error': 'parent_scenario_id is required'}
    if not new_name:
        return {'success': False, 'error': 'scenario_name is required for the new branch'}

    try:
        from .scenario_tools import _load_scenario_by_id
        parent = _load_scenario_by_id(parent_id, project_id)
        if not parent:
            return {'success': False, 'error': f'Parent scenario {parent_id} not found.'}

        # Create new scenario row as a branch
        now = timezone.now()
        data_json = json.dumps(parent['scenario_data'])

        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.tbl_scenario_log
                    (project_id, scenario_name, description, status,
                     scenario_data, source, parent_scenario_id,
                     created_at, updated_at)
                VALUES (%s, %s, %s, 'saved', %s::jsonb, 'landscaper_chat', %s, %s, %s)
                RETURNING scenario_log_id
            """, [
                project_id, new_name, description,
                data_json, parent_id,
                now, now,
            ])
            new_id = cursor.fetchone()[0]

        parent_name = parent.get('scenario_name') or f'Scenario {parent_id}'
        overrides_count = len(parent['scenario_data'].get('overrides', {}))

        return {
            'success': True,
            'scenario_log_id': new_id,
            'scenario_name': new_name,
            'parent_scenario_id': parent_id,
            'parent_name': parent_name,
            'overrides_inherited': overrides_count,
            'message': (
                f'Created "{new_name}" branching from "{parent_name}" '
                f'with {overrides_count} inherited override{"s" if overrides_count != 1 else ""}.'
            ),
        }

    except Exception as e:
        logger.error(f"scenario_branch error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool('scenario_apply_cross_project')
def handle_scenario_apply_cross_project(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Apply rate/percentage overrides from a scenario to another project.

    Only transferable fields (rates, percentages, ratios) are applied.
    Absolute values (prices, costs, dollar amounts) are skipped because
    they are project-specific.
    """
    scenario_log_id = tool_input.get('scenario_log_id')
    target_project_id = tool_input.get('target_project_id')

    if not scenario_log_id:
        return {'success': False, 'error': 'scenario_log_id is required'}
    if not target_project_id:
        return {'success': False, 'error': 'target_project_id is required'}
    if int(target_project_id) == int(project_id):
        return {'success': False, 'error': 'Target project must be different from source project'}

    try:
        from .scenario_tools import _load_scenario_by_id
        scenario = _load_scenario_by_id(scenario_log_id, project_id)
        if not scenario:
            return {'success': False, 'error': f'Scenario {scenario_log_id} not found.'}

        overrides = scenario['scenario_data'].get('overrides', {})
        if not overrides:
            return {
                'success': True,
                'message': 'Scenario has no overrides to transfer.',
                'transferred': 0,
                'skipped': 0,
            }

        # Filter to transferable fields only
        transferred = []
        skipped = []

        for key, ov_data in overrides.items():
            field = ov_data.get('field', '')
            if _is_transferable(field):
                transferred.append({
                    'field': field,
                    'label': ov_data.get('label', field),
                    'value': ov_data.get('override_value'),
                    'unit': ov_data.get('unit', ''),
                    'table': ov_data.get('table', ''),
                })
            else:
                skipped.append({
                    'field': field,
                    'label': ov_data.get('label', field),
                    'reason': 'Absolute value — not transferable across projects',
                })

        if not transferred:
            return {
                'success': True,
                'message': 'No transferable fields (all overrides are absolute values).',
                'transferred': 0,
                'skipped': len(skipped),
                'skipped_fields': skipped,
            }

        # Create a new shadow on the target project with the transferable overrides
        target_engine = WhatIfEngine(int(target_project_id))
        target_shadow = target_engine.create_shadow(thread_id or 'cross_project')

        for item in transferred:
            target_shadow = target_engine.apply_override(
                target_shadow,
                field=item['field'],
                table=item['table'],
                new_value=item['value'],
                label=item['label'],
                unit=item['unit'],
            )

        # Compute metrics on target
        results = target_engine.compute_shadow_metrics(target_shadow)

        # Save as a new scenario on the target project
        now = timezone.now()
        scenario_name = f"From: {scenario.get('scenario_name', f'Scenario {scenario_log_id}')} (Project {project_id})"
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.tbl_scenario_log
                    (project_id, scenario_name, description, status,
                     scenario_data, source, parent_scenario_id,
                     created_at, updated_at)
                VALUES (%s, %s, %s, 'saved', %s::jsonb, 'landscaper_chat', %s, %s, %s)
                RETURNING scenario_log_id
            """, [
                int(target_project_id),
                scenario_name,
                f'Cross-project application from project {project_id}',
                json.dumps(target_shadow.to_scenario_data()),
                scenario_log_id,
                now, now,
            ])
            new_id = cursor.fetchone()[0]

        return {
            'success': True,
            'target_project_id': int(target_project_id),
            'scenario_log_id': new_id,
            'transferred_count': len(transferred),
            'transferred_fields': transferred,
            'skipped_count': len(skipped),
            'skipped_fields': skipped,
            'target_metrics': results,
            'message': (
                f'Applied {len(transferred)} rate/percentage override{"s" if len(transferred) != 1 else ""} '
                f'to project {target_project_id}. '
                f'{len(skipped)} absolute value{"s" if len(skipped) != 1 else ""} skipped.'
            ),
        }

    except Exception as e:
        logger.error(f"scenario_apply_cross_project error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


def _is_transferable(field: str) -> bool:
    """Check if a field is transferable across projects (rate/percentage only)."""
    if field in TRANSFERABLE_FIELDS:
        return True
    field_lower = field.lower()
    return any(field_lower.endswith(suffix) for suffix in TRANSFERABLE_FIELD_SUFFIXES)
