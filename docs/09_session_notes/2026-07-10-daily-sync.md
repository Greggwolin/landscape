# Daily Sync — 2026-07-10

**Date**: Thursday, July 10, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added
- **Per-icon submenu flyouts in collapsed left-nav** (#152) — When the left sidebar is collapsed to the narrow icon rail, hovering an icon now shows a flyout submenu with that section's child items. Implemented in `WrapperSidebar.tsx` with new CSS in `wrapper.css`. Removes 7 lines from `StudioSidebar.tsx` (logic consolidated into the wrapper). +94 / -8 across 3 files.

### Bugs Fixed
- **Collapsed-rail submenu flyout hover gap** (#153) — Fixed the flyout disappearing when the mouse crossed the gap between the sidebar icon and the flyout menu. Added bridge-gap hover zone in `WrapperSidebar.tsx` and simplified CSS. +46 / -16 across 2 files.
- **Projects icon flyout lists recent projects** (#154) — Projects icon in collapsed sidebar now shows a flyout listing recent projects; clicking the icon opens the full projects list. +52 / -2 in `WrapperSidebar.tsx`.

## Files Modified

| File | Net Change |
|------|-----------|
| `src/components/studio/StudioSidebar.tsx` | -5 lines (logic moved to wrapper) |
| `src/components/wrapper/WrapperSidebar.tsx` | +119 lines (flyout system + project list) |
| `src/styles/wrapper.css` | +60 lines (flyout styling) |

**Total: +176 / -10 across 3 files**

## Git Commits

```
c8534b56 fix(nav): Projects icon flyout lists recent projects; opens list on click (#154)
edf23bec fix(studio): keep collapsed-rail submenu flyout open across the icon→menu gap (#153)
2a9887d2 feat(studio): per-icon submenu flyouts in collapsed left-nav (#152)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No alpha blocker movement today. All work was navigation UX polish — collapsed sidebar flyout menus for the studio shell. The studio shell was already promoted to the primary project surface; today's changes improve discoverability when the sidebar is collapsed but don't shift any blocker status.

## Notes for Next Session

- The collapsed sidebar flyout system is now functional across all nav sections. Test with different project types to confirm folder config variations render correctly in the flyouts.
- Three PRs merged today (#152–#154) all touch `WrapperSidebar.tsx` — if any merge conflicts arise on open branches, this file is the likely culprit.
- Yesterday's map UI batch (#146–#151) and today's nav batch (#152–#154) are both on `main` — 9 commits in 2 days, all UI/UX polish. No backend or schema changes.
