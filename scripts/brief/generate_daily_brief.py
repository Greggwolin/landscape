#!/usr/bin/env python3
"""
Daily Brief generator — redesign version.

Produces a single self-contained HTML brief to the OneDrive workspace folder
matching daily-brief/MOCKUP-redesign.html. Sections in order:
  1. Header + summary callout
  2. Work In Progress (labeled branches only — see .claude/branch-labels.json)
  3. Open Feedback (from tbl_feedback where source='help_panel' and
     status in (open, in_progress); in_progress rows get the orange border
     treatment plus a "Being worked on" tag)
  4. Resolved Recently (closed_at or addressed_at within last 7 days)
  5. Today's Sessions (rolling 3-day; read from .claude/sessions.json)
  6. Parallel Sessions (one-line summary of .claude/worktrees/)
  7. Uncommitted Right Now (plain-English translation of git status)
  8. System Status (plain-English health summary)
  9. Footer

Labels are read on every render — no caching.

Refs: daily-brief/MOCKUP-redesign.html (design source of truth)
"""

import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone, date, timedelta
from pathlib import Path
from typing import Optional

import psycopg2
import psycopg2.extras

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_URL_PREFIX = "https://github.com/Greggwolin/landscape/commit/"
ONEDRIVE_BRIEF_DIR = (
    "/Users/5150east/Library/CloudStorage/OneDrive-CrescentBayHoldings/"
    "2Pursuit/3LandscapeApp/Landscape app/daily-brief"
)
HEALTH_STALE_THRESHOLD_HOURS = 24
RECENTLY_CLOSED_DAYS = 7
SESSIONS_LOOKBACK_DAYS = 3
COMMIT_RESOLVE_RE = re.compile(r'(?i)\b(?:fixes|closes|resolves)\s+FB-(\d+)\b')
COMMIT_PREFIX_RE = re.compile(r'^(?:feat|fix|chore|docs|refactor|test|build|ci|perf|style)(?:\([^)]*\))?:\s*')


def _find_repo_root(start: Path) -> Path:
    p = start.resolve()
    for candidate in (p, *p.parents):
        if (candidate / '.git').exists():
            return candidate
    raise RuntimeError(f"Could not locate .git from {start}")


REPO_ROOT = _find_repo_root(Path(__file__))
HEALTH_REPORT_DIR = REPO_ROOT / 'docs' / 'UX' / 'health-reports'
BRANCH_LABELS_PATH = REPO_ROOT / '.claude' / 'branch-labels.json'
SESSIONS_PATH = REPO_ROOT / '.claude' / 'sessions.json'
WORKTREES_DIR = REPO_ROOT / '.claude' / 'worktrees'


# ---------------------------------------------------------------------------
# Page tag mapping (Help > {slug} → "Human Label")
# TODO: move to a lookup table in the DB once the page taxonomy stabilizes.
# ---------------------------------------------------------------------------

PAGE_TAG_MAP = {
    'general': 'Help & Feedback',
    'home': 'Home',
    'home_overview': 'Home',
    'documents': 'Documents',
    'documents_all': 'Documents',
    'property_property-details': 'Property Details',
    'property_details': 'Property Details',
    'property_location': 'Property Location',
    'property_market': 'Market',
    'property_rent-roll': 'Rent Roll',
    'property_acquisition': 'Acquisition',
    'operations': 'Operations',
    'operations_overview': 'Operations',
    'budget_budget': 'Budget',
    'capital_equity': 'Capitalization',
    'valuation': 'Valuation',
    'valuation_income': 'Income Approach',
    'valuation_cost': 'Cost Approach',
    'valuation_sales-comparison': 'Sales Comparison',
    'reports_summary': 'Reports',
    'map_overview': 'Map',
    'verification': 'Verification (test)',
}


