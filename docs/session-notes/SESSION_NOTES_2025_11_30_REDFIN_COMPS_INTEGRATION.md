# Redfin Housing Comparables Integration

**Date**: November 30, 2025
**Duration**: ~2 hours
**Focus**: Replace defunct Zillow API with Redfin's public Stingray API for housing price comparables

---

## Summary

Integrated Redfin's public CSV endpoint as the data source for single-family housing comparables on the Market Analysis page. Added map visualization with price-tier color coding, interactive controls, and matching card-based UI styling.

## Major Accomplishments

### 1. Redfin API Client ✅
- Created `src/lib/redfinClient.ts` - Full client for Redfin's Stingray CSV endpoint
- Implements polygon-based geographic search using bounding box
- Haversine formula for distance calculations
- CSV parsing with proper quoted field handling
- Configurable via environment variables (REDFIN_BASE_URL, REDFIN_TIMEOUT_MS, etc.)

### 2. SF Comps API Route ✅
- Created `/api/projects/[projectId]/sf-comps/route.ts`
- Fetches project location, queries Redfin, normalizes data
- Default filters: 3mi radius, 180 days, homes built within last 2 years
- Calculates statistics: median price, median $/SF, 25th/75th percentile, price range

### 3. React Query Hook ✅
- Created `src/hooks/analysis/useSfComps.ts`
- Type-safe hook with proper caching (2min stale, 5min GC)
- Cache-busting with `cache: 'no-store'` for fresh data

### 4. Map Visualization ✅
- Updated `src/app/components/Market/MarketMapView.tsx`
- Added Redfin comps as colored circle markers
- Price-tier color coding: green (below 25th), yellow (25-75th), red (above 75th)
- Layer toggle controls for Competitive Projects and Recent Sales
- Dynamic legend that updates based on visible layers
- Rich popup with property details on marker click

### 5. SfCompsTile Component ✅
- Created/updated `src/components/analysis/SfCompsTile.tsx`
- Card-based UI matching other tiles (shaded header)
- Fixed-layout table with truncating address column
- Radius and Days input controls with blur/Enter commit
- External link to Redfin property page

### 6. Layout Updates ✅
- Market page now shows 50/50 split: Map (left) and Housing Comps (right)
- Competitive Projects and Macro Data in bottom row

## Files Modified

### New Files Created:
- `src/lib/redfinClient.ts` - Redfin API client (403 lines)
- `src/app/api/projects/[projectId]/sf-comps/route.ts` - API route (297 lines)
- `src/hooks/analysis/useSfComps.ts` - React Query hook (93 lines)
- `src/components/analysis/SfCompsTile.tsx` - Tile component (293 lines)

### Files Modified:
- `src/app/components/Market/MarketMapView.tsx` - Added comps visualization
- `src/app/projects/[projectId]/planning/market/page.tsx` - Layout changes
- `archive/docs/.env.local.template` - Added Redfin config documentation

## Technical Details

### Redfin CSV Columns Used:
| Index | Field | Notes |
|-------|-------|-------|
| 0 | SALE TYPE | Filter for "PAST SALE" only |
| 1 | SOLD DATE | Format: "Month-DD-YYYY" |
| 3 | ADDRESS | |
| 4-6 | CITY, STATE, ZIP | |
| 7 | PRICE | |
| 8-9 | BEDS, BATHS | |
| 11 | SQUARE FEET | |
| 12 | LOT SIZE | In SF |
| 13 | YEAR BUILT | |
| 20 | URL | Link to Redfin listing |
| 22 | MLS# | Used as unique ID |
| 25-26 | LATITUDE, LONGITUDE | |

### Default Configuration:
- Base URL: `https://www.redfin.com/stingray`
- Timeout: 15000ms
- Max Results: 350
- Sold Within: 180 days
- Min Year Built: Current year - 2 (new construction focus)

### Caching Strategy:
- React Query staleTime: 2 minutes
- React Query gcTime: 5 minutes
- Fetch cache: 'no-store' (bypass browser cache)
- API response: 'Cache-Control: no-store, max-age=0'

## Known Limitations

1. **No Builder Field** - Redfin's public CSV doesn't include builder/developer information
2. **Rate Limiting** - Redfin may return HTML instead of CSV if rate limited (graceful degradation to empty array)
3. **Geographic Coverage** - Depends on Redfin market coverage

## Next Steps

- Consider adding builder data from alternative source (ATTOM, CoreLogic)
- Add comp selection/favoriting functionality
- Export comps to Excel

## Git Activity

### Commit Information:
- Branch: work
- Files staged: Multiple component and API files
- Documentation: This session note

---

## Testing Completed

- [x] Comps load for project with valid lat/lng
- [x] Map markers appear with correct price-tier colors
- [x] Popup shows full property details
- [x] Radius/days filters trigger new API calls
- [x] Layer toggles hide/show markers correctly
- [x] Table displays correctly without horizontal scroll
- [x] External links open Redfin in new tab
