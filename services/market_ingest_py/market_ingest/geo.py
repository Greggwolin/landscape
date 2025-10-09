"""
Utilities for working with the geo_xwalk spine.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple

from loguru import logger

from .db import Database, GeoRecord


@dataclass(frozen=True)
class GeoTarget:
    geo_id: str
    geo_level: str
    geo_name: str


class GeoResolver:
    def __init__(self, db: Database):
        self.db = db

    def resolve_from_city_label(self, label: str) -> GeoRecord:
        """
        Resolve "Phoenix,AZ" into a GEO record.
        """

        parts = [part.strip() for part in label.split(",")]
        if len(parts) != 2:
            raise ValueError("Project label must be in 'City,ST' format")
        city, state = parts
        logger.info("Resolving project city '{}' ({})", city, state)
        return self.db.find_city(city, state)

    def expand_targets(self, base_geo: GeoRecord) -> List[GeoTarget]:
        chain = self.db.expand_geo_chain(base_geo)
        targets = [GeoTarget(geo_id=geo.geo_id, geo_level=geo.geo_level, geo_name=geo.geo_name) for geo in chain]
        logger.debug(
            "Expanded geo chain {} -> {}", base_geo.geo_id, " > ".join(f"{t.geo_level}:{t.geo_id}" for t in targets)
        )
        return targets

    def build_hierarchy_payload(self, targets: Iterable[GeoTarget]) -> Dict[str, str]:
        order = ["CITY", "COUNTY", "MSA", "STATE", "US"]
        hierarchy: Dict[str, str] = {}
        for target in targets:
            key = target.geo_level.lower()
            if key not in hierarchy:
                hierarchy[key] = target.geo_id
        # Ensure macro levels exist to satisfy acceptance criteria
        for expected in order:
            hierarchy.setdefault(expected.lower(), None)
        return hierarchy