def page_tag(page_context: Optional[str]) -> str:
    if not page_context:
        return 'Unknown'
    raw = page_context
    if raw.startswith('Help > '):
        raw = raw[len('Help > '):]
    if raw in PAGE_TAG_MAP:
        return PAGE_TAG_MAP[raw]
    return raw.replace('_', ' ').replace('-', ' ').title()


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def _load_database_url() -> str:
    if os.environ.get('DATABASE_URL'):
        return os.environ['DATABASE_URL']
    env_path = REPO_ROOT / '.env.local'
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if line.startswith('DATABASE_URL='):
                return line.split('=', 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("DATABASE_URL not found in env or .env.local")


def _connect():
    return psycopg2.connect(_load_database_url())


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------

def relative_day(d, today: date) -> str:
    """today / yesterday / N days ago / 'Mar 10' style.
    Accepts date or datetime (datetime is converted to local date).
    """
    if d is None:
        return ''
    if isinstance(d, datetime):
        d = d.astimezone().date() if d.tzinfo else d.date()
    if not isinstance(d, date):
        return str(d)
    delta = (today - d).days
    if delta == 0:
        return 'today'
    if delta == 1:
        return 'yesterday'
    if 0 < delta < 7:
        return f'{delta} days ago'
    return d.strftime('%b ').replace(' 0', ' ') + f"{d.day}"


def reported_phrase(created_at, today: date) -> str:
    return f'Reported {relative_day(created_at, today)}'


# ---------------------------------------------------------------------------
# Git
# ---------------------------------------------------------------------------

def _git(*args) -> str:
    out = subprocess.run(
        ['git', *args], cwd=REPO_ROOT,
        capture_output=True, text=True, check=False,
    )
    return out.stdout


def gather_branch_name() -> str:
    return _git('symbolic-ref', '--short', 'HEAD').strip() or '(detached)'


def gather_commits_24h() -> list[dict]:
    """Used internally by auto_resolve. Not surfaced in the brief output."""
    out = _git('log', '--since=24 hours ago',
               '--pretty=format:%H|%an|%ad|%s', '--date=iso')
    commits = []
    for line in out.splitlines():
        if not line:
            continue
        parts = line.split('|', 3)
        if len(parts) < 4:
            continue
        sha, author, date_iso, subject = parts
        commits.append({
            'sha': sha, 'short': sha[:8], 'author': author,
            'date_iso': date_iso, 'subject': subject,
            'url': f"{REPO_URL_PREFIX}{sha}",
        })
    return commits


def gather_uncommitted_summary() -> dict:
    porcelain = _git('status', '--porcelain')
    modified, deleted, untracked_count = [], [], 0
    for line in porcelain.splitlines():
        if not line:
            continue
        xy = line[:2]
        path = line[3:]
        if 'M' in xy:
            modified.append(path)
        elif 'D' in xy:
            deleted.append(path)
        elif xy == '??':
            untracked_count += 1
        else:
            modified.append(path)
    return {
        'modified': modified,
        'deleted': deleted,
        'untracked_count': untracked_count,
    }


def _commits_ahead_of_main(branch: str) -> int:
    out = _git('rev-list', '--count', f'main..{branch}').strip()
    try:
        return int(out)
    except Exception:
        return 0


def _branch_last_activity(branch: str) -> Optional[date]:
    out = _git('log', '-1', '--format=%cI', branch).strip()
    if not out:
        return None
    try:
        return datetime.fromisoformat(out).astimezone().date()
    except Exception:
        return None


def strip_commit_prefix(subject: str) -> str:
    return COMMIT_PREFIX_RE.sub('', subject or '').strip()


# ---------------------------------------------------------------------------
# WIP — read branch-labels.json, render only labeled branches.
# ---------------------------------------------------------------------------

def gather_wip_branches() -> list[dict]:
    if not BRANCH_LABELS_PATH.exists():
        return []
    try:
        labels = json.loads(BRANCH_LABELS_PATH.read_text())
    except Exception:
        return []

    out = []
    for branch, meta in labels.items():
        ahead = _commits_ahead_of_main(branch)
        last_activity = _branch_last_activity(branch)
        out.append({
            'branch': branch,
            'title': meta.get('title') or branch,
            'description': meta.get('description') or '',
            'cowork_chat': meta.get('cowork_chat'),
            'status_note': meta.get('status_note') or '',
            'commits_ahead': ahead,
            'last_activity': last_activity,
        })
    out.sort(key=lambda w: (w['last_activity'] or date.min, w['branch']), reverse=True)
    return out


# ---------------------------------------------------------------------------
# Sessions — rolling 3-day window from .claude/sessions.json
# ---------------------------------------------------------------------------

def gather_sessions_3day(today: date) -> list[dict]:
    if not SESSIONS_PATH.exists():
        return []
    try:
        payload = json.loads(SESSIONS_PATH.read_text())
    except Exception:
        return []
    cutoff = today - timedelta(days=SESSIONS_LOOKBACK_DAYS - 1)
    rows = []
    for entry in payload.get('sessions') or []:
        try:
            d = date.fromisoformat(entry['date'])
        except Exception:
            continue
        if d < cutoff:
            continue
        rows.append({
            'date': d,
            'topic': entry.get('topic') or '',
            'cowork_chat': entry.get('cowork_chat'),
            'cc_session': entry.get('cc_session') or '',
        })
    rows.sort(key=lambda r: r['date'], reverse=True)
    return rows


def session_pair(cowork_chat: Optional[str], cc_session: str) -> str:
    cw = f'cw-{cowork_chat}' if cowork_chat else 'cw-(unlabeled)'
    cc_name = cc_session.split('/', 1)[-1] if cc_session else '(none)'
    cc = f'cc-{cc_name}'
    return f'{cw} · {cc}'


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def gather_health_status() -> dict:
    if not HEALTH_REPORT_DIR.exists():
        return {'status': 'skipped', 'last_ran_at': None,
                'reason': 'no health-reports directory yet'}
    files = sorted(HEALTH_REPORT_DIR.glob('health-*.json'))
    if not files:
        return {'status': 'skipped', 'last_ran_at': None,
                'reason': 'no health reports recorded yet'}
    latest = files[-1]
    try:
        report = json.loads(latest.read_text())
    except Exception as e:
        return {'status': 'skipped', 'last_ran_at': None,
                'reason': f'latest report unreadable ({e})'}

    ts_raw = report.get('timestamp')
    last_ran_at = None
    hours_ago = None
    if ts_raw:
        try:
            last_ran_at = datetime.fromisoformat(ts_raw.replace('Z', '+00:00'))
            hours_ago = (datetime.now(timezone.utc) - last_ran_at).total_seconds() / 3600
        except Exception:
            pass

    if hours_ago is None or hours_ago > HEALTH_STALE_THRESHOLD_HOURS:
        return {
            'status': 'skipped',
            'last_ran_at': last_ran_at,
            'hours_ago': hours_ago,
        }

    failures = []
    for r in report.get('results') or []:
        if r.get('status') == 'FAIL':
            failures.append({
                'agent': r.get('agent', '?'),
                'summary': _summarize_failure(r),
            })
    return {
        'status': 'fresh',
        'last_ran_at': last_ran_at,
        'hours_ago': hours_ago,
        'failures': failures,
    }


def _summarize_failure(result: dict) -> str:
    if 'total_violations' in result:
        return f"{result['total_violations']} violations"
    if 'dead_table_refs' in result or 'dead_column_refs' in result:
        return (f"{result.get('dead_table_refs', 0)} dead table refs, "
                f"{result.get('dead_column_refs', 0)} dead column refs")
    if 'message' in result:
        return str(result['message'])
    return 'see source report'


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------

def gather_open_feedback(conn) -> list[dict]:
    """Open + in-progress, real captures only (source='help_panel')."""
    sql = """
        SELECT
            id, created_at, page_context, message_text, status, source,
            in_progress_branch, in_progress_session_slug, started_at
          FROM landscape.tbl_feedback
         WHERE source = 'help_panel'
           AND status IN ('open', 'in_progress')
         ORDER BY status = 'in_progress' DESC, created_at DESC, id DESC
    """
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql)
        return [dict(r) for r in cur.fetchall()]


