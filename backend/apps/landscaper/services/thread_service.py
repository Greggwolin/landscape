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

# Model for title/summary generation (use Haiku for speed/cost).
# claude-3-5-haiku-20241022 was retired; bumped 2026-05-07 to match
# the current ID already in use by sister service ai_fact_extractor.py.
HAIKU_MODEL = "claude-haiku-4-5-20251001"
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
    @transaction.atomic
    def get_or_create_active_thread(
        project_id: Optional[int],
        page_context: Optional[str] = None,
        subtab_context: Optional[str] = None
    ) -> ChatThread:
        """
        Get the active thread for a project/page context, or create one if none exists.

        Passing project_id=None returns (or creates) an unassigned thread — the
        Chat Canvas pre-project holding area. Unassigned threads are not
        segmented by page_context, so the page_context filter is only applied
        when project_id is set.

        Uses SELECT ... FOR UPDATE to prevent race conditions where concurrent
        requests both see "no active thread" and both create new ones.
        """
        lookup = {'is_active': True}
        if project_id is None:
            lookup['project_id__isnull'] = True
        else:
            lookup['project_id'] = project_id
            if page_context:
                lookup['page_context'] = page_context

        if subtab_context:
            lookup['subtab_context'] = subtab_context
        else:
            lookup['subtab_context__isnull'] = True
        thread = ChatThread.objects.select_for_update().filter(**lookup).first()

        if thread:
            return thread

        thread = ChatThread.objects.create(
            project_id=project_id,
            page_context=page_context,
            subtab_context=subtab_context,
            is_active=True
        )
        owner = f"project {project_id}" if project_id is not None else 'unassigned'
        logger.info(f"Created new thread {thread.id} for {owner}, page {page_context or '-'}")
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
    def get_unassigned_threads(include_closed: bool = False):
        """
        Return unassigned (project_id IS NULL) threads for the Chat Canvas.
        """
        qs = ChatThread.objects.filter(project_id__isnull=True)
        if not include_closed:
            qs = qs.filter(is_active=True)
        return qs.order_by('-updated_at')

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

        Material-change rule (FB-292): summary is only refreshed on close when
        the thread content has materially changed since the last summary write.
        Lifecycle close alone — or a UI collapse/expand toggle — must NOT
        regenerate the summary. We approximate "material change" without an
        extra tracking column by comparing message count against the most
        recent regen threshold (5/15/30/60):

          - summary is NULL and messages exist → write initial summary
          - messages count is >=3 past the last threshold crossed → refresh
          - otherwise → leave existing summary in place

        UI collapse/expand toggles are pure frontend state; they don't call
        this method at all, so they can't trigger regen by construction.

        Args:
            thread_id: Thread UUID
            generate_summary: Whether to consider regenerating an AI summary.
                              The material-change check still gates whether
                              regen actually fires.

        Returns:
            Updated ChatThread instance, or None
        """
        try:
            thread = ChatThread.objects.select_for_update().get(id=thread_id)
            thread.is_active = False
            thread.closed_at = timezone.now()

            if generate_summary:
                msg_count = thread.messages.count()
                # Last threshold crossed (0 if below the first threshold).
                last_threshold = max(
                    [t for t in ThreadService.SUMMARY_REGEN_THRESHOLDS if t <= msg_count],
                    default=0,
                )
                messages_since_threshold = msg_count - last_threshold
                has_summary = bool(thread.summary and thread.summary.strip())
                # Regenerate when:
                #   (a) summary missing but conversation has content, OR
                #   (b) at least 3 new messages since the last threshold cross
                #       (heuristic for "material change" without a column add)
                should_regen = (msg_count > 0) and (
                    (not has_summary) or (messages_since_threshold >= 3)
                )
                if should_regen:
                    messages = list(
                        thread.messages.all().order_by('created_at')[:20]
                    )
                    summary = ThreadService.generate_thread_summary(messages)
                    if summary:
                        thread.summary = summary
                        logger.info(
                            f"Refreshed summary on close for thread {thread_id} "
                            f"(msg_count={msg_count}, since_threshold={messages_since_threshold})"
                        )
                else:
                    logger.debug(
                        f"Skipped summary regen on close for thread {thread_id} "
                        f"(material-change check; msg_count={msg_count}, "
                        f"since_threshold={messages_since_threshold})"
                    )

            thread.save()
            logger.info(f"Closed thread {thread_id}")
            return thread

        except ChatThread.DoesNotExist:
            logger.warning(f"Thread {thread_id} not found for closing")
            return None

    @staticmethod
    @transaction.atomic
    def start_new_thread(
        project_id: Optional[int],
        page_context: Optional[str] = None,
        subtab_context: Optional[str] = None
    ) -> ChatThread:
        """
        Start a new thread, closing any existing active thread for the same context.

        When project_id is None (unassigned thread), the previous active
        unassigned thread is closed but NOT archived to ActivityItem —
        ActivityItem.project is non-nullable.
        """
        existing_lookup = {'is_active': True}
        if project_id is None:
            existing_lookup['project_id__isnull'] = True
        else:
            existing_lookup['project_id'] = project_id
            if page_context:
                existing_lookup['page_context'] = page_context
        if subtab_context:
            existing_lookup['subtab_context'] = subtab_context
        else:
            existing_lookup['subtab_context__isnull'] = True
        existing = ChatThread.objects.filter(**existing_lookup)

        for thread in existing:
            ThreadService.close_thread(thread.id, generate_summary=True)

            # ActivityItem.project is non-nullable — only archive project-scoped threads.
            if project_id is None:
                continue

            try:
                from ..models import ActivityItem
                msg_count = thread.messages.count()
                if msg_count > 0:
                    summary_text = thread.summary or f"Chat thread with {msg_count} messages"
                    title_suffix = page_context or 'general'
                    ActivityItem.objects.create(
                        project_id=project_id,
                        activity_type='status',
                        title=thread.title or f"Landscaper: {title_suffix}" + (f" / {subtab_context}" if subtab_context else ""),
                        summary=f"Archived chat ({msg_count} messages): {summary_text[:200]}",
                        status='complete',
                        source_type='thread',
                        source_id=str(thread.id),
                        details=[f"Page: {title_suffix}", f"Tab: {subtab_context or 'general'}", f"Messages: {msg_count}"],
                    )
                    logger.info(f"Archived thread {thread.id} to activity log ({msg_count} messages)")
            except Exception as e:
                logger.warning(f"Failed to archive thread {thread.id} to activity: {e}")

        new_thread = ChatThread.objects.create(
            project_id=project_id,
            page_context=page_context,
            subtab_context=subtab_context,
            is_active=True
        )
        owner = f"project {project_id}" if project_id is not None else 'unassigned'
        logger.info(f"Started new thread {new_thread.id} for {owner}, page {page_context or '-'}")
        return new_thread

    @staticmethod
    @transaction.atomic
    def promote_thread(
        thread_id,
        project_id: int,
        move_thread: bool = True,
    ) -> ChatThread:
        """
        Reparent an unassigned thread to a project.

        When move_thread=True (default), the thread itself gets reparented. When
        False, only documents linked to the thread are reparented — the thread
        stays unassigned (useful if the user wants to keep the general chat but
        move attachments into the new project).
        """
        thread = ChatThread.objects.select_for_update().get(id=thread_id)

        if thread.project_id is not None:
            raise ValueError(
                f"Thread {thread_id} already belongs to project {thread.project_id}"
            )

        if move_thread:
            thread.project_id = project_id
            thread.save(update_fields=['project_id', 'updated_at'])

        from apps.documents.models import Document
        Document.objects.filter(
            thread_id=thread_id,
            project_id__isnull=True,
        ).update(project_id=project_id)

        return thread

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

    # Message-count thresholds that trigger an opportunistic summary
    # regeneration. Keeps Haiku cost bounded — at most ~4 calls per heavy
    # thread over its lifetime — while ensuring active threads accumulate
    # a usable preview summary as they grow. close_thread() applies a
    # material-change check on top of these thresholds so that closing a
    # thread (or toggling visibility in the UI) does not re-trigger the
    # summary call needlessly.
    SUMMARY_REGEN_THRESHOLDS = (5, 15, 30, 60)

    @staticmethod
    def _highest_threshold_at_or_below(msg_count: int) -> int:
        """Return the largest threshold ≤ msg_count, or 0 if below first."""
        return max(
            (t for t in ThreadService.SUMMARY_REGEN_THRESHOLDS if t <= msg_count),
            default=0,
        )

    @staticmethod
    def maybe_regenerate_summary(thread_id: UUID) -> Optional[str]:
        """
        Opportunistically regenerate a thread summary when the thread has
        either (a) crossed a new threshold this turn, or (b) reached at
        least the first threshold without ever having a summary yet.

        FIX (PG28): the original implementation used an exact-match check
        (`msg_count in (5, 15, 30, 60)`) which silently never fired the
        5- and 15-message thresholds because each turn appends BOTH the
        user message AND the assistant reply, so the message count grows
        by 2 per turn. The count goes 4 → 6 → 8, never landing exactly
        on 5 or 15. The current logic uses crossing detection (compare
        the highest threshold passed at msg_count vs at msg_count - 1)
        plus a one-time backfill for threads that pre-existed this code.

        Used by ThreadMessageViewSet.create after each assistant turn to
        keep active-thread previews fresh in the center-panel drawer
        (FB-292 — show 1-2 sentence summary on collapsed thread previews).

        Args:
            thread_id: Thread UUID

        Returns:
            Newly written summary string, or None if no regeneration
            occurred (no threshold crossed and no backfill needed, no
            messages, or the Haiku generator failed).
        """
        try:
            thread = ChatThread.objects.get(id=thread_id)
        except ChatThread.DoesNotExist:
            return None

        msg_count = thread.messages.count()
        first_threshold = ThreadService.SUMMARY_REGEN_THRESHOLDS[0]
        if msg_count < first_threshold:
            # Below the first threshold — too few messages to summarize.
            return None

        # Did this message-create cross a new threshold? (e.g., count
        # jumped 14 → 16, crossing 15; or 4 → 6, crossing 5.)
        cur_t = ThreadService._highest_threshold_at_or_below(msg_count)
        prev_t = ThreadService._highest_threshold_at_or_below(msg_count - 2)
        crossed_threshold = cur_t > prev_t

        # Backfill: thread already past first threshold but has no
        # summary (created before FB-292, never crossed a threshold
        # while the code was running, etc.). Generate once.
        has_summary = bool(thread.summary and thread.summary.strip())
        needs_backfill = (not has_summary) and msg_count >= first_threshold

        if not (crossed_threshold or needs_backfill):
            return None

        messages = list(thread.messages.all().order_by('created_at')[:20])
        if not messages:
            return None

        summary = ThreadService.generate_thread_summary(messages)
        if not summary:
            return None

        # update_fields=['summary'] keeps the write narrow; any concurrent
        # column writes (e.g., title generation in the same request)
        # aren't clobbered because they target different fields.
        thread.summary = summary
        thread.save(update_fields=['summary'])
        reason = 'crossed_threshold' if crossed_threshold else 'backfill'
        logger.info(
            f"Refreshed summary for thread {thread_id} at message count "
            f"{msg_count} (reason={reason}, prev_t={prev_t}, cur_t={cur_t})"
        )
        return summary

    @staticmethod
    def generate_thread_summary(messages: list) -> Optional[str]:
        """
        Generate a summary of a thread for RAG context and the
        center-panel preview row (FB-292).

        Output is a small fragment of HTML (not Markdown, not plain text)
        so the frontend ThreadList renderer can present key terms with
        light emphasis without a separate parsing step. Allowed tags are
        constrained to a safe inline set: <b>, <strong>, <i>, <em>, <br>.
        No block-level tags, no anchors, no scripts.

        Args:
            messages: List of ThreadMessage instances

        Returns:
            Generated summary HTML fragment (2-3 sentences), or None on
            failure.
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

            prompt = f"""Summarize this conversation in 2-3 sentences as a small HTML fragment. Focus on:
- Key topics discussed
- Decisions made or conclusions reached
- Important data points mentioned

Formatting rules:
- Output is HTML, not Markdown.
- You may use these inline tags only: <b>, <strong>, <i>, <em>, <br>.
- Bold the 1-3 most important terms with <b>...</b>. Use sparingly.
- No <p>, <div>, <a>, <script>, no block tags, no links, no images.
- No surrounding <html> or <body> wrapper.

Conversation:
{conversation}

Return ONLY the HTML fragment, no introduction or explanation."""

            response = client.messages.create(
                model=HAIKU_MODEL,
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )

            summary = response.content[0].text.strip()
            summary = ThreadService._sanitize_summary_html(summary)
            logger.debug(f"Generated thread summary: {summary[:100]}...")
            return summary or None

        except Exception as e:
            logger.warning(f"Failed to generate thread summary: {e}")
            return None

    # Allowed tag set for thread-summary HTML. Anything else is stripped.
    # Kept intentionally narrow — these are inline emphasis tags only.
    _SUMMARY_ALLOWED_TAGS = ('b', 'strong', 'i', 'em', 'br')

    @staticmethod
    def _sanitize_summary_html(raw: str) -> str:
        """Strip everything outside the allowed inline-emphasis tag set.

        Defense-in-depth — even though the source is our own Haiku call,
        the result is rendered with dangerouslySetInnerHTML on the client,
        so we don't want to assume the model's output is well-formed.
        Removes any tag whose name (case-insensitive) is not in
        _SUMMARY_ALLOWED_TAGS, and strips all attributes from the tags
        that survive (no onclick, no style, no href).
        """
        if not raw:
            return ''

        import re

        allowed = set(t.lower() for t in ThreadService._SUMMARY_ALLOWED_TAGS)

        def _replace(match: 're.Match[str]') -> str:
            closing = match.group(1) == '/'
            name = match.group(2).lower()
            if name not in allowed:
                return ''
            # Self-closing for <br>; otherwise emit bare opening or closing tag
            # with NO attributes preserved.
            if name == 'br':
                return '<br>'
            return f'</{name}>' if closing else f'<{name}>'

        # Match either an opening, closing, or self-closing tag.
        cleaned = re.sub(r'<\s*(/?)\s*([a-zA-Z][a-zA-Z0-9]*)[^>]*?>', _replace, raw)
        return cleaned.strip()

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
