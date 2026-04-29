"""
REST endpoints for the generative artifact system.

Endpoints:
    GET    /api/artifacts/?project_id=X    — list (used by panel)
    GET    /api/artifacts/<id>/            — full retrieval
    PATCH  /api/artifacts/<id>/            — pin/unpin/archive/title
    POST   /api/artifacts/<id>/update_state/  — inline edit write path (Phase 4)
    GET    /api/artifacts/<id>/versions/   — version log
    POST   /api/artifacts/<id>/restore/    — restore to a prior state

`create_artifact` still flows through the Landscaper tool dispatcher
(no public REST endpoint by design — creation is a Landscaper-orchestrated
act). `update_artifact` is reachable BOTH via the Landscaper tool dispatcher
AND via the `update_state` action below; the action is the path the
ArtifactRenderer uses for inline cell edits, so the frontend can write
without a chat round-trip. Both paths land in `update_artifact_record`.
"""

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
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

    permission_classes = [AllowAny]

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
