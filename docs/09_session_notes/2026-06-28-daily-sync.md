# Daily Sync — 2026-06-28

**Date**: Sunday, June 28, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### No commits today (weekend)

No new commits landed on June 27 or 28. Last commit was `f3f820ba` on June 26 (inline-vs-card presentation rule).

## Uncommitted Changes (carried from June 26)

Four files remain modified in the working tree — all part of the **pop-out overlay / currency format** work:

| File | Change | Status |
|------|--------|--------|
| `src/components/studio/StudioShell.tsx` | Pop-out overlay (right-panel reflow Phase 1): `expanded` state promotes the routed screen to a full-window overlay for wide-viewport screens (grids, rent roll). Esc or header button collapses. Extracts `screenRouter` JSX to a single `ProjectContentRouter` instance shared between normal and expanded render paths. | Staged |
| `src/components/wrapper/ArtifactRenderer.tsx` | `KeyValuePairRenderer` now passes `pair.format` to `formatCellValue` — opt-in `$` prefix for currency-tagged pairs (renovation-budget cards). Default stays $-less per the operating-statement standard. | Unstaged |
| `src/types/artifact.ts` | New optional `format` field on `KeyValuePair` interface (`'currency' | 'currency2' | 'number' | 'date' | 'percent'`). | Unstaged |
| `src/styles/studio.css` | `.studio-screen-overlay` styles — fixed position, full inset, z-index 90, flex column layout. `.studio-screen-overlay .wrapper-right-panel` fills available height. | Staged |

### Untracked files

| File | Note |
|------|------|
| `docs/09_session_notes/2026-06-26-daily-sync.md` | Previous session note (not yet committed) |
| `docs/cc-prompts/gis-mvp-architecture-handoff.md` | GIS architecture handoff prompt |

## Git Commits (Last 3 Days)

```
f3f820ba fix(landscaper): inline-vs-card presentation rule (Jun 26)
966f8e9d docs(claude): sync CLAUDE.md — studio = primary surface, tool count 288 (Jun 26)
09f33ccc feat(landscaper): get_renovation_breakdown — real per-unit-type renovation card (#139) (Jun 26)
986271e9 Revert "fix(studio): route per-slice renovation asks to the Renovation page (#137)" (#138) (Jun 26)
37e1e9fa fix(studio): route per-slice renovation asks to the Renovation page (#137) (Jun 26)
6eb38ed2 fix(landscaper): figure-level provenance in fabrication guard (#136) (Jun 26)
```

## Active To-Do / Carry-Forward

- [ ] **Commit pop-out overlay + currency format changes** — 4 uncommitted files from June 26 ready for review
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — existing clones (projects 125, 126) predate MF units/leases/cost approach fix
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e) — verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll
- [ ] Phase 5 (Python waterfall replication) for Excel audit — only remaining major audit pipeline piece
- [ ] Scanned PDF / OCR pipeline — OCR seam exists (flag-gated `ENABLE_OCR`), binaries not provisioned
- [ ] GIS MVP architecture handoff (`docs/cc-prompts/gis-mvp-architecture-handoff.md`) — untracked, needs review

## Alpha Readiness Impact

No movement. Weekend pause. The fabrication guard three-layer system (prompt rules, reply-assembly figure-level provenance, artifact creation guard) shipped fully on June 26. Next alpha-relevant work is likely the pop-out overlay commit (improves usability of wide grids in the studio shell) and continued tool buildout.

## Notes for Next Session

- The pop-out overlay is the immediate commit candidate — review `StudioShell.tsx` staged diff (88 lines) and the companion CSS. The `ArtifactRenderer` + `artifact.ts` changes are smaller (11 lines combined) and could be a separate commit or bundled.
- Landscaper tool count stands at **288 registered** (verified June 26). The renovation fabrication arc is closed.
- The `gis-mvp-architecture-handoff.md` prompt file is untracked — decide whether to commit to repo or keep as a working doc.
