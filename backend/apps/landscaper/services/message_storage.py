"""
Message storage service for Landscaper chat.
Used by knowledge service to persist conversations.

Key features:
- Transaction-wrapped persistence (user + assistant saved atomically)
- Idempotency via client_request_id (prevents duplicate messages on retry)
- Raw SQL for consistency with existing codebase patterns
"""
import json
import uuid
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple

from django.db import connection, transaction


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal types from PostgreSQL."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


class MessageStorageService:
    """
    Handles all chat message persistence operations.
    """

    @staticmethod
    def check_idempotency(project_id: int, client_request_id: str) -> Optional[Dict[str, Any]]:
        """
        Check if a request has already been processed.

        Args:
            project_id: Project ID
            client_request_id: Client-provided UUID for this request

        Returns:
            Previous response if exists, None otherwise
        """
        if not client_request_id:
            return None

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT message_id, content, metadata, timestamp
                FROM landscape.landscaper_chat_message
                WHERE project_id = %s
                  AND role = 'assistant'
                  AND metadata->>'client_request_id' = %s
                ORDER BY timestamp DESC
                LIMIT 1
            """, [project_id, client_request_id])

            row = cursor.fetchone()

        if row:
            # Parse metadata if it's a JSON string
            metadata = row[2]
            if isinstance(metadata, str):
                try:
                    metadata = json.loads(metadata)
                except json.JSONDecodeError:
                    metadata = {}
            return {
                'message_id': row[0],
                'content': row[1],
                'metadata': metadata or {},
                'created_at': row[3].isoformat() if row[3] else None,
                'was_duplicate': True
            }

        return None

    @staticmethod
    @transaction.atomic
    def save_message_pair(
        project_id: int,
        user_content: str,
        assistant_content: str,
        client_request_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        active_tab: str = 'home'
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Save user message and assistant response atomically.

        Args:
            project_id: Project this conversation belongs to
            user_content: User's message text
            assistant_content: Assistant's response text
            client_request_id: Client-provided UUID for idempotency
            metadata: Optional metadata for assistant message (sources, suggestions)

        Returns:
            Tuple of (user_message_dict, assistant_message_dict)

        Raises:
            Exception: If transaction fails (both messages rolled back)
        """
        user_message_id = f"msg_{uuid.uuid4().hex[:12]}"
        assistant_message_id = f"msg_{uuid.uuid4().hex[:12]}"

        assistant_metadata = metadata.copy() if metadata else {}
        if client_request_id:
            assistant_metadata['client_request_id'] = client_request_id

        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.landscaper_chat_message
                (project_id, message_id, role, content, metadata, timestamp, active_tab)
                VALUES (%s, %s, 'user', %s, '{}'::jsonb, NOW(), %s)
                RETURNING message_id, timestamp
            """, [project_id, user_message_id, user_content, active_tab])
            user_row = cursor.fetchone()

            cursor.execute("""
                INSERT INTO landscape.landscaper_chat_message
                (project_id, message_id, role, content, metadata, timestamp, active_tab)
                VALUES (%s, %s, 'assistant', %s, %s::jsonb, NOW(), %s)
                RETURNING message_id, timestamp
            """, [
                project_id,
                assistant_message_id,
                assistant_content,
                json.dumps(assistant_metadata, cls=DecimalEncoder),
                active_tab
            ])
            assistant_row = cursor.fetchone()

        user_message = {
            'message_id': user_row[0],
            'role': 'user',
            'content': user_content,
            'created_at': user_row[1].isoformat() if user_row[1] else None
        }

        assistant_message = {
            'message_id': assistant_row[0],
            'role': 'assistant',
            'content': assistant_content,
            'metadata': assistant_metadata,
            'created_at': assistant_row[1].isoformat() if assistant_row[1] else None
        }

        return user_message, assistant_message

    @staticmethod
    def get_history(
        project_id: int,
        limit: int = 100,
        before_id: Optional[str] = None,
        active_tab: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get chat history for a project, optionally filtered by tab.

        Args:
            project_id: Project to get history for
            limit: Max messages to return
            before_id: Optional message_id for pagination
            active_tab: Optional tab filter (home, operations, feasibility, etc.)

        Returns:
            List of message dicts, oldest first
        """
        query = """
            SELECT message_id, role, content, metadata, timestamp, active_tab
            FROM landscape.landscaper_chat_message
            WHERE project_id = %s
        """
        params = [project_id]

        # Filter by tab if provided
        if active_tab:
            query += " AND active_tab = %s"
            params.append(active_tab)

        if before_id:
            query += """
                AND timestamp < (
                    SELECT timestamp
                    FROM landscape.landscaper_chat_message
                    WHERE message_id = %s
                )
            """
            params.append(before_id)

        query += " ORDER BY timestamp DESC LIMIT %s"
        params.append(limit)

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()

        messages = []
        for row in reversed(rows):
            # Parse metadata if it's a JSON string
            metadata = row[3]
            if isinstance(metadata, str):
                try:
                    metadata = json.loads(metadata)
                except json.JSONDecodeError:
                    metadata = {}
            messages.append({
                'message_id': row[0],
                'role': row[1],
                'content': row[2],
                'metadata': metadata or {},
                'created_at': row[4].isoformat() if row[4] else None,
                'active_tab': row[5]
            })

        return messages

    @staticmethod
    def clear_history(project_id: int) -> int:
        """
        Clear all chat history for a project.

        Returns:
            Number of messages deleted
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM landscape.landscaper_chat_message
                WHERE project_id = %s
            """, [project_id])
            return cursor.rowcount

    @staticmethod
    def get_recent_context(project_id: int, max_messages: int = 10) -> List[Dict[str, str]]:
        """
        Get recent messages formatted for AI context.

        Returns:
            List of {role, content} dicts for prompt construction
        """
        messages = MessageStorageService.get_history(project_id, limit=max_messages)
        return [{'role': m['role'], 'content': m['content']} for m in messages]


def check_idempotency(project_id: int, client_request_id: str) -> Optional[Dict[str, Any]]:
    return MessageStorageService.check_idempotency(project_id, client_request_id)


def save_message_pair(
    project_id: int,
    user_content: str,
    assistant_content: str,
    client_request_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    active_tab: str = 'home'
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    return MessageStorageService.save_message_pair(
        project_id, user_content, assistant_content, client_request_id, metadata, active_tab
    )


def get_history(
    project_id: int,
    limit: int = 100,
    before_id: Optional[str] = None,
    active_tab: Optional[str] = None
) -> List[Dict[str, Any]]:
    return MessageStorageService.get_history(project_id, limit, before_id, active_tab)


def clear_history(project_id: int) -> int:
    return MessageStorageService.clear_history(project_id)


def get_recent_context(project_id: int, max_messages: int = 10) -> List[Dict[str, str]]:
    return MessageStorageService.get_recent_context(project_id, max_messages)
