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
    thread_id: Any = None,
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

        # LF-USERDASH-0514: register the brief as a unified artifact so it
        # gets an inline chat card and shows up in the Recent Artifacts
        # panel — matching how get_project_profile and the other already-
        # wrapped tools work. The dedicated LocationBriefArtifact renderer
        # continues to drive the live display via action='show_location_brief';
        # the artifact record is purely registry / discoverability.
        if result.get('success') and isinstance(result.get('location_brief_config'), dict):
            try:
                from apps.artifacts.services import create_artifact_record

                config = result['location_brief_config']
                location_display = (config.get('location_display') or location).strip()
                brief_title = (config.get('title') or '').strip() or f"{location_display} — Location Brief"
                summary_text = (config.get('summary') or '').strip() or f"Location brief for {location_display}."

                # Minimum valid schema. Rich rendering still goes through
                # the legacy LocationBriefArtifact renderer; this stub is
                # what the generic ArtifactRenderer will show if/when the
                # click-through path lands on it.
                schema = {
                    'blocks': [
                        {
                            'id': 'location_brief_summary',
                            'type': 'section',
                            'title': location_display,
                            'children': [
                                {
                                    'id': 'summary_text',
                                    'type': 'text',
                                    'content': summary_text,
                                }
                            ],
                        }
                    ],
                }

                # Dedup on (user, location, depth) so re-running the same
                # brief updates the same row rather than littering the panel.
                dedup_key = f"{location_display.lower()}|{depth}"

                artifact_envelope = create_artifact_record(
                    title=brief_title,
                    schema=schema,
                    project_id=project_id if project_id else None,
                    thread_id=thread_id,
                    user_id=user_id,
                    tool_name='generate_location_brief',
                    params_json={
                        'inputs': {
                            'location': location,
                            'property_type': property_type,
                            'depth': depth,
                        },
                        # Stash the full config so a future click-through
                        # path can re-hydrate the rich brief view from the
                        # artifact record alone, without re-fetching FRED/Census.
                        'location_brief_config': config,
                    },
                    dedup_key=dedup_key,
                )

                if artifact_envelope.get('success') and 'artifact_id' in artifact_envelope:
                    # Merge artifact_id AND title into the returned envelope
                    # so extractArtifactCards on the frontend picks both up.
                    # Without title, the chat card falls back to
                    # "Artifact #<id>" — confusing for the user.
                    # Keep action='show_location_brief' so the dedicated
                    # renderer drives the live display.
                    result = {
                        **result,
                        'artifact_id': artifact_envelope['artifact_id'],
                        'title': brief_title,
                    }
            except Exception as inner:
                # Artifact registration is best-effort. If it fails the
                # brief still displays via the legacy path — don't block
                # the user on a registry-side issue.
                logger.warning(
                    f"generate_location_brief_tool: artifact registration failed (non-fatal): {inner}",
                    exc_info=True,
                )

        return result
    except Exception as e:
        logger.exception(f"generate_location_brief_tool failed: {e}")
        return {
            'success': False,
            'error': f"Location brief generation failed: {str(e)}",
        }
