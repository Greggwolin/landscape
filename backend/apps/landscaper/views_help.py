"""
Help Landscaper API Views

Provides the global Help chat endpoint that does NOT require a project ID.
This is architecturally separate from the project Landscaper.
"""

import logging
import uuid

from django.db import connection
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .help_handler import get_help_response

logger = logging.getLogger(__name__)


class HelpChatView(APIView):
    """
    Global Help Landscaper chat endpoint.

    POST /api/landscaper/help/chat/

    Does NOT require a project_id. Uses a dedicated help system prompt
    with platform knowledge retrieval and NO tools.

    Request body:
    {
        "message": "Where do I enter cap rate assumptions?",
        "conversation_id": "uuid-optional",
        "current_page": "valuation",
        "property_type_context": "multifamily"
    }

    Response:
    {
        "success": true,
        "content": "Go to Valuation > Income Approach...",
        "conversation_id": "uuid",
        "metadata": {...}
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            message = request.data.get('message', '').strip()
            conversation_id = request.data.get('conversation_id')
            current_page = request.data.get('current_page')
            property_type_context = request.data.get('property_type_context')

            if not message:
                return Response({
                    'success': False,
                    'error': 'Message is required',
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get or create conversation
            user_id = request.user.id if request.user.is_authenticated else None

            if conversation_id:
                # Verify conversation exists
                conv_id = self._get_conversation_db_id(conversation_id)
                if not conv_id:
                    # Create new if provided ID doesn't exist
                    conversation_id, conv_id = self._create_conversation(user_id)
            else:
                conversation_id, conv_id = self._create_conversation(user_id)

            # Load conversation history
            conversation_history = self._get_conversation_history(conv_id)

            # Generate AI response
            ai_response = get_help_response(
                message=message,
                current_page=current_page,
                property_type_context=property_type_context,
                conversation_history=conversation_history,
            )

            # Store user message
            self._store_message(conv_id, 'user', message, current_page)

            # Store assistant response
            self._store_message(conv_id, 'assistant', ai_response['content'], current_page)

            # Update conversation timestamp
            self._touch_conversation(conv_id)

            return Response({
                'success': True,
                'content': ai_response['content'],
                'conversation_id': str(conversation_id),
                'metadata': ai_response.get('metadata', {}),
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception(f"Help chat error: {e}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _create_conversation(self, user_id):
        """Create a new help conversation. Returns (conversation_uuid, db_id)."""
        conv_uuid = uuid.uuid4()
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.tbl_help_conversation (user_id, conversation_id, created_at, updated_at)
                VALUES (%s, %s, NOW(), NOW())
                RETURNING id, conversation_id
            """, [user_id, str(conv_uuid)])
            row = cursor.fetchone()
            return row[1], row[0]

    def _get_conversation_db_id(self, conversation_uuid):
        """Look up the DB primary key for a conversation UUID."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM landscape.tbl_help_conversation
                WHERE conversation_id = %s
            """, [str(conversation_uuid)])
            row = cursor.fetchone()
            return row[0] if row else None

    def _get_conversation_history(self, conv_db_id, limit=20):
        """Load recent messages for a conversation."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT role, content
                FROM landscape.tbl_help_message
                WHERE conversation_id = %s
                ORDER BY created_at ASC
                LIMIT %s
            """, [conv_db_id, limit])
            rows = cursor.fetchall()

        return [{'role': role, 'content': content} for role, content in rows]

    def _store_message(self, conv_db_id, role, content, current_page=None):
        """Store a message in the help conversation."""
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.tbl_help_message
                    (conversation_id, role, content, current_page, created_at)
                VALUES (%s, %s, %s, %s, NOW())
            """, [conv_db_id, role, content, current_page])

    def _touch_conversation(self, conv_db_id):
        """Update the conversation's updated_at timestamp."""
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE landscape.tbl_help_conversation
                SET updated_at = NOW()
                WHERE id = %s
            """, [conv_db_id])
