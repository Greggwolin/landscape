# GIS Infrastructure Analysis & Recommendations

**Date:** 2025-10-28
**Status:** Analysis Complete
**Branch:** work

---

## Executive Summary

The application already has a comprehensive GIS system in `src/app/components/MapLibre/GISMap.tsx` with full geocoding integration. The recent MapOblique implementation duplicates functionality, and the coordinate accuracy issues stem from Nominatim geocoding limitations rather than infrastructure gaps.

---

## Current GIS Infrastructure

### 1. Existing GISMap Component (`src/app/components/MapLibre/GISMap.tsx`)

**Capabilities:**
- ✅ MapLibre GL JS v5.7.3 integration
- ✅ **ESRI World Imagery** satellite base layer (same as MapOblique)
- ✅ OpenStreetMap overlay at 30% opacity for roads/labels
- ✅ Geocoding integration via `geocodeLocation()` function
- ✅ Reverse geocoding for click-to-address lookup
- ✅ Parcel selection (Pinal County tax parcels)
- ✅ Plan parcel visualization with land-use color coding
- ✅ Dynamic parcel loading based on viewport
- ✅ Interactive mode toggle (pan vs select)
- ✅ Selection sidebar with parcel details

**Limitations:**
- ❌ **No oblique view** - locked to 2D top-down (pitch = 0°)
- ❌ Cannot display 3D building extrusions
- ❌ No pitch/bearing controls

### 2. Existing Geocoding Service (`src/lib/geocoding.ts`)

**Features:**
- OpenStreetMap Nominatim API integration
- Known locations cache for faster lookups
- Reverse geocoding (coordinates → address)
- Census tract FIPS code lookup
- Automatic zoom level calculation based on confidence/bounds

**Current Issue:**
```typescript
// Project 17: 14105 Chadron Avenue, Hawthorne, CA 90250
// Database currently has: 33.895916, -118.328751 (manually adjusted, still wrong)
// Nominatim returned:      33.9031160, -118.3287510 (~0.5 miles north)
// Actual coordinates:      Unknown - Nominatim is inaccurate for this address
```

**Root Cause:** Nominatim (free OSM geocoding) has poor accuracy for some addresses, especially newer developments or complex properties spanning multiple streets.

---

## New MapOblique Component Analysis

### What Was Built

**Files Created:**
- `src/components/map/MapOblique.tsx` - Core oblique map with 3D extrusions
- `src/components/map/ProjectTabMap.tsx` - Project overview wrapper
- `src/components/map/ValuationSalesCompMap.tsx` - Valuation comps wrapper
- `src/lib/map/geo.ts` - GeoJSON type definitions
- `src/lib/map/hooks.ts` - SWR data fetchers
- `src/app/api/projects/[projectId]/map/route.ts` - Project map endpoint
- `src/app/api/projects/[projectId]/valuation/comps/map/route.ts` - Comps endpoint

**Key Features:**
- ✅ Oblique 3D view (configurable pitch 0-75°, bearing -180° to 180°)
- ✅ Fill-extrusion layers for 3D buildings
- ✅ Supports both 3D extrusions AND flat pushpin markers
- ✅ ESRI World Imagery base layer (same as GISMap)
- ✅ Click-to-select on comp buildings
- ✅ Interactive pitch/bearing controls

**Duplication:**
- Uses same ESRI World Imagery tiles as GISMap
- Reimplements marker/feature display logic
- Does NOT use existing geocoding service (fetches from DB directly)

---

## Map Imagery Options

### Current: ESRI World Imagery

**Pros:**
- ✅ Free, no API key required
- ✅ Global coverage
- ✅ Works with MapLibre out of the box
- ✅ Already integrated in both GISMap and MapOblique

**Cons:**
- ❌ Lower resolution than commercial options
- ❌ Less frequent updates
- ❌ "Poor" visual quality compared to Google Maps

### Option 1: Google Maps Platform (NOT RECOMMENDED)

**Pricing (as of March 2025):**
- Requires billing account (credit card)
- Essentials tier: 100,000 tile calls/month free
- After free tier: $7.00 per 1,000 calls
- **NOT compatible with MapLibre** - requires Google Maps JS API

**Verdict:** ❌ Not suitable for MapLibre projects. Google tiles are proprietary and designed only for Google Maps JS API.

### Option 2: MapTiler (RECOMMENDED FOR TESTING)

**Pricing:**
- Free tier: 100,000 tile loads/month
- Better imagery quality than ESRI
- Vector tiles + raster satellite options
- MapLibre-native support

**How to integrate:**
```bash
# 1. Sign up at https://www.maptiler.com/
# 2. Get API key from dashboard
# 3. Update .env.local:
NEXT_PUBLIC_MAPTILER_KEY=your_key_here
NEXT_PUBLIC_MAP_STYLE_URL=https://api.maptiler.com/maps/hybrid/style.json?key={key}
```

### Option 3: Mapbox (BEST QUALITY, PAID)

