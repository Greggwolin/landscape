# Plan Geometry — Feature Reference

**Version:** 1.0 — 2026-08-19
**Status:** partially built; arc PARKED 2026-08-18 by Gregg, design settled 2026-08-19
**Audience:** technical. CC sessions, future agents, anyone picking this up cold.
**Plain-English companions** (workspace, not repo): `_cowork/PLAN-GEOMETRY-WHAT-IT-IS-2026-08-19.html`
(purpose + settled scope) and `_cowork/PLAN-GEOMETRY-DRAWING-LADDER-2026-08-19.html`
(drawing types, non-lot areas, boundary rules).
**Design spec:** `_cowork/_specs/PLAN_GEOMETRY_TARGET_SPEC.md` — target output, reference dataset,
score definition, build order. This file is the *as-built* record; that one is the *target*.

Every figure below was measured against the live database or the working tree on 2026-08-19.
Where a claim is inherited rather than verified it says so.

---

## 1. What the feature is for

Read a land-development drawing and produce the project from it: parcels with lot counts,
frontage and typical dimensions, and lot outlines placed on the ground. The target output is the
Red Valley permitting map — a subdivision drawn whole, georeferenced, selectable — produced from
an uploaded plat with **no CAD file in the loop**.

Red Valley is the training case because it is the one property where CAD-derived ground truth
exists (`1Active/CBLF1/_claude/data/rvr_phase1_lots.geojson`, 350 WGS84 polygons). That file is
the **acceptance test, never an input**. Fitting to it and then scoring against it is circular.

---

## 2. Settled decisions

Do not re-litigate without Gregg. Dates are when he decided.

| # | Decision | Date |
|---|---|---|
| 1 | A plat creates **parcels** with rollups. Lot outlines are geometry hanging off the parcel, not 286 managed inventory records. (Option 1a.) Lots as a managed third level is deferred, not rejected. | 2026-08-14, reaffirmed 2026-08-19 |
| 2 | **A person confirms the drawing stage** before anything is measured. Classifier confidence is not permission. | 2026-08-14 |
| 3 | Minimum-lot-width refusal for gap filling, minimum taken from the drawing's own verified lots — never an assumed zoning standard. | 2026-08-14 |
| 4 | **Area agreement verifies, never identifies.** It is a veto. Eleven Red Valley lots state 5,040 sq ft; a swap between two identically-sized lots was actively *certified* by an area check. | 2026-08-18 |
| 5 | Naming unlabelled lots **chains through shared edges**, not "the same row". Refuse on any ambiguity — the path between two named anchors must be unique. | 2026-08-18 |
| 6 | **Sheets are never joined to each other.** No lot appears on two sheets, matchlines are text in each sheet's own coordinate space, no common survey tie. Each sheet ties to the ground independently. | 2026-08-18 |
| 7 | Preview shows recovered geometry **as a layer over the plat image**. Trace page by page; one artifact at the end. | 2026-08-18 |
| 8 | **Fit to independent anchors, score against the reference.** Never both from the same source. | 2026-08-18 |
| 9 | Drawings are **independent retained layers**, not versions of one truth. No reconciliation engine, nothing overwrites anything. The point of holding them together is to show change as entitlements get more granular. | 2026-08-19 |
| 10 | **The only geometry common to all layers is the project boundary.** It is both the shared object and the common fit anchor. | 2026-08-19 |
| 11 | **A saved APN sets the project boundary and area.** All produced geometry must fit inside it. Containment is therefore a self-check requiring no reference file. | 2026-08-19 |
| 12 | Recording splits the parent APN into per-lot numbers; **the project keeps the parent outline permanently** and ignores the children. The captured outline must be retained, not re-fetched — the county stops publishing retired parents. | 2026-08-19 |
| 13 | APN format reconciliation (dashes, leading/trailing zeros) happens **at capture**, with both forms shown, storing one agreed value. Not a query-time normalisation. | 2026-08-19 |
| 14 | **Tracts / ROW / open space become records**, carrying use, acreage and dedication. ~60 on Red Valley Phase 1, and they are where cost and maintenance obligation live. | 2026-08-19 |
| 15 | Recorded **final plats only**, for now — but see §8: the Red Valley *preliminary* plat turned out to be fully vector with lot area tables for all 8 parcels, so this constraint is looser than assumed when it was set. | 2026-08-19 |
| 16 | Illustrative site-plan **image drape** and measured-geometry **placement** stay separate features. They are different claims about the world and currently share a button. | 2026-08-19 |
| 17 | Geometry renders in the **existing project map panel** (`/w/projects/[id]/map`). No new surface. A separate app-level map for research/project creation is desired and **does not exist** — verified 2026-08-19, every map in the app is project-scoped. | 2026-08-19 |

