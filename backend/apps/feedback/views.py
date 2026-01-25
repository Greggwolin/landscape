"""
ViewSet for tester feedback.
"""

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone

from .models import TesterFeedback
from .serializers import TesterFeedbackSerializer, TesterFeedbackCreateSerializer


class TesterFeedbackViewSet(viewsets.ModelViewSet):
    """
    ViewSet for tester feedback.

    - Admin users can see all feedback and update any record
    - Regular users can only see their own feedback and create new
    """

    serializer_class = TesterFeedbackSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Admin sees all feedback.
        Regular users see only their own.
        """
        user = self.request.user

        if user.is_admin:
            return TesterFeedback.objects.all().select_related('user', 'resolved_by')
        else:
            return TesterFeedback.objects.filter(user=user).select_related('user')

    def get_serializer_class(self):
        """Use create serializer for POST requests."""
        if self.action == 'create':
            return TesterFeedbackCreateSerializer
        return TesterFeedbackSerializer

    def perform_create(self, serializer):
        """Automatically set the user to the authenticated user."""
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """
        Handle resolution status changes.
        Only admin can update feedback.
        """
        user = self.request.user

        if not user.is_admin:
            raise PermissionDenied("Only administrators can update feedback.")

        instance = self.get_object()

        # Check if resolving/unresolving
        is_resolved = serializer.validated_data.get('is_resolved')

        if is_resolved is not None:
            if is_resolved and not instance.is_resolved:
                # Marking as resolved
                serializer.save(
                    resolved_at=timezone.now(),
                    resolved_by=user
                )
            elif not is_resolved and instance.is_resolved:
                # Reopening
                serializer.save(
                    resolved_at=None,
                    resolved_by=None
                )
            else:
                serializer.save()
        else:
            serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Only admin can delete feedback."""
        if not request.user.is_admin:
            return Response(
                {'error': 'Only administrators can delete feedback.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)