**Pricing:**
- Free tier: 50,000 tile requests/month
- High-quality satellite imagery
- Frequent updates
- Requires migration from MapLibre to Mapbox GL JS (license changed in 2020)

**Verdict:** ⚠️ Good quality but requires switching libraries and paid tier for production use.

### Option 4: Self-Hosted Tiles (ADVANCED)

**Option:** Download OpenStreetMap data + satellite imagery, serve from own server
**Pros:** Full control, no API limits
**Cons:** Requires significant infrastructure, storage, bandwidth

---

## Geocoding Accuracy Problem

### Why Nominatim Failed for 14105 Chadron Ave

1. **Complex Property:** The address spans multiple streets (Chadron Ave + Lemoli Ave)
2. **New Development:** Built in 2016, 138,504 sq ft mixed-use
3. **OSM Data Quality:** OpenStreetMap may not have accurate building footprint
4. **Address Ambiguity:** Large properties often have imprecise geocoding

### Solutions

#### Option 1: Use Better Geocoding Service (RECOMMENDED)

**Google Geocoding API:**
- More accurate than Nominatim
- Free tier: 40,000 requests/month
- Requires API key + billing account

**Integration:**
```typescript
// Add to src/lib/geocoding.ts
async function geocodeWithGoogle(address: string): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.results?.[0]) {
    const location = data.results[0].geometry.location;
    return {
      latitude: location.lat,
      longitude: location.lng,
      confidence: 0.95,
      source: 'google'
    };
  }
  return null;
}

// Update geocodeLocation() to try Google first, fall back to Nominatim
export async function geocodeLocation(description: string): Promise<GeocodingResult | null> {
  // Try Google first (more accurate)
  if (process.env.GOOGLE_GEOCODING_API_KEY) {
    const googleResult = await geocodeWithGoogle(description);
    if (googleResult) return googleResult;
  }

  // Fall back to Nominatim
  return await geocodeWithNominatim(description);
}
```

#### Option 2: Manual Coordinate Entry + Verification UI

**Add to project creation/edit form:**
```typescript
// Show geocoded coordinates + allow manual override
<div>
  <label>Address:</label>
  <input value={address} onChange={handleAddressChange} />

  <button onClick={handleGeocode}>
    📍 Geocode Address
  </button>

  {geocodedCoords && (
    <div>
      <p>Found: {geocodedCoords.lat}, {geocodedCoords.lng}</p>
      <p>Confidence: {geocodedCoords.confidence * 100}%</p>
      <MapPreview center={geocodedCoords} />

      <button onClick={handleManualAdjust}>
        🎯 Click on Map to Correct
      </button>
    </div>
  )}
</div>
```

#### Option 3: Use Parcel Centroid from GIS Data

**For Pinal County properties:**
- Query parcel geometry from local parcel loader
- Calculate centroid of parcel polygon
- Use as authoritative coordinates

```typescript
// In API route
const parcel = await parcelLoader.getParcelByAddress(address);
if (parcel?.geometry) {
  const centroid = calculateCentroid(parcel.geometry);
  // Store centroid in tbl_project
}
```

---

## Recommendations

### 1. Fix Geocoding Accuracy (CRITICAL)

**Action:** Add Google Geocoding API as primary geocoding source

**Steps:**
1. Sign up for Google Cloud Platform
2. Enable Geocoding API
3. Get API key (restrict to geocoding only)
4. Add to `.env.local`: `GOOGLE_GEOCODING_API_KEY=...`
5. Update `src/lib/geocoding.ts` to use Google first
6. Add manual coordinate adjustment UI to project form

**Cost:** Free for <40,000 requests/month (well within limits for this app)

### 2. Map Imagery Options (MEDIUM PRIORITY)

**For Testing/Development:**
Use MapTiler free tier for better imagery quality

**For Production:**
- Evaluate usage patterns
- If <100k tile loads/month: Use MapTiler free tier
- If >100k: Consider paid tier (~$49/month) or stick with free ESRI

**Configuration:**
```bash
# .env.local
# Option A: Free ESRI (current)
NEXT_PUBLIC_MAP_STYLE_URL=aerial

# Option B: MapTiler (better quality, 100k free/month)
NEXT_PUBLIC_MAPTILER_KEY=your_key_here
NEXT_PUBLIC_MAP_STYLE_URL=https://api.maptiler.com/maps/hybrid/style.json?key=${NEXT_PUBLIC_MAPTILER_KEY}
```

### 3. Component Architecture (LOW PRIORITY)

**Current State:**
- GISMap: Full-featured 2D top-down map with parcel selection
- MapOblique: Lightweight 3D oblique view with markers/extrusions

**Recommendation:** Keep both components for different use cases

| Component | Use Case | Key Feature |
|-----------|----------|-------------|
| **GISMap** | GIS/Planning tab, parcel selection workflow | Interactive parcel selection, land-use visualization |
| **MapOblique** | Project overview, valuation comps | 3D oblique view, building height visualization |

