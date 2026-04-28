"""
Management command: Close (or resolve) a tbl_feedback row.

Usage:
    python manage.py close_feedback 247
    python manage.py close_feedback FB-247 --note "fixed in commit abc123"
    python manage.py close_feedback 248 --status wontfix --note "out of scope"
    python manage.py close_feedback 249 --status duplicate --duplicate-of 247

Refs: LANDSCAPE_DAILY_BRIEF_SPEC.md section 6
"""

import re
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


FB_REF_RE = re.compile(r'^(?:FB-)?(\d+)$', re.IGNORECASE)


def _parse_feedback_id(raw: str) -> int:
    """Accept bare integer or FB-N form. Raise CommandError on bad input."""
    if raw is None:
        raise CommandError("feedback_id is required")
    match = FB_REF_RE.match(str(raw).strip())
    if not match:
        raise CommandError(f"Invalid feedback id: {raw!r} (expected integer or FB-N)")
    return int(match.group(1))


class Command(BaseCommand):
    help = "Close or otherwise resolve a tbl_feedback row by id"

    def add_arguments(self, parser):
        parser.add_argument(
            'feedback_id',
            type=str,
            help="Feedback id (bare integer or FB-N form)",
        )
        parser.add_argument(
            '--status',
            default='closed',
            choices=['closed', 'wontfix', 'duplicate'],
            help="Terminal status to set (default: closed)",
        )
        parser.add_argument(
            '--note',
            default='',
            help="Resolution notes (free text)",
        )
        parser.add_argument(
            '--duplicate-of',
            type=int,
            default=None,
            help="Required when --status=duplicate; references the canonical FB id",
        )

    def handle(self, *args, **opts):
        feedback_id = _parse_feedback_id(opts['feedback_id'])
        new_status = opts['status']
        note = opts['note'] or None
        duplicate_of = opts['duplicate_of']

        if new_status == 'duplicate' and duplicate_of is None:
            raise CommandError("--status=duplicate requires --duplicate-of <id>")
        if new_status != 'duplicate' and duplicate_of is not None:
            raise CommandError("--duplicate-of is only valid with --status=duplicate")

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, status FROM landscape.tbl_feedback WHERE id = %s",
                [feedback_id],
            )
            row = cursor.fetchone()
            if row is None:
                raise CommandError(f"FB-{feedback_id} does not exist")
            current_status = row[1]
            # Only terminal states block the transition; both 'open' and
            # 'in_progress' close cleanly via this command.
            if current_status in ('closed', 'wontfix', 'duplicate'):
                raise CommandError(
                    f"FB-{feedback_id} is already in terminal state "
                    f"'{current_status}'; reopen via SQL if you need to re-resolve"
                )

            if duplicate_of is not None:
                cursor.execute(
                    "SELECT 1 FROM landscape.tbl_feedback WHERE id = %s",
                    [duplicate_of],
                )
                if cursor.fetchone() is None:
                    raise CommandError(f"--duplicate-of FB-{duplicate_of} does not exist")

            cursor.execute(
                """
                UPDATE landscape.tbl_feedback
                   SET status = %s,
                       closed_at = NOW(),
                       resolution_notes = %s,
                       duplicate_of_id = %s
                 WHERE id = %s
                 RETURNING closed_at
                """,
                [new_status, note, duplicate_of, feedback_id],
            )
            closed_at = cursor.fetchone()[0]

        self.stdout.write(self.style.SUCCESS(
            f"FB-{feedback_id} → {new_status} at {closed_at:%Y-%m-%d %H:%M:%S}"
            + (f" (duplicate of FB-{duplicate_of})" if duplicate_of else "")
            + (f"\n  note: {note}" if note else "")
        ))
