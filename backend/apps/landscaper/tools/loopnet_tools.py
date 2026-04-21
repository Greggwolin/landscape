"""
LoopNet Deal-Sourcing Tools for Landscaper AI.

Calls the Railway-hosted LoopNet MCP HTTP service (Playwright-backed).
Returns active listings mapped to tbl_sales_comparables field names.

Tools:
  1. loopnet_search_listings  — search by location + property type + filters
  2. loopnet_get_listing_detail — full detail for a single listing URL
  3. loopnet_search_similar   — find listings similar to subject property

Environment:
  LOOPNET_MCP_URL — base URL of the Railway service
                    e.g. "https://loopnet-mcp-production.up.railway.app"
                    Leave unset to surface a clear "service not configured" error.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional
from urllib import request as urllib_req
from urllib.error import HTTPError, URLError

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


# ─── HTTP helper ──────────────────────────────────────────────────────────────

def _call_loopnet(path: str, payload: Dict[str, Any], timeout: int = 60) -> Dict[str, Any]:
    """POST to the LoopNet MCP service. Returns parsed JSON."""
    base_url = os.environ.get("LOOPNET_MCP_URL", "").rstrip("/")
    if not base_url:
        raise ValueError(
            "LOOPNET_MCP_URL environment variable is not set. "
            "Deploy the LoopNet MCP service to Railway and set the URL."
        )

    url = f"{base_url}{path}"
    body = json.dumps(payload).encode()
    req = urllib_req.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )

    try:
        with urllib_req.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        body_text = e.read().decode(errors="ignore")[:500]
        raise RuntimeError(f"LoopNet MCP HTTP {e.code}: {body_text}") from e
    except URLError as e:
        raise RuntimeError(f"LoopNet MCP unreachable: {e.reason}") from e


def _format_listing(listing: Dict[str, Any]) -> str:
    """Format a single listing for Landscaper narration."""
    lines = []
    name = listing.get("property_name") or listing.get("address") or "Unknown Property"
    lines.append(f"**{name}**")

    addr_parts = [
        listing.get("address"),
        listing.get("city"),
        listing.get("state"),
        listing.get("zip_code"),
    ]
    addr = ", ".join(p for p in addr_parts if p)
    if addr:
        lines.append(f"  Address: {addr}")

    if listing.get("_asking_price_display"):
        lines.append(f"  Asking: {listing['_asking_price_display']}")
    elif listing.get("asking_price"):
        lines.append(f"  Asking: ${listing['asking_price']:,.0f}")

    if listing.get("unit_count"):
        lines.append(f"  Units: {listing['unit_count']}")
    if listing.get("year_built"):
        lines.append(f"  Year Built: {listing['year_built']}")
    if listing.get("building_sf"):
        lines.append(f"  Building SF: {listing['building_sf']:,.0f}")
    if listing.get("cap_rate"):
        lines.append(f"  Cap Rate: {listing['cap_rate'] * 100:.2f}%")
    if listing.get("price_per_unit"):
        lines.append(f"  $/Unit: ${listing['price_per_unit']:,.0f}")
    if listing.get("listing_url"):
        lines.append(f"  URL: {listing['listing_url']}")
    if listing.get("similarity_notes"):
        lines.append(f"  Match: {listing['similarity_notes']}")

    return "\n".join(lines)


# ─── Tool 1: Search listings ───────────────────────────────────────────────────


@register_tool("loopnet_search_listings")
def loopnet_search_listings(
    project_id: Optional[int],
    params: Dict[str, Any],
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Search LoopNet for active commercial listings for sale.

    Use for:
    - "find MF listings near Downey" → location, property_type="Multifamily"
    - "what's for sale in Pasadena under $5M" → max_price filter
    - "find pre-1980 apartments in Long Beach" → max_year_built filter
    - "find 50-100 unit apartments in the IE" → min_units / max_units

    Results are active listings (asking price, not closed sale price).
    Output fields match tbl_sales_comparables schema.

    params:
      location (str, required): City/state or ZIP — "Pasadena, CA" / "90241"
      property_type (str): "Multifamily" | "Office" | "Retail" | "Industrial" | "Land"
                           Default: "Multifamily"
      max_results (int): 1-25, default 10
      filters (dict, optional):
        min_price / max_price (float): Asking price range ($)
        min_units / max_units (int): Unit count range
        min_year_built / max_year_built (int): Year built range
    """
    location = params.get("location")
    if not location:
        return {"error": "location is required (e.g., 'Pasadena, CA' or '90241')"}

    payload = {
        "location": location,
        "property_type": params.get("property_type", "Multifamily"),
        "max_results": min(int(params.get("max_results", 10)), 25),
    }

    filters = params.get("filters")
    if filters:
        payload["filters"] = filters

    try:
        result = _call_loopnet("/api/search", payload)
    except Exception as e:
        logger.error(f"loopnet_search_listings error: {e}")
        return {"error": str(e)}

    listings = result.get("listings", [])
    count = result.get("count", len(listings))

    if not listings:
        return {
            "message": f"No listings found in {location} for {payload['property_type']}.",
            "search_url": result.get("search_url"),
            "count": 0,
            "listings": [],
        }

    formatted = [_format_listing(l) for l in listings]
    summary = f"Found {count} {payload['property_type']} listing(s) in {location}:\n\n"
    summary += "\n\n".join(formatted)
    summary += f"\n\n_Source: LoopNet active listings. Asking prices only._"
    if result.get("search_url"):
        summary += f"\n_Search URL: {result['search_url']}_"

    return {
        "message": summary,
        "count": count,
        "location": location,
        "property_type": payload["property_type"],
        "search_url": result.get("search_url"),
        "listings": listings,
        "note": result.get("note", ""),
    }


