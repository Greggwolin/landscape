"""
Investment Committee tools for Landscaper AI.

Phase 7 of What-If Engine: Investment Committee Page.

Tools:
  1. ic_start_session      - Initiate devil's advocate mode (scan + rank challenges)
  2. ic_challenge_next     - Get next assumption challenge in the IC session
  3. ic_respond_challenge  - Record user's response to an IC challenge
  4. sensitivity_grid      - Generate multi-point sensitivity matrix
"""

import logging
from typing import Any, Dict, Optional

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


@register_tool('ic_start_session')
def ic_start_session(
    project_id: int = None,
    aggressiveness: int = 5,
    **kwargs
):
    """
    Start an Investment Committee devil's advocate session.

    Scans project assumptions against market benchmarks and ranks them
    by deviation. Returns an ordered list of challenges to present
    one at a time.

    Args:
        project_id: Project to analyze. If omitted, uses current project.
        aggressiveness: Slider value 1-10 (1=conservative, 10=aggressive).
    """
    project_context = kwargs.get('project_context', {})

    if not project_id:
        project_id = project_context.get('project_id')
    if not project_id:
        return {'success': False, 'error': 'project_id is required'}

    thread_id = project_context.get('thread_id')

    from ..services.ic_devil_advocate import start_ic_session
    result = start_ic_session(
        project_id=int(project_id),
        aggressiveness=int(aggressiveness),
        thread_id=thread_id,
    )

    logger.info(
        f"[IC_TOOLS] ic_start_session project={project_id} "
        f"aggressiveness={aggressiveness} "
        f"challenges={result.get('challenges_identified', 0)}"
    )
    return result


@register_tool('ic_challenge_next')
def ic_challenge_next(
    session_id: int = None,
    current_aggressiveness: int = None,
    **kwargs
):
    """
    Get the next assumption challenge in the IC session.

    Tracks which challenges have been presented and returns the next one.
    When all challenges are exhausted, returns completed=True.

    Args:
        session_id: IC session ID (from ic_start_session result).
        current_aggressiveness: Updated aggressiveness (optional, for recalibration).
    """
    if not session_id:
        return {'success': False, 'error': 'session_id is required'}

    from ..services.ic_devil_advocate import get_next_challenge
    result = get_next_challenge(
        session_id=int(session_id),
        current_aggressiveness=int(current_aggressiveness) if current_aggressiveness else None,
    )

    logger.info(
        f"[IC_TOOLS] ic_challenge_next session={session_id} "
        f"completed={result.get('completed', False)} "
        f"remaining={result.get('remaining', '?')}"
    )
    return result


@register_tool('ic_respond_challenge')
def handle_ic_respond_challenge(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Record the user's response to an IC challenge.

    After the user accepts, rejects, or modifies a challenged assumption,
    call this to track the response and update session progress.
    """
    # Handle both tool_input dict and direct kwargs patterns
    if tool_input:
        session_id = tool_input.get('session_id')
        challenge_index = tool_input.get('challenge_index')
        response = tool_input.get('response')
        user_value = tool_input.get('user_value')
        impact_deltas = tool_input.get('impact_deltas')
    else:
        session_id = kwargs.get('session_id')
        challenge_index = kwargs.get('challenge_index')
        response = kwargs.get('response')
        user_value = kwargs.get('user_value')
        impact_deltas = kwargs.get('impact_deltas')

    if not session_id:
        return {'success': False, 'error': 'session_id is required'}
    if not challenge_index:
        return {'success': False, 'error': 'challenge_index is required'}
    if not response:
        return {'success': False, 'error': 'response is required (accept/reject/modify)'}

    from ..services.ic_service import respond_to_challenge
    result = respond_to_challenge(
        session_id=int(session_id),
        challenge_index=int(challenge_index),
        response=response,
        user_value=float(user_value) if user_value is not None else None,
        whatif_deltas=impact_deltas,
    )

    logger.info(
        f"[IC_TOOLS] ic_respond_challenge session={session_id} "
        f"challenge={challenge_index} response={response} "
        f"success={result.get('success', False)}"
    )
    return result


@register_tool('sensitivity_grid')
def handle_sensitivity_grid(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,
    thread_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Generate a sensitivity matrix for an assumption.

    Tests the assumption at multiple values (e.g., -20% to +20%)
    and returns a grid showing the impact on key metrics at each level.
    """
    # Handle both tool_input dict and direct kwargs patterns
    if tool_input:
        assumption_key = tool_input.get('assumption_key', '')
        table = tool_input.get('table', '')
        field = tool_input.get('field', '')
        base_value = tool_input.get('base_value')
        steps = tool_input.get('steps')
        target_metrics = tool_input.get('target_metrics')
    else:
        assumption_key = kwargs.get('assumption_key', '')
        table = kwargs.get('table', '')
        field = kwargs.get('field', '')
        base_value = kwargs.get('base_value')
        steps = kwargs.get('steps')
        target_metrics = kwargs.get('target_metrics')

    if not field:
        return {'success': False, 'error': 'field is required'}
    if base_value is None:
        return {'success': False, 'error': 'base_value is required'}

    # Get project_id from context if not provided
    project_context = kwargs.get('project_context', {})
    if not project_id:
        project_id = project_context.get('project_id')
    if not project_id:
        return {'success': False, 'error': 'project_id is required'}

    from ..services.ic_service import generate_sensitivity_grid
    result = generate_sensitivity_grid(
        project_id=int(project_id),
        assumption_key=assumption_key,
        table=table,
        field=field,
        base_value=float(base_value),
        steps=[float(s) for s in steps] if steps else None,
        target_metrics=target_metrics,
        thread_id=thread_id,
    )

    logger.info(
        f"[IC_TOOLS] sensitivity_grid project={project_id} "
        f"assumption={assumption_key} "
        f"steps={result.get('steps_tested', 0)}"
    )
    return result
