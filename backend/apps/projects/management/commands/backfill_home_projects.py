"""
Management command: backfill home projects for existing users.

Every user gets one home project — a placeholder row in tbl_project that
owns the user's non-project chat threads. New users get one automatically
via the post_save signal in apps.projects.signals. Users who existed
BEFORE LF-USERDASH-0514 Phase 2 need a one-time backfill.

Idempotent. Safe to re-run — uses get_or_create_home_project which
short-circuits on the existence check, so re-running on a fully
backfilled user base is a no-op (just a SELECT per user).

Usage:
    python manage.py backfill_home_projects
    python manage.py backfill_home_projects --dry-run
    python manage.py backfill_home_projects --user-ids 1,2,3

LF-USERDASH-0514 Phase 2.
"""

from __future__ import annotations

import logging

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Backfill home projects for users who don't already have one."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Report what would be created without inserting any rows.",
        )
        parser.add_argument(
            '--user-ids',
            type=str,
            default=None,
            help="Comma-separated list of specific user IDs to process. Default: all active users.",
        )

    def handle(self, *args, **options):
        from apps.projects.services.home_project import get_or_create_home_project

        User = get_user_model()
        dry_run = options['dry_run']
        user_ids_arg = options.get('user_ids')

        qs = User.objects.filter(is_active=True)
        if user_ids_arg:
            try:
                ids = [int(s.strip()) for s in user_ids_arg.split(',') if s.strip()]
            except ValueError:
                self.stderr.write(self.style.ERROR(
                    f"--user-ids must be comma-separated integers, got: {user_ids_arg!r}"
                ))
                return
            qs = qs.filter(id__in=ids)

        total = qs.count()
        created_count = 0
        existed_count = 0
        failed_count = 0

        self.stdout.write(self.style.NOTICE(
            f"Backfill scope: {total} active user(s){' (dry-run)' if dry_run else ''}"
        ))

        for user in qs.iterator():
            try:
                if dry_run:
                    # Probe-only — check existence without creating.
                    from apps.projects.models import Project
                    exists = Project.objects.filter(
                        created_by=user, project_kind='user_home'
                    ).exists()
                    if exists:
                        existed_count += 1
                        self.stdout.write(f"  [exists]  {user.username} (id={user.id})")
                    else:
                        created_count += 1
                        self.stdout.write(self.style.WARNING(
                            f"  [WOULD CREATE] {user.username} (id={user.id})"
                        ))
                else:
                    project, created = get_or_create_home_project(user)
                    if created:
                        created_count += 1
                        self.stdout.write(self.style.SUCCESS(
                            f"  [created] {user.username} (id={user.id}) → project_id={project.project_id}"
                        ))
                    else:
                        existed_count += 1
                        self.stdout.write(f"  [exists]  {user.username} (id={user.id}) → project_id={project.project_id}")
            except Exception as exc:
                failed_count += 1
                self.stderr.write(self.style.ERROR(
                    f"  [FAILED] {user.username} (id={user.id}): {exc}"
                ))
                logger.error("Backfill failed for user %s: %s", user.id, exc, exc_info=True)

        self.stdout.write("")
        self.stdout.write(self.style.NOTICE("─── Summary ───"))
        self.stdout.write(f"  Total users scanned:       {total}")
        self.stdout.write(f"  Already had home project:  {existed_count}")
        if dry_run:
            self.stdout.write(self.style.WARNING(f"  Would create:              {created_count}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"  Created:                   {created_count}"))
        if failed_count:
            self.stdout.write(self.style.ERROR(f"  Failed:                    {failed_count}"))
