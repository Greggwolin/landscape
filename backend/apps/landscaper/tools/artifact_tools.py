"""
Generative artifact tools for Landscaper (Finding #4, Phase 1).

Five universal primitives:
    1. create_artifact            — compose a structured-block artifact
    2. update_artifact            — modify in place (JSON Patch or replace)
    3. get_artifact_history       — list version log entries
    4. restore_artifact_state     — revert to a prior state
    5. find_dependent_artifacts   — surface cascade impact of a row change

Storage and validation live in apps.artifacts (services + schema_validation).
This module is the Landscaper-side adapter: parse tool_input, dispatch into
the service layer, return a tool-shaped envelope.

All five tools also belong to UNIVERSAL_TOOLS and UNASSIGNED_SAFE_TOOLS so
they fire pre-project. Phase 4 will add the system-prompt firing rules in
ai_handler.py.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


def _resolve_user_id(kwargs: Dict[str, Any]) -> Any:
    return kwargs.get('user_id') or kwargs.get('user_email') or None


def _resolve_thread_id(kwargs: Dict[str, Any]) -> Any:
    tid = kwargs.get('thread_id')
    if tid:
        return tid
    ctx = kwargs.get('thread_context') or {}
    return ctx.get('thread_id') if isinstance(ctx, dict) else None


def _input(tool_input: Dict[str, Any] | None, kwargs: Dict[str, Any]) -> Dict[str, Any]:
    if isinstance(tool_input, dict):
        return tool_input
    nested = kwargs.get('tool_input')
    return nested if isinstance(nested, dict) else {}


# ──────────────────────────────────────────────────────────────────────────────
# 1. create_artifact
# ──────────────────────────────────────────────────────────────────────────────


@register_tool('create_artifact', is_mutation=True)
def create_artifact_tool(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,
    **kwargs,
) -> Dict[str, Any]:
    """Create a new artifact and auto-open it in the right panel.

    See spec §6.1. Validates the block-document schema; rejects on malformed
    input. Inserts a row into landscape.tbl_artifact and a version-1 entry
    into landscape.tbl_artifact_version.
    """
    from apps.artifacts.services import create_artifact_record

    params = _input(tool_input, kwargs)
    title = params.get('title')
    schema = params.get('schema')
    if not isinstance(title, str) or not title.strip():
        return {'success': False, 'error': 'title is required (non-empty string)'}
    if schema is None:
        return {'success': False, 'error': 'schema is required'}

    # Operating statement / T-12 / P&L / proforma artifacts require artifact_subtype.
    # The guard in apps.artifacts.operating_statement_guard enforces this — pass
    # the value through and let the guard reject if missing for an OS artifact.
    artifact_subtype = params.get('artifact_subtype')

    try:
        return create_artifact_record(
            title=title,
            schema=schema,
            edit_target=params.get('edit_target'),
            source_pointers=params.get('source_pointers'),
            project_id=project_id,
            thread_id=_resolve_thread_id(kwargs),
            user_id=_resolve_user_id(kwargs),
            tool_name='create_artifact',
            params_json={k: params.get(k) for k in (
                'title', 'edit_target', 'source_pointers', 'artifact_subtype',
            ) if k in params},
            artifact_subtype=artifact_subtype,
        )
    except Exception as exc:
        logger.exception('create_artifact_tool failed')
        return {'success': False, 'error': f'create_artifact failed: {exc}'}


# ──────────────────────────────────────────────────────────────────────────────
# 2. update_artifact
# ──────────────────────────────────────────────────────────────────────────────


@register_tool('update_artifact', is_mutation=True)
def update_artifact_tool(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,  # noqa: ARG001 — included for dispatcher compatibility
    **kwargs,
) -> Dict[str, Any]:
    """Modify an existing artifact (spec §6.2).

    Accepts either a JSON Patch (`schema_diff`, RFC-6902) or a full schema
    replacement (`full_schema`). Appends a new version row.
    """
    from apps.artifacts.services import update_artifact_record

    params = _input(tool_input, kwargs)
    artifact_id = params.get('artifact_id')
    try:
        artifact_id_int = int(artifact_id)
    except (TypeError, ValueError):
        return {'success': False, 'error': 'artifact_id is required (integer)'}

    edit_source = params.get('edit_source') or 'user_edit'

    try:
        return update_artifact_record(
            artifact_id=artifact_id_int,
            schema_diff=params.get('schema_diff'),
            full_schema=params.get('full_schema'),
            source_pointers_diff=params.get('source_pointers_diff'),
            edit_source=edit_source,
            user_id=_resolve_user_id(kwargs),
        )
    except Exception as exc:
        logger.exception('update_artifact_tool failed')
        return {'success': False, 'error': f'update_artifact failed: {exc}'}


# ──────────────────────────────────────────────────────────────────────────────
# 3. get_artifact_history
# ──────────────────────────────────────────────────────────────────────────────


@register_tool('get_artifact_history')
def get_artifact_history_tool(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,  # noqa: ARG001
    **kwargs,
) -> Dict[str, Any]:
    """Return version log entries for an artifact, newest first (spec §6.3)."""
    from apps.artifacts.services import get_artifact_history_records

    params = _input(tool_input, kwargs)
    artifact_id = params.get('artifact_id')
    try:
        artifact_id_int = int(artifact_id)
    except (TypeError, ValueError):
        return {'success': False, 'error': 'artifact_id is required (integer)'}

    limit_raw = params.get('limit', 20)
    try:
        limit = int(limit_raw)
    except (TypeError, ValueError):
        limit = 20

    try:
        return get_artifact_history_records(
            artifact_id=artifact_id_int,
            limit=limit,
            since=params.get('since'),
            row_filter=params.get('row_filter'),
        )
    except Exception as exc:
        logger.exception('get_artifact_history_tool failed')
        return {'success': False, 'error': f'get_artifact_history failed: {exc}'}


# ──────────────────────────────────────────────────────────────────────────────
# 4. restore_artifact_state
# ──────────────────────────────────────────────────────────────────────────────


@register_tool('restore_artifact_state', is_mutation=True)
def restore_artifact_state_tool(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,  # noqa: ARG001
    **kwargs,
) -> Dict[str, Any]:
    """Restore an artifact to a prior version, timestamp, or original state.

    Spec §6.4. The restore action itself appends to the version log so it
    is reversible.
    """
    from apps.artifacts.services import restore_artifact_state_record

    params = _input(tool_input, kwargs)
    artifact_id = params.get('artifact_id')
    try:
        artifact_id_int = int(artifact_id)
    except (TypeError, ValueError):
        return {'success': False, 'error': 'artifact_id is required (integer)'}

    target = params.get('target')
    if target is None:
        return {'success': False, 'error': 'target is required'}

    try:
        return restore_artifact_state_record(
            artifact_id=artifact_id_int,
            target=target,
            user_id=_resolve_user_id(kwargs),
        )
    except Exception as exc:
        logger.exception('restore_artifact_state_tool failed')
        return {'success': False, 'error': f'restore_artifact_state failed: {exc}'}


# ──────────────────────────────────────────────────────────────────────────────
# 5. find_dependent_artifacts
# ──────────────────────────────────────────────────────────────────────────────


@register_tool('find_dependent_artifacts')
def find_dependent_artifacts_tool(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,
    **kwargs,
) -> Dict[str, Any]:
    """Find artifacts whose source pointers overlap a set of changed rows.

    Spec §6.5. Lookback bounded to the last 90 days per spec §13.3 to keep
    the dependency check cheap on large projects.
    """
    from apps.artifacts.services import find_dependent_artifacts_records

    params = _input(tool_input, kwargs)
    pid = params.get('project_id', project_id)
    try:
        pid_int = int(pid)
    except (TypeError, ValueError):
        return {'success': False, 'error': 'project_id is required (integer)'}

    changed_rows = params.get('changed_rows')
    if not isinstance(changed_rows, list):
        return {'success': False, 'error': 'changed_rows must be an array'}

    exclude_id = params.get('exclude_artifact_id')
    exclude_id_int: int | None = None
    if exclude_id is not None:
        try:
            exclude_id_int = int(exclude_id)
        except (TypeError, ValueError):
            return {'success': False, 'error': 'exclude_artifact_id must be an integer'}

    try:
        return find_dependent_artifacts_records(
            project_id=pid_int,
            changed_rows=changed_rows,
            exclude_artifact_id=exclude_id_int,
        )
    except Exception as exc:
        logger.exception('find_dependent_artifacts_tool failed')
        return {'success': False, 'error': f'find_dependent_artifacts failed: {exc}'}
