from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class PageSample:
    url: str
    data: Dict[str, Any]
    page_type: str


@dataclass
class CrawlSamples:
    communities: List[PageSample] = field(default_factory=list)
    plans: List[PageSample] = field(default_factory=list)
    listings: List[PageSample] = field(default_factory=list)

    def all_listing_urls(self) -> List[str]:
        return [sample.url for sample in self.listings]

    def unique_counts(self) -> Dict[str, int]:
        return {
            "communities": len(self.communities),
            "plans": len(self.plans),
            "listings": len(self.listings),
        }
