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


def _fetch_profile_row(project_id: int) -> Dict[str, Any] | None:
    """Read the canonical profile row via raw SQL.

    Mirrors the field-resolution priority of
    `src/app/api/projects/[projectId]/profile/route.ts` so the artifact
    and the existing profile endpoint render the same data:

      - street_address (with project_address as legacy fallback)
      - city / jurisdiction_city
      - county / jurisdiction_county
      - state / jurisdiction_state
      - zip_code
      - msa_name via JOIN tbl_msa ON msa_id  ← this is why an ORM-only
        read of the project row showed MSA as empty: MSA lives on a
        separate table, not on tbl_project.
      - apn_primary  ← not `apn`
      - target_units / total_units (live count of multifamily_unit rows
        as final fallback for property types where units are tracked
        per-row)

    Returning a plain dict (not a Project model instance) so the
    pair-building code uses dict semantics consistently with what the
    canonical API would have surfaced.
    """
    from django.db import connection

    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT
                p.project_id,
                p.project_name,
                p.project_type,
                p.project_type_code,
                p.property_subtype,
                p.analysis_perspective,
                p.analysis_purpose,
                p.target_units,
                p.total_units,
                (
                    SELECT COUNT(*)::integer
                    FROM landscape.tbl_multifamily_unit u
                    WHERE u.project_id = p.project_id
                ) AS calculated_units,
                p.acres_gross AS gross_acres,
                p.asking_price,
                COALESCE(p.street_address, p.project_address) AS address,
                COALESCE(p.city, p.jurisdiction_city) AS city,
                COALESCE(p.county, p.jurisdiction_county) AS county,
                COALESCE(p.state, p.jurisdiction_state) AS state,
                p.zip_code,
                p.analysis_start_date,
                p.msa_id,
                m.msa_name,
                m.state_abbreviation AS msa_state,
                COALESCE(p.apn_primary, '') AS apn,
                p.ownership_type,
                p.market AS market_freetext
            FROM landscape.tbl_project p
            LEFT JOIN landscape.tbl_msa m ON p.msa_id = m.msa_id
            WHERE p.project_id = %s
            """,
            [project_id],
        )
        row = cur.fetchone()
        if not row:
            return None
        cols = [c[0] for c in cur.description]
        return dict(zip(cols, row))


def _build_address_value(profile: Dict[str, Any]) -> str:
    """Two-line address rendering: street \\n city, state zip.

    `address` from the SQL is COALESCE(street_address, project_address). When
    the legacy `project_address` is the fallback source it sometimes has the
    full address text already (street + city + state + zip embedded). We
    render line 1 verbatim and append line 2 (city, state zip) only when
    line 1 looks like a street-only string. Heuristic: line 1 is street-only
    if it does NOT contain the city already.
    """
    street = (profile.get('address') or '').strip()
    city = (profile.get('city') or '').strip()
    state = (profile.get('state') or '').strip()
    zip_code = (profile.get('zip_code') or '').strip()

    # Build line 2 from canonical city/state/zip
    line2_parts = []
    if city:
        line2_parts.append(city)
    line2 = ', '.join(line2_parts)
    if state:
        line2 = (line2 + (' ' if line2 else '') + state).strip()
    if zip_code:
        line2 = (line2 + (' ' if line2 else '') + zip_code).strip()

    # If the street string already contains the city (legacy free-text
    # project_address fallback), use it as-is to avoid duplication.
    if street and city and city.lower() in street.lower():
        return street

    if street and line2:
        return f'{street}\n{line2}'
    return street or line2 or ''


def _build_profile_pairs(profile: Dict[str, Any]) -> List[Dict[str, str]]:
    """Construct the kv_grid pair list mirroring the ProjectProfileTile order."""
    name_value = (profile.get('project_name') or '').strip()
    address_value = _build_address_value(profile)

    units_value = _fmt_int(
        profile.get('target_units')
        or profile.get('total_units')
        or profile.get('calculated_units')
    )
    acres_value = _fmt_acres(profile.get('gross_acres'))

    county_value = (profile.get('county') or '').strip()

    # MSA: prefer the JOINed msa_name. The msa_name column on tbl_msa
    # already encodes the canonical "Region, ST" suffix (e.g.,
    # "Los Angeles-Long Beach-Anaheim, CA"), so do NOT append msa_state
    # — that would produce "..., CA, CA". Mirrors formatMSADisplay() at
    # src/types/project-profile.ts:194 which uses msa_name verbatim.
    # Fall back to free-text `market` field if no MSA row is linked.
    msa_value = (profile.get('msa_name') or '').strip() \
        or (profile.get('market_freetext') or '').strip()

    apn_value = (profile.get('apn') or '').strip()
    ownership_value = _fmt_label(profile.get('ownership_type'))

    type_value = _fmt_label(
        profile.get('project_type_code') or profile.get('project_type'),
        _PROPERTY_TYPE_LABELS,
    )
    subtype_value = (profile.get('property_subtype') or '').strip()

    perspective_value = _fmt_label(profile.get('analysis_perspective'), _PERSPECTIVE_LABELS)
    purpose_value = _fmt_label(profile.get('analysis_purpose'), _PURPOSE_LABELS)

    asking_value = _fmt_currency(profile.get('asking_price'))
    analysis_start_value = _fmt_date(profile.get('analysis_start_date'))

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
        pid = int(project_id)
    except (TypeError, ValueError):
        return {
            'success': False,
            'error': f'project_id must be an integer; got {project_id!r}.',
        }

    profile = _fetch_profile_row(pid)
    if profile is None:
        return {
            'success': False,
            'error': f'Project {pid} not found.',
        }

    try:
        pairs = _build_profile_pairs(profile)
    except Exception as exc:
        logger.exception(f'get_project_profile failed building pairs: {exc}')
        return {
            'success': False,
            'error': f'Failed to build profile pairs: {exc}',
        }

    project_name = (profile.get('project_name') or '').strip() or f'Project {pid}'
    title = f'{project_name} — Profile'
    schema = {
        'blocks': [
            {
                'id': 'project_profile_grid',
                'type': 'key_value_grid',
                'pairs': pairs,
                'columns': 1,
            },
        ],
    }

    try:
        return create_artifact_record(
            title=title,
            schema=schema,
            project_id=pid,
            thread_id=thread_id,
            user_id=user_id,
            tool_name='get_project_profile',
            params_json={'project_id': pid},
        )
    except Exception as exc:
        logger.exception(f'get_project_profile failed creating artifact: {exc}')
        return {
            'success': False,
            'error': f'Failed to create artifact: {exc}',
        }
