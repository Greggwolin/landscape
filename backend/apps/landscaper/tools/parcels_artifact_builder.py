"""The Parcels workspace as a durable artifact.

Gregg, 2026-08-25, after finding the screen opened as an overlay he could not
get back to: *"the functionality of this modal is what needs to be converted
into an artifact(s)."*

WHAT THIS IS, AND WHAT IT IS NOT
--------------------------------
It is NOT a rendering of the parcels. It is an artifact RECORD whose renderer is
the real, editable Parcels screen — the same component the overlay hosts. The
screen does not change; its container does.

That distinction is the whole point. The overlay holds one value, forgets it on
close, and has no list, so there is nothing to hang a reopen on — which is
exactly what Gregg hit. An artifact is a saved row with a version log, a place
in Pinned and Recent, and one-click reopen without leaving the conversation.

THE PRECEDENT THIS COPIES
-------------------------
``map_tools.generate_map_artifact``. A live MapLibre instance — stateful,
imperative, writing back to the project — lives happily in an artifact record.
It does it by storing a minimal valid text block as the schema purely to satisfy
the document validator, and putting the real payload in ``params_json`` under a
namespaced key that the panel dispatches on. Same shape here.

The alternative — expressing 43 parcels as a block document — is what the
reverted land-plan build did, and it produced something strictly less capable
than the screen Gregg already owned.

NAMING
------
The artifact is **Parcels**. Not "Land Plan": a land plan is the GRAPHIC — the
plat, the site plan — and the parcel table is the tabular expression of the same
subject. Two different but related things (Gregg, 2026-08-25). Calling the table
a land plan confuses them, and the graphic is a real separate surface with its
own extraction pipeline.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# One canonical Parcels workspace per project. Re-asking refreshes that row
# rather than stacking copies.
#
# The refresh shallow-merges params_json with the tool's values winning on every
# key it sends — so anything this builder writes is authoritative and anything
# NESTED inside it is replaced wholesale on the next ask. That is why the panel
# stores the user's view under its own top-level key beside `parcels_config`
# rather than inside it: a view saved inside the config would be discarded the
# next time somebody said "show me the parcels", which is precisely the class of
# loss the budget artifact hit.
PARCELS_DEDUP_KEY = 'parcels'

# The panel reads this key off params_json to decide it is looking at a Parcels
# workspace. Namespaced the way map_config / budget_view_config /
# clarification_config are.
PARCELS_CONFIG_KEY = 'parcels_config'


def build_parcels_config(
    project_id: int,
    *,
    project_name: Optional[str] = None,
    level_labels: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """The payload the panel needs to mount the screen.

    Deliberately thin. The screen fetches its own parcels, containers and
    taxonomy — it always has — so duplicating any of that here would create a
    second copy of the truth that goes stale the moment anything is edited. The
    record carries only what the panel cannot work out for itself: which project,
    and what to call it.

    The user's view — which filters are applied, which sections are open — is
    NOT part of this config. The panel writes it as its own sibling key
    (``parcels_view_state``) so it survives a re-ask; see the note on
    ``PARCELS_DEDUP_KEY`` above. That is Gregg's decision 2a: those survive a
    close, and nothing else does. An in-progress row edit is NOT carried,
    because a half-typed change that reappears later without having been agreed
    to is worse than losing it.
    """
    config: Dict[str, Any] = {
        'project_id': int(project_id),
        'surface': 'parcels',
    }
    if project_name:
        config['project_name'] = project_name
    if level_labels:
        # Carried for the artifact TITLE only. The screen reads the project's
        # configuration itself; this is so the panel can label the card without
        # a second round-trip.
        config['level_labels'] = level_labels
    return config


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

    config = build_parcels_config(
        project_id,
        project_name=project_name,
        level_labels=labels,
    )

    try:
        return create_artifact_record(
            title=title,
            schema={'blocks': [{
                'type': 'text',
                'id': 'parcels_note',
                'content': (
                    'The parcels workspace — opens as the live, editable screen '
                    'in the panel. This block is a placeholder; the workspace is '
                    'not composed content.'
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
