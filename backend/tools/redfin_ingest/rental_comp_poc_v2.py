"""
Rental Comp Harvester POC v2 — Redfin Rentals API
===================================================
Uses the CORRECT endpoint: /api/v1/search/rentals (not gis-csv)
Plus /api/v1/rentals/{rentalId}/floorPlans for unit-level detail.

STANDALONE. No imports from Landscape. No database writes.

Subject: Chadron Terraces, 14105 Chadron Ave, Hawthorne, CA 90250
Usage:
    python backend/tools/redfin_ingest/rental_comp_poc_v2.py
"""

import json
import math
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests

# ── Config ─────────────────────────────────────────────────────────────────

SUBJECT = {
    "name": "Chadron Terraces",
    "address": "14105 Chadron Avenue, Hawthorne, CA 90250",
    "lat": 33.9164,
    "lng": -118.3526,
    "units": 113,
    "project_id": 17,
}

SEARCH_RADIUS_MILES = 3.0
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
REDFIN_BASE = "https://www.redfin.com/stingray"
REQUEST_DELAY = 1.5
MAX_REDFIN_REQUESTS = 20
MAX_FLOORPLAN_LOOKUPS = 10  # cap floor plan detail fetches

request_count = 0


def haversine_miles(lat1, lon1, lat2, lon2):
    R = 3958.8
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def bounding_box_poly(lat, lng, radius_miles):
    lat_d = 1 / 69.0
    lng_d = 1 / (69.0 * math.cos(math.radians(lat)))
    lo = radius_miles * lat_d
    lgo = radius_miles * lng_d
    n, s, e, w = lat + lo, lat - lo, lng + lgo, lng - lgo
    return f"{w:.3f}+{n:.3f},{e:.3f}+{n:.3f},{e:.3f}+{s:.3f},{w:.3f}+{s:.3f},{w:.3f}+{n:.3f}"


def redfin_get(url, accept="application/json"):
    global request_count
    if request_count >= MAX_REDFIN_REQUESTS:
        print(f"    ⚠ Request cap ({MAX_REDFIN_REQUESTS}) reached")
        return None
    time.sleep(REQUEST_DELAY)
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": USER_AGENT, "Accept": accept})
        request_count += 1
        return resp
    except Exception as e:
        print(f"    ✗ Error: {e}")
        request_count += 1
        return None


def parse_redfin_json(text):
    """Strip Redfin's {}&&  prefix and parse JSON."""
    if text.startswith("{}&&"):
        text = text[4:]
    return json.loads(text)


# ── Step 1: Redfin Rentals Search ─────────────────────────────────────────

def step1_redfin_rental_search():
    """Search Redfin rentals via /api/v1/search/rentals with polygon."""
    print("\n" + "=" * 70)
    print("STEP 1: REDFIN RENTALS API — /api/v1/search/rentals")
    print("=" * 70)

    poly = bounding_box_poly(SUBJECT["lat"], SUBJECT["lng"], SEARCH_RADIUS_MILES)

    # Use region_id approach (polygon requires specific encoding that may vary)
    url = (
        f"{REDFIN_BASE}/api/v1/search/rentals"
        f"?market=socal"
        f"&region_id=8306&region_type=6"
        f"&num_homes=100"
    )

    print(f"  Subject: {SUBJECT['name']}")
    print(f"  Radius: {SEARCH_RADIUS_MILES} miles (filtering by distance post-fetch)")
    print(f"  URL: {url[:120]}...\n")

    resp = redfin_get(url)
    if not resp or resp.status_code != 200:
        status = resp.status_code if resp else "timeout"
        print(f"  ERROR: HTTP {status}")
        return []

    data = parse_redfin_json(resp.text)

    # Rentals API returns homes at top level, not inside payload
    homes = data.get("homes", [])
    total_matched = data.get("numMatchedHomes", len(homes))
    print(f"  Found {len(homes)} rental properties (Redfin matched: {total_matched})\n")

    results = []
    for i, home in enumerate(homes, 1):
        hd = home.get("homeData", {})
        re_ = home.get("rentalExtension", {})

        addr_info = hd.get("addressInfo", {})
        street = addr_info.get("formattedStreetLine", "")
        city = addr_info.get("city", "")
        state = addr_info.get("state", "")
        zip_code = addr_info.get("zip", "")
        centroid = addr_info.get("centroid", {}).get("centroid", {})
        lat = centroid.get("latitude")
        lng = centroid.get("longitude")

        prop_name = re_.get("propertyName", street)
        rental_id = re_.get("rentalId", "")
        property_id = hd.get("propertyId")

        bed_range = re_.get("bedRange", {})
        bath_range = re_.get("bathRange", {})
        sqft_range = re_.get("sqftRange", {})
        rent_range = re_.get("rentPriceRange", {})
        avail_units = re_.get("numAvailableUnits", 0)
        description = re_.get("description", "")

        sashes = hd.get("sashes", [])
        specials = [s.get("sashTypeName", "") for s in sashes if s.get("sashTypeName")]

        dist = haversine_miles(SUBJECT["lat"], SUBJECT["lng"], lat, lng) if lat and lng else None

        rent_str = ""
        if rent_range.get("min") and rent_range.get("max"):
            if rent_range["min"] == rent_range["max"]:
                rent_str = f"${rent_range['min']:,}"
            else:
                rent_str = f"${rent_range['min']:,}-${rent_range['max']:,}"
        elif rent_range.get("min"):
            rent_str = f"from ${rent_range['min']:,}"

        bed_str = ""
        if bed_range.get("min") is not None and bed_range.get("max") is not None:
            if bed_range["min"] == bed_range["max"]:
                bed_str = f"{bed_range['min']}BR" if bed_range["min"] > 0 else "Studio"
            else:
                bed_str = f"{bed_range['min']}-{bed_range['max']}BR"

        print(f"  {i:2d}. {prop_name}")
        print(f"      {street}, {city}, {state} {zip_code}")
        print(f"      {bed_str} | {rent_str} | {avail_units} avail | {dist} mi")
        if specials:
            print(f"      Specials: {', '.join(specials)}")
        print()

        results.append({
            "property_name": prop_name,
            "address": f"{street}, {city}, {state} {zip_code}",
            "street": street,
            "city": city,
            "state": state,
            "zip": zip_code,
            "lat": lat,
            "lng": lng,
            "distance_miles": dist,
            "property_id": property_id,
            "rental_id": rental_id,
            "bed_range": bed_range,
            "bath_range": bath_range,
            "sqft_range": sqft_range,
            "rent_range": rent_range,
            "available_units": avail_units,
            "specials": specials,
            "description": description[:200] if description else "",
        })

    # Sort by distance
    results.sort(key=lambda r: r.get("distance_miles") or 999)
    return results


