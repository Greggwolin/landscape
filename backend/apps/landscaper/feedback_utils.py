"""
Feedback capture utilities for Landscaper chat.

Detects #FB hashtag in user messages and forwards feedback to Discord webhook
with message context for alpha testing.
"""

import logging
import requests
from typing import Optional, List, Dict
from django.conf import settings
from django.db import connection
from datetime import datetime

logger = logging.getLogger(__name__)


def detect_feedback_tag(content: str) -> bool:
    """
    Check if message contains #FB feedback tag (case-insensitive).
    
    Args:
        content: The message content to check
        
    Returns:
        True if #FB is present, False otherwise
    """
    if not content:
        return False
    
    import re
    # Match #FB case-insensitively with word boundaries
    return bool(re.search(r'#[Ff][Bb]\b', content))


def strip_feedback_tag(content: str) -> str:
    """
    Remove #FB tag from message content.
    
    Args:
        content: The message content
        
    Returns:
        Content with #FB tags removed
    """
    if not content:
        return content
    
    # Remove both uppercase and mixed case variants
    import re
    # Match #FB case-insensitively with word boundaries
    cleaned = re.sub(r'#[Ff][Bb]\b', '', content)
    # Clean up any double spaces left behind
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def capture_feedback(
    user_message: str,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
    project_name: Optional[str] = None,
    page_context: Optional[str] = None,
    message_history: Optional[List[Dict]] = None,
) -> Optional[int]:
    """
    Send feedback to Discord webhook AND persist to landscape.tbl_feedback.

    Discord posting is best-effort; persistence is the source of truth.
    DB row is written even if Discord fails (with discord_posted_at NULL).

    Returns:
        New tbl_feedback row id on successful persistence, or None if the
        DB INSERT itself failed. Discord post failure alone does not
        produce None — it just leaves discord_posted_at NULL.

        Note: only views_help.py currently surfaces this id back to users.
        Other callers (project chat, thread message, knowledge chat) discard
        the return value; threading FB-N through their response shapes is a
        v2 task.
    """
    feedback_text = strip_feedback_tag(user_message)
    discord_ok = False

    # 1. Discord post (best-effort)
    webhook_url = getattr(settings, 'LANDSCAPER_FEEDBACK_WEBHOOK_URL', None)
    if not webhook_url:
        logger.warning("LANDSCAPER_FEEDBACK_WEBHOOK_URL not configured - skipping Discord post")
    else:
        try:
            logger.info(
                f"[FEEDBACK_CAPTURE] user_name={user_name}, user_email={user_email}, "
                f"user_id={user_id}, project_id={project_id}, project_name={project_name}"
            )
            username = (
                user_name
                or (user_email.split('@')[0] if user_email else None)
                or (f"user_{user_id}" if user_id else "unknown")
            )
            title = f"{username}: {page_context or 'unknown'}"
            embed = {
                "title": title,
                "description": feedback_text[:2000],
                "color": 0x5865F2,
                "timestamp": datetime.utcnow().isoformat(),
                "footer": {"text": f"Project: {project_name or project_id or '—'}"},
            }
            response = requests.post(
                webhook_url,
                json={"embeds": [embed]},
                headers={"Content-Type": "application/json"},
                timeout=10,
            )
            if response.status_code in (200, 204):
                discord_ok = True
                logger.info(f"Feedback Discord-posted for user {user_id} on project {project_id}")
            else:
                logger.error(f"Discord post failed: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Error posting feedback to Discord: {e}", exc_info=True)

    # 2. Persist to tbl_feedback (source of truth — runs regardless of Discord outcome)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO landscape.tbl_feedback
                  (user_id, user_name, user_email, page_context,
                   project_id, project_name, message_text,
                   source, discord_posted_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                [
                    user_id, user_name, user_email, page_context,
                    project_id, project_name, feedback_text,
                    'help_panel',
                    datetime.utcnow() if discord_ok else None,
                ],
            )
            feedback_id = cursor.fetchone()[0]
            logger.info(
                f"Feedback persisted as FB-{feedback_id} (discord_ok={discord_ok})"
            )

            # 3. Mirror into tester_feedback so the /admin/feedback page surfaces
            #    the row immediately. The two tables grew up independently — see
            #    apps/feedback/management/commands/backfill_from_tbl_feedback.py
            #    for the canonical field-mapping logic this mirror replicates.
            #    Best-effort: failures are logged but never propagate, since the
            #    canonical persistence to tbl_feedback already succeeded.
            try:
                _mirror_to_tester_feedback(
                    fb_id=feedback_id,
                    user_id=user_id,
                    user_email=user_email,
                    page_context=page_context,
                    project_id=project_id,
                    project_name=project_name,
                    message=feedback_text,
                )
            except Exception as mirror_exc:
                logger.error(
                    f"FB-{feedback_id} tester_feedback mirror failed: {mirror_exc}",
                    exc_info=True,
                )

            return feedback_id
    except Exception as e:
        logger.error(f"Failed to persist feedback to tbl_feedback: {e}", exc_info=True)
        return None


# ---- tester_feedback mirror ------------------------------------------------
# The /admin/feedback page reads from landscape.tester_feedback, while the
# Help-panel #FB capture writes to landscape.tbl_feedback. To keep the admin
# page in sync without a heavier unification effort, every successful
# tbl_feedback insert mirrors a tester_feedback row using the same field
# derivations the backfill management command uses (classify_feedback,
# extract_affected_module). Idempotency carries via the admin_notes
# "[migrated FB-N on YYYY-MM-DD]" marker — the mirror writes one on every
# row so re-runs of the backfill command stay no-ops.

