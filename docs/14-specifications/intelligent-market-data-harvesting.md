# Intelligent Market Data Harvesting — Feature Concept

> **Status:** POC validated (March 2026) — ready for production scoping
> **Sessions:** GR21, GR30, GR37, GR39
> **Author:** Gregg Wolin
> **Last updated:** 2026-03-20

---

## Problem Statement

Appraisers and analysts manually collect rental comp data by visiting individual property websites, calling leasing offices, and cross-referencing listing sites. For a typical multifamily valuation, this takes 2-4 hours per subject property and yields 5-15 comps. The data goes stale immediately. There is no programmatic way to refresh it.

Landscape should automate the discovery and extraction of rental comparable data so that an appraiser opening a new MF project gets a pre-populated comp set within seconds — not hours.

---

## Solution: Three-Layer Harvesting Pipeline

### Layer 1: Redfin Rentals API (Primary — Broad Coverage)

**Endpoint:** `GET https://www.redfin.com/stingray/api/v1/search/rentals?poly={bbox}&num_homes=100`

**What it provides:** Property name, address, lat/lng, bed/bath/sqft ranges, rent price ranges, available unit count, move-in specials, rental ID for detail lookups.

**Coverage:** 200-700+ properties per 3-mile radius in metro areas. Covers both institutional communities AND small independent buildings that have no website.

**Key POC findings:**

| Test Market | Radius | Properties Found |
|---|---|---|
| Hawthorne, CA | 3 mi | 231 |
| Rancho Palos Verdes, CA | 3 mi | 48 |
| Azusa, CA | 3 mi | 137 |
| Long Beach, CA | 3 mi | 936 |
| Scottsdale, AZ | 3 mi | 709 |

**Resolution approach:** Polygon search from subject lat/lng + configurable radius. No region_id or market parameter needed — polygon works nationwide and the `market` parameter is ignored when polygon is present.

**Rate limiting:** 1.5s delay between requests. User-Agent spoofing required (standard Chrome UA). No API key. Responses are JSON prefixed with `{}&&` (strip before parsing).

**Floor plan detail endpoint:** `GET /api/v1/rentals/{rentalId}/floorPlans` returns unit-level data (floor plan name, beds, baths, sqft range, rent range, available units, unit numbers) for larger communities. Individual unit listings don't have floor plan data — they ARE the unit.

### Layer 2: Website Extraction (Enrichment — Institutional Comps)

**What it provides:** Exact unit-level floor plan data, amenity lists, pet policies, parking fees, concessions — the detail that distinguishes an appraisal-grade comp from a listing-grade comp.

**Method:** For properties discovered in Layer 1 that have a `propertyUrl` or can be matched to a property website via Google Places API, fetch the property page and extract structured data.

**Best source identified:** RentCafe/Yardi properties embed GA4 analytics data attributes (`setGA4Cookie` calls) containing machine-readable floor plan data. Deterministic regex extraction — no LLM needed. ~40% of institutional communities use RentCafe.

**Coverage:** ~15% of total properties have extractable websites, but these are disproportionately the institutional comps that appraisers weight most heavily.

**Google Places API:** Legacy Text Search endpoint (`https://maps.googleapis.com/maps/api/place/textsearch/json?query=apartment+communities+for+rent+near+{address}`) returns 20 results with name, address, lat/lng, place_id. Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (already configured in Landscape).

### Layer 3: Paid API Fallback (Future — Gap Coverage)

For markets or property types where Redfin coverage is thin, evaluate:

- **RentCast API** — 50 free calls for testing, structured rent data
- **HelloData** — Multifamily-focused, unit-level detail
- **Dwellsy API IQ** — Aggregated listings

Not tested in POC. Deferred to post-alpha evaluation.

---

## Production Architecture

### Data Flow

```
Subject Property (lat/lng)
    │
    ├─ [1] Build bounding box polygon (configurable radius, default 3 mi)
    │
    ├─ [2] Redfin rentals API → 200-700+ properties with rent ranges
    │      └─ Filter by distance, property type, unit count
    │
    ├─ [3] For top N candidates (closest, most similar):
    │      ├─ Redfin floor plan detail → unit mix for larger communities
    │      └─ Google Places → website URL → RentCafe extraction
    │
    └─ [4] Write to tbl_rental_comparable
           ├─ source_type: 'redfin' | 'website' | 'manual'
           ├─ Dedup on address + source
           └─ Refresh on demand or scheduled
```

### Schema Migration Required: `tbl_rental_comparable`

Current table is missing fields needed for automated harvesting. Add:

| Column | Type | Purpose |
|---|---|---|
| `source_type` | `varchar(20)` | 'redfin', 'website', 'google_places', 'manual' |
| `source_url` | `text` | Redfin listing URL or property website |
| `redfin_rental_id` | `varchar(50)` | UUID from Redfin for floor plan lookups |
| `redfin_property_id` | `varchar(50)` | Redfin property ID |
| `google_place_id` | `varchar(100)` | Google Places ID for enrichment |
| `as_of_date` | `date` | When the rent data was observed |
| `last_refreshed` | `timestamptz` | Last successful data refresh |
| `available_units` | `integer` | Currently available unit count |
| `rent_range_min` | `numeric(10,2)` | Lowest asking rent across all floor plans |
| `rent_range_max` | `numeric(10,2)` | Highest asking rent across all floor plans |
| `is_active` | `boolean` | Whether property is still actively leasing |
| `specials` | `text[]` | Move-in specials / concessions |
| `bed_range_min` | `smallint` | Smallest bedroom count (0=studio) |
| `bed_range_max` | `smallint` | Largest bedroom count |
| `sqft_range_min` | `integer` | Smallest unit sqft |
| `sqft_range_max` | `integer` | Largest unit sqft |

### Backend Service

Location: `backend/apps/market_intel/services/rental_comp_harvester.py`

Responsibilities:
1. Polygon construction from lat/lng + radius
2. Redfin API client (JSON, not CSV — completely separate from existing `redfinClient.ts` sales comp client)
3. Floor plan detail fetching for top candidates
4. Google Places discovery + website extraction
5. Dedup and upsert to `tbl_rental_comparable`
6. Rate limiting (1.5s between Redfin requests, respect Google Places quotas)

### API Endpoint

`POST /api/market-intel/rental-comps/harvest/`

```json
{
  "project_id": 17,
  "lat": 33.9164,
  "lng": -118.3526,
  "radius_miles": 3.0,
  "min_units": 10,
  "max_results": 50
}
```

Returns harvested comp count + summary. Actual comps retrieved via existing rental comp list endpoint.

### Landscaper Tool

`harvest_rental_comps` — Triggers the harvesting pipeline for the current project. User says "find rental comps near my property" → Landscaper calls harvest endpoint → reports results.

### Frontend Integration

Rent comp grid (existing) gains a "Harvest Comps" button that triggers the pipeline and refreshes the grid on completion. Status indicator shows "Harvesting..." during the async operation.

---

## What We're NOT Building (Scope Boundaries)

1. **Not a Redfin scraper for sales data** — The existing `redfinClient.ts` handles sales comps via the CSV endpoint. This is a completely separate system using the rentals JSON API.
2. **Not real-time monitoring** — Harvest on demand or scheduled refresh, not continuous polling.
3. **Not a comp selection engine** — The harvester discovers and stores raw comps. The appraiser still selects which ones to use in the valuation.
4. **Not an LLM-dependent extraction pipeline** — RentCafe GA4 extraction is deterministic regex. LLM is only used as a fallback for non-standard website formats.

---

## Technical Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Redfin blocks server-side requests | Medium | Autocomplete already blocked (403), but rentals search + floor plans work from cloud IPs. Monitor for changes. Paid API fallback as backup. |
| Rate limiting at scale | Medium | 1.5s delay per request. For 50 comps with floor plan detail: ~75s total. Acceptable for on-demand use. |
| Redfin response format changes | Low-Medium | JSON structure is versioned. Pin to known response parsing. Add format validation with fallback. |
| Google Places API costs | Low | Text Search: $32 per 1,000 requests. At ~20 requests per harvest, cost is negligible. |
| Stale data | Low | `as_of_date` + `last_refreshed` columns enable freshness tracking. UI can flag comps older than 30 days. |

---

## Relationship to Satellite Absorption Intelligence (Future)

This session also explored satellite-based absorption tracking for land dev projects. The concept:

- **Sentinel-2** weekly imagery (10m resolution, free) for construction detection (binary: active construction vs. vacant land)
- **Maricopa County Assessor API** (free, REST) for subdivision parcel search and boundary inference
- **Click-to-expand boundary inference:** User clicks one parcel → system queries all parcels with same subdivision name → dissolves into boundary polygon
- **Target markets:** Sunbelt horizontal growth (Phoenix, DFW, Houston) — not LA (high-density infill, irrelevant for subdivision absorption)

The satellite concept was validated conceptually but not POC-tested. It shares the "automated market intelligence" theme but is architecturally independent from the rent comp harvester.

---

## POC Artifacts

| File | Description |
|---|---|
| `backend/tools/redfin_ingest/rental_comp_poc_v2.py` | Working POC script — Redfin rentals API + floor plan detail |
| `backend/tools/redfin_ingest/rental_comp_poc_results_v2.json` | 231 Hawthorne rental properties with full data |
| `backend/tools/redfin_ingest/rental_comp_poc_test.py` | V1 POC — Google Places + Redfin CSV (legacy, superseded) |
| `backend/tools/redfin_ingest/rental_comp_poc_results.json` | V1 results |
| `rent_comp_test_results.json` | GR21 Google Places + website scraping results |

---

## Next Steps (Priority Order)

1. **Test from Railway** — Confirm Redfin rentals API works from the production backend environment, not just local/Cowork
2. **Schema migration** — Add columns to `tbl_rental_comparable`
3. **Backend service** — `rental_comp_harvester.py` in `market_intel`
4. **API endpoint** — `POST /api/market-intel/rental-comps/harvest/`
5. **Landscaper tool** — `harvest_rental_comps`
6. **Frontend button** — "Harvest Comps" on rent comp grid
7. **Evaluate paid fallback** — RentCast test with 50 free API calls
