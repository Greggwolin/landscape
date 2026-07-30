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
        spec = {
            'pair_path': body.get('pair_path'),
            'cell_path': body.get('cell_path'),
            'new_value': body.get('new_value'),
        }

        try:
            artifact = Artifact.objects.get(pk=artifact_id)
        except Artifact.DoesNotExist:
            return Response(
                {'success': False, 'error': f'artifact {artifact_id} not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        user_id = (
            getattr(request.user, 'id', None)
            or body.get('user_id')
            or None
        )

        # Impact headline (CB6): read the cash-flow NPV BEFORE the write so we
        # can report the engine delta. Scoped to budget writes (the only source
        # that moves the cash flow) — resolve the target first (cheap in-memory
        # walk) to learn the table. Best-effort; a failed read never blocks.
        pre_ref, _pre_err = _resolve_edit_target(artifact.current_state_json, spec)
        npv_before = None
        if (_pre_err is None and pre_ref.get('table') in _NPV_IMPACTING_TABLES
                and artifact.project_id is not None):
            npv_before = _read_cashflow_npv(artifact.project_id)

        # Single write path — the SAME per-edit helper the batch endpoint uses.
        result = _apply_one_edit(artifact, spec, user_id)
        if not result.get('success'):
            # Surface the writer/resolver envelope as a 400 — includes
            # suggested_user_question for FK-ambiguous and FK-unmatched cases.
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        # Field write landed. Re-build the artifact via its tool's schema
        # builder so the user sees the canonical, freshly-formatted value.
        refreshed = _refresh_artifact_after_write(
            artifact=artifact,
            user_id=user_id,
        )
        if not refreshed.get('success'):
            return Response(refreshed, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Impact line: cash-flow NPV after vs before. Engine delta only —
        # empty string when nothing moved, never a fabricated figure.
        impact_line = ''
        if npv_before is not None:
            impact_line = _format_npv_impact(
                npv_before, _read_cashflow_npv(artifact.project_id)
            )

        return Response({
            'success': True,
            'action': 'commit_field_edit',
            'artifact_id': artifact.artifact_id,
            'new_state': refreshed.get('new_state'),
            'coerced_value': result.get('coerced_value'),
            'meta': result.get('meta') or {},
            'impact_line': impact_line,
        })

    @action(detail=True, methods=['post'], url_path='commit_field_edits')
    def commit_field_edits(self, request, pk=None):
        """CB8 — batch commit: stage several edits, land them together, ONE
        impact line for the set.

        Body: ``{edits: [{cell_path | pair_path, new_value}, ...], user_id?}``.

        Semantics (all-or-report, matching the clarification apply endpoint):
          - Each edit commits through its OWN writer (the same ``_apply_one_edit``
            the single path uses). One failure does NOT roll back the others.
          - Duplicate targets — two edits hitting the same
            ``(table, row_id, column)`` — are rejected UP FRONT (400) rather than
            racing writes against each other.
          - The expensive work is done ONCE for the batch: one NPV-before read,
            one artifact rebuild after all writes, one NPV-after read, one
            ``impact_line``.
          - Response carries a per-edit ``results`` list (``applied`` / ``error``
            with the cell + reason) so the frontend can clear the landed cells
            and keep the failed ones staged with their reason.
        """
        try:
            artifact_id = int(pk)
        except (TypeError, ValueError):
            return Response(
                {'success': False, 'error': 'invalid artifact id'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        body = request.data or {}
        edits = body.get('edits')
        if not isinstance(edits, list) or not edits:
            return Response(
                {'success': False, 'error': 'edits_required',
                 'detail': 'edits (non-empty list) is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            artifact = Artifact.objects.get(pk=artifact_id)
        except Artifact.DoesNotExist:
            return Response(
                {'success': False, 'error': f'artifact {artifact_id} not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        user_id = (
            getattr(request.user, 'id', None)
            or body.get('user_id')
            or None
        )
        schema = artifact.current_state_json

        # Pass 1 — resolve every edit's target (cheap in-memory walk). Used for
        # duplicate detection and NPV scoping. Resolution errors are NOT fatal
        # to the batch (all-or-report) — they become per-edit errors in pass 2.
        resolved = [(spec, *_resolve_edit_target(schema, spec)) for spec in edits]

        # Stale-cell guard (CC11) — run for the WHOLE batch here, in pass 1,
        # before any write. Deliberately not inside the pass-2 loop: a landed
        # write recalculates its own row's derived columns (a sale_date write
        # refreshes that parcel's commission), so a later edit in the same batch
        # would fail a staleness check against a value THIS batch legitimately
        # changed. Checking every edit against the pre-batch state asks the
        # question that actually matters — was the panel current when the user
        # staged these — and cannot false-positive on the batch's own work.
        resolved = [
            (spec, sr, err if err is not None
             else (_check_cell_not_stale(sr) if sr is not None else None))
            for spec, sr, err in resolved
        ]

        # Duplicate-target rejection — a client construction bug. Reject the
        # WHOLE batch up front rather than letting two writes race the same row.
        targets = [
            (sr['table'], str(sr['row_id']), sr['column'])
            for _spec, sr, err in resolved if sr is not None
        ]
        if len(targets) != len(set(targets)):
            return Response(
                {'success': False, 'error': 'duplicate_target',
                 'detail': ('two or more edits target the same '
                            '(table, row_id, column) in one batch')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # NPV-before, once — only meaningful if an NPV-impacting cell (budget or
        # parcel sale) is in the set.
        any_npv_impacting = any(
            sr is not None and sr['table'] in _NPV_IMPACTING_TABLES
            for _spec, sr, _err in resolved
        )
        npv_before = (
            _read_cashflow_npv(artifact.project_id)
            if any_npv_impacting and artifact.project_id is not None else None
        )

        # Pass 2 — apply each edit through its own writer.
        results = []
        applied = 0
        for idx, (spec, source_ref, resolve_err) in enumerate(resolved):
            entry = {
                'index': idx,
                'cell_path': spec.get('cell_path') if isinstance(spec, dict) else None,
                'pair_path': spec.get('pair_path') if isinstance(spec, dict) else None,
            }
            if resolve_err is not None:
                results.append({
                    **entry, 'status': 'error',
                    'error': resolve_err.get('error'),
                    'detail': resolve_err.get('detail'),
                    'suggested_user_question': resolve_err.get('suggested_user_question'),
                })
                continue
            target = {'table': source_ref['table'], 'row_id': source_ref['row_id'],
                      'column': source_ref['column']}
            write_result = _dispatch_edit_write(
                artifact.project_id, source_ref, spec.get('new_value'), user_id
            )
            if write_result.get('success'):
                applied += 1
                results.append({
                    **entry, 'status': 'applied', 'target': target,
                    'coerced_value': _jsonable(write_result.get('coerced_value')),
                    'meta': write_result.get('meta') or {},
                })
            else:
                results.append({
                    **entry, 'status': 'error', 'target': target,
                    'error': write_result.get('error'),
                    'detail': write_result.get('detail'),
                    'suggested_user_question': write_result.get('suggested_user_question'),
                })

        # Rebuild the artifact ONCE if anything landed; otherwise leave it as-is.
        new_state = schema
        if applied:
            refreshed = _refresh_artifact_after_write(
                artifact=artifact, user_id=user_id
            )
            if not refreshed.get('success'):
                return Response(
                    refreshed, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            new_state = refreshed.get('new_state')

        # ONE impact line for the whole set — engine delta, empty if nothing
        # moved, never fabricated.
        impact_line = ''
        if npv_before is not None and applied:
            impact_line = _format_npv_impact(
                npv_before, _read_cashflow_npv(artifact.project_id)
            )

        return Response({
            'success': True,
            'action': 'commit_field_edits',
            'artifact_id': artifact.artifact_id,
            'new_state': new_state,
            'results': results,
            'applied_count': applied,
            'error_count': len(results) - applied,
            'impact_line': impact_line,
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


def _walk_path(schema, path):
    """Walk a block document by a list of JSON-Pointer-style tokens.

    Returns the resolved node (any type) or ``None`` when a token doesn't
    resolve. Unlike ``_resolve_pair`` it imposes no shape on the final node.
    """
    if not isinstance(schema, dict):
        return None
    cursor = schema
    for token in path:
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
    return cursor


# Table cells a user may edit inline, mapped to their source columns. The
# per-cell source_ref is the true allowlist (a cell with no ref can't resolve),
# but this set fails closed a SECOND time so a stray ref on a calculated column
# (e.g. amount, recomputed by trg_budget_calculate_amount) can never be written.
# `uom_code` (CB10) is a picklist code, not a number — it is written as a
# string, not decimal-coerced; see _write_budget_cell.
_EDITABLE_BUDGET_CELL_COLUMNS = {'qty', 'rate', 'uom_code'}


def _resolve_cell_source_ref(schema, cell_path):
    """Resolve a table cell's source_ref from ``cell_path`` (CB6).

    ``cell_path`` is shaped ``[..., "rows", "<row_idx>", "cells", "<column>"]``.
    We walk to the ROW dict (cell_path minus the trailing ``["cells", column]``),
    read ``row["cell_source_refs"][column]``, and return ``(source_ref, None)``
    on success or ``(None, error_dict)``.

    Presence of the ref is the write allowlist: a cell whose column has no ref
    (``amount`` / ``category`` / ``description`` on the budget schedule) fails
    closed here, before any writer runs.
    """
    if not isinstance(cell_path, list) or len(cell_path) < 3 or cell_path[-2] != 'cells':
        return None, {
            'success': False,
            'error': 'invalid_cell_path',
            'detail': (
                'cell_path must be shaped [..., "rows", <i>, "cells", <column>]; '
                f'got {cell_path!r}'
            ),
        }
    column = cell_path[-1]
    row_path = cell_path[:-2]
    row = _walk_path(schema, row_path)
    if not isinstance(row, dict) or 'cells' not in row:
        return None, {
            'success': False,
            'error': 'cell_not_found',
            'detail': f'no table row at {row_path!r} in the artifact schema',
        }
    refs = row.get('cell_source_refs')
    source_ref = refs.get(column) if isinstance(refs, dict) else None
    if not isinstance(source_ref, dict):
        return None, {
            'success': False,
            'error': 'no_cell_source_ref',
            'detail': (
                f'cell {column!r} has no source_ref — it is a read-only / '
                'calculated cell and cannot be edited inline.'
            ),
        }
    return source_ref, None


def _write_budget_cell(*, project_id, fact_id, column, raw_value, user_id=None):
    """Write one budget INPUT cell (qty/rate/uom_code) via the existing writer.

    Reuses ``handle_update_budget_item`` in commit mode — no parallel writer.
    ``qty``/``rate`` are decimal-coerced (the DB trigger recomputes
    ``amount = qty × rate``); ``uom_code`` (CB10) is a picklist FK code, written
    as a string. An invalid code is rejected by the ``core_fin_uom`` foreign key
    and the rejection surfaces inline. Returns the standard field-writer
    envelope.
    """
    if column not in _EDITABLE_BUDGET_CELL_COLUMNS:
        return {
            'success': False,
            'error': 'column_not_writable',
            'detail': (
                f'{column!r} is not an editable budget cell. Editable columns: '
                f'{sorted(_EDITABLE_BUDGET_CELL_COLUMNS)}.'
            ),
        }
    if project_id is None:
        return {
            'success': False,
            'error': 'project_required',
            'detail': 'budget schedule artifact missing project_id',
        }
    try:
        fact_id_int = int(fact_id)
    except (TypeError, ValueError):
        return {
            'success': False,
            'error': 'invalid_row_id',
            'detail': f'fact_id must be an integer; got {fact_id!r}',
        }
    # UOM (CB10) is a picklist FK code, not a number — write the string straight
    # through. An empty selection is a client error; an invalid (non-existent)
    # code is caught by the core_fin_uom foreign key inside the writer and comes
    # back as a db_error envelope, surfaced inline rather than silently reverted.
    if column == 'uom_code':
        code = '' if raw_value is None else str(raw_value).strip()
        if not code:
            return {
                'success': False,
                'error': 'invalid_value',
                'detail': 'UOM cannot be empty — choose a unit of measure.',
            }
        value_to_write = code
    else:
        # Coerce loose numeric input ("1,250" / "$500" / "300") to a Decimal.
        from .field_writers import _coerce_decimal
        try:
            coerced = _coerce_decimal(raw_value)
        except ValueError as exc:
            return {'success': False, 'error': 'invalid_value', 'detail': str(exc)}
        if coerced is None:
            return {
                'success': False,
                'error': 'invalid_value',
                'detail': f'{column} cannot be empty — enter a number.',
            }
        value_to_write = coerced

    from apps.landscaper.tool_executor import handle_update_budget_item
    result = handle_update_budget_item(
        {
            'fact_id': fact_id_int,
            column: value_to_write,
            'reason': f'Inline edit: {column}',
        },
        int(project_id),
        propose_only=False,
        user_id=user_id,
    )
    if not result.get('success'):
        return {
            'success': False,
            'error': 'db_error',
            'detail': result.get('error') or 'budget write failed',
        }
    # result['amount'] is the trigger-recomputed amount — surface it in meta.
    return {
        'success': True,
        'coerced_value': value_to_write,
        'meta': {'amount': result.get('amount')},
    }


# ─── Sales schedule cell writer (CB9) ────────────────────────────────────────
#
# The parcel sale schedule exposes exactly two editable cells: sale_date and
# commission_amount, both on tbl_parcel_sale_assumptions. Unlike the budget
# table there is NO DB trigger recomputing the derived columns (gross / costs /
# net) — so this writer OWNS the recalc: it writes the edited column via the
# existing writer, then runs recalculate_one_assumption (the same maths the
# batch recalculation endpoint uses) so the stored derived values stay
# consistent with what was just typed. NOTHING derived is writable — the
# per-cell source_ref allowlist stops at sale_date + commission_amount, and this
# set fails closed a SECOND time.
_EDITABLE_SALE_CELL_COLUMNS = {'sale_date', 'commission_amount'}


def _coerce_sale_date(raw_value):
    """Parse a user-entered sale date to an ISO ``YYYY-MM-DD`` string, or None.

    Accepts a date/datetime, an ISO date/datetime string, or a few common human
    formats. Returns None for empty / unparseable input — the caller rejects it
    (the column is NOT NULL)."""
    if raw_value is None:
        return None
    if hasattr(raw_value, 'isoformat') and not isinstance(raw_value, str):
        try:
            return raw_value.isoformat()[:10]
        except Exception:
            return None
    s = str(raw_value).strip()
    if not s:
        return None
    from datetime import datetime
    try:
        # ISO first — handles 'YYYY-MM-DD' and full ISO datetimes.
        return datetime.fromisoformat(s[:19]).date().isoformat()
    except ValueError:
        pass
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m/%d/%y', '%B %d, %Y', '%b %d, %Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _write_sale_cell(*, project_id, parcel_id, column, raw_value, user_id=None):
    """Write one editable parcel-sale cell (sale_date | commission_amount), then
    recalc the row so gross / costs / net stay consistent (CB9).

    Reuses ``handle_update_parcel_sale_assumptions`` in commit mode — no parallel
    writer — then ``recalculate_one_assumption`` runs the SAME maths as the batch
    recalc endpoint.

    ``commission`` is an OVERRIDE cell. The user types a dollar amount; it is
    stored on commission_amount with commission_override = true and treated as a
    FIXED override — recalculate_one_assumption re-feeds it into
    SaleCalculationService's fixed-commission path, which reproduces it to the
    cent (commission_pct is numeric(5,4), too coarse to round-trip the dollars)."""
    if column not in _EDITABLE_SALE_CELL_COLUMNS:
        return {
            'success': False,
            'error': 'column_not_writable',
            'detail': (
                f'{column!r} is not an editable sale cell. Editable columns: '
                f'{sorted(_EDITABLE_SALE_CELL_COLUMNS)}.'
            ),
        }
    if project_id is None:
        return {
            'success': False,
            'error': 'project_required',
            'detail': 'sales schedule artifact missing project_id',
        }
    try:
        parcel_id_int = int(parcel_id)
    except (TypeError, ValueError):
        return {
            'success': False,
            'error': 'invalid_row_id',
            'detail': f'parcel_id must be an integer; got {parcel_id!r}',
        }

    from apps.landscaper.tool_executor import handle_update_parcel_sale_assumptions
    from apps.sales_absorption.batch_recalc import recalculate_one_assumption

    if column == 'sale_date':
        iso = _coerce_sale_date(raw_value)
        if iso is None:
            return {
                'success': False,
                'error': 'invalid_value',
                'detail': (
                    'sale_date must be a valid date (YYYY-MM-DD); '
                    f'got {raw_value!r}. The column is NOT NULL.'
                ),
            }
        writer_input = {
            'parcel_id': parcel_id_int,
            'sale_date': iso,
            'reason': 'Inline edit: sale_date',
        }
        coerced_value = iso
    else:  # commission_amount
        from .field_writers import _coerce_decimal
        try:
            amount = _coerce_decimal(raw_value)
        except ValueError as exc:
            return {'success': False, 'error': 'invalid_value', 'detail': str(exc)}
        if amount is None:
            return {
                'success': False,
                'error': 'invalid_value',
                'detail': 'commission cannot be empty — enter a dollar amount.',
            }
        # Store the typed dollars + the override flag. commission_amount is a
        # FIXED override: recalculate_one_assumption re-feeds it into
        # SaleCalculationService, which honors it to the cent (the fixed-
        # commission path) instead of rounding it through the numeric(5,4)
        # commission_pct. The recalc also sets commission_pct = amount / gross
        # for display consistency.
        writer_input = {
            'parcel_id': parcel_id_int,
            'commission_amount': amount,
            'commission_override': True,
            'reason': 'Inline edit: commission',
        }
        coerced_value = amount

    result = handle_update_parcel_sale_assumptions(
        writer_input, int(project_id), propose_only=False, user_id=user_id,
    )
    if not result.get('success'):
        return {
            'success': False,
            'error': 'db_error',
            'detail': result.get('error') or 'sale assumption write failed',
        }

    # Recalc so the stored derived columns are consistent with the just-written
    # value. The sales tables have NO trigger — the writer owns this.
    try:
        calc = recalculate_one_assumption(int(project_id), parcel_id_int)
    except Exception as exc:
        return {
            'success': False,
            'error': 'recalc_failed',
            'detail': f'row written but recalculation failed: {exc}',
        }

    return {
        'success': True,
        'coerced_value': coerced_value,
        'meta': {
            'gross_sale_proceeds': calc.get('gross_sale_proceeds'),
            'commission_amount': calc.get('commission_amount'),
            'total_transaction_costs': calc.get('total_transaction_costs'),
            'net_sale_proceeds': calc.get('net_sale_proceeds'),
        },
    }


def _coerce_dcf_value(column, raw_value):
    """Coerce a typed assumption cell to its stored form. Pure — no DB.

    Returns ``(stored_value, echoed_value, None)`` or ``(None, None, error)``.

    A PERCENT cell takes a percent: the scale is exactly 100 and there is NO
    magnitude heuristic. Typing 0.25 into a cell labelled 20.0% stores 0.0025
    and immediately redisplays as 0.3% — visibly wrong, and correctable —
    rather than being silently reinterpreted as 25%. Inferring the user's unit
    from its size is the defect class this slice exists to remove.
    """
    from apps.landscaper.tools.cashflow_artifact_builder import (
        INTEGER_ASSUMPTION_COLUMNS,
        PERCENT_ASSUMPTION_COLUMNS,
        percent_bounds_for,
    )

    s = str(raw_value).strip() if raw_value is not None else ''
    if s == '':
        return None, None, {
            'success': False, 'error': 'invalid_value',
            'detail': f'{column} cannot be blank — enter a value.',
        }
    s = s.replace(',', '').replace('$', '').rstrip('%').strip()
    try:
        typed = float(s)
    except ValueError:
        return None, None, {
            'success': False, 'error': 'invalid_value',
            'detail': f'{column} must be a number; got {raw_value!r}.',
        }

    if column in PERCENT_ASSUMPTION_COLUMNS:
        # Bounds come from the column's OWN numeric precision — not a blanket
        # number — so an unstorable value is refused here with a plain message
        # instead of surfacing as a Postgres overflow further down.
        lo, hi = percent_bounds_for(column)
        if not (lo <= typed <= hi):
            return None, None, {
                'success': False, 'error': 'value_out_of_range',
                'detail': (
                    f'{column} is entered as a percent (e.g. 6.5 for 6.5%), and '
                    f'accepts {lo:g}% to {hi:g}%. {typed:g} is outside what this '
                    'column can store.'
                ),
            }
        return typed / 100.0, typed, None

    if column in INTEGER_ASSUMPTION_COLUMNS:
        if typed != int(typed):
            return None, None, {
                'success': False, 'error': 'invalid_value',
                'detail': f'{column} must be a whole number; got {raw_value!r}.',
            }
        if typed < 0:
            return None, None, {
                'success': False, 'error': 'value_out_of_range',
                'detail': f'{column} cannot be negative.',
            }
        return int(typed), int(typed), None

    # Currency amount (reserves_per_unit).
    if typed < 0:
        return None, None, {
            'success': False, 'error': 'value_out_of_range',
            'detail': f'{column} cannot be negative.',
        }
    return typed, typed, None


def _write_dcf_cell(*, project_id, dcf_analysis_id, column, raw_value, user_id=None):
    """Write one editable cash-flow assumption cell (CC2).

    Reuses ``handle_update_cashflow_assumption`` in confirm mode — no parallel
    writer. That tool already validates the column against its own allowlist,
    writes inside a transaction, and re-reads OUTSIDE the transaction to prove
    the value landed, so this helper adds only the two things the artifact path
    needs and the tool cannot know about:

    1. **The sibling-row guard.** ``tbl_dcf_analysis`` is unique on
       (project_id, property_type) and a project may hold BOTH a ``land_dev``
       and a ``cre`` row — project 17 does. The engine reads only the row
       matching the project's type. The tool resolves that row itself, so an
       edit whose ``source_ref`` points at the OTHER row would be silently
       redirected and appear to succeed while the cell the user clicked was
       never the one written. We refuse instead, and say why.

    2. **Percent-unit coercion.** The cell displays and accepts PERCENT units
       (20.0 = 20%); the column stores a decimal fraction (0.20). The scale is
       exactly 100 for the declared percent columns and there is NO magnitude
       heuristic — a typed 0.25 stores 0.0025 and immediately redisplays as
       0.3%, visibly wrong, rather than being silently "corrected" to 25%.
       Guessing the user's unit is the defect class this whole slice exists to
       avoid.
    """
    from apps.landscaper.tools.cashflow_artifact_builder import (
        EDITABLE_ASSUMPTION_COLUMNS,
        resolve_engine_dcf_id,
    )

    if column not in EDITABLE_ASSUMPTION_COLUMNS:
        return {
            'success': False,
            'error': 'column_not_writable',
            'detail': (
                f'{column!r} is not an editable cash-flow assumption. Editable '
                f'columns: {sorted(EDITABLE_ASSUMPTION_COLUMNS)}.'
            ),
        }
    if project_id is None:
        return {
            'success': False,
            'error': 'project_required',
            'detail': 'cash-flow schedule artifact missing project_id',
        }

    try:
        ref_id = int(dcf_analysis_id)
    except (TypeError, ValueError):
        return {
            'success': False,
            'error': 'invalid_row_id',
            'detail': f'dcf_analysis_id must be an integer; got {dcf_analysis_id!r}',
        }

    # --- Guard 1: coerce by declared kind (pure). Bad input never reaches the DB.
    new_value, coerced_value, err = _coerce_dcf_value(column, raw_value)
    if err is not None:
        return err

    # --- Guard 2: the ref must point at the row the engine actually reads. ---
    engine_id = resolve_engine_dcf_id(int(project_id))
    if engine_id is None:
        return {
            'success': False,
            'error': 'no_dcf_row',
            'detail': (
                f'project {project_id} has no cash-flow assumption record to write '
                'to. Open the cash-flow schedule first, which creates it.'
            ),
        }
    if engine_id != ref_id:
        return {
            'success': False,
            'error': 'stale_dcf_row',
            'detail': (
                f'this cell points at assumption record {ref_id}, but the engine '
                f'now reads record {engine_id} for project {project_id}. Writing '
                f'{ref_id} would change no number on screen. Re-open the cash-flow '
                'schedule to refresh the cell, then edit again.'
            ),
        }

    from apps.landscaper.tool_executor import handle_update_cashflow_assumption

    result = handle_update_cashflow_assumption(
        {
            'field': column,
            'new_value': new_value,
            'confirm': True,
            'reason': f'Inline edit: {column}',
        },
        int(project_id),
        propose_only=False,
        user_id=user_id,
    )
    if not result.get('success'):
        return {
            'success': False,
            'error': 'db_error',
            'detail': result.get('error') or 'cash-flow assumption write failed',
        }

    # No stored schedule to keep in step — the engine recomputes every period
    # from these assumptions on the next read, so there is nothing to recalc
    # here (unlike budget, which has a trigger, or sales, which has none).
    return {
        'success': True,
        'coerced_value': coerced_value,
        'meta': {'stored_value': new_value, 'dcf_analysis_id': ref_id},
    }


# ─── Per-edit resolve + dispatch (shared by single + batch commit, CB8) ──────
#
# The editing spine has ONE write path. `commit_field_edit` (single) and
# `commit_field_edits` (batch) both go through these helpers — no forked
# resolve/dispatch logic. The batch endpoint does the expensive work
# (NPV-before / artifact rebuild / NPV-after) ONCE for the whole set.


def _resolve_edit_target(schema, spec):
    """Resolve one edit spec to its source_ref. Returns ``(source_ref, error)``.

    ``spec`` is ``{cell_path | pair_path, new_value}`` — exactly one path key.
    On success the source_ref carries table / row_id / column. On any problem
    returns ``(None, error_dict)`` with the same codes the CB6 single path used
    (path_required / no_cell_source_ref / pair_not_found / no_source_ref /
    incomplete_source_ref).
    """
    if not isinstance(spec, dict):
        return None, {'success': False, 'error': 'invalid_edit',
                      'detail': 'each edit must be an object'}
    pair_path = spec.get('pair_path')
    cell_path = spec.get('cell_path')
    pair_given = isinstance(pair_path, list) and pair_path
    cell_given = isinstance(cell_path, list) and cell_path
    if bool(pair_given) == bool(cell_given):
        return None, {'success': False, 'error': 'path_required',
                      'detail': ('exactly one of pair_path or cell_path '
                                 '(non-empty list) is required')}
    if cell_given:
        source_ref, err = _resolve_cell_source_ref(schema, cell_path)
        if err is not None:
            return None, err
    else:
        pair = _resolve_pair(schema, pair_path)
        if pair is None:
            return None, {'success': False, 'error': 'pair_not_found',
                          'detail': f'no key_value_grid pair at {pair_path!r}'}
        source_ref = pair.get('source_ref') if isinstance(pair, dict) else None
        if not isinstance(source_ref, dict):
            return None, {'success': False, 'error': 'no_source_ref',
                          'detail': (f"pair {pair.get('label')!r} has no "
                                     'source_ref — inline edit requires a '
                                     'source_ref pointing at (table, row_id, '
                                     'column).')}
    table = source_ref.get('table')
    row_id = source_ref.get('row_id')
    column = source_ref.get('column')
    if not (table and row_id is not None and column):
        return None, {'success': False, 'error': 'incomplete_source_ref',
                      'detail': 'source_ref must carry table, row_id, and column'}
    return source_ref, None


def _dispatch_edit_write(project_id, source_ref, new_value, user_id):
    """Write one resolved edit through the table's writer (no parallel writer).

    Returns the writer envelope: ``{success, coerced_value, meta}`` on success,
    or ``{success: False, error, detail, ...}``. Dispatch matches CB6:
    tbl_project → project-profile field writer; core_fin_fact_budget →
    _write_budget_cell → update_budget_item.
    """
    table = source_ref['table']
    row_id = source_ref['row_id']
    column = source_ref['column']
    if table == 'tbl_project':
        from .field_writers import write_project_field
        try:
            row_id_int = int(row_id)
        except (TypeError, ValueError):
            return {'success': False, 'error': 'invalid_row_id',
                    'detail': f'row_id must be an integer; got {row_id!r}'}
        return write_project_field(project_id=row_id_int, field=column,
                                   raw_value=new_value, user_id=user_id)
    if table == 'core_fin_fact_budget':
        return _write_budget_cell(project_id=project_id, fact_id=row_id,
                                  column=column, raw_value=new_value,
                                  user_id=user_id)
    if table == 'tbl_parcel_sale_assumptions':
        # CB9: row_id is the PARCEL id (the table is UNIQUE on parcel_id and the
        # existing writer keys on it). Editable columns: sale_date,
        # commission_amount — the writer recalcs the row after writing.
        return _write_sale_cell(project_id=project_id, parcel_id=row_id,
                                column=column, raw_value=new_value,
                                user_id=user_id)
    if table == 'tbl_dcf_analysis':
        # CC2: row_id is the dcf_analysis_id the render read. The writer refuses
        # if the engine now reads a different record (a project may hold both a
        # land_dev and a cre row — only one is ever consumed).
        return _write_dcf_cell(project_id=project_id, dcf_analysis_id=row_id,
                               column=column, raw_value=new_value,
                               user_id=user_id)
    return {'success': False, 'error': 'table_not_supported',
            'detail': (f"inline-edit write-back is not yet wired for {table!r}. "
                       'Supported source tables: tbl_project, '
                       'core_fin_fact_budget, tbl_parcel_sale_assumptions, '
                       'tbl_dcf_analysis.')}


# ─── Stale-cell guard (CC11) ────────────────────────────────────────────────
#
# An edit is aimed by POSITION — ``blocks/1/rows/3/cells/value`` — and a position
# is only meaningful for the version of the table it was read from. Several of
# these schedules REORDER on write: the sales schedule sorts by sale_date, so
# moving a parcel's date moves its row. If the client posts a path derived from
# a snapshot the server has since rebuilt, the path resolves to a DIFFERENT row's
# source_ref, and the write succeeds against a row the user never chose. No
# error, no clue — the same "reports success, changes the wrong thing" family as
# the sibling-record trap.
#
# It is not hypothetical: CC hit exactly this restoring a sales row during the
# CC3 regression run — its restore landed on the neighbouring parcel because the
# edit it was undoing had reordered the table. It caught and repaired it, but the
# product has the same exposure whenever something else re-renders a schedule
# between draw and click (Landscaper redrawing from chat, a second panel, a batch
# staged a minute earlier).
#
# The fix is already half-built: every editable cell records ``captured_value``,
# the value it was displaying when drawn. Nothing read it. Comparing it against
# what is actually stored, immediately before writing, closes the class for every
# schedule at once — present and future.
#
# Read-only, per (table, row_id, column). Columns are validated against each
# table's editable set before they reach SQL, so no caller-supplied string is
# ever interpolated.

_STALE_CHECK_TABLES = {
    # table: (qualified table, key column, allowed value columns)
    'core_fin_fact_budget': (
        'landscape.core_fin_fact_budget', 'fact_id', _EDITABLE_BUDGET_CELL_COLUMNS),
    'tbl_parcel_sale_assumptions': (
        'landscape.tbl_parcel_sale_assumptions', 'parcel_id', _EDITABLE_SALE_CELL_COLUMNS),
    'tbl_dcf_analysis': (
        'landscape.tbl_dcf_analysis', 'dcf_analysis_id', None),  # None → resolved lazily
}


def _read_current_cell_value(table, row_id, column):
    """Current stored value for one cell, or ``(None, reason)`` if unreadable.

    Returns ``(value, None)`` on a clean read. A table we don't know how to read,
    a column outside that table's editable set, or a missing row returns
    ``(None, reason)`` — the caller then SKIPS the comparison rather than
    refusing, because an unverifiable cell is not evidence of staleness.
    """
    spec = _STALE_CHECK_TABLES.get(table)
    if spec is None:
        return None, 'table_not_checkable'
    qualified, key_column, allowed = spec
    if allowed is None:
        from apps.landscaper.tools.cashflow_artifact_builder import (
            EDITABLE_ASSUMPTION_COLUMNS,
        )
        allowed = EDITABLE_ASSUMPTION_COLUMNS
    if column not in allowed:
        return None, 'column_not_checkable'
    try:
        row_id_int = int(row_id)
    except (TypeError, ValueError):
        return None, 'row_id_not_numeric'
    from django.db import connection as _conn
    try:
        with _conn.cursor() as cursor:
            cursor.execute(
                f'SELECT {column} FROM {qualified} WHERE {key_column} = %s',
                [row_id_int],
            )
            row = cursor.fetchone()
    except Exception as exc:  # noqa: BLE001
        import logging as _logging
        _logging.getLogger(__name__).warning(
            f'stale-cell read failed for {table}.{column}: {exc}'
        )
        return None, 'read_failed'
    if row is None:
        return None, 'row_missing'
    return row[0], None


def _values_equivalent(captured, current):
    """Is the captured display value the same as what is stored now?

    Tolerant on representation, strict on meaning. Numbers compare numerically
    with a small relative tolerance (a captured float and a stored Decimal are
    the same value); dates compare as ISO strings; everything else compares as
    trimmed text. Both-empty is a match.
    """
    if captured is None and current is None:
        return True
    if captured is None or current is None:
        return False
    # Numeric
    try:
        a, b = float(captured), float(current)
        return abs(a - b) <= max(1e-9, abs(b) * 1e-9)
    except (TypeError, ValueError):
        pass
    # Date / datetime → ISO
    cur = current.isoformat() if hasattr(current, 'isoformat') else str(current)
    cap = captured.isoformat() if hasattr(captured, 'isoformat') else str(captured)
    return cur.strip()[:10] == cap.strip()[:10] if 'T' in cur or '-' in cur else cur.strip() == cap.strip()


def _check_cell_not_stale(source_ref):
    """Refuse an edit aimed from a snapshot that no longer matches the row.

    Returns ``None`` when the edit may proceed — which includes every case we
    cannot verify (no ``captured_value`` on the ref, an unreadable table or
    column, a row we cannot find). Refusing on an unverifiable cell would break
    every path that predates the guard; refusing only on a PROVEN mismatch keeps
    it purely additive.
    """
    if 'captured_value' not in source_ref:
        return None
    captured = source_ref.get('captured_value')
    current, reason = _read_current_cell_value(
        source_ref['table'], source_ref['row_id'], source_ref['column'])
    if reason is not None:
        return None
    if _values_equivalent(captured, current):
        return None
    return {
        'success': False,
        'error': 'stale_cell',
        'detail': (
            f"this cell was showing {captured!r} when the panel was drawn, but "
            f"{source_ref['table']}.{source_ref['column']} for row "
            f"{source_ref['row_id']} now holds {current!r}. The panel is out of "
            'date, so the position you clicked may no longer be the row you '
            'meant. Nothing was written.'
        ),
        'suggested_user_question': (
            'This schedule changed since it was opened, so I did not write the '
            'edit — reopen it and try again?'
        ),
    }


def _apply_one_edit(artifact, spec, user_id):
    """Resolve + write ONE edit. Returns a normalized per-edit result.

    Does NOT rebuild the artifact or read NPV — those are batch-level concerns
    the caller does once. On success carries the resolved ``target`` +
    ``coerced_value`` + ``meta``; on failure carries the error envelope + (when
    resolution succeeded) the ``target`` so the caller can report which cell.
    """
    source_ref, err = _resolve_edit_target(artifact.current_state_json, spec)
    if err is not None:
        return {**err, 'success': False}
    stale = _check_cell_not_stale(source_ref)
    if stale is not None:
        return {**stale, 'target': {'table': source_ref['table'],
                                    'row_id': source_ref['row_id'],
                                    'column': source_ref['column']}}
    write_result = _dispatch_edit_write(
        artifact.project_id, source_ref, spec.get('new_value'), user_id
    )
    target = {'table': source_ref['table'], 'row_id': source_ref['row_id'],
              'column': source_ref['column']}
    if not write_result.get('success'):
        return {**write_result, 'success': False, 'target': target}
    return {'success': True, 'target': target,
            'coerced_value': _jsonable(write_result.get('coerced_value')),
            'meta': write_result.get('meta') or {}}


# Source tables whose edits move the cash-flow NPV headline — the impact line
# reads NPV before/after only for these. Budget cells (CB6) change cost timing;
# parcel sale cells (CB9) change when/what proceeds land. Everything else
# (project profile) leaves the cash flow untouched, so no read.
_NPV_IMPACTING_TABLES = {
    'core_fin_fact_budget',
    'tbl_parcel_sale_assumptions',
    # CC2: the discount rate and its neighbours drive NPV directly — a change
    # here should report what it did to the value, same as a budget change.
    'tbl_dcf_analysis',
}


def _read_cashflow_npv(project_id):
    """Best-effort cash-flow NPV headline for the impact line (CB6).

    Returns a float or ``None``; never raises. A missing / un-modeled schedule
    simply yields no impact line rather than blocking the write.
    """
    try:
        from apps.landscaper.tool_executor import _fetch_cashflow_schedule
        envelope = _fetch_cashflow_schedule(int(project_id))
        summary = (envelope or {}).get('summary') or {}
        npv = summary.get('npv')
        return float(npv) if npv is not None else None
    except Exception:
        import logging as _logging
        _logging.getLogger(__name__).debug(
            'commit_field_edit: NPV read failed (non-blocking)', exc_info=True
        )
        return None


def _format_npv_impact(before, after):
    """One-line NPV delta for the impact banner.

    Empty string when nothing moved (< $1) or either reading is unavailable.
    Engine delta only — never a fabricated figure.
    """
    if before is None or after is None:
        return ''
    delta = after - before
    if abs(delta) < 1:
        return ''
    sign = '+' if delta >= 0 else '−'  # minus sign
    return f'Cash-flow NPV {sign}${abs(delta):,.0f} → ${after:,.0f}'


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
        elif artifact.tool_name == 'get_budget_schedule':
            # Editing spine (CB6): rebuild the budget schedule from the same
            # read path the tool uses, so the refreshed artifact shows the
            # trigger-recomputed amount + refreshed KPI header and the version
            # log records this as a user_edit.
            from apps.landscaper.tools.budget_artifact_builder import (
                build_budget_schema_for_project,
            )
            project_id = artifact.project_id
            if project_id is None:
                return {
                    'success': False,
                    'error': 'project_required',
                    'detail': 'budget schedule artifact missing project_id',
                }
            new_schema = build_budget_schema_for_project(project_id)
            if new_schema is None:
                return {
                    'success': False,
                    'error': 'no_budget_rows',
                    'detail': (
                        f'project {project_id} has no budget line items to '
                        're-render after the write'
                    ),
                }
        elif artifact.tool_name == 'get_sales_schedule':
            # Editing spine (CB9): rebuild the sales schedule from the same read
            # path the tool uses so the refreshed artifact shows the recalculated
            # gross / net + refreshed KPI header, and the version log records this
            # as a user_edit.
            from apps.landscaper.tools.sales_artifact_builder import (
                build_sales_schema_for_project,
            )
            project_id = artifact.project_id
            if project_id is None:
                return {
                    'success': False,
                    'error': 'project_required',
                    'detail': 'sales schedule artifact missing project_id',
                }
            new_schema = build_sales_schema_for_project(project_id)
            if new_schema is None:
                return {
                    'success': False,
                    'error': 'no_sales_rows',
                    'detail': (
                        f'project {project_id} has no dated parcel sale '
                        'assumptions to re-render after the write'
                    ),
                }
        elif artifact.tool_name == 'get_cashflow_schedule':
            # Editing spine (CC2): rebuild the cash-flow schedule from the same
            # read path the tool uses, so the refreshed artifact shows the
            # re-run engine (every period, NPV/IRR header) and the version log
            # records this as a user_edit. Nothing is stored between the
            # assumption and the grid — the engine recomputes on this read.
            from apps.landscaper.tools.cashflow_artifact_builder import (
                build_cashflow_schema_for_project,
            )
            project_id = artifact.project_id
            if project_id is None:
                return {
                    'success': False,
                    'error': 'project_required',
                    'detail': 'cash-flow schedule artifact missing project_id',
                }
            new_schema = build_cashflow_schema_for_project(project_id)
            if new_schema is None:
                return {
                    'success': False,
                    'error': 'no_cashflow_periods',
                    'detail': (
                        f'project {project_id} has no cash-flow periods to '
                        're-render after the write'
                    ),
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