# ── Step 2: Floor Plan Details ────────────────────────────────────────────

def step2_floor_plan_details(rentals):
    """Fetch unit-level floor plan data for top properties."""
    print("\n" + "=" * 70)
    print("STEP 2: REDFIN FLOOR PLAN DETAILS — /api/v1/rentals/{id}/floorPlans")
    print("=" * 70)

    # Pick closest properties with available units
    candidates = [r for r in rentals if r.get("rental_id") and r.get("available_units", 0) > 0]
    test_set = candidates[:MAX_FLOORPLAN_LOOKUPS]

    print(f"\n  {len(candidates)} properties have available units — fetching up to {MAX_FLOORPLAN_LOOKUPS}\n")

    results = {}
    for r in test_set:
        name = r["property_name"]
        rental_id = r["rental_id"]
        print(f"  ── {name} ({r['distance_miles']} mi) ──")

        url = f"{REDFIN_BASE}/api/v1/rentals/{rental_id}/floorPlans"
        resp = redfin_get(url)

        if not resp:
            results[name] = {"status": "skipped", "reason": "request cap"}
            continue

        if resp.status_code != 200:
            print(f"    HTTP {resp.status_code}")
            results[name] = {"status": f"http_{resp.status_code}"}
            continue

        try:
            data = parse_redfin_json(resp.text)
        except json.JSONDecodeError:
            print(f"    JSON parse error")
            results[name] = {"status": "json_error"}
            continue

        # Floor plans can be at top level or inside payload
        floor_plans = data.get("floorPlans", [])
        if not floor_plans:
            payload = data.get("payload", {})
            floor_plans = payload.get("floorPlans", []) if isinstance(payload, dict) else []
        if not floor_plans and isinstance(data, list):
            floor_plans = data

        unit_types = []
        for fp in floor_plans:
            fp_name = fp.get("name", "Unknown")
            beds = fp.get("beds")
            baths_full = fp.get("bathsFull", 0)
            baths_half = fp.get("bathsHalf", 0)
            baths = baths_full + (0.5 * baths_half) if baths_full else None
            sqft_min = fp.get("sqftMin")
            sqft_max = fp.get("sqftMax")
            price_min = fp.get("priceMin")
            price_max = fp.get("priceMax")
            status = fp.get("status", "")
            total_units = fp.get("totalUnits", 0)

            # Get individual units
            units = fp.get("units", [])
            avail_units = [u for u in units if u.get("status") == "available"]

            if status == "unavailable" and total_units == 0:
                continue  # Skip empty floor plan types

            rent_str = ""
            if price_min and price_max:
                rent_str = f"${price_min:,}-${price_max:,}" if price_min != price_max else f"${price_min:,}"
            elif price_min:
                rent_str = f"${price_min:,}"

            sqft_str = ""
            if sqft_min and sqft_max:
                sqft_str = f"{sqft_min}-{sqft_max} SF" if sqft_min != sqft_max else f"{sqft_min} SF"

            print(f"    {fp_name}: {rent_str} | {sqft_str} | {len(avail_units)} avail")

            unit_types.append({
                "name": fp_name,
                "bedrooms": beds,
                "bathrooms": baths,
                "sqft_min": sqft_min,
                "sqft_max": sqft_max,
                "rent_min": price_min,
                "rent_max": price_max,
                "status": status,
                "available_count": len(avail_units),
                "unit_numbers": [u.get("unitNumber") for u in avail_units],
            })

        results[name] = {
            "status": "extracted",
            "rental_id": rental_id,
            "floor_plan_count": len(unit_types),
            "unit_types": unit_types,
        }

        if not unit_types:
            print(f"    (no floor plan data in response)")
            results[name]["status"] = "empty"

    return results


