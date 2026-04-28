"""
Management command: flip a tbl_feedback row to 'in_progress' and stamp the
branch + session that's working on it.

Usage:
    python manage.py start_feedback 281
    python manage.py start_feedback FB-281 --branch feature/doc-profile-fix --session cw-gx-doc-profile

Branch and session are stored as-is (free-form strings, no validation).
The brief renders them in the "Being worked on" treatment for the row.

If the row is already in_progress, this command re-stamps it (overwrite).
If the row is already in a terminal state (closed/wontfix/duplicate),
this command refuses — re-open via SQL first if needed.

Refs: daily-brief redesign (replaces in-flight C6)
"""

import re
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


FB_REF_RE = re.compile(r'^(?:FB-)?(\d+)$', re.IGNORECASE)
TERMINAL_STATUSES = ('closed', 'wontfix', 'duplicate')


def _parse_feedback_id(raw: str) -> int:
    if raw is None:
        raise CommandError("feedback_id is required")
    match = FB_REF_RE.match(str(raw).strip())
    if not match:
        raise CommandError(f"Invalid feedback id: {raw!r} (expected integer or FB-N)")
    return int(match.group(1))


class Command(BaseCommand):
    help = "Mark a tbl_feedback row as in_progress and stamp branch/session"

    def add_arguments(self, parser):
        parser.add_argument(
            'feedback_id',
            type=str,
            help="Feedback id (bare integer or FB-N form)",
        )
        parser.add_argument(
            '--branch',
            default=None,
            help="Branch name working on this feedback (free-form string)",
        )
        parser.add_argument(
            '--session',
            default=None,
            help="Session slug working on this feedback (free-form string)",
        )

    def handle(self, *args, **opts):
        feedback_id = _parse_feedback_id(opts['feedback_id'])
        branch = opts['branch']
        session = opts['session']

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, status FROM landscape.tbl_feedback WHERE id = %s",
                [feedback_id],
            )
            row = cursor.fetchone()
            if row is None:
                raise CommandError(f"FB-{feedback_id} does not exist")

            current_status = row[1]
            if current_status in TERMINAL_STATUSES:
                raise CommandError(
                    f"FB-{feedback_id} is in terminal state '{current_status}'; "
                    f"re-open via SQL first if you want to start work on it again"
                )

            cursor.execute(
                """
                UPDATE landscape.tbl_feedback
                   SET status = 'in_progress',
                       in_progress_branch = %s,
                       in_progress_session_slug = %s,
                       started_at = NOW()
                 WHERE id = %s
                 RETURNING started_at
                """,
                [branch, session, feedback_id],
            )
            started_at = cursor.fetchone()[0]

        self.stdout.write(self.style.SUCCESS(
            f"FB-{feedback_id} → in_progress at {started_at:%Y-%m-%d %H:%M:%S}"
            + (f"\n  branch: {branch}" if branch else "")
            + (f"\n  session: {session}" if session else "")
            + (f"\n  (re-stamped from prior in_progress)" if current_status == 'in_progress' else "")
        ))
