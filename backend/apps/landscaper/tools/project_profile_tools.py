"""
Project profile artifact tool.

Renders a project's profile metadata (name, location, type, key dimensions,
analysis framing, asking price) as a generative artifact in the right-side
panel. Mirrors the field set in `ProjectProfileTile` and the existing
`ProjectProfileEditModal` — the "show me the project details" read-only
companion to the existing "open the project details form" modal handoff.

Pattern: tool wraps `create_artifact_record` internally so a single tool
call from the model produces a fully rendered artifact (no follow-up
`create_artifact` call needed). Returns the standard `show_artifact`
envelope the chat panel's tool-result handler picks up.

Companion modal: when the user wants to EDIT the profile, Landscaper
should call `open_input_modal` with `modal_name='project_details'` (which
flows through the command bus to the existing `ProjectProfileEditModal`).
The artifact is the read-only companion to that modal — same data, just
rendered into the right panel for at-a-glance reference.
"""

import logging
from decimal import Decimal
from typing import Any, Dict, List

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


# ─── Field-rendering helpers ────────────────────────────────────────────────


def _fmt_currency(value: Any) -> str:
    """Format a Decimal/float/int as USD with no decimals. Empty string when null."""
    if value is None:
        return ''
    try:
        n = float(value)
    except (TypeError, ValueError):
        return ''
    return f'${n:,.0f}'


def _fmt_int(value: Any) -> str:
    if value is None:
        return ''
    try:
        return f'{int(value):,}'
    except (TypeError, ValueError):
        return ''


def _fmt_acres(value: Any) -> str:
    if value is None:
        return ''
    try:
        return f'{float(value):,.2f}'
    except (TypeError, ValueError):
        return ''


def _fmt_date(value: Any) -> str:
    if value is None:
        return ''
    try:
        return value.strftime('%m/%d/%Y')
    except AttributeError:
        return str(value)


def _fmt_label(value: Any, label_map: Dict[str, str] | None = None) -> str:
    """Stringify and optionally map enum-style codes to display labels."""
    if value is None:
        return ''
    s = str(value)
    if label_map and s in label_map:
        return label_map[s]
    return s


# ─── Display-label maps (mirror what ProjectProfileTile uses) ───────────────

_PERSPECTIVE_LABELS = {
    'INVESTMENT': 'Investment',
    'DEVELOPMENT': 'Development',
}
_PURPOSE_LABELS = {
    'VALUATION': 'Valuation',
    'UNDERWRITING': 'Underwriting',
}
_PROPERTY_TYPE_LABELS = {
    'LAND': 'Land Development',
    'MF': 'Multifamily',
    'OFF': 'Office',
    'RET': 'Retail',
    'IND': 'Industrial',
    'HTL': 'Hotel',
    'MXU': 'Mixed Use',
}


def _build_address_value(project) -> str:
    """Two-line address rendering: street \\n city, state zip."""
    street = (project.project_address or '').strip()
    city = (project.jurisdiction_city or '').strip()
    state = (project.jurisdiction_state or '').strip()
    # Project model has no zip field at the project level; the modal pulls
    # it from a nested location. For the artifact, render what we have.
    parts = [p for p in (city, state) if p]
    line2 = ', '.join([p for p in [city] if p]) + (' ' + state if state else '')
    line2 = line2.strip()
    if street and line2:
        return f'{street}\n{line2}'
    return street or line2 or ''


