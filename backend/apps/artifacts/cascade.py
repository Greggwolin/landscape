"""
Cascade hook helper for Finding #4 / Phase 4.

Provides a single entry point — `process_dependency_cascade` — that any
write endpoint can call after a successful save. The helper:

1. Reads the project's `artifact_cascade_mode` (defaulting to 'manual'
   if NULL/missing for fail-safe behavior).
2. Looks up dependent artifacts via `find_dependent_artifacts_records`.
3. Branches:
     - `'auto'`: invokes `update_artifact_record` for each dependent inside
       a single atomic block, with `edit_source='cascade'`. Returns a
       summary of cascaded artifacts.
     - `'manual'`: returns the dependent list as-is for the frontend to
       surface as a notification.
4. NEVER raises — failures are logged and a None result is returned, so
   the calling endpoint's primary save response is never blocked.

The auto-cascade implementation in this phase is intentionally
lightweight: it bumps `captured_at` on the affected source pointers and
appends a version-log entry with `edit_source='cascade'`. The cell
values themselves are not re-fetched mid-cascade — that is a Phase 5
refinement that depends on a generic value resolver. The version log
preserves the pre-cascade state so a restore is always recoverable.

Spec: SPEC_FINDING4_GENERATIVE_ARTIFACTS.md §10.

Safeguards (auto mode, per spec §10.4):
- Per-artifact failures are caught individually so one bad row does not
  abort the whole cascade.
- Depth cap of 5: this helper does not re-trigger downstream cascades on
  the dependents it just updated. (Recursive cascade would require an
  explicit caller; the modal-save path is one level deep by design.)
- Wide-graph fallback: if more than 50 dependents are returned, the
  helper switches to manual-mode behavior for the change to avoid
  long-running transactions.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional

from django.db import connection, transaction

from .services import (
    find_dependent_artifacts_records,
    update_artifact_record,
)

logger = logging.getLogger(__name__)

# Per spec §10.4 — fall back to manual mode for very wide dependency graphs.
WIDE_GRAPH_THRESHOLD = 50


def _read_cascade_mode(project_id: int) -> str:
    """Return 'auto' or 'manual'. Defaults to 'manual' on any read failure."""
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT artifact_cascade_mode
                FROM landscape.tbl_project
                WHERE project_id = %s
                """,
                [int(project_id)],
            )
            row = cursor.fetchone()
            if not row:
                return 'manual'
            mode = (row[0] or 'manual').strip().lower()
            if mode not in {'auto', 'manual'}:
                return 'manual'
            return mode
    except Exception:
        logger.warning(
            'cascade._read_cascade_mode failed for project_id=%s; defaulting to manual',
            project_id,
            exc_info=True,
        )
        return 'manual'


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _build_pointer_diff_for_paths(
    artifact_source_pointers: Any,
    affected_paths: Iterable[str],
) -> Dict[str, Any]:
    """Build a `source_pointers_diff` that bumps `captured_at` on affected paths.

    Only mutates the leaf entries that already exist; does NOT add new
    pointers. Skips list-shaped pointers (the existing `_affected_rows`
    helper supports both shapes; here we only refresh dict-shaped pointers
    since those are the dominant Phase 1 pattern).
    """
    if not isinstance(artifact_source_pointers, dict):
        return {}
    now = _now_iso()
    diff: Dict[str, Any] = {}
    for path in affected_paths:
        existing = artifact_source_pointers.get(path)
        if not isinstance(existing, dict):
            continue
        diff[path] = {**existing, 'captured_at': now}
    return diff


def _cascade_one(
    *,
    artifact_id: int,
    artifact_source_pointers: Any,
    affected_paths: List[str],
    user_id: Any,
) -> Dict[str, Any]:
    """Apply the cascade update to a single dependent artifact."""
    pointers_diff = _build_pointer_diff_for_paths(
        artifact_source_pointers, affected_paths
    )
    return update_artifact_record(
        artifact_id=artifact_id,
        schema_diff=[],
        source_pointers_diff=pointers_diff if pointers_diff else None,
        edit_source='cascade',
        user_id=user_id,
    )


