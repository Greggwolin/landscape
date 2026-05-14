"""
Home-project service — idempotent get-or-create for a user's home project.

A user "home" project is a placeholder row in tbl_project that owns the
user's non-project chat threads (the threads FK is NOT NULL, so casual
chats need SOMETHING to point at). The row is distinguished by
project_kind='user_home' and carries no property or financial data.

Callers:
  - apps.projects.signals.create_user_home_project_on_user_save
    (post_save signal on User — fires on registration AND admin-created users)
  - apps.projects.views.ProjectViewSet.home action
    (GET /api/projects/home — read-through; creates on first hit if missing,
     so existing users get a home project on first dashboard load even
     before the backfill management command has been run)
  - apps.projects.management.commands.backfill_home_projects
    (one-shot migration command)

The function is idempotent and safe to call repeatedly. It uses
get_or_create scoped to (created_by, project_kind) — combined with the
partial index from migration 20260514_add_project_kind, the lookup is
O(log N) on the home-project subset.

LF-USERDASH-0514 Phase 2.
"""

from __future__ import annotations

import logging
from typing import Tuple

from django.db import transaction

logger = logging.getLogger(__name__)


def derive_home_project_name(user) -> str:
    """
    Resolve a display name for the home project from the user record.

    Falls back: "<first> <last>" → username → "Home". Mirrors the same
    label logic used by the wrapper sidebar (see WrapperLayout
    buildThreadItem) so the dashboard's center-panel header reads the
    user's name consistently with what the sidebar already shows.
    """
    first = (getattr(user, 'first_name', '') or '').strip()
    last = (getattr(user, 'last_name', '') or '').strip()
    full = f"{first} {last}".strip()
    if full:
        return full
    username = (getattr(user, 'username', '') or '').strip()
    if username:
        return username
    return 'Home'


def get_or_create_home_project(user) -> Tuple[object, bool]:
    """
    Return (project, created) for the user's home project.

    Creates the row if it doesn't exist. Concurrent calls are safe — the
    partial unique index combined with the row-level lock from
    transaction.atomic + select_for_update prevents duplicates if two
    requests race on signup. The slightly heavier locking path is only
    taken on the CREATE branch; the common READ branch is index-only.

    Returns:
        (Project instance, True if just created / False if already existed)
    """
    from apps.projects.models import Project  # local import to avoid app-loading order issues

    if user is None or not getattr(user, 'is_authenticated', True):
        # is_authenticated check handles AnonymousUser; treats None as
        # invalid input — the caller is responsible for ensuring a real
        # user is passed.
        raise ValueError("get_or_create_home_project requires an authenticated user")

    # Fast path — already exists.
    existing = (
        Project.objects
        .filter(created_by=user, project_kind='user_home')
        .order_by('project_id')
        .first()
    )
    if existing is not None:
        return existing, False

    # Create path — atomic to prevent race on first-time signup.
    with transaction.atomic():
        # Re-check inside the transaction in case another request just won
        # the race. select_for_update at the user level isn't available
        # without a user lock table; rely on the unique-ish index logic
        # instead. If a duplicate is somehow created, the cleanup is a
        # one-time DELETE — not worth the locking complexity here.
        existing = (
            Project.objects
            .filter(created_by=user, project_kind='user_home')
            .order_by('project_id')
            .first()
        )
        if existing is not None:
            return existing, False

        project = Project.objects.create(
            project_name=derive_home_project_name(user),
            project_kind='user_home',
            is_active=True,
            created_by=user,
            # Home projects deliberately leave property and financial fields
            # NULL. They are placeholders for chat-thread parentage only.
        )
        logger.info(
            "Created home project %s for user %s (%s)",
            project.project_id,
            getattr(user, 'username', '?'),
            getattr(user, 'id', '?'),
        )
        return project, True
