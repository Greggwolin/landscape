"""
Location Brief tool for Landscaper.

Universal tool — fires pre-project from unassigned threads. Returns an
artifact config the frontend renders in the right-side artifacts panel.
"""

import logging
from typing import Any, Dict

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


@register_tool('generate_location_brief')
def generate_location_brief_tool(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,
    user_id: str = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Generate a property-type-aware economic brief for any US location.

    Pulls FRED + Census ACS 5-Year data, narrates via Anthropic with a
    depth-tiered prompt, caches per-user per-location per-depth, and
    returns an artifact config for the right-side panel renderer.

    Args:
        tool_input: {
            location: "City, ST" (required)
            property_type: "LAND" | "MF" | "OFF" | "RET" | "IND" | "HTL" | "MXU" (default "LAND")
            depth: "condensed" | "standard" | "comprehensive" (default "standard")
            force_refresh: bool (default false)
        }
        project_id: optional — universal tool, works pre-project
        user_id: optional — used for cache scoping

    Returns:
        {
            success: bool,
            action: "show_location_brief",
            location_brief_config: {...}
        }
    """
    tool_input = tool_input or kwargs.get('tool_input', {})

    location = (tool_input.get('location') or '').strip()
    if not location:
        return {
            'success': False,
            'error': (
                "Location is required. Provide 'City, ST' format "
                "(e.g., 'Phoenix, AZ')."
            ),
        }

    property_type = (tool_input.get('property_type') or 'LAND').upper()
    depth = (tool_input.get('depth') or 'standard').lower()
    if depth not in ('condensed', 'standard', 'comprehensive'):
        depth = 'standard'
    force_refresh = bool(tool_input.get('force_refresh', False))

    try:
        from apps.knowledge.services.location_brief import generate_location_brief

        result = generate_location_brief(
            location=location,
            property_type=property_type,
            depth=depth,
            user_id=user_id,
            force_refresh=force_refresh,
        )
        return result
    except Exception as e:
        logger.exception(f"generate_location_brief_tool failed: {e}")
        return {
            'success': False,
            'error': f"Location brief generation failed: {str(e)}",
        }
