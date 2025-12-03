from __future__ import annotations

import logging
from typing import List, Set

from bs4 import BeautifulSoup

from . import parser
from .analysis import FieldTracker
from .config import ReconConfig
from .schemas import CrawlSamples, PageSample
from ..common import HttpClient


class ReconSampler:
    def __init__(
        self,
        config: ReconConfig,
        client: HttpClient,
        field_tracker: FieldTracker,
    ) -> None:
        self.config = config
        self.client = client
        self.field_tracker = field_tracker

    def _fetch(self, url: str) -> str | None:
        try:
            resp = self.client.get(url)
            if resp and resp.status_code < 400:
                return resp.text
        except Exception as exc:  # noqa: BLE001
            logging.debug("Fetch error for %s: %s", url, exc)
        return None

    def crawl(self) -> CrawlSamples:
        samples = CrawlSamples()
        metro_html = self._fetch(self.config.metro_entry_url)
        if not metro_html:
            return samples
        metro_soup = BeautifulSoup(metro_html, "lxml")
        community_urls = parser.discover_community_urls(
            metro_soup, self.config.metro_entry_url
        )[: self.config.max_communities]
        for community_url in community_urls:
            community_html = self._fetch(community_url)
            if not community_html:
                continue
            community_data = parser.parse_community_page(community_html)
            self.field_tracker.record("community", community_data)
            samples.communities.append(
                PageSample(url=community_url, data=community_data, page_type="community")
            )
            soup = BeautifulSoup(community_html, "lxml")
            plan_urls = parser.discover_plan_urls(soup, community_url)
            listing_urls = parser.discover_listing_urls(soup, community_url)
            plan_urls = plan_urls[: self.config.max_plans_per_community]
            listing_urls = listing_urls[: self.config.max_listings_per_community]
            listing_urls = self._extend_listing_urls_from_plans(
                plan_urls, listing_urls
            )
            for plan_url in plan_urls:
                plan_html = self._fetch(plan_url)
                if not plan_html:
                    continue
                plan_data = parser.parse_plan_page(plan_html)
                self.field_tracker.record("plan", plan_data)
                samples.plans.append(
                    PageSample(url=plan_url, data=plan_data, page_type="plan")
                )
            listing_urls = listing_urls[: self.config.max_listings_per_community]
            for listing_url in listing_urls:
                listing_html = self._fetch(listing_url)
                if not listing_html:
                    continue
                listing_data = parser.parse_listing_page(listing_html)
                self.field_tracker.record("listing", listing_data)
                samples.listings.append(
                    PageSample(url=listing_url, data=listing_data, page_type="listing")
                )
        return samples

    def _extend_listing_urls_from_plans(
        self, plan_urls: List[str], existing: List[str]
    ) -> List[str]:
        dedup: List[str] = []
        seen: Set[str] = set()
        for url in existing:
            if url not in seen:
                seen.add(url)
                dedup.append(url)
        for plan_url in plan_urls:
            if len(dedup) >= self.config.max_listings_per_community:
                break
            plan_html = self._fetch(plan_url)
            if not plan_html:
                continue
            soup = BeautifulSoup(plan_html, "lxml")
            plan_listings = parser.discover_listing_urls(soup, plan_url)
            for url in plan_listings:
                if len(dedup) >= self.config.max_listings_per_community:
                    break
                if url in seen:
                    continue
                seen.add(url)
                dedup.append(url)
        return dedup
