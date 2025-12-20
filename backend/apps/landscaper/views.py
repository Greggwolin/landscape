"""
ViewSets and API views for Landscaper AI endpoints.

Provides:
- Chat message history retrieval and creation
- AI response generation (stubbed for Phase 6)
- Variance calculation between AI advice and actual values
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.db.models import Q
from decimal import Decimal
from .models import ChatMessage, LandscaperAdvice, ActivityItem
from .serializers import (
    ChatMessageSerializer,
    ChatMessageCreateSerializer,
    LandscaperAdviceSerializer,
    VarianceItemSerializer,
    ActivityItemSerializer,
    ActivityItemCreateSerializer,
)
from .ai_handler import get_landscaper_response
from .tool_executor import execute_tool


class ChatMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for chat messages.

    Endpoints:
    - GET /api/projects/{project_id}/landscaper/chat/ - Get message history
    - POST /api/projects/{project_id}/landscaper/chat/ - Send message, get AI response
    """

    queryset = ChatMessage.objects.select_related('project', 'user')
    serializer_class = ChatMessageSerializer
    permission_classes = [AllowAny]  # Called from Next.js backend

    def get_queryset(self):
        """Filter messages by project_id from URL."""
        project_id = self.kwargs.get('project_id')
        if project_id:
            # Return last 100 messages in chronological order
            return self.queryset.filter(
                project_id=project_id
            ).order_by('timestamp')[:100]
        return self.queryset.none()

    def list(self, request, *args, **kwargs):
        """GET chat history for a project."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'messages': serializer.data,
            'count': len(serializer.data)
        })

    def create(self, request, *args, **kwargs):
        """
        POST new message and get AI response.

        Request body:
        {
            "content": "User message text",
            "user": user_id (optional)
        }

        Response:
        {
            "user_message": {...},
            "assistant_message": {...},
            "success": true
        }
        """
        project_id = self.kwargs.get('project_id')

        try:
            # Create user message
            user_message_data = {
                'project': project_id,
                'user': request.data.get('user'),
                'role': 'user',
                'content': request.data.get('content', ''),
            }
            user_message_serializer = ChatMessageCreateSerializer(data=user_message_data)
            user_message_serializer.is_valid(raise_exception=True)
            user_message = user_message_serializer.save()

            # Get chat history for context
            messages = self.get_queryset()
            message_history = [
                {'role': msg.role, 'content': msg.content}
                for msg in messages
            ]

            # Get project context with full details
            from apps.projects.models import Project
            project = Project.objects.get(project_id=project_id)
            project_context = {
                'project_id': project.project_id,
                'project_name': project.project_name,
                'project_type': project.project_type or 'Unknown',
                'project_details': {
                    'address': getattr(project, 'address', None),
                    'city': getattr(project, 'city', None),
                    'state': getattr(project, 'state', None),
                    'county': getattr(project, 'county', None),
                    'zip_code': getattr(project, 'zip_code', None),
                    'total_acres': getattr(project, 'total_acres', None),
                    'total_lots': getattr(project, 'total_lots', None),
                }
            }

            # Create tool executor bound to this project
            def tool_executor_fn(tool_name, tool_input, project_id=None):
                return execute_tool(tool_name, tool_input, project_id or project.project_id)

            # Generate AI response with tool support
            ai_response = get_landscaper_response(
                message_history,
                project_context,
                tool_executor=tool_executor_fn
            )

            # Include tool calls and field updates in metadata
            assistant_metadata = ai_response.get('metadata', {})
            if ai_response.get('tool_calls'):
                assistant_metadata['tool_calls'] = ai_response['tool_calls']
            if ai_response.get('field_updates'):
                assistant_metadata['field_updates'] = ai_response['field_updates']

            # Create assistant message
            assistant_message_data = {
                'project': project_id,
                'user': None,  # Assistant messages don't have a user
                'role': 'assistant',
                'content': ai_response['content'],
                'metadata': assistant_metadata,
            }
            assistant_message_serializer = ChatMessageCreateSerializer(data=assistant_message_data)
            assistant_message_serializer.is_valid(raise_exception=True)
            assistant_message = assistant_message_serializer.save()

            # Optionally create advice records if suggested_values exist
            suggested_values = ai_response.get('metadata', {}).get('suggested_values', {})
            if suggested_values:
                self._create_advice_records(
                    project_id,
                    assistant_message.message_id,
                    suggested_values
                )

            # Return both messages with field update info
            response_data = {
                'success': True,
                'user_message': ChatMessageSerializer(user_message).data,
                'assistant_message': ChatMessageSerializer(assistant_message).data,
            }

            # Include field updates at top level for easy access
            if ai_response.get('field_updates'):
                response_data['field_updates'] = ai_response['field_updates']

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _create_advice_records(self, project_id, message_id, suggested_values):
        """Create LandscaperAdvice records from AI suggestions."""
        for key, data in suggested_values.items():
            LandscaperAdvice.objects.create(
                project_id=project_id,
                message_id=message_id,
                assumption_key=key,
                lifecycle_stage=data.get('stage', 'PLANNING'),
                suggested_value=data.get('value', Decimal('0')),
                confidence_level=data.get('confidence', 'medium'),
                notes=data.get('notes'),
            )


class VarianceView(APIView):
    """
    Calculate variances between AI advice and actual project values.

    GET /api/projects/{project_id}/landscaper/variances/?threshold=10

    Query params:
    - threshold: int (0-50) - Only show variances above this percentage (default: 10)

    Response:
    {
        "variances": [
            {
                "assumption_key": "land_price_per_acre",
                "lifecycle_stage": "ACQUISITION",
                "suggested_value": 75000.00,
                "actual_value": 85000.00,
                "variance_percent": 13.33,
                "confidence_level": "medium",
                "advice_date": "2025-11-20T...",
                "notes": "..."
            }
        ],
        "threshold": 10,
        "count": 1
    }
    """
    permission_classes = [AllowAny]  # Called from Next.js backend

    def get(self, request, project_id):
        """Calculate and return variances above threshold."""
        try:
            threshold = float(request.query_params.get('threshold', 10))
            threshold = max(0, min(threshold, 50))  # Clamp to 0-50%

            # Get all advice for this project
            advice_records = LandscaperAdvice.objects.filter(
                project_id=project_id
            ).order_by('-created_at')

            variances = []
            for advice in advice_records:
                # Get actual value from project (stubbed for Phase 6)
                actual_value = self._get_actual_value(project_id, advice.assumption_key)

                if actual_value is not None:
                    # Calculate variance percentage
                    variance_percent = abs(
                        (actual_value - advice.suggested_value) / advice.suggested_value * 100
                    )

                    # Only include if above threshold
                    if variance_percent >= threshold:
                        variances.append({
                            'assumption_key': advice.assumption_key,
                            'lifecycle_stage': advice.lifecycle_stage,
                            'suggested_value': advice.suggested_value,
                            'actual_value': actual_value,
                            'variance_percent': round(variance_percent, 2),
                            'confidence_level': advice.confidence_level,
                            'advice_date': advice.created_at,
                            'notes': advice.notes,
                        })

            serializer = VarianceItemSerializer(variances, many=True)

            return Response({
                'variances': serializer.data,
                'threshold': threshold,
                'count': len(serializer.data),
            })

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_actual_value(self, project_id, assumption_key):
        """
        Get actual value from project data.

        PHASE 6 STUB: Returns placeholder values for demonstration.
        Phase 7+: Query actual project budget/assumptions.
        """
        # TODO: Query real project data based on assumption_key
        # For now, return stub values to demonstrate variance calculation

        stub_actuals = {
            'land_price_per_acre': Decimal('85000.00'),  # 13% variance from suggestion
            'grading_cost_per_sf': Decimal('2.75'),      # 10% variance
            'contingency_percent': Decimal('5.0'),       # 33% variance
        }

        return stub_actuals.get(assumption_key)


class ActivityFeedViewSet(viewsets.ModelViewSet):
    """
    ViewSet for activity feed items.

    Endpoints:
    - GET /api/projects/{project_id}/landscaper/activities/ - Get activities
    - POST /api/projects/{project_id}/landscaper/activities/ - Create activity
    - PATCH /api/projects/{project_id}/landscaper/activities/{id}/read/ - Mark as read
    """

    queryset = ActivityItem.objects.select_related('project')
    serializer_class = ActivityItemSerializer
    permission_classes = [AllowAny]  # Called from Next.js backend

    def get_queryset(self):
        """Filter activities by project_id from URL."""
        project_id = self.kwargs.get('project_id')
        if project_id:
            return self.queryset.filter(
                project_id=project_id
            ).order_by('-created_at')
        return self.queryset.none()

    def list(self, request, *args, **kwargs):
        """GET activity feed for a project."""
        queryset = self.get_queryset()
        # Get unread count before slicing
        unread_count = queryset.filter(is_read=False).count()
        # Limit to 50 items for display
        items = list(queryset[:50])
        serializer = self.get_serializer(items, many=True)

        return Response({
            'activities': serializer.data,
            'count': len(serializer.data),
            'unread_count': unread_count,
        })

    def create(self, request, *args, **kwargs):
        """POST new activity item."""
        project_id = self.kwargs.get('project_id')

        try:
            data = {
                **request.data,
                'project': project_id,
            }
            serializer = ActivityItemCreateSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            activity = serializer.save()

            return Response({
                'success': True,
                'activity': ActivityItemSerializer(activity).data,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, project_id=None, pk=None):
        """Mark a specific activity as read."""
        try:
            activity = ActivityItem.objects.get(
                activity_id=pk,
                project_id=project_id
            )
            activity.is_read = True
            activity.save()

            return Response({
                'success': True,
                'activity': ActivityItemSerializer(activity).data,
            })
        except ActivityItem.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Activity not found'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request, project_id=None):
        """Mark all activities for a project as read."""
        try:
            count = ActivityItem.objects.filter(
                project_id=project_id,
                is_read=False
            ).update(is_read=True)

            return Response({
                'success': True,
                'updated_count': count,
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_activity_from_extraction(project_id: int, extraction_data: dict) -> ActivityItem:
    """
    Generate an activity item from a document extraction result.

    Called after document extraction completes.

    Args:
        project_id: Project ID
        extraction_data: Dict with extraction results including:
            - doc_id: Document ID
            - doc_name: Document name
            - status: 'completed', 'partial', 'failed'
            - fields_extracted: Number of fields extracted
            - fields_missing: List of missing field names
            - confidence: Overall confidence score

    Returns:
        Created ActivityItem
    """
    doc_name = extraction_data.get('doc_name', 'Document')
    doc_status = extraction_data.get('status', 'pending')
    fields_extracted = extraction_data.get('fields_extracted', 0)
    fields_missing = extraction_data.get('fields_missing', [])
    confidence = extraction_data.get('confidence', 0)

    # Determine activity status based on extraction result
    if doc_status == 'completed' and confidence >= 0.8:
        status = 'complete'
        confidence_level = 'high'
        summary = f'{fields_extracted} fields extracted successfully'
    elif doc_status == 'completed':
        status = 'partial'
        confidence_level = 'medium' if confidence >= 0.5 else 'low'
        summary = f'{fields_extracted} fields extracted, {len(fields_missing)} need review'
    elif doc_status == 'partial':
        status = 'partial'
        confidence_level = 'low'
        summary = f'Partial extraction: {len(fields_missing)} fields missing'
    else:
        status = 'blocked'
        confidence_level = None
        summary = 'Extraction failed - manual entry required'

    # Create details list
    details = []
    if fields_extracted > 0:
        details.append(f'{fields_extracted} fields extracted')
    if fields_missing:
        details.append(f'Missing: {", ".join(fields_missing[:3])}{"..." if len(fields_missing) > 3 else ""}')
    if confidence:
        details.append(f'{int(confidence * 100)}% confidence')

    activity = ActivityItem.objects.create(
        project_id=project_id,
        activity_type='update',
        title=doc_name[:50],
        summary=summary,
        status=status,
        confidence=confidence_level,
        link='/documents',
        details=details,
        highlight_fields=fields_missing[:5] if fields_missing else None,
        source_type='document',
        source_id=str(extraction_data.get('doc_id', '')),
    )

    return activity
