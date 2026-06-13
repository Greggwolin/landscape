"""
ViewSets for the changelog API.

The tester_feedback surface (TesterFeedbackViewSet, FeedbackSubmitView,
FeedbackCheckDuplicateView, and the rule-based classifier helpers) was retired in
LSCMD-FBUNIFY-0613-qz. Feedback now reads/writes landscape.tbl_feedback directly
via apps.feedback.views_canonical. Only the changelog viewset remains here.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Changelog
from .serializers import ChangelogSerializer, ChangelogPublicSerializer


class ChangelogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for changelog entries.

    - list / retrieve / current-version are public (no auth)
    - create / update / delete require admin
    """

    def get_permissions(self):
        """Read actions are public; write actions require admin auth."""
        if self.action in ('list', 'retrieve', 'current_version'):
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """Filter based on user role."""
        if self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'is_admin', False):
            return Changelog.objects.all()
        return Changelog.objects.filter(is_published=True)

    def get_serializer_class(self):
        """Use public serializer for non-admin users."""
        if self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'is_admin', False):
            return ChangelogSerializer
        return ChangelogPublicSerializer

    def create(self, request, *args, **kwargs):
        """Only admin can create changelog entries."""
        if not getattr(request.user, 'is_admin', False):
            return Response(
                {'error': 'Only administrators can create changelog entries.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Only admin can update changelog entries."""
        if not getattr(request.user, 'is_admin', False):
            return Response(
                {'error': 'Only administrators can update changelog entries.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Only admin can delete changelog entries."""
        if not getattr(request.user, 'is_admin', False):
            return Response(
                {'error': 'Only administrators can delete changelog entries.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='current-version')
    def current_version(self, request):
        """
        GET /api/changelog/current-version/

        Returns the current (latest published) version string.
        Public endpoint — no auth required.
        """
        latest = Changelog.objects.filter(is_published=True).first()

        if latest:
            return Response({
                'version': latest.version,
                'deployed_at': latest.deployed_at,
            })

        # Default version if no changelog exists
        return Response({
            'version': 'v0.1.0-alpha',
            'deployed_at': None,
        })
