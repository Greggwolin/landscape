# Daily Sync — 2026-07-29

**Date**: Tuesday, July 29, 2026
**Generated**: Nightly automated sync
**Branch**: `fix/artifact-panel-host-route`

---

## Work Completed Today

### Committed
- **`b134900` docs: nightly health check 2026-07-29** — Previous nightly sync committed session notes for 07-27 and 07-28 plus UX health report JSON.

No new feature or fix commits landed today (July 29). The prior day's session (July 28) was the most recent active coding day.

### Uncommitted (In-Flight)

Four files modified, all part of **CB10 — UOM picklist editing** on the artifact editing spine:

1. **`backend/apps/landscaper/tool_executor.py`** (+1 line) — Passes `uom_options` from query data into the budget artifact builder.
2. **`backend/apps/landscaper/tools/budget_artifact_builder.py`** (+46 lines) — Makes `uom` an editable column on budget schedule artifacts. Adds `_BUDGET_CELL_TO_COLUMN` mapping (`uom` → `uom_code`) because the artifact cell key differs from the DB column name. Column carries an `options` list so the renderer can offer a dropdown (FK-constrained to `core_fin_uom`). Source refs updated to handle picklist values (string codes, not numbers).
3. **`backend/apps/landscaper/tools/sales_artifact_builder.py`** (+59 lines) — CB9 sales-schedule editing spine: defines `_EDITABLE_SALE_COLUMNS` (`sale_date` → `sale_date`, `commission` → `commission_amount`), adds `_cell_source_refs()` for parcel-level cell tracking. Scope decision documented: rate-card price stays READ-ONLY this slice because editing it fires `trg_recalc_on_pricing_change` which deletes parcel sale rows.
4. **`CLAUDE.md`** — Tool count corrections (281→282 in feature table and deployment table; 266→285 / 263→282 in Landscaper Architecture; 284→285 / 281→282 in footer). New "Last audit" entries for 2026-07-28 and 2026-07-27.

## Files Modified (Uncommitted)

```
 CLAUDE.md                                          | 12 +++--
 backend/apps/landscaper/tool_executor.py           |  1 +
 backend/apps/landscaper/tools/budget_artifact_builder.py | 59 +++++++++++++---
 backend/apps/landscaper/tools/sales_artifact_builder.py  | 59 ++++++++++++++++-
```

## Git Commits (Last 3 Days)

```
b1349007 docs: nightly health check 2026-07-29 (13h ago)
aa5cd7f0 fix(landscaper): open + record artifacts from server-rendered schedule tools (TA5) (28h ago)
170e896b fix(landscaper): send artifacts somewhere they can actually render (TA5) (29h ago)
4792cef0 fix(map): stable DndContext id stops LayerPanel hydration mismatch (#228) (31h ago)
429836a9 feat(artifacts): batch commit — stage several budget edits, land as one set (CB8) (#227) (31h ago)
d821c6bd feat(landscaper): reopening a chat returns you where it left off (TA1) (#226) (31h ago)
14cbf273 fix(landscaper): _log_planning_activity invalid status dropped every log (CB7) (#225) (33h ago)
9aee5c2f feat(artifacts): editing spine slice 1 — one budget cell writable end to end (CB6) (#224) (33h ago)
3d6ee7fe fix(landscaper): widen fabrication-guard vocabulary — income property + land sales (CB5) (#223) (34h ago)
6bfb626c fix(landscaper): artifact-tool empty/degraded relay sweep (CB4) (#222) (35h ago)
8b5d14b4 fix(landscaper): variance empty-path relay instruction (CB3) (#221) (2d ago)
78e3d3d6 feat(landscaper): budget variance review vs the firm's other deals (CB2 §3) (#220) (2d ago)
e71177ff feat(clarification): Apply button + review state + modal-target launch (Phase 3b) (#219) (2d ago)
4ce4ccc8 SS18 — drape-by-chat applies for real; no false success (+ chat UX) (#218) (2d ago)
f0c8269c chore(git): FB-304 recurrence guard — commit-msg hook blocks source in nightly-docs commits (2d ago)
```

## Active To-Do / Carry-Forward

- [ ] **CB10 UOM picklist editing** — Budget artifact builder + sales artifact builder changes uncommitted. Sales schedule also has CB9 editable cells (sale_date, commission). Both need frontend renderer support (dropdown for UOM, date picker for sale_date) and the write path in `artifact_editing_views.py`.
- [ ] **CB9 sales schedule editing** — Scope decision made (rate-card price stays read-only because the trigger deletes parcel sale rows). Writer must call `SaleCalculationService` after writes to recalculate derived columns (gross, cost_of_sale, net). Commission writes must also set `commission_override = true`.
- [ ] **CLAUDE.md tool count corrections** — Uncommitted. Tool counts updated from 281→282 advertised, 284→285 registered to match actual registry state. Left for developer review.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No alpha blocker movement today. The artifact editing spine (CB6–CB10) is new capability beyond the alpha checklist — it extends what was already marked ✅ WORKS. Scanned-PDF / OCR remains the only significant alpha gap.

## Notes for Next Session

- CB10 (UOM picklist) and CB9 (sales schedule editing) are in-flight with backend ready; frontend renderer + write path are the next slices.
- The sales schedule scope decision (rate-card price read-only) is documented in `sales_artifact_builder.py` comments — important context for whoever picks up price editing later.
- Branch is `fix/artifact-panel-host-route`, not a CB-named branch — historical artifact.
