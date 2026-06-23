# Migration Discovery — Maricopa / Red Valley Ranch Data-Mining Mechanism → Landscape

**Session:** `LSCMD-MARICOPA-DISCOVERY-0622-JB1`
**Date:** 2026-06-22
**Type:** Read-only discovery / audit. No code, no migrations, no DB writes, no scraping runs.
**Status of working tree at discovery time:** `main`, but NOT clean — unrelated in-flight work was present (property-type tokens, MapTab, ArtifactWorkspacePanel, a new `src/app/api/media/` route, session notes). Per Gregg's instruction, this pass proceeded anyway, touching none of those files and writing only this report. Final `git status` will therefore show the pre-existing dirty files plus this report.

---

## 1. Executive summary

**Recommendation: Build this as a Django-native ingestion capability inside `backend/`, wired into the data tables that ALREADY EXIST in the live schema (`landscape.market_activity` for permits + the dormant `MktPermitHistory` / `MktNewHomeProject` tables), reusing four capabilities the platform already has — NOT by lifting-and-shipping the Python scripts and NOT by extending the `market_ingest_py` CLI.** Generalize from day one via a jurisdiction registry (the dormant `MktDataSourceRegistry` table is purpose-built for exactly this) plus three portal-family adapters: **SmartGov** (permits), **Legistar/Granicus** (entitlements), **ArcGIS** (parcels/lots).

**Headline effort / risk:**

- **Effort to a useful first slice (permits-only, Maricopa, landing in the DB and surfaced in Landscaper): Small–Medium (~2–3 weeks).** Almost all of the read/store/surface machinery exists; the new work is one SmartGov adapter + a normalizer + a Vercel-cron trigger.
- **Effort to the strategic prize (any-jurisdiction framework across all three portal families + entitlement PDF pipeline + lot inventory): Large (~6–10 weeks)**, but heavily reuse-leveraged (~60–70% on existing GIS, PDF-extraction, on-demand-load, and tool-registry machinery).
- **Top risk is NOT scraping fragility in the LoopNet sense.** The Maricopa sources are **anonymous public-sector government endpoints** (SmartGov RunReport, Legistar API, county ArcGIS), structurally unlike LoopNet's Akamai-protected commercial site that hard-blocked Railway egress. The real risks are (a) **per-jurisdiction hardcoding** (report GUIDs, Legistar client slugs, ArcGIS field-name schemas, matter-type IDs) — which the generalization framework is designed to absorb; (b) **PDF-layout fragility** in the permit and staff-report parsers; (c) the platform has **only one scheduling primitive (Vercel Cron)** and **no Railway worker/Celery**, which shapes where ingestion code can run; and (d) **schema discipline** — §17.7 plus the live-vs-dormant market-table split must be respected or work lands against a table that doesn't exist in prod.

**The single most consequential schema finding:** the live market lineage is **`public.market_*` (+ `geo_xwalk`)**, and a working permit table — **`landscape.market_activity`, 9,392 rows of HBACA building-permit data** with `source` / `period_end_date` / `period_type` / `msa_code` columns — **already exists**. The Django `tbl_market_*` redesign (`migrations/20260310_…`) has Django models but its tables **do not exist in the live DB**. New permit data should reuse `market_activity` + the dormant `Mkt*` tables, not the non-live `tbl_market_*` lineage.

---

## 2. Source mechanism inventory

**Source folder:** `/Users/5150east/Library/CloudStorage/OneDrive-CrescentBayHoldings/1Active/CBLF1/_claude/`

**Operating model (from `SKILL.md`, `RVR_Project_Facts.md`):** a weekly competitive-market intelligence pipeline for **Red Valley Ranch (RVR)** — a 540-lot SFR land-disposition asset (Crescent Bay / CBLF1) in the **City of Maricopa, Pinal County, AZ** — being positioned for sale to a homebuilder. It runs in a Cowork sandbox that boots clean each run (hence `requirements.txt` is reinstalled every run) and produces builder permit-velocity, entitlement-pipeline, and lot-level inventory/ownership intelligence. Weekly sequence: `maricopa_permit_updater` → `lot_snapshot` → (conditional) `lot_dim_puller`+`lot_dim_writeback` → `demand_map_runner` → `permit_report_runner`, publishing HTML/PDF as Cowork artifacts. A separate cadence drives agenda monitoring.

**Pinned deps (`requirements.txt`, "confirmed working 2026-06-09"):** `PyMuPDF==1.27.2.3` (PDF table extract), `openpyxl==3.1.5` (the master xlsx datastore), `shapely==2.1.2` (lot-geometry MBR), `weasyprint==69.0` (paginated PDF). **Undeclared but imported** (a migration gap): `pdfplumber`, `geopandas`, `pyogrio`.

### CORE scripts — permits, entitlement pipeline, lot inventory/classification