def _build_profile_pairs(project) -> List[Dict[str, str]]:
    """Construct the kv_grid pair list mirroring the ProjectProfileTile order."""
    name_value = (project.project_name or '').strip()
    address_value = _build_address_value(project)

    units_value = _fmt_int(project.target_units)
    acres_value = _fmt_acres(project.acres_gross)

    county_value = (project.jurisdiction_county or project.county or '').strip()
    # The project model does not store MSA directly on the project row in
    # the canonical schema; it's derived from city+state via geo_xwalk on
    # the read endpoint. Pull whatever is on the model if present.
    msa_value = getattr(project, 'jurisdiction_msa', None) or ''

    apn_value = (getattr(project, 'apn', None) or '').strip() if hasattr(project, 'apn') else ''
    ownership_value = _fmt_label(project.ownership_type)

    type_value = _fmt_label(
        project.project_type_code or project.project_type,
        _PROPERTY_TYPE_LABELS,
    )
    subtype_value = (project.property_subtype or '').strip()

    perspective_value = _fmt_label(project.analysis_perspective, _PERSPECTIVE_LABELS)
    purpose_value = _fmt_label(project.analysis_purpose, _PURPOSE_LABELS)

    asking_value = _fmt_currency(project.asking_price)
    analysis_start_value = _fmt_date(project.analysis_start_date)

    pairs: List[Dict[str, str]] = []

    def add(label: str, value: str) -> None:
        # Preserve empty values as em-dash so the artifact renders evenly.
        pairs.append({'label': label, 'value': value if value else '—'})

    add('Project Name', name_value)
    add('Address', address_value)
    add('Total Units', units_value)
    add('Gross Acres', acres_value)
    add('County', county_value)
    add('Market (MSA)', msa_value)
    add('APN', apn_value)
    add('Ownership', ownership_value)
    add('Property Type', type_value)
    add('Subtype', subtype_value)
    add('Perspective', perspective_value)
    add('Purpose', purpose_value)
    add('Asking Price', asking_value)
    add('Analysis Start Date', analysis_start_value)

    return pairs


# ─── Tool entry point ───────────────────────────────────────────────────────


@register_tool('get_project_profile')
def get_project_profile_tool(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,
    user_id: Any = None,
    thread_id: Any = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Render the project's profile metadata as a generative artifact.

    Pulls name, location, type, dimensions, analysis framing, and asking
    price from `tbl_project` and emits a kv_grid block document into the
    artifact panel. Read-only companion to the `project_details` modal —
    use this when the user wants to SEE the profile, use
    `open_input_modal('project_details')` when they want to EDIT it.

    Args:
        project_id: required — the project to profile.
        user_id: optional — captured on the artifact row.
        thread_id: optional — scopes the artifact to a chat thread.

    Returns:
        Standard `show_artifact` envelope on success:
            { success: True, action: 'show_artifact', artifact_id, schema, ... }
        Or a structured error envelope on failure.
    """
    from apps.artifacts.services import create_artifact_record
    from apps.projects.models import Project

    tool_input = tool_input or kwargs.get('tool_input', {})

    if not project_id:
        return {
            'success': False,
            'error': (
                'project_id is required. This tool only fires on '
                'project-scoped routes — for unassigned chat, the user '
                'should pick or create a project first.'
            ),
        }

    try:
        project = Project.objects.get(pk=int(project_id))
    except Project.DoesNotExist:
        return {
            'success': False,
            'error': f'Project {project_id} not found.',
        }
    except (TypeError, ValueError):
        return {
            'success': False,
            'error': f'project_id must be an integer; got {project_id!r}.',
        }

    try:
        pairs = _build_profile_pairs(project)
    except Exception as exc:
        logger.exception(f'get_project_profile failed building pairs: {exc}')
        return {
            'success': False,
            'error': f'Failed to build profile pairs: {exc}',
        }

    title = f'{project.project_name or f"Project {project_id}"} — Profile'
    schema = {
        'blocks': [
            {
                'id': 'project_profile_grid',
                'type': 'key_value_grid',
                'pairs': pairs,
                'columns': 2,
            },
        ],
    }

    try:
        return create_artifact_record(
            title=title,
            schema=schema,
            project_id=int(project_id),
            thread_id=thread_id,
            user_id=user_id,
            tool_name='get_project_profile',
            params_json={'project_id': int(project_id)},
        )
    except Exception as exc:
        logger.exception(f'get_project_profile failed creating artifact: {exc}')
        return {
            'success': False,
            'error': f'Failed to create artifact: {exc}',
        }
