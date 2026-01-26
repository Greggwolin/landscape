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
from django.db.models import Q, Count, Avg
from django.db import connection
from django.utils import timezone
from decimal import Decimal
from .models import ChatMessage, LandscaperAdvice, ActivityItem, ExtractionMapping, ExtractionLog
from .serializers import (
    ChatMessageSerializer,
    ChatMessageCreateSerializer,
    LandscaperAdviceSerializer,
    VarianceItemSerializer,
    ActivityItemSerializer,
    ActivityItemCreateSerializer,
    ExtractionMappingSerializer,
    ExtractionMappingCreateSerializer,
    ExtractionLogSerializer,
    ExtractionLogReviewSerializer,
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


class ExtractionMappingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for extraction field mappings.

    Endpoints:
    - GET /api/landscaper/mappings/ - List mappings with filters
    - POST /api/landscaper/mappings/ - Create new mapping
    - GET /api/landscaper/mappings/{id}/ - Get single mapping
    - PUT /api/landscaper/mappings/{id}/ - Update mapping
    - DELETE /api/landscaper/mappings/{id}/ - Delete (user-created only)
    - GET /api/landscaper/mappings/stats/ - Get mappings with usage stats
    - POST /api/landscaper/mappings/bulk-toggle/ - Toggle multiple active
    - GET /api/landscaper/mappings/document-types/ - Get doc types with counts
    - GET /api/landscaper/mappings/target-tables/ - Get tables with counts
    """

    queryset = ExtractionMapping.objects.all()
    serializer_class = ExtractionMappingSerializer
    permission_classes = [AllowAny]  # Called from Next.js backend

    def get_queryset(self):
        """Filter mappings based on query params."""
        queryset = self.queryset

        # Filter by document_type
        doc_type = self.request.query_params.get('document_type')
        if doc_type:
            queryset = queryset.filter(document_type=doc_type)

        # Filter by target_table
        target_table = self.request.query_params.get('target_table')
        if target_table:
            queryset = queryset.filter(target_table=target_table)

        # Filter by confidence
        confidence = self.request.query_params.get('confidence')
        if confidence:
            queryset = queryset.filter(confidence=confidence)

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Search by pattern, table, or field
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(source_pattern__icontains=search) |
                Q(target_table__icontains=search) |
                Q(target_field__icontains=search)
            )

        return queryset.order_by('document_type', 'source_pattern')

    def list(self, request, *args, **kwargs):
        """GET list of mappings."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        return Response({
            'mappings': serializer.data,
            'count': len(serializer.data),
        })

    def create(self, request, *args, **kwargs):
        """POST create new mapping."""
        serializer = ExtractionMappingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # User-created mappings are not system mappings
        mapping = serializer.save(is_system=False)

        return Response({
            'success': True,
            'mapping': ExtractionMappingSerializer(mapping).data,
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """PUT update mapping."""
        instance = self.get_object()
        serializer = ExtractionMappingCreateSerializer(
            instance, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        mapping = serializer.save()

        return Response({
            'success': True,
            'mapping': ExtractionMappingSerializer(mapping).data,
        })

    def destroy(self, request, *args, **kwargs):
        """DELETE mapping (user-created only)."""
        instance = self.get_object()

        # Prevent deletion of system mappings
        if instance.is_system:
            return Response({
                'success': False,
                'error': 'System mappings cannot be deleted. You can deactivate them instead.',
            }, status=status.HTTP_403_FORBIDDEN)

        instance.delete()
        return Response({
            'success': True,
            'message': 'Mapping deleted successfully',
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """GET mappings with usage statistics from the stats view."""
        try:
            # Query the stats view directly
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        mapping_id,
                        document_type,
                        source_pattern,
                        target_table,
                        target_field,
                        confidence,
                        is_active,
                        times_extracted,
                        projects_used,
                        documents_processed,
                        avg_confidence_score,
                        write_rate,
                        acceptance_rate,
                        last_used_at
                    FROM landscape.vw_extraction_mapping_stats
                    ORDER BY document_type, source_pattern
                """)
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()

            # Build response with stats
            mappings_with_stats = []
            for row in rows:
                stat_dict = dict(zip(columns, row))
                # Get full mapping data
                try:
                    mapping = ExtractionMapping.objects.get(mapping_id=stat_dict['mapping_id'])
                    mapping_data = ExtractionMappingSerializer(mapping).data
                    # Overlay stats
                    mapping_data.update({
                        'times_extracted': stat_dict.get('times_extracted', 0),
                        'projects_used': stat_dict.get('projects_used', 0),
                        'documents_processed': stat_dict.get('documents_processed', 0),
                        'avg_confidence_score': float(stat_dict['avg_confidence_score']) if stat_dict.get('avg_confidence_score') else None,
                        'write_rate': float(stat_dict['write_rate']) if stat_dict.get('write_rate') else None,
                        'acceptance_rate': float(stat_dict['acceptance_rate']) if stat_dict.get('acceptance_rate') else None,
                        'last_used_at': stat_dict.get('last_used_at').isoformat() if stat_dict.get('last_used_at') else None,
                    })
                    mappings_with_stats.append(mapping_data)
                except ExtractionMapping.DoesNotExist:
                    pass

            return Response({
                'mappings': mappings_with_stats,
                'count': len(mappings_with_stats),
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='bulk-toggle')
    def bulk_toggle(self, request):
        """POST toggle active status for multiple mappings."""
        mapping_ids = request.data.get('mapping_ids', [])
        is_active = request.data.get('is_active', True)

        if not mapping_ids:
            return Response({
                'success': False,
                'error': 'No mapping_ids provided',
            }, status=status.HTTP_400_BAD_REQUEST)

        updated_count = ExtractionMapping.objects.filter(
            mapping_id__in=mapping_ids
        ).update(is_active=is_active, updated_at=timezone.now())

        return Response({
            'success': True,
            'updated_count': updated_count,
        })

    @action(detail=False, methods=['get'], url_path='document-types')
    def document_types(self, request):
        """GET list of document types with counts."""
        type_counts = ExtractionMapping.objects.values('document_type').annotate(
            count=Count('mapping_id'),
            active_count=Count('mapping_id', filter=Q(is_active=True))
        ).order_by('document_type')

        return Response({
            'document_types': list(type_counts),
        })

    @action(detail=False, methods=['get'], url_path='target-tables')
    def target_tables(self, request):
        """GET list of target tables with counts."""
        table_counts = ExtractionMapping.objects.values('target_table').annotate(
            count=Count('mapping_id'),
            active_count=Count('mapping_id', filter=Q(is_active=True))
        ).order_by('target_table')

        return Response({
            'target_tables': list(table_counts),
        })


class ExtractionLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for extraction logs.

    Endpoints:
    - GET /api/landscaper/logs/ - List logs with filters
    - GET /api/landscaper/logs/{id}/ - Get single log
    - POST /api/landscaper/logs/{id}/review/ - Accept/reject extraction
    """

    queryset = ExtractionLog.objects.select_related('mapping', 'project')
    serializer_class = ExtractionLogSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter logs based on query params."""
        queryset = self.queryset

        # Filter by project
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Filter by document
        doc_id = self.request.query_params.get('doc_id')
        if doc_id:
            queryset = queryset.filter(doc_id=doc_id)

        # Filter by mapping
        mapping_id = self.request.query_params.get('mapping_id')
        if mapping_id:
            queryset = queryset.filter(mapping_id=mapping_id)

        # Filter by review status
        review_status = self.request.query_params.get('review_status')
        if review_status == 'pending':
            queryset = queryset.filter(was_accepted__isnull=True)
        elif review_status == 'accepted':
            queryset = queryset.filter(was_accepted=True)
        elif review_status == 'rejected':
            queryset = queryset.filter(was_accepted=False)

        return queryset.order_by('-extracted_at')

    def list(self, request, *args, **kwargs):
        """GET list of extraction logs."""
        queryset = self.get_queryset()[:100]  # Limit to 100 most recent
        serializer = self.get_serializer(queryset, many=True)

        return Response({
            'logs': serializer.data,
            'count': len(serializer.data),
        })

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """POST accept or reject an extraction."""
        try:
            log = self.get_object()

            serializer = ExtractionLogReviewSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            log.was_accepted = serializer.validated_data['was_accepted']
            log.rejection_reason = serializer.validated_data.get('rejection_reason', '')
            log.reviewed_at = timezone.now()
            # log.reviewed_by = request.user if request.user.is_authenticated else None
            log.save()

            return Response({
                'success': True,
                'log': ExtractionLogSerializer(log).data,
            })

        except ExtractionLog.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Log not found',
            }, status=status.HTTP_404_NOT_FOUND)


# =============================================================================
# Mutation Management Views (Level 2 Autonomy)
# =============================================================================

class PendingMutationsView(APIView):
    """
    Get all pending mutations for a project.

    GET /api/landscaper/projects/{project_id}/mutations/pending/

    Response:
    {
        "success": true,
        "mutations": [...],
        "count": 5
    }
    """
    permission_classes = [AllowAny]

    def get(self, request, project_id):
        """Get all pending mutations for a project."""
        try:
            from .services.mutation_service import MutationService

            mutations = MutationService.get_pending_for_project(project_id)

            # Format for frontend
            formatted = []
            for m in mutations:
                formatted.append({
                    'mutationId': str(m['mutation_id']),
                    'mutationType': m['mutation_type'],
                    'table': m['table_name'],
                    'field': m['field_name'],
                    'recordId': m.get('record_id'),
                    'currentValue': m['current_value'],
                    'proposedValue': m['proposed_value'],
                    'reason': m['reason'],
                    'isHighRisk': m['is_high_risk'],
                    'createdAt': m['created_at'].isoformat() if m['created_at'] else None,
                    'expiresAt': m['expires_at'].isoformat() if m['expires_at'] else None,
                    'batchId': str(m['batch_id']) if m['batch_id'] else None,
                    'sourceMessageId': m.get('source_message_id'),
                })

            return Response({
                'success': True,
                'mutations': formatted,
                'count': len(formatted),
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConfirmMutationView(APIView):
    """
    Confirm and execute a pending mutation.

    POST /api/landscaper/mutations/{mutation_id}/confirm/

    Response:
    {
        "success": true,
        "mutationId": "...",
        "action": "confirmed",
        "result": {...}
    }
    """
    permission_classes = [AllowAny]

    def post(self, request, mutation_id):
        """Confirm and execute a pending mutation."""
        try:
            from .services.mutation_service import MutationService

            # Get user ID from request if available
            user_id = None
            if hasattr(request, 'user') and request.user.is_authenticated:
                user_id = request.user.email or str(request.user.id)

            result = MutationService.confirm_mutation(mutation_id, user_id)

            status_code = status.HTTP_200_OK if result.get('success') else status.HTTP_400_BAD_REQUEST
            return Response(result, status=status_code)

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RejectMutationView(APIView):
    """
    Reject a pending mutation.

    POST /api/landscaper/mutations/{mutation_id}/reject/

    Request body (optional):
    {
        "reason": "User-provided rejection reason"
    }

    Response:
    {
        "success": true,
        "mutationId": "...",
        "action": "rejected"
    }
    """
    permission_classes = [AllowAny]

    def post(self, request, mutation_id):
        """Reject a pending mutation."""
        try:
            from .services.mutation_service import MutationService

            user_id = None
            if hasattr(request, 'user') and request.user.is_authenticated:
                user_id = request.user.email or str(request.user.id)

            reason = request.data.get('reason') if request.data else None

            result = MutationService.reject_mutation(mutation_id, user_id, reason)

            status_code = status.HTTP_200_OK if result.get('success') else status.HTTP_400_BAD_REQUEST
            return Response(result, status=status_code)

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConfirmBatchView(APIView):
    """
    Confirm all mutations in a batch.

    POST /api/landscaper/mutations/batch/{batch_id}/confirm/

    Response:
    {
        "success": true,
        "batchId": "...",
        "results": [...],
        "confirmed": 3,
        "failed": 0
    }
    """
    permission_classes = [AllowAny]

    def post(self, request, batch_id):
        """Confirm all mutations in a batch."""
        try:
            from .services.mutation_service import MutationService

            user_id = None
            if hasattr(request, 'user') and request.user.is_authenticated:
                user_id = request.user.email or str(request.user.id)

            result = MutationService.confirm_batch(batch_id, user_id)

            status_code = status.HTTP_200_OK if result.get('success') else status.HTTP_400_BAD_REQUEST
            return Response(result, status=status_code)

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# Thread-based Chat Views (New Thread System)
# =============================================================================

class ChatThreadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for chat threads.

    Endpoints:
    - GET /api/landscaper/threads/?project_id=X&page_context=Y - List threads
    - POST /api/landscaper/threads/ - Create new thread
    - GET /api/landscaper/threads/{id}/ - Get thread with messages
    - PATCH /api/landscaper/threads/{id}/ - Update thread title
    - POST /api/landscaper/threads/{id}/close/ - Close thread
    """

    from .models import ChatThread
    from .serializers import (
        ChatThreadSerializer,
        ChatThreadDetailSerializer,
        ChatThreadCreateSerializer,
        ChatThreadUpdateSerializer,
    )

    queryset = ChatThread.objects.all()
    serializer_class = ChatThreadSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter threads based on query params."""
        from .models import ChatThread

        queryset = ChatThread.objects.all()

        # Filter by project_id (required for list)
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Filter by page_context
        page_context = self.request.query_params.get('page_context')
        if page_context:
            queryset = queryset.filter(page_context=page_context)

        # Filter by active status
        include_closed = self.request.query_params.get('include_closed', 'false').lower() == 'true'
        if not include_closed:
            queryset = queryset.filter(is_active=True)

        return queryset.order_by('-updated_at')

    def list(self, request, *args, **kwargs):
        """GET list of threads for a project."""
        from .serializers import ChatThreadSerializer

        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response({
                'success': False,
                'error': 'project_id query parameter is required',
            }, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.get_queryset()
        serializer = ChatThreadSerializer(queryset, many=True)

        return Response({
            'success': True,
            'threads': serializer.data,
            'count': len(serializer.data),
        })

    def retrieve(self, request, *args, **kwargs):
        """GET single thread with messages."""
        from .serializers import ChatThreadDetailSerializer

        instance = self.get_object()
        serializer = ChatThreadDetailSerializer(instance)

        return Response({
            'success': True,
            'thread': serializer.data,
        })

    def create(self, request, *args, **kwargs):
        """POST create new thread (or get existing active one)."""
        from .services.thread_service import ThreadService
        from .serializers import ChatThreadSerializer

        project_id = request.data.get('project_id')
        page_context = request.data.get('page_context')

        if not project_id or not page_context:
            return Response({
                'success': False,
                'error': 'project_id and page_context are required',
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get or create active thread for this context
            thread = ThreadService.get_or_create_active_thread(
                project_id=int(project_id),
                page_context=page_context,
                subtab_context=request.data.get('subtab_context')
            )

            return Response({
                'success': True,
                'thread': ChatThreadSerializer(thread).data,
                'created': thread.messages.count() == 0,  # True if newly created
            }, status=status.HTTP_201_CREATED if thread.messages.count() == 0 else status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def partial_update(self, request, *args, **kwargs):
        """PATCH update thread title."""
        from .serializers import ChatThreadSerializer, ChatThreadUpdateSerializer

        instance = self.get_object()
        serializer = ChatThreadUpdateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            'success': True,
            'thread': ChatThreadSerializer(instance).data,
        })

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """POST close a thread and generate summary."""
        from .services.thread_service import ThreadService
        from .serializers import ChatThreadSerializer

        try:
            thread = ThreadService.close_thread(pk, generate_summary=True)
            if thread:
                return Response({
                    'success': True,
                    'thread': ChatThreadSerializer(thread).data,
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Thread not found',
                }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='new')
    def start_new(self, request):
        """POST start a new thread (closes existing active thread first)."""
        from .services.thread_service import ThreadService
        from .serializers import ChatThreadSerializer

        project_id = request.data.get('project_id')
        page_context = request.data.get('page_context')

        if not project_id or not page_context:
            return Response({
                'success': False,
                'error': 'project_id and page_context are required',
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            thread = ThreadService.start_new_thread(
                project_id=int(project_id),
                page_context=page_context,
                subtab_context=request.data.get('subtab_context')
            )

            return Response({
                'success': True,
                'thread': ChatThreadSerializer(thread).data,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ThreadMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for thread messages.

    Endpoints:
    - GET /api/landscaper/threads/{thread_id}/messages/ - List messages
    - POST /api/landscaper/threads/{thread_id}/messages/ - Send message
    """

    from .models import ThreadMessage
    from .serializers import ThreadMessageSerializer, ThreadMessageCreateSerializer

    queryset = ThreadMessage.objects.all()
    serializer_class = ThreadMessageSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filter messages by thread_id from URL."""
        from .models import ThreadMessage

        thread_id = self.kwargs.get('thread_id')
        if thread_id:
            return ThreadMessage.objects.filter(
                thread_id=thread_id
            ).order_by('created_at')
        return ThreadMessage.objects.none()

    def list(self, request, *args, **kwargs):
        """GET messages for a thread."""
        from .serializers import ThreadMessageSerializer

        queryset = self.get_queryset()
        serializer = ThreadMessageSerializer(queryset, many=True)

        return Response({
            'success': True,
            'messages': serializer.data,
            'count': len(serializer.data),
        })

    def create(self, request, *args, **kwargs):
        """
        POST send a message and get AI response.

        Request body:
        {
            "content": "User message text"
        }

        Response:
        {
            "success": true,
            "user_message": {...},
            "assistant_message": {...}
        }
        """
        from .models import ChatThread, ThreadMessage
        from .serializers import ThreadMessageSerializer
        from .ai_handler import get_landscaper_response
        from .tool_executor import execute_tool
        from .services.thread_service import ThreadService
        from .services.embedding_service import EmbeddingService
        from apps.projects.models import Project

        thread_id = self.kwargs.get('thread_id')

        try:
            # Get thread
            thread = ChatThread.objects.get(id=thread_id)

            # Create user message
            user_message = ThreadMessage.objects.create(
                thread=thread,
                role='user',
                content=request.data.get('content', ''),
            )

            # Get message history for context
            messages = list(thread.messages.order_by('created_at')[:50])
            message_history = [
                {'role': msg.role, 'content': msg.content}
                for msg in messages
            ]

            # Get project context
            project = Project.objects.get(project_id=thread.project_id)
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

            # Get past conversation context for RAG
            chat_context = EmbeddingService.get_thread_context_for_rag(
                query=request.data.get('content', ''),
                project_id=thread.project_id,
                current_thread_id=thread.id,
                max_results=3
            )

            # Create tool executor bound to this project
            def tool_executor_fn(tool_name, tool_input, project_id=None):
                return execute_tool(tool_name, tool_input, project_id or project.project_id)

            # Generate AI response
            ai_response = get_landscaper_response(
                message_history,
                project_context,
                tool_executor=tool_executor_fn,
                additional_context=chat_context if chat_context else None
            )

            # Build metadata
            assistant_metadata = ai_response.get('metadata', {})
            if ai_response.get('tool_calls'):
                assistant_metadata['tool_calls'] = ai_response['tool_calls']
            if ai_response.get('field_updates'):
                assistant_metadata['field_updates'] = ai_response['field_updates']

            # Create assistant message
            assistant_message = ThreadMessage.objects.create(
                thread=thread,
                role='assistant',
                content=ai_response['content'],
                metadata=assistant_metadata,
            )

            # Embed messages for future RAG (async would be better, but sync for now)
            try:
                EmbeddingService.embed_message(user_message)
                EmbeddingService.embed_message(assistant_message)
            except Exception as e:
                logger.warning(f"Failed to embed messages: {e}")

            # Generate title after first exchange if needed
            if thread.messages.count() == 2 and not thread.title:
                try:
                    ThreadService.maybe_generate_title_async(thread.id)
                except Exception as e:
                    logger.warning(f"Failed to generate title: {e}")

            # Return response
            response_data = {
                'success': True,
                'user_message': ThreadMessageSerializer(user_message).data,
                'assistant_message': ThreadMessageSerializer(assistant_message).data,
            }

            if ai_response.get('field_updates'):
                response_data['field_updates'] = ai_response['field_updates']

            return Response(response_data, status=status.HTTP_201_CREATED)

        except ChatThread.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Thread not found',
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception(f"Error in thread message creation: {e}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