| Script | Inputs (source / auth) | Transforms / parsing | Outputs | State / caches |
|---|---|---|---|---|
| `maricopa_permit_updater.py` | SmartGov RunReport **PDF** (report GUID, **no auth**) | PyMuPDF table extract; SFR (Level-1) prefix deny-list; site-dev (Level-2) classify Grading/Utility/Paving/ROW/Wall/Marketing; subdivision recovery; APN-year dedup | Appends **Permits** + **Permits_Site** sheets to master xlsx | — |
| `maricopa_pipeline_crawler.py` | Legistar `/matters`, `/attachments`, `/histories` (**JSON, no auth**) + attachment PDFs (pdfplumber) | regex extract applicant / location / acreage / lot_count / zoning / density / staff-rec | `pipeline_db.json`; rebuilds **Pipeline** sheet | `pipeline_db.json`, `pipeline_pdfs/`, `pipeline_texts/` |
| `maricopa_agenda_monitor.py` | Legistar (JSON) + staff-report PDFs (PyMuPDF) | enriched extraction incl. lot dims (via `agenda_dim_extractor`); meeting-graduation logic | **Pipeline** sheet (28 cols); mirrors `pipeline_db.json` | mirrors `pipeline_db.json` |
| `maricopa_inventory_gis_sync.py` | local `CBLF1-2025.gdb` feature class + Pinal TaxParcels FS3 (**ArcGIS REST, no auth**) | parcel-grain classify (imports `lot_classification`, `maricopa_permit_report`); safety thresholds | `MaricopaInventory_attrs.xlsx`, geojson, HTML diff | reads the local file-geodatabase |
| `lot_snapshot.py` | Pinal TaxParcels FS3 + master xlsx | classify raw / platted / permitted / spec / sold; diff vs prior snapshot | appends **Lot_Snapshots** + **Lot_Transitions** | prior snapshot rows in xlsx |
| `lot_classification.py` | master xlsx (Permits / Permits_Site) | LOCKED "LuD" methodology; shared classifier (`load_lud_subdivisions`, `classify_parcel`) | library (imported by report + gis_sync) | — |
| `lot_dim_puller.py` | AZ DWR FS7 geometry (**ArcGIS REST, no auth**) | oriented minimum-bounding-rectangle width/depth; Tier bracketing (incl. 35 ft) | `lot_dim_raw.json`, per-lot CSV, project CSV | — |
| `lot_dim_writeback.py` | the two CSVs | join by APN | writes lot dims to **Permits** + rebuilds **Project Summary**; timestamped backup | `.pre_*` xlsx backups |
| `maricopa_permit_report.py` | master xlsx + `lot_inventory.xlsx` + Pinal (via lot_snapshot) + `builder_links` | 4-tier supply rollup, LuD detection, builder normalization | **HTML** + single-page **PDF** (weasyprint); upserts `lot_inventory.xlsx` | — |
| `permit_report_runner.py` | wraps the report | monkeypatches `fetch_all_tracked_parcels` with date-keyed cache (beats 45 s sandbox call ceiling) | (delegates) | `parcel_cache.json` (10.6 MB) |

### PERIPHERAL scripts — reporting, mapping, builder links, QC, staging

| Script | Role |
|---|---|
| `maricopa_demand_map.py` | Interactive Leaflet map (permit dots by builder, month dropdown, parcel/subdivision overlays); fetches centroids from AZ DWR + SmartGov-Esri fallback → `outputs/Maricopa_Permits_Demand_Map.html` |
| `demand_map_runner.py` | Cache wrapper for the map (`centroid_cache.json`; optional `DMR_FASTCACHE` disk caches) |
| `rvr_overlays.py` | Post-processes the map HTML: FEMA flood / NHD wash overlays, RVR phase boundary, pipeline-status coloring, GY/QC configs |
| `builder_links.py` | Static **verified-only** (community, builder) → builder-page URL lookup; `linkify()` imported by report. **Not crawled at runtime** (verified manually 2026-06-20) |
| `agenda_dim_extractor.py` | Regex lot-dimension parser for staff reports (library for agenda monitor) |
| `agenda_report_to_pdf.py` | Renders agenda HTML→PDF via PyMuPDF Story (avoids weasyprint native deps) |
| `pipeline_dim_backfill.py` | One-time backfill of dim columns into Pipeline from `pipeline_db.json` |
| `project_hierarchy_builder.py` | Consolidates PAD→preplat→final plat→site-dev→SFR per project family → **Project_Hierarchy** sheet + HTML |
| `parcel_register_builder.py` | (family, parcel) register with authoritative state/lot-count → **Parcel_Register** sheet + HTML |
| `stage_subdivisions.py` | Stages `Subdivisions_Current` gdb layer → demand-map geojson (geopandas) |
| `gy_qc_subdivisions.py` / `gy_qc_config_backfill.py` | Goodyear + Queen Creek expansion: subdivision polygons + built/VDL/spec derivation from MC assessor (proves a generalization attempt already started, hand-coded per jurisdiction) |

