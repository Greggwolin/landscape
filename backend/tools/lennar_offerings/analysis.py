from __future__ import annotations

from typing import Dict, List

from .schemas import Community, Listing, Plan


def build_summary(
    communities: List[Community],
    plans: List[Plan],
    listings: List[Listing],
    http_errors: List[tuple[str, int]],
) -> Dict[str, str]:
    price_coverage = sum(1 for c in communities if c.price_min or c.price_max)
    sqft_coverage = sum(1 for c in communities if c.sqft_min or c.sqft_max)
    notes_parts = [
        f"Parsed {len(communities)} communities "
        f"({price_coverage} with price info, {sqft_coverage} with size info)."
    ]
    if plans:
        notes_parts.append(f"Captured {len(plans)} plans.")
    else:
        notes_parts.append("Plan pages not captured in this run (possibly JS or access-controlled).")
    if listings:
        notes_parts.append(f"Captured {len(listings)} listings.")
    else:
        notes_parts.append("Listings not captured; may require deeper crawl or JS rendering.")
    if http_errors:
        failures = ", ".join({str(code) for _, code in http_errors})
        notes_parts.append(f"HTTP errors encountered: {failures}.")
    return {"notes": " ".join(notes_parts)}
