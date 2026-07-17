# LANDSCAPE LAND — SLICE 1 DISCOVERY AUDIT (TECHNICAL)

**Produced by:** Cowork, session VP-audit (2026-07-12)
**Method:** Read-only audit of the live `main` branch at `/Users/5150east/landscape` on macmini-studio-local. Four parallel sub-audits (map engine + draw/measure; overlay engine; county tax parcels + land-use taxonomy; parcel/phase/area data model). No files written, no code changed, no DB touched.
**Governs:** the read-only discovery precondition in `LANDSCAPE_LAND_SLICE1_BRIEFING.md` §READ FIRST and project-instructions §17.7. **No phasing is proposed here** — this is findings only.
**Audience:** CC / Codex / future agent sessions. Plain-English companion for Gregg ships alongside as `.html`.

Git state at audit: branch `main`, last commit `bd8600f2`. Working tree clean except untracked docs (daily-sync notes, cc-prompts, the transfer folder). All recent map/overlay/parcel work is committed (PRs #146–#157).

---

## 0. EXECUTIVE SUMMARY

The shared machinery the land product is meant to ride is **substantially built and live** — a full MapLibre GIS surface with drawing, measurement, layer management, 3D terrain, county parcel feeds, and a genuinely complete site-plan overlay/control-point georeferencing engine with durable storage. Boundary creation from selected county parcels (with gross acreage) already works end-to-end. PostGIS is enabled and geometry is storable.

The gaps are **structural, not capability** gaps, and they cluster around three things:

1. **Everything is project-bound.** There is no app-level (project-less) map. Slice 1's "a land deal is born on the map" has no surface to be born on.
2. **No geometry → parcel-row promotion.** Drawn/selected shapes become a *project boundary*; nothing turns a drawn polygon into a `tbl_parcel` row + its geometry. Spatial parcel-table authoring (the slice-1 centerpiece) does not exist.
3. **Fragmented sources of truth.** Two parallel container hierarchies joined by a name string; three geometry stores with an SRID mismatch and a split owner of gross acreage; a hardcoded taxonomy dropdown disconnected from the real land-use library. These must be reconciled before authoring is built on top, or the cascade risk (§17) is high.

Decisions this surfaces for Gregg (phasing will hinge on them, not resolved here): which map surface becomes the land home; which hierarchy is canonical; which geometry store + SRID wins; and how out-of-band GIS DDL (Gern writes geometry tables straight to Postgres) gets a tracked migration home.

---

## 1. MAP ENGINE + DRAW / MEASURE — what exists

**Library:** MapLibre GL JS (confirmed on every live surface).

**Three MapLibre surfaces in the tree; only one is the live full-GIS map:**
- **`MapTab`** (`src/components/map-tab/MapTab.tsx`, ~3,800 lines) — the live full-GIS orchestrator. Mounts at the **only** real map route, `src/app/w/projects/[projectId]/map/page.tsx` → `WrapperMapPage` → `<MapTab project={…}>`. Owns layers, draw, overlay, terrain, Maricopa outlines, feature persistence. Canvas instance: `src/components/map-tab/MapCanvas.tsx` (styleRevision pattern survives basemap swaps).
- **`MapArtifactRenderer`** (`src/components/wrapper/MapArtifactRenderer.tsx`) — the chat-first artifact map. **Thin**: pin place/display only, requires `config.project_id`. No draw/layers/measure/terrain.
- **`MapOblique` / `GISMap` / `map-debug` (Leaflet)** — legacy or dev-only; `GISMap` (`src/app/components/MapLibre/GISMap.tsx`) holds parcel-select + `onBoundaryConfirmed` logic but is **unwired in `/w`**.

**Layer system:** data-driven panel over a code-seeded model. `LayerPanel.tsx` renders `layers.groups` (`LayerGroup`/`LayerItem` in `src/components/map-tab/types.ts`), drag-reorder via `@dnd-kit`. Seed set from `getDefaultLayerGroups()` in `MapTab.tsx`. Underlying legend→draw-order registry is hardcoded in `src/lib/maps/layerOrder.ts` (`REORDERABLE_LAYERS` maps legendId → style-layer prefixes: `site-boundary`→`project-boundary*`, `tax-parcels`, `plan-parcels`, `demo-rings`→`ring-`, `sale-comps`, `drawn-shapes`→`user-features`). Order persisted via `readStoredLayerOrder`/`writeStoredLayerOrder`.

**Drawing:** `@mapbox/mapbox-gl-draw` (transpiled in `next.config.ts`), wrapped by `src/components/map-tab/hooks/useMapDraw.ts` (modes: point/line/polygon/simple_select/direct_select). Toolbar `DrawToolbar.tsx`. Drawn shapes **persist** via `src/components/map-tab/hooks/useMapFeatures.ts` → Django, as generic `MapFeatureRecord` (`project_id, feature_type, category, geometry, label, area_sqft/acres, perimeter_ft, length_ft, linked_table, linked_id`). Rendered as `user-features`/`drawn-shapes` legend layer. `FeatureModal.tsx` collects label/category.

**Measure:** live via `@turf/turf` inside `useMapDraw.ts` (`length_ft`, `length_miles`, `area_sqft`, `area_acres`, `perimeter_ft`). Ephemeral measure mode (`onMeasureComplete`) finishes without persisting.

**3D/terrain/basemaps:** `src/lib/maps/terrain.ts` (AWS Terrarium raster-dem + hillshade + optional `setTerrain` 3D, re-applied on style load). Pitch/tilt via `MapOblique`/`MapCanvas` (recent "3D tilt slider"). Basemaps in `src/lib/maps/googleBasemaps.ts` (roadmap/satellite/terrain/hybrid), `esriHybrid.ts`, OSM free fallback, `rasterDim.ts` dimming. **Maricopa parcel-outline vector layer exists** — `MARICOPA_PARCEL_OUTLINE_LAYER_ID` exported from `MapCanvas.tsx`, imported by `MapTab.tsx`, constrained to county zoom (PR #150). *(Note: the taxonomy sub-audit searched the hyphenated string and reported it absent; the map sub-audit confirmed the exported constant and its import — treat parcel-outline as present.)*

---

## 2. OVERLAY ENGINE (site plan + control points) — what exists

**Real, live, fully persisted.** Sole live consumer is `MapTab.tsx`.

- **Image drape:** `src/lib/gis/imageOverlay.ts` — `addImageOverlay(map, {id, url, corners, opacity, beforeId})` returns `OverlayHandle` (`setCorners/setOpacity/getCorners/remove`), re-adds after basemap swap via `styledata`, supports `beforeId` (insert beneath another layer).
- **Draggable corner handles + snapping:** `src/components/map-tab/overlay/useSitePlanOverlay.ts` (four corner markers, snap to nearest parcel vertex/edge via `src/lib/gis/snapIndex.ts`; handle greens on snap). Controls UI `overlay/SitePlanOverlayControls.tsx` (opacity, rotation, snap indicator, save/cancel).
- **Control-point georeferencing solver:** `src/lib/gis/controlPoints.ts` → `georeference(imgW, imgH, points)`. Tiered by point count: **2 → similarity, 3 → affine, 4+ → projective (DLT homography, least-squares >4)**. Fits in a cos-lat-corrected local metric frame, returns corner lng/lats + `kind` + `rmsMeters`. `recommendTpsWarp()` flags when a thin-plate-spline warp would help (not implemented). Own linear algebra; no backend, no external lib. UI wiring in `MapTab.tsx` `handleCpImageClick` + map-click → `snapToVertex` → live re-fit on every added point.
- **Persistence:** table `landscape.tbl_project_overlay` (raw SQL, outside ORM). Endpoints `backend/apps/gis/views_overlay.py` (`ProjectOverlayViewSet`): `GET/POST /api/projects/<id>/overlays/`, `GET/PATCH/DELETE /api/overlays/<id>/`, `POST /api/projects/<id>/overlays/upload-image/`. Columns: `title, source_uri, corners(jsonb), opacity, rotation_deg, source_doc_id, source_page, source_crop_bbox(jsonb), control_points(jsonb)` — **control points themselves are saved.** Frontend CRUD `src/components/map-tab/hooks/useSitePlanOverlays.ts`.
- **Durable storage:** Cloudflare **R2** via Django `default_storage` (`overlays/<project>/<uuid>.png`), NOT UploadThing — deliberate fix for the orphan-sweep "drape vanished" 404 bug (`LSCMD-OVERLAY-DURABLE-0622-ot4`), documented in `src/lib/gis/overlayImageStore.ts` (`uploadOverlayImageDurable`). R2 bucket not CORS-enabled → render URLs wrapped same-origin via `toRenderableOverlayUrl()` → `/api/media/proxy?url=…`.
- **Chat seam:** Landscaper dispatches `landscaper:place_plan_overlay` / `landscaper:extract_plan_canvas` CustomEvents, latched via `planExtractBridge.ts`. Region trace/extract to transparent PNG: `extract/PlanExtractCanvas.tsx`.

---

## 3. COUNTY TAX PARCELS — what exists

**Live sources (server-side `backend/apps/gis/parcel_services.py`, `COUNTY_PARCEL_SERVICES`; frontend mirror `src/lib/gis/countyServices.ts`):**

| County | Source | Mechanism | ID field |
|---|---|---|---|
| Maricopa | `gis.mcassessor.maricopa.gov` ArcGIS REST MapServer/3 | live ArcGIS query, `f=geojson` | `APN` |
| Pinal | `rogue.casagrandeaz.gov` ArcGIS MapServer/0 | live ArcGIS query | `PARCELID` (+ `USECD`/`USEDSCRP`) |
| LA County | `/api/gis` proxy | frontend `src/lib/gis/laCountyParcels.ts`, consumed only by legacy `MapTab.tsx.bak` | `APN` |

All live sources are **ArcGIS REST feature queries returning GeoJSON** — no vector tiles, no static geojson, no local cache (except `gis_tax_parcel_ref` write-through).

**Search:** by APN (`parcel_query` builds `WHERE {id_field}='{apn}'`, `returnGeometry=true`, `outSR=4326`); by viewport bbox (envelope intersect, paginated `MAX_PARCEL_FEATURES=5000`). **No address search.**

**Live boundary-from-selection path (works today):**
1. `src/lib/gis/parcelServiceClient.ts` → `POST {DJANGO}/api/gis/parcel-query/` → `parcel_query` → `_fetch_arcgis_geojson` (6s/page timeout, clean 502 on county outage).
2. Select parcels → `MapTab.handleConfirmBoundary` → `POST /api/gis/parcel-ingest/` (`source: 'county_parcel_feed'`).
3. `parcel_ingest` → DB function `landscape.ingest_tax_parcel_selection(project_id, source, jsonb)` → dissolves into `gis_project_boundary`, returns **gross acreage** `ST_Area(geom)/4046.8564224` + dissolved geom + source.

Drawn-polygon boundaries use the sibling `boundary_set` endpoint (UPSERT, 4326→3857).

**Duplication/drift risk:** two ingest paths — Django `parcel_ingest` (live, MapTab) and Next.js `src/app/api/gis/ingest-parcels/route.ts` (raw SQL). Source APNs are retained per-parcel in `project_parcel_boundaries` (legacy 4326 store), but `gis_project_boundary` keeps only dissolved geom + a single `source` string; whether individual APNs persist through `ingest_tax_parcel_selection` is inside the DB function (not in repo).

---

## 4. LAND-USE TAXONOMY — what exists

**Canonical library (Django `backend/apps/landuse/models.py`, all `managed=False` over the `landscape` schema):**

| Table | Level / role | Key columns |
|---|---|---|
| `lu_family` | Family (L1) | family_id, code, name, active |
| `lu_type` | Type / "subtype" (L2) | type_id, family_id FK, code, name, ord, active |
| `res_lot_product` | Product (L3) | product_id, code, lot_w_ft, lot_d_ft, lot_area_sf, type_id FK |
| `type_lot_product` | Type↔Product M:N junction | type_id, product_id |
| `lu_res_spec` | residential specs per type | **dua_min, dua_max**, lot mins, setbacks, height, coverage, eff_date, doc_id |
| `lu_com_spec` | commercial specs per type | far_min/max, coverage, parking, eff_date, doc_id |
| `density_classification` | parallel density-band axis | code, name, family_category, intensity_min/max, intensity_metric, sort_order |
| `project_land_use` | per-project type enable | project_id, family_id, type_id, is_active |
| `project_land_use_product` | per-project product enable | project_land_use_id, product_id, is_active |

**Structure:** family → type (a.k.a. subtype) → product. **Density is a separate parallel axis** (`density_classification` bands + `lu_res_spec.dua_min/max` per **type**), not a 4th level. Global library shared; **per-project** customization via `project_land_use*`; **not per-user.**

**CRITICAL — the live form path is hardcoded and disconnected:** hooks `src/hooks/useTaxonomy.ts` + `useLandUseChoices.ts` fetch `/api/landuse/choices?type=…`. `src/app/api/landuse/choices/route.ts` **returns static hardcoded arrays** ("Return hardcoded X for now until schema is updated") — its header comment claims a `vw_lu_choices` view but the body never touches the DB. The DB-backed Django viewsets (`FamilyViewSet`/`TypeViewSet`/`LotProductViewSet`, correctly reading `lu_*` + `type_lot_product`) are a **parallel path these hooks do not call.** Some components hit `/api/landuse/families` and `/api/landuse/specs` (real DB) directly → the taxonomy surface is split.

**Density defaults:** per **type** (`lu_res_spec.dua_min/max`), served read-only via `src/app/api/landuse/specs/route.ts`; products carry lot dimensions, not densities. **No live yield calc** (units from dua×acres) found; `tbl_parcel.units_total` is authored manually.

---

## 5. PARCEL / PHASE / AREA DATA MODEL — what exists

**PostGIS enabled** (geometry columns `USER-DEFINED`, `ST_*` + `GIST` throughout). Verified against `neonDB_2025-11-14.json` (information_schema dump) + live code.

**Two parallel hierarchies (not the same thing):**
- **Universal container** — `tbl_division` (renamed from `tbl_container` in `migrations/025_rename_container_to_division.sql`), Django `Container` (`backend/apps/containers/models.py`). Discriminator `tier` SmallInt (1=Division, 2=Subdivision, 3=Unit), self-FK `parent_division_id`. Generic tree.
- **Land domain triplet** — dedicated `tbl_area` → `tbl_phase` → `tbl_parcel`, nested by integer FK (`tbl_parcel.phase_id→tbl_phase`, `tbl_phase.area_id→tbl_area`, `area_id` denormalized on parcel). **This is what the live parcel API and cashflow engine read.**
- **Bridge is a fragile name-string join** (`land_dev_cashflow_service.py`): `tbl_phase.phase_name = tbl_division.display_name AND project_id AND tier=2`.

**Geometry storage (NOT on tbl_parcel/phase/area/division):**

| Table | Role | Geometry | SRID |
|---|---|---|---|
| `gis_project_boundary` | active per-project boundary | `geom` Multi | **3857** |
| `gis_plan_parcel` | per-parcel polygons, bitemporal | `geom`; `parcel_id`→tbl_parcel, version/confidence/valid_from/valid_to/is_active/source_doc | — |
| `gis_tax_parcel_ref` | cached county parcels | `geom`, assessor_attrs(jsonb) | — |
| `project_boundaries` | legacy boundary summary | `dissolved_geometry` POLYGON; parcel_count, total_acres | **4326** |
| `project_parcel_boundaries` | legacy per-parcel geom | `geometry` POLYGON; parcel_id(text), parcel_apn, gross_acres, owner_name, site_address | **4326** |
| `tbl_project.gis_metadata` | jsonb GeoJSON blob (3rd rep) | — | — |

The `gis_*` PostGIS tables/views (`vw_map_plan_parcels`, `vw_map_tax_parcels`) are **not in tracked `migrations/`** — created direct-to-DB (Gern). Only the older `project_boundaries` pair has repo DDL (`scripts/create-project-boundaries-tables.sql`).

**Parcel identity (2.1.07):** display-only, derived at read time in `src/app/api/parcels/route.ts` via `CONCAT(area_no,'.',phase_no,'.',LPAD(ROW_NUMBER() OVER (PARTITION BY area_no,phase_no ORDER BY parcel_id),2,'0'))`. Stored identity is `area_id`+`phase_id`+ optional `parcel_code`. **Not stable on delete/reorder.**

**Land-use on parcel:** denormalized text codes, not FKs — `family_name, density_code, type_code, product_code`, plus legacy `landuse_code`, `subtype_id`(FK lu_type), `lot_type_id`, lot dims, `units_total`. Live parcel INSERT writes text codes directly, does not FK-link to `lu_type`/`res_lot_product`.

**Live parcel path is Next.js, not Django:** `src/app/api/parcels/route.ts` (POST requires project_id+area_id+phase_id, INSERTs `tbl_parcel`, **no geometry**; GET joins area/phase/landuse, derives names). `src/app/api/parcels/[id]/route.ts` PATCH writes taxonomy fields **per-field, no validation, single-parcel** (`landuse_code` writes deliberately skipped to avoid FK constraints). No Django ORM model for `tbl_parcel` (`backend/apps/landdev/models.py` intentionally empty).

**Drawn-shape → parcel promotion: does not exist.** `boundary_set` (drawn) and `parcel_ingest` (selection) write **boundary only**. `plan-parcels` POST only updates confidence/notes on pre-existing `gis_plan_parcel` rows (geom populated upstream by AI extraction, assumes tbl_parcel exists). Map UI renders read-only.

---

## 6. CONSOLIDATED GAP REGISTER (slice 1)

| # | Gap | Area | Slice-1 impact |
|---|---|---|---|
| G1 | **No app-level map.** Every map mount requires an existing project (`useWrapperProject`/`config.project_id`); rich map only at `/w/projects/[id]/map`. | Map | Blocks "born on the map." Highest structural priority. |
| G2 | **No create-project-from-geometry flow.** All boundary/ingest endpoints require project_id first. | Map/GIS | Blocks boundary-first project creation. Needs combined create→attach. |
| G3 | **No drawn-shape → parcel-row promotion.** Draw persists as boundary/annotation; nothing INSERTs `tbl_parcel` + matching `gis_plan_parcel(geom, parcel_id)`. | Model/GIS | Blocks spatial parcel-table authoring (the centerpiece). New write path required. |
| G4 | **Taxonomy dropdown hardcoded/disconnected** from `lu_*` library; parcel attribute writes single-parcel, unvalidated, no batch apply. | Taxonomy | Blocks "select parcels → apply family/type/product/density, validated." Needs real library wired + batch endpoint + validation. |
| G5 | **Three geometry stores, SRID mismatch (3857 vs 4326), split gross-acreage owner** (`ingest_tax_parcel_selection` vs `project_boundaries` writer that updates `tbl_project.acres_gross`). | Model/GIS | Must pick one source of truth before authoring. Cascade risk (§17). |
| G6 | **Two hierarchies joined by name string** (`tbl_division` tier tree vs `tbl_area/phase/parcel`). | Model | Must declare canonical (recommend area/phase/parcel — live API + cashflow read it). |
| G7 | **Parcel identity derived, not stored** (ROW_NUMBER at read time). | Model | Spatial create/delete renumbers existing parcels unless stable `parcel_code` assigned on insert. |
| G8 | **GIS geometry DDL out-of-band** (not in tracked migrations; Gern writes direct-to-DB). | Infra | Any slice-1 schema change (e.g., FK `gis_plan_parcel.parcel_id`→`tbl_parcel`, geometry authoring) has no migration home. Coordination with Gern needed. |
| G9 | **Overlay z-order** — saved overlays re-drape without `beforeId` (render on top), and no snapping of *drawn parcel vertices* to the plan image (only overlay-handle→parcel-vertex today). | Overlay | Needed so a plan sits *under* traced parcels and tracing snaps to it. |
| G10 | **Full toolset (draw/layers/measure/terrain/overlay) only in `MapTab`**, not the thin chat-first `MapArtifactRenderer`. | Map | If the land home isn't the `/w` project MapTab, that surface needs MapTab-class capability. |

---

## 7. WHAT ALREADY WORKS (reuse, do not rebuild — per D4)

- MapLibre full-GIS surface: draw (point/line/polygon), live turf measurement, data-driven reorderable layer panel, 3D terrain/hillshade/tilt, Google/Esri/OSM basemaps, Maricopa parcel-outline vector layer.
- Site-plan overlay + control-point georeferencing (similarity/affine/projective), opacity/rotation, corner snapping, durable R2 storage + CORS proxy, full DB persistence incl. control points. Chat-triggered placement/extract.
- County parcel query (APN + viewport) for Maricopa + Pinal; select→ingest→**dissolved boundary + gross acreage returned live.**
- Drawn boundary → `gis_project_boundary` persistence.
- PostGIS; per-parcel geometry table (`gis_plan_parcel`) with bitemporal versioning; per-selection source APN retention (`project_parcel_boundaries`).
- Real 3-level land-use library + per-type dev specs (effective-dated) + per-project enable/disable + density bands.
- Dedicated Area→Phase→Parcel tables with live create/read API; downstream cashflow engine consuming parcel taxonomy.

---

## 8. DECISIONS FOR GREGG (phasing hinges on these; not resolved here)

1. **Land map home.** Extend the rich project map (`MapTab`) to run at app level (project-independent), vs. stand up a fresh land map. D2/D4 direction = reuse existing machinery → favors extending MapTab-class capability to app scope. Confirm.
2. **Canonical hierarchy.** `tbl_area/tbl_phase/tbl_parcel` (recommended — live API + cashflow read it) vs. universal `tbl_division`. Retire or formalize the name-string bridge.
3. **Geometry source of truth + SRID.** Pick one boundary store (`gis_project_boundary` 3857 is the active one) and one owner of gross acreage; deprecate the legacy 4326 pair or map between them explicitly.
4. **GIS migration home / Gern coordination.** Slice 1 needs schema changes to geometry tables that today live out-of-band. Decide how those get a tracked, reversible migration and who lands them.

---

## 9. VERIFICATION NOTES / CONFIDENCE

- Schema verified against `neonDB_2025-11-14.json` information_schema dump + live model/route code (VERIFIED). Note the dump is dated 2025-11-14; the untracked direct-to-DB `gis_*` tables were confirmed via live code references, not the dump (INFERRED-but-corroborated).
- One cross-audit discrepancy reconciled: Maricopa parcel-outline layer **is present** (exported constant + import confirmed), despite one sub-audit's string-search miss.
- County sales connector (`SM10`) referenced in sync-folder docs was not independently confirmed in code this pass; out of slice-1 scope, flagged for a later look.
- Whether individual source APNs persist through `ingest_tax_parcel_selection` is inside a DB function not in the repo — UNVERIFIED; needs a direct DB read before G5/G2 build.

*End of technical audit. Next artifact expected: after Gregg approves these findings, a proposed phasing (still no code) for his second gate.*
