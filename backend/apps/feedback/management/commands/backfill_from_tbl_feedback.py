"""
Management command: one-time backfill of `landscape.tbl_feedback` rows
(Layer 3, the Discord-driven capture path) into `landscape.tester_feedback`
(Layer 2, the existing Django-managed feedback table read by /admin/feedback
and the user-facing FeedbackLog component).

Why this exists: the two tables grew up independently. Most feedback over the
past month came in via the `#FB` tag in Help chat and landed in `tbl_feedback`,
while the `/admin/feedback` page reads from `tester_feedback` and would show
an empty queue. This command bridges the gap so the existing Layer 2 frontend
becomes immediately useful as an in-app feedback log.

Scope: chosen as "Option 1 for now" in session LSCMD-FBLOG-0505-kp / chat kp.
This is NOT a full unification — both tables continue to exist and accept
writes. The full migration is queued for a separate session.

Usage:
    # Default: dry run, prints what would happen
    python manage.py backfill_from_tbl_feedback --owner-email gregg@wolinfamily.com

    # Actually do it
    python manage.py backfill_from_tbl_feedback \\
        --owner-email gregg@wolinfamily.com --execute

    # Re-run (idempotent — skips rows already migrated)
    python manage.py backfill_from_tbl_feedback \\
        --owner-email gregg@wolinfamily.com --execute

Behavior:
    - All backfilled tester_feedback rows are attributed to a single owner
      user, looked up by email. Required because tester_feedback requires
      a user FK; tbl_feedback's user_id is often NULL.
    - Status translation:
        tbl_feedback     -> tester_feedback
        open             -> submitted
        in_progress      -> under_review
        addressed        -> addressed
        closed           -> addressed
        wontfix          -> addressed (note added)
        duplicate        -> SKIPPED (originals already migrated; back-pointer
                            preserved as admin_notes reference)
    - Idempotency: each migrated row gets `admin_notes` prefixed with
      "[migrated FB-N on YYYY-MM-DD]" — re-runs skip rows whose admin_notes
      already contains that exact prefix.
    - Layer-3-4 lifecycle fields (working_summary, active_chat_slug,
      in_progress_branch, in_progress_session_slug, started_at, closed_at,
      resolved_by_commit_sha, resolved_by_commit_url) are appended to
      admin_notes for traceability — no separate columns added to
      tester_feedback.
    - Category and affected_module are derived using the same
      `classify_feedback()` and `extract_affected_module()` helpers the
      Layer 2 submit endpoint uses.

Refs: LSCMD-FBLOG-0505-kp / chat kp / Feedback Layers Comparison kp35.
"""

from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import connection, transaction

from apps.feedback.models import TesterFeedback
from apps.feedback.views import classify_feedback, extract_affected_module


# Status mapping: tbl_feedback (6 states) -> tester_feedback (3 states)
STATUS_MAP = {
    'open': 'submitted',
    'in_progress': 'under_review',
    'addressed': 'addressed',
    'closed': 'addressed',
    'wontfix': 'addressed',
    # 'duplicate' is handled separately — skipped
}

# Map tbl_feedback category-ish hints to tester_feedback feedback_type
# (Layer 2 still uses the legacy feedback_type field; FeedbackSubmitView
# derives it from category. We'll do the same here.)
CATEGORY_TO_TYPE = {
    'bug': 'bug',
    'feature_request': 'feature',
    'ux_confusion': 'general',
    'question': 'question',
}


def _strip_help_prefix(page_context: str) -> str:
    """Turn 'Help > property_location' into 'property_location'."""
    if not page_context:
        return ''
    return page_context.replace('Help > ', '', 1).strip()


def _migration_marker(fb_id: int, date_str: str) -> str:
    """The admin_notes prefix used for idempotency."""
    return f"[migrated FB-{fb_id} on {date_str}]"


def _build_admin_notes(row: dict, marker: str) -> str:
    """
    Stuff the Layer-3-4 lifecycle fields into admin_notes so nothing is
    silently lost. First line is the marker (used for idempotency on re-run).
    """
    lines = [marker]
    lines.append(f"Source: {row.get('source') or 'unknown'}")
    lines.append(f"Original status: {row['status']}")

    if row.get('started_at'):
        line = f"Started: {row['started_at']:%Y-%m-%d %H:%M}"
        if row.get('in_progress_branch'):
            line += f" on branch {row['in_progress_branch']}"
        if row.get('in_progress_session_slug'):
            line += f" (session {row['in_progress_session_slug']})"
        lines.append(line)
    if row.get('addressed_at'):
        line = f"Addressed: {row['addressed_at']:%Y-%m-%d %H:%M}"
        if row.get('resolved_by_commit_sha'):
            line += f" — commit {row['resolved_by_commit_sha'][:8]}"
        lines.append(line)
    if row.get('closed_at'):
        lines.append(f"Closed: {row['closed_at']:%Y-%m-%d %H:%M}")
    if row.get('resolution_notes'):
        lines.append(f"Resolution notes: {row['resolution_notes']}")
    if row.get('working_summary'):
        lines.append("")
        lines.append("--- Working summary ---")
        lines.append(row['working_summary'])
    return "\n".join(lines)


