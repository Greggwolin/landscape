from __future__ import annotations

import logging
from typing import List, Tuple

from .config import LennarConfig
from . import parser
from .schemas import Community, Listing, Plan
from ..common import HttpClient, RobotsInfo, is_allowed_url


class LennarSampler:
    def __init__(
        self,
        config: LennarConfig,
        client: HttpClient,
        robots_info: RobotsInfo,
    ) -> None:
        self.config = config
        self.client = client
        self.robots_info = robots_info
        self.http_errors: List[Tuple[str, int]] = []

    def _get_html(self, url: str) -> str | None:
        if not is_allowed_url(url):
            logging.debug("Skipping disallowed path per robots keywords: %s", url)
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

    def crawl(self) -> tuple[List[Community], List[Plan], List[Listing]]:
        communities: List[Community] = []
        plans: List[Plan] = []
        listings: List[Listing] = []
        entry_html = self._get_html(self.config.entry_url)
        if not entry_html:
            return communities, plans, listings
        communities = parser.parse_community_tiles(
            entry_html, self.config.entry_url, self.config.target_market
        )[: self.config.max_communities]
        for community in communities:
            detail_html = self._get_html(community.url)
            if detail_html:
                community = parser.parse_community_detail(detail_html, community)
                comm_plans = parser.parse_plan_list(
                    detail_html, community.community_id, community.url
                )
                plans.extend(comm_plans[: self.config.max_plans_per_community])
                comm_listings = parser.parse_listing_list(
                    detail_html, community.community_id
                )
                listings.extend(comm_listings[: self.config.max_listings_per_community])
        return communities, plans, listings
