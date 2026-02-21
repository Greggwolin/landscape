"""
Thread Service for Landscaper Chat Threads.

Provides:
- Thread creation and management
- Auto-generated thread titles from conversation content
- Thread summary generation for cross-thread RAG
- Thread lifecycle management (close, cleanup)
"""

import logging
from typing import Optional, Dict, Any
from uuid import UUID
from django.utils import timezone
from django.db import transaction

import anthropic
from decouple import config

from ..models import ChatThread, ThreadMessage

logger = logging.getLogger(__name__)

# Model for title/summary generation (use Haiku for speed/cost)
HAIKU_MODEL = "claude-3-5-haiku-20241022"
ANTHROPIC_TIMEOUT_SECONDS = 30


def get_anthropic_client() -> anthropic.Anthropic:
    """Get configured Anthropic client."""
    return anthropic.Anthropic(
        api_key=config('ANTHROPIC_API_KEY'),
        timeout=ANTHROPIC_TIMEOUT_SECONDS,
    )


class ThreadService:
    """Service for managing Landscaper chat threads."""

    @staticmethod
    def get_or_create_active_thread(
        project_id: int,
        page_context: str,
        subtab_context: Optional[str] = None
    ) -> ChatThread:
        """
        Get the active thread for a project/page context, or create one if none exists.

        Args:
            project_id: Project ID
            page_context: Page context (e.g., 'property', 'operations')
            subtab_context: Optional subtab context

        Returns:
            Active ChatThread instance
        """
        # Try to find existing active thread
        lookup = {
            'project_id': project_id,
            'page_context': page_context,
            'is_active': True,
        }
        if subtab_context:
            lookup['subtab_context'] = subtab_context
        else:
            lookup['subtab_context__isnull'] = True
        thread = ChatThread.objects.filter(**lookup).first()

        if thread:
            return thread

        # Create new thread
        thread = ChatThread.objects.create(
            project_id=project_id,
            page_context=page_context,
            subtab_context=subtab_context,
            is_active=True
        )
        logger.info(f"Created new thread {thread.id} for project {project_id}, page {page_context}")
        return thread

    @staticmethod
    def get_threads_for_project(
        project_id: int,
        page_context: Optional[str] = None,
        subtab_context: Optional[str] = None,
        include_inactive: bool = False
    ) -> list:
        """
        Get all threads for a project, optionally filtered by page context.

        Args:
            project_id: Project ID
            page_context: Optional page context filter
            include_inactive: Whether to include closed threads

        Returns:
            List of ChatThread instances
        """
        queryset = ChatThread.objects.filter(project_id=project_id)

        if page_context:
            queryset = queryset.filter(page_context=page_context)

        if subtab_context:
            queryset = queryset.filter(subtab_context=subtab_context)

        if not include_inactive:
            queryset = queryset.filter(is_active=True)

        return list(queryset.order_by('-updated_at'))

    @staticmethod
    def get_thread_with_messages(thread_id: UUID) -> Optional[ChatThread]:
        """
        Get a thread with its messages prefetched.

        Args:
            thread_id: Thread UUID

        Returns:
            ChatThread instance with messages, or None
        """
        try:
            return ChatThread.objects.prefetch_related('messages').get(id=thread_id)
        except ChatThread.DoesNotExist:
            return None

    @staticmethod
    @transaction.atomic
    def close_thread(thread_id: UUID, generate_summary: bool = True) -> Optional[ChatThread]:
        """
        Close a thread and optionally generate a summary.

        Args:
            thread_id: Thread UUID
            generate_summary: Whether to generate an AI summary

        Returns:
            Updated ChatThread instance, or None
        """
        try:
            thread = ChatThread.objects.select_for_update().get(id=thread_id)
            thread.is_active = False
            thread.closed_at = timezone.now()

            if generate_summary:
                messages = list(thread.messages.all()[:20])  # Limit for summary
                if messages:
                    summary = ThreadService.generate_thread_summary(messages)
                    if summary:
                        thread.summary = summary

            thread.save()
            logger.info(f"Closed thread {thread_id}")
            return thread

        except ChatThread.DoesNotExist:
            logger.warning(f"Thread {thread_id} not found for closing")
            return None

    @staticmethod
    @transaction.atomic
    def start_new_thread(
        project_id: int,
        page_context: str,
        subtab_context: Optional[str] = None
    ) -> ChatThread:
        """
        Start a new thread, closing any existing active thread for the same context.

        Args:
            project_id: Project ID
            page_context: Page context
            subtab_context: Optional subtab context

        Returns:
            New ChatThread instance
        """
        # Close existing active thread(s) for this context
        existing_lookup = {
            'project_id': project_id,
            'page_context': page_context,
            'is_active': True,
        }
        if subtab_context:
            existing_lookup['subtab_context'] = subtab_context
        else:
            existing_lookup['subtab_context__isnull'] = True
        existing = ChatThread.objects.filter(**existing_lookup)

        for thread in existing:
            ThreadService.close_thread(thread.id, generate_summary=True)

            # Archive to activity log
            try:
                from ..models import ActivityItem
                msg_count = thread.messages.count()
                if msg_count > 0:
                    summary_text = thread.summary or f"Chat thread with {msg_count} messages"
                    ActivityItem.objects.create(
                        project_id=project_id,
                        activity_type='status',
                        title=thread.title or f"Landscaper: {page_context}" + (f" / {subtab_context}" if subtab_context else ""),
                        summary=f"Archived chat ({msg_count} messages): {summary_text[:200]}",
                        status='complete',
                        source_type='thread',
                        source_id=str(thread.id),
                        details=[f"Page: {page_context}", f"Tab: {subtab_context or 'general'}", f"Messages: {msg_count}"],
                    )
                    logger.info(f"Archived thread {thread.id} to activity log ({msg_count} messages)")
            except Exception as e:
                logger.warning(f"Failed to archive thread {thread.id} to activity: {e}")

        # Create new thread
        new_thread = ChatThread.objects.create(
            project_id=project_id,
            page_context=page_context,
            subtab_context=subtab_context,
            is_active=True
        )
        logger.info(f"Started new thread {new_thread.id} for project {project_id}, page {page_context}")
        return new_thread

    @staticmethod
    def generate_thread_title(
        first_user_message: str,
        first_ai_response: str
    ) -> Optional[str]:
        """
        Generate a concise title for a chat thread based on the first exchange.

        Args:
            first_user_message: First user message content
            first_ai_response: First AI response content

        Returns:
            Generated title (3-6 words), or None on failure
        """
        try:
            client = get_anthropic_client()

            prompt = f"""Based on this conversation start, generate a concise 3-6 word title.

User: {first_user_message[:500]}
Assistant: {first_ai_response[:500]}

Return ONLY the title, no quotes or explanation. Make it descriptive of the topic discussed."""

            response = client.messages.create(
                model=HAIKU_MODEL,
                max_tokens=30,
                messages=[{"role": "user", "content": prompt}]
            )

            title = response.content[0].text.strip()
            # Clean up any quotes that might have been added
            title = title.strip('"\'')
            # Ensure reasonable length
            if len(title) > 100:
                title = title[:97] + '...'

            logger.debug(f"Generated thread title: {title}")
            return title

        except Exception as e:
            logger.warning(f"Failed to generate thread title: {e}")
            return None

    @staticmethod
    def generate_thread_summary(messages: list) -> Optional[str]:
        """
        Generate a summary of a thread for RAG context.

        Args:
            messages: List of ThreadMessage instances

        Returns:
            Generated summary (2-3 sentences), or None on failure
        """
        if not messages:
            return None

        try:
            client = get_anthropic_client()

            # Build conversation text
            conversation_parts = []
            for msg in messages[:20]:  # Limit to first 20 messages
                content = msg.content[:200] if len(msg.content) > 200 else msg.content
                conversation_parts.append(f"{msg.role}: {content}")

            conversation = "\n".join(conversation_parts)

            prompt = f"""Summarize this conversation in 2-3 sentences. Focus on:
- Key topics discussed
- Decisions made or conclusions reached
- Important data points mentioned

Conversation:
{conversation}

Return ONLY the summary, no introduction or explanation."""

            response = client.messages.create(
                model=HAIKU_MODEL,
                max_tokens=150,
                messages=[{"role": "user", "content": prompt}]
            )

            summary = response.content[0].text.strip()
            logger.debug(f"Generated thread summary: {summary[:100]}...")
            return summary

        except Exception as e:
            logger.warning(f"Failed to generate thread summary: {e}")
            return None

    @staticmethod
    def update_thread_title(thread_id: UUID, title: str) -> Optional[ChatThread]:
        """
        Update a thread's title (user edit).

        Args:
            thread_id: Thread UUID
            title: New title

        Returns:
            Updated ChatThread instance, or None
        """
        try:
            thread = ChatThread.objects.get(id=thread_id)
            thread.title = title[:255]  # Ensure max length
            thread.save(update_fields=['title', 'updated_at'])
            return thread
        except ChatThread.DoesNotExist:
            return None

    @staticmethod
    def maybe_generate_title_async(thread_id: UUID) -> None:
        """
        Check if thread needs a title and generate one if so.

        Should be called after the first AI response in a thread.
        This method is designed to be called asynchronously/in background.

        Args:
            thread_id: Thread UUID
        """
        try:
            thread = ChatThread.objects.prefetch_related('messages').get(id=thread_id)

            # Only generate if no title yet
            if thread.title:
                return

            messages = list(thread.messages.all()[:2])

            # Need at least a user message and assistant response
            if len(messages) < 2:
                return

            user_msg = next((m for m in messages if m.role == 'user'), None)
            assistant_msg = next((m for m in messages if m.role == 'assistant'), None)

            if not user_msg or not assistant_msg:
                return

            title = ThreadService.generate_thread_title(
                user_msg.content,
                assistant_msg.content
            )

            if title:
                thread.title = title
                thread.save(update_fields=['title', 'updated_at'])
                logger.info(f"Auto-generated title for thread {thread_id}: {title}")

        except ChatThread.DoesNotExist:
            logger.warning(f"Thread {thread_id} not found for title generation")
        except Exception as e:
            logger.error(f"Error generating title for thread {thread_id}: {e}")