**Central datastore:** a master Excel workbook `Market-Data/MaricopaPermits_GISHistory_202603.xlsx` with sheets Permits, Permits_Site, Pipeline, Project Summary, Lot_Snapshots, Lot_Transitions, Project_Hierarchy, Parcel_Register. **Migration hazard:** the filename is partially hardcoded (`_202603`) in some scripts and globbed in others; several scripts also bake absolute sandbox paths (`/sessions/trusting-elegant-gauss/mnt/...`).

---

## 3. Data-source map

**The defining property: every external source is an anonymous public GET (some POST form-encoded for ArcGIS). No API key, token, or bearer anywhere.** (The lone `api_key` string in `maricopa_agenda_monitor.py` is a loop variable, not a credential.) This is the most important migration fact — there are no secrets to migrate, and the entire risk surface is endpoint/field-name/ID hardcoding plus PDF-layout fragility.

| # | Source | Endpoint pattern | Auth | Format | Jurisdiction hardwiring | Portal family |
|---|---|---|---|---|---|---|
| 1 | **City of Maricopa SmartGov** (permits) | `https://ci-maricopa-az.smartgovcommunity.com/Public/Report/RunReport?Id=818a9a67-f78e-4ff2-b750-5f886cb30c10&STARTDATE=…&ENDDATE=…` | none | **PDF** (PyMuPDF `find_tables`) | **HARD** — host slug `ci-maricopa-az` + report **GUID** + the SFR/site-dev prefix taxonomy + PDF column order | **SmartGov** |
| 2 | **City of Maricopa Legistar** (entitlements) | `https://webapi.legistar.com/v1/maricopa/{matters,matters/{id}/attachments,matters/{id}/histories}` | none | **JSON** + attachment PDFs | **HARD** — client slug `maricopa` in path + `RESIDENTIAL_MATTER_TYPES` numeric IDs (per-jurisdiction in Legistar) | **Legistar/Granicus** |
| 3 | **Pinal County GIS** (TaxParcels) | `https://gis.pinal.gov/mapping/rest/services/TaxParcels/{FeatureServer/3,MapServer/3}/query` | none (some need `User-Agent`) | ArcGIS REST (JSON/geojson), SR 2223 | **HARD** — Pinal host + fields `PARCELID/CNVYNAME/OWNERNME1/RESYRBLT/PRPRTYDSCRP` | **ArcGIS** |
| 4 | **AZ DWR** statewide parcels | `https://azwatermaps.azwater.gov/arcgis/rest/services/General/Parcels_for_TEST/FeatureServer/7/query` | none | ArcGIS REST JSON, SR 26912 | statewide AZ (least bound) but service name `Parcels_for_TEST` is unstable | **ArcGIS** |
| 5 | **Maricopa County Assessor GIS** | `https://gis.mcassessor.maricopa.gov/arcgis/rest/services/MaricopaDynamicQueryService/MapServer/{3,2}/query` | none | ArcGIS REST | **HARD** — county host + fields `APN/LOT_NUM/CONST_YEAR/SUBNAME/LAND_SIZE` (Goodyear/QC side) | **ArcGIS** |
| 6 | **SmartGov County Tax Parcels** (Esri mirror, centroid fallback) | `https://services7.arcgis.com/MlfUGd2UJYefAS7v/.../County_Tax_Parcels_SmartGov/FeatureServer/0/query` | none | ArcGIS REST JSON | org-id bound | **ArcGIS** |
| 7 | **Pinal SubPoly** (recorded plats) | `https://gis.pinal.gov/mapping/rest/services/SubPoly/MapServer/0/query` | none | ArcGIS REST | Pinal host | **ArcGIS** |
| 8 | **Accela Citizen Access** (Goodyear + Queen Creek permits) | `https://aca-prod.accela.com/{QC,GOODYEAR}/...CapHome.aspx` | none | **HTML scrape** | agency slug in path | **Accela** (4th family, expansion only) |
| 9 | Basemap/tile CDNs (cosmetic, client-side in HTML) | Esri/Google tiles, unpkg Leaflet | none | tiles | — | — |
| 10 | Builder marketing sites | static verified URLs (DR Horton, Lennar, Pulte, Meritage, Century, CastleRock, Dream Finders) | n/a | not fetched | hand-curated | — |

**Non-network local sources:** a file-geodatabase `CBLF1-2025.gdb` (read via geopandas) and pre-staged geojson (FEMA NFHL flood, USGS NHD washes).

---

## 4. Repo landing-zone analysis (reuse vs. net-new)

