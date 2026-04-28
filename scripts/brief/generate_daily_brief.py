#!/usr/bin/env python3
"""
Daily Brief generator.

Produces a single self-contained HTML brief to the OneDrive workspace folder
summarizing:
  - Open + recently-resolved feedback (landscape.tbl_feedback)
  - Yesterday's commits, with auto-resolution of items referenced via
    "fixes|closes|resolves FB-N" in commit subjects
  - Latest health-check failures (or a SKIPPED banner if stale > 24h)
  - Current branch state (uncommitted, ahead/behind)

Designed to run nightly via launchd (~/Library/LaunchAgents/com.landscape.daily-brief.plist).

Refs: LANDSCAPE_DAILY_BRIEF_SPEC.md sections 5, 7
"""

import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone, timedelta
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

COMMIT_RESOLVE_RE = re.compile(r'(?i)\b(?:fixes|closes|resolves)\s+FB-(\d+)\b')


def _find_repo_root(start: Path) -> Path:
    """Walk up until we hit a .git directory."""
    p = start.resolve()
    for candidate in (p, *p.parents):
        if (candidate / '.git').exists():
            return candidate
    raise RuntimeError(f"Could not locate .git from {start}")


REPO_ROOT = _find_repo_root(Path(__file__))
HEALTH_REPORT_DIR = REPO_ROOT / 'docs' / 'UX' / 'health-reports'


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def _load_database_url() -> str:
    """Load DATABASE_URL from env or .env.local at repo root."""
    if os.environ.get('DATABASE_URL'):
        return os.environ['DATABASE_URL']
    env_path = REPO_ROOT / '.env.local'
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if line.startswith('DATABASE_URL='):
                val = line.split('=', 1)[1]
                return val.strip().strip('"').strip("'")
    raise RuntimeError("DATABASE_URL not found in env or .env.local")


def _connect():
    return psycopg2.connect(_load_database_url())


# ---------------------------------------------------------------------------
# Gathering
# ---------------------------------------------------------------------------

def gather_open_and_recent_feedback(conn) -> list[dict]:
    """
    Spec §5.2: rows where status='open' OR (terminal status AND closed within
    last 7 days). Spec is silent on the addressed-only case (auto-resolved
    rows have addressed_at set but no closed_at), so we use
    COALESCE(closed_at, addressed_at) for the 7-day window. Rows older than
    that drop out per §5.5.1.
    """
    sql = """
        SELECT
            id, created_at, page_context, project_id, project_name,
            message_text, status,
            addressed_at, closed_at,
            resolved_by_commit_sha, resolved_by_commit_url,
            resolution_notes, duplicate_of_id
          FROM landscape.tbl_feedback
         WHERE status = 'open'
            OR COALESCE(closed_at, addressed_at) >= NOW() - INTERVAL %s
         ORDER BY status = 'open' DESC, COALESCE(closed_at, addressed_at, created_at) DESC, id DESC
    """
    interval = f'{RECENTLY_CLOSED_DAYS} days'
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, [interval])
        return [dict(r) for r in cur.fetchall()]


def gather_commits_24h() -> list[dict]:
    """git log --since='24 hours ago' --pretty=format:'%H|%an|%ad|%s' --date=iso"""
    out = subprocess.run(
        ['git', 'log', '--since=24 hours ago',
         '--pretty=format:%H|%an|%ad|%s', '--date=iso'],
        cwd=REPO_ROOT, capture_output=True, text=True, check=True,
    ).stdout
    commits = []
    for line in out.splitlines():
        if not line:
            continue
        parts = line.split('|', 3)
        if len(parts) < 4:
            continue
        sha, author, date_iso, subject = parts
        commits.append({
            'sha': sha,
            'short': sha[:8],
            'author': author,
            'date_iso': date_iso,
            'subject': subject,
            'url': f"{REPO_URL_PREFIX}{sha}",
        })
    return commits


