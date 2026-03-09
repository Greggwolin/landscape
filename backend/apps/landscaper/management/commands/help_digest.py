"""
Management command: Hourly Help Chat digest to Discord.

Groups help conversations by user, distills each conversation into a topic
line (from its first user message), and posts a compact summary.

Usage:
    python manage.py help_digest              # Last 1 hour (default)
    python manage.py help_digest --hours=4    # Last 4 hours
    python manage.py help_digest --dry-run    # Preview without posting
"""

import logging
from datetime import timedelta
from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings
from django.utils import timezone

import requests

logger = logging.getLogger(__name__)


def _topic_line(text, max_len=80):
    """Extract a clean topic line from a user message."""
    # Strip whitespace, collapse to single line
    clean = ' '.join(text.split())
    if len(clean) <= max_len:
        return clean
    return clean[:max_len].rsplit(' ', 1)[0] + '…'


class Command(BaseCommand):
    help = "Post hourly Help Chat digest to Discord webhook"

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours', type=float, default=1.0,
            help='Look back N hours (default: 1)',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Print digest without posting to Discord',
        )

    def handle(self, *args, **options):
        hours = options['hours']
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(hours=hours)

        # Fetch recent help messages grouped by conversation
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    hc.conversation_id,
                    hm.role,
                    hm.content,
                    hm.current_page,
                    hm.created_at,
                    COALESCE(u.email, 'anonymous') AS user_email
                FROM landscape.tbl_help_message hm
                JOIN landscape.tbl_help_conversation hc ON hc.id = hm.conversation_id
                LEFT JOIN auth_user u ON u.id = hc.user_id
                WHERE hm.created_at >= %s
                ORDER BY hc.conversation_id, hm.created_at ASC
            """, [cutoff])
            rows = cursor.fetchall()

        if not rows:
            self.stdout.write("No help chat activity in the last %.1f hour(s)." % hours)
            return

        # Group by conversation, then by user
        # Structure: {username: [{conv_id, topics: [str], pages: set, msg_count: int}]}
        convos = defaultdict(lambda: {
            'user_msgs': [],
            'pages': set(),
            'username': 'anonymous',
        })

        for conv_id, role, content, page, created_at, email in rows:
            username = email.split('@')[0] if email else 'anonymous'
            conv = convos[conv_id]
            conv['username'] = username
            if page:
                conv['pages'].add(page)
            if role == 'user':
                conv['user_msgs'].append(content)

        # Group conversations by user
        by_user = defaultdict(list)
        for conv_id, conv in convos.items():
            if not conv['user_msgs']:
                continue
            # Distill conversation to its topics:
            # - First message = primary topic
            # - Additional messages only if clearly different
            topics = []
            seen = set()
            for msg in conv['user_msgs']:
                topic = _topic_line(msg, 70)
                # Simple dedup: skip if first 30 chars match something already seen
                key = topic[:30].lower()
                if key not in seen:
                    seen.add(key)
                    topics.append(topic)

            by_user[conv['username']].append({
                'topics': topics[:4],  # Max 4 topics per conversation
                'pages': conv['pages'],
                'msg_count': len(conv['user_msgs']),
                'extra': max(0, len(topics) - 4),
            })

        # Build compact digest
        lines = []
        total_convos = sum(len(cs) for cs in by_user.values())
        total_msgs = sum(
            c['msg_count'] for cs in by_user.values() for c in cs
        )

        for username, conversations in sorted(by_user.items()):
            all_pages = set()
            for c in conversations:
                all_pages.update(c['pages'])
            page_str = ', '.join(sorted(all_pages)) if all_pages else 'general'

            lines.append(f"**{username}** ({page_str})")
            for conv in conversations:
                for topic in conv['topics']:
                    lines.append(f"  • {topic}")
                if conv['extra'] > 0:
                    lines.append(f"  … +{conv['extra']} more")

        description = '\n'.join(lines)

        if dry_run:
            self.stdout.write(f"\n--- DRY RUN ({total_convos} convos, {total_msgs} msgs) ---\n")
            self.stdout.write(description)
            self.stdout.write("\n--- END ---\n")
            return

        # Post to Discord
        webhook_url = getattr(settings, 'LANDSCAPER_FEEDBACK_WEBHOOK_URL', None)
        if not webhook_url:
            self.stderr.write("LANDSCAPER_FEEDBACK_WEBHOOK_URL not configured")
            return

        payload = {
            "embeds": [{
                "title": f"Help Digest — {hours:.0f}h | {total_convos} convos, {total_msgs} msgs",
                "description": description[:4000],
                "color": 0x3498DB,  # Blue for help
                "timestamp": timezone.now().isoformat(),
            }]
        }

        try:
            resp = requests.post(webhook_url, json=payload, timeout=10)
            if resp.status_code in (200, 204):
                self.stdout.write(self.style.SUCCESS(
                    f"Digest posted: {total_convos} convos, {total_msgs} msgs from {len(by_user)} users"
                ))
            else:
                self.stderr.write(f"Discord returned {resp.status_code}: {resp.text}")
        except Exception as e:
            self.stderr.write(f"Failed to post digest: {e}")