def gather_resolved_recently(conn) -> list[dict]:
    """Closed/addressed within last 7 days, real captures only."""
    sql = """
        SELECT
            id, created_at, page_context, message_text, status, source,
            addressed_at, closed_at,
            resolved_by_commit_sha, resolved_by_commit_url, resolution_notes
          FROM landscape.tbl_feedback
         WHERE source = 'help_panel'
           AND status IN ('addressed', 'closed', 'wontfix', 'duplicate')
           AND COALESCE(closed_at, addressed_at) >= NOW() - INTERVAL %s
         ORDER BY COALESCE(closed_at, addressed_at) DESC, id DESC
    """
    interval = f'{RECENTLY_CLOSED_DAYS} days'
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, [interval])
        return [dict(r) for r in cur.fetchall()]


def auto_resolve(conn, commits: list[dict]) -> list[dict]:
    """Walk today's commits, flip referenced rows to addressed."""
    resolved = []
    with conn.cursor() as cur:
        for c in commits:
            for match in COMMIT_RESOLVE_RE.finditer(c['subject']):
                fb_id = int(match.group(1))
                cur.execute(
                    """
                    UPDATE landscape.tbl_feedback
                       SET status = 'addressed',
                           addressed_at = NOW(),
                           resolved_by_commit_sha = %s,
                           resolved_by_commit_url = %s
                     WHERE id = %s AND status IN ('open', 'in_progress')
                     RETURNING id
                    """,
                    [c['sha'], c['url'], fb_id],
                )
                if cur.fetchone() is not None:
                    resolved.append({
                        'fb_id': fb_id, 'sha': c['sha'], 'short': c['short'],
                        'url': c['url'], 'subject': c['subject'],
                    })
    conn.commit()
    return resolved