# Status mapping: tbl_feedback (6 states) -> tester_feedback (3 states). Same
# table the backfill command uses.
_TBL_TO_TESTER_STATUS = {
    'open':         'submitted',
    'in_progress':  'under_review',
    'addressed':    'addressed',
    'closed':       'addressed',
    'wontfix':      'addressed',
}

_CATEGORY_TO_FEEDBACK_TYPE = {
    'bug':              'bug',
    'feature_request':  'feature',
    'ux_confusion':     'general',
    'question':         'question',
}


def _resolve_owner_user_id(user_id: Optional[int], user_email: Optional[str]) -> Optional[int]:
    """
    tester_feedback requires a user FK. If the caller already has a user_id,
    use it. Otherwise fall back to looking up by email. Last resort: pull the
    fallback owner email from settings (LANDSCAPER_FEEDBACK_OWNER_EMAIL) and
    look that up. Returns None if no resolvable owner — caller should skip
    the mirror in that case.
    """
    if user_id:
        return user_id
    from django.contrib.auth import get_user_model
    User = get_user_model()
    if user_email:
        try:
            return User.objects.get(email=user_email).id
        except User.DoesNotExist:
            pass
    fallback = getattr(settings, 'LANDSCAPER_FEEDBACK_OWNER_EMAIL', None)
    if fallback:
        try:
            return User.objects.get(email=fallback).id
        except User.DoesNotExist:
            pass
    return None


def _mirror_to_tester_feedback(
    fb_id: int,
    user_id: Optional[int],
    user_email: Optional[str],
    page_context: Optional[str],
    project_id: Optional[int],
    project_name: Optional[str],
    message: str,
) -> Optional[int]:
    """
    Insert a tester_feedback row mirroring the tbl_feedback row that was just
    created. Returns the new tester_feedback.id on success, or None on a
    skipped insert (no resolvable owner FK).
    """
    import uuid

    # Re-use the live derivation helpers from apps.feedback.views so the
    # mirror's category/affected_module match what the legacy submit path
    # would produce for the same input.
    from apps.feedback.views import classify_feedback, extract_affected_module

    owner_id = _resolve_owner_user_id(user_id, user_email)
    if owner_id is None:
        logger.warning(
            f"FB-{fb_id} mirror skipped — no resolvable owner user (user_id=None, "
            f"user_email={user_email!r}, no LANDSCAPER_FEEDBACK_OWNER_EMAIL fallback)"
        )
        return None

    page_context = page_context or ''
    page_path = page_context.replace('Help > ', '', 1).strip() or 'general'
    category = classify_feedback(message)
    affected_module = extract_affected_module(page_path, message)
    feedback_type = _CATEGORY_TO_FEEDBACK_TYPE.get(category, 'general')
    # All freshly captured rows are status='open' on tbl_feedback (the
    # capture path doesn't take a status arg). Map that to 'submitted'.
    tester_status = _TBL_TO_TESTER_STATUS.get('open', 'submitted')

    today_str = datetime.utcnow().strftime('%Y-%m-%d')
    marker = f"[migrated FB-{fb_id} on {today_str}]"
    admin_notes = "\n".join([
        marker,
        "Source: help_panel",
        "Original status: open",
    ])

    now = datetime.utcnow()

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO landscape.tester_feedback (
                user_id, page_url, page_path, project_id, project_name,
                feedback_type, message, category, affected_module,
                landscaper_summary, landscaper_raw_chat, browser_context,
                status, admin_notes, admin_response, admin_responded_at,
                report_count, internal_id, created_at, updated_at, duplicate_of_id
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s::jsonb, %s::jsonb,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            RETURNING id
            """,
            [
                owner_id, page_context or '(unknown)', page_path or '/',
                project_id, project_name,
                feedback_type, message, category, affected_module,
                None, '[]', '{}',
                tester_status, admin_notes, None, None,
                1, str(uuid.uuid4()),
                now, now, None,
            ],
        )
        new_id = cursor.fetchone()[0]
        logger.info(f"FB-{fb_id} mirrored to tester_feedback id={new_id}")
        return new_id


def send_login_notification(
    user_name: str,
    user_email: Optional[str] = None,
    user_role: Optional[str] = None,
    login_ip: Optional[str] = None,
) -> bool:
    """
    Send Discord notification when a non-admin user logs in.

    Args:
        user_name: Username of the person logging in
        user_email: User's email address
        user_role: User's role (e.g., 'alpha_tester')
        login_ip: Client IP address

    Returns:
        True if sent successfully, False otherwise
    """
    webhook_url = getattr(settings, 'LANDSCAPER_FEEDBACK_WEBHOOK_URL', None)

    if not webhook_url:
        logger.debug("LANDSCAPER_FEEDBACK_WEBHOOK_URL not configured — login notification skipped")
        return False

    try:
        description_parts = []
        if user_email:
            description_parts.append(f"**Email:** {user_email}")
        if user_role:
            description_parts.append(f"**Role:** {user_role}")
        if login_ip:
            description_parts.append(f"**IP:** {login_ip}")

        embed = {
            "title": f"User Login: {user_name}",
            "description": "\n".join(description_parts) if description_parts else "No details available",
            "color": 0x2ECC71,  # Green for logins
            "timestamp": datetime.utcnow().isoformat(),
        }

        payload = {"embeds": [embed]}

        response = requests.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5,
        )

        if response.status_code in (200, 204):
            logger.info(f"Login notification sent for {user_name}")
            return True
        else:
            logger.warning(f"Login notification failed: {response.status_code}")
            return False

    except Exception as e:
        logger.error(f"Error sending login notification: {e}", exc_info=True)
        return False