---

## 3. Code inventory

### 3.1 Pipeline — `backend/apps/knowledge/services/plan_geometry/` (4,489 lines, 15 modules)

| Module | Lines | Role |
|---|---:|---|
| `plat_vector.py` | 604 | Vector path extraction from plat PDFs via PyMuPDF. Closes faces from line-work. |
| `lot_match.py` | 536 | Matches recovered faces to lot numbers from the text layer. **Deliberately discards interior rings and never considers tract-lettered faces** — the reason non-lot recovery is 0%. |
| `parcel_rollup.py` | 527 | Aggregates lots into parcel-level rollups; the only writer to `tbl_parcel`. |
| `lot_table.py` | 361 | Reads the plat's own lot area table (the schedule — the denominator everything reconciles to). |
| `plan_reader.py` | 359 | Orchestrates a read; produces the `PlanReading` the preview and apply paths both consume. |
| `siteplan_raster.py` | 333 | Raster contour extraction for site-plan images (the non-vector path). |
| `plan_classify.py` | 307 | Classifies drawing type with multi-source agreement. |
| `lot_dimensions.py` | 295 | Width, depth, street-facing edge from geometry. |
| `lot_infill.py` | 260 | Recovers lots whose outline never closed; fixes mislabeled lot IDs. Emits `infill_refusals`. |
| `apply_plan.py` | 218 | Commit path: reading → parcels. |
| `intake.py` | 185 | Recognises a drawing on upload, triggers classification. |
| `calibration.py` | 149 | Scale derivation. |
| `georeference.py` | 145 | Placement on the earth. **Not wired to anything — no geometry has ever been georeferenced.** |
| `stages.py` | 113 | Plan stage definitions and progression. |
| `__init__.py` | 97 | Public surface. |

### 3.2 Views — `backend/apps/knowledge/views/`

| File | Lines | Endpoints |
|---|---:|---|
| `plan_preview_views.py` | 429 | `GET /api/knowledge/documents/<doc_id>/plan-preview/` · `GET .../plan-preview/sheets/<pdf_page>/image/` |
| `plan_apply_views.py` | 239 | `POST /api/knowledge/documents/<doc_id>/apply-plan/` |

All three are DRF views with `IsAuthenticated` + project-ownership checks. **This matters:** a plain
Django view here sees an anonymous user despite a valid bearer token and answers "not found" — the
failure that cost a day on the apply endpoint (MK49).

`build_preview()` is deliberately split from the view and **touches no database at all**; a test
(`test_build_preview_touches_no_database`) hands it an exploding connection to keep it that way.

### 3.3 Front end — `src/components/wrapper/documents/`

| Component | Role |
|---|---|
| `PlanStageCard.tsx` | Shows classified drawing stage in the document detail panel with confirm controls. Calls `apply-plan` on confirm; writes stage to the document profile via `/api/dms/documents/<id>/profile`. |
| `PlanPreviewWindow.tsx` | The preview. Geometry drawn **over** the rendered sheet, per-sheet counts, refusals with reasons, sheet navigation, Drape hand-off. Styles in `src/styles/wrapper.css` (`.w-plan-preview-*`, `.w-plan-lot`). |

