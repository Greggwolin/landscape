"""
REST endpoints for the generative artifact system.

Endpoints:
    GET    /api/artifacts/?project_id=X         — list (used by panel)
    GET    /api/artifacts/<id>/                 — full retrieval
    PATCH  /api/artifacts/<id>/                 — pin/unpin/archive/title
    DELETE /api/artifacts/<id>/                 — soft archive (default) or
                                                  hard delete (?force=true)
    POST   /api/artifacts/<id>/update_state/    — inline edit applying a
                                                  JSON Patch to the artifact
                                                  snapshot only (Phase 4)
    POST   /api/artifacts/<id>/commit_field_edit/  — inline edit that writes
                                                  through to the underlying
                                                  source row, then re-reads
                                                  the artifact (Phase 5;
                                                  added 2026-05-06)
    GET    /api/artifacts/<id>/versions/        — version log
    POST   /api/artifacts/<id>/restore/         — restore to a prior state

`create_artifact` still flows through the Landscaper tool dispatcher
(no public REST endpoint by design — creation is a Landscaper-orchestrated
act). `update_artifact` is reachable BOTH via the Landscaper tool dispatcher
AND via the `update_state` action below; the action is the path the
ArtifactRenderer uses for inline cell edits, so the frontend can write
without a chat round-trip. Both paths land in `update_artifact_record`.

`commit_field_edit` is the heavier write path. When a kv_pair carries a
`source_ref`, the renderer routes the user's edit here; this endpoint
writes the underlying DB row, re-reads the artifact via its tool's
schema builder, and saves the refreshed snapshot via
`update_artifact_record(edit_source='user_edit')`. The user only ever
sees one round trip; the version log shows the field write + the
source-of-truth refresh as a single user-edit step.
"""

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Artifact, ArtifactVersion
from .serializers import (
    ArtifactDetailSerializer,
    ArtifactListSerializer,
    ArtifactPatchSerializer,
    ArtifactVersionSerializer,
    RestoreActionSerializer,
)
from .services import (
    get_artifact_history_records,
    restore_artifact_state_record,
    update_artifact_record,
)