**Why keep both:**
- GISMap is optimized for parcel workflows (selection, boundaries, land use)
- MapOblique is optimized for building visualization (oblique view, height extrusion)
- Different use cases justify different components
- Minimal code duplication (both use ESRI tiles)

**Future Consolidation (optional):**
Add oblique mode to GISMap:
```typescript
// Add to GISMapProps
interface GISMapProps {
  // ... existing props
  viewMode?: '2d' | 'oblique';
  pitch?: number; // For oblique mode
  bearing?: number; // For oblique mode
}

// In createMap():
map.current = new maplibregl.Map({
  // ... existing config
  pitch: props.viewMode === 'oblique' ? (props.pitch || 60) : 0,
  bearing: props.viewMode === 'oblique' ? (props.bearing || 30) : 0
});
```

---

## Implementation Priority

### Phase 1: Fix Geocoding (THIS WEEK)

1. ✅ Sign up for Google Cloud Platform
2. ✅ Enable Geocoding API
3. ✅ Get API key
4. ✅ Add to environment variables
5. ✅ Update `src/lib/geocoding.ts` to use Google first
6. ✅ Re-geocode project 17 (14105 Chadron Ave)
7. ✅ Update database with correct coordinates
8. ✅ Verify map shows correct location

**Expected Result:** Blue pushpin appears at exact property location

### Phase 2: Improve Map Imagery (OPTIONAL)

1. ⏳ Sign up for MapTiler
2. ⏳ Get API key
3. ⏳ Update `.env.local` with MapTiler key + style URL
4. ⏳ Test imagery quality in both GISMap and MapOblique
5. ⏳ Decide: Keep free ESRI or upgrade to MapTiler

### Phase 3: Add Manual Coordinate UI (FUTURE)

1. ⏳ Add coordinate preview to project form
2. ⏳ Add "Click to adjust" map widget
3. ⏳ Show geocoding confidence score
4. ⏳ Allow manual lat/lng override

---

## Quick Fix for Project 17

**Immediate Action:** Get correct coordinates using Google Maps directly

```bash
# 1. Open Google Maps: https://www.google.com/maps
# 2. Search for: "14105 Chadron Avenue, Hawthorne, CA 90250"
# 3. Right-click on the exact building location
# 4. Select "What's here?"
# 5. Copy the coordinates from the bottom panel
# 6. Update database:

psql $DATABASE_URL -c "UPDATE landscape.tbl_project
SET location_lat = <LAT_FROM_GOOGLE>,
    location_lon = <LNG_FROM_GOOGLE>
WHERE project_id = 17;"
```

**Manual Lookup Result (from Google Maps):**
- Address: 14105 Chadron Avenue, Hawthorne, CA 90250
- Google Maps coordinates: **33.9031, -118.3287** (need to verify with right-click)
- APN: 4052-022-015

---

## Cost Analysis

### Option 1: Current Setup (FREE)
- ESRI World Imagery: Free
- Nominatim Geocoding: Free
- Total: **$0/month**
- Issue: Poor geocoding accuracy, mediocre imagery

### Option 2: Google Geocoding + ESRI Imagery (RECOMMENDED)
- ESRI World Imagery: Free
- Google Geocoding API: Free (<40k requests/month)
- Total: **$0/month**
- Benefit: Accurate geocoding, same imagery

### Option 3: Google Geocoding + MapTiler Imagery
- MapTiler tiles: Free (<100k loads/month)
- Google Geocoding API: Free (<40k requests/month)
- Total: **$0/month** (within free tiers)
- Benefit: Accurate geocoding + better imagery

### Option 4: Full Google Stack (NOT RECOMMENDED)
- Google Maps JavaScript API: $7 per 1,000 map loads
- Google Geocoding API: Free (<40k requests/month)
- Estimated usage: ~10k map loads/month = **$70/month**
- Issue: Incompatible with MapLibre, requires rewrite

---

## Conclusion

**Primary Issue:** Geocoding accuracy, not map infrastructure

**Recommended Solution:**
1. Add Google Geocoding API to existing `lib/geocoding.ts` service
2. Keep current ESRI imagery (or optionally upgrade to MapTiler)
3. Keep both GISMap (for parcel workflows) and MapOblique (for 3D views)
4. Add manual coordinate adjustment UI in future phase

**Estimated Cost:** $0/month (within all free tiers)

**Expected Improvement:**
- ✅ Accurate coordinates for all projects
- ✅ Better imagery quality (if using MapTiler)
- ✅ No breaking changes to existing code
- ✅ Fully functional within free tier limits

---

## Next Steps

1. User decision: Proceed with Google Geocoding API integration?
2. User decision: Upgrade to MapTiler for better imagery?
3. If approved: Implement Phase 1 (geocoding fix) immediately
4. Re-test project 17 map location
5. Document manual coordinate adjustment workflow

**Questions for User:**
- Do you have a Google Cloud Platform account?
- Are you comfortable enabling billing (even though usage will be free tier)?
- Do you want to try MapTiler for better satellite imagery?
- Should we add a manual coordinate adjustment UI to the project form?