def _already_migrated_ids() -> set:
    """
    Return the set of tbl_feedback ids whose admin_notes already contains the
    migration marker — for idempotent re-runs.
    """
    rows = TesterFeedback.objects.filter(
        admin_notes__startswith='[migrated FB-'
    ).values_list('admin_notes', flat=True)
    ids = set()
    for notes in rows:
        # Marker shape: '[migrated FB-NNN on YYYY-MM-DD]'
        try:
            head = notes.split(']', 1)[0]
            fb_part = head.replace('[migrated FB-', '').split(' on ', 1)[0]
            ids.add(int(fb_part))
        except (ValueError, IndexError):
            continue
    return ids


class Command(BaseCommand):
    help = (
        "One-time backfill: copy tbl_feedback rows into tester_feedback so "
        "the /admin/feedback page surfaces feedback captured via the #FB tag. "
        "Idempotent — re-running skips already-migrated rows."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--owner-email',
            required=True,
            help="Email of the user to attribute all backfilled rows to "
                 "(required because tester_feedback requires a user FK).",
        )
        parser.add_argument(
            '--execute',
            action='store_true',
            help="Actually perform the inserts. Without this flag the command "
                 "prints what would be migrated but writes nothing.",
        )

    def handle(self, *args, **opts):
        owner_email = opts['owner_email']
        execute = opts['execute']

        User = get_user_model()
        try:
            owner = User.objects.get(email=owner_email)
        except User.DoesNotExist:
            raise CommandError(
                f"No user found with email {owner_email!r} — pass an existing user's email"
            )

        self.stdout.write(self.style.NOTICE(
            f"Owner for backfilled rows: {owner.username} (id={owner.id}, email={owner.email})"
        ))

        # Pull every help_panel + manual row (skip the backfill-noise rows that
        # were seeded historically into tbl_feedback from tbl_help_message).
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, status, source, page_context, project_id, project_name,
                       message_text, created_at, started_at, addressed_at, closed_at,
                       resolved_by_commit_sha, resolved_by_commit_url, resolution_notes,
                       in_progress_branch, in_progress_session_slug,
                       working_summary, active_chat_slug, duplicate_of_id
                  FROM landscape.tbl_feedback
                 WHERE source IN ('help_panel', 'manual')
                   AND status != 'duplicate'
                 ORDER BY id
            """)
            cols = [c[0] for c in cursor.description]
            rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

        self.stdout.write(f"Found {len(rows)} candidate rows in tbl_feedback (help_panel + manual, non-duplicate)")

        already = _already_migrated_ids()
        self.stdout.write(f"Already migrated: {len(already)} rows (will be skipped)")

        to_migrate = [r for r in rows if r['id'] not in already]
        self.stdout.write(f"To migrate this run: {len(to_migrate)} rows")

        if not to_migrate:
            self.stdout.write(self.style.SUCCESS("Nothing to do."))
            return

        today = datetime.now().strftime('%Y-%m-%d')

        if not execute:
            self.stdout.write(self.style.WARNING("DRY RUN — pass --execute to actually insert."))
            for row in to_migrate[:10]:
                preview = (row['message_text'] or '')[:80].replace('\n', ' ')
                self.stdout.write(f"  FB-{row['id']:<5} {row['status']:<12} | {preview}")
            if len(to_migrate) > 10:
                self.stdout.write(f"  ... and {len(to_migrate) - 10} more")
            return

        # Real run
        created = 0
        skipped = 0
        with transaction.atomic():
            for row in to_migrate:
                fb_id = row['id']
                marker = _migration_marker(fb_id, today)
                message = row['message_text'] or ''
                page_context = row.get('page_context') or ''
                page_path = _strip_help_prefix(page_context) or 'general'

                # Layer 2 derivations — same helpers the live submit endpoint uses
                category = classify_feedback(message)
                affected_module = extract_affected_module(page_path, message)
                feedback_type = CATEGORY_TO_TYPE.get(category, 'general')

                tester_status = STATUS_MAP.get(row['status'], 'submitted')

                admin_notes = _build_admin_notes(row, marker)

                tf = TesterFeedback(
                    user=owner,
                    page_url=page_context or '(unknown)',  # tbl_feedback never stored full URL
                    page_path=page_path or '/',
                    project_id=row.get('project_id'),
                    project_name=row.get('project_name'),
                    feedback_type=feedback_type,
                    message=message,
                    category=category,
                    affected_module=affected_module,
                    landscaper_summary=None,
                    landscaper_raw_chat=[],
                    browser_context={},
                    status=tester_status,
                    admin_notes=admin_notes,
                    admin_response=None,
                )
                # Preserve original timestamps where possible. created_at has
                # auto_now_add=True so we override after save.
                tf.save()
                # Force original created_at; Django won't honor the kwarg on
                # auto_now_add. Use raw UPDATE.
                with connection.cursor() as cursor:
                    cursor.execute(
                        'UPDATE landscape."tester_feedback" '
                        '   SET created_at = %s, updated_at = %s '
                        ' WHERE id = %s',
                        [row['created_at'], row['created_at'], tf.id],
                    )
                created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Migrated {created} rows into tester_feedback (skipped {skipped})."
        ))
        self.stdout.write(
            f"Verify by visiting /admin/feedback — should now show {created} new entries "
            f"(plus any pre-existing tester_feedback rows)."
        )