Placement/drape reuses the existing map path: `src/lib/gis/planExtractBridge.ts` (latch + event),
`MapTab.applyExtractedPlanOverlay`, `src/lib/gis/controlPoints.ts` (`georeference()`,
`snapToVertex()`, `recommendTpsWarp()`).

### 3.4 Landscaper tools

| Tool | File | Notes |
|---|---|---|
| `extract_plan_image` | `tools/plan_extract_tools.py` | Renders a plan page or clipped region to transparent RGBA PNG and hands it to the overlay flow. Two-step: preview → confirm. Never silent-commits. |
| `control_map_overlay` | `tools/map_tools.py` | Chat-driven drape control (drape/fit/opacity/scale/rotate/warp-mode/nudge/lock/save). No DB write in the tool; persistence is the client Save. |
| `generate_map_artifact` | `tools/map_tools.py` | Interactive MapLibre maps as artifacts. |

**No tool reads or reports plan geometry.** Landscaper cannot answer "what did the plat say" or
open the preview. That is an unbuilt touch point, not an oversight to be worked around.

### 3.5 Management command

`backend/apps/knowledge/management/commands/import_plan_lots.py` — CLI import of plan lot data.

---

## 4. Data model

### 4.1 Tables, with live row counts as of 2026-08-19

| Table | Purpose | Rows |
|---|---|---:|
| `landscape.gis_plan_lot` | Lot outlines from a drawing. Cols: `id, project_id, parcel_id, lot_number, geom, area_sqft, frontage_ft, source, source_doc, stage, version, confidence, valid_from, valid_to, is_active, created_at`. | **0** |
| `landscape.gis_plan_parcel` | Parcel outlines from a drawing. Cols: `id, project_id, parcel_id, geom, source_doc, version, confidence, valid_from, valid_to, is_active, created_at`. | **0** |
| `landscape.gis_project_boundary` | Newer boundary store. Cols: `id, project_id, geom, source, created_at`. | 2 (projects 7, 9) |
| `landscape.project_boundaries` | **Older boundary store, and the one holding real data.** Cols: `boundary_id, project_id, parcel_count, total_acres, dissolved_geometry, created_at, updated_at`. | 1 (project 8) |
| `landscape.project_parcel_boundaries` | Per-APN outline under a project boundary. Cols: `parcel_boundary_id, boundary_id, project_id, parcel_id, geometry, gross_acres, owner_name, site_address, created_at`. | 1 (project 8) |
| `landscape.gis_document_ingestion` | One row per ingested drawing: `document_type, ai_analysis, parcels_created, geometry_added, status`. | 7 (all project 7, test runs) |
| `landscape.gis_tax_parcel_ref` | County parcel reference geometry. | 14 |
| `landscape.tbl_parcel` | The rollup destination. | 4 for project 8 |
| `landscape.tbl_lot` | Pre-existing lot inventory table. Unused by this pipeline. | 9 (none Red Valley) |

Views: `vw_map_plan_parcels`, `vw_map_tax_parcels`.

**`gis_plan_lot` and `gis_plan_parcel` already carry the layer model** — `source_doc`, `version`,
`valid_from` / `valid_to`, `is_active`. Decision 9 needs no new structure on those two.

**Nothing holds tracts, ROW, open space or drainage.** That is the one genuine schema gap
(decision 14).

### 4.2 The `tbl_parcel` write contract

`parcel_rollup.PARCEL_ROLLUP_COLUMNS` — the only columns this pipeline may populate, asserted by a
test so it cannot grow quietly:

```
project_id, parcel_code, parcel_name, acres_gross,
units_total, lots_frontfeet, lot_width, lot_depth
```

No pricing, sales or income-property field is ever written by a drawing reader.

### 4.3 Lot provenance — `gis_plan_lot.source`, varchar(16)

