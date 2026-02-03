"""
ViewSets and views for tester feedback and changelog.
"""

import re
from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from django.db.models import Q

from .models import TesterFeedback, Changelog
from .serializers import (
    TesterFeedbackSerializer,
    TesterFeedbackCreateSerializer,
    TesterFeedbackLogSerializer,
    TesterFeedbackAdminSerializer,
    FeedbackSubmitSerializer,
    FeedbackCheckDuplicateSerializer,
    ChangelogSerializer,
    ChangelogPublicSerializer,
)


# Keywords for rule-based classification
BUG_KEYWORDS = [
    'bug', 'error', 'broken', 'crash', 'fail', 'not working', "doesn't work",
    "won't", 'issue', 'problem', '404', '500', 'exception', 'freeze', 'stuck',
    'missing', 'disappeared', 'gone', 'lost', 'incorrect', 'wrong', 'invalid',
]
FEATURE_KEYWORDS = [
    'feature', 'request', 'add', 'want', 'wish', 'would be nice', 'should',
    'could you', 'can you add', 'suggestion', 'idea', 'enhance', 'improve',
    'new', 'ability to', 'option to', 'support for',
]
UX_KEYWORDS = [
    'confusing', 'confused', 'unclear', 'hard to', 'difficult', "don't understand",
    "can't find", 'where is', 'how do i', 'intuitive', 'ux', 'ui', 'interface',
    'layout', 'design', 'navigation', 'menu',
]
QUESTION_KEYWORDS = [
    'how', 'what', 'where', 'when', 'why', 'can i', 'is there', 'does it',
    'help', 'explain', 'clarify', '?',
]


def classify_feedback(message: str) -> str:
    """
    Rule-based classification of feedback into categories.
    Returns one of: bug, feature_request, ux_confusion, question
    """
    message_lower = message.lower()

    # Score each category
    scores = {
        'bug': sum(1 for kw in BUG_KEYWORDS if kw in message_lower),
        'feature_request': sum(1 for kw in FEATURE_KEYWORDS if kw in message_lower),
        'ux_confusion': sum(1 for kw in UX_KEYWORDS if kw in message_lower),
        'question': sum(1 for kw in QUESTION_KEYWORDS if kw in message_lower),
    }

    # Return highest scoring category, default to 'bug' if tie or no matches
    max_score = max(scores.values())
    if max_score == 0:
        return 'bug'  # Default assumption for feedback

    for category, score in scores.items():
        if score == max_score:
            return category

    return 'bug'


def extract_affected_module(page_path: str, message: str) -> str:
    """
    Extract affected module from page path and message context.
    """
    # Map common paths to friendly module names
    module_map = {
        '/projects/': 'Project',
        '/valuation': 'Valuation',
        '/budget': 'Budget',
        '/sales': 'Sales',
        '/map': 'Map',
        '/documents': 'Documents',
        '/settings': 'Settings',
        '/admin': 'Admin',
        '/landscaper': 'Landscaper',
        '/capitalization': 'Capitalization',
        '/contacts': 'Contacts',
        '/acquisition': 'Acquisition',
        '/napkin': 'Napkin Analysis',
        '/dashboard': 'Dashboard',
        '/studio': 'Studio',
    }

    # Find matching module from path
    for path_part, module_name in module_map.items():
        if path_part in page_path:
            return module_name

    # Default to path-based extraction
    parts = page_path.strip('/').split('/')
    if parts:
        return parts[-1].replace('-', ' ').title()

    return 'General'


def generate_summary(message: str, category: str, affected_module: str) -> str:
    """
    Generate a concise summary of the feedback.
    For alpha, this is a simple extraction. Could be AI-powered later.
    """
    # Truncate message if too long
    if len(message) > 200:
        summary = message[:197] + '...'
    else:
        summary = message

    return summary


