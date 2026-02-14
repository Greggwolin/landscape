"""
Investment Committee tools for Landscaper AI.

Phase 7 of What-If Engine: Investment Committee Page.

Tools:
  1. ic_start_session    - Initiate devil's advocate mode (scan + rank challenges)
  2. ic_challenge_next   - Get next assumption challenge in the IC session
"""

import logging
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