def process_dependency_cascade(
    *,
    project_id: int,
    changed_rows: Iterable[Dict[str, Any]],
    exclude_artifact_id: Optional[int] = None,
    user_id: Any = None,
) -> Optional[Dict[str, Any]]:
    """Run the post-save dependency hook. Spec §10.

    Parameters
    ----------
    project_id : int
        The project whose artifacts may depend on the changed rows.
    changed_rows : iterable of {table, row_id} dicts
        Rows just written by the calling endpoint. Each entry MUST have
        `table` and `row_id` keys for the matcher to find it. Extra keys
        are ignored.
    exclude_artifact_id : int, optional
        Pass when the caller is itself an artifact-edit path so the
        edited artifact is not flagged as its own dependent.
    user_id : Any, optional
        Forwarded into the version log for any cascade updates.

    Returns
    -------
    dict | None
        - None when there are no dependents, the project_id is invalid,
          or the hook itself fails. Calling endpoint should treat None
          as "nothing to surface".
        - {cascade_mode: 'auto', cascaded_artifacts: [...], skipped: [...]}
          for successful auto cascades.
        - {cascade_mode: 'manual', dependent_artifacts: [...]} when the
          project is in manual mode (or when a wide-graph fallback fires).

    The caller is expected to merge the returned payload (when present)
    into its primary response under a `dependency_notification` key (or
    similar) so the frontend can render the appropriate UI.
    """
    try:
        try:
            project_id_int = int(project_id)
        except (TypeError, ValueError):
            return None

        # Normalize changed_rows once.
        normalized: List[Dict[str, Any]] = []
        for row in changed_rows or []:
            if not isinstance(row, dict):
                continue
            tbl = row.get('table')
            rid = row.get('row_id')
            if not tbl or rid is None:
                continue
            normalized.append({'table': str(tbl), 'row_id': rid})
        if not normalized:
            return None

        result = find_dependent_artifacts_records(
            project_id=project_id_int,
            changed_rows=normalized,
            exclude_artifact_id=exclude_artifact_id,
        )
        dependents = (result or {}).get('dependent_artifacts') or []
        if not dependents:
            return None

        # Wide-graph fallback (spec §10.4).
        if len(dependents) > WIDE_GRAPH_THRESHOLD:
            logger.info(
                'cascade.process_dependency_cascade: wide graph (%d dependents) for '
                'project=%s — falling back to manual notification',
                len(dependents),
                project_id_int,
            )
            return {
                'cascade_mode': 'manual',
                'dependent_artifacts': dependents,
                'wide_graph_fallback': True,
            }

        mode = _read_cascade_mode(project_id_int)
        if mode == 'manual':
            return {
                'cascade_mode': 'manual',
                'dependent_artifacts': dependents,
            }

        # Auto mode — cascade each dependent inside a single atomic block.
        cascaded: List[Dict[str, Any]] = []
        skipped: List[Dict[str, Any]] = []

        # Pre-fetch source_pointers per artifact for `captured_at` diff
        # construction. find_dependent_artifacts already returned the
        # affected_rows path lists; we need the pointer dicts themselves.
        artifact_ids = [d['artifact_id'] for d in dependents]
        pointer_lookup: Dict[int, Any] = {}
        try:
            from .models import Artifact

            qs = Artifact.objects.filter(artifact_id__in=artifact_ids).only(
                'artifact_id', 'source_pointers_json'
            )
            for art in qs:
                pointer_lookup[art.artifact_id] = art.source_pointers_json
        except Exception:
            logger.warning(
                'cascade pointer pre-fetch failed for project=%s; cascade will '
                'proceed without captured_at refresh.',
                project_id_int,
                exc_info=True,
            )

        try:
            with transaction.atomic():
                for dep in dependents:
                    aid = dep.get('artifact_id')
                    paths = dep.get('affected_rows') or []
                    if aid is None or not paths:
                        skipped.append({
                            'artifact_id': aid,
                            'reason': 'missing artifact_id or affected_rows',
                        })
                        continue
                    try:
                        with transaction.atomic():
                            res = _cascade_one(
                                artifact_id=int(aid),
                                artifact_source_pointers=pointer_lookup.get(int(aid)),
                                affected_paths=list(paths),
                                user_id=user_id,
                            )
                        if res.get('success'):
                            cascaded.append({
                                'artifact_id': int(aid),
                                'title': dep.get('title'),
                                'affected_rows': paths,
                            })
                        else:
                            skipped.append({
                                'artifact_id': int(aid),
                                'reason': res.get('error') or 'cascade returned not-success',
                            })
                    except Exception as inner_exc:  # noqa: BLE001
                        logger.warning(
                            'cascade._cascade_one failed for artifact=%s: %s',
                            aid,
                            inner_exc,
                            exc_info=True,
                        )
                        skipped.append({
                            'artifact_id': int(aid) if aid is not None else None,
                            'reason': str(inner_exc),
                        })
        except Exception:
            logger.exception(
                'cascade outer transaction failed for project=%s', project_id_int
            )
            # Fall through and return whatever progress we made.

        return {
            'cascade_mode': 'auto',
            'cascaded_artifacts': cascaded,
            'skipped': skipped,
        }

    except Exception:
        logger.exception(
            'cascade.process_dependency_cascade unexpected failure for project=%s',
            project_id,
        )
        return None