def find_duplicate(message: str, affected_module: str) -> TesterFeedback | None:
    """
    Check for existing similar feedback items.
    Uses module match + keyword overlap.
    """
    # Get recent unaddressed feedback in the same module
    candidates = TesterFeedback.objects.filter(
        affected_module=affected_module,
        status__in=['submitted', 'under_review']
    ).order_by('-created_at')[:50]

    if not candidates:
        return None

    # Simple keyword overlap check
    message_words = set(re.findall(r'\w+', message.lower()))

    for candidate in candidates:
        candidate_words = set(re.findall(r'\w+', (candidate.message or '').lower()))
        # Calculate Jaccard similarity
        if candidate_words:
            overlap = len(message_words & candidate_words)
            union = len(message_words | candidate_words)
            similarity = overlap / union if union > 0 else 0

            # If similarity > 50%, consider it a duplicate
            if similarity > 0.5:
                return candidate

    return None


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
            return TesterFeedback.objects.all().select_related('user')
        else:
            return TesterFeedback.objects.filter(user=user).select_related('user')

    def get_serializer_class(self):
        """Use appropriate serializer based on action and user."""
        if self.action == 'create':
            return TesterFeedbackCreateSerializer
        if self.action == 'my_feedback':
            return TesterFeedbackLogSerializer
        if self.request.user.is_admin:
            return TesterFeedbackAdminSerializer
        return TesterFeedbackSerializer

    def perform_create(self, serializer):
        """Automatically set the user to the authenticated user."""
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """
        Handle status changes and admin responses.
        Only admin can update feedback.
        """
        user = self.request.user

        if not user.is_admin:
            raise PermissionDenied("Only administrators can update feedback.")

        instance = self.get_object()

        # Check if admin is responding
        admin_response = serializer.validated_data.get('admin_response')
        if admin_response and admin_response != instance.admin_response:
            serializer.save(admin_responded_at=timezone.now())
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

    @action(detail=False, methods=['get'], url_path='my')
    def my_feedback(self, request):
        """
        Get current user's feedback items for the Feedback Log.
        Returns limited fields suitable for tester view.
        """
        feedback = TesterFeedback.objects.filter(
            user=request.user
        ).order_by('-created_at')

        serializer = TesterFeedbackLogSerializer(feedback, many=True)
        return Response(serializer.data)


class FeedbackSubmitView(views.APIView):
    """
    POST /api/feedback/submit/

    New endpoint for submitting feedback with Landscaper processing.
    Handles classification, summary generation, and deduplication.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FeedbackSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        message = data['message']
        page_path = data['page_path']

        # Classify the feedback
        category = classify_feedback(message)

        # Extract affected module
        affected_module = extract_affected_module(page_path, message)

        # Generate summary
        landscaper_summary = generate_summary(message, category, affected_module)

        # Check for duplicates
        duplicate = find_duplicate(message, affected_module)

        if duplicate:
            # Increment report count on existing item
            duplicate.increment_report_count()

            return Response({
                'status': 'duplicate',
                'message': 'This appears to be a known issue that has already been reported. '
                           'You will be notified in your Feedback Log when it is resolved.',
                'existing_id': duplicate.id,
                'report_count': duplicate.report_count,
            }, status=status.HTTP_200_OK)

        # Create new feedback item
        feedback = TesterFeedback.objects.create(
            user=request.user,
            message=message,
            page_url=data['page_url'],
            page_path=page_path,
            project_id=data.get('project_id'),
            project_name=data.get('project_name'),
            category=category,
            affected_module=affected_module,
            landscaper_summary=landscaper_summary,
            landscaper_raw_chat=data.get('chat_history', []),
            browser_context=data.get('browser_context', {}),
            feedback_type=self._category_to_feedback_type(category),
            status='submitted',
        )

        return Response({
            'status': 'created',
            'message': f"I've logged your feedback about {affected_module}. "
                       "You can track its status in your Feedback Log.",
            'feedback_id': feedback.id,
            'category': category,
            'affected_module': affected_module,
        }, status=status.HTTP_201_CREATED)

    def _category_to_feedback_type(self, category: str) -> str:
        """Map new category to legacy feedback_type."""
        mapping = {
            'bug': 'bug',
            'feature_request': 'feature',
            'ux_confusion': 'general',
            'question': 'question',
        }
        return mapping.get(category, 'general')


class FeedbackCheckDuplicateView(views.APIView):
    """
    POST /api/feedback/check-duplicate/

    Check if similar feedback already exists before submitting.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FeedbackCheckDuplicateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data['message']
        affected_module = serializer.validated_data.get('affected_module')

        if not affected_module:
            # Try to extract from current page
            affected_module = 'General'

        duplicate = find_duplicate(message, affected_module)

        if duplicate:
            return Response({
                'is_duplicate': True,
                'existing_id': duplicate.id,
                'existing_summary': duplicate.landscaper_summary or duplicate.message[:100],
                'report_count': duplicate.report_count,
            })

        return Response({'is_duplicate': False})


class ChangelogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for changelog entries.

    - Public users see only published entries
    - Admin can create/edit all entries
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter based on user role."""
        if self.request.user.is_admin:
            return Changelog.objects.all()
        return Changelog.objects.filter(is_published=True)

    def get_serializer_class(self):
        """Use public serializer for non-admin users."""
        if self.request.user.is_admin:
            return ChangelogSerializer
        return ChangelogPublicSerializer

    def create(self, request, *args, **kwargs):
        """Only admin can create changelog entries."""
        if not request.user.is_admin:
            return Response(
                {'error': 'Only administrators can create changelog entries.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Only admin can update changelog entries."""
        if not request.user.is_admin:
            return Response(
                {'error': 'Only administrators can update changelog entries.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Only admin can delete changelog entries."""
        if not request.user.is_admin:
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
