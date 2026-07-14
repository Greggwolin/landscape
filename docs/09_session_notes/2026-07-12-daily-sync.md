# Daily Sync — 2026-07-12

**Date**: Sunday, July 12, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### No Code Commits

No commits to `main` today (Sunday). Last commit was `bd8600f2` on 2026-07-11 (PR #157, retire dead budget-category path).

### Design / Strategy Activity

A major **land-product session transfer** was produced today from the Claude.ai chat project. 27 files deposited in `docs/design-system/land_session_transfer_7-12-26/`, including:

- **LANDSCAPE_LAND_SLICE1_BRIEFING.md** — Locked decision register (D1–D8) and slice 1 scope statement for the standalone land development product. All 8 decisions locked by Gregg on 2026-07-11.
- **LANDSCAPE_LAND_SLICE1_DISCOVERY_AUDIT_TECH.md** — Read-only discovery audit of existing map engine, draw/measure tools, overlay engine, county tax parcel integration, land-use taxonomy, and parcel data model. Completed by a Cowork session earlier today. Findings: shared machinery is "substantially built and live," gaps are structural (no app-level map, no geometry→parcel-row promotion, fragmented sources of truth).
- **14 HTML prototypes** — Interaction evidence from the strategy side: intake paradigm explorations (decision tiles, docket, MPC parcel tables), map-driven navigation, spatial parcel-table authoring, street derivation, Red Valley Ranch entitlement-chain intake.
- **HANDOFF_NARRATIVE.md** — Genesis story from the strategy session.
- **CHAT_TO_CW_SYNC.md** — Sync-bridge file (seq 1) with current focus and locked decisions.

### Key Decisions Locked (D1–D8)

| # | Decision | Locked answer |
|---|----------|---------------|
| D1 | First slice | App-level map + boundary-first project creation + parcel table authoring |
| D2 | Conversation placement | Workspace owns center in land product; chat = side rail during intake |
| D3 | Decision docket | Product-wide standard pattern for judgment calls |
| D4 | Geometry sources v1 | Reuse existing Landscape geometry machinery only |
| D5 | Streets & quantities | v1.5, after parcel workflow is in daily pilot use |
| D6 | Pilot | Red Valley Ranch (CBLF1) |
| D7 | Design kit | Existing app kit + tokens, no new visual identity |
| D8 | v1 exclusions | No auto takeoff, no exhibit extraction, no MU vertical, no income-property workflow |

### Discovery Audit Findings (High-Level)

The audit identified three structural gaps for slice 1:

1. **No app-level (project-less) map** — all map surfaces are project-bound. Slice 1's "born on the map" workflow has no surface yet.
2. **No geometry → parcel-row promotion** — drawn/selected shapes become project boundaries but never create `tbl_parcel` rows. Spatial parcel-table authoring doesn't exist.
3. **Fragmented sources of truth** — two parallel container hierarchies, three geometry stores with SRID mismatch, hardcoded taxonomy dropdown disconnected from the real land-use library.

Decisions surfaced for Gregg: which map surface becomes the land home, which hierarchy is canonical, which geometry store + SRID wins, and how out-of-band GIS DDL gets tracked migrations.

## Files Modified

No committed files modified today.

### Untracked Files Added

- `docs/design-system/land_session_transfer_7-12-26/` — 27 files (briefing, audit, prototypes, sync docs)
- `docs/ROUTE_INVENTORY.md` — new (likely produced by the discovery audit)
- `docs/cc-prompts/` — 5 new prompt files (LN7, LN8, LN9, branch-cleanup recovery, GIS MVP architecture handoff)

## Git Commits

None today. Last commit: `bd8600f2` (2026-07-11 14:29 MST).

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] **NEW:** Gregg to review and approve discovery-audit findings before any implementation phasing is proposed (human gate per briefing §READ FIRST).
- [ ] **NEW:** Resolve structural decisions surfaced by audit: canonical hierarchy, geometry store + SRID, app-level map surface, GIS DDL migration tracking.
- [ ] **NEW:** Commit land-product transfer docs (27 files in `docs/design-system/land_session_transfer_7-12-26/`).
- [ ] 12 untracked daily-sync files in `docs/09_session_notes/` dating back to 2026-06-26 — consider batch-committing via the scoped committer.
- [ ] Several untracked CC prompt files in `docs/cc-prompts/` — review and commit or discard.

## Alpha Readiness Impact

No alpha blocker movement today. Scanned-PDF/OCR pipeline remains the only open alpha blocker. The OCR seam exists (flag-gated `settings.ENABLE_OCR`) but OCRmyPDF/Tesseract/Ghostscript are not yet provisioned.

The land-product direction (property-type-specific front doors) is a major strategic shift but does not change the MF alpha readiness assessment — the land product is a parallel workstream.

## Notes for Next Session

- The land-product discovery audit is complete and waiting for Gregg's review. No phasing or implementation should begin until he approves the findings and resolves the structural decisions surfaced.
- Red Valley Ranch is confirmed as the pilot project. Entitlement documents are in the OneDrive project folders. Note: several plat PDFs have no readable text layer — the platform OCR pipeline is the required read path, reinforcing the OCR blocker.
- The 27-file transfer package in `docs/design-system/land_session_transfer_7-12-26/` is untracked. Should be committed after review.
- The `CHAT_TO_CW_SYNC.md` sync-bridge file establishes a cross-session sync protocol (seq 1). The coding side's outbound sync was last seen at seq 1 / 2026-06-16 from the chat side.
