"""Shared robots.txt handling utilities for web scraping tools."""

from __future__ import annotations

import logging
import urllib.robotparser
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Iterable, List
from urllib.parse import urljoin, urlparse

if TYPE_CHECKING:
    from .http_client import HttpClient


# URL path keywords to skip even if robots.txt allows them
BLOCKED_KEYWORDS: List[str] = [
    "amenities",
    "nearby-places",
    "faq",
    "services",
    "nearby-schools",
    "walkthrough",
    "schedule-tour",
    "contact",
    "episerver",
    "brochure",
]


@dataclass
class RobotsInfo:
    """Information about a site's robots.txt policy.

    Attributes:
        robots_url: URL of the robots.txt file.
        fetched: Whether the robots.txt was successfully fetched.
        summary: Human-readable summary of relevant directives.
        allowed: Whether crawling the probe paths is permitted.
    """
    robots_url: str
    summary: str
    allowed: bool
    fetched: bool = False

    # Alias for backwards compatibility with builder_recon
    @property
    def robots_txt_url(self) -> str:
        return self.robots_url


def build_robots_url(seed_url: str) -> str:
    """Build the robots.txt URL from any URL on the same domain."""
    parsed = urlparse(seed_url)
    return f"{parsed.scheme}://{parsed.netloc}/robots.txt"


def fetch_robots(
    client: "HttpClient",
    seed_url: str,
    probe_paths: Iterable[str],
    user_agent: str,
) -> RobotsInfo:
    """Fetch and parse robots.txt, checking if probe paths are allowed.

    Args:
        client: HTTP client to use for fetching.
        seed_url: Any URL on the target domain.
        probe_paths: URLs to check permission for.
        user_agent: User-Agent string to check against.

    Returns:
        RobotsInfo with crawl permission status.
    """
    robots_url = build_robots_url(seed_url)
    rp = urllib.robotparser.RobotFileParser()
    summary_lines = []
    fetched = False
    allowed = True

    try:
        resp = client.get(robots_url)
        if resp and resp.status_code == 200 and resp.text:
            rp.parse(resp.text.splitlines())
            fetched = True
            summary_lines = [
                line
                for line in resp.text.splitlines()
                if line.lower().startswith(("user-agent", "disallow", "allow"))
            ]
            allowed = all(rp.can_fetch(user_agent, path) for path in probe_paths)
        else:
            summary_lines.append("robots.txt not found or empty")
    except Exception as exc:  # noqa: BLE001
        logging.warning("Failed to fetch robots.txt: %s", exc)
        summary_lines.append("robots.txt fetch error")

    summary = "; ".join(summary_lines) if summary_lines else "No directives found"
    return RobotsInfo(
        robots_url=robots_url,
        fetched=fetched,
        summary=summary,
        allowed=allowed,
    )


def is_allowed_url(url: str) -> bool:
    """Check if a URL path should be skipped based on blocked keywords.

    This is a content-based filter separate from robots.txt rules.
    """
    parsed = urlparse(url)
    path = parsed.path.lower()
    return not any(keyword in path for keyword in BLOCKED_KEYWORDS)


def tos_url(seed_url: str) -> str:
    """Build the terms-of-use URL from any URL on the same domain."""
    parsed = urlparse(seed_url)
    return urljoin(f"{parsed.scheme}://{parsed.netloc}", "/terms-of-use")