def gather_health_status() -> dict:
    """
    Find the most recent health-*.json. If stale (> 24h), return a SKIPPED
    payload per §11.2; otherwise return failure list.
    """
    if not HEALTH_REPORT_DIR.exists():
        return {'status': 'skipped', 'last_ran_at': None,
                'hours_ago': None, 'reason': f'{HEALTH_REPORT_DIR} not present'}
    files = sorted(HEALTH_REPORT_DIR.glob('health-*.json'))
    if not files:
        return {'status': 'skipped', 'last_ran_at': None,
                'hours_ago': None, 'reason': 'no health-*.json files'}
    latest = files[-1]
    try:
        report = json.loads(latest.read_text())
    except Exception as e:
        return {'status': 'skipped', 'last_ran_at': None,
                'hours_ago': None, 'reason': f'parse error: {e}'}

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
            'reason': f'last report {hours_ago:.1f}h old' if hours_ago is not None else 'no usable timestamp',
            'source_file': latest.name,
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
        'source_file': latest.name,
    }


def _summarize_failure(result: dict) -> str:
    """Pull the most informative one-liner from a FAIL agent result."""
    if 'total_violations' in result:
        return f"{result['total_violations']} violations"
    if 'dead_table_refs' in result or 'dead_column_refs' in result:
        return (f"{result.get('dead_table_refs', 0)} dead table refs, "
                f"{result.get('dead_column_refs', 0)} dead column refs")
    if 'message' in result:
        return str(result['message'])
    return 'see source report'


def gather_branch_state() -> dict:
    branch = subprocess.run(
        ['git', 'branch', '--show-current'],
        cwd=REPO_ROOT, capture_output=True, text=True, check=True,
    ).stdout.strip()
    porcelain = subprocess.run(
        ['git', 'status', '--porcelain'],
        cwd=REPO_ROOT, capture_output=True, text=True, check=True,
    ).stdout
    uncommitted = [l for l in porcelain.splitlines() if l.strip()]

    ahead = behind = None
    if branch:
        try:
            counts = subprocess.run(
                ['git', 'rev-list', '--left-right', '--count',
                 f'origin/{branch}...HEAD'],
                cwd=REPO_ROOT, capture_output=True, text=True, check=False,
            )
            if counts.returncode == 0 and counts.stdout.strip():
                left, right = counts.stdout.strip().split()
                behind, ahead = int(left), int(right)
        except Exception:
            pass

    return {
        'branch': branch,
        'uncommitted': uncommitted,
        'ahead': ahead,
        'behind': behind,
    }


# ---------------------------------------------------------------------------
# Auto-resolution
# ---------------------------------------------------------------------------