| Value | Meaning |
|---|---|
| `traced` | Its own number sat inside its own recovered outline. |
| `rebuilt` | No outline closed; reconstructed from the plat's stated dimensions between two proven neighbours. |
| `positional` | Outline recovered, no usable number; identified by walking the chain of shared edges between two named neighbours. |
| `unplaced` | Counted in the schedule, no outline, on no sheet. |

Before MK51 there were two values and every unmatched lot was stored as "derived", including lots
nothing derived — a false statement in a stored column.

### 4.4 Document profile

Stage, confidence and apply state live in `core_doc.profile_json -> 'plan'`. Keys observed on
doc 764: `apply, stage, is_plan, summary, evidence, confidence, stage_label, confirmed_by_user,
trusted_for_money, needs_confirmation, stage_is_measurable`.

`apply.counts` on doc 764: `{lots: 286, parcels: 4, measured: 246, front_feet: 11446.8}`.

---

## 5. Measured state — Red Valley Ranch (project 8, doc 764)

Phase 1 final plat, `P6475 PHASE 1 PLAT_R9 1-21-25.pdf`, 7 pages of which 3 carry lots.

| Metric | Value |
|---|---|
| Scheduled lots (the plat's own lot area table) | 286 |
| Recovered | 248 — sheet 4: 111, sheet 5: 78, sheet 6: 59 |
| By provenance | traced 230, rebuilt 10, positional 8 |
| Measured (frontage established) | 246 |
| No outline | 38 — of which 28 refused with a stated reason, 10 never attempted |
| Reconciliation | 248 + 38 = 286 ✓, derived from two independent counts |
| Parcels written | 4 — 83 / 87 / 51 / 65 lots |
| Frontage written | 2,824.5 / 3,406.4 / 2,228.8 / 2,987.2 = **11,446.9 ft** |
| Georeferenced | **none.** `gis_plan_lot.geom` empty, placement error not yet measurable. |

Independent checks that passed: parcel 2 acreage 10.25 vs reference 10.25; parcel 3 8.22 vs 8.23.
Whole-pipeline cross-check against the hand-built CBLF1 disposition model: 0.6% apart, produced
independently.

Score baseline (spec §5): lot recall 86.7%, lot precision 100%, numbering accuracy 245/248,
non-lot recall 0%, placement error not measurable.

---

## 6. Known defects and gaps

Ordered by cost.

1. **Frontage understates by 13%.** `tbl_parcel.lots_frontfeet` sums only the 246 measured lots and
   is stored beside `units_total = 286`. Parcel 1 reads 83 lots / 2,824.5 ft, implying 34-ft lots.
   The developer's own land-use exhibit states Phase 1 at **13,195 ft** (3,486 / 3,654 / 2,805 /
   3,250 — each exactly product width × count). Anything pricing per front foot off the app is
   1,748 ft light. Fix per decision 9: keep both as layer claims, nominate which prices; do not
   average, do not infer the missing lots.
2. **The project boundary has two homes.** Real data is in `project_boundaries` /
   `project_parcel_boundaries` (project 8, APN 502070010, CRESCENT BAY LAND FUND 1 LLC, 13-point
   polygon, SRID 4326, measuring 164.47 ac, captured 2025-09-30). `gis_project_boundary` is newer,
   holds two other projects, and has nothing for Red Valley. **Code written against the newer table
   will conclude Red Valley has no boundary.** One must be named authoritative and the other
   retired with an in-file note before fitting work starts.
3. **Acreage stored three times and disagreeing.** `tbl_project.acres_gross` = 160.0,
   `project_parcel_boundaries.gross_acres` = 160.0, the outline itself = 164.47. Per decision 11
   the stored copies should be removed, not corrected.
4. **A project can only hold two APNs.** `tbl_project.apn_primary` / `apn_secondary` — two fixed
   slots. 28 projects carry a primary, **10 already use the secondary**. The boundary side models
   any number and dissolves them; the project side caps at two and does not join (project record
   writes `502-07-001-0`, boundary record writes `502070010`).