| Landing zone | Verdict | What it gives the migration |
|---|---|---|
| **`backend/apps/gis/`** | **~95% reuse** | `parcel_services.py` `ParcelServiceConfig` **already wires both Maricopa County and Pinal County ArcGIS**, fully county-parameterized: `parcel_query()` → `_build_arcgis_query_params()` → `_fetch_arcgis_geojson()` (paginates via `resultOffset`, outSR 4326) → `_normalize_feature_collection()` (vendor→canonical `parcel_id/owner/address/acres/use_code`), ingest via PostGIS proc `landscape.ingest_tax_parcel_selection`. `tbl_project_overlay` already stores source-doc provenance (`source_doc_id`→`core_doc`, `source_page`, `source_crop_bbox`). This is the **ArcGIS portal-family adapter, already built.** |
| **`backend/apps/location_intelligence/`** | **Reuse the PATTERN** | The canonical **on-demand "load coverage for a geography" engine** — exactly the generalization shape. `demographics_service.py`: `get_state_coverage()` (not_loaded/loading/complete via a `_loading_jobs` dict) → `trigger_state_load()` (spawns a daemon thread running a `call_command`) → fetch+`INSERT … ON CONFLICT` upsert → `_invalidate_state_project_caches()`. Swap the dimension key (`state_fips`→`county_fips`/`jurisdiction`), the cache tables, and the fetch client and you have on-demand permit/lot loading for a new metro. |
| **`backend/apps/documents/` + `backend/apps/knowledge/`** | **Reuse the pipeline** | Generic **PDF→staging→commit** extraction: `auto_classifier.extract_text_from_bytes()` (PyMuPDF/pdfplumber/textract + OCR seam), `ExtractionService.extract_from_documents()` (RAG + Claude structured extraction → `landscape.ai_extraction_staging` for human validation in the Ingestion Workbench → commit via `ExtractionWriter`). This can host the staff-report extraction that `maricopa_pipeline_crawler.py` does by hand. Net-new: the Legistar **crawler** (fetch the matter/attachment list and feed PDF bytes in) + planning/entitlement field-registry entries + (likely) `ENABLE_OCR` + an entitlement-event table to land results. |
| **`backend/apps/market_intel/`** | **Partial — template + dormant tables** | The DRF surface today is project-scoped valuation comps (`RentComparable`, `MarketCompetitiveProject`, etc.). Critically, migration `0001_unified_market_intelligence_schema.py` **already CREATES `MktPermitHistory`, `MktNewHomeProject`, `MktDataSourceRegistry` tables + 6 Landscaper AI views** (`vw_permit_annual_by_jurisdiction`, `vw_permit_msa_monthly`, `vw_mkt_absorption_by_lot_width`, `vw_mkt_pricing_by_city_lotwidth`, …) — but **no Django models or API expose them yet.** `MktNewHomeProject` already carries lot-pipeline fields (VDL, finished-vacant, under-construction, QMI/spec, models, occupied). So permit/new-home **storage + reporting views exist**; the API (model+serializer+viewset+url) is net-new, copy-templated from the comp pattern. |
| **`backend/apps/landscaper/`** | **Clean extension point** | Decorator registry: `@register_tool(name)` populates `TOOL_REGISTRY`; schemas are plain dicts in `LANDSCAPER_TOOLS` (`tool_schemas.py`); dispatch via `execute_tool()`. Adding "new-home permit activity / entitlement pipeline / builder-held inventory for a market" = 3 edits each (schema dict + handler + add name to `LAND_ONLY_TOOLS`). No refactor. |
| **`services/market_ingest_py/`** | **Poor structural fit — do NOT extend for record-grained data** | The CLI is hardwired to scalar economic time series keyed `(series_id, geo_id, date)`. Clients are an `if/elif` ladder over a `source` string returning `List[NormalizedObservation]` (a single scalar `value`); no base class, no plugin discovery, **no PDF parsing, no geometry, no PostGIS**. It also **isn't deployed or scheduled anywhere** — it's a manual local `poetry run market-ingest` CLI; the `/api/market/refresh` queue inserts `market_fetch_job` rows that **nothing consumes**. Aggregated monthly permit COUNTS could slot in as another series, but individual permit/parcel/entitlement RECORDS cannot. Reusable parts are narrow: the `geo_xwalk` spine, the `tenacity`+`requests` client shape, and the `market_fetch_job`→`ai_ingestion_history` lineage bookkeeping. |

---

## 5. Schema findings (with active-code-path trace)

Per **PROJECT_INSTRUCTIONS §17.7** (read first; quoted facts below), this section enumerates the real tables/columns and traces one real active write.

### 5.1 Active-code-path trace (the real write)

The live market-ingest write is **`Database.upsert_market_data`** (`services/market_ingest_py/.../db.py:260-299`), driven from `runner.py:292`. It writes **`public.market_data`**:

```sql
INSERT INTO public.market_data (series_id, geo_id, date, value, rev_tag, coverage_note)
VALUES %s
ON CONFLICT (series_id, geo_id, date)
DO UPDATE SET value = EXCLUDED.value, rev_tag = EXCLUDED.rev_tag,
              coverage_note = COALESCE(EXCLUDED.coverage_note, public.market_data.coverage_note)
```

PK = `(series_id, geo_id, date)` → a re-fetch **overwrites in place** (no vintage rows retained). Lineage is bookkept in `public.market_fetch_job` (`insert_fetch_job`/`finalize_fetch_job`) and `landscape.ai_ingestion_history` (`insert_ai_ingestion_history`, `package_name='market_ingest_v1'`). DDL: `archive/migrations-legacy/20251008_01_market_core.sql`. The live read path (`src/app/api/market/series/route.ts`) confirms the same `public.market_data JOIN public.market_series JOIN public.geo_xwalk` lineage.

