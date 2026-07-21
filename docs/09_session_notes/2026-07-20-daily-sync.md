# Daily Sync — 2026-07-20

**Date**: Sunday, July 20, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Technical Debt Addressed
- **Massive dead-code cleanup (RF97, #185):** Removed ~83 verified-dead component files across 11 surface families — operations, DMS, budget, landscaper, guide, reports, valuation/NNN, theme, layout, and more. **-18,682 lines** deleted. Includes `.tsx.bak` shadow copies. Largest single cleanup in project history.

### Bugs Fixed
- **CORS header fix (`11c3da9a`):** Added `X-Landscape-Stream` to `CORS_ALLOW_HEADERS` in Django settings so chat message POST requests work correctly with the streaming response pipeline.
- **Table column clipping (`4656245f`):** Fixed right-edge column clipping on Floor Plan Matrix (PropertyTab) and Budget grid (BudgetDataGrid.css). Added overflow handling and padding adjustments.
- **Left-rail hover bubbles (`3e4a025d`, #186):** Sidebar hover tooltip bubbles now dismiss on click (not just mouse-leave), preventing stale tooltips from lingering after navigation.
- **Studio sidebar auto-collapse (`c3bb59cf`):** Disabled auto-collapse-on-select behavior in the Studio left rail — sidebar now stays expanded when the user clicks a nav item.

### Documentation
- Prior night's health check committed (`ea45fcbf`) — caught up session notes for 2026-07-17, 2026-07-18, 2026-07-19.

## Files Modified

| Commit | Files | +/- |
|--------|-------|-----|
| `430b82b9` (RF97 cleanup) | 88 files | -18,682 |
| `c3bb59cf` (studio sidebar) | 1 file | +5/-7 |
| `3e4a025d` (hover bubbles) | 2 files | +38/-7 |
| `4656245f` (table clipping) | 2 files | +19/-3 |
| `11c3da9a` (CORS header) | 1 file | +12 |

## Git Commits (today, newest first)

```
11c3da9a fix(cors): allow X-Landscape-Stream header so chat messages POST works
4656245f fix(tables): stop right-edge column clipping on Floor Plan Matrix and Budget grid
3e4a025d fix(nav): dismiss left-rail hover bubbles on click, not just mouse-leave (#186)
c3bb59cf fix(studio): disable auto-collapse-on-select in left rail
430b82b9 chore(cleanup): remove ~83 verified-dead component files across 11 surface families (RF97) (#185)
ea45fcbf docs: nightly health check 2026-07-20
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline remains the last alpha blocker (OCRmyPDF identified, seam exists but flag-gated).
- [ ] `tbl_opex_accounts` phantom table discovery (CU7 candidate) — still 500s property-summary.pdf / cash-flow.pdf independently of the CRE join fix.

## Alpha Readiness Impact

No alpha blocker movement today. Work was focused on polish (UX bugs, dead-code removal) rather than blocker resolution. The RF97 cleanup reduces build surface area substantially, which helps build reliability indirectly.

## Notes for Next Session

- The RF97 cleanup (-18.7k lines) is the largest single dead-code removal to date. If any component suddenly goes missing, check `430b82b9` first.
- CORS fix (`X-Landscape-Stream`) was needed for the streaming chat pipeline shipped yesterday (#184). Without it, chat POST requests fail on deployed environments with strict CORS.
- The prior 3-day sprint (Jul 18–19) shipped major features: heartbeat streaming (#175/#177), server-side OS artifact render (#183), live progress events (#184), loan tool full-form coverage (#182), and the `/w/` chat surface restoration (#181). Today's commits are cleanup/polish on top of that burst.
