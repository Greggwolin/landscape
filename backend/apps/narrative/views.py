"""
Narrative Views

Phase 3 collaborative narrative endpoints.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NarrativeVersion, NarrativeComment, NarrativeChange
from .serializers import (
    NarrativeVersionSerializer,
    NarrativeVersionListSerializer,
    NarrativeVersionCreateSerializer,
    VersionStatusUpdateSerializer,
    SendForReviewSerializer,
    ApplyChangesSerializer,
    FollowUpSerializer,
)
from .services.landscaper import LandscaperService


class ProjectNarrativeView(APIView):
    """Get or create the latest narrative for a project/approach."""

    permission_classes = [AllowAny]

    def get(self, request, project_id, approach_type):
        version = NarrativeVersion.objects.filter(
            project_id=project_id,
            approach_type=approach_type
        ).order_by('-version_number').first()

        if not version:
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

    permission_classes = [AllowAny]

    def get(self, request, project_id, approach_type):
        versions = NarrativeVersion.objects.filter(
            project_id=project_id,
            approach_type=approach_type
        ).order_by('-version_number')

        serializer = NarrativeVersionListSerializer(versions, many=True)
        return Response({
            'count': versions.count(),
            'versions': serializer.data
        })


class ProjectNarrativeVersionDetailView(APIView):
    """Get a specific version by version_number."""

    permission_classes = [AllowAny]

    def get(self, request, project_id, approach_type, version_number):
        version = NarrativeVersion.objects.filter(
            project_id=project_id,
            approach_type=approach_type,
            version_number=version_number
        ).first()

        if not version:
            return Response({'detail': 'Version not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = NarrativeVersionSerializer(version)
        return Response(serializer.data)


class ProjectNarrativeStatusView(APIView):
    """Update a specific version's status."""

    permission_classes = [AllowAny]

    def put(self, request, project_id, approach_type, version_number):
        version = NarrativeVersion.objects.filter(
            project_id=project_id,
            approach_type=approach_type,
            version_number=version_number
        ).first()

        if not version:
            return Response({'detail': 'Version not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = VersionStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        version.status = serializer.validated_data['status']
        version.save()

        return Response({
            'version_id': version.id,
            'version_number': version.version_number,
            'status': version.status,
        })


class SendForReviewView(APIView):
    """Save and send narrative for Landscaper review."""

    permission_classes = [AllowAny]

    def post(self, request, project_id, approach_type):
        serializer = SendForReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        create_payload = {
            'project_id': project_id,
            'approach_type': approach_type,
            'content': data['content'],
            'content_html': data.get('content_html'),
            'content_plain': data.get('content_plain'),
            'status': 'under_review',
        }

        with transaction.atomic():
            version = NarrativeVersionCreateSerializer(data=create_payload)
            version.is_valid(raise_exception=True)
            version = version.save()

            for comment in data.get('comments', []) or []:
                comment_text = comment.get('text') or comment.get('comment_text') or ''
                NarrativeComment.objects.create(
                    version=version,
                    comment_text=comment_text,
                    position_start=comment.get('position_start', 0),
                    position_end=comment.get('position_end', 0),
                    is_question=comment.get('is_question', comment_text.strip().endswith('?')),
                )

            for change in data.get('changes', []) or []:
                NarrativeChange.objects.create(
                    version=version,
                    change_type=change.get('type') or change.get('change_type', 'addition'),
                    original_text=change.get('original_text'),
                    new_text=change.get('new_text'),
                    position_start=change.get('position_start', 0),
                    position_end=change.get('position_end', 0),
                )

        return Response({
            'version_id': version.id,
            'version_number': version.version_number,
            'status': version.status,
            'message': 'Sent to Landscaper for review',
        })


class ReviewStatusView(APIView):
    """Check if Landscaper response is ready."""

    permission_classes = [AllowAny]

    def get(self, request, project_id, approach_type):
        version = NarrativeVersion.objects.filter(
            project_id=project_id,
            approach_type=approach_type,
            status='under_review'
        ).order_by('-version_number').first()

        if not version:
            return Response({'status': 'pending'})

        response = LandscaperService.review_changes(version.id)
        return Response({
            'status': 'ready',
            'response': response,
        })


class ApplyChangesView(APIView):
    """Accept Landscaper edits and create a new draft version."""

    permission_classes = [AllowAny]

    def post(self, request, project_id, approach_type):
        serializer = ApplyChangesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        latest = NarrativeVersion.objects.filter(
            project_id=project_id,
            approach_type=approach_type
        ).order_by('-version_number').first()

        if not latest:
            return Response({'detail': 'No narrative found.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            if payload.get('accept_suggested_content') and payload.get('suggested_content') is not None:
                next_content = payload['suggested_content']
                next_content_html = payload.get('content_html', latest.content_html)
                next_content_plain = payload.get('content_plain', latest.content_plain)
            else:
                next_content = latest.content
                next_content_html = latest.content_html
                next_content_plain = latest.content_plain

            new_version = NarrativeVersionCreateSerializer(data={
                'project_id': project_id,
                'approach_type': approach_type,
                'content': next_content,
                'content_html': next_content_html,
                'content_plain': next_content_plain,
                'status': 'draft',
            })
            new_version.is_valid(raise_exception=True)
            new_version = new_version.save()

            now = timezone.now()
            NarrativeComment.objects.filter(version=latest, is_resolved=False).update(
                is_resolved=True,
                resolved_at=now,
            )
            NarrativeChange.objects.filter(version=latest, is_accepted=False).update(
                is_accepted=True,
                accepted_at=now,
            )

        return Response({
            'version_id': new_version.id,
            'version_number': new_version.version_number,
            'status': new_version.status,
            'message': 'Changes applied successfully',
        })


class FollowUpView(APIView):
    """Send a follow-up question in review."""

    permission_classes = [AllowAny]

    def post(self, request, project_id, approach_type):
        serializer = FollowUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.validated_data['message']
        version_id = serializer.validated_data.get('version_id')

        response = LandscaperService.review_follow_up(version_id, message)
        return Response({
            'status': 'ready',
            'response': response,
        })
