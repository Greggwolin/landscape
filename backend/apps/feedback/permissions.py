"""
Custom permissions for the feedback app.
"""

from django.conf import settings
from rest_framework.permissions import BasePermission


class HasFeedbackDashboardToken(BasePermission):
    """
    Shared-secret header auth for the feedback-dashboard endpoint.

    Used by the scheduled-task skill (no user session). Header name:
    X-Feedback-Token. Secret stored in settings.FEEDBACK_DASHBOARD_TOKEN
    (loaded from the FEEDBACK_DASHBOARD_TOKEN env var). An empty/missing
    settings value blocks all access — there is no fallback.
    """

    def has_permission(self, request, view):
        expected = getattr(settings, 'FEEDBACK_DASHBOARD_TOKEN', None)
        if not expected:
            return False
        supplied = request.headers.get('X-Feedback-Token')
        return bool(supplied) and supplied == expected
