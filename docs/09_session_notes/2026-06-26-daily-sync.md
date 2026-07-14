# Daily Sync — 2026-06-26

**Date**: Thursday, June 26, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features
- **Financial artifact creation guard** (`d28d358c`): New `financial_artifact_guard.py` hard-prevents fabricated financial cards at `create_artifact` time. Rejects artifacts that state money/percent/multiple figures when no numbers-producing tool ran during the turn. Companion to the existing reply-assembly guard (JB50 slice 2) — now fabrication is blocked at both the response path and the persistence path. Includes 113-line test suite.
- Wired guard into `artifact_services.py`, `tool_executor.py`, `artifact_tools.py`, and `views.py` (+265 lines total).

### Bug Fixes / Prompt Hardening
- **Anti-fabrication prompt rules refined** (`c2f7e863`): Three-way prompt split — whole-screen asks open the live screen via `navigate_to_screen`; custom financial cards use only tool-returned unit types/figures; requests for per-slice data where no tool exists get a refuse+navigate response instead of fabrication. +12 lines to `ai_handler.py`.

### Documentation
- None generated today (prior session's `1bd44e9d` batch-committed session notes for 06-18 through 06-24).

## Files Modified

```
backend/apps/artifacts/financial_artifact_guard.py        | 101 +++  (NEW)
backend/apps/artifacts/services.py                        |  26 +++
backend/apps/artifacts/tests/test_financial_artifact_guard.py | 113 +++ (NEW)
backend/apps/landscaper/ai_handler.py                     |  24 ++-
backend/apps/landscaper/tool_executor.py                  |   9 ++
backend/apps/landscaper/tools/artifact_tools.py           |   3 +
backend/apps/landscaper/views.py                          |  11 +-
```

## Git Commits

```
d28d358c feat(artifacts): hard-prevent fabricated financial cards at create time (Option A) (15h ago)
c2f7e863 fix(landscaper): anti-fabrication prompt rules — whole-screen asks open the screen; custom cards use only tool-returned unit types; refuse+navigate when no per-slice tool [JB56-PROMPT-SPLIT-0625] (15h ago)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Phase 5 (Python waterfall replication) for Excel audit — the only remaining major piece of the audit pipeline.
- [ ] Scanned PDF / OCR pipeline — OCR seam exists (flag-gated `ENABLE_OCR`), binaries not yet provisioned.

## Alpha Readiness Impact

No alpha blocker movement today. Work focused on hardening the no-fabrication guard system — a quality/trust concern rather than a feature blocker. The financial artifact guard adds a second net (create-time) alongside the existing reply-assembly guard, reducing the risk of Landscaper presenting invented financial figures.

## Notes for Next Session

- The fabrication guard is now two-layer: (1) reply-assembly guard in `ai_handler.py` catches fabricated text in the response, (2) artifact creation guard in `financial_artifact_guard.py` blocks fabricated cards from persisting. Both share detection regexes (lazy import from ai_handler to avoid drift).
- Studio shell is now the primary project shell (`/studio/[projectId]`), funneling `/w/` project routes into it as of commit `741fb7fc` (June 25). The left rail uses `createFolderConfig` for folder/sub-tab navigation.
- The prompt split in `c2f7e863` establishes a clear three-way routing policy for financial data requests: whole-screen → navigate; card with tool data → render; no tool available → refuse+navigate. Future Landscaper tool additions should follow this pattern.

---

## Nightly Sync (appended 2026-06-26 ~23:30 MST)

### Additional commits landed after the initial sync

| Hash | Summary |
|------|---------|
| `6eb38ed2` | **Figure-level provenance in fabrication guard** (#136) — reply-assembly guard now takes the turn's tool outputs; every $/% /x figure must trace to a returned number. Closes the "ran one real tool then invented the rest" pattern. +202 lines (141 ai_handler + 74 test). |
| `37e1e9fa` | Route per-slice renovation asks to the Renovation page (#137) — client-side `screenIntent.ts` + test. |
| `986271e9` | Revert #137 (#138) — approach replaced by the server-side `get_renovation_breakdown` tool. |
| `09f33ccc` | **`get_renovation_breakdown` tool** (#139) — real per-unit-type renovation numbers tied exactly to the Renovation page (`cost_per_unit = reno_cost_per_sf × gross_sf / unit_count`). MF_ONLY, numbers-producing. +317 lines (205 tool + 75 test + schema + registry). |
| `966f8e9d` | CLAUDE.md sync — studio = primary surface, tool count 288, renovation fabrication arc (#140). |
| `f3f820ba` | **Inline-vs-card presentation rule** — size-gate (≤5 lines inline + offer card), right-justified financial tables, never inline AND card; renovation slice gated. +22 lines to `ai_handler.py`. |

### Uncommitted changes (working tree)

| File | Change |
|------|--------|
| `src/components/studio/StudioShell.tsx` | Pop-out overlay (right-panel reflow Phase 1) — `expanded` state promotes the routed screen to a full-window overlay for wide-viewport screens (grids, side-by-side panels). Esc or header button collapses. |
| `src/components/wrapper/ArtifactRenderer.tsx` | `KeyValuePairRenderer` now passes `pair.format` to `formatCellValue` — opt-in `$` prefix for currency-tagged pairs (renovation-budget cards). |
| `src/types/artifact.ts` | New optional `format` field on `KeyValuePair` (`'currency' | 'currency2' | 'number' | 'date' | 'percent'`). |
| `src/styles/studio.css` | `.studio-screen-overlay` styles (fixed full-screen, z-index 90). |

### Full-day summary

Today's 6 committed + 4 uncommitted changes close the **renovation per-slice fabrication arc**:

1. **Figure-level provenance** (`6eb38ed2`) — the reply-assembly fabrication guard now requires every financial figure to trace to a tool-returned number, not just "some tool ran." This blocks the last major fabrication vector: running one real tool and then inventing figures for other slices.
2. **`get_renovation_breakdown` tool** (`09f33ccc`) — gives the model real per-bedroom renovation numbers so a "1BR renovation budget" card is sourced rather than fabricated. Verified on project 17 (Chadron Terrace): $30,642/unit, $3.46M total, 1BR = 26 units → $796,704 + $91,000.
3. **Financial artifact creation guard** (`d28d358c`, from early AM) — second net at `create_artifact` time. Two-layer guard system is now complete.
4. **Inline-vs-card presentation rule** (`f3f820ba`) — size-gates small results to inline text with an offer to render a card; prevents redundant inline + card for the same data.
5. **Pop-out overlay** (uncommitted) — Phase 1 of right-panel reflow so wide screens (budget grid, rent roll) get full viewport when needed.

### Updated file tally for the day

```
backend/apps/artifacts/financial_artifact_guard.py              | 101 +++ (NEW)
backend/apps/artifacts/services.py                              |  26 +++
backend/apps/artifacts/tests/test_financial_artifact_guard.py   | 113 +++ (NEW)
backend/apps/landscaper/ai_handler.py                           | 199 +++-
backend/apps/landscaper/tests/test_fabrication_guard.py         |  74 +++ (NEW)
backend/apps/landscaper/tests/test_renovation_breakdown.py      |  75 +++ (NEW)
backend/apps/landscaper/tool_executor.py                        |  10 ++
backend/apps/landscaper/tool_registry.py                        |   1 +
backend/apps/landscaper/tool_schemas.py                         |  25 +++
backend/apps/landscaper/tools/artifact_tools.py                 |   3 +
backend/apps/landscaper/tools/renovation_tools.py               | 205 +++ (NEW)
backend/apps/landscaper/views.py                                |  11 +-
CLAUDE.md                                                       |   7 +-
src/components/studio/StudioShell.tsx                            |  ~50 (uncommitted)
src/components/wrapper/ArtifactRenderer.tsx                      |   7 (uncommitted)
src/styles/studio.css                                           |  17 (uncommitted)
src/types/artifact.ts                                           |   4 (uncommitted)
```

### Alpha readiness impact

No blocker movement. Today's work is a **quality/trust hardening pass** — three layers of fabrication prevention are now in place (prompt rules, reply-assembly guard with figure-level provenance, artifact creation guard). The `get_renovation_breakdown` tool (+1, bringing the count to 288 registered) fills a data gap that was causing fabrication in the renovation slice.

### Carry-forward (unchanged)

- [ ] Re-run demo project clones on host
- [ ] PropertyTab.tsx floor plan double-counting fix — verify deployed
- [ ] Phase 5 (Python waterfall replication) for Excel audit
- [ ] Scanned PDF / OCR pipeline — OCR seam exists, binaries not provisioned
- [ ] Pop-out overlay uncommitted changes — review and commit
