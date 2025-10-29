# MapLibre Coordinate Fixes and Property Tab Updates

**Date:** 2025-10-29
**Session:** Continuation from previous MapLibre implementation
**Status:** Complete - Basic functionality achieved, further development needed

## Session Overview

Fixed critical coordinate issues with comparable sales map and improved Property tab layout. The mapping system now displays comparables at their actual locations but still requires significant work on zoom functionality and styling.

## Issues Resolved

### 1. Comp Coordinates Showing in Wrong Locations
**Problem:** Comparables appeared "around the corner" from subject when they should be 6-11 miles away.

**Root Cause:** API route was generating mock coordinates by scattering comps in a 1km circle around subject instead of using actual database coordinates.

**Fix:** 
- Updated `/src/app/api/projects/[projectId]/valuation/comps/map/route.ts`
- Added `latitude` and `longitude` columns to SQL query
- Used actual coordinates from `landscape.tbl_sales_comparables` table
- Comps now render at correct locations:
  - Reveal Playa Vista: (33.9783, -118.4184) - 6.5 miles west
  - Cobalt: (34.0266, -118.3903) - 9 miles northwest
  - Atlas: (33.9714, -118.3081) - 5 miles northeast

### 2. Property Tab Layout Improvements
**File:** `/src/app/projects/[projectId]/components/tabs/PropertyTab.tsx`

**Changes:**
- **Header:** Condensed to single line "Unit Mix: 5 Plans, 142 Units"
- **Columns optimized:**
  - Bed: 60px width
  - Bath: 60px width
  - SF: 80px width
  - Units: 60px width
- **Removed:** Market Rent column
- **Layout:** Changed to 2-column grid with map on right side

### 3. Map Default View Settings
**File:** `/src/components/map/MapOblique.tsx`

**Updated defaults:**
- Zoom: 14 (was 17) - Higher altitude view (~4000m)
- Pitch: 30° (was 60°) - Less tilted
- Bearing: 0° (was 30°) - North-up orientation

**Marker styling:**
- Subject: White circle with red outline
- Comps: Colored pushpins (green=selected, amber=unselected)

### 4. Save View Button
**File:** `/src/components/map/ProjectTabMap.tsx`

**Fix:** Added `preventDefault()` and `stopPropagation()` to prevent unintended zoom changes when saving view.

## Partial Fixes / Known Issues

### FitBounds Reliability
**File:** `/src/components/map/ValuationSalesCompMap.tsx`

**Attempted fix:**
- Increased timeout from 100ms to 500ms
- Increased padding from 80px to 100px

**Status:** Still unreliable - auto-zoom doesn't consistently show all comparables

**User Impact:** Users may need to manually zoom out to see all properties

## Technical Details

### Database Schema
```sql
-- Subject property
SELECT location_lat, location_lon 
FROM landscape.tbl_project 
WHERE project_id = 17;
-- Result: (33.903116, -118.328751)

-- Comparables
SELECT comparable_id, property_name, latitude, longitude
FROM landscape.tbl_sales_comparables
WHERE project_id = 17;
-- Results: 3 comps with actual coordinates
```

### API Response Structure
```typescript
{
  center: [longitude, latitude],
  subject: FeatureCollection<Polygon>,
  comps: {
    features: [{
      geometry: {
        type: 'Polygon',
        coordinates: [[[lng, lat], ...]]
      },
      properties: {
        name, price, date, latitude, longitude
      }
    }]
  }
}
```

## Files Modified

1. `/src/app/api/projects/[projectId]/valuation/comps/map/route.ts` - Fixed coordinate query
2. `/src/app/projects/[projectId]/components/tabs/PropertyTab.tsx` - Layout improvements
3. `/src/components/map/MapOblique.tsx` - Default settings and marker styles
4. `/src/components/map/ProjectTabMap.tsx` - Save view button fix
5. `/src/components/map/ValuationSalesCompMap.tsx` - FitBounds adjustments

## Testing Results

### Working
✅ Comparables render at correct addresses
✅ Subject marker styled correctly (white circle, red outline)
✅ Comp markers color-coded (green/amber)
✅ Popups show property details
✅ Unit Mix table condensed and optimized
✅ Map added to Property tab

### Not Working
❌ Auto-fit bounds unreliable
❌ Save view may cause zoom changes in edge cases

## Critical Issues Documented

### ⚠️ MAPPING ENGINE REQUIRES SIGNIFICANT WORK

**High Priority Issues:**
1. FitBounds doesn't consistently zoom to show all properties
2. Styling is basic (generic markers, no theme integration)
3. No marker clustering for many properties
4. Using first polygon vertex instead of centroid for marker placement

**Recommendations:**
1. Allocate dedicated sprint for map improvements
2. Consider specialized mapping vendor (MapTiler Cloud, Google Maps Platform)
3. Document limitations for stakeholders
4. Evaluate budget for commercial mapping APIs

## Next Steps

### Immediate
- [x] Document mapping limitations
- [x] Update status in all project docs
- [x] Commit changes to git

### Short-term
- [ ] Fix fitBounds reliability with proper map load detection
- [ ] Calculate polygon centroids for accurate marker placement
- [ ] Improve marker styling to match design system
- [ ] Add marker clustering

### Long-term
- [ ] Evaluate MapTiler Cloud vs Google Maps Platform
- [ ] Implement distance/area measurement tools
- [ ] Add map style selector (aerial/street/hybrid)
- [ ] Theme popups to match CoreUI design system

## Git Commit

Changes pushed to `work` branch with message:
```
feat: fix comp map coordinates and improve property tab layout

- Use actual lat/lon from database instead of mock scatter coordinates
- Comparables now render at correct locations (6-11 miles from subject)
- Condense Unit Mix header to single line
- Optimize column widths and remove Market Rent column
- Add map to Property tab in 2-column layout
- Update map defaults: zoom 14, pitch 30°, bearing 0°
- Fix save view button to prevent zoom changes
- Adjust fitBounds timing (still needs work)

CRITICAL NOTE: Mapping engine requires significant additional development
for production-quality functionality and styling. Auto-zoom is unreliable
and styling is basic. See maplibre-oblique-implementation-summary.md for
detailed status and recommendations.
```

## Session Duration

**Total Time:** ~45 minutes
**Lines Changed:** ~100 lines across 5 files
**Complexity:** Medium (data flow investigation, multiple file updates)

---

**Session Complete:** 2025-10-29
**Next Session:** Map functionality and styling improvements (TBD)
