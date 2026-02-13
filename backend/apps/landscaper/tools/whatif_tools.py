"""
What-If computation tools for Landscaper.

These tools let users explore assumption changes without writing to the database.
They register via @register_tool and are dispatched by tool_executor.py.

Tools:
- whatif_compute: Run a what-if with a single assumption override
- whatif_compound: Add another override to the current shadow (Phase 2)
- whatif_reset: Reset shadow to baseline (Phase 2)
- whatif_attribute: Decompose per-assumption impact (Phase 2)
- whatif_status: Return current shadow state (Phase 2)
"""
import logging
from typing import Any, Dict, Optional

from ..tool_executor import register_tool
from ..services.whatif_engine import WhatIfEngine, ShadowContext
from ..services import whatif_storage

logger = logging.getLogger(__name__)


@register_tool('whatif_compute')
def handle_whatif_compute(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Run a what-if computation with a single assumption override.

    This is the primary entry point for "what if X?" questions.
    Creates or loads a shadow context, applies the override,
    computes metrics, and returns results WITHOUT writing to the DB.
    """
    field = tool_input.get('field', '')
    table = tool_input.get('table', '')
    new_value = tool_input.get('new_value')
    label = tool_input.get('label', '')
    unit = tool_input.get('unit', '')
    record_id = tool_input.get('record_id')

    if not field:
        return {'success': False, 'error': 'field is required'}
    if new_value is None:
        return {'success': False, 'error': 'new_value is required'}
    if not thread_id:
        return {'success': False, 'error': 'thread_id not available — what-if requires a threaded chat session'}

    try:
        engine = WhatIfEngine(project_id)

        # Load or create shadow context
        existing = whatif_storage.load_shadow_from_db(thread_id)
        if existing:
            shadow = ShadowContext.from_scenario_data(existing)
        else:
            # First what-if in this thread — auto-baseline
            shadow = engine.create_shadow(thread_id)

        # Apply the override
        shadow = engine.apply_override(
            shadow,
            field=field,
            table=table,
            new_value=new_value,
            label=label,
            unit=unit,
            record_id=record_id,
        )

        # Compute metrics with override applied
        results = engine.compute_shadow_metrics(shadow)

        # Persist shadow to DB
        scenario_log_id = whatif_storage.save_shadow_to_db(
            thread_id=thread_id,
            project_id=project_id,
            scenario_data=shadow.to_scenario_data(),
        )
        shadow.scenario_log_id = scenario_log_id

        return {
            'success': True,
            'mode': 'whatif',
            **results,
        }

    except Exception as e:
        logger.error(f"whatif_compute error: {e}", exc_info=True)
        return {
            'success': False,
            'error': f"What-if computation failed: {str(e)}",
        }


@register_tool('whatif_compound')
def handle_whatif_compound(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Add another assumption override to the current shadow context.

    Identical to whatif_compute but named distinctly for Claude's intent routing.
    Stacks on top of existing overrides (compounding behavior).
    """
    # Delegate to whatif_compute — same logic, different name for prompt routing
    return handle_whatif_compute(
        tool_input=tool_input,
        project_id=project_id,
        thread_id=thread_id,
        **kwargs,
    )


@register_tool('whatif_reset')
def handle_whatif_reset(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Reset the shadow context — remove all or specific overrides.

    If 'field' is provided, removes only that override.
    If no field, removes all overrides (back to baseline).
    """
    if not thread_id:
        return {'success': False, 'error': 'thread_id not available'}

    field = tool_input.get('field')

    try:
        existing = whatif_storage.load_shadow_from_db(thread_id)
        if not existing:
            return {
                'success': True,
                'message': 'No active what-if session to reset.',
                'overrides_active': 0,
            }

        engine = WhatIfEngine(project_id)
        shadow = ShadowContext.from_scenario_data(existing)

        if field:
            # Remove single override
            table = tool_input.get('table', '')
            record_id = tool_input.get('record_id')
            shadow = engine.remove_override(shadow, field, table, record_id)
            message = f"Removed override for {field}."
        else:
            # Clear all
            shadow = engine.clear_all_overrides(shadow)
            message = "Reset to baseline — all overrides cleared."

        # Recompute if overrides remain
        if shadow.overrides:
            results = engine.compute_shadow_metrics(shadow)
        else:
            results = {
                'baseline': shadow.baseline_snapshot.get('metrics', {}),
                'computed': shadow.baseline_snapshot.get('metrics', {}),
                'delta': {},
                'overrides_active': 0,
                'overrides_summary': [],
            }

        # If no overrides remain, mark as explored
        if not shadow.overrides:
            whatif_storage.clear_shadow(thread_id, 'explored')
        else:
            whatif_storage.save_shadow_to_db(
                thread_id=thread_id,
                project_id=project_id,
                scenario_data=shadow.to_scenario_data(),
            )

        return {
            'success': True,
            'message': message,
            **results,
        }

    except Exception as e:
        logger.error(f"whatif_reset error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool('whatif_attribute')
def handle_whatif_attribute(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Decompose the compound what-if impact into per-assumption contributions.

    Returns marginal delta for each override plus interaction residual.
    """
    if not thread_id:
        return {'success': False, 'error': 'thread_id not available'}

    try:
        existing = whatif_storage.load_shadow_from_db(thread_id)
        if not existing:
            return {
                'success': False,
                'error': 'No active what-if session. Run whatif_compute first.',
            }

        engine = WhatIfEngine(project_id)
        shadow = ShadowContext.from_scenario_data(existing)

        if len(shadow.overrides) < 2:
            return {
                'success': True,
                'message': 'Attribution requires at least 2 overrides. Only 1 active.',
                'attributions': [],
            }

        attribution_result = engine.compute_attribution(shadow)

        return {
            'success': True,
            'mode': 'attribution',
            **attribution_result,
        }

    except Exception as e:
        logger.error(f"whatif_attribute error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool('whatif_status')
def handle_whatif_status(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Return the current shadow state — active overrides and computed results.

    Useful for Claude to check state before suggesting actions.
    """
    if not thread_id:
        return {
            'success': True,
            'has_active_shadow': False,
            'message': 'No thread context available.',
        }

    try:
        existing = whatif_storage.load_shadow_from_db(thread_id)
        if not existing:
            return {
                'success': True,
                'has_active_shadow': False,
                'message': 'No active what-if session.',
            }

        shadow = ShadowContext.from_scenario_data(existing)

        return {
            'success': True,
            'has_active_shadow': True,
            'overrides_active': len(shadow.overrides),
            'overrides_summary': [
                {
                    'field': o.field,
                    'label': o.label,
                    'from': o.original_value,
                    'to': o.override_value,
                    'unit': o.unit,
                }
                for o in shadow.overrides.values()
            ],
            'baseline_metrics': shadow.baseline_snapshot.get('metrics', {}),
            'computed_metrics': shadow.computed_results.get('metrics', {}),
            'delta': shadow.computed_results.get('delta', {}),
        }

    except Exception as e:
        logger.error(f"whatif_status error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}
