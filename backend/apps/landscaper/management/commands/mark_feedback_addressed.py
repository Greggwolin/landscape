"""
Management command: mark a tbl_feedback row as 'addressed' — the interim
state between in_progress and closed, used when the fix has landed in chat
but the commit/push hasn't yet been executed.

Distinct from close_feedback (which only handles terminal states:
closed / wontfix / duplicate). Distinct from start_feedback (which flips
the row TO in_progress). This command is the missing in_progress → addressed
transition that Cowork needs for Phase 5 (auto-resolution-detection) of
LSCMD-FBLOG-0505-kp.

Usage:
    python manage.py mark_feedback_addressed FB-281
    python manage.py mark_feedback_addressed 281 --commit-sha abc123 --commit-url https://github.com/.../commit/abc123
    python manage.py mark_feedback_addressed FB-281 --resolution-notes "fixed in chat, awaiting commit"

Behavior:
    - Only valid from current status 'in_progress' or 'open'. From terminal
      states (closed/wontfix/duplicate) raises an error — use SQL to reopen
      first if needed.
    - Stamps addressed_at = NOW().
    - Optional --commit-sha and --commit-url for when the commit is already
      in hand (some flows write the commit before flipping status).
    - Optional --resolution-notes for context.

Refs: LSCMD-FBLOG-0505-kp Phase 5 / PROJECT_INSTRUCTIONS.md §21.9
"""

import re
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


FB_REF_RE = re.compile(r'^(?:FB-)?(\d+)$', re.IGNORECASE)
TERMINAL_STATUSES = ('closed', 'wontfix', 'duplicate')


def _parse_feedback_id(raw):
    if raw is None:
        raise CommandError("feedback_id is required")
    match = FB_REF_RE.match(str(raw).strip())
    if not match:
        raise CommandError(
            f"Invalid feedback id: {raw!r} (expected integer or FB-N)"
        )
    return int(match.group(1))


class Command(BaseCommand):
    help = (
        "Mark a tbl_feedback row as 'addressed' (interim state between "
        "in_progress and closed). Used by Cowork chat-tied feedback "
        "tracking when resolution language is detected with high "
        "confidence (PROJECT_INSTRUCTIONS.md §21.9)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'feedback_id',
            type=str,
            help="Feedback id (bare integer or FB-N form)",
        )
        parser.add_argument(
            '--commit-sha',
            default=None,
            help="Resolving commit SHA (optional, populates resolved_by_commit_sha)",
        )
        parser.add_argument(
            '--commit-url',
            default=None,
            help="Resolving commit URL (optional, populates resolved_by_commit_url)",
        )
        parser.add_argument(
            '--resolution-notes',
            default=None,
            help="Optional resolution notes (free text, single line)",
        )

    def handle(self, *args, **opts):
        feedback_id = _parse_feedback_id(opts['feedback_id'])
        commit_sha = opts['commit_sha']
        commit_url = opts['commit_url']
        notes = opts['resolution_notes']

        if notes and ('\n' in notes or '\r' in notes):
            raise CommandError("--resolution-notes must be a single line")

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
                    f"reopen via SQL first if you need to mark it addressed again"
                )
            if current_status == 'addressed':
                # Re-running on an already-addressed row is a no-op except for
                # any new commit/notes information the caller passed.
                pass

            cursor.execute(
                """
                UPDATE landscape.tbl_feedback
                   SET status = 'addressed',
                       addressed_at = COALESCE(addressed_at, NOW()),
                       resolved_by_commit_sha = COALESCE(%s, resolved_by_commit_sha),
                       resolved_by_commit_url = COALESCE(%s, resolved_by_commit_url),
                       resolution_notes = COALESCE(%s, resolution_notes)
                 WHERE id = %s
                 RETURNING addressed_at
                """,
                [commit_sha, commit_url, notes, feedback_id],
            )
            addressed_at = cursor.fetchone()[0]

        self.stdout.write(self.style.SUCCESS(
            f"FB-{feedback_id} → addressed at {addressed_at:%Y-%m-%d %H:%M:%S}"
            + (f"\n  commit: {commit_sha}" if commit_sha else "")
            + (f"\n  url: {commit_url}" if commit_url else "")
            + (f"\n  notes: {notes}" if notes else "")
            + (f"\n  (was already in addressed; updates merged)" if current_status == 'addressed' else "")
        ))
