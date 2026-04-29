"""
Service layer for the generative artifact system.

The five Landscaper tools and the REST endpoints both go through this module
so that schema validation, version-log writes, and dependency lookups stay
consistent. Each public function returns a plain dict envelope shaped per
spec §6 (tool output) — REST views adapt the envelope as needed.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Any, Iterable

from django.db import transaction

from .models import Artifact, ArtifactVersion
from .schema_validation import (
    SchemaValidationError,
    apply_json_patch,
    validate_block_document,
)


_DEFAULT_USER_ID = 'system'


# ──────────────────────────────────────────────────────────────────────────────
# Internals
# ──────────────────────────────────────────────────────────────────────────────


def _now() -> datetime:
    return datetime.now(dt_timezone.utc)


def _coerce_user_id(user_id: Any) -> str:
    if user_id is None:
        return _DEFAULT_USER_ID
    return str(user_id)[:50]


def _next_version_seq(artifact_id: int) -> int:
    last = (
        ArtifactVersion.objects
        .filter(artifact_id=artifact_id)
        .order_by('-version_seq')
        .values_list('version_seq', flat=True)
        .first()
    )
    return (last or 0) + 1


def _append_version(
    artifact_id: int,
    user_id: str,
    edit_source: str,
    state_diff_json: Any,
    edited_at: datetime | None = None,
) -> ArtifactVersion:
    return ArtifactVersion.objects.create(
        artifact_id=artifact_id,
        version_seq=_next_version_seq(artifact_id),
        edited_at=edited_at or _now(),
        edited_by_user_id=user_id,
        edit_source=edit_source,
        state_diff_json=state_diff_json,
    )


def _affected_rows(
    source_pointers: Any,
    changed_keys: set[tuple[str, str]],
) -> list[str]:
    """Walk `source_pointers` and return paths whose (table, row_id) match.

    source_pointers shape (per spec §5.1) is intentionally flexible —
    Phase 1 supports the common cases:
        {"<row_path>": {"table": "...", "row_id": ..., ...}, ...}
        [{"path": "...", "table": "...", "row_id": ...}, ...]

    Anything else is treated as opaque and skipped.
    """
    matches: list[str] = []
    if isinstance(source_pointers, dict):
        for key, ref in source_pointers.items():
            if not isinstance(ref, dict):
                continue
            tbl = ref.get('table')
            rid = ref.get('row_id')
            if tbl and rid is not None and (str(tbl), str(rid)) in changed_keys:
                matches.append(str(key))
    elif isinstance(source_pointers, list):
        for entry in source_pointers:
            if not isinstance(entry, dict):
                continue
            tbl = entry.get('table')
            rid = entry.get('row_id')
            path = entry.get('path') or entry.get('row_path')
            if tbl and rid is not None and path and (str(tbl), str(rid)) in changed_keys:
                matches.append(str(path))
    return matches


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────


@transaction.atomic
def create_artifact_record(
    *,
    title: str,
    schema: Any,
    edit_target: Any | None = None,
    source_pointers: Any | None = None,
    project_id: int | None = None,
    thread_id: Any | None = None,
    user_id: Any = None,
    tool_name: str = 'create_artifact',
    params_json: Any | None = None,
) -> dict:
    """Create a new artifact + version 1 entry. Returns spec §6.1 envelope."""
    if not isinstance(title, str) or not title.strip():
        return {'success': False, 'error': 'title is required (non-empty string)'}
    try:
        validate_block_document(schema)
    except SchemaValidationError as exc:
        return {'success': False, 'error': f'schema invalid: {exc}'}

    pointers = source_pointers if source_pointers is not None else {}
    if not isinstance(pointers, (dict, list)):
        return {'success': False, 'error': 'source_pointers must be an object or array'}

    now = _now()
    artifact = Artifact.objects.create(
        project_id=project_id,
        thread_id=thread_id,
        tool_name=tool_name,
        params_json=params_json if params_json is not None else {
            'title': title,
            'edit_target': edit_target,
        },
        current_state_json=schema,
        source_pointers_json=pointers,
        edit_target_json=edit_target,
        title=title[:255],
        created_at=now,
        last_edited_at=now,
        created_by_user_id=_coerce_user_id(user_id),
    )
    _append_version(
        artifact_id=artifact.artifact_id,
        user_id=_coerce_user_id(user_id),
        edit_source='create',
        state_diff_json={'snapshot': schema, 'source_pointers': pointers},
        edited_at=now,
    )

    return {
        'success': True,
        'action': 'show_artifact',
        'artifact_id': artifact.artifact_id,
        'schema': schema,
        'title': artifact.title,
        'edit_target': edit_target,
    }


@transaction.atomic
def update_artifact_record(
    *,
    artifact_id: int,
    schema_diff: Any | None = None,
    full_schema: Any | None = None,
    source_pointers_diff: Any | None = None,
    edit_source: str = 'user_edit',
    user_id: Any = None,
) -> dict:
    """Apply a JSON Patch or replace the schema entirely. Spec §6.2."""
    if schema_diff is None and full_schema is None:
        return {
            'success': False,
            'error': 'one of schema_diff or full_schema is required',
        }
    if edit_source not in {'user_edit', 'drift_pull', 'extraction_commit', 'modal_save', 'cascade'}:
        return {'success': False, 'error': f'invalid edit_source {edit_source!r}'}

    try:
        artifact = Artifact.objects.get(pk=artifact_id)
    except Artifact.DoesNotExist:
        return {'success': False, 'error': f'artifact {artifact_id} not found'}

    current_state = artifact.current_state_json or {}
    if full_schema is not None:
        new_state = full_schema
    else:
        try:
            new_state = apply_json_patch(current_state, schema_diff)
        except SchemaValidationError as exc:
            return {'success': False, 'error': f'schema_diff invalid: {exc}'}

    try:
        validate_block_document(new_state)
    except SchemaValidationError as exc:
        return {'success': False, 'error': f'resulting schema invalid: {exc}'}

    new_pointers = artifact.source_pointers_json or {}
    if source_pointers_diff is not None:
        if isinstance(source_pointers_diff, dict) and isinstance(new_pointers, dict):
            new_pointers = {**new_pointers, **source_pointers_diff}
        elif isinstance(source_pointers_diff, list):
            new_pointers = source_pointers_diff
        else:
            new_pointers = source_pointers_diff

    now = _now()
    artifact.current_state_json = new_state
    artifact.source_pointers_json = new_pointers
    artifact.last_edited_at = now
    artifact.save(
        update_fields=['current_state_json', 'source_pointers_json', 'last_edited_at']
    )

    diff_payload: Any
    if full_schema is not None:
        diff_payload = {'snapshot': new_state, 'source_pointers': new_pointers}
    else:
        diff_payload = schema_diff

    _append_version(
        artifact_id=artifact.artifact_id,
        user_id=_coerce_user_id(user_id),
        edit_source=edit_source,
        state_diff_json=diff_payload,
        edited_at=now,
    )

    return {
        'success': True,
        'action': 'update_artifact',
        'artifact_id': artifact.artifact_id,
        'new_state': new_state,
    }


def get_artifact_history_records(
    *,
    artifact_id: int,
    limit: int = 20,
    since: str | None = None,
    row_filter: str | None = None,  # noqa: ARG001 — wired for v2 row scoping
) -> dict:
    """Return version log entries newest-first. Spec §6.3."""
    if not Artifact.objects.filter(pk=artifact_id).exists():
        return {'success': False, 'error': f'artifact {artifact_id} not found'}

    qs = ArtifactVersion.objects.filter(artifact_id=artifact_id)
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
            qs = qs.filter(edited_at__gte=since_dt)
        except (TypeError, ValueError):
            return {'success': False, 'error': 'since must be ISO-8601'}
    qs = qs.order_by('-version_seq')
    if isinstance(limit, int) and limit > 0:
        qs = qs[:limit]

    from .summaries import summarize_diff  # local import to avoid cycle
    versions = []
    for v in qs:
        versions.append({
            'version_id': v.version_id,
            'version_seq': v.version_seq,
            'edited_at': v.edited_at.isoformat() if v.edited_at else None,
            'edited_by_user_id': v.edited_by_user_id,
            'edit_source': v.edit_source,
            'summary': summarize_diff(v.edit_source, v.state_diff_json),
        })
    return {'success': True, 'artifact_id': artifact_id, 'versions': versions}


def _reconstruct_state(artifact_id: int, version_seq: int) -> dict | None:
    """Walk the version log forward applying snapshots and patches.

    v1 stores full snapshots for `create`, `restore`, `extraction_commit`,
    `modal_save`, `cascade`, and `full_schema` updates; user_edit stores the
    JSON Patch only. Forward-replay handles both.
    """
    versions = list(
        ArtifactVersion.objects
        .filter(artifact_id=artifact_id, version_seq__lte=version_seq)
        .order_by('version_seq')
    )
    if not versions:
        return None
    state: Any = None
    pointers: Any = None
    for v in versions:
        diff = v.state_diff_json
        if isinstance(diff, dict) and 'snapshot' in diff:
            state = diff.get('snapshot')
            if 'source_pointers' in diff:
                pointers = diff.get('source_pointers')
            continue
        if isinstance(diff, list):
            try:
                state = apply_json_patch(state, diff) if state is not None else state
            except SchemaValidationError:
                # Corrupt patch in history — bail, don't crash the restore
                return None
    if state is None:
        return None
    return {'state': state, 'pointers': pointers}


@transaction.atomic
def restore_artifact_state_record(
    *,
    artifact_id: int,
    target: Any,
    user_id: Any = None,
) -> dict:
    """Restore to a prior version. Spec §6.4."""
    try:
        artifact = Artifact.objects.get(pk=artifact_id)
    except Artifact.DoesNotExist:
        return {'success': False, 'error': f'artifact {artifact_id} not found'}

    target_seq: int | None = None
    if isinstance(target, str):
        if target == 'original':
            target_seq = 1
        elif target == 'previous':
            current = (
                ArtifactVersion.objects
                .filter(artifact_id=artifact_id)
                .order_by('-version_seq')
                .values_list('version_seq', flat=True)
                .first()
            )
            if not current or current < 2:
                return {'success': False, 'error': 'no previous version available'}
            target_seq = current - 1
        else:
            try:
                ts = datetime.fromisoformat(target.replace('Z', '+00:00'))
            except (TypeError, ValueError):
                return {'success': False, 'error': 'target string must be original|previous|ISO-8601'}
            v = (
                ArtifactVersion.objects
                .filter(artifact_id=artifact_id, edited_at__lte=ts)
                .order_by('-edited_at')
                .first()
            )
            if v is None:
                return {'success': False, 'error': f'no version at or before {target}'}
            target_seq = v.version_seq
    elif isinstance(target, int):
        target_seq = target
    elif isinstance(target, dict) and 'version_seq' in target:
        try:
            target_seq = int(target['version_seq'])
        except (TypeError, ValueError):
            return {'success': False, 'error': 'target.version_seq must be an integer'}
    else:
        return {'success': False, 'error': 'target must be a string, integer, or {version_seq}'}

    reconstructed = _reconstruct_state(artifact_id, target_seq)
    if reconstructed is None:
        return {'success': False, 'error': f'cannot reconstruct version_seq={target_seq}'}

    new_state = reconstructed['state']
    new_pointers = reconstructed['pointers'] if reconstructed['pointers'] is not None else (artifact.source_pointers_json or {})

    now = _now()
    artifact.current_state_json = new_state
    artifact.source_pointers_json = new_pointers
    artifact.last_edited_at = now
    artifact.save(
        update_fields=['current_state_json', 'source_pointers_json', 'last_edited_at']
    )
    version = _append_version(
        artifact_id=artifact.artifact_id,
        user_id=_coerce_user_id(user_id),
        edit_source='restore',
        state_diff_json={
            'snapshot': new_state,
            'source_pointers': new_pointers,
            'restored_from': target_seq,
        },
        edited_at=now,
    )

    return {
        'success': True,
        'action': 'update_artifact',
        'artifact_id': artifact.artifact_id,
        'new_state': new_state,
        'restored_from': target_seq,
        'version_id': version.version_id,
    }


def find_dependent_artifacts_records(
    *,
    project_id: int,
    changed_rows: Iterable[Any],
    exclude_artifact_id: int | None = None,
    lookback_days: int = 90,
) -> dict:
    """Return artifacts whose source pointers overlap `changed_rows`. Spec §6.5."""
    changed_keys: set[tuple[str, str]] = set()
    for row in changed_rows or []:
        if not isinstance(row, dict):
            continue
        tbl = row.get('table')
        rid = row.get('row_id')
        if tbl and rid is not None:
            changed_keys.add((str(tbl), str(rid)))
    if not changed_keys:
        return {'success': True, 'dependent_artifacts': []}

    cutoff = _now() - timedelta(days=lookback_days)
    qs = Artifact.objects.filter(
        project_id=project_id,
        is_archived=False,
        last_edited_at__gte=cutoff,
    )
    if exclude_artifact_id is not None:
        qs = qs.exclude(pk=exclude_artifact_id)

    dependents = []
    for artifact in qs.only(
        'artifact_id', 'title', 'last_edited_at', 'source_pointers_json'
    ):
        affected = _affected_rows(artifact.source_pointers_json, changed_keys)
        if affected:
            dependents.append({
                'artifact_id': artifact.artifact_id,
                'title': artifact.title,
                'affected_rows': affected,
                'last_edited_at': artifact.last_edited_at.isoformat()
                if artifact.last_edited_at else None,
            })
    return {'success': True, 'dependent_artifacts': dependents}
