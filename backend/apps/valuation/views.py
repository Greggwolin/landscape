"""
Valuation Views

API views for narrative versioning, comments, and track changes.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction

from .models import NarrativeVersion, NarrativeComment, NarrativeChange
from .serializers import (
    NarrativeVersionSerializer,
    NarrativeVersionListSerializer,
    NarrativeVersionCreateSerializer,
    NarrativeCommentSerializer,
    NarrativeChangeSerializer,
    AcceptChangesSerializer,
)


class NarrativeVersionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for narrative versions.

    Provides CRUD operations and version-specific actions.
    """

    queryset = NarrativeVersion.objects.all()
    serializer_class = NarrativeVersionSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return NarrativeVersionListSerializer
        if self.action == 'create':
            return NarrativeVersionCreateSerializer
        return NarrativeVersionSerializer

    def get_queryset(self):
        """Filter by project_id and approach_type if provided."""
        queryset = NarrativeVersion.objects.all()
        project_id = self.request.query_params.get('project_id')
        approach_type = self.request.query_params.get('approach_type')

        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if approach_type:
            queryset = queryset.filter(approach_type=approach_type)

        return queryset.order_by('-version_number')

    @action(detail=False, methods=['get'], url_path='latest')
    def latest(self, request):
        """
        Get the latest version for a project/approach combination.

        Query params:
        - project_id (required)
        - approach_type (required)
        """
        project_id = request.query_params.get('project_id')
        approach_type = request.query_params.get('approach_type')

        if not project_id or not approach_type:
            return Response(
                {'error': 'project_id and approach_type are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        version = NarrativeVersion.objects.filter(
            project_id=project_id,
            approach_type=approach_type
        ).order_by('-version_number').first()

        if not version:
            return Response(
                {'message': 'No narrative found', 'exists': False},
                status=status.HTTP_200_OK
            )

        serializer = self.get_serializer(version)
        return Response({
            'exists': True,
            **serializer.data
        })

    @action(detail=True, methods=['post'], url_path='accept-changes')
    def accept_changes(self, request, pk=None):
        """
        Accept track changes and create a clean version.

        This clears all track change marks and creates a new version
        with the changes applied.
        """
        version = self.get_object()
        serializer = AcceptChangesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            # Mark changes as accepted
            if serializer.validated_data.get('accept_all', True):
                changes = version.changes.filter(is_accepted=False)
            else:
                change_ids = serializer.validated_data.get('change_ids', [])
                changes = version.changes.filter(id__in=change_ids, is_accepted=False)

            now = timezone.now()
            changes.update(is_accepted=True, accepted_at=now)

            # Update version status
            version.status = 'final'
            version.save()

        return Response({
            'message': 'Changes accepted',
            'accepted_count': changes.count(),
            'version_id': version.id
        })

    @action(detail=True, methods=['post'], url_path='send-for-review')
    def send_for_review(self, request, pk=None):
        """
        Mark a version as under review (triggers Landscaper in Phase 3).
        """
        version = self.get_object()
        version.status = 'under_review'
        version.save()

        return Response({
            'message': 'Changes saved. Landscaper review coming soon.',
            'version_id': version.id,
            'status': version.status
        })


class ProjectNarrativeView(APIView):
    """
    Get or create narrative for a specific project/approach.

    GET: Returns latest version or placeholder
    POST: Creates a new version
    """

    def get(self, request, project_id, approach_type):
        """Get the latest narrative version for a project/approach."""
        version = NarrativeVersion.objects.filter(
            project_id=project_id,
            approach_type=approach_type
        ).order_by('-version_number').first()

        if not version:
            # Return placeholder response
            return Response({
                'exists': False,
                'message': 'Narrative will be generated when Landscaper analyzes this project.',
                'project_id': project_id,
                'approach_type': approach_type,
            })

        serializer = NarrativeVersionSerializer(version)
        return Response({
            'exists': True,
            **serializer.data
        })

    def post(self, request, project_id, approach_type):
        """Create a new narrative version."""
        data = request.data.copy()
        data['project_id'] = project_id
        data['approach_type'] = approach_type

        serializer = NarrativeVersionCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        version = serializer.save()

        return Response(
            NarrativeVersionSerializer(version).data,
            status=status.HTTP_201_CREATED
        )


class ProjectNarrativeVersionsView(APIView):
    """List all versions for a project/approach."""

    def get(self, request, project_id, approach_type):
        """Get all versions for a project/approach."""
        versions = NarrativeVersion.objects.filter(
            project_id=project_id,
            approach_type=approach_type
        ).order_by('-version_number')

        serializer = NarrativeVersionListSerializer(versions, many=True)
        return Response({
            'count': versions.count(),
            'results': serializer.data
        })


class NarrativeCommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for narrative comments.

    Provides CRUD operations for inline comments.
    """

    queryset = NarrativeComment.objects.all()
    serializer_class = NarrativeCommentSerializer

    def get_queryset(self):
        """Filter by version_id if provided."""
        queryset = NarrativeComment.objects.all()
        version_id = self.request.query_params.get('version_id')

        if version_id:
            queryset = queryset.filter(version_id=version_id)

        return queryset.order_by('position_start')

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, pk=None):
        """Mark a comment as resolved."""
        comment = self.get_object()
        comment.is_resolved = True
        comment.resolved_at = timezone.now()
        # TODO: Set resolved_by from authenticated user
        comment.landscaper_response = request.data.get('response', '')
        comment.save()

        serializer = self.get_serializer(comment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='unresolve')
    def unresolve(self, request, pk=None):
        """Mark a comment as unresolved (reopen)."""
        comment = self.get_object()
        comment.is_resolved = False
        comment.resolved_at = None
        comment.resolved_by = None
        comment.save()

        serializer = self.get_serializer(comment)
        return Response(serializer.data)


class NarrativeChangeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for narrative changes (track changes).

    Provides CRUD operations for text changes.
    """

    queryset = NarrativeChange.objects.all()
    serializer_class = NarrativeChangeSerializer

    def get_queryset(self):
        """Filter by version_id if provided."""
        queryset = NarrativeChange.objects.all()
        version_id = self.request.query_params.get('version_id')

        if version_id:
            queryset = queryset.filter(version_id=version_id)

        return queryset.order_by('position_start')

    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, pk=None):
        """Accept a single change."""
        change = self.get_object()
        change.is_accepted = True
        change.accepted_at = timezone.now()
        change.save()

        serializer = self.get_serializer(change)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Reject (delete) a change."""
        change = self.get_object()
        change.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
