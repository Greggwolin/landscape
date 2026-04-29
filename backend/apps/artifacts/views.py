"""
REST endpoints for the generative artifact system.

Endpoints:
    GET    /api/artifacts/?project_id=X    — list (used by panel)
    GET    /api/artifacts/<id>/            — full retrieval
    PATCH  /api/artifacts/<id>/            — pin/unpin/archive/title
    GET    /api/artifacts/<id>/versions/   — version log
    POST   /api/artifacts/<id>/restore/    — restore to a prior state

Tool-side `create_artifact` and `update_artifact` go through the Landscaper
tool dispatcher; they are not exposed as REST endpoints in Phase 1 (the
frontend reads via these endpoints + creates via Landscaper tools).
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