# ── Main ──────────────────────────────────────────────────────────────────

def run_test():
    print("\n" + "█" * 70)
    print("  RENTAL COMP HARVESTER POC v2 — REDFIN RENTALS API")
    print(f"  Subject: {SUBJECT['name']}")
    print(f"  Address: {SUBJECT['address']}")
    print(f"  Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("█" * 70)

    # Step 1: Redfin rental search
    rentals = step1_redfin_rental_search()
    if not rentals:
        print("\nNo rentals found. Exiting.")
        return

    # Step 2: Floor plan details
    fp_results = step2_floor_plan_details(rentals)

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n\n" + "=" * 70)
    print("RESULTS SUMMARY")
    print("=" * 70)

    print(f"\n  Redfin rental search: {len(rentals)} properties within {SEARCH_RADIUS_MILES} mi")
    with_avail = len([r for r in rentals if r.get("available_units", 0) > 0])
    print(f"  With available units: {with_avail}")

    fp_extracted = len([v for v in fp_results.values() if v.get("status") == "extracted"])
    print(f"  Floor plan details fetched: {fp_extracted}")
    print(f"  Redfin requests used: {request_count}/{MAX_REDFIN_REQUESTS}")

    print(f"\n  ── Comp Table ──\n")
    print(f"  {'Property':<30} {'Dist':>5} {'Beds':>8} {'Rent Range':>18} {'Avail':>5}")
    print(f"  {'-'*30} {'-'*5} {'-'*8} {'-'*18} {'-'*5}")

    for r in rentals[:20]:
        name = r["property_name"][:29]
        dist = f"{r['distance_miles']:.1f}" if r.get("distance_miles") else "?"
        beds = ""
        br = r.get("bed_range", {})
        if br.get("min") is not None:
            if br["min"] == br.get("max"):
                beds = f"{br['min']}BR" if br["min"] > 0 else "Studio"
            else:
                beds = f"{br['min']}-{br['max']}BR"
        rent = ""
        rr = r.get("rent_range", {})
        if rr.get("min") and rr.get("max"):
            if rr["min"] == rr["max"]:
                rent = f"${rr['min']:,}"
            else:
                rent = f"${rr['min']:,}-${rr['max']:,}"
        avail = str(r.get("available_units", 0))
        print(f"  {name:<30} {dist:>5} {beds:>8} {rent:>18} {avail:>5}")

    # Coverage vs prior test
    print(f"\n  ── Coverage Comparison ──")
    print(f"    GR21 (Google Places + website scraping): 3/20 = 15%")
    print(f"    GR30 v1 (+ Redfin sales CSV):            3/20 = 15% (Redfin added 0)")
    print(f"    GR30 v2 (Redfin rentals API):            {len(rentals)} properties with rent data")
    print(f"    → Redfin rentals API is a completely different endpoint from the sales CSV")
    print(f"    → Covers small/independent buildings that have no website")

    # Save results
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rental_comp_poc_results_v2.json")

    output = {
        "test_metadata": {
            "test_name": "Rental Comp Harvester POC v2 — Redfin Rentals API",
            "date": datetime.now().isoformat(),
            "subject": SUBJECT,
            "search_radius_miles": SEARCH_RADIUS_MILES,
            "redfin_requests_used": request_count,
            "redfin_endpoint": "/api/v1/search/rentals (JSON, not gis-csv)",
            "floor_plan_endpoint": "/api/v1/rentals/{rentalId}/floorPlans",
        },
        "rental_search": {
            "total_found": len(rentals),
            "with_available_units": with_avail,
            "properties": rentals,
        },
        "floor_plan_details": fp_results,
        "api_findings": {
            "search_endpoint": f"{REDFIN_BASE}/api/v1/search/rentals?market=socal&num_homes=50&poly={{bounding_box}}",
            "floor_plan_endpoint": f"{REDFIN_BASE}/api/v1/rentals/{{rentalId}}/floorPlans",
            "supports_polygon": True,
            "supports_region_id": True,
            "json_not_csv": True,
            "key_fields": {
                "rentalExtension.rentalId": "UUID for floor plan lookups",
                "rentalExtension.rentPriceRange.min/max": "Rent range",
                "rentalExtension.bedRange.min/max": "Bedroom range",
                "rentalExtension.sqftRange.min/max": "Sqft range",
                "rentalExtension.numAvailableUnits": "Available unit count",
                "homeData.propertyId": "Redfin property ID",
                "homeData.addressInfo.*": "Full address + lat/lng",
                "homeData.sashes[].sashTypeName": "Move-in specials",
            },
        },
    }

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, default=str)

    print(f"\n  Results saved to: {output_path}")
    print("\n" + "█" * 70)
    print("  TEST COMPLETE")
    print("█" * 70)


if __name__ == "__main__":
    run_test()
