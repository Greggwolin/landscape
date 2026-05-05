# Daily Sync — 2026-05-01

**Date**: Thursday, May 1, 2026
**Generated**: Nightly automated sync
**Branch**: `chat-artifacts`

---

## Work Completed Today

### Features
- **Discriminator-aware operating statement (Phase 1)** (`13346bf`) — Major architectural ship. New `save_user_vocab` tool for per-user phrasing→canonical-value mappings. Modified `get_operating_statement` v2 with scenario resolution, ambiguity detection, and honest labeling. New `tbl_user_scenario_vocab` table. OS guard updated with `_check_label_data_consistency` to reject subtype-vs-title mismatches. +908 lines across 9 files.
- **Project Documents section in artifact workspace** (`dea1a68`) — Added collapsible "Project Documents" section to `ArtifactWorkspacePanel.tsx` (+187 lines).
- **Right panel fallback fix** (`92ee2bb`) — Right panel now falls back to artifact workspace empty state instead of documents list. Removed 177 lines of dead code from `ProjectArtifactsPanel.tsx`.

### Bug Fixes
- **Project list chat context leak** (`0795767`) — `/w/projects` list page no longer inherits the last project's chat context. Fixed in `layout.tsx`.
- **Gunicorn timeout** (`3f8d31c`) — Bumped worker timeout to 180s in Railway config (was timing out on heavy Landscaper requests).

### Infrastructure / Chores
- **Reverted overly-broad migrations unignore** (`017d1cc`) — `.gitignore` change from Phase 1 that exposed ~140 historical SQL files reverted. Narrower pattern needed later.
- **Reverted F-12 proforma tool** (`ad0b7f1`) — `get_proforma` removed as not discriminator-aware. -994 lines.
- **F-12 proforma originally added** (`fae31fe`, ~27h ago) — then reverted same day after discovering fundamental conflict with discriminator system.

### Documentation
- Session log entries for release cut (`256743d`) and Phase 1 ship (`0c8e45a`)
- Schema-audit rule §17.7 + discriminator high-risk zone §17.8 added to PROJECT_INSTRUCTIONS.md (`f003d76`)
- F4 carryover + session log housekeeping (`d03e1b3`)
- Previous night's sync created (`46fec8d`)

### Release
- **Production release cut** (`256743d`, `d03e1b3`) — `feature/unified-ui` force-pushed to `main`, previous main archived as `Alpha18-UI`. Vercel + Railway redeployed. Working branch switched to `chat-artifacts`.

## Files Modified

Key files touched today (13 commits):

| File | Changes | Context |
|------|---------|---------|
| `backend/apps/landscaper/tool_executor.py` | +283/-29 | Discriminator-aware OS routing |
| `backend/apps/landscaper/tools/vocab_tools.py` | +280 (new) | User vocab learning system |
| `backend/apps/artifacts/operating_statement_guard.py` | +119 | Label-data consistency check |
| `backend/apps/landscaper/ai_handler.py` | +80 | BASE_INSTRUCTIONS discriminator honesty sections |
| `backend/apps/landscaper/tool_schemas.py` | +98/-66 | OS tool v2 schema + vocab tool |
| `src/components/wrapper/ArtifactWorkspacePanel.tsx` | +187 | Project Documents section |
| `src/app/w/layout.tsx` | +13/-5 + +28/-3 | Chat context leak fix + thread fix |
| `backend/Procfile` + `railway.json` | +2/-2 | Gunicorn timeout bump |

## Git Commits (today, newest first)

```
0795767 fix(ui): /w/projects list page no longer inherits last project's chat context
3f8d31c fix(infra): bump gunicorn worker timeout to 180s
017d1cc chore: revert overly-broad migrations unignore from .gitignore
0c8e45a docs: log Phase 1 ship + tool count update
dea1a68 feat(ui): add Project Documents collapsible section to artifact workspace
92ee2bb fix(ui): right panel falls back to artifact workspace empty state, not documents list
13346bf feat(os): discriminator-aware operating statement (Phase 1)
256743d docs: log release cut — Alpha18-UI archive + unified-ui promoted to main
d03e1b3 WIP: F4 carryover (new-thread fix in layout.tsx + selectThread refresh)
46fec8d chore: nightly session-notes sync 2026-04-30
f003d76 docs: schema-audit rule (§17.7) + discriminator high-risk zone (§17.8)
ad0b7f1 Revert "feat(artifacts): server-derive F-12 proforma from T-12 + growth rates"
fae31fe feat(artifacts): server-derive F-12 proforma from T-12 + growth rates (then reverted)
```

## Active To-Do / Carry-Forward

- [ ] **Phase 2: Ephemeral artifacts + inline cell edit live recalc** — queued as next discriminator-aware OS work
- [ ] **BASE_INSTRUCTIONS cleanup** — ~80 lines of T-12 strict content rules superseded by Phase 5 guard but not yet removed (waiting for stability observation)
- [ ] **`_normalize_phrase` stop-word stripping** — `vocab_tools.py` doesn't strip "show me", "the", "again" etc., reducing vocab-lookup hit rate
- [ ] **`.gitignore` migrations pattern** — Need narrower unignore pattern; broad one reverted today. ~60 historical SQL files need per-file triage
- [ ] **PROJECT_INSTRUCTIONS.md mirror** — v4.1 needs mirroring to Cowork project settings + Claude.ai project knowledge per §0.4
- [ ] **Rent-roll guard** — Still queued from pre-discriminator work
- [ ] **Re-run demo project clones on host** — `clone_demo_projects` now includes MF units, leases, cost approach but existing clones (projects 125, 126) pre-date the fix
- [ ] **PropertyTab.tsx floor plan double-counting** — Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll
- [ ] **Scanned PDF / OCR pipeline** — Remains the only true alpha blocker (OCRmyPDF identified but not implemented)

## Alpha Readiness Impact

- **Overall alpha readiness unchanged at ~92%.** Today's work was architectural correctness (discriminator honesty) and production stabilization (release cut, gunicorn timeout), not new alpha surface area.
- **Production release cut completed** — chat-first UI now live on Vercel + Railway via `main`. This is a deployment milestone, not a feature milestone.
- **Discriminator-aware OS (Phase 1)** eliminates a class of content-mislabeling errors where artifacts were titled "T-12" against data actually tagged `CURRENT_PRO_FORMA`. Correctness improvement, not a new capability.
- **Scanned PDF / OCR** remains the sole meaningful alpha blocker.

## Notes for Next Session

1. **Branch is `chat-artifacts`** — `feature/unified-ui` was deleted after promotion to `main`. All new work goes on `chat-artifacts`.
2. **Discriminator system is now a high-risk zone** (§17.8 in PROJECT_INSTRUCTIONS). Any OS-related work must consult `statement_discriminator` taxonomy and `active_opex_discriminator` switcher before proposing changes.
3. **`default` is the dominant discriminator tag** — 945 rows / 63 projects. It means "untagged", not a specific scenario. Labeled honestly as "Default (untagged)" with `unknown` epistemic status.
4. **Gunicorn timeout at 180s** — was causing Railway worker kills on heavy Landscaper requests. Monitor for further timeouts.
5. **Phase 2 (ephemeral artifacts + live recalc)** is the natural next step but no spec exists yet.