# ─── Tool 2: Get listing detail ────────────────────────────────────────────────


@register_tool("loopnet_get_listing_detail")
def loopnet_get_listing_detail(
    project_id: Optional[int],
    params: Dict[str, Any],
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Retrieve full detail for a specific LoopNet listing.

    Use after loopnet_search_listings to get complete data on a property.
    Returns all available fields mapped to tbl_sales_comparables column names.

    params:
      listing_url (str, required): Full LoopNet URL from search results
    """
    url = params.get("listing_url")
    if not url:
        return {"error": "listing_url is required"}
    if "loopnet.com" not in url.lower():
        return {"error": f"Invalid LoopNet URL: {url}"}

    try:
        detail = _call_loopnet("/api/detail", {"listing_url": url})
    except Exception as e:
        logger.error(f"loopnet_get_listing_detail error: {e}")
        return {"error": str(e)}

    summary = _format_listing(detail)
    # Add extra detail fields
    extras = []
    if detail.get("num_floors"):
        extras.append(f"  Stories: {detail['num_floors']}")
    if detail.get("land_area_acres"):
        extras.append(f"  Land: {detail['land_area_acres']:.2f} acres")
    if detail.get("parking"):
        extras.append(f"  Parking: {detail['parking']}")
    if detail.get("zoning"):
        extras.append(f"  Zoning: {detail['zoning']}")
    if detail.get("construction_type"):
        extras.append(f"  Construction: {detail['construction_type']}")
    if detail.get("percent_leased_at_sale"):
        extras.append(f"  Occupancy: {detail['percent_leased_at_sale'] * 100:.0f}%")
    if detail.get("noi_at_sale"):
        extras.append(f"  NOI: ${detail['noi_at_sale']:,.0f}")
    if detail.get("listing_broker"):
        extras.append(f"  Broker: {detail['listing_broker']}")
    if detail.get("listing_broker_company"):
        extras.append(f"  Brokerage: {detail['listing_broker_company']}")
    if detail.get("transaction_notes"):
        extras.append(f"  Description: {detail['transaction_notes'][:300]}...")

    if extras:
        summary += "\n" + "\n".join(extras)

    return {
        "message": summary,
        "detail": detail,
    }


# ─── Tool 3: Search similar ────────────────────────────────────────────────────


@register_tool("loopnet_search_similar")
def loopnet_search_similar(
    project_id: Optional[int],
    params: Dict[str, Any],
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Find LoopNet listings similar to a subject property.

    Builds a targeted search using subject property attributes and annotates
    results with similarity notes. Use for comp discovery and market benchmarking.

    Use when:
    - "find MF comps similar to ours in Downey"
    - "find pre-1980 apartments near Pasadena"
    - "what are 50-unit buildings selling for in the area?"

    params:
      location (str, required): Search center — city/state or ZIP
      units (int): Subject unit count — searches ±30% range
      year_built_before (int): Only include buildings built before this year
      year_built_after (int): Only include buildings built after this year
      max_price (float): Maximum asking price ($)
      radius_miles (float): Search radius in miles (0.5–50, default 5)
      max_results (int): 1-25, default 10
    """
    location = params.get("location")
    if not location:
        return {"error": "location is required"}

    payload = {
        "location": location,
        "max_results": min(int(params.get("max_results", 10)), 25),
        "radius_miles": float(params.get("radius_miles", 5.0)),
    }

    if params.get("units"):
        payload["units"] = int(params["units"])
    if params.get("year_built_before"):
        payload["year_built_before"] = int(params["year_built_before"])
    if params.get("year_built_after"):
        payload["year_built_after"] = int(params["year_built_after"])
    if params.get("max_price"):
        payload["max_price"] = float(params["max_price"])

    try:
        result = _call_loopnet("/api/similar", payload)
    except Exception as e:
        logger.error(f"loopnet_search_similar error: {e}")
        return {"error": str(e)}

    listings = result.get("listings", [])
    count = result.get("count", len(listings))

    if not listings:
        return {
            "message": f"No similar listings found near {location}.",
            "search_url": result.get("search_url"),
            "count": 0,
            "listings": [],
        }

    formatted = [_format_listing(l) for l in listings]
    subject_desc = []
    if payload.get("units"):
        subject_desc.append(f"{payload['units']} units")
    if payload.get("year_built_before"):
        subject_desc.append(f"pre-{payload['year_built_before']}")
    subject_str = f" ({', '.join(subject_desc)})" if subject_desc else ""

    summary = f"Found {count} similar Multifamily listing(s) near {location}{subject_str}:\n\n"
    summary += "\n\n".join(formatted)
    summary += f"\n\n_Source: LoopNet active listings._"

    return {
        "message": summary,
        "count": count,
        "location": location,
        "search_url": result.get("search_url"),
        "listings": listings,
    }
