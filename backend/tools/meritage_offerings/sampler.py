from __future__ import annotations

import logging
from typing import List, Tuple

from backend.tools.common import HttpClient, RobotsInfo, is_allowed_url
from backend.tools.common.robots import fetch_robots

from .config import MeritageConfig
from .parser import (
    parse_communities_from_next_data,
    parse_next_data,
    probe_client_search_api,
)
from .schemas import MeritageCommunity


class MeritageSampler:
    """Orchestrates fetching and parsing Meritage metro pages."""

    def __init__(self, config: MeritageConfig, client: HttpClient) -> None:
        self.config = config
        self.client = client
        self.http_errors: List[Tuple[str, int]] = []
        self.warnings: List[str] = []

    def fetch_robots(self) -> RobotsInfo:
        return fetch_robots(
            self.client, self.config.entry_url, [self.config.entry_url], self.config.user_agent
        )

    def _get_html(self, url: str) -> str | None:
        if not is_allowed_url(url):
            logging.debug("Skipping disallowed path per keyword blocklist: %s", url)
            return None
        try:
            resp = self.client.get(url)
            if resp and resp.status_code < 400:
                return resp.text
            if resp:
                self.http_errors.append((url, resp.status_code))
        except Exception as exc:  # noqa: BLE001
            logging.debug("HTTP error for %s: %s", url, exc)
        return None

    def crawl(self) -> List[MeritageCommunity]:
        # First try the client-side API for structured data
        api_results, api_warnings = probe_client_search_api(
            self.client, self.config.target_market, self.config.api_subscription_key
        )
        self.warnings.extend(api_warnings)
        if api_results:
            return api_results[: self.config.max_communities]

        entry_html = self._get_html(self.config.entry_url)
        if not entry_html:
            return []

        next_data = parse_next_data(entry_html)
        if not next_data:
            return []

        communities = parse_communities_from_next_data(
            next_data, self.config.target_market, self.config.entry_url
        )
        # Enforce the configured maximum
        return communities[: self.config.max_communities]
