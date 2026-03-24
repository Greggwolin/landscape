"""
Rental Comp Harvester POC — Google Places + Redfin + Direct Website
====================================================================
STANDALONE test script. No imports from Landscape modules. No database writes.

Tests whether Redfin's stingray endpoint supports rental listings,
and combines Google Places discovery with direct website extraction.

Subject: Chadron Terraces, 14105 Chadron Ave, Hawthorne, CA 90250
Usage:
    export GOOGLE_API_KEY="your-key"
    python backend/tools/redfin_ingest/rental_comp_poc_test.py
"""

import json
import math
import os
import re
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
SEARCH_RADIUS_METERS = int(SEARCH_RADIUS_MILES * 1609.34)

# Match existing Redfin client patterns exactly
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
REDFIN_BASE = "https://www.redfin.com/stingray"
REQUEST_DELAY = 1.5  # seconds between Redfin requests (match existing)
REDFIN_TIMEOUT = 15  # seconds
MAX_REDFIN_REQUESTS = 20  # hard cap for this test

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GOOGLE_PLACES_API_KEY", "")

redfin_request_count = 0


# ── Utilities (standalone, matching existing patterns) ─────────────────────

def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in miles — matches existing redfinClient.ts."""
    R = 3958.8
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def bounding_box_poly(center_lat: float, center_lng: float, radius_miles: float) -> str:
    """Generate Redfin bounding box polygon — matches existing client.py."""
    lat_deg = 1 / 69.0
    lng_deg = 1 / (69.0 * math.cos(math.radians(center_lat)))
    lat_off = radius_miles * lat_deg
    lng_off = radius_miles * lng_deg
    n = center_lat + lat_off
    s = center_lat - lat_off
    e = center_lng + lng_off
    w = center_lng - lng_off
    return (
        f"{w:.3f}+{n:.3f},{e:.3f}+{n:.3f},"
        f"{e:.3f}+{s:.3f},{w:.3f}+{s:.3f},{w:.3f}+{n:.3f}"
    )


def redfin_get(url: str, accept: str = "text/csv,application/csv,*/*") -> Optional[requests.Response]:
    """Make a rate-limited GET to Redfin, matching existing HttpClient patterns."""
    global redfin_request_count
    if redfin_request_count >= MAX_REDFIN_REQUESTS:
        print(f"    ⚠ Redfin request cap ({MAX_REDFIN_REQUESTS}) reached — skipping")
        return None

    time.sleep(REQUEST_DELAY)
    try:
        resp = requests.get(
            url,
            timeout=REDFIN_TIMEOUT,
            headers={"User-Agent": USER_AGENT, "Accept": accept},
        )
        redfin_request_count += 1
        return resp
    except Exception as e:
        print(f"    ✗ Redfin request error: {e}")
        redfin_request_count += 1
        return None


def web_get(url: str, timeout: int = 15) -> Optional[requests.Response]:
    """Simple GET for property websites."""
    try:
        return requests.get(
            url,
            timeout=timeout,
            headers={"User-Agent": USER_AGENT},
            allow_redirects=True,
        )
    except Exception as e:
        print(f"    ✗ Fetch error: {e}")
        return None


# ── Step 1: Google Places Discovery ───────────────────────────────────────

def step1_discover() -> List[Dict[str, Any]]:
    """Discover apartments via Google Places Text Search (legacy API)."""
    print("\n" + "=" * 70)
    print("STEP 1: GOOGLE PLACES DISCOVERY")
    print("=" * 70)

    if not GOOGLE_API_KEY:
        print("  ERROR: No GOOGLE_API_KEY or GOOGLE_PLACES_API_KEY env var set")
        sys.exit(1)

    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": "apartments for rent near 14105 Chadron Ave Hawthorne CA",
        "location": f"{SUBJECT['lat']},{SUBJECT['lng']}",
        "radius": SEARCH_RADIUS_METERS,
        "type": "establishment",
        "key": GOOGLE_API_KEY,
    }

    print(f"  Subject: {SUBJECT['name']}")
    print(f"  Query: {params['query']}")
    print(f"  Radius: {SEARCH_RADIUS_MILES} miles\n")

    resp = requests.get(url, params=params, timeout=15)
    data = resp.json()

    if data.get("status") != "OK":
        print(f"  ERROR: {data.get('status')} — {data.get('error_message', '')}")
        return []

    raw = data.get("results", [])
    print(f"  Found {len(raw)} results\n")

    results = []
    for i, place in enumerate(raw, 1):
        name = place.get("name", "Unknown")
        address = place.get("formatted_address", "")
        loc = place.get("geometry", {}).get("location", {})
        lat = loc.get("lat")
        lng = loc.get("lng")
        rating = place.get("rating")
        rating_count = place.get("user_ratings_total")
        place_id = place.get("place_id", "")

        dist = haversine_miles(SUBJECT["lat"], SUBJECT["lng"], lat, lng) if lat and lng else None

        print(f"  {i:2d}. {name}")
        print(f"      {address}")
        if rating:
            print(f"      Rating: {rating} ({rating_count} reviews)")
        if dist is not None:
            print(f"      Distance: {dist} mi")
        print()

        results.append({
            "name": name,
            "address": address,
            "lat": lat,
            "lng": lng,
            "rating": rating,
            "rating_count": rating_count,
            "distance_miles": dist,
            "website": "",
            "google_place_id": place_id,
        })

    # Fetch websites via Place Details
    print("  Fetching website URLs via Place Details...")
    for r in results:
        if r["google_place_id"]:
            det_url = "https://maps.googleapis.com/maps/api/place/details/json"
            det_params = {"place_id": r["google_place_id"], "fields": "website,url", "key": GOOGLE_API_KEY}
            try:
                dr = requests.get(det_url, params=det_params, timeout=10)
                if dr.status_code == 200:
                    detail = dr.json().get("result", {})
                    r["website"] = detail.get("website", "")
                    r["google_maps_url"] = detail.get("url", "")
                    marker = "✓" if r["website"] else "✗"
                    print(f"    {marker} {r['name']}: {r['website'][:60] if r['website'] else 'no website'}")
            except Exception as e:
                print(f"    ✗ {r['name']}: error - {e}")
            time.sleep(0.1)

    return results


# ── Step 2: Redfin Rental Lookup ──────────────────────────────────────────

def step2a_redfin_csv_rental(places: List[Dict]) -> Dict[str, Any]:
    """Option A: Try stingray GIS-CSV with rental status codes."""
    print("\n" + "=" * 70)
    print("STEP 2A: REDFIN STINGRAY CSV — RENTAL STATUS CODES")
    print("=" * 70)

    poly = bounding_box_poly(SUBJECT["lat"], SUBJECT["lng"], SEARCH_RADIUS_MILES)

    # Known Redfin status codes from reverse-engineering:
    #   status=9  → Sold (what existing client uses)
    #   status=1  → Active/For Sale
    #   status=130 → For Rent (suspected)
    # uipt values:
    #   1=house, 2=condo, 3=townhouse, 4=multi-family, 5=land, 6=other
    #   For rentals: try 2 (condo) and 4 (multi-family)

    rental_tests = [
        {"label": "status=130 (For Rent), uipt=2,3,4", "status": "130", "uipt": "2,3,4"},
        {"label": "status=1 (Active), uipt=4 (Multi-Family)", "status": "1", "uipt": "4"},
        {"label": "status=9 (Sold), uipt=4 (Multi-Family)", "status": "9", "uipt": "4"},
    ]

    results = {}
    for test in rental_tests:
        url = (
            f"{REDFIN_BASE}/api/gis-csv"
            f"?al=1&num_homes=50"
            f"&sold_within_days=180"
            f"&status={test['status']}"
            f"&uipt={test['uipt']}"
            f"&v=8&poly={poly}"
        )

        print(f"\n  Testing: {test['label']}")
        print(f"  URL: {url[:120]}...")

        resp = redfin_get(url)
        if resp is None:
            results[test["label"]] = {"status": "skipped", "reason": "request cap"}
            continue

        if resp.status_code != 200:
            print(f"    HTTP {resp.status_code}")
            results[test["label"]] = {"status": f"http_{resp.status_code}", "body_preview": resp.text[:200]}
            continue

        body = resp.text
        if "<!DOCTYPE" in body or "<html" in body:
            print(f"    Got HTML (rate limited or blocked)")
            results[test["label"]] = {"status": "html_returned", "is_rate_limited": True}
            continue

        lines = body.strip().split("\n")
        print(f"    Got {len(lines)} CSV lines")

        if len(lines) <= 1:
            print(f"    Empty CSV (header only or blank)")
            results[test["label"]] = {"status": "empty_csv", "lines": len(lines)}
            continue

        # Parse header
        header = lines[0] if lines else ""
        print(f"    Header: {header[:120]}...")

        # Count data rows
        data_lines = [l for l in lines[1:] if l.strip() and not l.startswith("Disclaimer")]
        print(f"    Data rows: {len(data_lines)}")

        # Show first few rows
        for row in data_lines[:3]:
            fields = row.split(",")
            print(f"    → {fields[0] if fields else '?'} | {fields[3] if len(fields) > 3 else '?'} | ${fields[7] if len(fields) > 7 else '?'}")

        results[test["label"]] = {
            "status": "csv_returned",
            "total_lines": len(lines),
            "data_rows": len(data_lines),
            "header": header,
            "sample_rows": data_lines[:3],
        }

    return results


def step2b_redfin_autocomplete(places: List[Dict]) -> Dict[str, Any]:
    """Option B: Use Redfin autocomplete to find property pages, then check for rental data."""
    print("\n" + "=" * 70)
    print("STEP 2B: REDFIN AUTOCOMPLETE → PROPERTY DETAIL → RENTAL CHECK")
    print("=" * 70)

    results = {}
    # Test with a few known apartment addresses
    test_addresses = [
        p for p in places
        if p.get("lat") and p.get("lng")
    ][:5]

    for place in test_addresses:
        name = place["name"]
        address = place["address"]
        print(f"\n  ── {name} ──")
        print(f"  Address: {address}")

        # Step B1: Autocomplete to get Redfin path
        search_term = address.split(",")[0] if "," in address else address
        ac_url = f"{REDFIN_BASE}/do/location-autocomplete?location={requests.utils.quote(search_term)}&v=2"
        print(f"  Autocomplete: {search_term}")

        resp = redfin_get(ac_url, accept="application/json")
        if resp is None:
            results[name] = {"status": "skipped", "reason": "request cap"}
            continue

        if resp.status_code != 200:
            print(f"    HTTP {resp.status_code}")
            results[name] = {"status": f"http_{resp.status_code}"}
            continue

        # Redfin prefixes JSON with {}&&
        json_text = resp.text
        if json_text.startswith("{}&&"):
            json_text = json_text[4:]

        try:
            ac_data = json.loads(json_text)
        except json.JSONDecodeError as e:
            print(f"    JSON parse error: {e}")
            results[name] = {"status": "json_error", "body_preview": resp.text[:200]}
            continue

        # Extract first result
        sections = ac_data.get("payload", {}).get("sections", [])
        first_row = None
        for section in sections:
            rows = section.get("rows", [])
            if rows:
                first_row = rows[0]
                break

        if not first_row:
            print(f"    No autocomplete results")
            results[name] = {"status": "no_results"}
            continue

        row_name = first_row.get("name", "")
        row_url = first_row.get("url", "")
        row_type = first_row.get("type")
        row_id = first_row.get("id", "")

        print(f"    Found: {row_name} (type={row_type}, id={row_id})")
        print(f"    URL: {row_url}")

        # Step B2: Try initialInfo to get property details
        if row_url:
            info_url = f"{REDFIN_BASE}/api/home/details/initialInfo?path={requests.utils.quote(row_url)}"
            print(f"  Fetching initialInfo...")

            info_resp = redfin_get(info_url, accept="application/json")
            if info_resp and info_resp.status_code == 200:
                info_text = info_resp.text
                if info_text.startswith("{}&&"):
                    info_text = info_text[4:]

                try:
                    info_data = json.loads(info_text)
                    payload = info_data.get("payload", {})
                    property_id = payload.get("propertyId")
                    listing_id = payload.get("listingId")
                    rental_id = payload.get("rentalId")
                    is_rental = payload.get("isRental", False)

                    print(f"    propertyId: {property_id}")
                    print(f"    listingId: {listing_id}")
                    print(f"    rentalId: {rental_id}")
                    print(f"    isRental: {is_rental}")

                    result_entry = {
                        "status": "found",
                        "redfin_name": row_name,
                        "redfin_url": row_url,
                        "redfin_type": row_type,
                        "property_id": property_id,
                        "listing_id": listing_id,
                        "rental_id": rental_id,
                        "is_rental": is_rental,
                    }

                    # Step B3: If rental data exists, try the rentals API
                    if rental_id:
                        print(f"  Found rentalId! Fetching floor plans...")
                        fp_url = f"{REDFIN_BASE}/api/v1/rentals/{rental_id}/floorPlans"
                        fp_resp = redfin_get(fp_url, accept="application/json")

                        if fp_resp and fp_resp.status_code == 200:
                            fp_text = fp_resp.text
                            if fp_text.startswith("{}&&"):
                                fp_text = fp_text[4:]
                            try:
                                fp_data = json.loads(fp_text)
                                result_entry["floor_plans"] = fp_data
                                print(f"    Got floor plan data!")
                                # Pretty-print a preview
                                print(f"    Preview: {json.dumps(fp_data, indent=2)[:500]}")
                            except json.JSONDecodeError:
                                result_entry["floor_plans_raw"] = fp_text[:500]
                                print(f"    Floor plan response (raw): {fp_text[:200]}")
                        elif fp_resp:
                            print(f"    Floor plans HTTP {fp_resp.status_code}")
                            result_entry["floor_plans_status"] = fp_resp.status_code

                    # Step B3 alt: Try below-the-fold amenities/rental details
                    if property_id:
                        btf_url = (
                            f"{REDFIN_BASE}/api/home/details/belowTheFold"
                            f"?propertyId={property_id}&listingId={listing_id or ''}&accessLevel=1"
                        )
                        print(f"  Fetching belowTheFold for amenities...")
                        btf_resp = redfin_get(btf_url, accept="application/json")
                        if btf_resp and btf_resp.status_code == 200:
                            btf_text = btf_resp.text
                            if btf_text.startswith("{}&&"):
                                btf_text = btf_text[4:]
                            try:
                                btf_data = json.loads(btf_text)
                                btf_payload = btf_data.get("payload", {})
                                # Look for rental-specific fields
                                amenities = btf_payload.get("amenitiesInfo")
                                rental_info = btf_payload.get("rentalInfo")
                                public_records = btf_payload.get("publicRecordsInfo")

                                if amenities:
                                    result_entry["amenities"] = amenities
                                    print(f"    Amenities: found")
                                if rental_info:
                                    result_entry["rental_info"] = rental_info
                                    print(f"    Rental info: {json.dumps(rental_info, indent=2)[:300]}")
                                if public_records:
                                    units = public_records.get("numUnits")
                                    year = public_records.get("yearBuilt")
                                    if units or year:
                                        result_entry["public_records"] = {
                                            "num_units": units,
                                            "year_built": year,
                                        }
                                        print(f"    Public records: {units} units, built {year}")
                            except json.JSONDecodeError:
                                print(f"    belowTheFold JSON error")
                        elif btf_resp:
                            print(f"    belowTheFold HTTP {btf_resp.status_code}")

                    results[name] = result_entry

                except json.JSONDecodeError:
                    print(f"    initialInfo JSON error")
                    results[name] = {"status": "json_error"}
            elif info_resp:
                print(f"    initialInfo HTTP {info_resp.status_code}")
                results[name] = {"status": f"info_http_{info_resp.status_code}"}
        else:
            results[name] = {"status": "no_url"}

    return results


# ── Step 3: Direct Website Extraction ─────────────────────────────────────

def step3_website_extraction(places: List[Dict]) -> Dict[str, Any]:
    """Extract rent data directly from property websites."""
    print("\n" + "=" * 70)
    print("STEP 3: DIRECT WEBSITE EXTRACTION")
    print("=" * 70)

    results = {}
    with_websites = [p for p in places if p.get("website")]
    test_places = with_websites[:5]

    print(f"\n  {len(with_websites)} of {len(places)} have websites — testing up to 5\n")

    for place in test_places:
        name = place["name"]
        website = place["website"]
        print(f"  ── {name} ──")
        print(f"  URL: {website}")

        # Check if this is a RentCafe site
        is_rentcafe = "rentcafe" in website.lower() or any(
            kw in website.lower() for kw in ["rentlemoli", "rentchadron", "liveat"]
        )

        if is_rentcafe:
            # Try the /floorplans page for RentCafe sites
            fp_url = website.rstrip("/") + "/floorplans"
            print(f"  RentCafe detected — fetching {fp_url}")
            resp = web_get(fp_url)
        else:
            resp = web_get(website)

        if not resp or resp.status_code != 200:
            status = resp.status_code if resp else "timeout"
            print(f"  ✗ HTTP {status}")
            results[name] = {"status": f"http_{status}", "source": "website"}
            continue

        html = resp.text
        print(f"  Got {len(html)} chars")

        # Try RentCafe GA4 extraction first
        ga4_matches = re.findall(
            r"setGA4Cookie\('GT',\s*'([^']+)',\s*'(\d+)',\s*'(\d+)',\s*'(\d+)',\s*'(\d+)',\s*'(\d+)'\)",
            html,
        )

        if ga4_matches:
            print(f"  ✓ Found {len(ga4_matches)} floor plans via GA4 data attributes")
            unit_types = []
            for match in ga4_matches:
                fp_name, beds, sqft_min, sqft_max, rent_min, rent_max = match
                unit = {
                    "floorplan_name": fp_name,
                    "bedrooms": int(beds),
                    "sqft_min": int(sqft_min),
                    "sqft_max": int(sqft_max),
                    "rent_min": int(rent_min) if int(rent_min) > 0 else None,
                    "rent_max": int(rent_max) if int(rent_max) > 0 else None,
                }
                rent_str = f"${unit['rent_min']:,}-${unit['rent_max']:,}" if unit["rent_min"] else "N/A"
                print(f"    {fp_name}: {beds}BR / {sqft_min}-{sqft_max} SF / {rent_str}")
                unit_types.append(unit)

            results[name] = {
                "status": "extracted",
                "source": "rentcafe_ga4",
                "confidence": "high",
                "unit_types": unit_types,
            }
        else:
            # Check for other rent patterns in HTML
            rent_patterns = re.findall(r'\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?(?:\s*/\s*(?:mo|month))', html, re.IGNORECASE)
            if rent_patterns:
                print(f"  ~ Found {len(rent_patterns)} rent-like patterns (would need LLM for structured extraction)")
                results[name] = {
                    "status": "patterns_found",
                    "source": "html_regex",
                    "confidence": "low",
                    "rent_patterns": rent_patterns[:10],
                }
            else:
                print(f"  ✗ No rent data found in HTML")
                results[name] = {
                    "status": "no_data",
                    "source": "website",
                    "html_length": len(html),
                    "notes": "May be JS-rendered SPA or management company site",
                }

    return results


# ── Main ──────────────────────────────────────────────────────────────────

def run_test():
    print("\n" + "█" * 70)
    print("  RENTAL COMP HARVESTER POC — REDFIN + GOOGLE PLACES + WEBSITES")
    print(f"  Subject: {SUBJECT['name']}")
    print(f"  Address: {SUBJECT['address']}")
    print(f"  Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("█" * 70)

    # Step 1: Discovery
    places = step1_discover()
    if not places:
        print("\nNo apartments found. Exiting.")
        return

    # Step 2A: Redfin CSV rental status codes
    csv_results = step2a_redfin_csv_rental(places)

    # Step 2B: Redfin autocomplete → property detail → rental data
    redfin_results = step2b_redfin_autocomplete(places)

    # Step 3: Direct website extraction
    website_results = step3_website_extraction(places)

    # ── Combined Summary ──────────────────────────────────────────────────
    print("\n\n" + "=" * 70)
    print("COMBINED RESULTS SUMMARY")
    print("=" * 70)

    print(f"\n  Discovery: {len(places)} apartment communities")
    print(f"  With websites: {len([p for p in places if p.get('website')])}")

    print(f"\n  ── Redfin CSV Tests ──")
    for label, result in csv_results.items():
        status = result.get("status", "?")
        rows = result.get("data_rows", 0)
        print(f"    {label}: {status} ({rows} rows)" if rows else f"    {label}: {status}")

    print(f"\n  ── Redfin Property Lookups ──")
    redfin_with_rental = 0
    redfin_with_data = 0
    for name, result in redfin_results.items():
        status = result.get("status", "?")
        rental_id = result.get("rental_id")
        is_rental = result.get("is_rental", False)
        if rental_id:
            redfin_with_rental += 1
        if result.get("floor_plans") or result.get("rental_info"):
            redfin_with_data += 1
        marker = "✓" if rental_id else "✗"
        print(f"    {marker} {name}: {status} | rentalId={rental_id} | isRental={is_rental}")
    print(f"    → {redfin_with_rental} with rentalId, {redfin_with_data} with actual rental data")

    print(f"\n  ── Website Extractions ──")
    website_extracted = 0
    for name, result in website_results.items():
        status = result.get("status", "?")
        source = result.get("source", "?")
        confidence = result.get("confidence", "?")
        units = result.get("unit_types", [])
        if status == "extracted":
            website_extracted += 1
        marker = "✓" if status == "extracted" else "~" if status == "patterns_found" else "✗"
        print(f"    {marker} {name}: {status} ({source}, {confidence})" + (f" — {len(units)} floor plans" if units else ""))

    # Coverage calculation
    total = len(places)
    redfin_coverage = redfin_with_data
    website_coverage = website_extracted
    # Deduplicate (some properties may have data from both sources)
    all_with_data = set()
    for name in redfin_results:
        if redfin_results[name].get("floor_plans") or redfin_results[name].get("rental_info"):
            all_with_data.add(name)
    for name in website_results:
        if website_results[name].get("status") == "extracted":
            all_with_data.add(name)

    combined = len(all_with_data)
    print(f"\n  ── Coverage ──")
    print(f"    Redfin only:  {redfin_coverage}/{total} ({redfin_coverage/total*100:.0f}%)")
    print(f"    Website only: {website_coverage}/{total} ({website_coverage/total*100:.0f}%)")
    print(f"    Combined:     {combined}/{total} ({combined/total*100:.0f}%)")
    print(f"    Prior test:   3/20 (15%)")
    print(f"\n    Redfin requests used: {redfin_request_count}/{MAX_REDFIN_REQUESTS}")

    # Save results
    output_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "rental_comp_poc_results.json",
    )

    output = {
        "test_metadata": {
            "test_name": "Rental Comp Harvester POC — Redfin + Google Places + Websites",
            "date": datetime.now().isoformat(),
            "subject": SUBJECT,
            "search_radius_miles": SEARCH_RADIUS_MILES,
            "redfin_requests_used": redfin_request_count,
            "redfin_request_cap": MAX_REDFIN_REQUESTS,
        },
        "discovery": {
            "total": len(places),
            "with_websites": len([p for p in places if p.get("website")]),
            "places": [{k: v for k, v in p.items() if k != "html"} for p in places],
        },
        "redfin_csv_tests": csv_results,
        "redfin_property_lookups": redfin_results,
        "website_extractions": website_results,
        "coverage": {
            "redfin_only": redfin_coverage,
            "website_only": website_coverage,
            "combined": combined,
            "total_discovered": total,
            "combined_pct": round(combined / total * 100, 1) if total > 0 else 0,
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
