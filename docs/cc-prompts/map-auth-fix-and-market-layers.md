# Fix Map Tab Auth Errors + Wire Market Layer Data

---

## ⚠️ BEFORE YOU START
Read this entire prompt thoroughly, then ask any clarifying questions before writing code.

⚠️ DO NOT process, import, or write any data to the database during verification steps. Verification is read-only.

If anything is unclear about:
- How the Map tab's layer visibility state flows to MapCanvas rendering
- How `useSfComps` and competitor data are fetched on the Property > Market tab
- Whether any other Django views in `location_intelligence/views.py` are also missing `@permission_classes`
- How the new "Recent Sales" / "Competitive Projects" toggles should render their data on the Leaflet/MapLibre canvas
...ask first. Do not assume.

---

## OBJECTIVE

Fix 3 issues on the Map tab (Location > Map):

1. **Demographics ring click → 401 auth error** — DONE (Cowork applied fix). Verify the `@permission_classes([AllowAny])` decorators were added to `get_demographics`, `get_project_demographics`, and `cache_project_demographics` in `backend/apps/location_intelligence/views.py`.

2. **Intermittent 401 errors from `useMapFeatures`** — DONE (Cowork applied fix). The hook now degrades gracefully on 401/403 instead of throwing. Verify.

3. **Map tab missing "Recent Sales" and "Competitive Projects" layer checkboxes** — Cowork added the layer group to `constants.ts` and the `'market'` LayerGroupId to `types.ts`. **You need to wire the actual data rendering** — when these layers are toggled on, fetch SFD comps (Redfin) and competitive project markers and render them on the map canvas.

---

## CONTEXT

**Auth root cause:** The `get_demographics` and `get_project_demographics` Django views had no explicit `@permission_classes`, so they inherited the global `IsAuthenticated` default. When JWT tokens expire (1-hour lifetime), the frontend hooks' fallback of retrying without auth also failed. Making them `AllowAny` is correct — they serve public Census data.

**Map features (useMapFeatures.ts):** This endpoint legitimately requires auth (`@permission_classes([IsAuthenticated])`). The fix is graceful degradation — show empty features instead of throwing on 401.

**Market layers:** The Property > Market tab already has this data wired via `useSfComps` hook and competitor fetching in `MarketMapView.tsx`. The Map tab needs to reuse these data sources when the "Recent Sales" and "Competitive Projects" checkboxes are toggled on.

**Key files already modified by Cowork:**
- `backend/apps/location_intelligence/views.py` — added `@permission_classes([AllowAny])` to 3 demographics views
- `src/components/map-tab/hooks/useMapFeatures.ts` — added 401/403 graceful degradation
- `src/components/map-tab/constants.ts` — added `market` layer group with `recent-sales` and `competitive-projects` layers
- `src/components/map-tab/types.ts` — added `'market'` to `LayerGroupId` union

---

## DOWNSTREAM IMPACT

**Files being modified:**
- `backend/apps/location_intelligence/views.py` — demographics permission change
- `src/components/map-tab/hooks/useMapFeatures.ts` — error handling change
- `src/components/map-tab/constants.ts` — new layer definitions
- `src/components/map-tab/types.ts` — type union extension

**Known consumers:**
- `src/components/map-tab/MapTab.tsx` — reads layer state, renders MapCanvas
- `src/components/map-tab/MapCanvas.tsx` — renders layers on the actual map
- `src/components/map-tab/LayerPanel.tsx` — renders checkboxes from layer groups
- `src/components/location-intelligence/hooks/useDemographics.ts` — calls demographics endpoints
- Any Landscaper tools that call demographics endpoints

**Post-change verification:**
1. Demographics ring click works without 401
2. Map features load silently (no console errors on 401)
3. New "Market" layer group appears in LayerPanel with 2 checkboxes
4. `npm run build` passes with no type errors

---

## IMPLEMENTATION STEPS

### Step 1: Verify Cowork's Changes

```bash
# Check demographics views have AllowAny
grep -n "permission_classes\|def get_demographics\|def get_project_demographics\|def cache_project_demographics" backend/apps/location_intelligence/views.py

# Check useMapFeatures graceful degradation
grep -n "401\|403\|degrade" src/components/map-tab/hooks/useMapFeatures.ts

# Check new market layer group
grep -n "market\|recent-sales\|competitive-projects" src/components/map-tab/constants.ts

# Check type
grep -n "market" src/components/map-tab/types.ts
```

### Step 2: Wire Market Layer Data to MapTab

The `MapTab.tsx` orchestrator needs to:
1. Import and call `useSfComps` (or equivalent) when the `recent-sales` layer is visible
2. Fetch competitor data when the `competitive-projects` layer is visible
3. Pass the data down to `MapCanvas` as GeoJSON FeatureCollections
4. Render markers with the same color-coding as the Property > Market tab (green/yellow/red price tiers for sales, red dots for competitors)

Reference the existing implementation in `src/app/components/Market/MarketMapView.tsx` (lines 76-77 for state, lines 521-542 for checkboxes, lines 555-578 for legend).

### Step 3: Build & Test

```bash
npm run build
npm run lint
```

---

## SUCCESS CRITERIA

All must pass:
1. [ ] Demographics ring click returns data (no 401 error)
2. [ ] No console errors from `useMapFeatures` on 401 (graceful degradation)
3. [ ] "Market" layer group appears in Map tab's LayerPanel
4. [ ] Toggling "Recent Sales" shows Redfin comp markers on map
5. [ ] Toggling "Competitive Projects" shows competitor markers on map
6. [ ] `npm run build` passes with no type errors
7. [ ] `npm run lint` passes

---

## SERVER RESTART

After completing this task, restart the servers:
```bash
bash restart.sh
```
This restarts both the Next.js app and Django backend.
