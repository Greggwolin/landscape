# Fix Map Tab Popups + Competitive Projects Display

---

## ⚠️ BEFORE YOU START
Read this entire prompt thoroughly, then ask any clarifying questions before writing code.

⚠️ DO NOT process, import, or write any data to the database during verification steps. Verification is read-only.

If anything is unclear about:
- The popup HTML generation flow (MapTab builds data → MapCanvas renders popups)
- How the LayerPanel filters layers by count
- Whether Neon returns numeric columns as strings for competitive project lat/lon
...ask first. Do not assume.

---

## OBJECTIVE

Verify and test two fixes applied by Cowork:

1. **Popup formatting** — Replaced inline hardcoded color styles (`color:#f8fafc`, etc.) with the existing `buildPopoverHtml` + `buildPopoverRows` pattern that uses proper CSS classes (`map-tab-popover-header`, `map-tab-popover-row`, etc.). Popups now use CoreUI CSS variables for consistent dark-mode theming.

2. **Competitive projects not showing** — Two root causes fixed:
   - **Numeric coercion:** Neon may return `latitude`/`longitude` as strings. `Number.isFinite('33.448')` returns `false`, filtering out all competitors. Fixed with explicit `Number()` coercion before the `isFinite` check.
   - **Missing count updates:** The market layer group wasn't updating `count` on layers, which prevented the LayerPanel from knowing items existed. Added count updates in the layer count useEffect.

---

## CONTEXT

**Files modified by Cowork:**
- `src/components/map-tab/MapTab.tsx` — Replaced `popup_html` inline styles with `popover_title` + `popover_rows` (JSON) pattern; added `Number()` coercion for competitor lat/lon; added market layer count updates + dependency array
- `src/components/map-tab/MapCanvas.tsx` — Updated Recent Sales and Competitive Projects useEffect blocks to parse `popover_title`/`popover_rows` and use `buildPopoverHtml()`

---

## DOWNSTREAM IMPACT

**Files modified:**
- `src/components/map-tab/MapTab.tsx` — popup data generation + layer counts
- `src/components/map-tab/MapCanvas.tsx` — popup rendering

**Known consumers:**
- `LayerPanel` — reads count to show/hide layers
- `MapCanvas` — reads layer visibility + feature data to render markers

**Post-change verification:**
1. Map tab loads without console errors
2. "Market" group shows in LayerPanel with counts (e.g., "Recent Sales (175)", "Competitive Projects (13)")
3. Toggling "Recent Sales" shows colored dots with properly formatted popups
4. Toggling "Competitive Projects" shows pin markers with properly formatted popups
5. Popup uses dark theme CSS variables (not hardcoded light-on-dark colors)

---

## VERIFICATION STEPS

```bash
# 1. Build
npm run build

# 2. Lint the changed files
npx eslint src/components/map-tab/MapTab.tsx src/components/map-tab/MapCanvas.tsx

# 3. Restart servers
bash restart.sh
```

Then manually test:
1. Navigate to project 9 (Peoria Meadows) → Location tab → Map
2. Check LayerPanel — "Market" group should appear with "Recent Sales" and "Competitive Projects" checkboxes
3. Toggle "Competitive Projects" → pin markers should appear on map
4. Click a marker → popup should use standard popover styling (header/row format, not inline colors)
5. Toggle "Recent Sales" → colored circle markers should appear
6. Click a sale marker → verify popup formatting matches other popovers (Sale Comps, Rent Comps)

---

## SUCCESS CRITERIA

All must pass:
1. [ ] `npm run build` passes
2. [ ] No lint errors in changed files
3. [ ] Market layer group visible in LayerPanel with counts
4. [ ] Competitive project markers render on map when toggled
5. [ ] Recent sales markers render on map when toggled
6. [ ] Popup formatting matches existing popover pattern (CSS classes, not inline styles)

---

## SERVER RESTART
After completing this task, restart the servers:
```bash
bash restart.sh
```
This restarts both the Next.js app and Django backend.
