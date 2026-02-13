"""
What-If Commit and Undo tools for Landscaper.

These tools promote shadow overrides to actual DB values (commit)
or restore original values (undo). All are registered via @register_tool
and dispatched by tool_executor.py.

Tools:
- whatif_commit: Commit ALL active overrides to database
- whatif_commit_selective: Commit specific overrides, keep others in shadow
- whatif_undo: Undo a previously committed scenario (restore originals)
"""
import logging
from typing import Any, Dict, Optional

from ..tool_executor import register_tool
from ..services import whatif_storage
from ..services.whatif_engine import ShadowContext
from ..services.whatif_commit_service import commit_overrides, undo_commit

logger = logging.getLogger(__name__)


@register_tool('whatif_commit', is_mutation=True)
def handle_whatif_commit(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Commit ALL active what-if overrides to the database.

    Writes every override in the current shadow to the actual DB tables.
    The entire operation is atomic — all succeed or all roll back.
    """
    if not thread_id:
        return {'success': False, 'error': 'thread_id not available'}

    try:
        # Load active shadow
        shadow_data = whatif_storage.load_shadow_from_db(thread_id)
        if not shadow_data:
            return {
                'success': False,
                'error': 'No active what-if session. Nothing to commit.',
            }

        shadow = ShadowContext.from_scenario_data(shadow_data)
        if not shadow.overrides:
            return {
                'success': False,
                'error': 'Shadow has no overrides to commit.',
            }

        result = commit_overrides(shadow, fields=None, user_id=None)
        return result

    except Exception as e:
        logger.error(f"whatif_commit error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool('whatif_commit_selective', is_mutation=True)
def handle_whatif_commit_selective(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Commit specific overrides to the database, keeping others in shadow.

    The 'fields' parameter is a list of override keys (field names or
    override keys from the shadow) to commit. Non-specified overrides
    remain in the active shadow for further exploration.
    """
    fields = tool_input.get('fields', [])
    if not fields:
        return {'success': False, 'error': 'fields parameter is required (list of override keys to commit)'}
    if not thread_id:
        return {'success': False, 'error': 'thread_id not available'}

    try:
        shadow_data = whatif_storage.load_shadow_from_db(thread_id)
        if not shadow_data:
            return {
                'success': False,
                'error': 'No active what-if session. Nothing to commit.',
            }

        shadow = ShadowContext.from_scenario_data(shadow_data)
        if not shadow.overrides:
            return {
                'success': False,
                'error': 'Shadow has no overrides to commit.',
            }

        result = commit_overrides(shadow, fields=fields, user_id=None)
        return result

    except Exception as e:
        logger.error(f"whatif_commit_selective error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool('whatif_undo')
def handle_whatif_undo(
    tool_input: Dict[str, Any],
    project_id: int,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Undo a previously committed scenario by restoring original values.

    Requires scenario_log_id of a committed scenario. Before restoring,
    verifies each field's current DB value matches the committed value.
    If a field was changed manually since the commit, it's blocked.
    """
    scenario_log_id = tool_input.get('scenario_log_id')
    if not scenario_log_id:
        return {'success': False, 'error': 'scenario_log_id is required'}

    try:
        result = undo_commit(scenario_log_id, project_id, user_id=None)
        return result

    except Exception as e:
        logger.error(f"whatif_undo error: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}