### 5.2 Live vs. dormant — the trap to avoid

- **LIVE:** `public.market_*` (+ `geo_xwalk`). Verified live counts: `public.market_data` = **15,942**, `public.market_series` = **108**, `public.geo_xwalk` = **59**. Ongoing dev still targets it (`migrations/20260324_add_county_micro_acs_series.sql` writes `public.market_series`). Despite its DDL living under `archive/migrations-legacy/`, **this is production.**
- **NOT LIVE:** `landscape.tbl_market_geography/series/observation` (`migrations/20260310_…`). Django models exist (`backend/apps/market_intel/models.py`, `db_table='tbl_market_observation'`) but `landscape.tbl_market_observation` **does not exist in the live DB**. A planned redesign that was never cut over.

> **Do not build new permit/pipeline/lot tables against `tbl_market_*`. Wire into the live `public.market_*` lineage and the dormant `Mkt*` tables that migration `0001` already created.**

### 5.3 What the live schema already encodes for time-series market data

| Concern | Real table.column (live) | Notes |
|---|---|---|
| as-of / period / snapshot | `public.market_data.date` (PK part) | one row per series/geo/date; revisions via `rev_tag` + `coverage_note` |
| | **`landscape.market_activity.period_end_date` + `.period_type`** | **9,392 rows of HBACA permit data** — the snapshot/period pattern for permits already in production |
| | `landscape.market_competitive_projects.effective_date` | as-of date for a comp/pipeline snapshot (paired with `data_source`/`source_url`) |
| source / provider lineage | `public.market_series.source` (+ `public.series_alias.provider`, `provider_series_code`) | FRED/RDC/HBACA/ACS/BLS/CROMFORD |
| | `landscape.market_activity.source` | provider tag per permit row |
| | `landscape.market_competitive_projects.data_source` + `source_url` + `source_project_id` | comp lineage incl. URL provenance |
| | `public.market_fetch_job` (`params`, `sources`, `ai_ingestion_id`→`ai_ingestion_history`) | existing fetch-run lineage table — natural home for a scheduled-fetch run record |
| jurisdiction / geo key | `public.geo_xwalk` (`geo_id` PK; `geo_level` US/STATE/MSA/COUNTY/CITY; `state_fips`/`county_fips`/`place_fips`/`cbsa_code`/`tract_fips`; `parent_geo_id`) | authoritative geo dimension; auto-seeded on Location-tab load |
| | `landscape.market_activity.msa_code` / `geography_type` / `geography_name` | permit rows carry their OWN geo descriptors — **free text, NOT FK'd to `geo_xwalk`** (the one normalization gap) |
| project physical hierarchy | `landscape.tbl_division` (1,145 rows; tiers Project/Area/Phase/Parcel-Unit; `attributes` jsonb) | renamed from `tbl_container`. Lot-snapshot rows tied to a specific RVR lot would key on a tier-3 `division_id`; `attributes` jsonb is the extension point |

**Plain English (§17.7 requirement):** The live schema already encodes (a) snapshot/period semantics, (b) a source/provider lineage column, and (c) a jurisdiction key. New permit data can **reuse `landscape.market_activity` directly** (it is already a working permit table with source + period + geography). Entitlement-pipeline and lot-snapshot data need **new tables** (the dormant `MktNewHomeProject` covers new-home/lot pipeline; an `entitlement_event`/case table is net-new; lot-level snapshots key off `tbl_division` tier-3 or a new `tbl_lot`). The chief reuse caveat: `market_activity` geo is free-text and would need normalizing to `geo_xwalk` for cross-jurisdiction joins.

### 5.4 Governance facts that constrain the build (§17.7 and migration mechanics)

