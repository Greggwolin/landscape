"""
Management command: append a timestamped, tagged line to a tbl_feedback row's
`working_summary` column.

Used by Cowork sessions tied to a specific feedback item to maintain a
chronological log of inflection points (start / decision / edit / blocker /
user-input / artifact / prompt / resolved / closed / note). See
PROJECT_INSTRUCTIONS.md §21.

Usage:
    python manage.py append_feedback_line FB-281 --tag edit \\
        --content "Added confidence check + user-prompt path"

    python manage.py append_feedback_line 281 --tag start \\
        --content "Picked up FB-281 from Fix Prompt"

Behavior:
    - Append-only: never rewrites prior content.
    - Single-line content: rejects newlines in --content (use multiple calls).
    - Stamps each line with the current timestamp in YYYY-MM-DD HH:MM format.
    - Errors loudly on bad fb_id, missing row, or invalid tag.

Refs: LSCMD-FBLOG-0505-kp Phase 3 / PROJECT_INSTRUCTIONS.md §21
"""

import re
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


FB_REF_RE = re.compile(r'^(?:FB-)?(\d+)$', re.IGNORECASE)

# Inflection-point taxonomy — see PROJECT_INSTRUCTIONS.md §21.2
VALID_TAGS = (
    'start',
    'decision',
    'edit',
    'blocker',
    'user-input',
    'artifact',
    'prompt',
    'resolved',
    'closed',
    'note',
)


def _parse_feedback_id(raw):
    """Accept bare integer or FB-N form. Raise CommandError on bad input."""
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
        "Append a timestamped, tagged line to landscape.tbl_feedback.working_summary "
        "for the given feedback id. Used by Cowork chat-tied feedback tracking "
        "(PROJECT_INSTRUCTIONS.md §21)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'feedback_id',
            type=str,
            help="Feedback id (bare integer or FB-N form)",
        )
        parser.add_argument(
            '--tag',
            required=True,
            choices=list(VALID_TAGS),
            help="Inflection-point tag (see PROJECT_INSTRUCTIONS.md §21.2)",
        )
        parser.add_argument(
            '--content',
            required=True,
            help="Single-line description of the inflection point (no newlines)",
        )

    def handle(self, *args, **opts):
        feedback_id = _parse_feedback_id(opts['feedback_id'])
        tag = opts['tag']
        content = (opts['content'] or '').strip()

        if not content:
            raise CommandError("--content must not be empty")
        if '\n' in content or '\r' in content:
            raise CommandError(
                "--content must be a single line; got an embedded newline"
            )

        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')
        new_line = f"{timestamp} [{tag}] {content}"

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM landscape.tbl_feedback WHERE id = %s",
                [feedback_id],
            )
            if cursor.fetchone() is None:
                raise CommandError(f"FB-{feedback_id} does not exist")

            # Atomic append: empty/null prefix gets no leading newline; otherwise
            # newline-separates from the prior content. RETURNING gives us the
            # post-append value so we can show line count in the success line.
            cursor.execute(
                """
                UPDATE landscape.tbl_feedback
                   SET working_summary = CASE
                         WHEN working_summary IS NULL OR working_summary = ''
                         THEN %s
                         ELSE working_summary || E'\n' || %s
                       END
                 WHERE id = %s
                 RETURNING working_summary
                """,
                [new_line, new_line, feedback_id],
            )
            updated = cursor.fetchone()[0]

        line_count = (updated or '').count('\n') + 1
        self.stdout.write(self.style.SUCCESS(
            f"FB-{feedback_id} working_summary appended: {new_line}\n"
            f"  ({line_count} total line{'s' if line_count != 1 else ''})"
        ))