def auto_resolve(conn, commits: list[dict]) -> list[dict]:
    """
    Walk today's commits, find FB-N references in subjects, and flip
    matching open rows to 'addressed'. Returns the (fb_id, sha, subject)
    triples that actually flipped (i.e. excluding refs to already-resolved
    rows).
    """
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
                     WHERE id = %s AND status = 'open'
                     RETURNING id
                    """,
                    [c['sha'], c['url'], fb_id],
                )
                if cur.fetchone() is not None:
                    resolved.append({
                        'fb_id': fb_id,
                        'sha': c['sha'],
                        'short': c['short'],
                        'url': c['url'],
                        'subject': c['subject'],
                    })
    conn.commit()
    return resolved


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

CSS = """
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: #2c3e50;
  background: #f5f7fa;
  margin: 0;
  padding: 24px;
}
.container { max-width: 1100px; margin: 0 auto; }
h1 { font-size: 22px; margin: 0 0 4px 0; color: #1a253c; }
h2 {
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #5a6b7d;
  margin: 28px 0 8px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid #d8dfe6;
}
.subhead { color: #6b7c8c; font-size: 12px; margin-bottom: 18px; }
.kpi-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 10px 0 18px 0; }
.kpi {
  background: #fff;
  border: 1px solid #d8dfe6;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
}
.kpi b { color: #1a253c; font-size: 14px; }
table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #d8dfe6;
  border-radius: 4px;
  overflow: hidden;
  font-size: 12px;
}
th, td {
  padding: 7px 10px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid #eef1f5;
}
th { background: #f0f3f7; font-weight: 600; color: #4a5b6c; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
tr:last-child td { border-bottom: none; }
.fb-row.resolved { color: #95a5a6; }
.fb-row.resolved .msg { text-decoration: line-through; }
.cmd { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 11px; color: #2c3e50; background: #f0f3f7; padding: 4px 8px; border-radius: 3px; display: inline-block; margin-top: 4px; user-select: all; }
.banner { padding: 10px 14px; border-radius: 4px; margin: 8px 0; font-size: 12px; }
.banner.skipped { background: #fff8e1; border: 1px solid #f0d97a; color: #7a5d10; }
.banner.empty { background: #eef9ee; border: 1px solid #b9e2bb; color: #2d6a30; }
a { color: #2962a8; text-decoration: none; }
a:hover { text-decoration: underline; }
.muted { color: #95a5a6; font-size: 11px; }
.sha { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 11px; }
.footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #d8dfe6; color: #95a5a6; font-size: 11px; }
"""


def render_html(*, today: datetime, branch_state: dict, commits: list[dict],
                feedback: list[dict], auto_resolved: list[dict],
                health: dict) -> str:
    open_count = sum(1 for r in feedback if r['status'] == 'open')
    recent_resolved = sum(1 for r in feedback if r['status'] != 'open')
    failures = health.get('failures') or []

    # ----- header -----
    if health['status'] == 'fresh':
        health_kpi = f"Health: {len(failures)} failures" if failures else "Health: clean"
    else:
        health_kpi = "Health: SKIPPED"

    parts = []
    parts.append(f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>Daily Brief — {today:%Y-%m-%d}</title>
<style>{CSS}</style>
</head><body><div class="container">""")

    parts.append(f"""<h1>Landscape Daily Brief</h1>
<div class="subhead">{today:%A, %B %-d, %Y}  ·  branch <code>{_esc(branch_state['branch'])}</code></div>
<div class="kpi-row">
  <div class="kpi"><b>{open_count}</b> open FB</div>
  <div class="kpi"><b>{recent_resolved}</b> recently resolved</div>
  <div class="kpi"><b>{len(commits)}</b> commits today</div>
  <div class="kpi"><b>{len(auto_resolved)}</b> auto-resolved today</div>
  <div class="kpi">{_esc(health_kpi)}</div>
</div>""")

    # ----- Section 1: Feedback Tracker -----
    parts.append('<h2>Feedback Tracker</h2>')
    if not feedback:
        parts.append('<div class="banner empty">No open or recently-resolved feedback.</div>')
    else:
        parts.append("""<table><thead><tr>
<th></th><th>FB</th><th>Created</th><th>Page</th><th>Message</th><th>Action / Resolution</th>
</tr></thead><tbody>""")
        for r in feedback:
            is_open = r['status'] == 'open'
            checkbox = '☐' if is_open else '☑'
            row_class = 'fb-row' if is_open else 'fb-row resolved'
            created = r['created_at'].strftime('%Y-%m-%d')
            msg = _esc((r['message_text'] or '')[:200])
            page = _esc(r['page_context'] or '—')
            if is_open:
                cmd = (f'cd ~/landscape/backend && ./venv/bin/python manage.py '
                       f'close_feedback {r["id"]} --note "..."')
                action = f'<span class="cmd">$ {_esc(cmd)}</span>'
            else:
                bits = [f'<span class="muted">status: {r["status"]}</span>']
                if r.get('resolved_by_commit_url'):
                    bits.append(
                        f'<a href="{_esc(r["resolved_by_commit_url"])}" class="sha">'
                        f'{_esc((r["resolved_by_commit_sha"] or "")[:8])}</a>'
                    )
                if r.get('resolution_notes'):
                    bits.append(_esc(r['resolution_notes']))
                if r.get('duplicate_of_id'):
                    bits.append(f'<span class="muted">duplicate of FB-{r["duplicate_of_id"]}</span>')
                action = ' · '.join(bits)
            parts.append(
                f'<tr class="{row_class}"><td>{checkbox}</td>'
                f'<td>FB-{r["id"]}</td>'
                f'<td>{created}</td>'
                f'<td>{page}</td>'
                f'<td class="msg">{msg}</td>'
                f'<td>{action}</td></tr>'
            )
        parts.append('</tbody></table>')

    # ----- Section 2: Auto-Resolved Today -----
    parts.append('<h2>Auto-Resolved Today</h2>')
    if not auto_resolved:
        parts.append('<div class="banner empty">No commits referenced FB-N in the last 24h.</div>')
    else:
        parts.append('<table><thead><tr><th>FB</th><th>Commit</th><th>Subject</th></tr></thead><tbody>')
        for r in auto_resolved:
            parts.append(
                f'<tr><td>FB-{r["fb_id"]}</td>'
                f'<td><a href="{_esc(r["url"])}" class="sha">{_esc(r["short"])}</a></td>'
                f'<td>{_esc(r["subject"])}</td></tr>'
            )
        parts.append('</tbody></table>')

    # ----- Section 3: Yesterday's Commits -----
    parts.append("<h2>Yesterday's Commits</h2>")
    if not commits:
        parts.append('<div class="banner empty">No commits in the last 24h.</div>')
    else:
        parts.append('<table><thead><tr><th>SHA</th><th>Author</th><th>Subject</th></tr></thead><tbody>')
        for c in commits:
            parts.append(
                f'<tr><td><a href="{_esc(c["url"])}" class="sha">{_esc(c["short"])}</a></td>'
                f'<td>{_esc(c["author"])}</td>'
                f'<td>{_esc(c["subject"])}</td></tr>'
            )
        parts.append('</tbody></table>')

    # ----- Section 4: Health Check -----
    parts.append('<h2>Health Check</h2>')
    if health['status'] == 'skipped':
        if health.get('last_ran_at'):
            parts.append(
                f'<div class="banner skipped">SKIPPED — last ran '
                f'{health["last_ran_at"]:%Y-%m-%d %H:%M} UTC, '
                f'{health.get("hours_ago", 0):.1f}h ago. '
                f'<span class="muted">({_esc(health.get("reason", ""))})</span></div>'
            )
        else:
            parts.append(
                f'<div class="banner skipped">SKIPPED — '
                f'{_esc(health.get("reason", "no recent report"))}</div>'
            )
    elif not failures:
        parts.append(
            f'<div class="banner empty">All agents PASS '
            f'(report: {_esc(health.get("source_file", "?"))}).</div>'
        )
    else:
        parts.append('<table><thead><tr><th>Agent</th><th>Summary</th></tr></thead><tbody>')
        for f in failures:
            parts.append(f'<tr><td>{_esc(f["agent"])}</td><td>{_esc(f["summary"])}</td></tr>')
        parts.append('</tbody></table>')

    # ----- Section 5: Branch State -----
    parts.append('<h2>Branch State</h2>')
    bits = [f'On <code>{_esc(branch_state["branch"])}</code>']
    if branch_state.get('ahead') is not None and branch_state.get('behind') is not None:
        bits.append(
            f'{branch_state["ahead"]} ahead / {branch_state["behind"]} behind '
            f'<code>origin/{_esc(branch_state["branch"])}</code>'
        )
    parts.append(f'<div>{" · ".join(bits)}</div>')
    if branch_state['uncommitted']:
        parts.append(f'<p class="muted">{len(branch_state["uncommitted"])} uncommitted file(s):</p>')
        parts.append('<table><thead><tr><th>Status</th><th>Path</th></tr></thead><tbody>')
        for line in branch_state['uncommitted']:
            xy = line[:2]
            path = line[3:]
            parts.append(f'<tr><td class="sha">{_esc(xy)}</td><td>{_esc(path)}</td></tr>')
        parts.append('</tbody></table>')
    else:
        parts.append('<div class="muted">Working tree clean.</div>')

    # ----- footer -----
    parts.append(f"""<div class="footer">
Generated {datetime.now():%Y-%m-%d %H:%M:%S %Z} ·
Regenerate: <code>./backend/venv/bin/python scripts/brief/generate_daily_brief.py</code>
</div></div></body></html>""")

    return ''.join(parts)


def _esc(s) -> str:
    if s is None:
        return ''
    return (str(s)
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;'))


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def write_outputs(html: str, today: datetime) -> tuple[Path, Path]:
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
    today = datetime.now()
    print(f"[brief] generating for {today:%Y-%m-%d}", file=sys.stderr)

    branch_state = gather_branch_state()
    commits = gather_commits_24h()
    health = gather_health_status()

    with _connect() as conn:
        auto_resolved = auto_resolve(conn, commits)
        feedback = gather_open_and_recent_feedback(conn)

    html = render_html(
        today=today,
        branch_state=branch_state,
        commits=commits,
        feedback=feedback,
        auto_resolved=auto_resolved,
        health=health,
    )
    dated, current = write_outputs(html, today)
    print(f"[brief] wrote {dated}", file=sys.stderr)
    print(f"[brief] wrote {current}", file=sys.stderr)
    print(f"[brief] open={sum(1 for r in feedback if r['status']=='open')} "
          f"resolved={len(auto_resolved)} commits={len(commits)} "
          f"health={health['status']}", file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
