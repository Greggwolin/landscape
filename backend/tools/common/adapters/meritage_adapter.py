from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Iterable, List, Optional

from backend.tools.common.models import UnifiedCommunityBenchmark
from backend.tools.meritage_offerings.schemas import MeritageCommunity


def _hash_seed(seed: str) -> str:
    return hashlib.md5(seed.encode("utf-8")).hexdigest()


def to_unified_community(
    comm: MeritageCommunity, market_label: Optional[str] = None
) -> UnifiedCommunityBenchmark:
    source_url = comm.url or None
    source_id = comm.community_id or _hash_seed(source_url or comm.name)
    first_seen = (
        datetime.fromisoformat(comm.first_seen_at)
        if comm.first_seen_at
        else None
    )
    last_seen = (
        datetime.fromisoformat(comm.last_seen_at)
        if comm.last_seen_at
        else None
    )
    return UnifiedCommunityBenchmark(
        source="meritage",
        source_id=source_id,
        builder_name=comm.builder_name or "Meritage Homes",
        community_name=comm.name,
        market_label=market_label or comm.market_label,
        city=comm.city,
        state=comm.state,
        price_min=int(comm.price_min) if comm.price_min is not None else None,
        price_max=int(comm.price_max) if comm.price_max is not None else None,
        sqft_min=int(comm.sqft_min) if comm.sqft_min is not None else None,
        sqft_max=int(comm.sqft_max) if comm.sqft_max is not None else None,
        beds_min=int(comm.beds_min) if comm.beds_min is not None else None,
        beds_max=int(comm.beds_max) if comm.beds_max is not None else None,
        baths_min=comm.baths_min,
        baths_max=comm.baths_max,
        product_types=comm.product_types or ["SFD"],
        source_url=source_url,
        first_seen_at=first_seen,
        last_seen_at=last_seen,
    )


def to_unified_communities(
    comms: Iterable[MeritageCommunity], market_label: Optional[str] = None
) -> List[UnifiedCommunityBenchmark]:
    return [to_unified_community(c, market_label) for c in comms]
