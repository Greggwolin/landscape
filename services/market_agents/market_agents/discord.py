"""
Discord webhook integration for market intelligence agents.

Two channels:
  #market-intel-log    — verbose, real-time agent activity
  #market-intel-digest — morning summary (sent by The Editor at 6 AM)
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from loguru import logger

from .config import get_config


# Discord embed color palette (decimal RGB)
COLOR_INFO = 3447003       # blue
COLOR_SUCCESS = 3066993    # green
COLOR_WARNING = 15105570   # orange
COLOR_ERROR = 15158332     # red
COLOR_DIGEST = 10181046    # purple


def _post_webhook(url: str, payload: Dict[str, Any]) -> bool:
    """Fire-and-forget POST to a Discord webhook. Returns True on success."""
    if not url:
        logger.warning("Discord webhook URL is empty — skipping send")
        return False
    try:
        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code == 204:
            return True
        logger.warning("Discord returned %d: %s", resp.status_code, resp.text[:200])
        return False
    except Exception as exc:
        logger.error("Discord send failed: %s", exc)
        return False


# ── Real-time log channel ────────────────────────────────────────────

def log_agent_start(agent_name: str, metro: str, series_count: int) -> bool:
    """Post to #market-intel-log when an agent begins a run."""
    cfg = get_config()
    return _post_webhook(cfg.discord_log_webhook, {
        "embeds": [{
            "title": f"🏃 {agent_name} started",
            "description": f"**Metro:** {metro}\n**Series:** {series_count}",
            "color": COLOR_INFO,
            "timestamp": datetime.utcnow().isoformat(),
        }]
    })


def log_agent_finish(agent_name: str, metro: str, rows: int, elapsed_sec: float) -> bool:
    """Post to #market-intel-log when an agent finishes."""
    cfg = get_config()
    return _post_webhook(cfg.discord_log_webhook, {
        "embeds": [{
            "title": f"✅ {agent_name} finished",
            "description": (
                f"**Metro:** {metro}\n"
                f"**Rows written:** {rows}\n"
                f"**Duration:** {elapsed_sec:.1f}s"
            ),
            "color": COLOR_SUCCESS,
            "timestamp": datetime.utcnow().isoformat(),
        }]
    })


def log_agent_error(agent_name: str, metro: str, error: str) -> bool:
    """Post to #market-intel-log when an agent hits an error."""
    cfg = get_config()
    return _post_webhook(cfg.discord_log_webhook, {
        "embeds": [{
            "title": f"❌ {agent_name} error",
            "description": f"**Metro:** {metro}\n```{error[:1000]}```",
            "color": COLOR_ERROR,
            "timestamp": datetime.utcnow().isoformat(),
        }]
    })


def log_agent_warning(agent_name: str, message: str) -> bool:
    """Post a warning to #market-intel-log."""
    cfg = get_config()
    return _post_webhook(cfg.discord_log_webhook, {
        "embeds": [{
            "title": f"⚠️ {agent_name}",
            "description": message[:2000],
            "color": COLOR_WARNING,
            "timestamp": datetime.utcnow().isoformat(),
        }]
    })


# ── Morning digest channel ───────────────────────────────────────────

def send_digest(summary: Dict[str, Any]) -> bool:
    """
    Post the morning digest to #market-intel-digest.

    Expected summary shape:
    {
        "date": "2026-03-12",
        "total_rows": 1234,
        "agents": {
            "FRED": {"rows": 500, "metros": ["Phoenix", "Tucson", "LA"], "errors": 0},
            ...
        },
        "highlights": ["30-yr mortgage hit 6.8%", ...],
        "errors": ["Census API timeout for Tucson", ...],
    }
    """
    cfg = get_config()

    agent_lines = []
    for name, info in summary.get("agents", {}).items():
        status = "✅" if info.get("errors", 0) == 0 else "⚠️"
        agent_lines.append(
            f"{status} **{name}** — {info.get('rows', 0)} rows "
            f"({', '.join(info.get('metros', []))})"
        )

    highlights = summary.get("highlights", [])
    highlight_text = "\n".join(f"• {h}" for h in highlights[:10]) if highlights else "_None_"

    errors = summary.get("errors", [])
    error_text = "\n".join(f"• {e}" for e in errors[:5]) if errors else "_None_"

    return _post_webhook(cfg.discord_digest_webhook, {
        "embeds": [{
            "title": f"📊 Market Intel Digest — {summary.get('date', 'today')}",
            "description": (
                f"**Total rows ingested:** {summary.get('total_rows', 0)}\n\n"
                f"__Agent Results__\n{chr(10).join(agent_lines)}\n\n"
                f"__Highlights__\n{highlight_text}\n\n"
                f"__Errors__\n{error_text}"
            ),
            "color": COLOR_DIGEST,
            "timestamp": datetime.utcnow().isoformat(),
        }]
    })


# ── CLI test helper ──────────────────────────────────────────────────

def test_send():
    """Quick smoke test — run via: poetry run test-discord"""
    print("Sending test message to #market-intel-log ...")
    ok1 = log_agent_start("TestAgent", "Phoenix", 5)
    print(f"  Log channel: {'OK' if ok1 else 'FAILED'}")

    print("Sending test digest to #market-intel-digest ...")
    ok2 = send_digest({
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "total_rows": 42,
        "agents": {"FRED": {"rows": 42, "metros": ["Phoenix"], "errors": 0}},
        "highlights": ["Test highlight"],
        "errors": [],
    })
    print(f"  Digest channel: {'OK' if ok2 else 'FAILED'}")
