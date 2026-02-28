"""
ViewSets and API views for Landscaper AI endpoints.

Provides:
- Chat message history retrieval and creation
- AI response generation (stubbed for Phase 6)
- Variance calculation between AI advice and actual values
"""

import logging
import re

from rest_framework import viewsets, status

logger = logging.getLogger(__name__)
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q, Count, Avg
from django.db import connection
from django.utils import timezone
from django.shortcuts import get_object_or_404
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
from apps.projects.models import Project


def _user_can_access_project(user, project: Project) -> bool:
    """
    Minimal project access check until explicit membership model exists.

    Rules:
    - Unauthenticated users allowed (views using AllowAny skip DRF auth)
    - Admin/staff can access all projects
    - Project owner can access
    - Legacy projects without owner are allowed for authenticated users
    """
    if not user or not user.is_authenticated:
        # AllowAny views reach here with AnonymousUser — allow access
        return True
    if user.is_staff or user.is_superuser or getattr(user, 'role', None) == 'admin':
        return True

    owner_id = getattr(project, 'created_by_id', None)
    if owner_id is None:
        return True

    return owner_id == user.id


def _require_project_access(user, project_id: int) -> Project:
    """Load a project and enforce basic user authorization."""
    project = get_object_or_404(Project, project_id=project_id)
    if not _user_can_access_project(user, project):
        raise PermissionDenied("You do not have access to this project.")
    return project


# ---------------------------------------------------------------------------
# Tool-context-aware message history builder
# ---------------------------------------------------------------------------

def _build_message_with_tool_context(msg, is_recent: bool = True) -> dict:
    """
    Build a single message dict for Claude, enriching assistant messages
    with tool call/result context from stored metadata.

    Without this, Claude sees only the final text response from prior turns
    and has no evidence that tools were called.  This causes hallucination
    on continuation turns (e.g., user says "proceed" after a delete proposal
    and Claude fabricates completion instead of actually calling tools).

    Args:
        msg: A ThreadMessage or ChatMessage ORM instance.
        is_recent: If True, include full tool details.  If False (older
                   messages), include a compact summary to save tokens.

    Returns:
        Dict with 'role' and 'content' keys suitable for the Claude API.
    """
    role = msg.role
    content = msg.content or ''
    metadata = msg.metadata or {}

    # User messages and assistant messages without tool data pass through unchanged
    tool_calls = metadata.get('tool_calls', [])
    tool_executions = metadata.get('tool_executions', [])

    # Strip hallucinated tool annotations from prior AI messages.
    # Claude sometimes writes fake "[Tool calls executed...]" text instead
    # of making actual tool_use API calls.  If this text appears in the
    # message history, it reinforces the pattern.  Remove it.
    if role == 'assistant' and not tool_executions:
        # Remove fake tool call blocks
        content = re.sub(
            r'\[Tool calls executed.*?\]',
            '',
            content,
            flags=re.DOTALL
        )
        # Remove lines starting with → that mimic tool results
        content = re.sub(r'^→ .*$', '', content, flags=re.MULTILINE)
        content = content.strip()

    if role != 'assistant' or (not tool_calls and not tool_executions):
        return {'role': role, 'content': content}

    # --- Build tool context block ---
    tool_lines = []

    for i, tc in enumerate(tool_calls):
        tool_name = tc.get('tool', 'unknown_tool')
        tool_input = tc.get('input', {})

        # Match to execution result by position
        exec_result = tool_executions[i] if i < len(tool_executions) else None

        if is_recent:
            # Full detail for recent messages
            # Summarize input (keep it compact)
            input_summary = _summarize_tool_input(tool_input)
            line = f"  Tool: {tool_name}({input_summary})"

            if exec_result:
                success = exec_result.get('success', False)
                result_data = exec_result.get('result', {})
                is_proposal = exec_result.get('is_proposal', False)

                if is_proposal:
                    line += f" → PROPOSED (awaiting confirmation)"
                elif success:
                    result_summary = _summarize_tool_result(tool_name, result_data)
                    line += f" → {result_summary}"
                else:
                    error = exec_result.get('error', 'unknown error')
                    line += f" → FAILED: {error}"
            else:
                line += " → (no result recorded)"
        else:
            # Compact summary for older messages
            line = f"  {tool_name}"
            if exec_result:
                success = exec_result.get('success', False)
                line += f" → {'OK' if success else 'FAILED'}"

        tool_lines.append(line)

    # Also include field_updates summary if present
    field_updates = metadata.get('field_updates', [])
    if field_updates:
        for fu in field_updates:
            fu_type = fu.get('type', fu.get('tool', 'update'))
            created = fu.get('created', 0)
            updated = fu.get('updated', 0)
            total = fu.get('total', created + updated)
            if total > 0:
                tool_lines.append(f"  → Mutations applied: {fu_type} ({created} created, {updated} updated)")

    if tool_lines:
        tool_block = "\n[Tool calls executed in this turn:\n" + "\n".join(tool_lines) + "\n]"
        enriched_content = content + tool_block

        # Add explicit instruction for pending confirmations so Claude knows
        # it must call the tool again (not hallucinate completion)
        if is_recent and _has_pending_confirmation(tool_executions):
            enriched_content += (
                "\n[IMPORTANT: One or more tools returned action=confirm_required. "
                "The operation was NOT executed — it is waiting for user confirmation. "
                "If the user confirms, you MUST call the tool again with confirmed=true. "
                "Do NOT say the action is complete until you receive a tool result "
                "showing action=deleted or action=updated.]"
            )
    else:
        enriched_content = content

    return {'role': role, 'content': enriched_content}