def _commit_subject_for_sha(sha: str) -> Optional[str]:
    out = _git('show', '-s', '--format=%s', sha).strip()
    return out or None


# ---------------------------------------------------------------------------
# Worktrees
# ---------------------------------------------------------------------------

def count_worktrees() -> int:
    if not WORKTREES_DIR.exists():
        return 0
    return sum(1 for p in WORKTREES_DIR.iterdir() if p.is_dir())


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

CSS = """
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  max-width: 920px; margin: 32px auto; padding: 0 32px;
  color: #1f2937; background: #fafafa; line-height: 1.55;
}
h1 { font-size: 28px; margin: 0 0 4px 0; color: #0f172a; font-weight: 700; }
.date-line { color: #64748b; font-size: 14px; margin-bottom: 28px; }
.summary {
  background: white; border-radius: 8px; padding: 20px 24px;
  margin-bottom: 32px; border: 1px solid #e5e7eb;
  font-size: 16px; color: #334155;
}
.summary strong { color: #0f172a; }
h2 {
  font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em;
  color: #475569; margin: 36px 0 12px 0; font-weight: 600;
}
.item {
  background: white; border: 1px solid #e5e7eb; border-radius: 6px;
  padding: 14px 18px; margin-bottom: 8px; display: flex; align-items: flex-start;
  gap: 16px;
}
.item.resolved { background: #f9fafb; border-color: #e5e7eb; }
.item.resolved .what { color: #6b7280; text-decoration: line-through; }
.id {
  font-family: ui-monospace, monospace; font-size: 12px;
  color: #64748b; background: #f1f5f9; padding: 3px 8px;
  border-radius: 4px; flex-shrink: 0; min-width: 64px; text-align: center;
}
.id.resolved { background: #d1fae5; color: #065f46; }
.body { flex-grow: 1; }
.what { font-size: 15px; color: #1f2937; line-height: 1.5; }
.meta { font-size: 13px; color: #64748b; margin-top: 4px; }
.meta .tag {
  display: inline-block; background: #eef2ff; color: #4338ca;
  padding: 1px 8px; border-radius: 10px; font-size: 11px;
  margin-left: 8px;
}
.meta .resolution { font-size: 12px; color: #047857; margin-top: 4px; }
.empty {
  background: white; border: 1px dashed #d1d5db; border-radius: 6px;
  padding: 16px 18px; color: #9ca3af; font-style: italic; font-size: 14px;
}
.item.in-progress { border-left: 3px solid #f59e0b; }
.id.in-progress { background: #fef3c7; color: #92400e; }
.progress-tag {
  display: inline-block; background: #fef3c7; color: #92400e;
  padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;
  margin-left: 8px;
}
.in-progress-detail { color: #92400e; font-size: 12px; margin-top: 4px; }
.session-row {
  background: white; border: 1px solid #e5e7eb; border-radius: 6px;
  padding: 12px 16px; margin-bottom: 6px; font-size: 13px;
  display: grid; grid-template-columns: 90px 1fr auto; gap: 12px;
  align-items: center;
}
.session-day { color: #6b7280; font-weight: 500; }
.session-topic { color: #1f2937; }
.session-pair { color: #4338ca; font-family: ui-monospace, monospace; font-size: 12px; }
.system-status {
  background: white; border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 18px 22px; margin-bottom: 12px;
}
.system-status .stale { color: #b45309; font-size: 14px; }
.system-status .ok { color: #047857; font-size: 14px; }
.footer {
  margin-top: 48px; padding-top: 16px;
  border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;
}
code { font-family: ui-monospace, monospace; font-size: 0.9em; }
"""


