"""
Management command to backfill titles for existing untitled threads.

Usage:
    python manage.py backfill_thread_titles          # dry-run (default)
    python manage.py backfill_thread_titles --apply   # actually generate titles
    python manage.py backfill_thread_titles --limit 10 --apply  # limit to 10 threads
"""

import logging
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Generate titles for threads that have messages but no title'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            default=False,
            help='Actually generate titles (default is dry-run)',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Max threads to process (0 = all)',
        )

    def handle(self, *args, **options):
        from apps.landscaper.models import ChatThread
        from apps.landscaper.services.thread_service import ThreadService

        apply = options['apply']
        limit = options['limit']

        # Find threads with no title that have at least 2 messages
        untitled = ChatThread.objects.filter(
            title__isnull=True
        ).prefetch_related('messages').order_by('-updated_at')

        # Also catch empty-string titles
        from django.db.models import Q
        untitled = ChatThread.objects.filter(
            Q(title__isnull=True) | Q(title='')
        ).prefetch_related('messages').order_by('-updated_at')

        candidates = []
        for thread in untitled:
            msgs = list(thread.messages.order_by('created_at')[:2])
            user_msg = next((m for m in msgs if m.role == 'user'), None)
            asst_msg = next((m for m in msgs if m.role == 'assistant'), None)
            if user_msg and asst_msg:
                candidates.append((thread, user_msg, asst_msg))

        if limit > 0:
            candidates = candidates[:limit]

        self.stdout.write(f"Found {len(candidates)} untitled threads with messages")

        if not apply:
            self.stdout.write(self.style.WARNING("DRY RUN — pass --apply to generate titles"))
            for thread, user_msg, _ in candidates:
                preview = user_msg.content[:80].replace('\n', ' ')
                self.stdout.write(f"  [{thread.id}] project={thread.project_id} — \"{preview}\"")
            return

        success = 0
        failed = 0
        for thread, user_msg, asst_msg in candidates:
            try:
                title = ThreadService.generate_thread_title(
                    user_msg.content,
                    asst_msg.content,
                )
                if title:
                    thread.title = title
                    thread.save(update_fields=['title', 'updated_at'])
                    self.stdout.write(self.style.SUCCESS(f"  [{thread.id}] → \"{title}\""))
                    success += 1
                else:
                    self.stdout.write(self.style.WARNING(f"  [{thread.id}] — no title generated"))
                    failed += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  [{thread.id}] — error: {e}"))
                failed += 1

        self.stdout.write(f"\nDone: {success} titled, {failed} failed")