def _has_pending_confirmation(tool_executions: list) -> bool:
    """Check if any tool execution returned confirm_required or pending_confirmation."""
    for te in tool_executions:
        result = te.get('result', {})
        if isinstance(result, dict):
            action = result.get('action', '')
            status_val = result.get('status', '')
            if action in ('confirm_required', 'proposed', 'pending') or \
               status_val in ('pending_confirmation', 'pending', 'proposed'):
                return True
    return False


def _summarize_tool_input(tool_input: dict, max_len: int = 120) -> str:
    """Produce a compact string summary of tool input parameters."""
    if not tool_input:
        return ""

    # For common patterns, produce readable summaries
    parts = []
    for key, val in tool_input.items():
        if key == 'records' and isinstance(val, list):
            parts.append(f"records=[{len(val)} items]")
        elif key == 'reason':
            # Truncate long reason strings
            reason_str = str(val)
            if len(reason_str) > 60:
                reason_str = reason_str[:57] + '...'
            parts.append(f"reason=\"{reason_str}\"")
        elif isinstance(val, (list, dict)):
            if isinstance(val, list):
                parts.append(f"{key}=[{len(val)} items]")
            else:
                parts.append(f"{key}={{...}}")
        else:
            val_str = str(val)
            if len(val_str) > 40:
                val_str = val_str[:37] + '...'
            parts.append(f"{key}={val_str}")

    summary = ", ".join(parts)
    if len(summary) > max_len:
        summary = summary[:max_len - 3] + '...'
    return summary


def _summarize_tool_result(tool_name: str, result: dict, max_len: int = 200) -> str:
    """Produce a compact summary of a tool execution result."""
    if not result:
        return "OK"

    if not isinstance(result, dict):
        result_str = str(result)
        if len(result_str) > max_len:
            return result_str[:max_len - 3] + '...'
        return result_str

    # Common patterns
    success = result.get('success', None)
    action = result.get('action', None)
    status_val = result.get('status', None)
    count = result.get('count', None)
    created = result.get('created', None)
    updated = result.get('updated', None)
    total = result.get('total', None)

    parts = []

    # action and status are CRITICAL for two-phase flows (confirm_required, proposed, etc.)
    # Include them FIRST so Claude sees them before generic success/count
    if action is not None:
        parts.append(f"action={action}")
    if status_val is not None:
        parts.append(f"status={status_val}")

    if success is not None:
        parts.append('success' if success else 'failed')
    if count is not None:
        parts.append(f"count={count}")
    if created is not None or updated is not None:
        parts.append(f"created={created or 0}, updated={updated or 0}")
    if total is not None and created is None and updated is None:
        parts.append(f"total={total}")

    # Include message hint if present (e.g., "Call delete_units again with confirmed=true")
    message = result.get('message', None)
    if message and action in ('confirm_required', 'proposed', 'pending'):
        # Truncate long messages
        msg_str = str(message)
        if len(msg_str) > 80:
            msg_str = msg_str[:77] + '...'
        parts.append(f'message="{msg_str}"')

    # Include records count if present
    records = result.get('records', None)
    if isinstance(records, list) and len(records) > 0:
        parts.append(f"{len(records)} records returned")

    if parts:
        summary = ", ".join(parts)
    else:
        # Fallback: stringify the whole result compactly
        summary = str(result)

    if len(summary) > max_len:
        summary = summary[:max_len - 3] + '...'
    return summary


def _build_message_history_with_tool_context(
    messages,
    recent_window: int = 6,
) -> list:
    """
    Build message history list with tool context injected into assistant messages.

    This replaces the naive [{'role': msg.role, 'content': msg.content}] pattern
    that stripped all tool context, causing Claude to hallucinate completed actions
    on continuation turns.

    Args:
        messages: Iterable of ThreadMessage or ChatMessage ORM objects,
                  ordered by created_at ASC.
        recent_window: Number of most recent messages to include full tool
                       detail for.  Older messages get compact summaries
                       to manage token budget.

    Returns:
        List of dicts [{'role': str, 'content': str}, ...] suitable for
        passing to get_landscaper_response().
    """
    msg_list = list(messages)
    total = len(msg_list)
    result = []

    for i, msg in enumerate(msg_list):
        is_recent = (total - i) <= recent_window
        result.append(_build_message_with_tool_context(msg, is_recent=is_recent))

    return result


class ChatMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for chat messages.

    Endpoints:
    - GET /api/projects/{project_id}/landscaper/chat/ - Get message history
    - POST /api/projects/{project_id}/landscaper/chat/ - Send message, get AI response
    """

    queryset = ChatMessage.objects.select_related('project', 'user')
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

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
        _require_project_access(request.user, int(self.kwargs.get('project_id')))
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
            "user": user_id (optional),
            "page_context": "cashflow" (optional - for context-aware tool filtering)
        }

        Response:
        {
            "user_message": {...},
            "assistant_message": {...},
            "success": true
        }
        """
        project_id = self.kwargs.get('project_id')
        project = _require_project_access(request.user, int(project_id))

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

            # Get chat history for context (with tool call/result context)
            messages = self.get_queryset()
            message_history = _build_message_history_with_tool_context(messages)

            # Get project context with full details
            project_context = {
                'project_id': project.project_id,
                'project_name': project.project_name,
                'project_type': project.project_type or 'Unknown',
                'project_type_code': project.project_type_code,
                'analysis_perspective': getattr(project, 'analysis_perspective', None),
                'analysis_purpose': getattr(project, 'analysis_purpose', None),
                'value_add_enabled': bool(getattr(project, 'value_add_enabled', False)),
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
            _uid = request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None
            def tool_executor_fn(tool_name, tool_input, project_id=None):
                return execute_tool(tool_name, tool_input, project_id or project.project_id, user_id=_uid)

            # Get page context for context-aware tool filtering
            page_context = request.data.get('page_context')

            # Generate AI response with tool support
            ai_response = get_landscaper_response(
                message_history,
                project_context,
                tool_executor=tool_executor_fn,
                page_context=page_context,
                user_id=_uid,
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
        """GET list of document types with counts.

        Returns a unified vocabulary combining:
        1. All unique doc_types from DMS templates
        2. Any doc types currently used in extraction mappings
        """
        # Get mapping counts per document_type
        mapping_counts = {
            item['document_type']: {
                'count': item['count'],
                'active_count': item['active_count'],
            }
            for item in ExtractionMapping.objects.values('document_type').annotate(
                count=Count('mapping_id'),
                active_count=Count('mapping_id', filter=Q(is_active=True))
            )
        }

        # Get all unique doc types from DMS templates
        template_doc_types = set()
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT DISTINCT unnest(doc_type_options) AS doc_type
                    FROM landscape.dms_templates
                    WHERE doc_type_options IS NOT NULL
                    ORDER BY doc_type
                """)
                for row in cursor.fetchall():
                    if row[0]:
                        template_doc_types.add(row[0])
        except Exception:
            pass

        # Merge: all template types + any mapping-only types
        all_doc_types = template_doc_types | set(mapping_counts.keys())

        result = []
        for dt in sorted(all_doc_types):
            counts = mapping_counts.get(dt, {'count': 0, 'active_count': 0})
            result.append({
                'document_type': dt,
                'count': counts['count'],
                'active_count': counts['active_count'],
            })

        return Response({
            'document_types': result,
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
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """Retrieve a thread and enforce project-level access."""
        instance = super().get_object()
        _require_project_access(self.request.user, int(instance.project_id))
        return instance

    def get_queryset(self):
        """Filter threads based on query params."""
        from .models import ChatThread

        queryset = ChatThread.objects.all()

        # Filter by project_id (required for list)
        project_id = self.request.query_params.get('project_id')
        if project_id:
            _require_project_access(self.request.user, int(project_id))
            queryset = queryset.filter(project_id=project_id)

        # Filter by page_context
        page_context = self.request.query_params.get('page_context')
        if page_context:
            queryset = queryset.filter(page_context=page_context)

        # Filter by subtab_context
        subtab_context = self.request.query_params.get('subtab_context')
        if subtab_context:
            queryset = queryset.filter(subtab_context=subtab_context)

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

        _require_project_access(request.user, int(project_id))

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

        _require_project_access(request.user, int(project_id))

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
    permission_classes = [IsAuthenticated]

    def _get_authorized_thread(self):
        """Load thread and enforce project access."""
        from .models import ChatThread

        thread_id = self.kwargs.get('thread_id')
        thread = get_object_or_404(ChatThread, id=thread_id)
        _require_project_access(self.request.user, int(thread.project_id))
        return thread

    def get_queryset(self):
        """Filter messages by thread_id from URL."""
        from .models import ThreadMessage

        if self.kwargs.get('thread_id'):
            thread = self._get_authorized_thread()
            return ThreadMessage.objects.filter(thread_id=thread.id).order_by('created_at')
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
            "content": "User message text",
            "page_context": "cashflow" (optional - for context-aware tool filtering)
        }

        Response:
        {
            "success": true,
            "user_message": {...},
            "assistant_message": {...}
        }
        """
        from .models import ThreadMessage
        from .serializers import ThreadMessageSerializer
        from .ai_handler import get_landscaper_response
        from .tool_executor import execute_tool
        from .services.thread_service import ThreadService
        from .services.embedding_service import EmbeddingService
        from apps.projects.models import Project

        page_context = request.data.get('page_context')
        thread = self._get_authorized_thread()

        try:
            # Create user message
            user_message = ThreadMessage.objects.create(
                thread=thread,
                role='user',
                content=request.data.get('content', ''),
            )

            # Get message history for context (with tool call/result context)
            # Use MOST RECENT 50 messages (not oldest 50) so the newest user
            # message is always included for keyword-based tool filtering.
            messages = list(
                thread.messages.order_by('-created_at')[:50]
            )[::-1]  # Reverse back to chronological order
            message_history = _build_message_history_with_tool_context(messages)

            # DIAGNOSTIC: Log thread context being sent to AI
            logger.info(
                f"[THREAD_CONTEXT] thread={thread.id}, "
                f"total_messages_in_thread={thread.messages.count()}, "
                f"messages_sent_to_ai={len(message_history)}, "
                f"roles={[m.get('role') for m in message_history]}"
            )

            # Get project context
            project = Project.objects.get(project_id=thread.project_id)
            project_context = {
                'project_id': project.project_id,
                'project_name': project.project_name,
                'project_type': project.project_type or 'Unknown',
                'project_type_code': project.project_type_code,
                'thread_id': str(thread.id),
                'analysis_perspective': getattr(project, 'analysis_perspective', None),
                'analysis_purpose': getattr(project, 'analysis_purpose', None),
                'value_add_enabled': bool(getattr(project, 'value_add_enabled', False)),
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

            # Create tool executor bound to this project and thread
            _uid = request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None
            def tool_executor_fn(tool_name, tool_input, project_id=None):
                return execute_tool(
                    tool_name, tool_input,
                    project_id or project.project_id,
                    thread_id=str(thread.id),
                    user_id=_uid,
                )

            # Generate AI response with context-aware tool filtering
            ai_response = get_landscaper_response(
                message_history,
                project_context,
                tool_executor=tool_executor_fn,
                additional_context=chat_context if chat_context else None,
                page_context=page_context,
                user_id=_uid,
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
            generated_title = None
            if thread.messages.count() >= 2 and not thread.title:
                logger.info(f"[THREAD_TITLE] Attempting title generation for thread {thread.id}")
                try:
                    ThreadService.maybe_generate_title_async(thread.id)
                    # Reload to get the generated title
                    thread.refresh_from_db()
                    generated_title = thread.title
                    logger.info(f"[THREAD_TITLE] Generated: {generated_title}")
                except Exception as e:
                    logger.warning(f"[THREAD_TITLE] AI title generation failed: {e}")

                # Fallback: if AI title generation failed, use first words of user message
                if not generated_title:
                    try:
                        words = user_message.content.strip().split()[:6]
                        fallback_title = ' '.join(words)
                        if len(fallback_title) > 50:
                            fallback_title = fallback_title[:47] + '...'
                        thread.title = fallback_title
                        thread.save(update_fields=['title', 'updated_at'])
                        generated_title = fallback_title
                        logger.info(f"[THREAD_TITLE] Fallback title: {generated_title}")
                    except Exception as e2:
                        logger.warning(f"[THREAD_TITLE] Fallback also failed: {e2}")

            # Return response
            response_data = {
                'success': True,
                'user_message': ThreadMessageSerializer(user_message).data,
                'assistant_message': ThreadMessageSerializer(assistant_message).data,
            }

            if generated_title:
                response_data['thread_title'] = generated_title

            if ai_response.get('field_updates'):
                response_data['field_updates'] = ai_response['field_updates']

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception(f"Error in thread message creation: {e}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# Global Chat ViewSet (Non-Project Contexts: DMS, Admin, Benchmarks)
# =============================================================================

class GlobalChatViewSet(viewsets.ViewSet):
    """
    Landscaper chat for non-project contexts (DMS, Admin, Benchmarks).

    Endpoints:
    - GET /api/landscaper/global/chat/ - Get message history (optional ?page_context filter)
    - POST /api/landscaper/global/chat/ - Send message, get AI response

    This endpoint handles chat for pages that don't have a project context,
    such as the DMS (documents across all projects), Admin settings, and Benchmarks.
    """
    permission_classes = [AllowAny]

    def list(self, request):
        """GET chat history for global context (filtered by page_context if provided)."""
        page_context = request.query_params.get('page_context', 'dms')
        limit = int(request.query_params.get('limit', 50))

        # Query messages without project_id filter, filtered by page_context in metadata
        messages = ChatMessage.objects.filter(
            project__isnull=True
        ).order_by('-timestamp')[:limit]

        # Filter by page_context if stored in metadata
        if page_context:
            messages = [m for m in messages if m.metadata.get('page_context') == page_context]

        serializer = ChatMessageSerializer(messages, many=True)
        return Response({
            'success': True,
            'messages': serializer.data,
            'count': len(serializer.data),
            'page_context': page_context,
        })

    def create(self, request):
        """
        POST new message and get AI response for global context.

        Request body:
        {
            "message": "User message text",
            "page_context": "dms" | "benchmarks" | "admin" | "settings",
            "document_id": 123 (optional - for document-specific chat)
        }

        Response:
        {
            "success": true,
            "content": "AI response text",
            "messageId": "...",
            "metadata": {...}
        }
        """
        try:
            user_message = request.data.get('message', '')
            page_context = request.data.get('page_context', 'dms')
            document_id = request.data.get('document_id')

            if not user_message.strip():
                return Response({
                    'success': False,
                    'error': 'Message is required',
                }, status=status.HTTP_400_BAD_REQUEST)

            # Build context for global pages (no project)
            global_context = {
                'project_id': None,
                'project_name': 'Global Context',
                'project_type': None,
                'project_type_code': None,
                'analysis_perspective': None,
                'analysis_purpose': None,
                'value_add_enabled': False,
                'is_global': True,
                'page_context': page_context,
            }

            # If document_id provided, add document context
            if document_id:
                try:
                    from django.db import connection
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            SELECT d.filename, d.file_type, d.document_type,
                                   p.project_id, p.project_name
                            FROM landscape.tbl_document d
                            LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
                            WHERE d.doc_id = %s
                        """, [document_id])
                        row = cursor.fetchone()
                        if row:
                            global_context['document'] = {
                                'doc_id': document_id,
                                'filename': row[0],
                                'file_type': row[1],
                                'document_type': row[2],
                                'project_id': row[3],
                                'project_name': row[4],
                            }
                except Exception as e:
                    logger.warning(f"Failed to fetch document context: {e}")

            # Create tool executor for global context
            _uid = request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None
            def tool_executor_fn(tool_name, tool_input, project_id=None):
                # For global context, pass project_id=0 as sentinel
                return execute_tool(tool_name, tool_input, project_id or 0, user_id=_uid)

            # Get message history for context (last 10 messages in this page_context)
            recent_messages = ChatMessage.objects.filter(
                project__isnull=True,
            ).order_by('-timestamp')[:10]

            # Filter by page_context, then build with tool context
            filtered_messages = [
                msg for msg in reversed(list(recent_messages))
                if (msg.metadata or {}).get('page_context') == page_context
            ]
            message_history = _build_message_history_with_tool_context(filtered_messages)

            # Generate AI response
            ai_response = get_landscaper_response(
                message_history,
                global_context,
                tool_executor=tool_executor_fn,
                page_context=page_context,
                user_id=_uid,
            )

            # Store user message (with project=None for global)
            user_message_obj = ChatMessage.objects.create(
                project=None,
                user=None,
                role='user',
                content=user_message,
                metadata={'page_context': page_context, 'document_id': document_id},
            )

            # Store assistant response
            assistant_metadata = ai_response.get('metadata', {})
            assistant_metadata['page_context'] = page_context
            if document_id:
                assistant_metadata['document_id'] = document_id

            assistant_message_obj = ChatMessage.objects.create(
                project=None,
                user=None,
                role='assistant',
                content=ai_response['content'],
                metadata=assistant_metadata,
            )

            return Response({
                'success': True,
                'content': ai_response['content'],
                'messageId': str(assistant_message_obj.message_id),
                'createdAt': assistant_message_obj.timestamp.isoformat(),
                'metadata': assistant_metadata,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception(f"Error in global chat: {e}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# Intelligence v1 — Intake Session Views
# =============================================================================

from .models import IntakeSession
from .serializers import (
    IntakeSessionSerializer,
    IntakeSessionStartSerializer,
    IntakeCommitSerializer,
)


class IntakeStartView(APIView):
    """
    GET  /api/intake/start?project_id=N — List intake sessions for a project
    POST /api/intake/start — Create an intake session

    Only 'structured_ingestion' intent creates a session;
    'global_intelligence' and 'dms_only' are pass-through to existing pipelines.
    """
    permission_classes = [AllowAny]  # Called directly from frontend browser

    def get(self, request):
        """List intake sessions for a project."""
        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response({'error': 'project_id query param is required'}, status=status.HTTP_400_BAD_REQUEST)

        sessions = IntakeSession.objects.filter(project_id=project_id).order_by('-created_at')
        return Response({
            'sessions': [
                {
                    'intakeUuid': str(s.intake_uuid),
                    'projectId': s.project_id,
                    'docId': s.doc_id,
                    'documentType': s.document_type,
                    'status': s.status,
                    'createdAt': s.created_at.isoformat() if s.created_at else None,
                    'updatedAt': s.updated_at.isoformat() if s.updated_at else None,
                }
                for s in sessions
            ],
        })

    def post(self, request):
        serializer = IntakeSessionStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        intent = serializer.validated_data['intent']
        project_id = serializer.validated_data['project_id']
        doc_id = serializer.validated_data.get('doc_id')

        # Verify project access
        try:
            project = Project.objects.get(project_id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': f'Project {project_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        if not _user_can_access_project(request.user, project):
            raise PermissionDenied("You do not have access to this project")

        # Non-structured intents don't create intake sessions
        if intent != 'structured_ingestion':
            return Response({
                'intent': intent,
                'message': f'Intent "{intent}" does not create an intake session. Use existing DMS/knowledge endpoints.',
            }, status=status.HTTP_200_OK)

        # Create the intake session
        user = request.user if request.user and request.user.is_authenticated else None
        session = IntakeSession.objects.create(
            project=project,
            doc_id=doc_id,
            document_type=None,
            status='draft',
            created_by=user,
        )

        return Response({
            'intakeUuid': str(session.intake_uuid),
            'intakeId': session.intake_id,
            'status': session.status,
            'projectId': project_id,
            'docId': doc_id,
        }, status=status.HTTP_201_CREATED)


class IntakeMappingSuggestionsView(APIView):
    """
    GET  /api/intake/{intake_uuid}/mapping_suggestions — Return full registry of available fields
    POST /api/intake/{intake_uuid}/mapping_suggestions — Match source_columns to registry via fuzzy matching
    """
    permission_classes = [AllowAny]  # Called directly from frontend browser

    def _get_session_and_property_type(self, request, intake_uuid):
        """Common session lookup and property type resolution."""
        try:
            session = IntakeSession.objects.select_related('project').get(
                intake_uuid=intake_uuid
            )
        except IntakeSession.DoesNotExist:
            return None, None, Response(
                {'error': 'Intake session not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not _user_can_access_project(request.user, session.project):
            raise PermissionDenied("You do not have access to this project")

        property_type = 'multifamily'
        if hasattr(session.project, 'project_type'):
            pt = (session.project.project_type or '').upper()
            if pt in ('LAND', 'LANDDEV'):
                property_type = 'land_development'

        return session, property_type, None

    def get(self, request, intake_uuid):
        """Return the full merged registry of extractable fields."""
        from apps.knowledge.services.field_registry import merge_dynamic_fields

        session, property_type, err = self._get_session_and_property_type(request, intake_uuid)
        if err:
            return err

        merged_fields = merge_dynamic_fields(session.project_id, property_type)

        suggestions = []
        for field_key, mapping in merged_fields.items():
            if mapping.extract_policy == 'user_only' or mapping.field_role == 'output':
                continue
            if not mapping.resolved:
                continue

            if session.document_type and mapping.evidence_types:
                doc_type_lower = session.document_type.lower().replace(' ', '_')
                if doc_type_lower not in [e.lower() for e in mapping.evidence_types]:
                    continue

            suggestions.append({
                'fieldKey': mapping.field_key,
                'label': mapping.label,
                'fieldType': mapping.field_type,
                'scope': mapping.scope,
                'dbTarget': mapping.db_target,
                'dbWriteType': mapping.db_write_type,
                'extractability': mapping.extractability,
                'extractPolicy': mapping.extract_policy,
                'isDynamic': mapping.db_write_type == 'dynamic',
            })

        return Response({
            'intakeUuid': str(session.intake_uuid),
            'status': session.status,
            'documentType': session.document_type,
            'propertyType': property_type,
            'fieldCount': len(suggestions),
            'suggestions': suggestions,
        })

    def post(self, request, intake_uuid):
        """Match source column headers to registry fields via fuzzy matching."""
        from apps.landscaper.services.mapping_suggestion_service import suggest_mappings

        session, property_type, err = self._get_session_and_property_type(request, intake_uuid)
        if err:
            return err

        source_columns = request.data.get('source_columns', [])
        if not source_columns or not isinstance(source_columns, list):
            return Response(
                {'error': 'source_columns (list of strings) is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = suggest_mappings(
            source_columns=source_columns,
            project_id=session.project_id,
            property_type=property_type,
            document_type=session.document_type,
        )

        return Response({
            'intakeUuid': str(session.intake_uuid),
            'status': session.status,
            'mappings': [
                {
                    'sourceColumn': s.source_column,
                    'fieldKey': s.field_key,
                    'label': s.label,
                    'confidence': s.confidence,
                    'dbTarget': s.db_target,
                    'dbWriteType': s.db_write_type,
                    'scope': s.scope,
                    'isDynamic': s.is_dynamic,
                }
                for s in results
            ],
        })


class IntakeLockMappingView(APIView):
    """
    POST /api/intake/{intake_uuid}/lock_mapping

    Confirm mappings and advance status to mapping_complete.
    """
    permission_classes = [AllowAny]  # Called directly from frontend browser

    def post(self, request, intake_uuid):
        try:
            session = IntakeSession.objects.select_related('project').get(
                intake_uuid=intake_uuid
            )
        except IntakeSession.DoesNotExist:
            return Response(
                {'error': 'Intake session not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not _user_can_access_project(request.user, session.project):
            raise PermissionDenied("You do not have access to this project")

        if session.status != 'draft':
            return Response(
                {'error': f'Cannot lock mapping from status "{session.status}". Expected "draft".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        session.status = 'mapping_complete'
        session.save(update_fields=['status', 'updated_at'])

        return Response({
            'intakeUuid': str(session.intake_uuid),
            'status': session.status,
        })


class IntakeExtractedValuesView(APIView):
    """
    GET /api/intake/{intake_uuid}/extracted_values

    Return staged values with existing values and conflict flags.
    """
    permission_classes = [AllowAny]  # Called directly from frontend browser

    def get(self, request, intake_uuid):
        try:
            session = IntakeSession.objects.select_related('project').get(
                intake_uuid=intake_uuid
            )
        except IntakeSession.DoesNotExist:
            return Response(
                {'error': 'Intake session not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not _user_can_access_project(request.user, session.project):
            raise PermissionDenied("You do not have access to this project")

        # Fetch staged extractions for this session's doc
        staged_values = []
        if session.doc_id:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT extraction_id, field_key, extracted_value, confidence_score,
                           status, conflict_with_extraction_id, extraction_type
                    FROM landscape.ai_extraction_staging
                    WHERE doc_id = %s AND project_id = %s
                    ORDER BY extraction_id
                """, [session.doc_id, session.project_id])
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    staged_values.append(dict(zip(columns, row)))

        return Response({
            'intakeUuid': str(session.intake_uuid),
            'status': session.status,
            'values': staged_values,
        })


class IntakeCommitValuesView(APIView):
    """
    POST /api/intake/{intake_uuid}/commit_values

    Accept/reject staged values. Accepted values are written to target tables
    via ExtractionWriter with full mutation logging.
    """
    permission_classes = [AllowAny]  # Called directly from frontend browser

    def post(self, request, intake_uuid):
        try:
            session = IntakeSession.objects.select_related('project').get(
                intake_uuid=intake_uuid
            )
        except IntakeSession.DoesNotExist:
            return Response(
                {'error': 'Intake session not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not _user_can_access_project(request.user, session.project):
            raise PermissionDenied("You do not have access to this project")

        serializer = IntakeCommitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        actions = serializer.validated_data['actions']
        results = []

        # Determine property type for ExtractionWriter
        property_type = 'multifamily'
        if session.project:
            pt = getattr(session.project, 'property_type', None) or \
                 getattr(session.project, 'project_type_code', None)
            if pt:
                property_type = pt.lower()

        from apps.knowledge.services.extraction_writer import ExtractionWriter
        writer = ExtractionWriter(session.project_id, property_type)

        for action_item in actions:
            extraction_id = action_item['extraction_id']
            action = action_item['action']
            override_value = action_item.get('override_value')

            if action == 'accept':
                # Fetch the staged extraction details (include target_table/target_field for alias resolution)
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT field_key, extracted_value, target_table, target_field
                        FROM landscape.ai_extraction_staging
                        WHERE extraction_id = %s AND project_id = %s
                    """, [extraction_id, session.project_id])
                    row = cursor.fetchone()

                if not row:
                    results.append({
                        'extractionId': extraction_id,
                        'action': 'accept',
                        'success': False,
                        'message': 'Staged extraction not found',
                    })
                    continue

                raw_field_key, extracted_value, target_table, target_field = row[0], row[1], row[2], row[3]
                write_value = override_value if override_value else extracted_value

                # Resolve field_key to canonical registry key (handles aliases, labels, NULL keys)
                resolved_key = writer.registry.resolve_field_key(
                    field_key=raw_field_key,
                    property_type=property_type,
                    target_table=target_table,
                    target_field=target_field,
                )
                field_key = resolved_key or raw_field_key

                if not field_key:
                    results.append({
                        'extractionId': extraction_id,
                        'action': 'accept',
                        'success': False,
                        'message': f'Cannot resolve field_key (raw={raw_field_key}, table={target_table}, field={target_field})',
                    })
                    continue

                # Write to production via ExtractionWriter
                success, message = writer.write_extraction(
                    extraction_id=extraction_id,
                    field_key=field_key,
                    value=write_value,
                    source_doc_id=session.doc_id,
                    value_source='ai_extraction',
                )

                # Update staging status
                new_status = 'applied' if success else 'failed'
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE landscape.ai_extraction_staging
                        SET status = %s
                        WHERE extraction_id = %s AND project_id = %s
                    """, [new_status, extraction_id, session.project_id])

                results.append({
                    'extractionId': extraction_id,
                    'action': 'accept',
                    'success': success,
                    'message': message,
                })

            elif action == 'reject':
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE landscape.ai_extraction_staging
                        SET status = 'rejected'
                        WHERE extraction_id = %s AND project_id = %s
                    """, [extraction_id, session.project_id])

                results.append({
                    'extractionId': extraction_id,
                    'action': 'reject',
                    'success': True,
                })

        # Advance session status
        session.status = 'committed'
        session.save(update_fields=['status', 'updated_at'])

        return Response({
            'intakeUuid': str(session.intake_uuid),
            'status': session.status,
            'results': results,
        })


class IntakeReExtractView(APIView):
    """
    POST /api/intake/{intake_uuid}/re_extract

    Re-run extraction against current field registry.
    Creates new ai_extraction_staging records (does not overwrite committed rows).
    """
    permission_classes = [AllowAny]  # Called directly from frontend browser

    def post(self, request, intake_uuid):
        try:
            session = IntakeSession.objects.select_related('project').get(
                intake_uuid=intake_uuid
            )
        except IntakeSession.DoesNotExist:
            return Response(
                {'error': 'Intake session not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not _user_can_access_project(request.user, session.project):
            raise PermissionDenied("You do not have access to this project")

        if not session.doc_id:
            return Response(
                {'error': 'No document associated with this intake session'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create a new intake session for re-extraction
        user = request.user if request.user and request.user.is_authenticated else None
        new_session = IntakeSession.objects.create(
            project=session.project,
            doc_id=session.doc_id,
            document_type=session.document_type,
            status='draft',
            created_by=user,
        )

        # Phase 10 will wire this to the extraction pipeline
        return Response({
            'intakeUuid': str(new_session.intake_uuid),
            'status': new_session.status,
            'message': 'Re-extraction session created. Extraction pipeline will be triggered in Phase 10.',
        }, status=status.HTTP_201_CREATED)


# =============================================================================
# Override Management Views (Phase 6 — Red Dot Governance)
# =============================================================================


class OverrideListView(APIView):
    """
    GET /api/landscaper/projects/{project_id}/overrides/
    Returns active overrides for a project (for red dot indicators).
    """
    permission_classes = [AllowAny]  # Called directly from frontend browser

    def get(self, request, project_id):
        from apps.landscaper.services.override_service import list_overrides, get_override_field_keys

        active_only = request.query_params.get('active_only', 'true').lower() == 'true'
        overrides = list_overrides(project_id, active_only=active_only)
        field_keys = get_override_field_keys(project_id)

        return Response({
            'projectId': project_id,
            'overrides': overrides,
            'overriddenFieldKeys': field_keys,
            'count': len(overrides),
        })


class OverrideToggleView(APIView):
    """
    POST /api/landscaper/projects/{project_id}/overrides/toggle/
    Toggle an override on for a calculated field.

    Body: { field_key, override_value, calculated_value?, division_id?, unit_id? }
    """
    permission_classes = [AllowAny]  # Called directly from frontend browser

    def post(self, request, project_id):
        from apps.landscaper.services.override_service import toggle_override

        field_key = request.data.get('field_key')
        override_value = request.data.get('override_value')

        if not field_key or override_value is None:
            return Response(
                {'error': 'field_key and override_value are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = toggle_override(
            project_id=project_id,
            field_key=field_key,
            override_value=str(override_value),
            calculated_value=request.data.get('calculated_value'),
            division_id=request.data.get('division_id'),
            unit_id=request.data.get('unit_id'),
            user_id=request.user.id if request.user.is_authenticated else None,
        )

        return Response(result, status=status.HTTP_201_CREATED)


class OverrideRevertView(APIView):
    """
    POST /api/landscaper/overrides/{override_id}/revert/
    Revert an override back to the calculated value.
    """
    permission_classes = [AllowAny]  # Called directly from frontend browser

    def post(self, request, override_id):
        from apps.landscaper.services.override_service import revert_override

        result = revert_override(
            override_id=override_id,
            user_id=request.user.id if request.user.is_authenticated else None,
        )

        if 'error' in result:
            return Response(result, status=status.HTTP_404_NOT_FOUND)

        return Response(result)