class ArtifactViewSet(viewsets.ViewSet):
    """ViewSet for artifact list/retrieve/patch + version + restore actions."""


    def list(self, request):
        qs = Artifact.objects.all()
        project_id = request.query_params.get('project_id')
        if project_id is not None:
            try:
                qs = qs.filter(project_id=int(project_id))
            except (TypeError, ValueError):
                return Response(
                    {'error': 'project_id must be an integer'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            include_unassigned = request.query_params.get('include_unassigned')
            if include_unassigned not in ('1', 'true', 'True', 'yes'):
                qs = qs.exclude(project_id__isnull=True)

        thread_id = request.query_params.get('thread_id')
        if thread_id:
            qs = qs.filter(thread_id=thread_id)

        archived = request.query_params.get('archived')
        if archived in (None, '', '0', 'false', 'False'):
            qs = qs.filter(is_archived=False)

        pinned_only = request.query_params.get('pinned_only')
        if pinned_only in ('1', 'true', 'True', 'yes'):
            qs = qs.filter(pinned_label__isnull=False)

        try:
            limit = int(request.query_params.get('limit') or 50)
        except (TypeError, ValueError):
            limit = 50
        limit = max(1, min(limit, 200))

        qs = qs.order_by('-last_edited_at')[:limit]
        serializer = ArtifactListSerializer(qs, many=True)
        return Response({'count': len(serializer.data), 'results': serializer.data})

    def retrieve(self, request, pk=None):
        artifact = get_object_or_404(Artifact, pk=pk)
        serializer = ArtifactDetailSerializer(artifact)
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        artifact = get_object_or_404(Artifact, pk=pk)
        serializer = ArtifactPatchSerializer(
            artifact, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(artifact, field, value)
        artifact.save(update_fields=list(serializer.validated_data.keys()))
        return Response(ArtifactDetailSerializer(artifact).data)

    def destroy(self, request, pk=None):
        """Soft-archive (default) or hard-delete an artifact.

        Default behavior is a soft archive: ``is_archived`` flips to ``True``
        and the row + its version history remain. The list endpoint already
        excludes archived artifacts unless ``?archived=true`` is passed, so
        archived rows disappear from the panel UI.

        Pass ``?force=true`` (or ``1`` / ``yes``) to permanently remove the
        row. The ``tbl_artifact_version.artifact_id`` foreign key is declared
        ``ON DELETE CASCADE``, so version history is cleaned up automatically
        by the database — no application-level cascade needed.

        Responses:
            - 204 No Content on hard delete success.
            - 200 OK with the archived artifact body on soft archive success.
            - 404 if the artifact does not exist.
        """
        artifact = get_object_or_404(Artifact, pk=pk)

        force_param = (request.query_params.get('force') or '').strip().lower()
        is_force = force_param in ('1', 'true', 'yes')

        if is_force:
            artifact.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        if not artifact.is_archived:
            artifact.is_archived = True
            artifact.save(update_fields=['is_archived'])
        return Response(ArtifactDetailSerializer(artifact).data)

    @action(detail=True, methods=['get'], url_path='versions')
    def versions(self, request, pk=None):
        try:
            limit = int(request.query_params.get('limit') or 20)
        except (TypeError, ValueError):
            limit = 20
        result = get_artifact_history_records(
            artifact_id=int(pk),
            limit=limit,
            since=request.query_params.get('since'),
            row_filter=request.query_params.get('row_filter'),
        )
        if not result.get('success'):
            return Response(result, status=status.HTTP_404_NOT_FOUND)
        return Response(result)

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        serializer = RestoreActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_id = getattr(request.user, 'id', None) or request.data.get('user_id')
        result = restore_artifact_state_record(
            artifact_id=int(pk),
            target=serializer.validated_data['target'],
            user_id=user_id,
        )
        if not result.get('success'):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)

    @action(detail=True, methods=['post'], url_path='commit_field_edit')
    def commit_field_edit(self, request, pk=None):
        """Phase 5 — inline edit with write-back to the underlying source row.

        Body: ``{pair_path: ["blocks", "0", "pairs", N], new_value: <str>,
        user_id?: any}``.

        Behavior:
          1. Load artifact, walk ``current_state_json`` to find the kv_pair
             at ``pair_path``. Reject if no pair there or pair has no
             ``source_ref``.
          2. Dispatch on ``source_ref.table``:
               - ``tbl_project`` → ``field_writers.write_project_field``
               - other tables   → ``not_supported`` (v1 covers project
                                    profile only).
             Field writer coerces the raw input by column type and
             handles FK resolution (msa_id) — may return an error
             envelope for ambiguous / unmatched FK lookups, which we
             surface back to the renderer verbatim so the user sees an
             actionable inline message.
          3. On successful write, re-build the artifact's schema via the
             tool's builder (currently only ``get_project_profile``) and
             call ``update_artifact_record(full_schema=..., edit_source=
             'user_edit')``. The version log captures the change as a
             user-driven edit; the dedup key on the artifact is preserved
             because the row is updated in place rather than recreated.
          4. Return the refreshed artifact body so the frontend can drop
             its draft state and render fresh.

        This is intentionally a separate action from ``update_state``: that
        path patches the snapshot only, this path is the source-of-truth
        write. Both write a version row; only this one mutates the DB.
        """
        try:
            artifact_id = int(pk)
        except (TypeError, ValueError):
            return Response(
                {'success': False, 'error': 'invalid artifact id'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        body = request.data or {}
        pair_path = body.get('pair_path')
        new_value = body.get('new_value')

        if not isinstance(pair_path, list) or not pair_path:
            return Response(
                {'success': False, 'error': 'pair_path (non-empty list) is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            artifact = Artifact.objects.get(pk=artifact_id)
        except Artifact.DoesNotExist:
            return Response(
                {'success': False, 'error': f'artifact {artifact_id} not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Walk the schema to find the pair at pair_path. Path tokens are
        # JSON Pointer-style (block index, "pairs", pair index).
        pair = _resolve_pair(artifact.current_state_json, pair_path)
        if pair is None:
            return Response(
                {
                    'success': False,
                    'error': 'pair_not_found',
                    'detail': (
                        f"no key_value_grid pair at {pair_path!r} in artifact "
                        f"{artifact_id}'s current_state_json"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        source_ref = pair.get('source_ref') if isinstance(pair, dict) else None
        if not isinstance(source_ref, dict):
            return Response(
                {
                    'success': False,
                    'error': 'no_source_ref',
                    'detail': (
                        f"pair {pair.get('label')!r} has no source_ref — "
                        'inline edit requires a source_ref pointing at '
                        '(table, row_id, column).'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        table = source_ref.get('table')
        row_id = source_ref.get('row_id')
        column = source_ref.get('column')
        if not (table and row_id is not None and column):
            return Response(
                {
                    'success': False,
                    'error': 'incomplete_source_ref',
                    'detail': (
                        'source_ref must carry table, row_id, and column'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_id = (
            getattr(request.user, 'id', None)
            or body.get('user_id')
            or None
        )

        # Dispatch on table. v1 only supports tbl_project (the project
        # profile artifact). Add other dispatchers here as more artifact
        # types adopt inline edit.
        if table == 'tbl_project':
            from .field_writers import write_project_field
            try:
                row_id_int = int(row_id)
            except (TypeError, ValueError):
                return Response(
                    {
                        'success': False,
                        'error': 'invalid_row_id',
                        'detail': f'row_id must be an integer; got {row_id!r}',
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            write_result = write_project_field(
                project_id=row_id_int,
                field=column,
                raw_value=new_value,
                user_id=user_id,
            )
        else:
            return Response(
                {
                    'success': False,
                    'error': 'table_not_supported',
                    'detail': (
                        f"inline-edit write-back is not yet wired for {table!r}. "
                        'Project profile (tbl_project) is the only supported '
                        'source table in v1.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not write_result.get('success'):
            # Surface the writer envelope as a 400 — includes
            # suggested_user_question for FK-ambiguous and FK-unmatched cases.
            return Response(write_result, status=status.HTTP_400_BAD_REQUEST)

        # Field write landed. Re-build the artifact via its tool's schema
        # builder so the user sees the canonical, freshly-formatted value
        # (currency / dates / MSA name) rather than their typed string.
        refreshed = _refresh_artifact_after_write(
            artifact=artifact,
            user_id=user_id,
        )
        if not refreshed.get('success'):
            return Response(refreshed, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'success': True,
            'action': 'commit_field_edit',
            'artifact_id': artifact.artifact_id,
            'new_state': refreshed.get('new_state'),
            'coerced_value': _jsonable(write_result.get('coerced_value')),
            'meta': write_result.get('meta') or {},
        })

    @action(detail=True, methods=['post'], url_path='update_state')
    def update_state(self, request, pk=None):
        """Phase 4 — inline-edit write path for the ArtifactRenderer.

        Body: ``{schema_diff?: JsonPatch[], full_schema?: object,
        source_pointers_diff?: any, edit_source?: str}``. Either
        ``schema_diff`` or ``full_schema`` must be present. ``edit_source``
        defaults to ``'user_edit'`` and is constrained to the same enum
        validated by ``update_artifact_record``.

        Returns the same envelope the Landscaper-tool path returns. The
        frontend invalidates its detail + versions caches on success.

        After the artifact mutates, fire the dependency cascade hook for
        the project (if any) so other artifacts referencing the same
        source rows are notified or auto-cascaded per the project's
        ``artifact_cascade_mode`` setting.
        """
        try:
            artifact_id = int(pk)
        except (TypeError, ValueError):
            return Response(
                {'success': False, 'error': 'invalid artifact id'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        body = request.data or {}
        schema_diff = body.get('schema_diff')
        full_schema = body.get('full_schema')
        if schema_diff is None and full_schema is None:
            return Response(
                {'success': False,
                 'error': 'one of schema_diff or full_schema is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        edit_source = body.get('edit_source') or 'user_edit'
        # update_artifact_record validates the enum; we let invalid values
        # bubble up as a 400 with the specific error string.
        user_id = (
            getattr(request.user, 'id', None)
            or body.get('user_id')
            or None
        )

        result = update_artifact_record(
            artifact_id=artifact_id,
            schema_diff=schema_diff,
            full_schema=full_schema,
            source_pointers_diff=body.get('source_pointers_diff'),
            edit_source=edit_source,
            user_id=user_id,
        )
        if not result.get('success'):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        # Phase 4 — fan-out cascade for dependents in the same project.
        # Edits inside an artifact's own cells emit `(table, row_id)` only
        # when the edited cell carries an explicit `source_ref`; the body
        # may include a `changed_rows` hint to seed the cascade. If not
        # provided, we skip the cascade — there is no reliable way to
        # derive changed source rows from an opaque schema_diff.
        changed_rows = body.get('changed_rows')
        if isinstance(changed_rows, list) and changed_rows:
            try:
                artifact = Artifact.objects.only('project_id').get(pk=artifact_id)
                if artifact.project_id is not None:
                    from .cascade import process_dependency_cascade
                    notification = process_dependency_cascade(
                        project_id=artifact.project_id,
                        changed_rows=changed_rows,
                        exclude_artifact_id=artifact_id,
                        user_id=user_id,
                    )
                    if notification:
                        result['dependency_notification'] = notification
            except Artifact.DoesNotExist:
                pass
            except Exception:
                # Cascade is fail-safe — log and continue.
                import logging as _logging
                _logging.getLogger(__name__).warning(
                    'update_state cascade hook failed (non-blocking)',
                    exc_info=True,
                )

        return Response(result)


# ─── commit_field_edit helpers ────────────────────────────────────────────
#
# Kept module-level so the action method stays readable and so unit tests
# can exercise pair resolution without spinning up the full ViewSet.


def _resolve_pair(schema, pair_path):
    """Walk a block document to find the kv_pair at ``pair_path``.

    ``pair_path`` is a list of string tokens shaped like
    ``["blocks", "<block_idx>", "pairs", "<pair_idx>"]`` (the same shape
    the renderer's JSON Patch path uses, minus the leading ``/``). For
    pairs nested inside section blocks the path may include
    ``"children"`` segments. Returns the pair dict on hit, or ``None``
    when the path doesn't resolve to a kv_pair.
    """
    if not isinstance(schema, dict):
        return None
    cursor = schema
    for token in pair_path:
        if isinstance(cursor, dict):
            if token in cursor:
                cursor = cursor[token]
                continue
            return None
        if isinstance(cursor, list):
            try:
                idx = int(token)
            except (TypeError, ValueError):
                return None
            if 0 <= idx < len(cursor):
                cursor = cursor[idx]
                continue
            return None
        return None
    if not isinstance(cursor, dict):
        return None
    # The resolved value must look like a kv_pair (carries a label/value).
    if 'label' not in cursor:
        return None
    return cursor


def _refresh_artifact_after_write(*, artifact, user_id):
    """Re-build a freshly-written artifact from its source-of-truth read path.

    Currently only ``get_project_profile`` is supported. Other tools opt in
    by adding a branch here; the alternative is to invoke the tool itself
    (which would re-trigger the dedup-update path with edit_source='cascade').
    Calling the schema builder directly lets us tag the version row as
    'user_edit', which is the honest classification for this path.
    """
    try:
        if artifact.tool_name == 'get_project_profile':
            from apps.landscaper.tools.project_profile_tools import (
                _build_profile_pairs,
                _fetch_profile_row,
            )
            project_id = artifact.project_id
            if project_id is None:
                return {
                    'success': False,
                    'error': 'project_required',
                    'detail': 'project profile artifact missing project_id',
                }
            profile = _fetch_profile_row(project_id)
            if profile is None:
                return {
                    'success': False,
                    'error': 'project_not_found',
                    'detail': f'project {project_id} disappeared between write and refresh',
                }
            pairs = _build_profile_pairs(profile)
            new_schema = {
                'blocks': [
                    {
                        'id': 'project_profile_grid',
                        'type': 'key_value_grid',
                        'pairs': pairs,
                        'columns': 1,
                    },
                ],
            }
        else:
            return {
                'success': False,
                'error': 'tool_not_supported',
                'detail': (
                    f"refresh after write-back is not wired for tool "
                    f"{artifact.tool_name!r}; add a branch in "
                    "_refresh_artifact_after_write before opting this "
                    "artifact type into inline-edit-with-write-back."
                ),
            }
    except Exception as exc:
        import logging as _logging
        _logging.getLogger(__name__).exception(
            f'commit_field_edit refresh failed: {exc}'
        )
        return {
            'success': False,
            'error': 'refresh_failed',
            'detail': str(exc),
        }

    # Save via the standard update path so the version log captures it
    # honestly as user_edit and the dedup_key on the artifact is preserved.
    from .services import update_artifact_record
    return update_artifact_record(
        artifact_id=artifact.artifact_id,
        full_schema=new_schema,
        edit_source='user_edit',
        user_id=user_id,
    )


def _jsonable(value):
    """Coerce typed Python values (Decimal, date) into JSON-friendly forms.

    The renderer just echoes ``coerced_value`` back into the chat-side
    confirmation toast / log line — it doesn't need full fidelity, just
    something that serializes cleanly through DRF's JSON renderer.
    """
    from datetime import date as _date, datetime as _datetime
    from decimal import Decimal as _Decimal
    if isinstance(value, _Decimal):
        return str(value)
    if isinstance(value, (_date, _datetime)):
        return value.isoformat()
    return value