5. **Non-lot features: 4 of 34 tracts, 0 of everything else.** The plat's own TRACT USE TABLE
   reads correctly — 34 tracts, 25.44 acres, zero rows failing their own arithmetic. Matching
   places 4 of them, each within 1.8% of its stated area. The other 30 carry a stated reason:
   **23 have no label rendered as text on any lot sheet** (the drawing flattened them into
   line-work — the same fault that hid 19 lot numbers), and **7 have a label but the closest
   outline containing it is 19–100% away from the stated area** (their boundaries never closed).
   A label-driven pass cannot reach the 23 however it is tuned. The next build is the complement
   approach the spec already names for streets: subtract placed lots from the project boundary,
   and what remains is tracts and rights-of-way, with the plat's table supplying each one's use
   and area. ROW, parks, drainage and open space remain at 0%. The reference holds 61 non-lot
   features (16 ROW, 28 parks, 6 passive OS,
   3 drainage, 2 electrical easement, 6 MSIDD improvement areas). Measured acreage for Phase 1:
   lots 38.1 ac against ~115 ac drawn excluding the overlapping district areas — the app models
   about a third of the ground. Blocks net-to-gross and first-pass budgeting.
   The plat's `TRACT USE TABLE` (sheet 2) states use per tract; nothing extracts it.
   ROW is derivable as complement: boundary − lots − tracts.
6. **38 lots still unplaced** — mostly corner and cul-de-sac lots whose neighbours are not in the
   same run; irregular shapes need the plat's curve table (C1–C186) worked as a traverse.
7. **Nine projects share the identical APN pair** `4052-022-015` / `016`. Almost certainly copied
   test data.
8. **OCR unprovisioned.** `auto_classifier._extract_pdf_with_ocr()` is flag-gated on
   `settings.ENABLE_OCR`; with the flag off it returns an explicit error rather than a silent
   empty. Scanned plats park.

---

## 7. Traps — do not retry without new evidence

1. **Never calibrate or fit against data derived from the same plat being placed.** Fit to
   independent anchors; score against the reference.
2. **Never let an area check identify anything.** Eleven Red Valley lots state 5,040 sq ft. The
   255/256 swap was *certified* by an area gate because both lots are 42×120.
3. **A migration file in the repo is not a table in the database.** Raw-SQL migrations under
   `migrations/` do not auto-apply: Railway runs only the Django migrator, and `npm run db:migrate`
   re-runs every `.up.sql` with no tracking table. Check `to_regclass` against the live database.
   *(Related, found 2026-08-19: 199 `.sql` files sit in `migrations/` and only 75 are tracked by
   git — a blanket SQL ignore rule excludes the rest. The reverse also holds: a migration on disk
   is not a migration in the repo.)*
4. **The plat's text layer lies two ways** — 19 lots have no number at all, and three lots carry
   their LEFT NEIGHBOUR's number. Adjacency impossibilities are the detector, not area.
5. **"Same row" bracketing fails at corners.** Chain through shared edges; refuse ambiguous chains.
6. **Relative URLs from a card reach Next, not Django.** The apply endpoint exists only on Django.
7. **`useState(() => window…)` initialisers cause hydration mismatches.** Measure after mount.
8. **A refusal list is a log of attempts, not an outcome.** Summing it reported 60 refused against
   38 missing: lots repeat once per failed try, and 23 had been established later by another pass.
   Report still-refused + never-attempted, and reconcile to the unplaced count.
9. **Editing a document's profile can destroy the plan reading.** Happened 2026-08-18 via a stale
   checkout on a second dev server; recovered from the profile audit table. The merge guard exists
   and did not hold; cause unknown — do not guess.

---

## 8. Drawing types across the development cycle

Decision 15 says final plats only, but that boundary was drawn before the preliminary plat was
opened. What each type actually carries, verified against real documents:

| Type | Carries | Trust for | Placement anchor |
|---|---|---|---|
| Land use plan (Peoria Lakes) | Parcels as coloured areas with number, acreage, land-use category. No lots, no dimensions. | Project shape and mix; early yield. | Drawn over aerial; fits to visible ground features. |
| Conceptual site plan (Red Valley Exhibit B) | All 8 parcels both phases, product size, **and a printed table of lot count + front feet per parcel**. Lots drawn as pattern only. | **The entire parcel structure, immediately** — the numbers the disposition model runs on. | Drawn over aerial. |
| Preliminary plat (Red Valley, Nov 2021) | **13 sheets, fully vector, stated scales, lot area tables for every parcel 1–8** — both phases. Street sections, easements. Verified 2026-08-19. | Lot-level layout and areas for the whole property, subject to change before recording. | Boundary bearings/distances on sheet. |
| Final plat (Red Valley Ph 1, Jan 2025) | Phase 1 only. Recorded, surveyed, every lot dimensioned, curve tables, tract use table. | Everything, at survey accuracy. | Outer boundary is the recorded assessor parcel. |

Two consequences: the **conceptual exhibit is the cheapest path to a whole project** (both phases,
from one printed table — no geometry recovery at all), and **Phase 2 is not stranded** by decision
15 as originally reasoned, since its preliminary plat reads.

---

## 9. Build order

From the target spec §7, revised against the 2026-08-19 decisions.

0. **Resolve the two boundary homes** (defect 2). Nothing can be fitted against an anchor that two
   pieces of code disagree about.
1. **Fit** each sheet to the project boundary (similarity transform: scale, rotation, translation),
   seeded by boundary correspondence. Auto-fit reports residual; hand adjustment is the fallback
   and is recorded as provenance. **Containment against the boundary is the gate** (decision 11) —
   a fit that puts a lot outside is refused, and that test needs no reference file, so it travels
   to every future plat.
2. **Render in the existing project map panel.** No new surface (decision 17).
3. **Score harness** — codify the §5 baseline table, re-run on every reader change, computed by
   script rather than assembled by hand.
4. **Non-lot features** — tracts first (the plat names them and states uses in its own table), ROW
   second as complement, classification from the tract use table. Records, per decision 14.
5. **Trace-as-reference** — user sketches a hint over the plat image, the reader uses it to find
   real line-work and emits actual geometry; the sketch is never saved as the feature. **Design
   session with Gregg first.**
6. **Selectability** — each placed feature clickable, showing its record.

---

## 10. History

| Date | What |
|---|---|
| 2026-08-14 | Pipeline first landed (10 modules, `gis_plan_lot`, `PlanStageCard`). Decisions 1–3. |
| 2026-08-17 | Discovered `gis_plan_lot` had never been applied to the live database despite being recorded in `CLAUDE.md`. Trap 3. |
| 2026-08-18 | Plat read end-to-end twice, prediction-first. One-point deduction removed (+170.9 ft frontage; lots now measure the printed 42.0/50.0/55.0 exactly). Neighbour-number swap found and fixed, 232 → 248 recovered. Four-value provenance. Preview window shipped. Confirm chain repaired end-to-end. Doc 764's reading restored after a profile save destroyed it. Target spec written. Arc parked. |
| 2026-08-19 | Refusal reporting corrected to an outcome (trap 8); sheet image restored beneath the geometry (decision 7 had been on record and the code had ignored it). PR #247. Decisions 9–17 settled. Defects 1–4 found. |
| 2026-08-25 | Full lot + tract extraction merged (#261). Red Valley reads 286 of 286 lots. Tract matching now chooses faces by stated area rather than taking the largest, and every unplaced tract carries a reason. Arc parked. |

---

*Maintainer note: when this file and `CLAUDE.md` disagree on a codebase fact, verify against the
live database and fix both. `CLAUDE.md` has been wrong about this feature before — it recorded
`gis_plan_lot` as existing for three days while the table did not.*