def _esc(s) -> str:
    if s is None:
        return ''
    return (str(s)
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;'))


def _strip_cw_prefix(slug: Optional[str]) -> str:
    if not slug:
        return ''
    return slug[3:] if slug.startswith('cw-') else slug


def render_summary(*, today: date, open_count: int, in_progress_count: int,
                   wip_count: int, sessions_count: int, health: dict) -> str:
    bits = []
    if open_count == 0:
        bits.append('You have <strong>no open feedback items</strong>')
    elif in_progress_count > 0:
        plural = 'item' if open_count == 1 else 'items'
        bits.append(
            f'You have <strong>{open_count} open feedback {plural}</strong> '
            f'({in_progress_count} currently being worked on)'
        )
    else:
        plural = 'item' if open_count == 1 else 'items'
        bits.append(f'You have <strong>{open_count} open feedback {plural}</strong>')

    if wip_count:
        plural = 'branch' if wip_count == 1 else 'branches'
        bits.append(f'<strong>{wip_count} active {plural}</strong>')
    if sessions_count:
        plural = 'chat' if sessions_count == 1 else 'chats'
        bits.append(f'<strong>{sessions_count} Cowork {plural}</strong> from the last 3 days')

    if health['status'] == 'fresh' and not (health.get('failures') or []):
        bits.append('the system health check is fresh')
    elif health['status'] == 'fresh':
        n = len(health.get('failures') or [])
        bits.append(f'the system health check has {n} failure{"s" if n != 1 else ""} to look at')
    else:
        bits.append("the system health check hasn't run in a while")

    return ', '.join(bits) + '.'


def render_wip(wip_rows: list[dict], today: date) -> str:
    if not wip_rows:
        return '<div class="empty">No labeled branches in <code>.claude/branch-labels.json</code> yet.</div>'
    parts = []
    for w in wip_rows:
        last_activity = (
            f'Last activity {relative_day(w["last_activity"], today)}'
            if w['last_activity'] else 'No commits'
        )
        commits_phrase = (
            f'{w["commits_ahead"]} commit{"s" if w["commits_ahead"] != 1 else ""}'
            if w['commits_ahead'] else 'no commits ahead of main'
        )
        cowork_phrase = (
            f'Cowork chat: <code>{_esc(w["cowork_chat"])}</code>'
            if w['cowork_chat'] else 'Cowork chat: <code>(needs label)</code>'
        )
        meta_bits = [
            f'Branch <code>{_esc(w["branch"])}</code>',
            commits_phrase,
            last_activity,
            _esc(w['status_note']) if w['status_note'] else None,
            cowork_phrase,
        ]
        meta = ' · '.join(b for b in meta_bits if b)
        parts.append(
            f'<div class="item">'
            f'<div class="body">'
            f'<div class="what"><strong>{_esc(w["title"])}</strong> — {_esc(w["description"])}</div>'
            f'<div class="meta">{meta}</div>'
            f'</div></div>'
        )
    return '\n'.join(parts)


def render_open_feedback(rows: list[dict], today: date) -> str:
    if not rows:
        return '<div class="empty">No open feedback. Nice.</div>'
    parts = []
    for r in rows:
        is_in_progress = r['status'] == 'in_progress'
        item_class = 'item in-progress' if is_in_progress else 'item'
        id_class = 'id in-progress' if is_in_progress else 'id'
        meta_bits = [
            reported_phrase(r['created_at'], today),
            f'<span class="tag">{_esc(page_tag(r["page_context"]))}</span>',
        ]
        if is_in_progress:
            meta_bits.append('<span class="progress-tag">Being worked on</span>')

        progress_detail = ''
        if is_in_progress:
            ip_bits = []
            if r.get('in_progress_branch'):
                ip_bits.append(f'Branch <code>{_esc(r["in_progress_branch"])}</code>')
            if r.get('started_at'):
                ip_bits.append(f'CC session opened {relative_day(r["started_at"], today)}')
            if r.get('in_progress_session_slug'):
                ip_bits.append(
                    f'Cowork chat <code>{_esc(_strip_cw_prefix(r["in_progress_session_slug"]))}</code>'
                )
            if ip_bits:
                progress_detail = f'<div class="in-progress-detail">→ {" · ".join(ip_bits)}</div>'

        parts.append(
            f'<div class="{item_class}">'
            f'<div class="{id_class}">FB-{r["id"]}</div>'
            f'<div class="body">'
            f'<div class="what">{_esc((r["message_text"] or "")[:400])}</div>'
            f'<div class="meta">{" ".join(meta_bits)}{progress_detail}</div>'
            f'</div></div>'
        )
    return '\n'.join(parts)


def render_resolved(rows: list[dict], today: date) -> str:
    if not rows:
        return '<div class="empty">Nothing resolved in the last 7 days.</div>'
    parts = []
    for r in rows:
        resolved_at = r.get('closed_at') or r.get('addressed_at')
        resolved_phrase = relative_day(resolved_at, today) if resolved_at else 'recently'
        note = r.get('resolution_notes')
        if not note and r.get('resolved_by_commit_sha'):
            subject = _commit_subject_for_sha(r['resolved_by_commit_sha'])
            if subject:
                note = strip_commit_prefix(subject)
        resolution_line = (
            f'<div class="resolution">✓ Resolved {resolved_phrase}'
            + (f' — {_esc(note)}' if note else '')
            + '</div>'
        )
        parts.append(
            f'<div class="item resolved">'
            f'<div class="id resolved">FB-{r["id"]}</div>'
            f'<div class="body">'
            f'<div class="what">{_esc((r["message_text"] or "")[:400])}</div>'
            f'<div class="meta">'
            f'{reported_phrase(r["created_at"], today)} '
            f'<span class="tag">{_esc(page_tag(r["page_context"]))}</span>'
            f'{resolution_line}'
            f'</div>'
            f'</div></div>'
        )
    return '\n'.join(parts)


def render_sessions(rows: list[dict], today: date) -> str:
    if not rows:
        return '<div class="empty">No sessions logged in the last 3 days.</div>'
    parts = []
    for s in rows:
        delta = (today - s['date']).days
        if delta == 0:
            day_label = 'Today'
        elif delta == 1:
            day_label = 'Yesterday'
        else:
            day_label = s['date'].strftime('%b ').replace(' 0', ' ') + f"{s['date'].day}"
        topic = s['topic']
        if ' — ' in topic:
            head, _, tail = topic.partition(' — ')
            topic_html = f'<strong>{_esc(head)}</strong> — {_esc(tail)}'
        else:
            topic_html = _esc(topic)
        pair = session_pair(s.get('cowork_chat'), s.get('cc_session', ''))
        parts.append(
            f'<div class="session-row">'
            f'<div class="session-day">{_esc(day_label)}</div>'
            f'<div class="session-topic">{topic_html}</div>'
            f'<div class="session-pair">{_esc(pair)}</div>'
            f'</div>'
        )
    return '\n'.join(parts)


def render_parallel(worktree_count: int) -> str:
    if worktree_count == 0:
        return '<div class="empty">No parallel CC worktrees.</div>'
    return (
        f'<div class="item"><div class="body">'
        f'<div class="what">{worktree_count} dormant CC worktree{"s" if worktree_count != 1 else ""} '
        f'from past sessions. Nothing active in any of them.</div>'
        f'<div class="meta">Stored under <code>.claude/worktrees/</code> · '
        f'Cleanup not blocking anything; can sweep when you want.</div>'
        f'</div></div>'
    )


def render_uncommitted(summary: dict) -> str:
    modified = summary['modified']
    deleted = summary['deleted']
    untracked_count = summary['untracked_count']
    if not modified and not deleted and untracked_count == 0:
        return '<div class="empty">Working tree is clean.</div>'

    n_real = len(modified) + len(deleted)
    if n_real == 0 and untracked_count > 0:
        return (
            f'<div class="item"><div class="body">'
            f'<div class="what">{untracked_count} untracked files (worktree artifacts, test scratch, '
            f'prompt drafts) — not blocking.</div>'
            f'</div></div>'
        )

    summary_phrase = (
        f'{n_real} file{"s" if n_real != 1 else ""} '
        f'{"have" if n_real != 1 else "has"} changes that haven\'t been saved to git yet on the current branch:'
    )
    meta_bits = []
    for path in modified:
        meta_bits.append(f'<strong>Modified:</strong> <code>{_esc(path)}</code>')
    for path in deleted:
        meta_bits.append(f'<strong>Deleted:</strong> <code>{_esc(path)}</code>')
    if untracked_count:
        meta_bits.append(
            f'<strong>{untracked_count} untracked</strong> '
            f'(worktree artifacts, test scratch, prompt drafts) — not blocking.'
        )
    return (
        f'<div class="item"><div class="body">'
        f'<div class="what">{summary_phrase}</div>'
        f'<div class="meta">{"<br>".join(meta_bits)}</div>'
        f'</div></div>'
    )


def render_system_status(health: dict, today: date) -> str:
    if health['status'] == 'fresh':
        failures = health.get('failures') or []
        if not failures:
            return (
                '<div class="system-status">'
                '<div class="ok">✓ All system health checks passing.</div>'
                '</div>'
            )
        items = ''.join(
            f'<li><strong>{_esc(f["agent"])}</strong>: {_esc(f["summary"])}</li>'
            for f in failures
        )
        return (
            '<div class="system-status">'
            f'<div class="stale">⚠ {len(failures)} health-check failure{"s" if len(failures) != 1 else ""}:</div>'
            f'<ul>{items}</ul>'
            '</div>'
        )
    last = health.get('last_ran_at')
    if last:
        date_phrase = last.strftime('%B ').replace(' 0', ' ') + f"{last.day}"
        days_ago = max(0, int((datetime.now(timezone.utc) - last).days))
        days_phrase = f'about {days_ago} day{"s" if days_ago != 1 else ""} ago'
        msg = (
            f'⚠ The nightly system health check hasn\'t run since {date_phrase} '
            f'({days_phrase}). Once it runs again, this section will surface anything '
            f'broken — missing pages, dead tools, broken connections.'
        )
    else:
        msg = (
            '⚠ The nightly system health check has never run yet. Once it does, '
            'this section will surface anything broken — missing pages, dead tools, '
            'broken connections.'
        )
    return f'<div class="system-status"><div class="stale">{msg}</div></div>'


def render_html(*, today: date, branch: str, open_feedback: list[dict],
                resolved_recent: list[dict], wip_rows: list[dict],
                sessions: list[dict], worktree_count: int,
                uncommitted: dict, health: dict) -> str:
    in_progress_count = sum(1 for r in open_feedback if r['status'] == 'in_progress')
    summary = render_summary(
        today=today,
        open_count=len(open_feedback),
        in_progress_count=in_progress_count,
        wip_count=len(wip_rows),
        sessions_count=len(sessions),
        health=health,
    )

    return f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>Landscape Daily Brief — {today:%Y-%m-%d}</title>
<style>{CSS}</style>
</head><body>
<h1>Landscape Daily Brief</h1>
<div class="date-line">{today:%A, %B %-d, %Y}  ·  branch <code>{_esc(branch)}</code></div>
<div class="summary">{summary}</div>
<h2>Work In Progress</h2>
{render_wip(wip_rows, today)}
<h2>Open Feedback ({len(open_feedback)})</h2>
{render_open_feedback(open_feedback, today)}
<h2>Resolved Recently ({len(resolved_recent)})</h2>
{render_resolved(resolved_recent, today)}
<h2>Today's Sessions (rolling 3-day)</h2>
{render_sessions(sessions, today)}
<h2>Parallel Sessions</h2>
{render_parallel(worktree_count)}
<h2>Uncommitted Right Now</h2>
{render_uncommitted(uncommitted)}
<h2>System Status</h2>
{render_system_status(health, today)}
<div class="footer">
  Generated {datetime.now():%Y-%m-%d %H:%M:%S} ·
  Regenerate: <code>./backend/venv/bin/python scripts/brief/generate_daily_brief.py</code>
</div>
</body></html>"""


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def write_outputs(html: str, today: date) -> tuple[Path, Path]:
    out_dir = Path(ONEDRIVE_BRIEF_DIR)
    out_dir.mkdir(parents=True, exist_ok=True)
    dated = out_dir / f'{today:%Y-%m-%d}-brief.html'
    current = out_dir / 'current.html'
    dated.write_text(html, encoding='utf-8')
    shutil.copyfile(dated, current)
    return dated, current


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    today = date.today()
    print(f"[brief] generating for {today:%Y-%m-%d}", file=sys.stderr)

    branch = gather_branch_name()
    commits = gather_commits_24h()
    health = gather_health_status()
    uncommitted = gather_uncommitted_summary()
    wip_rows = gather_wip_branches()
    sessions = gather_sessions_3day(today)
    worktree_count = count_worktrees()

    with _connect() as conn:
        auto_resolve(conn, commits)
        open_feedback = gather_open_feedback(conn)
        resolved_recent = gather_resolved_recently(conn)

    html = render_html(
        today=today, branch=branch,
        open_feedback=open_feedback,
        resolved_recent=resolved_recent,
        wip_rows=wip_rows,
        sessions=sessions,
        worktree_count=worktree_count,
        uncommitted=uncommitted,
        health=health,
    )
    dated, current = write_outputs(html, today)
    print(f"[brief] wrote {dated}", file=sys.stderr)
    print(f"[brief] open={len(open_feedback)} in_progress="
          f"{sum(1 for r in open_feedback if r['status']=='in_progress')} "
          f"resolved_recent={len(resolved_recent)} wip={len(wip_rows)} "
          f"sessions={len(sessions)} health={health['status']}", file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
