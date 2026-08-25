"""The Parcels workspace as a durable artifact.

Built from ``_cowork/PARCELS-SPEC-2026-08-25.html`` rev 2.

HISTORY, BECAUSE IT EXPLAINS THE SHAPE
--------------------------------------
The first version of this module hosted the existing parcels screen inside an
artifact frame. Gregg saw it running: *"this is just the existing modal, poorly
formatted, within an artifact."* The instruction had been *"just as we did with
the budget interface"* — the budget's FORMAT. So the record no longer carries a
project id and a label for a mounted screen; it carries a real view
specification, built by ``parcels_view_spec``.

WHAT SURVIVED THAT REVERSAL, AND WHY IT IS STILL HERE
------------------------------------------------------
The record itself. One canonical Parcels artifact per project, reopened from the
list in one click, is what the overlay could never be — the overlay holds one
value, forgets it on close, and has nowhere to reopen from. That part was right
and is unchanged; only the payload changed.

THE SCHEMA BLOCK IS A PLACEHOLDER, DELIBERATELY
------------------------------------------------
The block grammar describes COMPOSED content. This artifact's content is a view
specification rendered by a component, exactly as the budget schedule and the map
are, so the schema holds one text block purely to satisfy
``validate_block_document`` and the real payload rides in ``params_json``. The
precedent is ``map_tools.generate_map_artifact``.

NAMING
------
The artifact is **Parcels**. Not "Land Plan": a land plan is the GRAPHIC — the
plat, the site plan — and the parcel table is the tabular expression of the same
subject (Gregg, 2026-08-25). Calling the table a land plan confuses two real,
separate things.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# One canonical Parcels workspace per project. Re-asking refreshes that row
# rather than stacking copies.
#
# The refresh shallow-merges params_json with the tool's values winning on every
# key it sends. So the specification below is authoritative on every open — which
# is what makes a village added from inside the table show up in the chips — and
# anything a user's own view state ever needs to survive must be written BESIDE
# this key, never nested inside it. Nested, it is replaced wholesale on the next
# ask; that is the class of silent loss the budget artifact hit.
PARCELS_DEDUP_KEY = 'parcels'

# The panel reads this key off params_json to decide it is looking at a Parcels
# workspace. Namespaced the way map_config / budget_view_config /
# clarification_config are.
PARCELS_CONFIG_KEY = 'parcels_view_config'


def build_parcels_config(project_id: int) -> Dict[str, Any]:
    """The view specification the panel renders from.

    Thin by design in the first version — it carried a project id and a label,
    and the renderer mounted the existing screen. That was the wrong shape and
    Gregg said so. It now carries a real specification: rows, the chip members,
    the columns at each detail rung, and what to group by. See
    ``parcels_view_spec`` for the reasoning behind each part.

    Built fresh on every open, which is what makes a village or phase added from
    inside the table appear in the chips at once.
    """
    from .parcels_view_spec import (
        build_parcels_view_config,
        fetch_level_labels,
        fetch_levels,
        fetch_parcel_records,
    )

    labels = fetch_level_labels(project_id)
    header = fetch_project_header(project_id)
    return build_parcels_view_config(
        project_id=project_id,
        project_name=header.get('project_name'),
        records=fetch_parcel_records(project_id),
        levels=fetch_levels(project_id, labels),
        labels=labels,
    )


def fetch_project_header(project_id: int) -> Dict[str, Any]:
    """Project name and level labels, for the artifact's title."""
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute(
            'SELECT project_name, project_type_code '
            'FROM landscape.tbl_project WHERE project_id = %s',
            [project_id],
        )
        row = cursor.fetchone()
        project_name = row[0] if row else None
        project_type = row[1] if row else None

        cursor.execute(
            """
            SELECT tier_1_label, tier_2_label, tier_3_label
            FROM landscape.tbl_project_config WHERE project_id = %s
            """,
            [project_id],
        )
        cfg = cursor.fetchone()

    labels = {
        'level1': (cfg[0] if cfg and cfg[0] else 'Area'),
        'level2': (cfg[1] if cfg and cfg[1] else 'Phase'),
        'level3': (cfg[2] if cfg and cfg[2] else 'Parcel'),
    }
    return {
        'project_name': project_name,
        'project_type': project_type,
        'level_labels': labels,
    }


def parcel_count(project_id: int) -> int:
    """How many parcels the project has — for the relay sentence only.

    The screen does not need this; the model does, so it can say something true
    in one line instead of describing a table it has not seen.
    """
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute(
            'SELECT COUNT(*) FROM landscape.tbl_parcel WHERE project_id = %s',
            [project_id],
        )
        row = cursor.fetchone()
    return int(row[0]) if row else 0


def create_parcels_artifact(
    *,
    project_id: int,
    user_id: Any = None,
    thread_id: Any = None,
) -> Dict[str, Any]:
    """Build + register the Parcels workspace artifact.

    Returns the artifact service envelope, or ``{'success': False, 'error': ...}``.

    The schema is a single text block and that is deliberate, not a shortcut:
    the block grammar exists to describe COMPOSED content, and this artifact's
    content is a live component. Forcing the parcels through it is what the
    reverted land-plan build did. The block exists only because
    ``validate_block_document`` requires one, and it says plainly what it is so
    a future reader does not mistake it for the payload.
    """
    try:
        from apps.artifacts.services import create_artifact_record
    except Exception as exc:  # noqa: BLE001
        logger.exception('parcels_artifact_builder: artifact service unavailable')
        return {'success': False, 'error': f'artifact service unavailable: {exc}'}

    header = fetch_project_header(project_id)
    project_name = header['project_name']
    labels = header['level_labels']

    # "Parcels" is what the screen is called and what Gregg calls it. The level-3
    # label is used only when the project has renamed it to something else —
    # a project whose parcels are "Pads" should say Pads.
    noun = labels.get('level3') or 'Parcel'
    plural = noun if noun.endswith('s') else f'{noun}s'
    title = f'{project_name} — {plural}' if project_name else plural

    config = build_parcels_config(project_id)

    try:
        return create_artifact_record(
            title=title,
            schema={'blocks': [{
                'type': 'text',
                'id': 'parcels_note',
                'content': (
                    'The parcels table — rendered in the panel from a view '
                    'specification. This block is a placeholder; the real '
                    'payload is in params_json.'
                ),
            }]},
            project_id=project_id,
            user_id=user_id,
            thread_id=thread_id,
            tool_name='open_parcels',
            params_json={'kind': 'parcels', PARCELS_CONFIG_KEY: config},
            dedup_key=PARCELS_DEDUP_KEY,
            prior_tool_calls=['open_parcels'],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('parcels_artifact_builder: create_artifact_record failed')
        return {'success': False, 'error': str(exc)}
