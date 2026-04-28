"""
Management command: list rows from tbl_feedback for quick review.

Usage:
    python manage.py list_feedback                   # status=open, last 50
    python manage.py list_feedback --limit 10
    python manage.py list_feedback --status closed
    python manage.py list_feedback --all             # ignore status filter

Output:
    FB-N | status | YYYY-MM-DD | page_context | first 80 chars of message

Refs: LANDSCAPE_DAILY_BRIEF_SPEC.md section 6
"""

from django.core.management.base import BaseCommand
from django.db import connection


VALID_STATUSES = ('open', 'addressed', 'closed', 'wontfix', 'duplicate')


def _truncate(text: str, n: int = 80) -> str:
    if text is None:
        return ''
    clean = ' '.join(text.split())
    return clean if len(clean) <= n else clean[: n - 1] + '…'


class Command(BaseCommand):
    help = "List rows from landscape.tbl_feedback"

    def add_arguments(self, parser):
        parser.add_argument(
            '--status',
            default='open',
            choices=list(VALID_STATUSES),
            help="Filter by status (default: open). Ignored when --all is set.",
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help="Maximum rows to return (default: 50)",
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help="Show all statuses (status filter ignored)",
        )

    def handle(self, *args, **opts):
        limit = max(1, opts['limit'])
        if opts['all']:
            sql = """
                SELECT id, status, created_at, page_context, message_text
                  FROM landscape.tbl_feedback
                 ORDER BY id DESC
                 LIMIT %s
            """
            params = [limit]
        else:
            sql = """
                SELECT id, status, created_at, page_context, message_text
                  FROM landscape.tbl_feedback
                 WHERE status = %s
                 ORDER BY id DESC
                 LIMIT %s
            """
            params = [opts['status'], limit]

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        if not rows:
            scope = 'all statuses' if opts['all'] else f"status={opts['status']}"
            self.stdout.write(f"(no rows for {scope})")
            return

        for fb_id, status, created_at, page_context, message_text in rows:
            self.stdout.write(
                f"FB-{fb_id:<5} | {status:<9} | {created_at:%Y-%m-%d} | "
                f"{(page_context or '—')[:30]:<30} | {_truncate(message_text)}"
            )
        self.stdout.write(self.style.SUCCESS(f"\n{len(rows)} row(s)"))