- **§17.7** (`docs/PROJECT_INSTRUCTIONS.md:707-721`): before extending tables, the schema must be read and enumerated, findings stated in plain English to Gregg before designing, with an active-code-path trace (this section satisfies it). Backed by a documented "direct loss event 2026-05-01" where a feature was built before discovering an existing `statement_discriminator` taxonomy.
- **Raw-SQL migrations do not auto-apply to prod.** `scripts/run-migrations.mjs` re-runs every `migrations/*.up.sql` on each invocation with **no tracking table** (so migrations must be idempotent, `ADD COLUMN IF NOT EXISTS`). **Railway runs only `python manage.py migrate`** (Django migrations) on deploy — raw-SQL `.up.sql` files must be applied to the prod Neon branch by hand (`npm run db:migrate` / `psql`). This is a live open follow-up (Plan Extraction #115/#117). New work should prefer **Django migrations** so it ships on Railway deploy automatically, or explicitly own the manual raw-SQL apply step.

---

## 6. Generalization framework (Maricopa-only → any jurisdiction)

The mechanism is hard-wired to one city across three portal types. Generalization = a **jurisdiction registry** + **three portal-family adapters**, so a new metro is a configuration row, not a code fork. The Goodyear/Queen Creek scripts (`gy_qc_*`) prove generalization was already being attempted — by hand-coding per jurisdiction, which is exactly what to replace.

### 6.1 Jurisdiction registry (config, not code)

Use the **already-existing dormant `MktDataSourceRegistry` table** as the registry. One row per (jurisdiction, portal), holding the parameters that are currently hardcoded:

```
jurisdiction        e.g. "City of Maricopa, AZ"   (FK/normalize → geo_xwalk.geo_id)
portal_family       smartgov | legistar | arcgis | accela
base_url            host + path
identifiers         JSONB: { report_guid, legistar_client, arcgis_layer, agency_slug }
field_map           JSONB: vendor→canonical field names (parcel_id, owner, apn, lot_num, …)
taxonomy            JSONB: permit prefixes, residential matter-type IDs, use codes
spatial_ref         e.g. 2223 / 26912 / 4326
enabled / cadence   weekly | monthly
```

### 6.2 Portal-family adapters

| Adapter | Replaces | Reuse in repo | Cross-jurisdiction reach |
|---|---|---|---|
| **SmartGov permits** | `maricopa_permit_updater` | net-new client; PDF parse reuses knowledge extractor | SmartGov (Tyler/community) is used by a moderate set of AZ/western cities — fewer than Legistar/ArcGIS |
| **Legistar/Granicus entitlements** | `maricopa_pipeline_crawler` + `maricopa_agenda_monitor` | crawler net-new; PDF text/field extraction reuses `knowledge` pipeline | **Granicus Legistar is used by hundreds of US municipalities** — highest generalization leverage; only the client slug + matter-type IDs change |
| **ArcGIS parcels/lots** | `maricopa_inventory_gis_sync` + `lot_snapshot` + `lot_dim_puller` | **`gis/parcel_services.py` already is this adapter** (Maricopa + Pinal wired) | **Near-universal** for county assessors; per-county config = host + field map (already modeled in `ParcelServiceConfig`) |
| **Accela permits** (expansion) | `gy_qc` Accela scrape | net-new HTML scrape | Accela ACA common for larger cities (Goodyear/QC) — defer; HTML scrape is more fragile than the other three |

**Phoenix-area portal-family map (illustrative — verify per metro at build time):** Pinal/Maricopa County assessors = ArcGIS (already wired); City of Maricopa = SmartGov permits + Legistar entitlements; Goodyear/Queen Creek = Accela permits + MC-Assessor ArcGIS. The generalization payoff is that Legistar and ArcGIS — the two highest-coverage families — are the two already best supported (Legistar via the knowledge pipeline once a crawler exists; ArcGIS via `gis/parcel_services.py` today).

### 6.3 On-demand coverage loading

Wrap the adapters in the **`location_intelligence` on-demand pattern**: `get_jurisdiction_coverage()` → `trigger_jurisdiction_load()` (background thread) → adapter fetch → upsert → cache-invalidate. A new metro becomes "register the jurisdiction rows, then trigger a load," mirroring how a new state's demographics load today.

---

## 7. Generated artifacts → platform surfaces

The skill emits xlsx + HTML/PDF loose files. In Landscape these become **DB tables + API + chat surfaces**, not files:

| Today (file) | In Landscape |
|---|---|
| Permits / Permits_Site xlsx sheets | rows in `landscape.market_activity` (+ a permit-detail table if record grain is needed beyond the dormant `MktPermitHistory`) |
| Pipeline sheet + `pipeline_db.json` | a new `entitlement_event`/case table; staff-report facts via `ai_extraction_staging`→commit |
| Lot_Snapshots / Lot_Transitions | `MktNewHomeProject` (new-home/lot pipeline fields already present) + lot-snapshot rows keyed to `tbl_division` tier-3 |
| Project Summary / Project_Hierarchy / Parcel_Register | DRF read endpoints in `market_intel` + the 6 dormant `vw_*` reporting views |
| `maricopa_permit_report` HTML/PDF | Landscaper chat answers + the artifacts panel (the chat-first equivalent), driven by `market_intel` API |
| `Maricopa_Permits_Demand_Map` HTML | the existing map tab + GIS overlays (`tbl_project_overlay`) rather than a standalone Leaflet file |
| builder velocity / supply rollups | feed the **financial engine** as new-home supply/pipeline inputs (the strategic "feed supply data into financial analysis" goal) |

Consumer surfaces: **Landscaper chat tools** (primary), the **artifacts/map panels** (visual), and the **financial engine** (supply/absorption inputs).

---

## 8. Migration options

### Option A — Extend `market_ingest_py` with new clients + new `market_*` tables
- **Scope:** add SmartGov/Legistar/ArcGIS clients to the Python CLI; new `public.market_*`-style tables; expose via `market_intel` API + Landscaper tools.
- **Reuse:** low (~25%). The CLI's scalar `(series_id, geo_id, date)` model fits only aggregated permit counts; record-grained permits/entitlements/parcels and PDF/geometry need parallel structures the engine lacks. And the engine is **not deployed or scheduled** — you'd be productionizing a manual CLI.
- **Schema impact:** new tables; conflicts with the live-vs-dormant split.
- **Effort:** **L.** **Risk:** medium-high (building on an unshipped, ill-fitting substrate; duplicates GIS/PDF capabilities that already exist in Django).

### Option B — Django-native ingestion in `backend/`, reuse-heavy (RECOMMENDED)
- **Scope:** a new `backend/apps/jurisdiction_ingest/` (or extend `market_intel`) housing the registry + three portal-family adapters; **reuse `gis/parcel_services.py` (ArcGIS), the `knowledge` PDF pipeline (Legistar staff reports), and the `location_intelligence` on-demand loader.** Land data in `landscape.market_activity` (permits) + the dormant `MktPermitHistory`/`MktNewHomeProject` (activate with models) + a new `entitlement_event` table. Expose via `market_intel` DRF endpoints + Landscaper tools. Schedule via **Vercel Cron** hitting a Django ingest endpoint (the only platform scheduler).
- **Reuse:** high (~60–70%) — ArcGIS adapter and PDF pipeline already exist; storage tables and reporting views already exist.
- **Schema impact:** activate dormant `Mkt*` tables (Django models) + 1 new entitlement table + lot-snapshot rows on `tbl_division`; normalize `market_activity` geo to `geo_xwalk`. Prefer Django migrations (auto-apply on Railway).
- **Effort:** **M** for the first slice, **L** for full generalization. **Risk:** low-medium (on shipped, well-fitting substrate; respects §17.7 and the live schema).

### Option C — Port the Python scripts as-is into a Railway service (fast proof)
- **Scope:** containerize the existing scripts behind a thin API/worker, write outputs to the DB instead of xlsx; minimal generalization.
- **Reuse:** medium of the *scripts* (~70% of script logic survives) but **near-zero of the platform** (duplicates GIS/PDF/registry capabilities; emits a parallel data model).
- **Blocker:** **the platform has no Railway worker/cron primitive** — you'd be introducing new infra (a long-running worker or a self-built scheduler) that doesn't exist today, plus the scripts' hardcoded absolute paths and undeclared deps (`pdfplumber`/`geopandas`/`pyogrio`).
- **Effort:** **M** (deceptively — infra is the cost). **Risk:** medium-high (creates a second data silo; technical-debt-on-arrival; doesn't advance the generalization prize).

| | A (extend CLI) | **B (Django-native)** | C (port as-is) |
|---|---|---|---|
| Platform reuse | ~25% | **~60–70%** | ~0% |
| Fits record-grained data | no | **yes** | yes (own model) |
| Uses existing scheduler | no (none) | **yes (Vercel Cron)** | no (needs new infra) |
| Advances generalization | partial | **yes** | no |
| Schema discipline (§17.7 / live tables) | risky | **clean** | sidesteps |
| Effort (first slice / full) | L / L | **M / L** | M / M |
| Risk | med-high | **low-med** | med-high |

---

## 9. Recommendation + phased sequence

**Adopt Option B.** It is the only path that lands on shipped, well-fitting substrate, reuses the ArcGIS adapter and PDF pipeline that already exist, respects §17.7 and the live `public.market_*` lineage, and uses the one scheduler the platform has. Explicitly separate the fast proof from the strategic prize:

**Phase 0 — Permits-only, Maricopa, as-is proof (S–M, ~2–3 wks).** Build the **SmartGov adapter** + normalizer; land rows in `landscape.market_activity` (reusing its `source`/`period_end_date`/`period_type`/geo columns). Trigger via a weekly **Vercel Cron** (`"0 12 * * 1"`) → Django ingest endpoint. Surface one Landscaper tool: "new-home permit activity for a market." **Useful immediately**; proves the round-trip end-to-end with zero new storage tables.

**Phase 1 — Generalize the framework (M).** Stand up the **jurisdiction registry** (activate `MktDataSourceRegistry`) + the **on-demand loader** (clone `location_intelligence`'s coverage/trigger/upsert/invalidate). Refactor the SmartGov adapter to read all hardcoded params (GUID, prefixes) from a registry row. Normalize `market_activity` geo → `geo_xwalk`. **This is the prize:** a second metro becomes config.

**Phase 2 — Entitlement pipeline + lot inventory (M–L).** Build the **Legistar crawler** feeding the existing `knowledge` PDF→staging→commit pipeline (add planning/entitlement field-registry entries; enable OCR if needed); land a new `entitlement_event` table. Wire the **ArcGIS adapter** to `gis/parcel_services.py` for parcel/lot sync; land lot snapshots on `tbl_division` tier-3 + activate `MktNewHomeProject`.

**Phase 3 — Surfacing + financial wiring (M).** Activate the dormant `market_intel` DRF endpoints + 6 `vw_*` reporting views; add the remaining Landscaper tools (entitlement pipeline, builder-held inventory); feed new-home supply/absorption into the **financial engine**.

**Deferred / out of scope for now:** the Accela (Goodyear/QC) HTML-scrape adapter (most fragile family); the demand-map visualization (the existing map tab + `tbl_project_overlay` overlays cover it); builder marketing-link curation (static, low value).

---

## 10. Dependencies & risks

- **Scraping fragility / blocking — and why this is NOT LoopNet.** The LoopNet deal-sourcing tools were **deferred 2026-04-25** because **Akamai SCF hard-blocks LoopNet from datacenter (Railway egress) IPs**, and Crexi gated its API behind auth + Google Place IDs; the decision was to defer to a **paid feed (ATTOM/Reonomy)**, retaining `loopnet_tools.py` + the `loopnet-mcp` Railway service for revival (`CLAUDE.md:581`; `docs/09_session_notes/2026-04-25-daily-sync.md`). **The Maricopa sources are categorically different:** anonymous **public-sector government endpoints** (SmartGov RunReport, Legistar API, county ArcGIS) with no bot-protection challenge, not commercial sites defending datacenter traffic. The likelihood of an Akamai-style hard block from Railway/Vercel egress is **low** — but should be smoke-tested from the actual platform egress before committing the scheduler, since it is the one assumption that, if wrong, changes the architecture (would force a proxy or paid feed, as LoopNet did). The genuinely fragile pieces are **PDF layout parsing** (SmartGov permit report + staff reports — column order / template changes silently break extraction) and **per-jurisdiction IDs** (report GUIDs, Legistar matter-type IDs, ArcGIS field schemas) — both contained by the registry + the validation-staging step in the knowledge pipeline.
- **No-auth-today-but-could-change.** All sources are currently anonymous; none require credential management. If any portal later gates access, the registry isolates the change to one adapter. Build idempotent re-fetch and store raw responses (the existing `market_fetch_job` lineage + `documents` raw store) so a parser break is replayable.
- **Scheduling / freshness.** The weekly Cowork task must move to **Vercel Cron** — the only in-platform scheduler (there is **no Celery, Railway cron, or worker**). A long-running multi-portal load may exceed a serverless cron's execution window; mitigate with the `location_intelligence` **background-thread + coverage-status** pattern (cron triggers, returns immediately, work runs async and is polled), or a chunked per-jurisdiction cadence.
- **Migration mechanics.** Prefer **Django migrations** (auto-apply on Railway). Any raw-SQL `.up.sql` must be applied to the prod Neon branch by hand (`npm run db:migrate` re-runs all, no tracking; Railway runs only `manage.py migrate`) — a known open follow-up. Confirm writes target the **prod data branch (`ep-tiny-lab`)**, not the empty branch behind `PRODUCTION_DATABASE_URL`.
- **Schema discipline (§17.7).** Re-run the audit before each phase's table changes; do not build against the non-live `tbl_market_*`. Activate dormant `Mkt*` tables rather than creating parallel ones.
- **Source-script debt to not carry over.** Hardcoded absolute sandbox paths, the partially-hardcoded `_202603` xlsx filename, and undeclared deps (`pdfplumber`/`geopandas`/`pyogrio`) must be dropped/declared in the port.
- **Licensing / ToS.** Public-sector data (SmartGov/Legistar/county ArcGIS) is generally open-records; still review each portal's ToS for automated-access and rate clauses, set a polite `User-Agent` + rate limit (several ArcGIS layers already require a `User-Agent` to avoid 403), and cache to minimize request volume. Builder marketing sites are referenced as static verified links only — keep it that way (no runtime crawl).

---

## 11. Open questions for Gregg (product decisions only)

1. **Maricopa-only first, or generalize immediately?** The recommendation ships a Maricopa permits proof in Phase 0, then generalizes in Phase 1. Is a fast single-city proof the right first milestone, or do you want to wait for the multi-metro framework?
2. **Primary consumer of the migrated data?** Landscaper chat answers, the financial engine (supply/absorption inputs), a UI/artifacts surface, or an exportable study? This sets which phase delivers value first.
3. **Belfiore partnership shape.** Is the goal to *replace* manual field surveys, *augment* Belfiore's hand-collected data, or *productize* this as a coverage-expansion engine? (Belfiore is not mentioned anywhere in the repo today — this is net-new strategic context.)
4. **Entitlement-pipeline grain.** Do you need full case-level entitlement tracking (rezoning/PAD/subdivision lifecycle with staff-report facts), or just a high-level pipeline count per market? This is the difference between a Medium and a Large lift in Phase 2.
5. **Lot-level inventory ownership.** Should builder-held vs. sold lot snapshots be tied to RVR-style project divisions (`tbl_division`), or stand alone as market-wide inventory? Affects whether lot data is project-scoped or jurisdiction-scoped.
6. **Demand map.** Reproduce the interactive Leaflet demand map inside the platform, or is the existing map tab + GIS overlays sufficient (demand map deferred)?

---

*Discovery only. No implementation code written; no repo files modified except this report. Session: `LSCMD-MARICOPA-DISCOVERY-0622-JB1`.*
